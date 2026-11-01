/* PropertyOS module 11: Utility bills (electricity, water, gas, internet, maintenance).
   Requires migration 011. Graceful if missing. */
(() => {
  const g = (a, i) => (D[a] || []).find(x => x.id === i);
  const info = l => {
    const u = g('units', l?.uid) || g('units', l) || {}, p = g('props', u.pid) || {}, t = g('tenants', l?.tid) || {};
    return { u, p, t };
  };
  const kinds = ['electricity', 'water', 'gas', 'internet', 'maintenance'];

  if (typeof MORE !== 'undefined' && !MORE.includes('utils')) MORE.push('utils');
  if (typeof SEC !== 'undefined') SEC.utils = ['Utilities', '#30b0c7'];

  V.utils = function () {
    if (!D.ok || !D.ok.ub) {
      return `<div class="g em"><h2>Utility bills</h2><p>Run migration <code>011_deposits_utilities_documents.sql</code> then reload.</p></div>`;
    }
    const list = (D.ub || []).slice().sort((a, b) => (a.m < b.m ? 1 : -1));
    const open = list.filter(x => !x.paidAt);
    const paid = list.filter(x => x.paidAt);
    return `<h2>Utility bills</h2>
      ${typeof mgr === 'function' && mgr() ? `<button class="pill" data-a="newUtil" style="margin-bottom:12px">${I('plus')} New bill</button>` : ''}
      <h3>Open</h3>
      <div class="list">${open.length ? open.map(b => {
        const u = g('units', b.uid) || {}, p = g('props', u.pid) || {};
        return `<div class="g row" data-a="utilDetail" data-i="${b.id}">
          <div class="m"><b>${esc(b.kind)} · ${esc(u.name||'')}</b>
          <small>${esc(p.name||'')} · ${b.m} · Due ${b.due||'—'}</small></div>
          <div style="text-align:right"><b>${inr(b.amt)}</b><br><span class="bd">Open</span></div></div>`;
      }).join('') : '<div class="em">No open bills</div>'}</div>
      <h3 style="margin-top:20px">Paid</h3>
      <div class="list">${paid.slice(0, 20).map(b => {
        const u = g('units', b.uid) || {};
        return `<div class="g row" data-a="utilDetail" data-i="${b.id}">
          <div class="m"><b>${esc(b.kind)} · ${esc(u.name||'')}</b><small>${b.m} · Paid ${b.paidAt}</small></div>
          <b>${inr(b.amt)}</b></div>`;
      }).join('') || '<div class="em">None yet</div>'}</div>`;
  };

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-a="newUtil"],[data-a="utilDetail"],[data-a="payUtil"],[data-a="unpayUtil"]');
    if (!t) return;
    const a = t.dataset.a, id = t.dataset.i;

    if (a === 'newUtil') {
      const units = (D.units || []).map(u => {
        const p = g('props', u.pid);
        return { id: u.id, label: `${p?.name || ''} · ${u.name}` };
      });
      const leases = (D.leases || []).filter(l => l.st === 'active');
      formModal('New utility bill', [
        { k: 'uid', l: 'Unit', t: 'select', opts: units },
        { k: 'kind', l: 'Type', t: 'select', opts: kinds.map(k => ({ id: k, label: k })) },
        { k: 'm', l: 'Month (YYYY-MM)', t: 'text', v: CM },
        { k: 'amt', l: 'Amount (₹)', t: 'number', mn: 1 },
        { k: 'due', l: 'Due date', t: 'date', v: TD },
        { k: 'prev', l: 'Previous reading (optional)', t: 'number' },
        { k: 'cur', l: 'Current reading (optional)', t: 'number' },
        { k: 'note', l: 'Note', t: 'text' }
      ], async f => {
        const amt = Math.round(parseFloat(f.amt) * 100);
        if (!amt) throw new Error('Amount required');
        const lid = (leases.find(l => l.uid === f.uid) || {}).id || null;
        const row = {
          org_id: ORG, unit_id: f.uid, lease_id: lid, kind: f.kind, month: f.m + '-01',
          amount: amt, due_on: f.due || null, reading_prev: f.prev ? +f.prev : null,
          reading_curr: f.cur ? +f.cur : null, note: f.note || ''
        };
        const { error } = await sb.from('utility_bills').insert(row);
        if (error) throw error;
        await load(); render();
        toast('Bill created');
      });
    }

    if (a === 'utilDetail') {
      const b = (D.ub || []).find(x => x.id === id); if (!b) return;
      const u = g('units', b.uid) || {}, p = g('props', u.pid) || {};
      const mg = typeof mgr === 'function' ? mgr() : true;
      modal(`<h3>${esc(b.kind)} · ${esc(u.name||'')}</h3>
        <div class="g k"><small>${esc(p.name||'')} · ${b.m}</small><b style="font-size:22px">${inr(b.amt)}</b>
        <span>${b.paidAt ? 'Paid ' + b.paidAt + (b.ref ? ' · ' + esc(b.ref) : '') : 'Open · Due ' + (b.due || '—')}</span></div>
        ${b.prev != null || b.cur != null ? `<p>Readings: ${b.prev ?? '—'} → ${b.cur ?? '—'}</p>` : ''}
        ${b.note ? `<p>${esc(b.note)}</p>` : ''}
        ${mg ? (b.paidAt
          ? `<button class="btn s" data-a="unpayUtil" data-i="${b.id}">Reopen</button>`
          : `<button class="btn" data-a="payUtil" data-i="${b.id}">Mark paid</button>`) : ''}`);
    }

    if (a === 'payUtil') {
      formModal('Mark paid', [
        { k: 'ref', l: 'Reference / UPI txn', t: 'text', v: '' }
      ], async f => {
        const { error } = await sb.rpc('pay_utility_bill', { p_id: id, p_reference: f.ref || '' });
        if (error) throw error;
        await load(); render();
        toast('Marked paid');
      });
    }
    if (a === 'unpayUtil') {
      formModal('Reopen bill', [
        { k: 'reason', l: 'Reason', t: 'text', v: '' }
      ], async f => {
        const { error } = await sb.rpc('unpay_utility_bill', { p_id: id, p_reason: f.reason || 'Reopened' });
        if (error) throw error;
        await load(); render();
        toast('Reopened');
      });
    }
  });
})();
