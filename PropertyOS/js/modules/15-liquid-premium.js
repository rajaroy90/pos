/* PropertyOS module 15: Liquid premium layer.
   Loads last. Replaces the stacked Home wrappers with one dashboard, rebuilds list rows so actions never squeeze content,
   adds the launcher-style More sheet and grouped desktop sidebar, fixes Reports, and tidies titles and badges after every render.
   All data-a / data-i hooks are unchanged, so every existing action keeps working. */
(() => {
  'use strict';
  const safe = (f, d) => { try { return f(); } catch (e) { return d; } };
  const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
  const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0);
  const myUpi = () => D.upi || ls('po-upi-' + ORG) || '';
  const fd = s => (s ? new Date(s.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '–');
  const fdy = s => (s ? new Date(s.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '–');
  const inrc = n => {
    const a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e7) return s + '₹' + (a / 1e7).toFixed(a >= 1e8 ? 0 : 1).replace(/\.0$/, '') + 'Cr';
    if (a >= 1e5) return s + '₹' + (a / 1e5).toFixed(a >= 1e6 ? 0 : 1).replace(/\.0$/, '') + 'L';
    if (a >= 1e3) return s + '₹' + (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return s + '₹' + Math.round(a);
  };
  const plural = (n, w) => n + ' ' + w + (n == 1 ? '' : 's');
  const ago = s => {
    const d = Math.round((new Date(TD + 'T00:00:00Z') - new Date(String(s).slice(0, 10) + 'T00:00:00Z')) / 864e5);
    return d <= 0 ? 'Today' : d == 1 ? 'Yesterday' : d < 7 ? d + ' days ago' : fd(s);
  };
  const greet = () => { const h = T.getHours(); return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

  /* monotone cubic path through points, so the cash-flow line is smooth without overshooting */
  const smooth = pts => {
    const n = pts.length;
    if (n < 2) return '';
    const dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      d += `C${(pts[i][0] + h).toFixed(1)} ${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)} ${(pts[i + 1][1] - t[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`;
    }
    return d;
  };

  const monthData = n => {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const m = mk(-i);
      const cs = D.charges.filter(c => c.m == m);
      out.push({
        m,
        billed: sum(cs, c => c.amt),
        got: sum(cs, c => paid(c)),
        exp: sum((D.exp || []).filter(x => (x.at || '').slice(0, 7) == m), x => x.amt)
      });
    }
    return out;
  };

  /* ---------- Home (manager) ---------- */
  const prevHome = V.home;
  const cashChart = () => {
    const ms = monthData(12);
    const W = 340, H = 150, L = 8, R = 8, Tp = 14, B = 26;
    const mx = Math.max(1, ...ms.map(x => Math.max(x.got, x.exp)));
    const X = i => L + i * (W - L - R) / 11;
    const Y = v => Tp + (1 - v / mx) * (H - Tp - B);
    const a = ms.map((x, i) => [X(i), Y(x.got)]);
    const b = ms.map((x, i) => [X(i), Y(x.exp)]);
    const last = a[a.length - 1];
    const net = ms[11].got - ms[11].exp;
    const hasExp = ms.some(x => x.exp > 0);
    const grid = [0, .5, 1].map(f => { const y = Tp + f * (H - Tp - B); return `<line class="grid-l" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/>`; }).join('');
    const labels = ms.map((x, i) => (i % 2 == 1 ? `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${ML(x.m)}</text>` : '')).join('');
    return `<div class="g lq-chart"><div class="lq-chart-h"><div><small>Net this month</small><br><b style="color:${net >= 0 ? 'var(--ok)' : 'var(--er)'}">${net < 0 ? '−' : ''}${inr(Math.abs(net))}</b></div><small>Last 12 months</small></div>
<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Rent collected over the last 12 months"><defs><linearGradient id="lqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".34"/><stop offset="1" stop-color="var(--ac)" stop-opacity="0"/></linearGradient></defs>${grid}
<path d="${smooth(a)}L${X(11)} ${H - B}L${X(0)} ${H - B}Z" fill="url(#lqg)" stroke="none"/>
${hasExp ? `<path class="ln-b" pathLength="1" d="${smooth(b)}"/>` : ''}<path class="ln-a" pathLength="1" d="${smooth(a)}"/>
<circle class="dot" cx="${last[0]}" cy="${last[1]}" r="4.5"/>${labels}</svg>
<div class="lq-legend"><span><i></i>Collected</span>${hasExp ? '<span><i class="b"></i>Expenses</span>' : ''}</div></div>`;
  };

  const attention = () => {
    const od = D.charges.filter(c => st(c) == 'Overdue').sort((a, b) => a.due.localeCompare(b.due));
    const ex = D.leases.filter(l => l.st == 'active' && l.end >= TD && (new Date(l.end) - T) / 864e5 <= 60).sort((a, b) => a.end.localeCompare(b.end)).slice(0, 3);
    const rp = D.maint.filter(m => m.st != 'Resolved').slice(0, 3);
    const nq = D.inq.filter(q => q.st == 'New');
    if (!od.length && !ex.length && !rp.length && !nq.length) {
      return `<h2>Needs attention</h2><div class="g lq-clear">${ico('home', 'var(--ok)')}<div><b>All clear</b><small>No overdue rent, open repairs or new inquiries.</small></div></div>`;
    }
    let o = '<h2>Needs attention</h2>';
    o += od.slice(0, 3).map(c => {
      const i = info(g('leases', c.lid));
      return `<div class="g row">${ico('pay', '#ff3b30')}<div class="m"><b>${esc(i.t.name)}</b><small>${esc(i.u.name)} · ${inr(bal(c))} · ${plural(Math.max(1, Math.floor((T - new Date(c.due)) / 864e5)), 'day')} late</small></div><button class="btn s" data-a="remind" data-i="${c.id}">Remind</button></div>`;
    }).join('');
    if (od.length > 3) o += `<button class="lq-more" data-a="nav" data-v="pay" data-f="Overdue">${od.length - 3} more overdue in Rent</button>`;
    o += rp.map(m => V.mrow(m)).join('');
    o += nq.map(q => V.qrow(q)).join('');
    o += ex.map(l => {
      const i = info(l);
      return `<div class="g row">${ico('leases', '#af52de')}<div class="m"><b>${esc(i.t.name)}</b><small>${esc(i.u.name)} · lease ends ${fd(l.end)} · ${plural(Math.ceil((new Date(l.end) - T) / 864e5), 'day')} left</small></div><button class="btn s q" data-a="renew" data-i="${l.id}">Renew</button></div>`;
    }).join('');
    return o;
  };

  const checklist = () => {
    if (ls('po-cl-' + ORG)) return '';
    const s = [['Add a property', D.props.length > 0], ['Add a unit', D.units.length > 0], ['Add a tenant', D.tenants.length > 0], ['Create a lease', D.leases.length > 0], ['Set your UPI ID', !!myUpi()], ['Generate this month’s rent', D.charges.length > 0]];
    const n = s.filter(x => x[1]).length;
    if (n == s.length) return '';
    const next = s.find(x => !x[1]);
    return `<div class="g cl lq-setup"><div class="hd"><div><b style="font-size:17px">Set up your workspace</b><br><small style="color:var(--mu)">${n} of ${s.length} done</small></div><button class="btn s q" data-a="cldis">Hide</button></div><div class="lq-beam thin"><i data-w="${Math.round(n / s.length * 100)}"></i></div>${s.map(x => `<div class="it ${x[1] ? 'ok' : ''}"><em>${x[1] ? '✓' : ''}</em><b>${x[0]}</b></div>`).join('')}<button class="btn" data-a="clgo" style="width:100%;margin-top:10px">${next[0]}</button></div>`;
  };

  V.home = function () {
    if (!mgr()) return prevHome();
    const us = D.units;
    const al = D.leases.filter(l => l.st == 'active');
    const occ = us.filter(active).length;
    const roll = sum(al, l => l.rent);
    const cc = D.charges.filter(c => c.m == CM);
    const billed = sum(cc, c => c.amt);
    const col = sum(cc, c => paid(c));
    const out = sum(D.charges, c => Math.max(0, bal(c)));
    const odN = D.charges.filter(c => st(c) == 'Overdue').length;
    const r = pct(col, billed);
    const exM = sum((D.exp || []).filter(x => (x.at || '').slice(0, 7) == CM), x => x.amt);
    const net = col - exM;
    const hero = `<section class="g lq-hero"><small>${esc(D.org)} · ${MF(CM)}</small>
<h1 data-n="${col}" data-p="₹">₹0</h1><p>${billed ? 'collected so far' : 'No rent generated for ' + MF(CM) + ' yet'}</p>
<div class="lq-beam"><i data-w="${r}"></i></div>
<div class="lq-beam-meta"><span><b>${r}%</b> of ${inr(billed)} billed</span><span style="color:${out ? 'var(--er)' : 'var(--ok)'}">${out ? inr(out) + ' outstanding' : 'Nothing outstanding'}</span></div>
<div class="ac">${cc.length ? `<button class="btn" data-a="${odN ? 'remAll' : 'genRent'}">${odN ? 'Remind ' + odN + ' overdue' : 'Generate ' + ML(mk(1)) + ' rent'}</button>` : `<button class="btn" data-a="genRent">Generate ${ML(CM)} rent</button>`}</div></section>`;

    const kpi = (k, c, label, n, p, s, sub) => `<div class="g lq-kpi">${ico(k, c)}<small>${label}</small><b data-n="${n}" data-p="${p}" data-s="${s}">0</b><span>${sub}</span></div>`;
    const openRep = D.maint.filter(m => m.st != 'Resolved');
    const kpis = `<div class="lq-kpis">
${kpi('home', '#0a84ff', 'Occupancy', us.length ? occ / us.length * 100 : 0, '', '%', occ + ' of ' + plural(us.length, 'unit') + ' let')}
${kpi('pay', '#34c759', 'Monthly rent roll', roll, '₹', '', plural(al.length, 'active lease'))}
${kpi('maint', '#ff9500', 'Open repairs', openRep.length, '', '', plural(openRep.filter(m => m.pr == 'High').length, 'high priority'))}
${kpi('reports', net >= 0 ? '#5e5ce6' : '#ff3b30', 'Net this month', Math.abs(net), net < 0 ? '−₹' : '₹', '', 'after ' + inr(exM) + ' expenses')}
</div>`;

    const chips = `<div class="lq-chips"><button class="pill g" data-a="remAll">Remind all overdue</button><button class="pill g" data-a="ics">Add dues to calendar</button><button class="pill g" data-a="addExp">+ Expense</button></div>`;

    const props = D.props.length ? `<h2>Occupancy by property</h2><div class="g lq-occ">${D.props.map((p, i) => {
      const pu = us.filter(u => u.pid == p.id);
      const po = pu.filter(active).length;
      return `<div><div class="t"><b>${esc(p.name)}</b><span>${po}/${pu.length} let</span></div><div class="bar"><i data-w="${pct(po, pu.length)}" style="background:linear-gradient(90deg,hsl(${p.h} 85% 62%),hsl(${(p.h + 40) % 360} 90% 70%))"></i></div></div>`;
    }).join('')}</div>` : '';

    const exs = (D.exp || []).filter(x => (x.at || '').slice(0, 7) == CM);
    let expBlock = '';
    if (exs.length) {
      const by = {};
      exs.forEach(x => { by[x.cat || 'Other'] = (by[x.cat || 'Other'] || 0) + x.amt; });
      const ks = Object.keys(by).sort((a, b) => by[b] - by[a]);
      const tot = sum(exs, x => x.amt);
      const COLS = ['#0a84ff', '#af52de', '#ff9500', '#34c759', '#ff2d55', '#64d2ff'];
      expBlock = `<h2>Expenses in ${ML(CM)}</h2><div class="g lq-exp"><div class="lq-seg">${ks.map((k, i) => `<i style="flex:${by[k]};background:${COLS[i % COLS.length]}"></i>`).join('')}</div>${ks.slice(0, 4).map((k, i) => `<div class="r"><span><i style="background:${COLS[i % COLS.length]}"></i>${esc(k)}</span><b>${inr(by[k])}</b></div>`).join('')}<div class="r tot"><span>Total</span><b>${inr(tot)}</b></div></div>`;
    }

    const act = D.act.length ? `<h2>Recent activity</h2><div class="g lq-act">${D.act.slice(0, 5).map(a => `<div><div><b>${esc(a.t)}</b><br><small>${esc(a.s)}</small></div><small>${ago(a.at)}</small></div>`).join('')}</div>` : '';

    return hero + checklist() + attention() + `<h2>At a glance</h2>` + kpis + `<h2>Cash flow</h2>` + cashChart() + chips + props + expBlock + act;
  };

  /* ---------- Rent ---------- */
  V.pay = function () {
    const cs = CHS().filter(c => flt == 'all' || st(c) == flt).sort((a, b) => b.due.localeCompare(a.due));
    const counts = {};
    CHS().forEach(c => { const s = st(c); counts[s] = (counts[s] || 0) + 1; });
    const chips = ['all', 'Due', 'Partial', 'Overdue', 'Paid'].map(f => `<button class="pill ${flt == f ? 'on' : ''}" data-a="flt" data-i="${f}">${f == 'all' ? 'All' : f}${f != 'all' && counts[f] ? ' <em>' + counts[f] + '</em>' : ''}</button>`).join('');
    const gen = mgr() ? `<div class="ac" style="margin:0 0 14px"><button class="btn q" data-a="genRent">Generate ${ML(CM)} rent</button></div>` : '';
    const rows = cs.map(c => {
      const l = g('leases', c.lid);
      const i = info(l);
      const b = bal(c);
      const s = st(c);
      const acts = [];
      if (mgr()) {
        if (b > 0) acts.push(`<button class="btn s" data-a="payNow" data-i="${c.id}">Record payment</button>`, `<button class="btn s q" data-a="payqr" data-i="${c.id}">UPI QR</button>`, `<button class="btn s q" data-a="adj" data-i="${c.id}">Adjust</button>`);
        if (b < c.amt) acts.push(`<button class="btn s q" data-a="rcpt" data-i="${c.id}">Receipt</button>`, `<button class="btn s q" data-a="rev" data-i="${c.id}">Reverse</button>`);
      } else {
        if (b > 0 && myUpi()) acts.push(`<button class="btn s" data-a="payqr" data-i="${c.id}">Pay by UPI</button>`);
        if (b < c.amt) acts.push(`<button class="btn s q" data-a="rcpt" data-i="${c.id}">Receipt</button>`);
      }
      return `<div class="g row ${acts.length ? 'rx' : ''}">${ico('pay', s == 'Paid' ? '#34c759' : s == 'Overdue' ? '#ff3b30' : s == 'Partial' ? '#ff9500' : '#0a84ff')}<div class="m"><b>${esc(i.t.name)}</b><small>${esc(i.u.name)} · ${MF(c.m)}<br>Due ${fd(c.due)}${b > 0 && b < c.amt ? ' · ' + inr(b) + ' left' : ''}</small></div><div class="tr"><span class="lq-amt">${inr(c.amt)}</span><span class="bd ${s}">${s}</span></div>${acts.length ? `<div class="ra">${acts.join('')}</div>` : ''}</div>`;
    }).join('');
    return `<div class="ch">${chips}</div>${gen}${rows || empty(flt == 'all' ? 'No rent has been generated yet. Use Generate to create this month’s charges.' : 'No ' + flt.toLowerCase() + ' rent right now.')}`;
  };

  /* ---------- Leases ---------- */
  V.leases = function () {
    const L = LS().slice().sort((a, b) => (a.st == b.st ? b.start.localeCompare(a.start) : a.st == 'active' ? -1 : 1));
    const rows = L.map(l => {
      const i = info(l);
      const on = l.st == 'active';
      const tot = Math.max(1, new Date(l.end) - new Date(l.start));
      const el = Math.max(0, Math.min(1, (T - new Date(l.start)) / tot));
      const acts = mgr() && on ? `<div class="ra"><button class="btn s q" data-a="renew" data-i="${l.id}">Renew</button><button class="btn s q" data-a="stmt" data-i="${l.id}">Statement</button><button class="btn s d" data-a="endLease" data-i="${l.id}">End lease</button></div>` : '';
      return `<div class="g row ${acts ? 'rx' : ''}">${ico('leases', on ? '#af52de' : '#8e8e93')}<div class="m"><b>${esc(i.t.name)}</b><small>${esc(i.u.name)} · ${esc(i.p.name)}<br>${fdy(l.start)} to ${fdy(l.end)}</small></div><div class="tr"><span class="lq-amt">${inr(l.rent)}<small>/mo</small></span><span class="bd ${on ? 'Active' : 'Ended'}">${on ? 'Active' : 'Ended'}</span></div>${on ? `<div class="lq-term"><div class="lq-beam thin"><i data-w="${Math.round(el * 100)}"></i></div><span>Deposit ${inr(l.dep)} · ${Math.round(el * 100)}% of term</span></div>` : `<div class="lq-term"><span>Deposit ${inr(l.dep)}</span></div>`}${acts}</div>`;
    }).join('');
    return `${mgr() ? '<div class="ac" style="margin:0 0 14px"><button class="btn" data-a="addLease">New lease</button></div>' : ''}${rows || empty('No leases yet. Create a lease to start collecting rent.')}`;
  };

  /* ---------- Deposits, Utilities, Agreements ---------- */
  const missing = (t, n) => `<div class="g em"><p>${t}</p><small>Run migration <code>011_deposits_utilities_documents.sql</code> in Supabase, then reload.</small></div>`;
  const depOf = l => {
    const rows = (D.dep || []).filter(x => x.lid === l.id);
    const c = sum(rows.filter(x => x.kind === 'collected'), x => x.amt);
    const d = sum(rows.filter(x => x.kind === 'deduction'), x => x.amt);
    const r = sum(rows.filter(x => x.kind === 'refund'), x => x.amt);
    return { c, d, r, held: Math.max(0, c - d - r) };
  };
  V.dep = function () {
    if (!D.ok || !D.ok.dep) return missing('Security deposits are not set up yet.');
    const L = D.leases.filter(l => l.st === 'active' || depOf(l).held > 0);
    if (!L.length) return empty('No deposits yet. Deposits appear here once a lease is active.');
    const held = sum(L, l => depOf(l).held);
    const rows = L.map(l => {
      const i = info(l), dp = depOf(l);
      const s = dp.held ? 'Held' : dp.c ? 'Settled' : 'Not collected';
      return `<div class="g row" data-a="depLease" data-i="${l.id}">${ico('dep', dp.held ? '#ff9500' : dp.c ? '#34c759' : '#8e8e93')}<div class="m"><b>${esc(i.t.name)}</b><small>${esc(i.u.name)} · ${esc(i.p.name)}<br>${inr(dp.held)} held of ${inr(l.dep)}</small></div><div class="tr"><span class="bd ${dp.held ? 'Due' : dp.c ? 'Paid' : 'Partial'}">${s}</span></div></div>`;
    }).join('');
    return `<div class="g lq-hero lq-sum"><small>Held across ${plural(L.length, 'lease')}</small><h1 data-n="${held}" data-p="₹">₹0</h1></div>${rows}`;
  };

  const UK = { electricity: '#ff9500', water: '#32ade6', gas: '#ff6b35', internet: '#af52de', maintenance: '#8e8e93' };
  V.utils = function () {
    if (!D.ok || !D.ok.ub) return missing('Utility bills are not set up yet.');
    const list = (D.ub || []).slice().sort((a, b) => (a.m < b.m ? 1 : a.m > b.m ? -1 : 0));
    const open = list.filter(x => !x.paidAt);
    const done = list.filter(x => x.paidAt);
    const row = b => {
      const u = g('units', b.uid) || {}, p = g('props', u.pid) || {};
      const late = !b.paidAt && b.due && b.due < TD;
      const s = b.paidAt ? 'Paid' : late ? 'Overdue' : 'Open';
      return `<div class="g row" data-a="utilDetail" data-i="${b.id}">${ico('utils', UK[b.kind] || '#30b0c7')}<div class="m"><b style="text-transform:capitalize">${esc(b.kind)} · ${esc(u.name || '')}</b><small>${esc(p.name || '')} · ${b.m ? MF(b.m) : ''}<br>${b.paidAt ? 'Paid ' + fd(b.paidAt) : 'Due ' + fd(b.due)}</small></div><div class="tr"><span class="lq-amt">${inr(b.amt)}</span><span class="bd ${s == 'Open' ? 'Due' : s}">${s}</span></div></div>`;
    };
    return `${mgr() ? '<div class="ac" style="margin:0 0 6px"><button class="btn" data-a="newUtil">New bill</button></div>' : ''}
<h2>Open${open.length ? ' · ' + open.length : ''}</h2>${open.map(row).join('') || empty('No open bills.')}
<h2>Paid</h2>${done.slice(0, 20).map(row).join('') || empty('No paid bills yet.')}`;
  };

  const docSt = d => (d.ms && d.ts ? 'Signed' : d.ms || d.ts ? 'Partial' : 'Draft');
  const needMe = d => {
    const s = d.st || d.status;
    if (s === 'draft' || s === 'signed') return false;
    return mgr() ? !d.ms : !d.ts;
  };
  V.docs = function () {
    if (!D.ok || !D.ok.docs) return missing('Agreements are not set up yet.');
    const list = (D.docs || []).slice().sort((a, b) => (a.at < b.at ? 1 : -1));
    const me = list.filter(needMe);
    const row = d => {
      const l = g('leases', d.lid), i = l ? info(l) : { t: { name: '?' }, u: {} };
      const s = docSt(d);
      return `<div class="g row" data-a="doc" data-i="${d.id}">${ico('docs', s == 'Signed' ? '#34c759' : '#5e5ce6')}<div class="m"><b>${esc(d.title)}</b><small>${esc(i.t.name)} · ${esc((i.u || {}).name || '')}<br>Manager ${d.ms ? 'signed' : 'not yet'} · Tenant ${d.ts ? 'signed' : 'not yet'}</small></div><div class="tr"><span class="bd ${s == 'Signed' ? 'Paid' : s == 'Partial' ? 'Partial' : 'Due'}">${s}</span></div></div>`;
    };
    return `${mgr() ? '<div class="ac" style="margin:0 0 6px"><button class="btn" data-a="newDoc">New agreement</button></div>' : ''}
${me.length ? `<h2>Needs your signature</h2>${me.map(row).join('')}` : ''}<h2>All agreements</h2>${list.map(row).join('') || empty('No agreements yet. Create one from an active lease.')}`;
  };

  /* ---------- Reports ---------- */
  V.reports = function () {
    if (!mgr()) return empty('Only managers and owners can view reports.');
    const ms = monthData(12);
    const mx = Math.max(1, ...ms.map(b => b.billed));
    const al = D.leases.filter(l => l.st === 'active');
    const occ = pct(al.length, D.units.length);
    const roll = sum(al, l => l.rent);
    const cur = ms[ms.length - 1];
    const rate = pct(cur.got, cur.billed);
    const overdue = sum(D.charges, c => Math.max(0, bal(c)));
    const expBy = {}, colBy = {};
    (D.exp || []).forEach(e => { if (e.pid) expBy[e.pid] = (expBy[e.pid] || 0) + e.amt; });
    D.charges.forEach(c => { const l = g('leases', c.lid), u = l && g('units', l.uid); if (u) colBy[u.pid] = (colBy[u.pid] || 0) + paid(c); });
    const prof = D.props.map(p => ({ p, col: colBy[p.id] || 0, exp: expBy[p.id] || 0 })).map(x => ({ ...x, net: x.col - x.exp })).sort((a, b) => b.net - a.net);
    const kpi = (k, c, label, val, sub, color) => `<div class="g lq-kpi">${ico(k, c)}<small>${label}</small><b${color ? ` style="color:${color}"` : ''}>${val}</b><span>${sub}</span></div>`;
    return `<div class="lq-kpis">${kpi('home', '#0a84ff', 'Occupancy', occ + '%', al.length + ' of ' + plural(D.units.length, 'unit'))}${kpi('pay', '#34c759', 'Monthly rent roll', inr(roll), plural(al.length, 'active lease'))}${kpi('reports', '#5e5ce6', 'Collection rate', rate + '%', MF(CM))}${kpi('pay', overdue ? '#ff3b30' : '#34c759', 'Outstanding', inr(overdue), overdue ? 'Across all months' : 'All collected', overdue ? 'var(--er)' : 'var(--ok)')}</div>
<h2>Billed vs collected</h2><div class="g lq-chart"><div class="lq-bars" role="img" aria-label="Billed and collected rent for the last 12 months">${ms.map(b => `<div title="${MF(b.m)}: billed ${inr(b.billed)}, collected ${inr(b.got)}"><p><s class="lq-b" data-h="${b.billed / mx * 100}"></s><s class="lq-c" data-h="${b.got / mx * 100}"></s></p><em>${ML(b.m)}</em></div>`).join('')}</div><div class="lq-legend"><span><i class="g"></i>Billed</span><span><i></i>Collected</span></div></div>
<h2>Profit by property</h2>${prof.map(r => `<div class="g row">${ico('props', '#30b0c7')}<div class="m"><b>${esc(r.p.name)}</b><small>Collected ${inr(r.col)} · Expenses ${inr(r.exp)}</small></div><div class="tr"><span class="lq-amt" style="color:${r.net >= 0 ? 'var(--ok)' : 'var(--er)'}">${r.net < 0 ? '−' : ''}${inr(Math.abs(r.net))}</span></div></div>`).join('') || empty('Add a property and record rent to see profit.')}
<div class="ac" style="margin-top:8px"><button class="btn q" data-a="csv">Export payments CSV</button></div>`;
  };

  /* ---------- More: launcher ---------- */
  const GROUPS = [['Collect', ['queue', 'ledger']], ['People and places', ['leases', 'tenants', 'inq']], ['Money', ['exp', 'dep', 'utils', 'reports']], ['Operations', ['maint', 'docs']], ['Workspace', ['team', 'set']]];
  const counts = () => ({
    maint: D.maint.filter(m => m.st != 'Resolved').length,
    inq: D.inq.filter(q => q.st == 'New').length,
    utils: (D.ub || []).filter(b => !b.paidAt).length,
    docs: (D.docs || []).filter(needMe).length
  });
  A.more = function () {
    const o = document.createElement('div');
    o.className = 'ov';
    const cn = counts();
    const known = new Set(GROUPS.flatMap(x => x[1]));
    const extra = MORE.filter(k => !known.has(k));
    const groups = GROUPS.map(([n, ks]) => [n, ks.filter(k => MORE.includes(k) && SEC[k])]).concat(extra.length ? [['Other', extra.filter(k => SEC[k])]] : []).filter(x => x[1].length);
    o.innerHTML = `<div class="sh g lq-launch" role="dialog" aria-label="More"><div class="lq-grab"></div><div class="lq-search">${I('search')}<input id="lqq" type="search" placeholder="Search sections" autocomplete="off" aria-label="Search sections"></div>${groups.map(([n, ks]) => `<h4>${n}</h4><div class="lq-tiles">${ks.map(k => `<button class="lq-tile" data-a="nav" data-v="${k}" data-k="${SEC[k][0].toLowerCase()}">${ico(k, SEC[k][1])}${cn[k] ? `<em class="lq-cnt">${cn[k]}</em>` : ''}<span>${SEC[k][0]}</span></button>`).join('')}</div>`).join('')}</div>`;
    o.onclick = e => {
      if (e.target == o || e.target.closest('[data-a]')) setTimeout(() => o.remove());
    };
    document.body.append(o);
    const inp = o.querySelector('#lqq');
    inp.oninput = () => {
      const q = inp.value.trim().toLowerCase();
      o.querySelectorAll('.lq-tile').forEach(t => { t.hidden = !!q && !t.dataset.k.includes(q); });
      o.querySelectorAll('.lq-tiles').forEach(w => { const none = ![...w.children].some(t => !t.hidden); w.hidden = none; if (w.previousElementSibling) w.previousElementSibling.hidden = none; });
    };
  };

  /* ---------- Desktop sidebar ---------- */
  const SD = [['Overview', ['home', 'wallet']], ['Portfolio', ['props', 'tenants', 'leases']], ['Money', ['pay', 'queue', 'ledger', 'exp', 'dep', 'utils', 'reports']], ['Operations', ['maint', 'inq', 'docs']], ['Workspace', ['team', 'set']]];
  const sidebar = () => {
    const sd = $('#sd');
    if (!sd) return;
    const keys = role == 'tenant' ? TEN : Object.keys(SEC);
    const seen = new Set();
    const grp = SD.map(([n, ks]) => [n, ks.filter(k => keys.includes(k))]);
    keys.forEach(k => { if (!SD.some(x => x[1].includes(k))) { (grp.find(x => x[0] == 'Workspace') || grp[0])[1].push(k); } });
    const cn = counts();
    sd.innerHTML = `<div class="br">PropertyOS</div>` + grp.filter(x => x[1].length).map(([n, ks]) => (role == 'tenant' ? '' : `<h5>${n}</h5>`) + ks.filter(k => !seen.has(k) && seen.add(k)).map(k => `<button class="${view == k ? 'on' : ''}" data-a="nav" data-v="${k}" style="--sec:${SEC[k][1]}">${I(k)}<span>${SEC[k][0]}</span>${cn[k] ? `<em class="lq-cnt">${cn[k]}</em>` : ''}</button>`).join('')).join('');
  };

  /* ---------- Post-render tidy ---------- */
  const BADGE = { open: 'Due', new: 'Due', draft: 'Due', held: 'Due', paid: 'Paid', signed: 'Paid', settled: 'Paid', active: 'Active', resolved: 'Resolved', closed: 'Closed', partial: 'Partial', contacted: 'Contacted', overdue: 'Overdue', ended: 'Ended', 'not collected': 'Partial' };
  const DUP = /^(utility bills|security deposits|agreements|reports|team|deposits|utilities|home)$/i;
  function decorate() {
    safe(() => {
      const v = $('#v');
      if (!v) return;
      const h1 = v.querySelector(':scope > h1');
      const first = h1 && h1.nextElementSibling;
      if (first && first.tagName == 'H2' && DUP.test(first.textContent.trim())) first.remove();
      v.querySelectorAll('.g.em > h2').forEach(h => h.remove());
      v.querySelectorAll('.bd').forEach(b => {
        const cls = [...b.classList].filter(c => c != 'bd');
        if (!cls.length) { const k = BADGE[b.textContent.trim().toLowerCase()]; if (k) b.classList.add(k); }
      });
      if (h1 && view == 'home' && mgr()) h1.textContent = greet();
      sidebar();
      requestAnimationFrame(() => { v.querySelectorAll('[data-w]').forEach(e => { e.style.width = Math.max(2, +e.dataset.w) + '%'; }); v.querySelectorAll('[data-h]').forEach(e => { e.style.height = Math.max(+e.dataset.h > 0 ? 3 : 0, +e.dataset.h) + '%'; }); });
    });
  }
  const baseRender = render;
  render = function () {
    const r = baseRender.apply(this, arguments);
    decorate();
    return r;
  };

  /* Rent chips from Home deep-link */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a="nav"][data-f]');
    if (b) flt = b.dataset.f;
  }, true);

  /* ---------- Confirm sheet instead of the native confirm() (Team) ---------- */
  const nativeConfirm = window.confirm.bind(window);
  let yes = false;
  window.confirm = m => (yes ? ((yes = false), true) : nativeConfirm(m));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a="removeMember"]');
    if (!b || b.dataset.ok) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const o = document.createElement('div');
    o.className = 'ov';
    o.innerHTML = '<div class="sh g" role="alertdialog"><div class="lq-grab"></div><h3>Remove this person?</h3><p style="color:var(--mu)">They lose access to this workspace straight away. You can invite them again later.</p><div class="ac"><button class="btn q" data-x>Cancel</button><button class="btn d" data-go>Remove access</button></div></div>';
    o.onclick = ev => {
      if (ev.target == o || ev.target.dataset.x != null) o.remove();
      else if (ev.target.dataset.go != null) {
        o.remove();
        b.dataset.ok = '1';
        yes = true;
        b.click();
        delete b.dataset.ok;
      }
    };
    document.body.append(o);
  }, true);

  if (document.body.classList.contains('ready')) safe(render);
})();
