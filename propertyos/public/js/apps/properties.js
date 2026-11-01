// Properties (landlords): buildings, flats, tenants, invites, gate staff, CSV import.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { api, load } from '../core/api.js';
import { S } from '../core/store.js';
import { t } from '../core/i18n.js';
import { refreshAll, refreshData } from '../core/data.js';
import { addMonth, curMonth, inr, monthLabel, waShare, fmtDate } from '../core/format.js';
import { parseCSV, rowsToUnits, SAMPLE_CSV } from '../core/csv.js';
import { AppFrame, Avatar, Btn, Chip, Empty, Field, Item, Select, Skeleton, StaleNote, copyText, shareText } from '../core/ui.js';
import { confirmSheet, openSheet, toast } from '../core/layers.js';
import { haptic } from '../core/fx.js';
import { downloadFile } from './common.js';

export function open(opts = {}) {
  let data = null; let stale = false; let failed = null;
  const fab = h('button', { class: 'fab press', type: 'button', 'aria-label': t('prop.add') }, icon('plus', 26));
  const frame = AppFrame({ title: t('app.properties'), from: opts.from, fab });
  const content = h('div', { class: 'stack' }, Skeleton(3));
  frame.body.append(content);
  fab.addEventListener('click', () => { haptic(); editProperty(); });

  async function reload(initial = false) {
    if (initial) content.replaceChildren(Skeleton(3));
    try { const r = await load('/properties'); data = r.data; stale = r.stale; failed = null; } catch (e) { failed = e; }
    render();
  }
  async function changed() {
    await reload();
    await refreshAll();
  }

  function render() {
    if (failed && !data) { content.replaceChildren(Empty('alert', t('common.error_title'), failed.message, Btn(t('common.retry'), { onClick: () => reload(true) }))); return; }
    const out = [stale ? StaleNote() : null];
    if (!data.properties.length) {
      out.push(Empty('building', t('prop.none'), t('prop.none_sub'), Btn(t('prop.add'), { kind: 'primary', icon: 'plus', onClick: () => editProperty() })));
    } else {
      out.push(h('div', { class: 'list' }, data.properties.map((p) => {
        const occ = p.units.filter((u) => u.tenant_name || u.tenant_linked).length;
        return Item({
          lead: h('div', { class: 'avatar' }, icon('building', 22)),
          title: p.name, sub: `${p.city ? `${p.city} · ` : ''}${t('prop.units_n', { n: p.units.length })} · ${t('w.units_occupied', { n: occ })}`,
          trail: h('div', { class: 'trail' }, p.upi_id ? Chip('UPI', 'good') : Chip(t('prop.no_upi'), 'warn'), icon('right', 18)),
          onClick: () => openProperty(p.id),
        });
      })));
    }
    content.replaceChildren(...out.filter(Boolean));
  }

  // ---------- add / edit property ----------
  function editProperty(p) {
    openSheet({
      title: p ? t('prop.edit') : t('prop.add'),
      build: (sh) => {
        const name = Field({ label: t('prop.name'), value: p ? p.name : '', maxlength: 80, autocomplete: 'off' });
        const city = Field({ label: t('prop.city'), value: p ? p.city : '', maxlength: 60, autocomplete: 'off' });
        const addr = Field({ label: t('prop.address'), value: p ? p.address : '', maxlength: 200, autocomplete: 'off' });
        const upi = Field({ label: t('prop.upi'), value: p ? p.upi_id : '', maxlength: 80, hint: t('prop.upi_hint'), autocomplete: 'off', inputmode: 'email' });
        const upiName = Field({ label: t('prop.upi_name'), value: p ? p.upi_name : S.me.user.name, maxlength: 60, autocomplete: 'off' });
        return [name.el, city.el, addr.el, upi.el, upiName.el, Btn(t('common.save'), {
          kind: 'primary', block: true,
          onClick: async () => {
            if (name.get().length < 2) return name.error(t('prop.err_name'));
            const body = { name: name.get(), city: city.get(), address: addr.get(), upi_id: upi.get(), upi_name: upiName.get() };
            try {
              if (p) await api.patch(`/properties/${p.id}`, body); else await api.post('/properties', body);
            } catch (e) { if (e.code === 'invalid_input' && /UPI/i.test(e.message)) return upi.error(e.message); throw e; }
            haptic('success'); sh.close(); toast(t('common.saved'), 'good'); await changed();
          },
        })];
      },
    });
  }

  // ---------- property detail ----------
  function openProperty(id) {
    openSheet({
      title: '',
      build: (sh) => {
        const box = h('div', { class: 'stack' }, Skeleton(4));
        const titleSet = (s) => sh.setTitle(s);
        function fill() {
          const p = data.properties.find((x) => x.id === id);
          if (!p) { sh.close(); return; }
          titleSet(p.name);
          const kids = [
            h('div', { class: 'small muted' }, [p.address, p.city].filter(Boolean).join(', ') || t('prop.no_address')),
            p.upi_id ? h('div', { class: 'card flat row-flex' }, icon('upi', 20), h('div', { class: 'grow' }, h('div', { class: 'bold' }, p.upi_name || ''), h('div', { class: 'mono small selectable' }, p.upi_id))) : h('div', { class: 'stale' }, icon('info', 16), t('prop.upi_missing')),
            h('div', { class: 'btn-row' },
              Btn(t('prop.add_unit'), { kind: 'primary', size: 'sm', icon: 'plus', onClick: () => editUnit(p, null, fill) }),
              Btn(t('common.edit'), { size: 'sm', icon: 'edit', onClick: () => editProperty(p) })),
            h('div', { class: 'sec' }, `${t('prop.units')} (${p.units.length})`),
            p.units.length ? h('div', { class: 'list' }, p.units.map((u) => Item({
              lead: Avatar(String(u.label).slice(0, 3), u.tenant_linked ? 'good' : (u.tenant_name ? 'info' : '')),
              title: u.tenant_name || t('st.vacant'), sub: `${t('join.unit', { unit: u.label })} · ${inr(u.rent)}`,
              trail: h('div', { class: 'trail' }, u.tenant_linked ? Chip(t('prop.on_app'), 'good') : (u.tenant_name ? Chip(t('prop.not_joined'), 'warn') : Chip(t('st.vacant'))), icon('right', 16)),
              onClick: () => openUnit(p, u, fill),
            }))) : h('div', { class: 'small muted' }, t('prop.no_units')),
            h('div', { class: 'btn-row' },
              Btn(t('csv.import'), { size: 'sm', icon: 'download', onClick: () => importCsv(p, async () => { await changed(); fill(); }) })),
            h('div', { class: 'sec' }, t('prop.gate_staff')),
            p.guards.length ? h('div', { class: 'list' }, p.guards.map((g) => Item({
              lead: h('div', { class: 'avatar bad' }, icon('shield', 20)), title: g.name,
              trail: Btn(t('common.remove'), { kind: 'ghost', size: 'xs', quiet: true, onClick: async () => { if (!(await confirmSheet({ title: t('prop.remove_guard_q', { name: g.name }), confirm: t('common.remove'), danger: true }))) return; await api.del(`/properties/${p.id}/guards/${g.id}`); toast(t('common.removed')); await changed(); fill(); } }),
            }))) : h('div', { class: 'small muted' }, t('prop.no_guards')),
            Btn(t('prop.invite_guard'), { size: 'sm', icon: 'shield', onClick: async () => { const r = await api.post(`/properties/${p.id}/guard-invite`); showInvite({ property: p.name, unit: '', code: r.code, link: r.link, guard: true }); } }),
            Btn(t('prop.delete'), { kind: 'danger', size: 'sm', onClick: async () => {
              if (!(await confirmSheet({ title: t('prop.delete_q', { name: p.name }), text: t('prop.delete_body'), confirm: t('prop.delete'), danger: true }))) return;
              await api.del(`/properties/${p.id}`); haptic(); sh.close(); toast(t('common.removed')); await changed();
            } }),
          ];
          box.replaceChildren(...kids.filter(Boolean));
        }
        fill();
        return box;
      },
    });
  }

  // ---------- flat edit ----------
  function editUnit(p, u, done) {
    openSheet({
      title: u ? t('prop.edit_unit') : t('prop.add_unit'),
      build: (sh) => {
        const cur = curMonth();
        const months = Array.from({ length: 36 }, (_, i) => addMonth(cur, -i));
        const label = Field({ label: t('prop.unit_label'), value: u ? u.label : '', maxlength: 30, hint: t('prop.unit_hint'), autocomplete: 'off' });
        // A rent change on a flat with a tenant starts from a month you choose; earlier months keep the old rent.
        const occupied = !!(u && (u.tenant_name || u.tenant_linked));
        const fromMonths = Array.from({ length: 15 }, (_, i) => addMonth(cur, 3 - i)).filter((m) => !u || m >= u.start_month);
        const nextM = addMonth(cur, 1);
        const rentFrom = Select({
          label: t('prop.rent_from'), value: fromMonths.includes(nextM) ? nextM : fromMonths[fromMonths.length - 1],
          options: fromMonths.map((m) => ({ v: m, label: monthLabel(m, true) })),
        });
        rentFrom.el.hidden = true;
        rentFrom.el.append(h('div', { class: 'hint' }, t('prop.rent_from_hint')));
        const rentChanged = () => occupied && Math.round(Number(rent.get()) || 0) !== u.rent;
        const rent = Field({
          label: t('prop.rent'), type: 'number', inputmode: 'numeric', value: u ? String(u.rent) : '',
          onInput: () => { rentFrom.el.hidden = !rentChanged(); },
        });
        const dep = Field({ label: t('prop.deposit'), type: 'number', inputmode: 'numeric', value: u ? String(u.deposit) : '' });
        const due = Select({ label: t('prop.due_day'), options: Array.from({ length: 31 }, (_, i) => ({ v: String(i + 1), label: t('prop.day_n', { n: i + 1 }) })), value: String(u ? u.due_day : 5) });
        const start = Select({ label: t('prop.start_month'), options: months.map((m) => ({ v: m, label: monthLabel(m, true) })), value: u && months.includes(u.start_month) ? u.start_month : cur });
        const tname = Field({ label: t('prop.tenant_name'), value: u ? u.tenant_name : '', maxlength: 60, autocomplete: 'off', hint: t('prop.tenant_hint') });
        const tphone = Field({ label: t('prop.tenant_phone'), value: u ? u.tenant_phone : '', type: 'tel', inputmode: 'tel', autocomplete: 'off' });
        return [label.el, rent.el, rentFrom.el, dep.el, h('div', { class: 'two' }, due.el, start.el), tname.el, tphone.el, Btn(t('common.save'), {
          kind: 'primary', block: true,
          onClick: async () => {
            if (!label.get()) return label.error(t('prop.err_unit'));
            const body = { label: label.get(), rent: Math.round(Number(rent.get()) || 0), deposit: Math.round(Number(dep.get()) || 0), due_day: Number(due.get()), start_month: start.get(), tenant_name: tname.get(), tenant_phone: tphone.get() };
            if (rentChanged()) body.rent_from = rentFrom.get();
            try {
              if (u) await api.patch(`/units/${u.id}`, body); else await api.post(`/properties/${p.id}/units`, body);
            } catch (e) { if (e.code === 'duplicate') return label.error(e.message); throw e; }
            haptic('success'); sh.close(); toast(t('common.saved'), 'good'); await changed(); if (done) done();
          },
        })];
      },
    });
  }

  // ---------- flat detail ----------
  function openUnit(p, u, done) {
    openSheet({
      title: t('prop.unit_title', { unit: u.label }),
      build: (sh) => {
        const kids = [
          h('div', { class: 'card flat stack tight' },
            h('div', { class: 'row-flex' }, Avatar(String(u.label).slice(0, 3), u.tenant_linked ? 'good' : ''), h('div', { class: 'grow' },
              h('div', { class: 'bold' }, u.tenant_name || t('st.vacant')), u.tenant_phone ? h('div', { class: 'small muted selectable' }, u.tenant_phone) : null)),
            h('div', { class: 'stats' },
              h('div', { class: 'stat' }, h('b', null, inr(u.rent)), h('span', null, t('w.monthly_rent'))),
              h('div', { class: 'stat' }, h('b', null, inr(u.deposit)), h('span', null, t('prop.deposit'))),
              h('div', { class: 'stat' }, h('b', null, String(u.due_day)), h('span', null, t('w.due_day'))))),
        ];
        const actions = [];
        if (!u.tenant_linked) actions.push(Btn(t('prop.invite_tenant'), { kind: 'primary', icon: 'send', onClick: async () => { const r = await api.post(`/units/${u.id}/invite`); showInvite({ property: p.name, unit: u.label, name: u.tenant_name, code: r.code, link: r.link }); } }));
        if (u.tenant_linked) actions.push(Btn(t('prop.reset_code'), { icon: 'key', onClick: async () => {
          try { const r = await api.post(`/units/${u.id}/reset-code`); showResetCode(r); } catch (e) { if (e.code === 'not_allowed') toast(e.message, 'bad'); else throw e; }
        } }));
        actions.push(Btn(t('common.edit'), { icon: 'edit', onClick: () => editUnit(p, u, () => { sh.close(); done && done(); }) }));
        if (u.tenant_name || u.tenant_linked) actions.push(Btn(t('prop.vacate'), { onClick: async () => {
          if (!(await confirmSheet({ title: t('prop.vacate_q', { unit: u.label }), text: t('prop.vacate_body'), confirm: t('prop.vacate'), danger: true }))) return;
          await api.post(`/units/${u.id}/vacate`); haptic(); sh.close(); toast(t('common.saved'), 'good'); await changed(); done && done();
        } }));
        actions.push(Btn(t('prop.delete_unit'), { kind: 'danger', onClick: async () => {
          if (!(await confirmSheet({ title: t('prop.delete_unit_q', { unit: u.label }), text: t('prop.delete_unit_body'), confirm: t('common.delete'), danger: true }))) return;
          await api.del(`/units/${u.id}`); haptic(); sh.close(); toast(t('common.removed')); await changed(); done && done();
        } }));
        kids.push(h('div', { class: 'stack tight' }, actions));
        return kids;
      },
    });
  }

  function showInvite({ property, unit, name, code, link, guard = false }) {
    const text = guard
      ? t('prop.invite_text_guard', { property, link, code })
      : t('prop.invite_text', { name: name || '', property, unit, link, code });
    openSheet({
      title: guard ? t('prop.invite_guard') : t('prop.invite_tenant'),
      build: () => [
        h('p', { class: 'muted small' }, t('prop.invite_note')),
        h('div', { class: 'card flat' }, h('div', { class: 'code-big selectable' }, code), h('div', { class: 'tiny faint center' }, t('prop.invite_valid'))),
        h('div', { class: 'btn-row' },
          Btn(t('common.share'), { kind: 'primary', icon: 'share', onClick: () => shareText(text) }),
          Btn('WhatsApp', { icon: 'chat', onClick: () => window.open(waShare(text), '_blank', 'noopener') })),
        Btn(t('common.copy'), { block: true, icon: 'copy', onClick: () => copyText(link) }),
      ],
    });
  }

  function showResetCode(r) {
    openSheet({
      title: t('prop.reset_code'),
      build: () => [
        h('p', { class: 'muted small' }, t('prop.reset_note', { email: r.email, h: r.expires_in_hours })),
        h('div', { class: 'card flat' }, h('div', { class: 'code-big selectable' }, r.code)),
        Btn(t('common.share'), { kind: 'primary', block: true, icon: 'share', onClick: () => shareText(t('prop.reset_text', { code: r.code })) }),
      ],
    });
  }

  // ---------- CSV import ----------
  function importCsv(p, done) {
    openSheet({
      title: t('csv.import'),
      build: (sh) => {
        let parsed = null;
        const file = h('input', { type: 'file', accept: '.csv,text/csv,text/plain', style: { display: 'none' } });
        const paste = Field({ textarea: true, placeholder: t('csv.paste'), rows: 4 });
        const preview = h('div', { class: 'stack tight' });
        const go = Btn(t('csv.import_n', { n: 0 }), { kind: 'primary', block: true, disabled: true, onClick: async () => {
          let ok = 0; const fails = [];
          for (const [i, u] of parsed.units.entries()) {
            go.querySelector('span').textContent = t('csv.importing', { a: i + 1, b: parsed.units.length });
            try { await api.post(`/properties/${p.id}/units`, u); ok++; } catch (e) { fails.push(`${u.label}: ${e.message}`); }
          }
          haptic('success');
          sh.close();
          toast(t('csv.done', { n: ok }), fails.length ? 'bad' : 'good');
          if (fails.length) setTimeout(() => openSheet({ title: t('csv.skipped'), build: () => [h('div', { class: 'list' }, fails.map((f) => Item({ title: f })))] }), 400);
          await done();
        } });
        function analyse(text) {
          parsed = rowsToUnits(parseCSV(text));
          const n = parsed.units.length;
          preview.replaceChildren(...[
            n ? h('div', { class: 'hint-box' }, t('csv.found', { n })) : h('div', { class: 'stale' }, icon('alert', 16), t('csv.none')),
            ...parsed.units.slice(0, 5).map((u) => h('div', { class: 'small muted' }, `${u.label} · ${inr(u.rent)}${u.tenant_name ? ` · ${u.tenant_name}` : ''}`)),
            n > 5 ? h('div', { class: 'tiny faint' }, t('csv.more', { n: n - 5 })) : null,
            parsed.errors.length ? h('div', { class: 'small', style: { color: 'var(--warn)' } }, t('csv.skipped_rows', { n: parsed.errors.length })) : null,
          ].filter(Boolean));
          go.querySelector('span').textContent = t('csv.import_n', { n });
          go.disabled = n === 0;
          if (n) go.removeAttribute('disabled');
        }
        file.addEventListener('change', async () => { const f = file.files && file.files[0]; if (f) analyse(await f.text()); });
        paste.input.addEventListener('input', () => { if (paste.raw().trim()) analyse(paste.raw()); });
        return [
          h('p', { class: 'muted small' }, t('csv.help')),
          h('div', { class: 'code-pre' }, SAMPLE_CSV.split('\n').slice(0, 3).join('\n')),
          h('div', { class: 'btn-row' },
            Btn(t('csv.choose'), { icon: 'plus', onClick: () => file.click() }),
            Btn(t('csv.sample'), { icon: 'download', onClick: () => downloadFile('propertyos-flats-sample.csv', SAMPLE_CSV) })), file,
          paste.el, preview, go,
        ];
      },
    });
  }

  reload(true).then(() => { if (opts.add && !data.properties.length) setTimeout(() => editProperty(), 300); });
  return frame;
}
