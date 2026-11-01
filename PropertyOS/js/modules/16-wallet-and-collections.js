/* PropertyOS module 16: Wallet, Reminders queue, Ledger and bank reconciliation, privacy mode.
   Adopted from the iOS demo, rebuilt on live workspace data only (no sample records).
   - Wallet:    one rent pass per active lease, tap to fan out, tap a pass to flip it to its UPI QR.
   - Reminders: send overdue / due rent reminders one at a time via WhatsApp (always a draft you review).
   - Ledger:    payments, expenses, deposits and charges in one list, CSV export, bank CSV comparison.
   - Privacy:   hide balances with one tap (eye button in the header, or Settings). */
(() => {
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const g = (a, i) => (D[a] || []).find(x => x.id === i);
  const MG = () => typeof mgr === 'function' && mgr();
  const NONE = { t: {}, u: {}, p: {} };
  const inf = l => { try { return l ? info(l) : NONE; } catch (e) { return NONE; } };
  const upiId = () => D.upi || ls('po-upi-' + ORG) || '';
  const plusDays = (iso, n) => new Date(new Date(iso + 'T00:00:00Z').getTime() + n * 864e5).toISOString().slice(0, 10);

  /* ---------- Register sections ---------- */
  Object.assign(P, {
    wallet: 'M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4zM4 7V6a2 2 0 0 1 2-2h10M16 13h4v3h-4z',
    queue: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
    ledger: 'M4 4h16v16H4zM4 9h16M9 9v11',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'
  });
  SEC.wallet = ['Wallet', '#7a5aff'];
  SEC.queue = ['Reminders', '#25d366'];
  SEC.ledger = ['Ledger', '#0a84ff'];

  /* Navigation: Wallet becomes a main tab (it replaces Leases there); Leases moves into More.
     Reminders and Ledger join the Money / Collect groups. */
  TABS.splice(0, TABS.length, 'home', 'wallet', 'props', 'pay', 'more');
  ['leases', 'queue', 'ledger'].forEach(k => { if (!MORE.includes(k)) MORE.unshift(k); });

  /* ---------- Privacy: hide balances ---------- */
  const HK = 'po-hide-bal';
  const hidden = () => ls(HK) === '1';
  const applyHide = () => {
    document.documentElement.classList.toggle('po-hide', hidden());
    document.querySelectorAll('[data-a="hideBal"]').forEach(b => b.setAttribute('aria-pressed', String(hidden())));
  };
  A.hideBal = () => {
    ls(HK, hidden() ? '0' : '1');
    applyHide();
    toast(hidden() ? 'Balances hidden' : 'Balances visible');
  };
  applyHide();

  const _set = V.set;
  V.set = function () {
    const base = _set.apply(this, arguments);
    if (!MG()) return base;
    return base + `<div class="g row" data-a="hideBal" role="button" tabindex="0">${ico('eye', '#8e8e93')}<div class="m"><b>Hide balances</b><small>Blur rent and money figures on screen. Handy when someone is looking over your shoulder.</small></div><span class="bd ${hidden() ? 'Active' : 'Due'}" id="poHideState">${hidden() ? 'On' : 'Off'}</span></div>`;
  };
  const _hb = A.hideBal;
  A.hideBal = function () {
    _hb.apply(this, arguments);
    const s = document.getElementById('poHideState');
    if (s) { s.textContent = hidden() ? 'On' : 'Off'; s.className = 'bd ' + (hidden() ? 'Active' : 'Due'); }
  };

  /* ---------- Wallet ---------- */
  const SKINS = [['blue', 'Electric Blue'], ['amber', 'Amber Gold'], ['emerald', 'Emerald'], ['titanium', 'Titanium'], ['violet', 'Royal Violet'], ['rose', 'Rose'], ['teal', 'Lagoon Teal'], ['midnight', 'Midnight'], ['copper', 'Copper'], ['ruby', 'Ruby'], ['lavender', 'Lavender'], ['ocean', 'Ocean'], ['sunset', 'Sunset'], ['forest', 'Forest'], ['sapphire', 'Sapphire']];
  const skinOf = lid => {
    const s = ls('po-skin-' + lid);
    if (s && SKINS.some(x => x[0] === s)) return s;
    return SKINS[[...String(lid)].reduce((n, c) => n + c.charCodeAt(0), 0) % SKINS.length][0];
  };
  let fanOpen = false;

  const passes = () => D.leases.filter(l => l.st === 'active').map(l => {
    const i = inf(l);
    const cs = D.charges.filter(c => c.lid === l.id).sort((a, b) => (a.m < b.m ? 1 : -1));
    const open = cs.filter(c => bal(c) > 0).sort((a, b) => (a.due < b.due ? -1 : 1));
    const due = open.reduce((s, c) => s + bal(c), 0);
    const c = open[0] || cs[0] || null;
    const status = open.length ? st(open[0]) : c ? 'Paid' : 'No charge yet';
    return { l, i, open, due, c, status, skin: skinOf(l.id) };
  }).sort((a, b) => b.due - a.due);

  const upiUrl = p => {
    const c = p.open[0];
    return `upi://pay?pa=${encodeURIComponent(upiId())}&pn=${encodeURIComponent(D.org || 'PropertyOS')}&am=${bal(c).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Rent ' + MF(c.m) + ' ' + (p.i.u.name || ''))}`;
  };

  const passFront = p => `<div class="po-face po-front po-skin-${p.skin}">
    <div class="po-top"><span class="po-brand"><b>${E(D.org || 'PropertyOS')}</b><small>Rent pass</small></span><span class="po-pill">${E(p.status)}</span></div>
    <div class="po-mid"><small>${p.due ? 'Outstanding' : 'Monthly rent'}</small><div class="po-amount po-amt">${inr(p.due || p.l.rent)}</div></div>
    <div class="po-bot"><b>${E(p.i.t.name || 'Tenant')}</b><span>${E(p.i.p.name || '')}${p.i.p.name && p.i.u.name ? ' · ' : ''}${E(p.i.u.name || '')}</span>${p.open[0] ? `<span>Due ${E(p.open[0].due)}</span>` : ''}</div>
  </div>`;

  const passBack = p => {
    let body;
    if (!p.due) {
      body = `<div class="po-bk"><b>All paid up ✓</b><small>No rent is outstanding for this lease.</small></div>`;
    } else if (!upiId()) {
      body = `<div class="po-bk"><b>Add your UPI ID</b><small>Set it once and every pass shows a scannable QR with the exact amount.</small><button class="btn s" data-a="upi">Set UPI ID</button></div>`;
    } else {
      body = `<div class="po-qr">${qrSvg(upiUrl(p), { size: 128 })}</div><div class="po-bk"><b class="po-amt">${inr(bal(p.open[0]))}</b><small>${E(MF(p.open[0].m))}${p.open.length > 1 ? ` · +${p.open.length - 1} more month${p.open.length > 2 ? 's' : ''}` : ''}</small><small>Scan with any UPI app. Record the payment here once it arrives.</small></div>`;
    }
    return `<div class="po-face po-back po-skin-${p.skin}">${body}</div>`;
  };

  V.wallet = function () {
    if (!MG()) return empty('Only managers and owners can open the wallet.');
    const ps = passes();
    const out = ps.reduce((s, p) => s + p.due, 0);
    const od = D.charges.filter(c => st(c) === 'Overdue').reduce((s, c) => s + bal(c), 0);
    const hero = `<div class="g po-hero">
      <div class="po-hero-top"><small class="po-eyebrow">Rent passes</small><button class="pill g" data-a="hideBal" aria-label="Hide balances" aria-pressed="${hidden()}">${I('eye')}</button></div>
      <small class="po-lbl">Total outstanding</small>
      <div class="po-big po-amt">${inr(out)}</div>
      <small class="po-sub">${od ? `<span class="po-neg">${inr(od)}</span> overdue · ` : ''}${ps.length} active pass${ps.length === 1 ? '' : 'es'}</small>
      <div class="ac po-acts"><button class="btn s" data-a="nav" data-v="pay">Collect</button><button class="btn s q" data-a="nav" data-v="queue">Reminders</button><button class="btn s q" data-a="upiqr">Rent QR</button><button class="btn s q" data-a="walletReceipts">Receipts</button></div>
    </div>`;
    if (!ps.length) {
      return hero + empty('No active leases yet. Create a lease and its rent pass appears here.') + `<div class="ac" style="margin-top:12px"><button class="btn" data-a="nav" data-v="leases">Go to leases</button></div>`;
    }
    const open = fanOpen || ps.length < 2;
    const items = ps.map((p, n) => {
      const c = p.c;
      const acts = [];
      if (p.due && p.open[0]) {
        acts.push(`<button class="pill" data-a="remind" data-i="${p.open[0].id}">Remind</button>`);
        acts.push(`<button class="pill" data-a="payNow" data-i="${p.open[0].id}">Record payment</button>`);
      } else if (c && paid(c) > 0) {
        acts.push(`<button class="pill" data-a="rcpt" data-i="${c.id}">Receipt</button>`);
      }
      acts.push(`<button class="pill" data-a="passSkin" data-i="${p.l.id}">Finish</button>`);
      return `<div class="po-item" style="--n:${n}">
        <div class="po-card" data-a="passTap" role="button" tabindex="0" aria-label="${E(p.i.t.name || 'Tenant')}, ${E(p.status)}. Tap to flip."><div class="po-flip">${passFront(p)}${passBack(p)}</div></div>
        <div class="po-row-acts">${acts.join('')}</div>
      </div>`;
    }).join('');
    return `${hero}<h2>Passes</h2>
      <p class="po-hint">${open ? 'Tap a pass to flip it for the UPI QR code.' : 'Tap the stack to fan it out, then tap a pass to flip it for the UPI QR code.'}${ps.length > 1 && open ? ` <button class="pill" data-a="fanToggle">Stack</button>` : ''}</p>
      <div class="po-fan${open ? ' open' : ''}">${items}</div>`;
  };

  A.passTap = el => {
    const fan = el.closest('.po-fan');
    if (!fan) return;
    if (!fan.classList.contains('open')) { fan.classList.add('open'); fanOpen = true; return; }
    const f = el.querySelector('.po-flip');
    if (f) f.classList.toggle('flipped');
  };
  A.fanToggle = () => { fanOpen = !fanOpen; render(); };
  A.walletReceipts = () => { flt = 'Paid'; go('pay'); };
  A.passSkin = el => {
    const lid = el.dataset.i;
    modal(`<h3>Pass finish</h3><p style="color:var(--mu)">Choose the colour of this rent pass. It is saved on this device.</p><div class="po-swatches">${SKINS.map(([k, n]) => `<button class="po-sw po-skin-${k}${skinOf(lid) === k ? ' on' : ''}" data-x data-a="pickSkin" data-i="${lid}" data-k="${k}" aria-label="${n}" title="${n}"></button>`).join('')}</div><button class="btn q" data-x style="width:100%">Close</button>`);
  };
  A.pickSkin = el => { ls('po-skin-' + el.dataset.i, el.dataset.k); render(); };

  /* ---------- Reminders queue ---------- */
  const qKey = () => 'po-rq-' + ORG + '-' + CM;
  const qSent = () => { try { return JSON.parse(ls(qKey()) || '[]'); } catch (e) { return []; } };
  const qMark = lid => { const s = qSent(); if (!s.includes(lid)) { s.push(lid); ls(qKey(), JSON.stringify(s)); } };
  const waNum = t => { const ph = String((t && t.phone) || '').replace(/\D/g, ''); return ph.length === 10 ? '91' + ph : ph; };
  const queue = () => D.leases.filter(l => l.st === 'active').map(l => {
    const open = D.charges.filter(c => c.lid === l.id && c.m <= CM && bal(c) > 0).sort((a, b) => (a.due < b.due ? -1 : 1));
    if (!open.length) return null;
    const i = inf(l);
    const due = open.reduce((s, c) => s + bal(c), 0);
    const months = open.map(c => MF(c.m)).join(', ');
    const first = (i.t.name || 'there').split(' ')[0];
    const late = open[0].due < TD;
    const msg = `Hi ${first}, a friendly reminder that rent of ${inr(due)} for ${months} (${i.u.name || 'your unit'}) ${late ? 'was due on ' + open[0].due : 'is due on ' + open[0].due}. Please let us know once it's paid. Thank you, ${D.org}`;
    return { l, i, open, due, months, late, phone: waNum(i.t), msg };
  }).filter(Boolean).sort((a, b) => (b.late - a.late) || (b.due - a.due));

  const openWa = q => {
    window.open('https://wa.me/' + q.phone + '?text=' + encodeURIComponent(q.msg), '_blank', 'noopener');
    qMark(q.l.id);
  };

  V.queue = function () {
    if (!MG()) return empty('Only managers and owners can send reminders.');
    const qs = queue();
    if (!qs.length) return empty('No rent is waiting to be collected. Reminders appear here when a charge is due or overdue.');
    const sent = qSent();
    const sendable = qs.filter(q => q.phone);
    const done = sendable.filter(q => sent.includes(q.l.id)).length;
    const pct = sendable.length ? Math.round(done / sendable.length * 100) : 0;
    const rows = qs.map(q => {
      const was = sent.includes(q.l.id);
      return `<div class="g row">${ico('queue', q.late ? '#ff3b30' : '#25d366')}<div class="m"><b>${E(q.i.t.name || 'Tenant')} · ${E(q.i.u.name || '')}</b><small><span class="po-amt">${inr(q.due)}</span> · ${E(q.months)}${q.late ? ' · overdue' : ''}${was ? ' · <b style="color:var(--ok,#34c759)">Opened in WhatsApp</b>' : ''}</small></div>${q.phone ? `<button class="pill" data-a="qSend" data-i="${q.l.id}">${was ? 'Again' : 'Send'}</button>` : `<button class="pill" data-a="editTen" data-i="${q.i.t.id}">Add phone</button>`}</div>`;
    }).join('');
    return `<div class="g k"><small>${E(MF(CM))}</small><b class="po-amt">${done} of ${sendable.length}</b><span>reminders opened in WhatsApp</span><div class="po-bar"><i style="width:${pct}%"></i></div></div>
      <div class="ac" style="margin:12px 0"><button class="btn" data-a="qNext"${done >= sendable.length ? ' disabled' : ''}>Send next reminder</button><button class="btn q" data-a="qReset">Start over</button></div>
      <p class="po-hint">WhatsApp opens with the message ready so you can read it before it goes out. Nothing is sent automatically, and opening a message does not mark any rent as paid.</p>
      <h2>Reminders</h2>${rows}`;
  };
  A.qNext = () => {
    const sent = qSent();
    const q = queue().find(x => x.phone && !sent.includes(x.l.id));
    if (!q) return toast('All reminders have been opened');
    openWa(q);
    render();
  };
  A.qSend = el => {
    const q = queue().find(x => x.l.id === el.dataset.i);
    if (!q || !q.phone) return;
    openWa(q);
    render();
  };
  A.qReset = () => { ls(qKey(), '[]'); render(); toast('Queue reset'); };

  /* ---------- Ledger ---------- */
  let lf = 'all';
  let REC = null;
  const LIMIT = 60;

  const ledgerRows = () => {
    const out = [];
    D.pays.forEach(p => {
      const c = g('charges', p.cid);
      const i = inf(c && g('leases', c.lid));
      out.push({ at: p.at, k: 'pay', ref: p.ref || 'Rent payment', who: [i.t.name, i.u.name].filter(Boolean).join(' · '), amt: p.rev ? 0 : p.amt, face: p.amt, cls: p.rev ? 'Reversed, not counted' : 'Income' });
    });
    (D.exp || []).forEach(x => {
      const pr = g('props', x.pid);
      out.push({ at: x.at, k: 'exp', ref: x.cat || 'Expense', who: [pr && pr.name, x.note].filter(Boolean).join(' · '), amt: -x.amt, face: -x.amt, cls: 'Expense' });
    });
    (D.dep || []).forEach(x => {
      const i = inf(g('leases', x.lid));
      out.push({ at: x.at, k: 'dep', ref: 'Deposit ' + x.kind, who: [i.t.name, i.u.name].filter(Boolean).join(' · '), amt: 0, face: (x.kind === 'collected' ? 1 : -1) * x.amt, cls: 'Deposit, not income' });
    });
    D.charges.forEach(c => {
      const i = inf(g('leases', c.lid));
      out.push({ at: c.due, k: 'chg', ref: MF(c.m) + ' rent', who: [i.t.name, i.u.name].filter(Boolean).join(' · '), amt: 0, face: c.amt, cls: 'Charge, not cash' });
    });
    return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  };

  const dupes = () => {
    const m = {};
    D.pays.filter(p => !p.rev).forEach(p => {
      const key = p.cid + '|' + p.amt + '|' + p.at;
      (m[key] = m[key] || []).push(p);
    });
    return Object.values(m).filter(a => a.length > 1);
  };

  /* CSV helpers */
  const parseCSV = txt => {
    const rows = []; let row = [], cur = '', q = false;
    const s = txt.replace(/^\uFEFF/, '');
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) {
        if (ch === '"' && s[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',' || ch === ';' || ch === '\t') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim() !== ''));
  };
  const parseAmt = v => {
    let s = String(v ?? '').trim();
    if (!s) return NaN;
    const neg = /^\(.*\)$/.test(s) || /^-/.test(s) || /\bdr\b/i.test(s);
    s = s.replace(/[^0-9.]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? NaN : neg ? -n : n;
  };
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const parseDate = v => {
    const s = String(v ?? '').trim();
    let m;
    if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    if ((m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/))) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if ((m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[a-z]*[-/ ,]+(\d{2,4})/)) && MON[m[2].toLowerCase()]) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${String(MON[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  };
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const dayGap = (a, b) => Math.abs((new Date(a) - new Date(b)) / 864e5);

  const reconcile = (rows, name) => {
    if (rows.length < 1) return { err: 'That file is empty.' };
    const first = String(rows[0][0] || '').trim();
    const head = rows[0].map(x => String(x).trim().toLowerCase());
    const hasHead = !/^\d/.test(first);
    const find = re => head.findIndex(h => re.test(h));
    let di = hasHead ? find(/date/) : 0;
    let ci = hasHead ? find(/credit|\bcr\b|deposit|received/) : -1;
    let ai = hasHead ? (ci >= 0 ? ci : find(/amount|amt/)) : 1;
    let ri = hasHead ? find(/ref|utr|narr|desc|particular|remark|detail|transaction id|txn id/) : 2;
    if (ai < 0) return { err: 'Could not find an amount column. Use a CSV with date, amount and an optional reference column.' };
    if (ri === di || ri === ai) ri = -1;
    const body = rows.slice(hasHead ? 1 : 0);
    const st0 = body.map(r => ({ date: di >= 0 ? parseDate(r[di]) : '', amt: parseAmt(r[ai]), ref: ri >= 0 ? String(r[ri] || '').trim() : '' }));
    const credits = st0.filter(x => x.amt > 0);
    const skipped = st0.length - credits.length;
    const pool = D.pays.filter(p => !p.rev);
    const used = new Set();
    const same = (x, p) => Math.abs(x.amt - p.amt) < 0.005;
    const take = (x, p, how) => { used.add(p.id); x.how = how; x.pay = p; };
    credits.forEach(x => {
      if (x.ref.length < 4) return;
      const p = pool.find(p => !used.has(p.id) && same(x, p) && norm(p.ref).length >= 4 && (norm(x.ref).includes(norm(p.ref)) || norm(p.ref).includes(norm(x.ref))));
      if (p) take(x, p, 'ref');
    });
    credits.filter(x => !x.how).forEach(x => {
      const p = pool.find(p => !used.has(p.id) && same(x, p) && x.date && p.at && dayGap(x.date, p.at) <= 5);
      if (p) take(x, p, 'date');
    });
    credits.filter(x => !x.how).forEach(x => {
      const p = pool.find(p => !used.has(p.id) && same(x, p));
      if (p) take(x, p, 'amount');
    });
    const dates = credits.map(x => x.date).filter(Boolean).sort();
    const lo = dates[0], hi = dates[dates.length - 1];
    const missing = lo ? pool.filter(p => !used.has(p.id) && p.at >= lo && p.at <= hi) : [];
    return { name, credits, skipped, missing, lo, hi };
  };

  const how = { ref: ['Matched by reference', 'Active'], date: ['Matched by amount and date', 'Active'], amount: ['Possible match: amount only', 'Partial'] };

  const recHtml = () => {
    if (!REC) return `<div class="g k"><small>Bank statement comparison</small><span>Import a CSV with date, amount and an optional reference column. PropertyOS compares it with your recorded payments on this device only. It never connects to your bank and does not prove a payment settled.</span><div class="ac" style="margin-top:12px"><button class="btn s" data-a="bankPick">Import bank CSV</button></div></div>`;
    if (REC.err) return `<div class="g k"><small>Bank statement comparison</small><span style="color:var(--er)">${E(REC.err)}</span><div class="ac" style="margin-top:12px"><button class="btn s" data-a="bankPick">Try another file</button></div></div>`;
    const m = REC.credits.filter(x => x.how === 'ref' || x.how === 'date').length;
    const pm = REC.credits.filter(x => x.how === 'amount').length;
    const un = REC.credits.filter(x => !x.how).length;
    const rows = REC.credits.slice(0, 80).map(x => {
      const h = x.how ? how[x.how] : ['Not in PropertyOS', 'Overdue'];
      let who = '';
      if (x.pay) { const c = g('charges', x.pay.cid); const i = inf(c && g('leases', c.lid)); who = [i.t.name, i.u.name].filter(Boolean).join(' · '); }
      return `<div class="g row"><div class="m"><b class="po-amt">${inr(x.amt)}</b><small>${E(x.date || 'No date')}${x.ref ? ' · ' + E(x.ref.slice(0, 48)) : ''}${who ? '<br>' + E(who) : ''}</small></div><span class="bd ${h[1]}">${h[0]}</span></div>`;
    }).join('');
    const miss = REC.missing.length ? `<h2>Recorded here, not on the statement</h2>` + REC.missing.slice(0, 12).map(p => { const c = g('charges', p.cid); const i = inf(c && g('leases', c.lid)); return `<div class="g row"><div class="m"><b class="po-amt">${inr(p.amt)}</b><small>${E(p.at)} · ${E([i.t.name, i.u.name].filter(Boolean).join(' · '))}${p.ref ? ' · ' + E(p.ref) : ''}</small></div><span class="bd Due">Check</span></div>`; }).join('') : '';
    return `<div class="g k"><small>${E(REC.name || 'Bank statement')}</small><b>${m} matched</b><span>${pm} amount-only · ${un} not found${REC.skipped ? ` · ${REC.skipped} debit/empty rows ignored` : ''}</span><div class="ac" style="margin-top:12px"><button class="btn s" data-a="bankPick">Import another</button><button class="btn s q" data-a="bankClear">Clear</button></div></div>
      <h2>Statement credits</h2>${rows || empty('No credit rows found in that file.')}${REC.credits.length > 80 ? `<small style="color:var(--mu)">Showing the first 80 of ${REC.credits.length} rows.</small>` : ''}${miss}`;
  };

  V.ledger = function () {
    if (!MG()) return empty('Only managers and owners can open the ledger.');
    const all = ledgerRows();
    const income = D.pays.filter(p => !p.rev).reduce((s, p) => s + p.amt, 0);
    const exp = (D.exp || []).reduce((s, x) => s + x.amt, 0);
    const net = income - exp;
    const vw = all.filter(r => lf === "all" || r.k === lf);
    const chips = [['all', 'All'], ['pay', 'Payments'], ['exp', 'Expenses'], ['dep', 'Deposits'], ['chg', 'Charges']].map(([k, n]) => `<button class="pill ${lf === k ? 'on' : ''}" data-a="lFlt" data-i="${k}">${n}</button>`).join('');
    const kind = { pay: ['pay', '#34c759'], exp: ['exp', '#ff6b35'], dep: ['dep', '#af52de'], chg: ['leases', '#8e8e93'] };
    const list = vw.slice(0, LIMIT).map(r => {
      const k = kind[r.k];
      const col = r.k === 'pay' && r.amt === 0 ? 'var(--mu)' : r.face < 0 ? '#ff3b30' : r.k === 'pay' ? '#34c759' : 'inherit';
      return `<div class="g row">${ico(P[k[0]] ? k[0] : 'pay', k[1])}<div class="m"><b>${E(r.ref)}</b><small>${E(r.at)}${r.who ? ' · ' + E(r.who) : ''}<br>${E(r.cls)}</small></div><div class="tr"><b class="po-amt" style="color:${col}">${r.face < 0 ? '−' : ''}${inr(Math.abs(r.face))}</b></div></div>`;
    }).join('');
    const dp = dupes();
    const dupHtml = dp.length ? `<h2>Possible duplicate payments</h2><div class="g k"><span>${dp.length} group${dp.length === 1 ? '' : 's'} of payments share the same charge, amount and day. Open Rent to review and reverse any that were entered twice.</span></div>` : '';
    return `<div class="grid"><div class="g k"><small>Received</small><b class="po-amt">${inr(income)}</b><span>Rent payments, net of reversals</span></div><div class="g k"><small>Expenses</small><b class="po-amt">${inr(exp)}</b><span>Recorded spending</span></div><div class="g k"><small>Net</small><b class="po-amt" style="color:${net < 0 ? '#ff3b30' : 'inherit'}">${net < 0 ? '−' : ''}${inr(Math.abs(net))}</b><span>Received minus expenses</span></div></div>
      <h2>Bank statement</h2>${recHtml()}<input id="poBank" type="file" accept=".csv,text/csv,text/plain" style="display:none">
      ${dupHtml}
      <h2>All activity</h2><div class="ch">${chips}</div>
      ${list || empty('Nothing recorded yet.')}
      ${vw.length > LIMIT ? `<small style="color:var(--mu)">Showing the latest ${LIMIT} of ${vw.length}. Export the CSV for everything.</small>` : ''}
      <div class="ac" style="margin-top:12px"><button class="btn q" data-a="ledgerCsv">Export ledger CSV</button></div>
      <p class="po-hint">An operational snapshot, not a tax filing or audited statement. Charges and deposits are shown for reference and are not counted as income.</p>`;
  };
  A.lFlt = el => { lf = el.dataset.i; render(); };
  A.bankPick = () => { const f = document.getElementById('poBank'); if (f) { f.value = ''; f.click(); } };
  A.bankClear = () => { REC = null; render(); };
  A.ledgerCsv = () => {
    const q = x => { let s = String(x ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const rows = [['Date', 'Type', 'Reference', 'Tenant / property', 'Classification', 'Amount INR'], ...ledgerRows().map(r => [r.at, r.k, r.ref, r.who, r.cls, r.face])];
    const blob = new Blob([rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ledger.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
  };

  document.addEventListener('change', async e => {
    const el = e.target;
    if (!el || el.id !== 'poBank') return;
    const f = el.files && el.files[0];
    if (!f) return;
    try { REC = reconcile(parseCSV(await f.text()), f.name); }
    catch (x) { REC = { err: 'Could not read that file. Export the statement as CSV and try again.' }; }
    render();
  });

  /* Keyboard: Enter / Space flips a pass, activates settings row */
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('.po-card, [data-a="hideBal"][role="button"]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  /* ---------- Header eye button + re-apply after each render ---------- */
  const _render = render;
  render = function () {
    const r = _render.apply(this, arguments);
    try {
      const h = document.querySelector('header');
      const anchor = document.getElementById('scbtn') || document.getElementById('sbtn');
      if (h && anchor && !document.getElementById('poeye') && role !== 'tenant') {
        const b = document.createElement('button');
        b.className = 'pill g';
        b.id = 'poeye';
        b.setAttribute('data-a', 'hideBal');
        b.setAttribute('aria-label', 'Hide balances');
        b.style.padding = '9px 11px';
        b.innerHTML = I('eye');
        h.insertBefore(b, anchor);
      }
      const eye = document.getElementById('poeye');
      if (eye) eye.hidden = role === 'tenant';
      applyHide();
    } catch (x) { /* never block rendering */ }
    return r;
  };
})();
