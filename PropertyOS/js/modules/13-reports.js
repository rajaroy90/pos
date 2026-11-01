/* PropertyOS module 13: Reports — cash flow, occupancy, collection rate, profit by property. */
(() => {
  if (typeof MORE !== 'undefined' && !MORE.includes('reports')) MORE.push('reports');
  if (typeof SEC !== 'undefined') SEC.reports = ['Reports', '#af52de'];
  if (typeof P !== 'undefined' && !P.reports) {
    P.reports = "M3 3v18h18M7 14l4-4 4 4 5-6";
  }

  const g = (a, i) => (D[a] || []).find(x => x.id === i);
  const months = (n = 12) => {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(mk(-i));
    return out;
  };

  V.reports = function () {
    if (typeof mgr === 'function' && !mgr()) {
      return `<div class="g em"><h2>Reports</h2><p>Only managers and owners can view reports.</p></div>`;
    }

    const ms = months(12);
    const bars = ms.map(m => {
      const cs = (D.charges || []).filter(c => c.m === m);
      const billed = cs.reduce((s, c) => s + c.amt, 0);
      const collected = cs.reduce((s, c) => s + paid(c), 0);
      return { m, billed, collected };
    });
    const maxB = Math.max(1, ...bars.map(b => b.billed));

    const units = D.units || [];
    const activeLeases = (D.leases || []).filter(l => l.st === 'active');
    const occ = units.length ? Math.round(activeLeases.length / units.length * 100) : 0;
    const roll = activeLeases.reduce((s, l) => s + l.rent, 0);
    const thisMonth = bars[bars.length - 1] || { billed: 0, collected: 0 };
    const rate = thisMonth.billed ? Math.round(thisMonth.collected / thisMonth.billed * 100) : 0;
    const overdue = (D.charges || []).reduce((s, c) => s + Math.max(0, bal(c)), 0);

    // Profit by property (rent collected − expenses)
    const expByProp = {};
    (D.exp || []).forEach(e => {
      const pid = e.pid || e.property_id;
      if (!pid) return;
      expByProp[pid] = (expByProp[pid] || 0) + (e.amt || e.amount / 100 || 0);
    });
    // Approximate: map charges → lease → unit → property
    const colByProp = {};
    (D.charges || []).forEach(c => {
      const l = g('leases', c.lid);
      if (!l) return;
      const u = g('units', l.uid);
      if (!u) return;
      colByProp[u.pid] = (colByProp[u.pid] || 0) + paid(c);
    });
    const profitRows = (D.props || []).map(p => {
      const col = colByProp[p.id] || 0;
      const exp = expByProp[p.id] || 0;
      return { name: p.name, col, exp, profit: col - exp };
    }).sort((a, b) => b.profit - a.profit);

    return `
      <h2>Reports</h2>
      <div class="g k" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:18px">
        <div><small>Occupancy</small><b style="font-size:22px">${occ}%</b><span>${activeLeases.length}/${units.length} units</span></div>
        <div><small>Monthly roll</small><b style="font-size:22px">${inr(roll)}</b><span>Active leases</span></div>
        <div><small>Collection rate</small><b style="font-size:22px">${rate}%</b><span>${MF(CM)}</span></div>
        <div><small>Overdue</small><b style="font-size:22px;color:${overdue ? 'var(--er)' : 'var(--ok)'}">${inr(overdue)}</b><span>Outstanding</span></div>
      </div>

      <h3>12-month cash flow</h3>
      <div class="g" style="padding:14px;margin-bottom:18px">
        <div style="display:flex;align-items:flex-end;gap:4px;height:120px">
          ${bars.map(b => {
            const h1 = Math.round(b.billed / maxB * 100);
            const h2 = Math.round(b.collected / maxB * 100);
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px" title="${MF(b.m)}: billed ${inr(b.billed)}, collected ${inr(b.collected)}">
              <div style="width:100%;background:var(--ac);opacity:.35;height:${h1}%;border-radius:4px 4px 0 0;min-height:${b.billed ? 2 : 0}px"></div>
              <div style="width:100%;background:var(--ok);height:${h2}%;border-radius:4px 4px 0 0;min-height:${b.collected ? 2 : 0}px;margin-top:-${h1}%"></div>
              <small style="font-size:9px;color:var(--mu);margin-top:4px">${ML(b.m)}</small>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:16px;margin-top:10px;font-size:12px;color:var(--mu)">
          <span><i style="display:inline-block;width:10px;height:10px;background:var(--ac);opacity:.35;border-radius:2px"></i> Billed</span>
          <span><i style="display:inline-block;width:10px;height:10px;background:var(--ok);border-radius:2px"></i> Collected</span>
        </div>
      </div>

      <h3>Profit by property</h3>
      <div class="list">
        ${profitRows.length ? profitRows.map(r => `
          <div class="g row">
            <div class="m"><b>${esc(r.name)}</b>
            <small>Collected ${inr(r.col)} · Expenses ${inr(r.exp)}</small></div>
            <b style="color:${r.profit >= 0 ? 'var(--ok)' : 'var(--er)'}">${inr(r.profit)}</b>
          </div>`).join('') : '<div class="em">Add properties and record rent to see profit.</div>'}
      </div>

      <div style="margin-top:20px">
        <button class="btn s" data-a="csv">Export payments CSV</button>
      </div>
    `;
  };
})();
