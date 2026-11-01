/* PropertyOS module 10: Security deposits ledger (collect / deduct / refund).
   Requires migration 011. Graceful if tables missing. Loads after core + previous modules. */
(() => {
  const g = (a, i) => (D[a] || []).find(x => x.id === i);
  const info = l => {
    const u = g('units', l.uid) || {}, p = g('props', u.pid) || {}, t = g('tenants', l.tid) || {};
    return { u, p, t };
  };
  const depOf = l => {
    const rows = (D.dep || []).filter(x => x.lid === l.id);
    const c = rows.filter(x => x.kind === 'collected').reduce((s, x) => s + x.amt, 0);
    const d = rows.filter(x => x.kind === 'deduction').reduce((s, x) => s + x.amt, 0);
    const r = rows.filter(x => x.kind === 'refund').reduce((s, x) => s + x.amt, 0);
    return { rows: rows.sort((a, b) => a.at < b.at ? 1 : -1), c, d, r, held: Math.max(0, c - d - r) };
  };
  const K = { collected: ['Collected', 'var(--ok)', '+'], deduction: ['Deduction', 'var(--er)', '−'], refund: ['Refund', 'var(--ac)', '−'] };

  // Extend MORE menu
  if (typeof MORE !== 'undefined' && !MORE.includes('dep')) MORE.push('dep');
  if (typeof SEC !== 'undefined') SEC.dep = ['Deposits', '#ff9500'];

  // View
  const origV = V;
  V.dep = function () {
    if (!D.ok || !D.ok.dep) {
      return `<div class="g em"><h2>Security deposits</h2><p>Run migration <code>011_deposits_utilities_documents.sql</code> in Supabase, then reload.</p></div>`;
    }
    const L = (D.leases || []).filter(l => l.st === 'active' || (depOf(l).held > 0));
    if (!L.length) return empty('No active leases with deposit activity yet.');
    return `<h2>Security deposits</h2>
      <div class="list">${L.map(l => {
        const i = info(l), dp = depOf(l);
        return `<div class="g row" data-a="depLease" data-i="${l.id}">
          <div class="m"><b>${esc(i.t.name || '?')} · ${esc(i.u.name || '')}</b>
          <small>${esc(i.p.name || '')} · Held ${inr(dp.held)} of ${inr(l.dep)}</small></div>
          <span class="bd">${dp.held ? 'Held' : (l.dep > 0 && dp.c > 0 ? 'Settled' : 'Not collected')}</span></div>`;
      }).join('')}</div>`;
  };

  // Actions
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-a="depLease"],[data-a="depAdd"],[data-a="depStmt"]');
    if (!t) return;
    const a = t.dataset.a, id = t.dataset.i, k = t.dataset.k;
    if (a === 'depLease') {
      const l = g('leases', id); if (!l) return;
      const i = info(l), dp = depOf(l), mg = typeof mgr === 'function' ? mgr() : true;
      const rows = dp.rows.map(x => {
        const meta = K[x.kind] || [x.kind, 'var(--mu)', ''];
        return `<div class="g row"><div class="m"><b style="color:${meta[1]}">${meta[2]} ${inr(x.amt)}</b><small>${esc(x.note) || meta[0]} · ${x.at}</small></div></div>`;
      }).join('') || '<div class="em">No entries yet</div>';
      modal(`<h3>Deposit · ${esc(i.t.name)}</h3>
        <div class="g k"><small>Held now</small><b style="font-size:22px">${inr(dp.held)}</b>
        <span>Collected ${inr(dp.c)} · Deducted ${inr(dp.d)} · Refunded ${inr(dp.r)}</span></div>
        <h4 style="margin:16px 0 8px">Ledger</h4>${rows}
        ${mg ? `<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
          <button class="btn s" data-a="depAdd" data-i="${l.id}" data-k="collected">+ Collect</button>
          <button class="btn s" data-a="depAdd" data-i="${l.id}" data-k="deduction">− Deduct</button>
          <button class="btn s" data-a="depAdd" data-i="${l.id}" data-k="refund">− Refund</button>
          <button class="btn s q" data-a="depStmt" data-i="${l.id}">Statement</button>
        </div>` : ''}`);
    }
    if (a === 'depAdd') {
      const l = g('leases', id); if (!l) return;
      const dp = depOf(l);
      const def = k === 'collected' ? Math.max(0, l.dep - dp.c) : k === 'refund' ? dp.held : '';
      const title = K[k] ? K[k][0] : k;
      formModal(title, [
        { k: 'amt', l: 'Amount (₹)', t: 'number', v: def, mn: 1 },
        { k: 'note', l: 'Note', t: 'text', v: '' }
      ], async f => {
        const amt = Math.round(parseFloat(f.amt) * 100);
        if (!amt || amt < 1) throw new Error('Enter a valid amount');
        const { error } = await sb.rpc('record_deposit', { p_lease: l.id, p_kind: k, p_amount: amt, p_note: f.note || '' });
        if (error) throw error;
        await load(); render();
        toast(title + ' recorded');
      });
    }
    if (a === 'depStmt') {
      const l = g('leases', id); if (!l) return;
      const i = info(l), dp = depOf(l);
      const o = document.createElement('div');
      o.className = 'rcw';
      o.innerHTML = `<div class="rc"><div class="rh"><b>${esc(D.org)}</b><small>Deposit settlement</small></div>
        <p>${esc(i.t.name)} · ${esc(i.p.name)} ${esc(i.u.name)}</p>
        <p>Lease ${l.start} → ${l.end}</p>
        <table style="width:100%;margin:12px 0"><tr><td>Collected</td><td style="text-align:right">${inr(dp.c)}</td></tr>
        <tr><td>Deductions</td><td style="text-align:right">${inr(dp.d)}</td></tr>
        <tr><td>Refunds</td><td style="text-align:right">${inr(dp.r)}</td></tr>
        <tr><td><b>Held</b></td><td style="text-align:right"><b>${inr(dp.held)}</b></td></tr></table>
        <div class="rcb"><button class="btn s" data-a="printPage">Print</button><button class="btn s q" data-x>Close</button></div></div>`;
      o.onclick = ev => { if (ev.target === o || ev.target.dataset.x != null) o.remove(); };
      document.body.append(o);
    }
  });

  // Make formModal available if not already (some modules assume it)
  if (typeof formModal !== 'function') {
    window.formModal = (title, fields, cb) => {
      const fieldHtml = f => {
        if (f.t === 'select') {
          const opts = (f.opts || []).map(o => typeof o === 'string' ? `<option value="${esc(o)}">${esc(o)}</option>` : `<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('');
          return `<label>${esc(f.l)}<select name="${f.k}">${opts}</select></label>`;
        }
        if (f.t === 'textarea') {
          return `<label>${esc(f.l)}<textarea name="${f.k}" rows="6">${esc(f.v||'')}</textarea></label>`;
        }
        return `<label>${esc(f.l)}<input name="${f.k}" type="${f.t||'text'}" value="${esc(f.v||'')}" ${f.mn!=null?'min="'+f.mn+'"':''}></label>`;
      };
      const html = fields.map(fieldHtml).join('');
      const o = document.createElement('div');
      o.className = 'md';
      o.innerHTML = `<form class="g sheet"><h3>${esc(title)}</h3>${html}<div class="row"><button type="submit" class="btn">Save</button><button type="button" class="btn q" data-x>Cancel</button></div></form>`;
      o.onclick = e => { if (e.target === o || e.target.dataset.x != null) o.remove(); };
      o.querySelector('form').onsubmit = async e => {
        e.preventDefault();
        const b = e.target.querySelector('.btn:not(.q)');
        b.disabled = 1;
        try {
          await cb(Object.fromEntries(new FormData(e.target)));
          o.remove();
        } catch (x) {
          toast(x.message || 'Error');
          b.disabled = 0;
        }
      };
      document.body.append(o);
      const first = o.querySelector('input,select,textarea');
      first && first.focus();
    };
  }
})();
