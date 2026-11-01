// Home screen: greeting, role widgets, app icons and the dock.
import { h } from '../core/h.js';
import { icon, hero } from '../core/icons.js';
import { S, emit, firstName, nowTs } from '../core/store.js';
import { t } from '../core/i18n.js';
import { dataOf, gateProperties } from '../core/data.js';
import { addMonth, curMonth, fmtDay, greetingKey, inr, monthLabel, num } from '../core/format.js';
import { haptic, sound } from '../core/fx.js';
import { APP_DEFS, launch } from '../apps/registry.js';
import { api } from '../core/api.js';
import { toast } from '../core/layers.js';

// ---------- widget builder ----------
function Widget({ cls = '', hue = 214, title, art, num: bigNum, numText, sub, stats, cta, chip, hot = false, onClick, loading = false }) {
  const el = h('button', { class: `widget tile glass-fake press ${cls}`, type: 'button', style: { '--tile': hue } },
    h('div', { class: 'w-title' }, title),
    art ? art : null);
  if (loading) {
    el.append(h('div', { class: 'skel', style: { height: '38px', width: '60%', marginTop: 'auto' } }), h('div', { class: 'skel', style: { height: '14px', width: '40%', marginTop: '10px' } }));
  } else {
    if (chip) el.append(h('span', { class: `w-chip ${hot ? 'hot' : ''}` }, chip));
    el.append(h('div', { class: 'w-num' }, bigNum !== undefined ? [h('small', null, '₹'), num(bigNum)] : numText));
    if (sub) el.append(h('div', { class: 'w-sub' }, sub));
    if (stats) el.append(h('div', { class: 'w-stats' }, stats.map(([n, label]) => h('div', null, h('b', null, n), h('span', null, label)))));
    if (cta) el.append(h('span', { class: 'w-cta' }, cta, icon('right', 16)));
  }
  el.addEventListener('click', () => { haptic(); sound('tap'); if (onClick) onClick(el); });
  return el;
}
const art = (name) => hero(name, 'w-art');

// ---------- per-role widgets ----------
const urgentOpen = (tickets) => tickets.filter((x) => x.urgency === 'urgent' && !['resolved', 'closed'].includes(x.status)).length;
const openTickets = (tickets) => tickets.filter((x) => x.status !== 'closed').length;

function repairsWidget() {
  const d = dataOf('tickets');
  if (!d) return Widget({ cls: '', hue: 34, title: t('app.repairs'), art: art('wrench'), loading: true, onClick: () => launch('repairs') });
  const n = openTickets(d.tickets);
  const u = urgentOpen(d.tickets);
  return Widget({
    hue: 34, title: t('app.repairs'), art: art('wrench'), numText: n ? String(n) : '0',
    sub: n ? (u ? t('w.urgent', { n: u }) : t('w.open_repairs', { n })) : t('w.all_clear'),
    onClick: (el) => launch('repairs', { from: el }),
  });
}

function visitorsWidget() {
  const d = dataOf('visitors');
  if (!d) return Widget({ hue: 262, title: t('app.visitors'), art: art('pass'), loading: true, onClick: () => launch('visitors') });
  const now = nowTs();
  const live = d.visitors.filter((v) => v.status === 'active' && v.valid_to > now);
  const waiting = d.visitors.filter((v) => v.status === 'requested' && v.valid_to > now);
  return Widget({
    hue: 262, title: t('app.visitors'), art: art('pass'), numText: String(live.length),
    sub: waiting.length ? undefined : t('w.passes_active', { n: live.length }),
    chip: waiting.length ? t('w.asking', { n: waiting.length }) : null, hot: waiting.length > 0,
    onClick: (el) => launch('visitors', { from: el }),
  });
}

function propertiesWidget() {
  const d = dataOf('rent');
  if (!d) return Widget({ hue: 226, title: t('app.properties'), art: art('key'), loading: true, onClick: () => launch('properties') });
  const total = d.units.length;
  const occ = d.units.filter((u) => u.status !== 'vacant').length;
  return Widget({
    hue: 226, title: t('app.properties'), art: art('key'), numText: String(total),
    sub: total ? t('w.units_occupied', { n: occ }) : t('w.add_first_short'),
    onClick: (el) => launch('properties', { from: el }),
  });
}

