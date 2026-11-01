/* PropertyOS core: state, data layer, routing, views. Runs first; modules in js/modules extend it. */

const $ = s => document.querySelector(s);
const logoImg = (cls = '', alt = 'PropertyOS') => {
  const img = document.createElement('img');
  img.src = 'assets/logo.png';
  img.alt = alt;
  if (cls) img.className = cls;
  img.addEventListener('error', function onLogoErr() {
    this.removeEventListener('error', onLogoErr);
    this.src = 'assets/logo.svg';
  });
  return img;
};
const logoImgHtml = (alt = '') => {
  // Used in template strings; bind fallback after insert via bindLogoFallbacks()
  return `<img src="assets/logo.png" alt="${alt}" data-logo-fallback="1">`;
};
const bindLogoFallbacks = (root = document) => {
  root.querySelectorAll('img[data-logo-fallback]').forEach(img => {
    if (img.dataset.boundLogo) return;
    img.dataset.boundLogo = '1';
    img.addEventListener('error', function onLogoErr() {
      this.removeEventListener('error', onLogoErr);
      this.src = 'assets/logo.svg';
    });
  });
};
const ist = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
const ls = (k, v) => {
  try {
    return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v);
  }
  catch (e) {
    return null;
  }
};
const T = new Date();
const TD = ist(T);
const CM = TD.slice(0, 7);
const P = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", props: "M4 21V5l8-3v19M12 9h8v12M8 8h1M8 12h1M8 16h1M16 13h1M16 17h1", tenants: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8", leases: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h7M9 17h7", pay: "M3 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M17 14h2", maint: "M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z", inq: "M3 5h18v14H3zM3 7l9 7 9-7", set: "M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4", search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3", qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20v1", more: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", plus: "M12 5v14M5 12h14",
  dep: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  utils: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  docs: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  reports: "M3 3v18h18M7 14l4-4 4 4 5-6",
  team: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
};
const I = k => `<svg viewBox="0 0 24 24">${P[k].split('M').filter(Boolean).map(d => `<path d="M${d}"/>`).join('')}</svg>`;
const SEC = {
  home: ['Home', '#0a84ff'], props: ['Properties', '#30b0c7'], leases: ['Leases', '#af52de'], pay: ['Rent', '#34c759'], maint: ['Repairs', '#ff9500'], tenants: ['Tenants', '#5e5ce6'], inq: ['Inquiries', '#ff2d55'], set: ['Settings', '#8e8e93']
};
const TABS = ['home', 'props', 'leases', 'pay', 'more'];
const MORE = ['tenants', 'maint', 'inq', 'set'];
const TEN = ['home', 'pay', 'maint'];
let D;
let role = 'manager';
let view = 'home';
let flt = 'all';
let fresh = true;
const id = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const mk = o => {
  const [y, m] = CM.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + o, 1)).toISOString().slice(0, 7);
};
const ML = m => new Date(m + '-01T00:00:00Z').toLocaleString('en', { month: 'short', timeZone: 'UTC' });
const MF = m => new Date(m + '-01T00:00:00Z').toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const g = (a, i) => D[a].find(x => x.id === i);
const C = window.PROPERTYOS_CONFIG || {};
let sb;
let S;
let ORG;
D = {
  props: [], units: [], tenants: [], leases: [], charges: [], pays: [], maint: [], inq: [], act: [], org: '', dep: [], ub: [], docs: [], ok: {dep:0, ub:0, docs:0}, exp: []
};
const sha = async (x) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)))].map(b => b.toString(16).padStart(2, '0')).join('');
async function load() {
  const q = async (t) => {
    let o = [];
    let f = 0;
    for (;;) {
      const x = await sb.from(t).select('*').eq('org_id', ORG).order('created_at').order('id').range(f, f + 999);
      if (x.error)
        throw x.error;
      o = o.concat(x.data);
      if (x.data.length < 1000)
        return o;
      f += 1000;
    }
  };
  const r = x => {
    if (Array.isArray(x))
      return x;
    if (x.error)
      throw x.error;
    return x.data;
  };
  const k = x => x / 100;
  const d = x => (x || '').slice(0, 10);
  const [p, u, t, l, c, y, m, n, a] = (await Promise.all([...['properties', 'units', 'tenants', 'leases', 'charges', 'payments', 'maintenance', 'inquiries'].map(q), sb.from('activity').select('*').eq('org_id', ORG).order('created_at', { ascending: false }).limit(8)])).map(r);
  D.props = p.map(x => ({
    id: x.id, name: x.name, city: x.city, pub: x.published, h: [...x.id].reduce((s, c) => s + c.charCodeAt(0), 0) % 360
  }));
  D.units = u.map(x => ({
    id: x.id, pid: x.property_id, name: x.name, bd: x.bedrooms, rent: k(x.rent)
  }));
  D.tenants = t.map(x => ({
    id: x.id, name: x.name, email: x.email, phone: x.phone, uid: x.user_id
  }));
  D.leases = l.map(x => ({
    id: x.id, uid: x.unit_id, tid: x.tenant_id, start: x.starts_on, end: x.ends_on, rent: k(x.rent), dep: k(x.deposit), st: x.status
  }));
  D.charges = c.map(x => ({
    id: x.id, lid: x.lease_id, m: x.month.slice(0, 7), due: x.due_on, amt: k(x.amount)
  }));
  D.pays = y.map(x => ({
    id: x.id, cid: x.charge_id, amt: k(x.amount), ref: x.reference, at: d(x.created_at), ts: x.created_at, rev: x.reversed_at ? x.reversal_reason : 0
  }));
  D.maint = m.map(x => ({
    id: x.id, uid: x.unit_id, title: x.title, desc: x.description, pr: x.priority, st: x.status == 'In progress' ? 'Progress' : x.status, at: d(x.created_at)
  }));
  D.inq = n.map(x => ({
    id: x.id, pid: x.property_id, name: x.name, email: x.email, msg: x.message, st: x.status
  }));
  D.act = a.map(x => ({ t: x.title, s: x.detail, at: d(x.created_at) }));

  // Optional advanced tables (migration 011). Fail soft if not present.
  D.ok = {dep:0, ub:0, docs:0};
  D.dep = []; D.ub = []; D.docs = [];
  try {
    const de = await q('deposit_entries');
    D.dep = de.map(x => ({id:x.id, lid:x.lease_id, kind:x.kind, amt:k(x.amount), note:x.note||'', at:d(x.created_at)}));
    D.ok.dep = 1;
  } catch(e) {}
  try {
    const ub = await q('utility_bills');
    D.ub = ub.map(x => ({id:x.id, uid:x.unit_id, lid:x.lease_id, kind:x.kind, m:(x.month||'').slice(0,7), amt:k(x.amount), due:x.due_on, prev:x.reading_prev, cur:x.reading_curr, paidAt:x.paid_at?d(x.paid_at):null, ref:x.paid_ref||'', note:x.note||''}));
    D.ok.ub = 1;
  } catch(e) {}
  try {
    const docs = await q('documents');
    D.docs = docs.map(x => ({id:x.id, lid:x.lease_id, title:x.title, body:x.body||'', st:x.status, ts:x.tenant_sig, tat:x.tenant_signed_at, ms:x.manager_sig, mat:x.manager_signed_at, at:d(x.created_at)}));
    D.ok.docs = 1;
  } catch(e) {}
  try {
    const ex = await q('expenses');
    D.exp = ex.map(x => ({id:x.id, pid:x.property_id, amt:k(x.amount), note:x.note||'', at:d(x.spent_on||x.created_at), cat:x.category||''}));
  } catch(e) { D.exp = []; }
}
const qrSvg = (t, o = {}) => {
  const q = new QRCode(-1, QRErrorCorrectLevel.M);
  q.addData(t);
  q.make();
  const n = q.getModuleCount();
  const p = 3;
  const z = o.size || 160;
  let d = '';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (q.isDark(r, c))
        d += `M${c + p} ${r + p}h1v1h-1z`;
  return `<svg class="qr" viewBox="0 0 ${n + 2 * p} ${n + 2 * p}" width="${z}" height="${z}" shape-rendering="crispEdges" style="fill:#fff;stroke:none;border-radius:14px;background:#fff"><path d="${d}" style="fill:#0b1226;stroke:none"/></svg>`;
};
const BASE = () => location.origin + location.pathname;
const words = n => {
  n = Math.round(n);
  if (!n)
    return 'Zero rupees';
  const o = 'One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve Thirteen Fourteen Fifteen Sixteen Seventeen Eighteen Nineteen'.split(' ');
  const t = 'Twenty Thirty Forty Fifty Sixty Seventy Eighty Ninety'.split(' ');
  const b = x => x < 20 ? o[x - 1] : t[Math.floor(x / 10) - 2] + (x % 10 ? ' ' + o[x % 10 - 1] : '');
  const h = x => (x > 99 ? o[Math.floor(x / 100) - 1] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? b(x % 100) : '');
  const r = [];
  [[1e7, 'Crore'], [1e5, 'Lakh'], [1e3, 'Thousand']].forEach(([d, w]) => {
    const q = Math.floor(n / d);
    if (q) {
      r.push(h(q) + ' ' + w);
      n %= d;
    }
  });
  if (n)
    r.push(h(n));
  return 'Rupees ' + r.join(' ');
};
const modal = h => {
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = '<div class="sh g">' + h + '</div>';
  o.onclick = e => {
    if (e.target == o || e.target.dataset.x != null)
      o.remove();
  };
  document.body.append(o);
};
function rcHtml(c, th) {
  const i = info(g('leases', c.lid));
  const ps = D.pays.filter(p => p.cid == c.id && !p.rev);
  const pd = paid(c);
  const b = c.amt - pd;
  const no = 'RCPT-' + c.id.slice(0, 8).toUpperCase();
  return `<div class="rc ${th}" id="rc"><div class="rh"><div class="rl"><img src="assets/logo.png" alt="" data-logo-fallback="1"><div><b>${esc(D.org)}</b><small style="color:inherit">Rent receipt</small></div></div><div class="rn"><small style="color:inherit">Receipt no.</small><b>${no}</b><small style="color:inherit">${ps.length ? ps[ps.length - 1].at : TD}</small></div></div>
<div class="ra"><small>Amount received</small><b>${inr(pd)}</b><i>${words(pd)} only</i></div>
<div class="rg"><div><small>Received from</small><b>${esc(i.t.name)}</b></div><div><small>Property</small><b>${esc(i.p.name)} · ${esc(i.u.name)}</b></div><div><small>Period</small><b>${MF(c.m)}</b></div><div><small>Status</small><b>${b <= 0 ? 'Paid in full' : 'Part payment'}</b></div></div>
<table>${ps.map(p => `<tr><td>${p.at} · ${esc(p.ref)}</td><td>${inr(p.amt)}</td></tr>`).join('')}<tr><td>Rent for ${MF(c.m)}</td><td>${inr(c.amt)}</td></tr><tr><td>Balance due</td><td>${inr(Math.max(0, b))}</td></tr></table>
<div class="rf"><div class="rq">${qrSvg(BASE() + '?verify=' + c.id, { size: 96 })}<small>Scan to verify</small></div><div class="rs"><span></span><small>Authorised signature</small></div></div><p class="rt">Thank you · Computer-generated receipt, valid with QR verification</p></div>`;
}
function route(q) {
  const v = q.get('verify');
  const r = q.get('repair');
  if (!v && !r)
    return;
  history.replaceState(null, '', location.pathname);
  if (v) {
    const c = D.charges.find(x => x.id == v);
    if (!c)
      return modal('<h3>Receipt not found</h3><p style="color:var(--mu)">This receipt is not in your workspace records. Check that you are signed in to the right account.</p><button class="btn" data-x style="width:100%">Close</button>');
    const i = info(g('leases', c.lid));
    const b = bal(c);
    modal(`<h3>${b <= 0 ? '✓ Verified: paid in full' : '✓ Verified: part payment'}</h3><p style="color:var(--mu)">${esc(i.t.name)} · ${esc(i.p.name)} ${esc(i.u.name)}<br>${MF(c.m)}<br>Rent ${inr(c.amt)} · Received ${inr(paid(c))} · Balance ${inr(Math.max(0, b))}</p><div class="ac"><button class="btn q" data-x>Close</button><button class="btn" data-a="rcpt" data-i="${c.id}" data-x>View receipt</button></div>`);
  }
  if (r && D.units.some(u => u.id == r))
    A.addM(null, r);
}
const gate = h => {
  const e = $('#gate');
  e.style.display = h ? 'flex' : 'none';
  e.innerHTML = h || '';
  if (h) bindLogoFallbacks(e);
};
const card = b => `<div class="g gc"><div class="logo" style="margin:0 auto 14px;width:64px;height:64px;border-radius:20px"><img src="assets/logo.png" alt="" data-logo-fallback="1"></div><h1 style="font-size:28px">PropertyOS</h1>${b}</div>`;
const gm = m => `<p id="gm" style="color:var(--er);min-height:20px;margin:0 0 8px;font-size:14px">${esc(m)}</p>`;
const sm = t => $('#gm').textContent = t;
function authScreen(m = '') {
  gate(card(`<p style="color:var(--mu);margin:6px 0 18px">Sign in to your workspace</p><label>Email<input id="em" type="email" autocomplete="email"></label><label>Password<input id="pw" type="password" autocomplete="current-password"></label>${gm(m)}<div class="ac"><button class="btn" data-a="authIn">Sign in</button><button class="btn q" data-a="authUp">Create account</button></div><p><a href="#" data-a="authRs" style="color:var(--ac);font-size:14px">Forgot password?</a></p>`));
}
async function auth(k) {
  const email = $('#em').value.trim();
  const password = $('#pw').value;
  const u = location.origin + location.pathname + location.search;
  if (k == 'rs') {
    if (!email)
      return sm('Enter your email first');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: u });
    return sm(error ? error.message : 'Password reset email sent');
  }
  if (password.length < 8)
    return sm('Password must be at least 8 characters');
  const { data, error } = k == 'in' ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password, options: { emailRedirectTo: u } });
  if (error)
    return sm(error.message);
  if (k == 'up' && !data.session)
    sm('Check your email to verify your account, then sign in.');
}
function newPw() {
  gate(card(`<p style="color:var(--mu);margin:6px 0 18px">Choose a new password</p><label>New password<input id="pw" type="password" autocomplete="new-password"></label>${gm('')}<button class="btn" data-a="setPw">Save password</button>`));
}
async function setPw() {
  const { error } = await sb.auth.updateUser({ password: $('#pw').value });
  error ? sm(error.message) : start();
}
function onboard(m = '') {
  gate(card(`<p style="color:var(--mu);margin:6px 0 18px">Create your workspace. Invited by someone? Open your invite link while signed in.</p><label>Business name<input id="on"></label><label>Web address<input id="os" placeholder="my-rentals"></label>${gm(m)}<button class="btn" data-a="mkOrg">Create workspace</button><p><a href="#" data-a="signOut" style="color:var(--ac);font-size:14px">Sign out</a></p>`));
}
async function mkOrg() {
  const n = $('#on').value.trim();
  const s = ($('#os').value || n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (n.length < 2)
    return sm('Enter your business name');
  if (s.length < 3)
    return sm('Web address needs at least 3 letters or numbers');
  const { error } = await sb.rpc('create_organization', { p_name: n, p_slug: s });
  error ? sm(/duplicate|unique/i.test(error.message) ? 'That web address is taken. Try another.' : error.message) : start();
}
async function boot() {
  if (!C.url || /YOUR-/.test(C.url + C.anonKey))
    return gate(card(`<p style="color:var(--mu)">Setup needed: open <b>config.js</b> and add your Supabase project URL and anon key, then reload. See README.md.</p>`));
  sb = supabase.createClient(C.url, C.anonKey);
  S = (await sb.auth.getSession()).data.session;
  sb.auth.onAuthStateChange((e, s) => {
    if (e == 'PASSWORD_RECOVERY') {
      S = s;
      return newPw();
    }
    const w = !!S;
    S = s;
    if (!!s != w)
      start();
  });
  start();
}
async function start() {
  if (!window._hyd)
    document.body.classList.remove('ready');
  if (!S)
    return authScreen();
  try {
    const inv = new URLSearchParams(location.search).get('invite');
    if (inv) {
      const { error } = await sb.rpc('accept_invitation', { p_hash: await sha(inv) });
      history.replaceState(null, '', location.pathname);
      if (error)
        toast(error.message);
    }
    const { data: m, error } = await sb.from('memberships').select('org_id,role,organizations(name,slug)').eq('user_id', S.user.id);
    if (error)
      throw error;
    if (!m.length)
      return onboard();
    const x = m.find(y => y.org_id == ls('po-org')) || m[0];
    ORG = x.org_id;
    role = x.role == 'tenant' ? 'tenant' : 'manager';
    D.org = x.organizations.name;
    D.slug = x.organizations.slug;
    D.owner = x.role == 'owner';
    D.multi = m;
    const uq = Promise.resolve(sb.from('organizations').select('upi_id').eq('id', ORG).maybeSingle());
    await load();
    D.upi = ((await uq).data || {}).upi_id || '';
    sb.removeAllChannels();
    sb.channel('po-' + ORG).on('postgres_changes', { event: '*', schema: 'public' }, () => {
      clearTimeout(window.rt);
      window.rt = setTimeout(async () => {
        try {
          if (document.hidden) {
            window._stale = 1;
            return;
          }
          await load();
          render();
        }
        catch (e) {
        }
      }, 1500);
    }).subscribe();
    view = 'home';
    fresh = true;
    gate('');
    document.body.classList.add('ready');
    render();
    route(new URLSearchParams(location.search));
  }
  catch (x) {
    S ? window._hyd ? toast('Offline: showing saved data') : gate(card(`<p style="color:var(--er)">${esc(x.message)}</p><p style="color:var(--mu)">Could not load your workspace. Check your connection.</p><div class="ac"><button class="btn" data-a="retryStart">Retry</button><button class="btn q" data-a="signOut">Sign out</button></div>`)) : authScreen(x.message);
  }
}
const log = (t, s) => D.act.unshift({ t, s: s || '', at: TD });
const paid = c => D.pays.filter(p => p.cid === c.id && !p.rev).reduce((s, p) => s + p.amt, 0);
const bal = c => c.amt - paid(c);
const st = c => bal(c) <= 0 ? 'Paid' : c.due < TD ? 'Overdue' : paid(c) > 0 ? 'Partial' : 'Due';
const ME = () => (D.tenants.find(t => t.uid == S.user.id) || {}).id;
const mgr = () => role == 'manager';
const LS = () => D.leases.filter(l => mgr() || l.tid == ME());
const CHS = () => D.charges.filter(c => LS().some(l => l.id == c.lid));
const MT = () => D.maint.filter(m => mgr() || LS().some(l => l.uid == m.uid));
const info = l => {
  const u = g('units', l.uid);
  const t = g('tenants', l.tid);
  return { u, t, p: u && g('props', u.pid) };
};
const active = u => D.leases.find(l => l.uid == u.id && l.st == 'active');
const ico = (k, c) => `<div class="ic" style="--c:${c}">${I(k)}</div>`;
const empty = t => `<div class="g em" role="status"><p style="margin:0;line-height:1.45">${t}</p></div>`;
function toast(m) {
  const e = $('#ts');
  e.textContent = m;
  e.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => e.classList.remove('on'), 2200);
}
function sheet(title, fields, cb, ok = 'Save') {
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<form class="sh g"><h3>${title}</h3>${fields.map(f => `<label>${f.l}${f.t == 'select' ? `<select name="${f.k}">${f.o.map(([v, n]) => `<option value="${esc(v)}"${v == f.v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : f.t == 'area' ? `<textarea name="${f.k}" rows="3">${esc(f.v)}</textarea>` : `<input name="${f.k}" type="${f.t || 'text'}" value="${esc(f.v)}" ${f.r === 0 ? '' : 'required'} ${f.t == 'number' ? 'min="' + (f.mn ?? 1) + '" step="' + (f.st || 'any') + '"' : ''}>`}</label>`).join('')}<div class="ac"><button type="button" class="btn q" data-x>Cancel</button><button class="btn">${ok}</button></div></form>`;
  if (/^(end|delete|remove|reverse)\b/i.test(ok)) {
    const pb = o.querySelector('.btn:not(.q)');
    if (pb)
      pb.classList.add('d');
  }
  o.onclick = e => {
    if (e.target == o || e.target.dataset.x != null)
      o.remove();
  };
  o.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector('.btn:not(.q)');
    b.disabled = 1;
    try {
      await cb(Object.fromEntries(new FormData(e.target)));
      o.remove();
      await load();
      render();
    }
    catch (x) {
      toast(x.message || 'Something went wrong');
      b.disabled = 0;
    }
  };
  document.body.append(o);
  const i = o.querySelector('input,select');
  i && i.focus();
}
const done = (t, s) => {
  log(t, s);
  toast(t);
};
const V = {
  home() {
    const L = LS();
    const cs = CHS();
    if (!mgr()) {
      const due = cs.reduce((s, c) => s + bal(c), 0);
      const l = L.find(x => x.st == 'active') || L[0];
      if (!l)
        return empty('No lease is linked to your account yet. Ask your manager to send an invite.');
      const i = info(l);
      return `<div class="g hero"><div style="flex:1"><small style="color:var(--mu)">Hello, ${esc(((g('tenants', ME()) || {}).name || 'there').split(' ')[0])}</small><h1>${due ? inr(due) + ' due' : 'All paid up ✓'}</h1><span style="color:var(--mu)">${esc(i.p.name)} · ${esc(i.u.name)}</span></div>${due ? '<button class="btn" data-a="nav" data-v="pay">View rent</button>' : ''}</div><h2>Your home</h2><div class="g k"><small>Lease</small><b style="font-size:20px">${l.start} → ${l.end}</b><span>Rent ${inr(l.rent)}/mo · Deposit ${inr(l.dep)}</span></div><h2>Open repairs</h2>${V.maint(1)}`;
    }
    const us = D.units;
    const occ = us.filter(active).length;
    const roll = D.leases.filter(l => l.st == 'active').reduce((s, l) => s + l.rent, 0);
    const cc = D.charges.filter(c => c.m == CM);
    const col = cc.reduce((s, c) => s + paid(c), 0);
    const out = D.charges.reduce((s, c) => s + bal(c), 0);
    const bars = [-5, -4, -3, -2, -1, 0].map(o => {
      const m = mk(o);
      const c = D.charges.filter(x => x.m == m);
      const b = c.reduce((s, x) => s + x.amt, 0);
      const p = c.reduce((s, x) => s + paid(x), 0);
      return { m, b, p };
    });
    const mx = Math.max(1, ...bars.map(b => b.b));
    return `<div class="g hero"><div style="flex:1"><small style="color:var(--mu)">${esc(D.org)}</small><h1>Good ${T.getHours() < 12 ? 'morning' : T.getHours() < 18 ? 'afternoon' : 'evening'}</h1><span style="color:var(--mu)">${out ? inr(out) + ' outstanding across ' + D.charges.filter(c => bal(c) > 0).length + ' charges' : 'Everything is collected'}</span></div>${(() => {
      const b = cc.reduce((x, c) => x + c.amt, 0);
      const r = b ? Math.min(1, col / b) : 0;
      return `<div style="position:relative;width:74px;height:74px"><svg class="ring" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" stroke="var(--fl)"/><circle class="p" cx="22" cy="22" r="18" stroke-dasharray="${(r * 113).toFixed(1)} 113"/></svg><b style="position:absolute;inset:0;display:grid;place-items:center;font-size:16px">${Math.round(r * 100)}%</b></div>`;
    })()}<button class="btn" data-a="genRent">Generate ${ML(CM)} rent</button></div>
${V.begin()}<h2>Overview</h2><div class="grid"><div class="g k"><small>Occupancy</small><b data-n="${us.length ? occ / us.length * 100 : 0}" data-s="%">0</b><span>${occ} of ${us.length} units let</span></div><div class="g k"><small>Monthly rent roll</small><b data-n="${roll}" data-p="₹">0</b><span>${D.leases.filter(l => l.st == 'active').length} active leases</span></div><div class="g k"><small>Collected in ${ML(CM)}</small><b data-n="${col}" data-p="₹">0</b><span>of ${inr(cc.reduce((s, c) => s + c.amt, 0))} billed</span></div><div class="g k"><small>Outstanding</small><b data-n="${out}" data-p="₹" style="color:${out ? 'var(--er)' : 'var(--ok)'}">0</b><span>${D.charges.filter(c => st(c) == 'Overdue').length} overdue</span></div></div>
<h2>Billed vs collected</h2><div class="g bars">${bars.map(b => `<div><p><s data-h="${b.b / mx * 100}"></s><s data-h="${b.p / mx * 100}"></s></p>${ML(b.m)}</div>`).join('')}</div>
${V.alerts()}<h2>Needs attention</h2>${D.maint.filter(m => m.st != 'Resolved').slice(0, 3).map(m => V.mrow(m)).join('') || empty('No open repairs')}${D.inq.filter(q => q.st == 'New').map(q => V.qrow(q)).join('')}
<h2>Recent activity</h2><div class="g" style="padding:6px 16px">${D.act.slice(0, 5).map(a => `<div style="padding:10px 0;border-bottom:1px solid var(--gb)"><b>${esc(a.t)}</b><br><small style="color:var(--mu)">${esc(a.s)} ${a.at}</small></div>`).join('')}</div>`;
  },
  props() {
    return `<div class="ac" style="margin:0 0 14px"><button class="btn" data-a="addProp">+ Property</button><button class="btn q" data-a="addUnit">+ Unit</button></div>${D.props.map(p => {
      const us = D.units.filter(u => u.pid == p.id);
      return `<div class="g" style="margin-bottom:14px;overflow:hidden"><div style="height:110px;background:linear-gradient(135deg,hsl(${p.h} 80% 62%),hsl(${p.h + 50} 85% 72%));display:flex;align-items:flex-end;padding:14px;color:#fff;gap:10px"><div style="flex:1"><b style="font-size:20px">${esc(p.name)}</b><br>${esc(p.city)}</div><button class="pill" style="background:rgba(255,255,255,.3);color:#fff" data-a="pub" data-i="${p.id}">${p.pub ? '● Published' : '○ Draft'}</button><button class="pill" style="background:rgba(255,255,255,.3);color:#fff" data-a="labels" data-i="${p.id}">QR labels</button></div><div style="padding:10px 14px">${us.map(u => {
        const l = active(u);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;cursor:pointer" data-a="editUnit" data-i="${u.id}"><span><b>${esc(u.name)}</b> <small style="color:var(--mu)">${u.bd} BHK · ${inr(u.rent)}</small></span><span class="bd ${l ? 'Active' : 'Due'}">${l ? esc(info(l).t.name) : 'Vacant'}</span></div>`;
      }).join('') || '<small>No units yet</small>'}</div></div>`;
    }).join('')}`;
  },
  tenants() {
    return `<div class="ac" style="margin:0 0 14px"><button class="btn" data-a="addTen">+ Tenant</button></div>${D.tenants.map(t => {
      const l = D.leases.find(x => x.tid == t.id && x.st == 'active');
      return `<div class="g row" data-a="editTen" data-i="${t.id}">${ico('tenants', '#5e5ce6')}<div class="m"><b>${esc(t.name)}</b><small>${esc(t.email)} · ${esc(t.phone)}</small></div><span class="bd ${l ? 'Active' : 'Due'}">${l ? esc(info(l).u.name) : 'No lease'}</span></div>`;
    }).join('')}`;
  },
  leases() {
    const L = LS();
    return `${mgr() ? '<div class="ac" style="margin:0 0 14px"><button class="btn" data-a="addLease">+ Lease</button></div>' : ''}${L.map(l => {
      const i = info(l);
      return `<div class="g row">${ico('leases', '#af52de')}<div class="m"><b>${esc(i.t.name)} · ${esc(i.u.name)}</b><small>${esc(i.p.name)} · ${l.start} → ${l.end}<br>${inr(l.rent)}/mo · deposit ${inr(l.dep)}</small></div><div style="text-align:right"><span class="bd ${l.st == 'active' ? 'Active' : 'Ended'}">${l.st == 'active' ? 'Active' : 'Ended'}</span>${mgr() && l.st == 'active' ? `<br><button class="btn s d" style="margin-top:8px" data-a="endLease" data-i="${l.id}">End</button>` : ''}</div></div>`;
    }).join('') || empty('No leases yet')}`;
  },
  pay() {
    const cs = CHS().filter(c => flt == 'all' || st(c) == flt).sort((a, b) => b.due.localeCompare(a.due));
    return `<div class="ch">${['all', 'Due', 'Partial', 'Overdue', 'Paid'].map(f => `<button class="pill ${flt == f ? 'on' : ''}" data-a="flt" data-i="${f}">${f == 'all' ? 'All' : f}</button>`).join('')}</div>${mgr() ? `<div class="ac" style="margin:0 0 14px"><button class="btn" data-a="genRent">Generate ${ML(CM)} rent</button></div>` : ''}${cs.map(c => {
      const l = g('leases', c.lid);
      const i = info(l);
      const b = bal(c);
      const s = st(c);
      return `<div class="g row">${ico('pay', s == 'Paid' ? '#34c759' : s == 'Overdue' ? '#ff3b30' : '#0a84ff')}<div class="m"><b>${esc(i.t.name)} · ${esc(i.u.name)}</b><small>${MF(c.m)} · due ${c.due.slice(5)}<br>${inr(c.amt)}${b > 0 && b < c.amt ? ' · ' + inr(b) + ' left' : ''}</small></div><div style="text-align:right"><span class="bd ${s}">${s}</span>${b > 0 && mgr() ? `<br><button class="btn s" style="margin-top:8px" data-a="payNow" data-i="${c.id}">Record</button> <button class="btn s q" style="margin-top:8px" data-a="adj" data-i="${c.id}">Adjust</button> <button class="btn s q" style="margin-top:8px" data-a="payqr" data-i="${c.id}">QR</button>` : b > 0 && D.upi ? `<br><button class="btn s" style="margin-top:8px" data-a="payqr" data-i="${c.id}">Pay</button>` : ''}${mgr() && b < c.amt ? ` <button class="btn s q" style="margin-top:8px" data-a="rev" data-i="${c.id}">Reverse</button>` : ''}${b < c.amt ? `<br><button class="btn s q" style="margin-top:8px" data-a="rcpt" data-i="${c.id}">Receipt</button>` : ''}</div></div>`;
    }).join('') || empty('Nothing here')}`;
  },
  begin() {
    const s = [['Add a property', D.props.length, 'addProp'], ['Add a unit', D.units.length, 'addUnit'], ['Add a tenant', D.tenants.length, 'addTen'], ['Create a lease', D.leases.length, 'addLease'], ['Generate rent', D.charges.length, 'genRent']];
    const n = s.findIndex(x => !x[1]);
    return n < 0 ? '' : `<h2>Get started</h2><div class="g k"><small>${n} of 5 steps done</small><b style="font-size:20px">Next: ${s[n][0]}</b><br><div class="ac"><button class="btn s" data-a="${s[n][2]}">${s[n][0]}</button></div></div>`;
  },
  alerts() {
    const od = D.charges.filter(c => st(c) == 'Overdue').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
    const ex = D.leases.filter(l => l.st == 'active' && l.end >= TD && (new Date(l.end) - T) / 864e5 <= 60).sort((a, b) => a.end.localeCompare(b.end)).slice(0, 3);
    return (od.length ? '<h2>Overdue rent</h2>' + od.map(c => {
      const i = info(g('leases', c.lid));
      return `<div class="g row">${ico('pay', '#ff3b30')}<div class="m"><b>${esc(i.t.name)} · ${esc(i.u.name)}</b><small>${inr(bal(c))} · ${Math.max(1, Math.floor((T - new Date(c.due)) / 864e5))} days late</small></div><button class="btn s" data-a="remind" data-i="${c.id}">Remind</button></div>`;
    }).join('') : '') + (ex.length ? '<h2>Leases ending soon</h2>' + ex.map(l => {
      const i = info(l);
      return `<div class="g row">${ico('leases', '#af52de')}<div class="m"><b>${esc(i.t.name)} · ${esc(i.u.name)}</b><small>Ends ${l.end} · ${Math.ceil((new Date(l.end) - T) / 864e5)} days left</small></div></div>`;
    }).join('') : '');
  },
  mrow(m) {
    const u = g('units', m.uid);
    return `<div class="g row" data-a="cyc" data-i="${m.id}">${ico('maint', '#ff9500')}<div class="m"><b>${esc(m.title)}</b><small>${esc(g('props', u.pid).name)} · ${esc(u.name)}${m.desc ? ' · ' + esc(m.desc) : ''}</small></div><div style="text-align:right"><span class="bd ${m.st}">${m.st == 'Progress' ? 'In progress' : m.st}</span><br><span class="bd ${m.pr}" style="display:inline-block;margin-top:6px">${m.pr}</span></div></div>`;
  },
  maint(f) {
    return `<div class="ac" style="margin:0 0 14px"><button class="btn" data-a="addM">+ Request</button></div>${f ? '' : '<small style="color:var(--mu)">Tap a request to advance its status.</small><br><br>'}${MT().filter(m => !f || m.st != 'Resolved').map(V.mrow).join('') || empty('No repair requests')}`;
  },
  qrow(q) {
    return `<div class="g row" data-a="cycQ" data-i="${q.id}">${ico('inq', '#ff2d55')}<div class="m"><b>${esc(q.name)}</b><small>${esc(g('props', q.pid).name)} · ${esc(q.msg)}</small></div><span class="bd ${q.st}">${q.st}</span></div>`;
  },
  inq() {
    return `${D.inq.map(V.qrow).join('') || empty('No inquiries yet')}`;
  },
  set() {
    return `<div class="g k"><small>Workspace</small><b style="font-size:22px">${esc(D.org)}</b><span>${D.owner ? 'Owner' : mgr() ? 'Manager' : 'Tenant'} · ${esc(S.user.email)}</span>${D.owner ? '<br><br><div class="ac"><button class="btn s" data-a="org">Rename</button><button class="btn s q" data-a="invite">Invite someone</button><button class="btn s q" data-a="upi">UPI ID</button></div>' : ''}${D.multi.length > 1 ? '<br><button class="btn s q" data-a="swap">Switch workspace</button>' : ''}</div><h2>Data</h2><div class="g k"><span>Your records are stored in your Supabase project and protected by row-level security.</span><br><br><div class="ac"><button class="btn q" data-a="theme">Theme</button><button class="btn q" data-a="csv">Payments CSV</button><button class="btn q" data-a="exp">JSON</button><button class="btn d" data-a="out">Sign out</button></div></div>`;
  }
};
const run = async (p) => {
  const r = await p;
  if (r.error)
    throw r.error;
  return r.data;
};
const ins = (t, o) => run(sb.from(t).insert({ org_id: ORG, ...o }));
const upd = (t, i, o) => run(sb.from(t).update(o).eq('id', i));
const R = x => Math.round(x * 100);
const act = async (f) => {
  try {
    await f();
    await load();
    render();
  }
  catch (x) {
    toast(x.message || 'Something went wrong');
  }
};
const bad = m => {
  throw new Error(m);
};
const A = {
  authIn() { auth('in'); },
  authUp() { auth('up'); },
  authRs(e) { e && e.preventDefault && e.preventDefault(); auth('rs'); },
  setPw() { setPw(); },
  mkOrg() { mkOrg(); },
  signOut() { sb.auth.signOut(); },
  retryStart() { start(); },
  selectSelf(e) { e.target && e.target.select && e.target.select(); },
  printPage() { window.print(); },
  nav(e) {
    go(e.dataset.v);
  }, more() {
    const o = document.createElement('div');
    o.className = 'ov';
    o.innerHTML = `<div class="sh g"><h3>More</h3>${MORE.map(k => `<div class="g row" data-a="nav" data-v="${k}">${ico(k, SEC[k][1])}<div class="m"><b>${SEC[k][0]}</b></div></div>`).join('')}</div>`;
    o.onclick = e => {
      if (e.target == o || e.target.closest('[data-a]'))
        setTimeout(() => o.remove());
    };
    document.body.append(o);
  },
  flt(e) {
    flt = e.dataset.i;
    render();
  },
  genRent() {
    sheet('Generate rent', [{
        k: 'm', l: 'Month', t: 'select', v: CM, o: [[CM, MF(CM)], [mk(1), MF(mk(1))]]
      }], async (f) => {
      let r = await sb.rpc('generate_rent_for', { p_org: ORG, p_month: f.m + '-01' });
      if (r.error && /function|PGRST202/i.test(r.error.message + r.error.code) && f.m == CM)
        r = await sb.rpc('generate_rent', { p_org: ORG });
      const n = await run(Promise.resolve(r));
      toast(n ? `Generated ${n} charge${n > 1 ? 's' : ''}` : `${MF(f.m)} rent already generated`);
    }, 'Generate');
  },
  payNow(e) {
    const c = g('charges', e.dataset.i);
    const b = bal(c);
    sheet('Record payment', [{
        k: 'a', l: 'Amount (₹)', t: 'number', v: b
      }, { k: 'r', l: 'Reference (UPI / cheque no.)', v: '' }], async (f) => {
      const a = +f.a;
      if (!(a > 0) || a > b + .001)
        bad('Amount must be between ₹1 and ' + inr(b));
      await run(sb.rpc('record_payment', { p_charge: c.id, p_amount: R(a), p_reference: f.r }));
      toast(inr(a) + ' recorded');
      setTimeout(() => A.rcpt({ dataset: { i: c.id } }), 900);
    }, 'Record');
  },
  rev(e) {
    const c = g('charges', e.dataset.i);
    const p = D.pays.filter(x => x.cid == c.id && !x.rev).sort((a, b) => a.ts < b.ts ? -1 : 1).pop();
    if (!p)
      return;
    sheet('Reverse last payment', [{ k: 'w', l: 'Reason', v: '' }], async (f) => {
      await run(sb.rpc('reverse_payment', { p_id: p.id, p_reason: f.w }));
      toast('Payment reversed');
    }, 'Reverse');
  },
  addProp() {
    sheet('New property', [{ k: 'n', l: 'Name', v: '' }, { k: 'a', l: 'Address', v: '' }, { k: 'c', l: 'City', v: '' }], async (f) => {
      await ins('properties', { name: f.n, address: f.a, city: f.c });
      toast('Property added');
    });
  },
  pub(e) {
    const p = g('props', e.dataset.i);
    act(async () => {
      await upd('properties', p.id, { published: !p.pub });
      toast(p.pub ? 'Moved to draft' : 'Published');
    });
  },
  addUnit() {
    if (!D.props.length)
      return toast('Add a property first');
    sheet('New unit', [{
        k: 'p', l: 'Property', t: 'select', o: D.props.map(p => [p.id, p.name])
      }, { k: 'n', l: 'Unit name', v: '' }, {
        k: 'b', l: 'Bedrooms', t: 'number', v: 2, mn: 0, st: 1
      }, {
        k: 'r', l: 'Monthly rent (₹)', t: 'number', v: 20000
      }], async (f) => {
      await ins('units', {
        property_id: f.p, name: f.n, bedrooms: +f.b, rent: R(f.r)
      });
      toast('Unit added');
    });
  },
  addTen() {
    sheet('New tenant', [{ k: 'n', l: 'Full name', v: '' }, {
        k: 'e', l: 'Email', t: 'email', v: ''
      }, {
        k: 'p', l: 'Phone', v: '', r: 0
      }], async (f) => {
      await ins('tenants', { name: f.n, email: f.e.toLowerCase(), phone: f.p });
      toast('Tenant added');
    });
  },
  addLease() {
    const vu = D.units.filter(u => !active(u));
    if (!vu.length || !D.tenants.length)
      return toast('Add a vacant unit and a tenant first');
    sheet('New lease', [{
        k: 'u', l: 'Vacant unit', t: 'select', o: vu.map(u => [u.id, g('props', u.pid).name + ' · ' + u.name])
      }, {
        k: 't', l: 'Tenant', t: 'select', o: D.tenants.map(t => [t.id, t.name])
      }, {
        k: 's', l: 'Start date', t: 'date', v: TD
      }, {
        k: 'm', l: 'Months', t: 'number', v: 11, mn: 1, st: 1
      }, {
        k: 'r', l: 'Rent (₹)', t: 'number', v: vu[0].rent
      }, {
        k: 'd', l: 'Deposit (₹)', t: 'number', v: vu[0].rent * 2, mn: 0
      }], async (f) => {
      const s0 = new Date(f.s + 'T00:00:00Z');
      const y0 = s0.getUTCFullYear();
      const m0 = s0.getUTCMonth() + +f.m;
      const e = new Date(Date.UTC(y0, m0, Math.min(s0.getUTCDate(), new Date(Date.UTC(y0, m0 + 1, 0)).getUTCDate())));
      e.setUTCDate(e.getUTCDate() - 1);
      await ins('leases', {
        unit_id: f.u, tenant_id: f.t, starts_on: f.s, ends_on: e.toISOString().slice(0, 10), rent: R(f.r), deposit: R(f.d)
      });
      toast('Lease created');
    });
  },
  endLease(e) {
    const l = g('leases', e.dataset.i);
    sheet('End this lease?', [], async () => {
      await upd('leases', l.id, { status: 'ended' });
      toast('Lease ended');
    }, 'End lease');
  },
  addM(_, pre) {
    const us = mgr() ? D.units : LS().map(l => g('units', l.uid));
    if (!us.length)
      return toast('No units available');
    sheet('Repair request', [{
        k: 'u', l: 'Unit', t: 'select', v: pre, o: us.map(u => [u.id, g('props', u.pid).name + ' · ' + u.name])
      }, { k: 't', l: 'Issue', v: '' }, {
        k: 'd', l: 'Details', t: 'area', v: '', r: 0
      }, {
        k: 'p', l: 'Priority', t: 'select', v: 'Medium', o: ['Low', 'Medium', 'High'].map(x => [x, x])
      }], async (f) => {
      await ins('maintenance', {
        unit_id: f.u, tenant_id: mgr() ? null : ME(), title: f.t, description: f.d || '', priority: f.p, status: 'Open'
      });
      toast('Request sent');
    }, 'Submit');
  },
  cyc(e) {
    if (!mgr())
      return;
    const m = g('maint', e.dataset.i);
    const o = ['Open', 'Progress', 'Resolved'];
    const n = o[(o.indexOf(m.st) + 1) % 3];
    act(() => upd('maintenance', m.id, { status: n == 'Progress' ? 'In progress' : n }));
  },
  cycQ(e) {
    const q = g('inq', e.dataset.i);
    const o = ['New', 'Contacted', 'Closed'];
    act(() => upd('inquiries', q.id, { status: o[(o.indexOf(q.st) + 1) % 3] }));
  },
  org() {
    sheet('Rename workspace', [{ k: 'n', l: 'Name', v: D.org }], async (f) => {
      await run(sb.rpc('update_organization', { p_org: ORG, p_name: f.n, p_slug: D.slug }));
      D.org = f.n;
      toast('Renamed');
    });
  },
  invite() {
    sheet('Invite someone', [{
        k: 'e', l: 'Their email', t: 'email', v: ''
      }, {
        k: 'r', l: 'Role', t: 'select', o: [['tenant', 'Tenant (needs a tenant record with this email)'], ['manager', 'Manager']]
      }], async (f) => {
      const tk = crypto.randomUUID().replace(/-/g, '');
      await ins('invitations', { email: f.e.toLowerCase(), role: f.r, token_hash: await sha(tk) });
      const l = location.origin + location.pathname + '?invite=' + tk;
      setTimeout(() => modal('<h3>Invite link</h3><p style="color:var(--mu)">Valid 7 days. Share the link or let them scan the code.</p><div class="qb">' + qrSvg(l, { size: 200 }) + '</div><input readonly value="' + l + '" data-a="selectSelf"><br><br><button class="btn" data-x style="width:100%">Done</button>'), 50);
    }, 'Create link');
  },
  swap() {
    sheet('Switch workspace', [{
        k: 'o', l: 'Workspace', t: 'select', v: ORG, o: D.multi.map(m => [m.org_id, m.organizations.name])
      }], f => {
      ls('po-org', f.o);
      start();
    }, 'Switch');
  },
  exp() {
    const a = document.createElement('a');
    a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(D, null, 1));
    a.download = 'propertyos-export.json';
    a.click();
  },
  theme() {
    const o = ['', 'light', 'dark'];
    const h = document.documentElement;
    const n = o[(o.indexOf(h.dataset.theme || '') + 1) % 3];
    n ? h.dataset.theme = n : delete h.dataset.theme;
    ls('po-theme', n);
    toast('Theme: ' + (n || 'auto'));
  },
  out() {
    sb.auth.signOut();
  },
  rcpt(e) {
    const c = g('charges', e.dataset.i);
    let th = ls('po-rt') || 'r1';
    const o = document.createElement('div');
    o.className = 'rcw';
    const dr = () => {
      o.innerHTML = rcHtml(c, th) + `<div class="rcb g">${[['r1', 'Aurora'], ['r2', 'Ledger'], ['r3', 'Noir']].map(([k, n]) => `<button class="pill ${th == k ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}<button class="btn s" data-p>Print</button><button class="btn s q" data-s>Share</button><button class="btn s q" data-x>✕</button></div>`;
    };
    o.onclick = ev => {
      const d = ev.target.dataset;
      if (d.t) {
        th = d.t;
        try {
          ls('po-rt', th);
        }
        catch (x) {
        }
        dr();
      }
      else if (d.p != null)
        window.print();
      else if (d.s != null) {
        const u = BASE() + '?verify=' + c.id;
        const tx = `Rent receipt · ${inr(paid(c))} for ${MF(c.m)}`;
        navigator.share ? navigator.share({ title: 'Rent receipt', text: tx, url: u }).catch(() => {
        }) : navigator.clipboard.writeText(tx + ' ' + u).then(() => toast('Link copied'));
      }
      else if (d.x != null || ev.target == o)
        o.remove();
    };
    dr();
    document.body.append(o);
  },
  labels(e) {
    const p = g('props', e.dataset.i);
    const us = D.units.filter(u => u.pid == p.id);
    const o = document.createElement('div');
    o.className = 'rcw';
    o.innerHTML = `<div class="lb">${us.map(u => `<div class="lc"><small>${esc(p.name)}</small><b>${esc(u.name)}</b><div class="qb">${qrSvg(BASE() + '?repair=' + u.id, { size: 150 })}</div><small>Scan to report a repair</small></div>`).join('') || '<div class="g em">No units yet</div>'}</div><div class="rcb g"><button class="btn s" data-p>Print labels</button><button class="btn s q" data-x>✕</button></div>`;
    o.onclick = ev => {
      const d = ev.target.dataset;
      if (d.p != null)
        window.print();
      else if (d.x != null || ev.target == o)
        o.remove();
    };
    document.body.append(o);
  },
  upi() {
    sheet('UPI ID for rent QR', [{ k: 'v', l: 'UPI ID (e.g. name@bank). Shared with your tenants so they can pay by UPI.', v: D.upi || ls('po-upi-' + ORG) || '' }], async (f) => {
      const v = f.v.trim();
      if (!/^[\w.\-]{2,256}@[A-Za-z]{2,64}$/.test(v))
        bad('Enter a valid UPI ID like name@bank');
      const r = await sb.rpc('set_upi_id', { p_org: ORG, p_upi: v });
      if (r.error) {
        if (!/function|PGRST202/i.test(r.error.message + r.error.code))
          throw r.error;
        ls('po-upi-' + ORG, v);
      }
      D.upi = v;
      toast('UPI ID saved');
    });
  },
  payqr(e) {
    const c = g('charges', e.dataset.i);
    const v = D.upi || ls('po-upi-' + ORG);
    const i = info(g('leases', c.lid));
    if (!v)
      return toast(mgr() ? 'Set your UPI ID in Settings first' : 'UPI payment is not set up yet');
    const u = `upi://pay?pa=${encodeURIComponent(v)}&pn=${encodeURIComponent(D.org)}&am=${bal(c).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Rent ' + MF(c.m) + ' ' + i.u.name)}`;
    modal(`<h3>Scan to pay ${inr(bal(c))}</h3><p style="color:var(--mu)">${esc(i.t.name)} · ${MF(c.m)}. ${mgr() ? 'Works with any UPI app. Record the payment here once it arrives.' : 'Pay with any UPI app. Your manager records it once received.'}</p><div class="qb">${qrSvg(u, { size: 220 })}</div>${mgr() ? '' : `<a class="btn" href="${esc(u)}" style="display:block;text-align:center;text-decoration:none;margin-bottom:10px">Open UPI app</a>`}<button class="btn q" data-x style="width:100%">Close</button>`);
  },
  async scan() {
    const o = document.createElement('div');
    o.className = 'ov';
    o.innerHTML = '<div class="sh g"><h3>Scan QR</h3><video id="sv" playsinline muted style="width:100%;border-radius:20px;background:#000;aspect-ratio:1;object-fit:cover"></video><p id="sn" style="color:var(--mu);font-size:14px"></p><button class="btn q" data-x style="width:100%">Close</button></div>';
    let st;
    let live = 1;
    const end = () => {
      live = 0;
      st && st.getTracks().forEach(t => t.stop());
      o.remove();
    };
    o.onclick = ev => {
      if (ev.target == o || ev.target.dataset.x != null)
        end();
    };
    document.body.append(o);
    const n = $('#sn');
    if (!('BarcodeDetector' in window))
      return n.textContent = 'Live scanning is not supported in this browser. Use your phone camera app to scan; the link opens PropertyOS.';
    try {
      st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = $('#sv');
      v.srcObject = st;
      await v.play();
      const bd = new BarcodeDetector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!live)
          return;
        try {
          const r = await bd.detect(v);
          if (r[0]) {
            const u = new URL(r[0].rawValue);
            if (u.searchParams.get('verify') || u.searchParams.get('repair')) {
              end();
              history.pushState(null, '', '?x');
              return route(u.searchParams);
            }
            n.textContent = 'That code is not a PropertyOS code.';
          }
        }
        catch (x) {
        }
        setTimeout(tick, 300);
      };
      tick();
    }
    catch (x) {
      n.textContent = 'Camera unavailable: ' + x.message;
    }
  },
  adj(e) {
    const c = g('charges', e.dataset.i);
    sheet('Adjust rent charge', [{
        k: 'a', l: 'New total for ' + MF(c.m) + ' (₹)', t: 'number', v: c.amt
      }, { k: 'w', l: 'Reason (kept in the audit trail)', v: '' }], async (f) => {
      await run(sb.rpc('adjust_charge', { p_charge: c.id, p_amount: R(f.a), p_reason: f.w }));
      toast('Charge adjusted');
    }, 'Adjust');
  },
  remind(e) {
    const c = g('charges', e.dataset.i);
    const i = info(g('leases', c.lid));
    const ph = (i.t.phone || '').replace(/\D/g, '');
    sheet('Send reminder', [{
        k: 'c', l: 'Channel', t: 'select', o: [...(ph ? [['wa', 'WhatsApp']] : []), ['em', 'Email']]
      }, {
        k: 'm', l: 'Message', t: 'area', v: `Hi ${i.t.name.split(' ')[0]}, a friendly reminder that rent of ${inr(bal(c))} for ${MF(c.m)} (${i.u.name}) was due on ${c.due}. Please let us know once it's paid. Thank you, ${D.org}`
      }], f => {
      if (f.c == 'wa')
        window.open('https://wa.me/' + (ph.length == 10 ? '91' + ph : ph) + '?text=' + encodeURIComponent(f.m), '_blank', 'noopener');
      else
        location.href = 'mailto:' + i.t.email + '?subject=' + encodeURIComponent('Rent reminder · ' + MF(c.m)) + '&body=' + encodeURIComponent(f.m);
    }, 'Open');
  },
  editTen(e) {
    const t = g('tenants', e.dataset.i);
    sheet('Edit tenant', [{ k: 'n', l: 'Full name', v: t.name }, {
        k: 'e', l: 'Email', t: 'email', v: t.email
      }, {
        k: 'p', l: 'Phone', v: t.phone, r: 0
      }], async (f) => {
      await upd('tenants', t.id, { name: f.n, email: f.e.toLowerCase(), phone: f.p });
      toast('Tenant updated');
    });
  },
  editUnit(e) {
    const u = g('units', e.dataset.i);
    sheet('Edit unit', [{ k: 'n', l: 'Unit name', v: u.name }, {
        k: 'b', l: 'Bedrooms', t: 'number', v: u.bd, mn: 0, st: 1
      }, {
        k: 'r', l: 'Listed rent (₹/mo)', t: 'number', v: u.rent
      }], async (f) => {
      await upd('units', u.id, { name: f.n, bedrooms: +f.b, rent: R(f.r) });
      toast('Unit updated');
    });
  },
  csv() {
    const q = x => {
      let s = String(x ?? '');
      if (/^[=+\-@\t\r]/.test(s))
        s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const rows = [['Date', 'Tenant', 'Unit', 'Month', 'Amount INR', 'Reference', 'Reversed reason'], ...D.pays.map(p => {
        const c = g('charges', p.cid);
        const i = info(g('leases', c.lid));
        return [p.at, i.t.name, i.u.name, c.m, p.amt, p.ref, p.rev || ''];
      })];
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.map(q).join(',')).join('\n'));
    a.download = 'payments.csv';
    a.click();
  },
  srch() {
    if (!mgr())
      return;
    const o = document.createElement('div');
    o.className = 'ov';
    o.innerHTML = '<div class="sh g"><label style="margin:0 0 12px">Search everything<input id="sq" placeholder="Tenant, unit, property, repair…" autocomplete="off"></label><div id="sr"></div></div>';
    o.onclick = e => {
      if (e.target == o || e.target.closest('[data-a]'))
        setTimeout(() => o.remove());
    };
    document.body.append(o);
    const all = [...D.tenants.map(t => ['tenants', t.name, t.email + ' ' + t.phone]), ...D.props.map(p => ['props', p.name, p.city]), ...D.units.map(u => ['props', g('props', u.pid).name + ' · ' + u.name, u.bd + ' BHK ' + inr(u.rent)]), ...D.leases.map(l => {
        const i = info(l);
        return ['leases', i.t.name + ' · ' + i.u.name, l.start + ' → ' + l.end];
      }), ...D.maint.map(m => ['maint', m.title, m.st]), ...D.inq.map(q => ['inq', q.name, q.msg])];
    const sr = o.querySelector('#sr');
    const inp = o.querySelector('#sq');
    const show = () => {
      const q = inp.value.trim().toLowerCase();
      const r = (q ? all.filter(x => (x[1] + ' ' + x[2]).toLowerCase().includes(q)) : all.slice(0, 6)).slice(0, 8);
      sr.innerHTML = r.map(x => `<div class="g row" data-a="nav" data-v="${x[0]}">${ico(x[0], SEC[x[0]][1])}<div class="m"><b>${esc(x[1])}</b><small>${esc(x[2])}</small></div></div>`).join('') || '<div class="em">No matches</div>';
    };
    inp.oninput = show;
    show();
    inp.focus();
  }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (el && A[el.dataset.a] && !el.closest('.ov form'))
    A[el.dataset.a](el);
});
function go(v) {
  navigator.vibrate && navigator.vibrate(8);
  view = v;
  fresh = true;
  scrollTo({ top: 0, behavior: 'smooth' });
  render();
}
function render() {
  if (role == 'tenant' && !TEN.includes(view))
    view = 'home';
  const S = role == 'tenant' ? TEN : Object.keys(SEC);
  $('#lg').innerHTML = '<img src="assets/logo.png" alt="PropertyOS" data-logo-fallback="1">';
  bindLogoFallbacks($('#lg'));
  $('#rl').textContent = 'Sign out';
  $('#sd').innerHTML = `<div class="br">PropertyOS</div>${S.map(k => `<button class="${view == k ? 'on' : ''}" data-a="nav" data-v="${k}">${I(k)}${SEC[k][0]}</button>`).join('')}`;
  const tabs = role == 'tenant' ? TEN : TABS;
  const ix = Math.max(0, tabs.indexOf(MORE.includes(view) ? 'more' : view));
  $('#tb').innerHTML = `<div class="lens" style="width:calc((100% - 12px)/${tabs.length});transform:translateX(${ix * 100}%)"></div>` + tabs.map(k => `<button class="${ix == tabs.indexOf(k) ? 'on' : ''}" data-a="${k == 'more' ? 'more' : 'nav'}" data-v="${k}">${I(k)}${k == 'more' ? 'More' : SEC[k][0]}</button>`).join('');
  const v = $('#v');
  v.innerHTML = `<h1 style="margin:0 4px 14px">${SEC[view][0]}</h1>` + V[view]();
  bindLogoFallbacks(v);
  if (fresh) {
    [...v.children].forEach((c, i) => c.style.setProperty('--i', i));
    fresh = false;
  }
  else
    [...v.children].forEach(c => c.style.animation = 'none');
  requestAnimationFrame(() => {
    v.querySelectorAll('[data-h]').forEach(s => s.style.height = Math.max(2, s.dataset.h) + '%');
    v.querySelectorAll('[data-n]').forEach(n => {
      const to = +n.dataset.n;
      const p = n.dataset.p || '';
      const s = n.dataset.s || '';
      const t0 = performance.now();
      const f = t => {
        const k = Math.min(1, (t - t0) / 900);
        const e = 1 - Math.pow(1 - k, 3);
        n.textContent = p + Math.round(to * e).toLocaleString('en-IN') + s;
        k < 1 && requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
  });
}
$('#scbtn').innerHTML = I('qr');
$('#scbtn').onclick = () => A.scan();
$('#sbtn').innerHTML = I('search');
$('#sbtn').onclick = () => A.srch();
addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key == 'k' && ORG) {
    e.preventDefault();
    A.srch();
  }
});
$('#rl').onclick = () => sb.auth.signOut();
{
  const t = ls('po-theme');
  t && (document.documentElement.dataset.theme = t);
}
addEventListener('keydown', e => {
  if (e.key == 'Escape') {
    const o = [...document.querySelectorAll('.ov,.rcw')].pop();
    if (o) {
      const x = o.querySelector('[data-x]');
      x ? x.click() : o.remove();
    }
  }
  else if ((e.key == 'Enter' || e.key == ' ') && e.target.matches && e.target.matches('[data-a]:not(button)')) {
    e.preventDefault();
    e.target.click();
  }
});
new MutationObserver(() => {
  document.querySelectorAll('[data-a]:not(button):not([tabindex])').forEach(x => {
    x.tabIndex = 0;
    x.setAttribute('role', 'button');
  });
  bindLogoFallbacks(document.body);
}).observe(document.body, { childList: true, subtree: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !ORG)
    return;
  if (ist(new Date()) != TD)
    return location.reload();
  load().then(render).catch(() => {
  });
});
addEventListener('online', () => ORG && load().then(render).catch(() => {
}));
document.readyState == 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
try {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
}
catch (e) {
}
