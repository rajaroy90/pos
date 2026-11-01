// Notification panel and Control Centre (glass panels that drop from the top).
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { S, emit, setPrefs, setRole } from '../core/store.js';
import { t } from '../core/i18n.js';
import { api, load } from '../core/api.js';
import { inr, monthLabel, timeAgo } from '../core/format.js';
import { applyGlass, applyTheme, haptic, refractionSupported } from '../core/fx.js';
import { openPanel } from '../core/layers.js';
import { chooseLang } from '../apps/auth.js';
import { launch } from '../apps/registry.js';

// ---------- notifications ----------
const KIND = {
  rent_claim: { ic: 'rent', tone: 'info', app: 'rent' },
  rent_confirmed: { ic: 'check', tone: 'good', app: 'rent' },
  rent_rejected: { ic: 'alert', tone: 'bad', app: 'rent' },
  ticket_new: { ic: 'wrench', tone: 'warn', app: 'repairs' },
  ticket_comment: { ic: 'chat', tone: 'info', app: 'repairs' },
  ticket_status: { ic: 'wrench', tone: 'info', app: 'repairs' },
  visitor_arrived: { ic: 'door', tone: 'good', app: 'visitors' },
  visitor_request: { ic: 'qr', tone: 'warn', app: 'visitors' },
  tenant_joined: { ic: 'user', tone: 'good', app: 'properties' },
  guard_joined: { ic: 'shield', tone: 'good', app: 'properties' },
  password_reset: { ic: 'lock', tone: 'warn', app: 'settings' },
};
const TONE = { info: ['rgba(120,170,255,.35)', '#fff'], good: ['rgba(80,220,160,.35)', '#fff'], warn: ['rgba(255,190,90,.38)', '#fff'], bad: ['rgba(255,110,100,.4)', '#fff'] };

/** Turn a stored notification into display text. */
export function describe(n) {
  const d = { ...n.data };
  if (d.amount !== undefined) d.amt = inr(d.amount);
  if (d.period) d.month = monthLabel(d.period);
  if (d.status) d.status_label = t(`ts.${d.status}`);
  const k = n.kind;
  return { title: t(`n.${k}.t`, d), sub: t(`n.${k}.s`, d) };
}

export async function openNotifications() {
  const list = h('div');
  const markAll = h('button', { class: 'mini press', type: 'button' }, t('notif.mark_read'));
  const content = [h('h2', null, t('notif.title'), markAll), list];
  const panel = openPanel(content);
  list.append(h('div', { class: 'panel-empty' }, t('common.loading')));

  const render = (items) => {
    list.replaceChildren();
    if (!items.length) { list.append(h('div', { class: 'panel-empty' }, icon('bell', 30), h('div', null, t('notif.empty')))); return; }
    for (const n of items) {
      const meta = KIND[n.kind] || { ic: 'info', tone: 'info' };
      const text = describe(n);
      const [bg, fg] = TONE[meta.tone];
      const el = h('button', { class: `note press ${n.read ? '' : 'unread'}`, type: 'button' },
        h('div', { class: 'ni', style: { background: bg, color: fg } }, icon(meta.ic, 20)),
        h('div', null, h('b', null, text.title), h('span', null, text.sub)),
        h('time', null, timeAgo(n.created_at)));
      el.addEventListener('click', () => {
        haptic();
        api.post('/notifications/read', { ids: [n.id] }).catch(() => {});
        panel.close();
        if (meta.app) setTimeout(() => launch(meta.app, { ref: n.ref, kind: n.kind }), 260);
      });
      list.append(el);
    }
  };

  try {
    const { data } = await load('/notifications');
    render(data.items);
    S.me.unread = 0; emit('unread');
    if (data.unread) api.post('/notifications/read', { all: true }).catch(() => {});
    markAll.addEventListener('click', () => { haptic(); list.querySelectorAll('.unread').forEach((x) => x.classList.remove('unread')); });
  } catch (e) {
    list.replaceChildren(h('div', { class: 'panel-empty' }, e.message));
  }
}