function recordWidget() {
  return Widget({
    hue: 150, title: t('w.record'), art: art('note'), numText: '+', sub: t('w.record_sub'),
    onClick: (el) => launch('rent', { from: el, record: true }),
  });
}

function landlordRent() {
  const d = dataOf('rent');
  const loading = !d;
  if (d && d.units.length === 0) {
    return Widget({
      cls: 'lg', hue: 196, title: t('w.welcome'), art: art('key'), numText: t('w.start'), sub: t('w.add_first'), cta: t('w.add_property'),
      onClick: (el) => launch('properties', { from: el, add: true }),
    });
  }
  if (loading) return Widget({ cls: 'lg', hue: 196, title: t('app.rent'), art: art('coin'), loading: true, onClick: () => launch('rent') });
  const s = d.summary;
  const claims = d.units.reduce((a, u) => a + u.claims.length, 0) + s.other_claims;
  return Widget({
    cls: 'lg', hue: 196, title: `${t('app.rent')} · ${monthLabel(d.month)}`, art: art('coin'), num: s.collected,
    sub: t('w.of_expected', { amt: inr(s.expected) }),
    stats: [[String(s.overdue_count), t('w.overdue')], [String(claims), t('w.to_confirm')]],
    chip: claims ? t('w.claims', { n: claims }) : null, hot: claims > 0,
    onClick: (el) => launch('rent', { from: el }),
  });
}

function nextDueLabel(unit) {
  const ym = addMonth(curMonth(), 1);
  const [y, m] = ym.split('-').map(Number);
  const day = Math.min(unit.due_day, new Date(Date.UTC(y, m, 0)).getUTCDate());
  return fmtDay(Date.UTC(y, m - 1, day, 6) / 1000);
}

function tenantRent() {
  const d = dataOf('myrent');
  if (!d) return Widget({ cls: 'lg', hue: 214, title: t('app.rent'), art: art('coin'), loading: true, onClick: () => launch('rent') });
  if (!d.tenancies.length) {
    return Widget({
      cls: 'lg', hue: 214, title: t('w.welcome'), art: art('key'), numText: t('w.join_home'), sub: t('w.join_sub'), cta: t('w.enter_code'),
      onClick: (el) => launch('join', { from: el }),
    });
  }
  const ten = [...d.tenancies].sort((a, b) => b.ledger.outstanding - a.ledger.outstanding)[0];
  const row = ten.ledger.rows[0];
  const where = `${ten.property.name} · ${ten.unit.label}`;
  const waiting = ten.payments.some((p) => p.status === 'pending');
  if (ten.ledger.outstanding > 0) {
    const overdue = ten.ledger.oldest && ten.ledger.oldest.status === 'overdue';
    return Widget({
      cls: 'lg', hue: 214, title: where, art: art('coin'), num: ten.ledger.outstanding,
      sub: overdue ? t('w.overdue_since', { m: monthLabel(ten.ledger.oldest.period) }) : t('w.due_on', { d: fmtDay(row.due_ts) }),
      chip: waiting ? t('w.waiting_landlord') : null,
      cta: waiting ? null : t('w.pay_rent'),
      onClick: (el) => launch('rent', { from: el }),
    });
  }
  return Widget({
    cls: 'lg', hue: 160, title: where, art: art('coin'), numText: t('w.all_paid'),
    sub: t('w.next_due', { d: nextDueLabel(ten.unit) }),
    stats: [[inr(ten.unit.rent), t('w.monthly_rent')], [String(ten.unit.due_day), t('w.due_day')]],
    onClick: (el) => launch('rent', { from: el }),
  });
}

