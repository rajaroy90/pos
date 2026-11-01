/* PropertyOS module 9: public receipt page.
   Opening ?receipt=<token> (or the older ?verify=<charge id> printed on earlier QR codes) shows that one receipt to anyone,
   signed in or not. Data comes from the get_receipt() database function (migration 010). Loaded last, so it wraps start(). */
(() => {
  const P = new URLSearchParams(location.search);
  const tok = (P.get('receipt') || P.get('verify') || '').trim().toLowerCase();
  if (!/^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(tok))
    return;
  const IST = { timeZone: 'Asia/Kolkata' };
  const fd = s => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...IST });
  const ft = s => new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', ...IST });
  const LB = { paid: ['✓', 'Paid in full'], part: ['◐', 'Part payment'], due: ['•', 'Payment due'], late: ['!', 'Overdue'], void: ['✕', 'Payment reversed'] };
  let cur = null;
  /* Private link: keep it out of search engines and out of referrers. */
  [['robots', 'noindex,nofollow'], ['referrer', 'no-referrer']].forEach(([n, c]) => {
    const m = document.createElement('meta');
    m.name = n;
    m.content = c;
    document.head.append(m);
  });
  document.body.classList.add('pubrc');
  const shell = h => {
    const e = $('#gate');
    e.classList.remove('lp');
    e.classList.add('rpg0');
    gate(`<main class="rp">${h}</main>`);
  };
  const msg = (icon, title, text, btn) => `<section class="g rpc rpm"><i>${icon}</i><h2>${title}</h2><p>${text}</p>${btn || ''}</section>`;
  const SK = '<section class="g rpc rpk" aria-busy="true" aria-label="Loading receipt"><i style="width:55%"></i><i style="width:80%;height:44px"></i><i></i><i style="width:70%"></i><i></i></section>';
  const NF = msg('🔍', 'Receipt not found', 'This link looks incomplete, or the receipt is no longer available. Ask your landlord to send it again.', '<a class="btn q" href="' + esc(location.pathname) + '">Go to PropertyOS</a>');
  const ER = msg('📡', 'Couldn’t load the receipt', 'Check your connection and try again.', '<button class="btn" data-rp="retry">Try again</button>');
  const canon = d => location.origin + location.pathname + '?receipt=' + d.token;
  function view(d) {
    const pay = d.payments || [];
    const got = d.received / 100;
    const rent = d.rent / 100;
    const bal = Math.max(0, rent - got);
    const today = new Intl.DateTimeFormat('en-CA', IST).format(new Date());
    const k = got >= rent ? 'paid' : got > 0 ? 'part' : pay.length ? 'void' : d.due_on < today ? 'late' : 'due';
    const last = pay.filter(p => !p.reversed).slice(-1)[0];
    const upi = bal > 0 && d.upi ? `upi://pay?pa=${d.upi}&pn=${encodeURIComponent(d.org)}&am=${bal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Rent ' + MF(d.month))}` : '';
    document.title = `Receipt RCPT-${d.no} · ${d.org}`;
    return `<section class="g rpc ${k}">
<header class="rph"><span class="rpl"><img src="assets/logo.png" alt=""></span><div><b>${esc(d.org)}</b><small>Rent receipt</small></div><span class="rpb ${k}" role="status">${LB[k][0]} ${LB[k][1]}</span></header>
<div class="rpa"><small>Amount received</small><h1>${inr(got)}</h1>${got ? `<p>${words(got)} only</p>` : ''}</div>
<div class="rpp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round(got / rent * 100))}"><i style="width:${Math.min(100, got / rent * 100)}%"></i></div>
<div class="rpr"><span>Received ${inr(got)}</span><span>Rent ${inr(rent)}</span></div>
<dl class="rpd"><div><dt>Received from</dt><dd>${esc(d.tenant)}</dd></div><div><dt>Property</dt><dd>${esc(d.property)} · ${esc(d.unit)}</dd></div><div><dt>Period</dt><dd>${MF(d.month)}</dd></div><div><dt>Receipt no.</dt><dd>RCPT-${esc(d.no)}</dd></div><div><dt>Due date</dt><dd>${fd(d.due_on)}</dd></div><div><dt>${last ? 'Last payment' : 'Balance due'}</dt><dd>${last ? fd(last.at) : inr(bal)}</dd></div></dl>
<h3 class="rph3">Payments</h3>
<ul class="rpt">${pay.length ? pay.map(p => `<li class="${p.reversed ? 'x' : ''}"><div><b>${fd(p.at)}</b><small>${esc(p.ref)} · ${p.method == 'razorpay' ? 'Paid online' : 'Recorded by landlord'}</small></div><span>${p.reversed ? '<em>Reversed</em>' : ''}${inr(p.amount / 100)}</span></li>`).join('') : '<li class="e">No payment received yet</li>'}</ul>
${bal > 0 ? `<div class="rpy"><b>${inr(bal)} still due</b><p>Pay the balance from any UPI app. The amount is filled in for you.</p>${upi ? `<a class="btn" href="${esc(upi)}">Pay ${inr(bal)} with UPI</a><details><summary>Show QR code</summary>${qrSvg(upi, { size: 176 })}</details>` : ''}</div>` : ''}
<div class="rpx"><button class="btn q" data-rp="share">Share</button><button class="btn q" data-rp="wa">WhatsApp</button><button class="btn q" data-rp="copy">Copy link</button><button class="btn q" data-rp="print">Print / PDF</button></div>
<p class="rpf">Checked live against the landlord’s records at ${ft(d.checked)} IST.<br>Computer-generated receipt · <a href="${esc(location.pathname)}">PropertyOS</a></p>
</section>`;
  }
  async function load(quiet) {
    if (!quiet)
      shell(SK);
    try {
      const { data, error } = await sb.rpc('get_receipt', { p_token: tok });
      if (error)
        throw error;
      if (!data) {
        cur = null;
        return quiet || shell(NF);
      }
      cur = data;
      shell(view(data));
    }
    catch (e) {
      if (!quiet)
        shell(ER);
    }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rp]');
    if (!b)
      return;
    const k = b.dataset.rp;
    if (k == 'retry')
      return load();
    if (!cur)
      return;
    const u = canon(cur);
    const t = `Rent receipt RCPT-${cur.no} · ${inr(cur.received / 100)} for ${MF(cur.month)} · ${cur.org}`;
    if (k == 'print')
      return print();
    if (k == 'wa')
      return void window.open('https://wa.me/?text=' + encodeURIComponent(t + '\n' + u), '_blank', 'noopener');
    if (k == 'share' && navigator.share)
      return void navigator.share({ title: 'Rent receipt', text: t, url: u }).catch(() => {
      });
    const o = b.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => {
      b.textContent = 'Link copied ✓';
    }, () => {
      b.textContent = 'Copy failed';
    }).finally(() => setTimeout(() => {
      b.textContent = o;
    }, 1600));
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && cur)
      load(true);
  });
  start = function () {
    return load();
  };
})();
