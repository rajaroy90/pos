// Repairs: tenants and landlords raise, track and close maintenance requests together.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { api, load } from '../core/api.js';
import { S } from '../core/store.js';
import { t } from '../core/i18n.js';
import { refreshData } from '../core/data.js';
import { fmtDateTime, timeAgo } from '../core/format.js';
import { AppFrame, Avatar, Btn, Chip, Chips, Empty, Field, Item, Seg, Select, Skeleton, StaleNote } from '../core/ui.js';
import { openSheet, toast, confirmSheet } from '../core/layers.js';
import { haptic } from '../core/fx.js';
import { downscalePhoto } from '../core/photo.js';

const CATS = ['plumbing', 'electrical', 'appliance', 'cleaning', 'pest', 'structure', 'other'];
const CAT_ICON = { plumbing: 'drop', electrical: 'bolt', appliance: 'plug', cleaning: 'spray', pest: 'bug', structure: 'wall', other: 'wrench' };
const ST_KIND = { open: 'warn', assigned: 'info', in_progress: 'info', resolved: 'good', closed: '' };
const URG_KIND = { low: '', normal: 'info', urgent: 'bad' };

export function open(opts = {}) {
  let data = null; let stale = false; let failed = null; let tab = 'active';

  const fab = h('button', { class: 'fab press', type: 'button', 'aria-label': t('rep.new') }, icon('plus', 26));
  const frame = AppFrame({ title: t('app.repairs'), from: opts.from, fab });
  const content = h('div', { class: 'stack' }, Skeleton(4));
  frame.body.append(content);
  fab.addEventListener('click', () => { haptic(); openNew(); });

  async function reload(initial = false) {
    if (initial) content.replaceChildren(Skeleton(4));
    try { const r = await load('/tickets'); data = r.data; stale = r.stale; failed = null; } catch (e) { failed = e; }
    render();
  }
  async function changed() { await reload(); refreshData(['tickets']); }

  function render() {
    if (failed && !data) { content.replaceChildren(Empty('alert', t('common.error_title'), failed.message, Btn(t('common.retry'), { onClick: () => reload(true) }))); return; }
    const all = data.tickets;
    const active = all.filter((x) => !['resolved', 'closed'].includes(x.status));
    const done = all.filter((x) => ['resolved', 'closed'].includes(x.status));
    const seg = Seg([{ v: 'active', label: `${t('rep.active')} (${active.length})` }, { v: 'done', label: `${t('rep.done')} (${done.length})` }], tab, (v) => { tab = v; render(); });
    const list = tab === 'active' ? active : done;
    const body = list.length
      ? h('div', { class: 'list' }, list.map(Row))
      : Empty(tab === 'active' ? 'check' : 'wrench', tab === 'active' ? t('rep.none_active') : t('rep.none_done'), tab === 'active' ? t('rep.none_active_sub') : '',
        tab === 'active' ? Btn(t('rep.new'), { kind: 'primary', icon: 'plus', onClick: openNew }) : null);
    content.replaceChildren(...[stale ? StaleNote() : null, seg.el, body].filter(Boolean));
  }

  function Row(tk) {
    const kind = tk.urgency === 'urgent' && !['resolved', 'closed'].includes(tk.status) ? 'bad' : (ST_KIND[tk.status] || '');
    return Item({
      lead: h('div', { class: `avatar ${kind}` }, icon(CAT_ICON[tk.category] || 'wrench', 22)),
      title: tk.title,
      sub: `${t('join.unit', { unit: tk.unit })} · ${t(`cat.${tk.category}`)} · ${timeAgo(tk.updated_at)}`,
      trail: h('div', { class: 'trail' }, Chip(t(`ts.${tk.status}`), ST_KIND[tk.status] || ''), tk.urgency === 'urgent' && !['resolved', 'closed'].includes(tk.status) ? Chip(t('urg.urgent'), 'bad') : null),
      onClick: () => openTicket(tk.id),
    });
  }

  // ---------- new request ----------
  async function unitChoices() {
    const out = [];
    for (const tn of S.me.tenancies || []) out.push({ v: tn.unit_id, label: `${tn.property_name} · ${tn.label}` });
    if ((S.me.roles || []).includes('landlord') && S.me.properties.length) {
      try {
        const { data: pr } = await load('/properties');
        for (const p of pr.properties) for (const u of p.units) if (!out.find((o) => o.v === u.id)) out.push({ v: u.id, label: `${p.name} · ${u.label}` });
      } catch { /* offline: skip */ }
    }
    return out;
  }

  async function openNew() {
    const units = await unitChoices();
    if (!units.length) { toast(t('rep.no_units'), 'bad'); return; }
    openSheet({
      title: t('rep.new'),
      build: (sh) => {
        const unit = Select({ label: t('rep.unit'), options: units, value: units[0].v });
        const cat = Chips(CATS.map((c) => ({ v: c, label: t(`cat.${c}`), icon: CAT_ICON[c] })), 'plumbing');
        const title = Field({ label: t('rep.title'), maxlength: 80, hint: t('rep.title_hint') });
        const desc = Field({ label: t('rep.desc'), textarea: true, maxlength: 1000 });
        const urg = Seg([{ v: 'low', label: t('urg.low') }, { v: 'normal', label: t('urg.normal') }, { v: 'urgent', label: t('urg.urgent') }], 'normal', () => {});
        let photo = '';
        const preview = h('div', { class: 'row-flex' });
        const file = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
        const pick = Btn(t('rep.add_photo'), { icon: 'camera', size: 'sm', onClick: () => file.click() });
        file.addEventListener('change', async () => {
          const f = file.files && file.files[0];
          if (!f) return;
          try {
            photo = await downscalePhoto(f);
            preview.replaceChildren(h('img', { class: 'thumb', src: photo, alt: '' }),
              Btn(t('rep.remove_photo'), { kind: 'ghost', size: 'xs', onClick: () => { photo = ''; preview.replaceChildren(); file.value = ''; } }));
          } catch { toast(t('rep.photo_fail'), 'bad'); }
        });
        return [
          unit.el, h('div', { class: 'field' }, h('label', null, t('rep.category')), cat.el), title.el, desc.el,
          h('div', { class: 'field' }, h('label', null, t('rep.urgency')), urg.el),
          h('div', { class: 'field' }, h('label', null, t('rep.photo')), h('div', { class: 'row-flex' }, pick, file), preview),
          Btn(t('rep.send'), {
            kind: 'primary', block: true,
            onClick: async () => {
              if (title.get().length < 3) return title.error(t('rep.err_title'));
              await api.post('/tickets', { unit_id: unit.get(), title: title.get(), description: desc.get(), category: cat.get(), urgency: urg.get(), photo: photo || undefined });
              haptic('success');
              sh.close();
              toast(t('rep.sent'), 'good');
              await changed();
            },
          }),
        ];
      },
    });
  }

  // ---------- ticket detail ----------
  function openTicket(id) {
    openSheet({
      title: t('rep.details'),
      build: (sh) => {
        const box = h('div', { class: 'stack' }, Skeleton(4));
        async function fill() {
          let res;
          try { res = await api.get(`/tickets/${encodeURIComponent(id)}`); } catch (e) { box.replaceChildren(h('p', { class: 'muted' }, e.message)); return; }
          const tk = res.ticket;
          const isOwner = tk.as === 'owner';
          const open = !['closed'].includes(tk.status);

          const meta = h('div', { class: 'stack tight' },
            h('h3', { style: { fontSize: '20px' } }, tk.title),
            h('div', { class: 'chips' }, Chip(t(`ts.${tk.status}`), ST_KIND[tk.status] || ''), Chip(t(`urg.${tk.urgency}`), URG_KIND[tk.urgency] || ''), Chip(t(`cat.${tk.category}`)), Chip(t('join.unit', { unit: tk.unit }))),
            h('div', { class: 'small muted' }, `${tk.property} · ${fmtDateTime(tk.created_at)}`));
          const kids = [meta];
          if (tk.photo) kids.push(h('img', { class: 'photo', src: tk.photo, alt: t('rep.photo') }));
          if (tk.description) kids.push(h('div', { class: 'card flat pre' }, tk.description));
          if (tk.vendor_name) {
            kids.push(h('div', { class: 'card flat row-flex' }, h('div', { class: 'avatar info' }, icon('wrench', 20)),
              h('div', { class: 'grow' }, h('div', { class: 'small muted' }, t('rep.vendor')), h('div', { class: 'bold' }, tk.vendor_name), tk.vendor_phone ? h('div', { class: 'small muted selectable' }, tk.vendor_phone) : null),
              tk.vendor_phone ? h('a', { class: 'round press', href: `tel:${tk.vendor_phone}`, 'aria-label': t('common.call') }, icon('phone', 20)) : null));
          }
          if (isOwner && res.tenant && res.tenant.phone) {
            kids.push(h('div', { class: 'small muted' }, `${t('role.tenant')}: ${res.tenant.name || ''} `, h('a', { class: 'link', href: `tel:${res.tenant.phone}` }, res.tenant.phone)));
          }

          // actions
          const actions = [];
          const setStatus = (status) => async () => {
            await api.post(`/tickets/${tk.id}/events`, { kind: 'status', status });
            haptic('success');
            await fill();
            changed();
          };
          if (isOwner && open) {
            actions.push(Btn(tk.vendor_name ? t('rep.change_vendor') : t('rep.assign'), { size: 'sm', icon: 'user', onClick: () => assignSheet(tk, async () => { await fill(); changed(); }) }));
            if (tk.status === 'open' || tk.status === 'assigned') actions.push(Btn(t('rep.start'), { size: 'sm', onClick: setStatus('in_progress') }));
            if (tk.status !== 'resolved') actions.push(Btn(t('rep.resolve'), { size: 'sm', kind: 'good', icon: 'check', onClick: setStatus('resolved') }));
            actions.push(Btn(t('rep.close'), { size: 'sm', kind: 'ghost', onClick: setStatus('closed') }));
          }
          if (!isOwner && tk.status === 'resolved') {
            actions.push(Btn(t('rep.confirm_fixed'), { kind: 'good', size: 'sm', icon: 'check', onClick: setStatus('closed') }));
            actions.push(Btn(t('rep.not_fixed'), { kind: 'danger', size: 'sm', onClick: setStatus('open') }));
          }
          if (isOwner && tk.status === 'closed') actions.push(Btn(t('rep.reopen'), { size: 'sm', onClick: setStatus('open') }));
          if (actions.length) kids.push(h('div', { class: 'chips' }, actions));

          // timeline
          kids.push(h('div', { class: 'sec' }, t('rep.activity')));
          kids.push(h('div', { class: 'tl' }, res.events.map((ev) => EventRow(ev))));

          // comment box
          const msg = Field({ placeholder: t('rep.write'), maxlength: 500 });
          const send = Btn('', {
            kind: 'primary', icon: 'send', size: 'sm',
            onClick: async () => {
              if (!msg.get()) return;
              await api.post(`/tickets/${tk.id}/events`, { kind: 'comment', text: msg.get() });
              msg.set('');
              await fill();
            },
          });
          kids.push(h('div', { class: 'row-flex' }, h('div', { class: 'grow' }, msg.el), send));
          box.replaceChildren(...kids.filter(Boolean));
        }
        fill();
        return box;
      },
    });
  }

  function EventRow(ev) {
    let ic = 'info'; let text = '';
    if (ev.kind === 'created') { ic = 'plus'; text = t('ev.created', { name: ev.name || '' }); }
    else if (ev.kind === 'comment') { ic = 'chat'; text = ev.name || ''; }
    else if (ev.kind === 'assign') { ic = 'user'; text = t('ev.assign', { text: ev.text }); }
    else if (ev.kind.startsWith('status:')) { ic = 'check'; text = t(`ev.status.${ev.kind.slice(7)}`); }
    return h('div', { class: 'tl-i' },
      h('div', { class: `tl-d ${ev.kind.startsWith('status:') ? 'on' : ''}` }, icon(ic, 13)),
      h('div', null, h('div', { class: 'tl-t' }, text), ev.kind === 'comment' ? h('div', { class: `bubble ${ev.mine ? 'mine' : ''}` }, ev.text) : (ev.kind.startsWith('status:') && ev.text ? h('div', { class: 'bubble' }, ev.text) : null),
        h('div', { class: 'tl-s' }, fmtDateTime(ev.at))));
  }

  function assignSheet(tk, done) {
    openSheet({
      title: t('rep.assign'),
      build: (sh) => {
        const name = Field({ label: t('rep.vendor_name'), value: tk.vendor_name || '', maxlength: 60, autocomplete: 'off' });
        const phone = Field({ label: t('rep.vendor_phone'), value: tk.vendor_phone || '', type: 'tel', inputmode: 'tel', autocomplete: 'off' });
        return [name.el, phone.el, Btn(t('common.save'), {
          kind: 'primary', block: true,
          onClick: async () => {
            if (!name.get()) return name.error(t('rep.err_vendor'));
            await api.post(`/tickets/${tk.id}/events`, { kind: 'assign', vendor_name: name.get(), vendor_phone: phone.get() });
            haptic('success'); sh.close(); await done();
          },
        })];
      },
    });
  }

  reload(true).then(() => { if (opts.ref) openTicket(opts.ref); });
  return frame;
}