function guardWidgets() {
  const d = dataOf('guard');
  const props = gateProperties();
  if (!props.length) {
    return [Widget({ cls: 'lg', hue: 8, title: t('app.gate'), art: art('pass'), numText: t('w.no_gate'), sub: t('w.no_gate_sub'), onClick: () => {} })];
  }
  if (!d) return [Widget({ cls: 'lg', hue: 8, title: t('app.gate'), art: art('pass'), loading: true, onClick: () => launch('gate') })];
  const waiting = d.walkins.filter((w) => w.status === 'requested').length;
  const todayStart = nowTs() - ((nowTs() + 19800) % 86400);
  const entries = d.recent.filter((r) => r.result === 'allowed' && r.at >= todayStart).length;
  return [Widget({
    cls: 'lg', hue: 8, title: `${t('app.gate')} · ${d.property.name}`, art: art('pass'), numText: String(d.expected.length), sub: t('w.expected_now'),
    stats: [[String(waiting), t('w.walkins')], [String(entries), t('w.entries_today')]],
    cta: t('w.scan_pass'), onClick: (el) => launch('gate', { from: el }),
  })];
}

// ---------- icons ----------
function AppIcon(id, { badge = 0, dock = false } = {}) {
  const def = APP_DEFS[id];
  const el = h('button', { class: 'appicon press', type: 'button', 'aria-label': t(def.label) },
    h('div', { class: `ico ${def.cls}` }, icon(def.icon, 28), badge ? h('span', { class: 'badge' }, badge > 9 ? '9+' : String(badge)) : null),
    h('span', null, t(def.label)));
  el.addEventListener('click', () => { haptic(); sound('tap'); launch(id, { from: el.querySelector('.ico') }); });
  return el;
}

// ---------- home ----------
export function renderHome() {
  const me = S.me;
  const role = S.role;
  const name = firstName(me.user.name);
  let subtitle = '';
  if (role === 'landlord') {
    const props = me.properties.length;
    subtitle = props ? t('home.landlord_sub', { n: props }) : t('home.landlord_new');
  } else if (role === 'tenant') {
    subtitle = me.tenancies.length ? me.tenancies.map((x) => `${x.property_name} · ${x.label}`).slice(0, 2).join('  ·  ') : t('home.tenant_new');
  } else {
    subtitle = gateProperties().map((p) => p.name).join(' · ') || t('home.guard_new');
  }

  const widgets = h('div', { class: 'widgets' });
  if (role === 'landlord') widgets.append(landlordRent(), repairsWidget(), visitorsWidget(), propertiesWidget(), recordWidget());
  else if (role === 'tenant') widgets.append(tenantRent(), repairsWidget(), visitorsWidget());
  else widgets.append(...guardWidgets());

  const claims = role === 'landlord' && dataOf('rent') ? dataOf('rent').units.reduce((a, u) => a + u.claims.length, 0) : 0;
  const asking = role !== 'guard' && dataOf('visitors') ? dataOf('visitors').visitors.filter((v) => v.status === 'requested' && v.valid_to > nowTs()).length : 0;
  let gridIds = []; let dockIds = [];
  if (role === 'landlord') { dockIds = ['rent', 'repairs', 'visitors', 'properties']; gridIds = ['gate', 'settings']; }
  else if (role === 'tenant') { dockIds = ['rent', 'repairs', 'visitors', 'settings']; gridIds = ['join']; }
  else { dockIds = ['gate', 'settings']; gridIds = []; }
  const badges = { rent: claims, visitors: asking };

  const demo = me.user.is_demo ? h('div', { class: 'demo-banner glass-fake' },
    h('div', null, h('b', null, t('demo.title')), ' · ', t('demo.sub')),
    h('div', { class: 'demo-switch' }, ['landlord', 'tenant', 'guard'].map((r) => h('button', {
      type: 'button', class: S.me.user.role_hint === r ? 'on' : '',
      onClick: async () => {
        if (S.me.user.role_hint === r) return;
        haptic();
        try { await api.post('/demo/switch', { role: r }); emit('demo-switch'); } catch (e) { toast(e.message, 'bad'); }
      },
    }, t(`role.${r}`))))) : null;

  const home = h('div', { class: 'home' },
    h('div', { class: 'greet' }, h('h1', null, `${t(greetingKey())}, ${name}`), h('p', null, subtitle)),
    demo, widgets,
    gridIds.length ? h('div', { class: 'icons' }, gridIds.map((id) => AppIcon(id, { badge: badges[id] || 0 }))) : null);

  const dock = h('nav', { class: 'dock glass refract', 'aria-label': 'Apps' }, dockIds.map((id) => AppIcon(id, { badge: badges[id] || 0, dock: true })));
  return { home, dock };
}