// ---------- control centre ----------
function SegRow(options, value, onChange) {
  const btns = options.map((o) => h('button', { type: 'button', class: o.v === value ? 'on' : '', onClick: () => { haptic(); btns.forEach((b, i) => b.classList.toggle('on', options[i].v === o.v)); onChange(o.v); } }, o.label));
  return h('div', { class: 'cc-seg' }, btns);
}

export function openControlCentre() {
  const tiles = [];
  const mkTile = (ic, title, subText, on, onClick) => {
    const el = h('button', { class: `cc-tile press ${on ? 'on' : ''}`, type: 'button' }, icon(ic, 24), h('div', null, h('b', null, title), h('br'), h('span', null, subText)));
    el.addEventListener('click', () => { haptic(); onClick(el); });
    return el;
  };

  const langTile = mkTile('globe', t('cc.language'), S.prefs.lang === 'hi' ? 'हिन्दी' : 'English', false, () => { panel.close(); setTimeout(() => chooseLang(S.prefs.lang === 'hi' ? 'en' : 'hi'), 260); });
  const hapticTile = mkTile('phone', t('cc.haptics'), S.prefs.haptics ? t('common.on') : t('common.off'), S.prefs.haptics, (el) => {
    setPrefs({ haptics: !S.prefs.haptics });
    el.classList.toggle('on', S.prefs.haptics);
    el.querySelector('span').textContent = S.prefs.haptics ? t('common.on') : t('common.off');
    if (S.prefs.haptics) haptic();
  });
  const soundTile = mkTile('bell', t('cc.sound'), S.prefs.sound ? t('common.on') : t('common.off'), S.prefs.sound, (el) => {
    setPrefs({ sound: !S.prefs.sound });
    el.classList.toggle('on', S.prefs.sound);
    el.querySelector('span').textContent = S.prefs.sound ? t('common.on') : t('common.off');
  });
  tiles.push(langTile, S.prefs.haptics !== undefined ? hapticTile : null, soundTile);

  if (S.installEvent) {
    tiles.push(mkTile('download', t('cc.install'), t('cc.install_sub'), false, async () => {
      const ev = S.installEvent; S.installEvent = null;
      panel.close();
      try { await ev.prompt(); } catch { /* dismissed */ }
    }));
  }

  const roles = S.me ? S.me.roles : [];
  const roleRow = roles.length > 1 ? [
    h('div', { class: 'cc-label' }, t('cc.view_as')),
    SegRow(roles.map((r) => ({ v: r, label: t(`role.${r}`) })), S.role, (v) => { setRole(v); panel.close(); }),
  ] : [];

  const glassOpts = [{ v: 'auto', label: t('cc.auto') }, { v: '0', label: t('cc.solid') }, { v: '1', label: t('cc.frosted') }];
  if (refractionSupported()) glassOpts.push({ v: '2', label: t('cc.refract') });

  const walls = ['auto', 'sky', 'emerald', 'coral', 'dusk', 'graphite'];
  const wallRow = h('div', { class: 'walls' }, walls.map((w) => {
    const b = h('button', { type: 'button', class: `w-${w} ${S.prefs.wall === w ? 'on' : ''}`, 'aria-label': w });
    b.addEventListener('click', () => { haptic(); setPrefs({ wall: w }); wallRow.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); });
    return b;
  }));

  const content = [
    h('h2', null, t('cc.title'), S.me ? h('button', { class: 'mini press', type: 'button', onClick: () => { panel.close(); setTimeout(() => launch('settings'), 260); } }, t('cc.all_settings')) : null),
    h('div', { class: 'cc-grid' }, tiles.filter(Boolean)),
    ...roleRow,
    h('div', { class: 'cc-label' }, t('cc.appearance')),
    SegRow([{ v: 'auto', label: t('cc.auto') }, { v: 'light', label: t('cc.light') }, { v: 'dark', label: t('cc.dark') }], S.prefs.theme, (v) => { setPrefs({ theme: v }); applyTheme(); }),
    h('div', { class: 'cc-label' }, t('cc.glass')),
    SegRow(glassOpts, String(S.prefs.glass), (v) => { setPrefs({ glass: v }); applyGlass(); }),
    h('div', { class: 'cc-label' }, t('cc.wallpaper')),
    wallRow,
  ];
  const panel = openPanel(content);
  return panel;
}
