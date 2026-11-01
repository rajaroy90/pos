/* PropertyOS 1.1 · module 12: Lease agreements with on-screen e-signatures.
   Requires migration 011. Graceful if missing. */
(() => {
  const g = (a, i) => (D[a] || []).find(x => x.id === i);
  const info = l => {
    const u = g('units', l.uid) || {}, p = g('props', u.pid) || {}, t = g('tenants', l.tid) || {};
    return { u, p, t };
  };
  const docSt = d => d.ms && d.ts ? 'Signed' : d.ms || d.ts ? 'Partial' : 'Draft';
  const needMe = d => {
    const isMgr = typeof mgr === 'function' ? mgr() : true;
    // Only sent agreements can be signed (draft must be sent first)
    if ((d.st || d.status) === 'draft') return false;
    if ((d.st || d.status) === 'signed') return false;
    if (isMgr) return !d.ms;
    return !d.ts;
  };

  if (typeof MORE !== 'undefined' && !MORE.includes('docs')) MORE.push('docs');
  if (typeof SEC !== 'undefined') SEC.docs = ['Agreements', '#5e5ce6'];

  V.docs = function () {
    if (!D.ok || !D.ok.docs) {
      return `<div class="g em"><h2>Agreements</h2><p>Run migration <code>011_deposits_utilities_documents.sql</code> then reload.</p></div>`;
    }
    const list = (D.docs || []).slice().sort((a, b) => (a.at < b.at ? 1 : -1));
    const me = list.filter(needMe);
    return `<h2>Agreements</h2>
      ${typeof mgr === 'function' && mgr() ? `<button class="pill" data-a="newDoc" style="margin-bottom:12px">${I('plus')} New agreement</button>` : ''}
      ${me.length ? `<h3>Needs your signature</h3><div class="list">${me.map(d => {
        const l = g('leases', d.lid), i = l ? info(l) : { t: { name: '?' } };
        return `<div class="g row" data-a="doc" data-i="${d.id}">
          <div class="m"><b>${esc(d.title)}</b><small>${esc(i.t.name)} · Manager ${d.ms?'✓':'–'} · Tenant ${d.ts?'✓':'–'}</small></div>
          <span class="bd">${docSt(d)}</span></div>`;
      }).join('')}</div>` : ''}
      <h3>All</h3>
      <div class="list">${list.length ? list.map(d => {
        const l = g('leases', d.lid), i = l ? info(l) : { t: { name: '?' } };
        return `<div class="g row" data-a="doc" data-i="${d.id}">
          <div class="m"><b>${esc(d.title)}</b><small>${esc(i.t.name)} · ${d.at}</small></div>
          <span class="bd">${docSt(d)}</span></div>`;
      }).join('') : '<div class="em">No agreements yet</div>'}</div>`;
  };

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-a="newDoc"],[data-a="doc"],[data-a="signDoc"],[data-a="sendDoc"]');
    if (!t) return;
    const a = t.dataset.a, id = t.dataset.i;

    if (a === 'newDoc') {
      const leases = (D.leases || []).filter(l => l.st === 'active').map(l => {
        const i = info(l);
        return { id: l.id, label: `${i.t.name} · ${i.u.name}` };
      });
      if (!leases.length) { toast('Create a lease first'); return; }
      const tpl = `This Agreement is made between the Landlord and the Tenant for the premises described below.

1. Premises: [Unit / Property]
2. Term: From [start] to [end]
3. Rent: ₹[amount] per month, payable on or before the due date.
4. Security Deposit: ₹[deposit], refundable subject to deductions for damages or dues.
5. The Tenant agrees to keep the premises in good condition and to use them only for residential purposes.
6. Either party may terminate as per applicable local law with proper notice.

This is a plain-English template for convenience. Have it reviewed for your jurisdiction before relying on it.`;
      formModal('New agreement', [
        { k: 'lid', l: 'Lease', t: 'select', opts: leases },
        { k: 'title', l: 'Title', t: 'text', v: 'Lease agreement' },
        { k: 'body', l: 'Body', t: 'textarea', v: tpl }
      ], async f => {
        const { error } = await sb.from('documents').insert({
          org_id: ORG, lease_id: f.lid, title: f.title || 'Lease agreement', body: f.body || '', status: 'draft'
        });
        if (error) throw error;
        await load(); render();
        toast('Agreement created');
      });
    }


    if (a === 'sendDoc') {
      (async () => {
        try {
          const { error } = await sb.rpc('send_document', { p_id: id });
          if (error) throw error;
          await load(); render();
          toast('Agreement sent to tenant');
        } catch (x) {
          toast(x.message || 'Could not send');
        }
      })();
      return;
    }
    if (a === 'doc') {
      const d = (D.docs || []).find(x => x.id === id); if (!d) return;
      const l = g('leases', d.lid), i = l ? info(l) : { t: { name: '?' }, p: {}, u: {} };
      const st = d.st || 'sent';
      const can = needMe(d) && D.ok.docs;
      const isMgr = typeof mgr === 'function' ? mgr() : true;
      const canSend = isMgr && st === 'draft' && !d.ms && !d.ts;
      const o = document.createElement('div');
      o.className = 'rcw';
      o.innerHTML = `<div class="rc" style="max-width:560px">
        <div class="rh"><b>${esc(d.title)}</b><small>${esc(i.t.name)} · ${esc(i.p.name||'')} ${esc(i.u.name||'')} · ${esc(st)}</small></div>
        <pre style="white-space:pre-wrap;font:14px/1.5 system-ui;margin:12px 0;max-height:40vh;overflow:auto">${esc(d.body)}</pre>
        <p>Manager: ${d.ms ? '✓ signed' : '–'} · Tenant: ${d.ts ? '✓ signed' : '–'}</p>
        ${canSend ? `<button class="btn" data-a="sendDoc" data-i="${d.id}">Send to tenant</button>` : ''}
        ${can ? `<button class="btn" data-a="signDoc" data-i="${d.id}">Sign now</button>` : ''}
        ${st === 'draft' && !canSend ? `<p style="color:var(--mu);font-size:13px">Draft — not visible to the tenant until sent.</p>` : ''}
        <button class="btn s q" data-x>Close</button>
      </div>`;
      o.onclick = ev => {
        if (ev.target === o || ev.target.dataset.x != null) o.remove();
        const s = ev.target.closest('[data-a="signDoc"]');
        if (s) {
          o.remove();
          // signature pad
          const m = document.createElement('div');
          m.className = 'md';
          m.innerHTML = `<div class="g sheet"><h3>Sign agreement</h3>
            <canvas id="sig" width="360" height="140" style="border:1px solid var(--bd);border-radius:12px;touch-action:none;background:#fff;width:100%"></canvas>
            <div style="display:flex;gap:8px;margin-top:12px">
              <button class="btn" data-ok>Sign & save</button>
              <button class="btn s q" data-clear>Clear</button>
              <button class="btn s q" data-x>Cancel</button>
            </div></div>`;
          document.body.append(m);
          const c = m.querySelector('#sig'), ctx = c.getContext('2d');
          ctx.strokeStyle = '#0b1226'; ctx.lineWidth = 2; ctx.lineCap = 'round';
          let draw = false, has = false;
          const pos = e => {
            const r = c.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
            return [x * (c.width / r.width), y * (c.height / r.height)];
          };
          const start = e => { e.preventDefault(); draw = true; has = true; const [x,y] = pos(e); ctx.beginPath(); ctx.moveTo(x,y); };
          const move = e => { if (!draw) return; e.preventDefault(); const [x,y] = pos(e); ctx.lineTo(x,y); ctx.stroke(); };
          const end = () => { draw = false; };
          c.addEventListener('mousedown', start); c.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
          c.addEventListener('touchstart', start, {passive:false}); c.addEventListener('touchmove', move, {passive:false}); c.addEventListener('touchend', end);
          m.onclick = ev => {
            if (ev.target.dataset.x != null || ev.target === m) m.remove();
            if (ev.target.dataset.clear != null) { ctx.clearRect(0,0,c.width,c.height); has = false; }
            if (ev.target.dataset.ok != null) {
              if (!has) { toast('Draw your signature first', 1); return; }
              const b = ev.target; b.disabled = 1;
              const s = c.toDataURL('image/png');
              if (s.length > 190000) { toast('Signature too large. Clear and try again.', 1); b.disabled = 0; return; }
              sb.rpc('sign_document', { p_id: d.id, p_sig: s }).then(async r => {
                if (r.error) throw r.error;
                m.remove();
                await load(); render();
                toast('Signed');
              }).catch(x => { toast(x.message || 'Could not sign', 1); b.disabled = 0; });
            }
          };
        }
      };
      document.body.append(o);
    }
  });
})();
