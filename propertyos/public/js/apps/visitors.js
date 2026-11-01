// Visitors (residents): create QR passes, share them, answer walk-in requests from the gate.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { api, load } from '../core/api.js';
import { S, nowTs } from '../core/store.js';
import { t } from '../core/i18n.js';
import { refreshData } from '../core/data.js';
import { fmtDateTime, fmtTime, remaining, timeAgo, waShare } from '../core/format.js';
import { AppFrame, Avatar, Btn, Chip, Chips, Empty, Field, Item, Select, Skeleton, StaleNote, copyText, shareText } from '../core/ui.js';
import { confirmSheet, openSheet, toast } from '../core/layers.js';
import { haptic } from '../core/fx.js';
import { QRBox } from './common.js';
import { sharePass } from './passimg.js';

const PURPOSES = ['delivery', 'guest', 'family', 'cab', 'service', 'other'];
const PURPOSE_ICON = { delivery: 'receipt', guest: 'user', family: 'home', cab: 'door', service: 'wrench', other: 'dots' };
const DURATIONS = [{ v: 2, k: 'h2' }, { v: 6, k: 'h6' }, { v: 12, k: 'h12' }, { v: 24, k: 'h24' }, { v: 72, k: 'h72' }];

export function open(opts = {}) {
  let data = null; let stale = false; let failed = null;
  const fab = h('button', { class: 'fab press', type: 'button', 'aria-label': t('vis.new') }, icon('plus', 26));
  const frame = AppFrame({ title: t('app.visitors'), from: opts.from, fab });
  const content = h('div', { class: 'stack' }, Skeleton(3));
  frame.body.append(content);
  fab.addEventListener('click', () => { haptic(); openNew(); });

  async function reload(initial = false) {
    if (initial) content.replaceChildren(Skeleton(3));
    try { const r = await load('/visitors'); data = r.data; stale = r.stale; failed = null; } catch (e) { failed = e; }
    render();
  }
  async function changed() { await reload(); refreshData(['visitors']); }
  const timer = setInterval(() => { if (!content.isConnected) { clearInterval(timer); return; } if (!document.hidden) reload(); }, 15000);

  function render() {
    if (failed && !data) { content.replaceChildren(Empty('alert', t('common.error_title'), failed.message, Btn(t('common.retry'), { onClick: () => reload(true) }))); return; }
    const now = nowTs();
    const list = data.visitors;
    const asking = list.filter((v) => v.status === 'requested' && v.valid_to > now);
    const live = list.filter((v) => v.status === 'active' && v.valid_to > now);
    const past = list.filter((v) => !asking.includes(v) && !live.includes(v));
    const out = [stale ? StaleNote() : null];

    if (asking.length) {
      out.push(h('div', { class: 'sec' }, t('vis.at_gate')));
      for (const v of asking) out.push(RequestCard(v));
    }
    out.push(h('div', { class: 'sec' }, t('vis.active')));
    out.push(live.length ? h('div', { class: 'list' }, live.map((v) => PassRow(v)))
      : Empty('qr', t('vis.none'), t('vis.none_sub'), Btn(t('vis.new'), { kind: 'primary', icon: 'plus', onClick: openNew })));
    if (past.length) {
      out.push(h('div', { class: 'sec' }, t('vis.history')));
      out.push(h('div', { class: 'list' }, past.slice(0, 20).map((v) => PassRow(v, true))));
    }
    content.replaceChildren(...out.filter(Boolean));
  }

  function RequestCard(v) {
    return h('div', { class: 'card stack tight', style: { boxShadow: 'inset 0 0 0 2px var(--warn), var(--shadow)' } },
      h('div', { class: 'row-flex' }, h('div', { class: 'avatar warn' }, icon('door', 22)),
        h('div', { class: 'grow' }, h('div', { class: 'bold' }, t('vis.is_at_gate', { name: v.name })), h('div', { class: 'small muted' }, `${v.purpose ? `${v.purpose} · ` : ''}${t('join.unit', { unit: v.unit })} · ${timeAgo(v.created_at)}`))),
      h('div', { class: 'btn-row' },
        Btn(t('vis.deny'), { kind: 'danger', onClick: async () => { await api.post(`/visitors/${v.id}/respond`, { approve: false }); haptic(); toast(t('vis.denied')); await changed(); } }),
        Btn(t('vis.allow'), { kind: 'good', icon: 'check', onClick: async () => { await api.post(`/visitors/${v.id}/respond`, { approve: true }); haptic('success'); toast(t('vis.allowed'), 'good'); await changed(); } })));
  }

  function PassRow(v, past = false) {
    const live = !past;
    const statusKind = { used: 'good', expired: '', cancelled: '', denied: 'bad' }[v.status];
    return Item({
      lead: h('div', { class: `avatar ${live ? 'info' : ''}` }, icon(v.by_guard ? 'door' : 'qr', 22)),
      title: v.name,
      sub: live ? `${v.purpose ? `${v.purpose} · ` : ''}${t('vis.uses', { u: v.uses, m: v.max_uses })} · ${remaining(v.valid_to)}` : `${v.purpose ? `${v.purpose} · ` : ''}${fmtDateTime(v.created_at)}`,
      trail: live ? h('div', { class: 'trail' }, h('span', { class: 'mono small' }, v.code)) : h('div', { class: 'trail' }, Chip(t(`vis.st.${v.status}`), statusKind || '')),
      onClick: live ? () => openPass(v) : null,
    });
  }

  // ---------- create ----------
  async function unitChoices() {
    const out = [];
    for (const tn of S.me.tenancies || []) out.push({ v: tn.unit_id, label: `${tn.property_name} · ${tn.label}` });
    if ((S.me.roles || []).includes('landlord') && S.me.properties.length) {
      try {
        const { data: pr } = await load('/properties');
        for (const p of pr.properties) for (const u of p.units) if (!out.find((o) => o.v === u.id)) out.push({ v: u.id, label: `${p.name} · ${u.label}` });
      } catch { /* offline */ }
    }
    return out;
  }

  async function openNew() {
    const units = await unitChoices();
    if (!units.length) { toast(t('rep.no_units'), 'bad'); return; }
    openSheet({
      title: t('vis.new'),
      build: (sh) => {
        const unit = Select({ label: t('rep.unit'), options: units, value: units[0].v });
        const name = Field({ label: t('vis.name'), maxlength: 60, autocomplete: 'off' });
        const purpose = Chips(PURPOSES.map((p) => ({ v: p, label: t(`vp.${p}`), icon: PURPOSE_ICON[p] })), 'guest');
        const dur = Chips(DURATIONS.map((d) => ({ v: d.v, label: t(`vd.${d.k}`) })), 12);
        const uses = Chips([1, 2, 5].map((n) => ({ v: n, label: t('vis.entries', { n }) })), 1);
        return [
          unit.el, name.el,
          h('div', { class: 'field' }, h('label', null, t('vis.purpose')), purpose.el),
          h('div', { class: 'field' }, h('label', null, t('vis.valid_for')), dur.el),
          h('div', { class: 'field' }, h('label', null, t('vis.how_many')), uses.el),
          Btn(t('vis.create'), {
            kind: 'primary', block: true,
            onClick: async () => {
              if (!name.get()) return name.error(t('vis.err_name'));
              const res = await api.post('/visitors', { unit_id: unit.get(), name: name.get(), purpose: t(`vp.${purpose.get()}`), hours: dur.get(), max_uses: uses.get() });
              haptic('success');
              sh.close();
              await changed();
              setTimeout(() => openPass(res.visitor), 300);
            },
          }),
        ];
      },
    });
  }

  // ---------- pass ----------
  function openPass(v) {
    openSheet({
      title: t('vis.pass'),
      build: (sh) => {
        const until = h('div', { class: 'timer' }, remaining(v.valid_to));
        const tick = setInterval(() => { if (!until.isConnected) { clearInterval(tick); return; } until.textContent = remaining(v.valid_to); }, 20000);
        const place = v.property ? `${v.property}, ${t('join.unit', { unit: v.unit })}` : t('join.unit', { unit: v.unit });
        const untilText = t('vis.valid_until', { time: fmtDateTime(v.valid_to) });
        const text = t('vis.share_text', { place, code: v.code, until: fmtDateTime(v.valid_to) });
        return [
          h('div', { class: 'pass' },
            h('div', { class: 'who' }, h('h3', null, v.name), h('div', { class: 'small muted' }, `${v.purpose ? `${v.purpose} · ` : ''}${place}`)),
            QRBox(v.token, t('vis.pass')),
            h('div', null, h('div', { class: 'code-big selectable' }, `${v.code.slice(0, 3)} ${v.code.slice(3)}`), h('div', { class: 'tiny faint center' }, t('vis.code_note'))),
            h('div', { class: 'row-flex', style: { justifyContent: 'center' } }, Chip(t('vis.uses', { u: v.uses, m: v.max_uses }), 'accent'), h('span', { class: 'small' }, until))),
          h('div', { class: 'btn-row' },
            Btn(t('common.share'), {
              kind: 'primary', icon: 'share',
              onClick: async () => {
                const ok = await sharePass({ name: v.name, purpose: v.purpose, place, code: v.code, token: v.token, until: untilText }, text);
                if (!ok) window.open(waShare(text), '_blank', 'noopener');
              },
            }),
            Btn('WhatsApp', { icon: 'chat', onClick: () => { window.open(waShare(text), '_blank', 'noopener'); } })),
          Btn(t('vis.cancel_pass'), {
            kind: 'danger', block: true,
            onClick: async () => {
              if (!(await confirmSheet({ title: t('vis.cancel_q'), text: t('vis.cancel_body'), confirm: t('vis.cancel_pass'), danger: true }))) return;
              await api.post(`/visitors/${v.id}/cancel`);
              haptic(); sh.close(); toast(t('vis.cancelled')); await changed();
            },
          }),
        ];
      },
    });
  }

  reload(true);
  return frame;
}
