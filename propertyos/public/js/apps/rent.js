// Rent: month board for landlords, pay-and-track for tenants.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { api, load } from '../core/api.js';
import { S, nowTs } from '../core/store.js';
import { t } from '../core/i18n.js';
import { refreshData } from '../core/data.js';
import { curMonth, addMonth, fmtDay, inr, initials, monthLabel, timeAgo, upiLink, waLink, waShare, fmtDate } from '../core/format.js';
import { AppFrame, Avatar, Btn, Chip, Chips, Empty, Field, Item, RoundBtn, Select, Skeleton, StaleNote, copyText, toastError } from '../core/ui.js';
import { confirmSheet, openSheet, toast } from '../core/layers.js';
import { haptic } from '../core/fx.js';
import { launch } from './registry.js';
import { QRBox, csvCell, downloadFile, methodIcon, methodLabel, openReceipt, statusChip } from './common.js';

const METHODS = ['upi', 'cash', 'bank', 'other'];
const TENANT_NOTIFS = ['rent_confirmed', 'rent_rejected'];

export function open(opts = {}) {
  const asTenant = opts.kind ? TENANT_NOTIFS.includes(opts.kind) : S.role === 'tenant';
  return asTenant ? openTenant(opts) : openLandlord(opts);
}

const statusKind = (s) => ({ paid: 'good', overdue: 'bad', partial: 'warn', due: 'info', vacant: '' }[s] || '');
const firstWord = (s) => String(s || '').trim().split(/\s+/)[0] || '';

function openLink(url) {
  const a = h('a', { href: url, target: '_blank', rel: 'noopener' });
  document.body.append(a);
  a.click();
  a.remove();
}

// =====================================================================================
// LANDLORD
// =====================================================================================
function openLandlord(opts) {
  let month = curMonth();
  let filter = 'all';
  let board = null;
  let stale = false;
  let failed = null;

  const exportBtn = RoundBtn('download', t('rent.export'), () => exportCsv());
  const addBtn = RoundBtn('plus', t('rent.record_title'), () => recordFlow(), true);
  const frame = AppFrame({ title: t('app.rent'), from: opts.from, actions: [exportBtn, addBtn] });
  const content = h('div', { class: 'stack' }, Skeleton(5));
  frame.body.append(content);

  async function reload(initial = false) {
    if (initial) content.replaceChildren(Skeleton(5));
    try {
      const r = await load(`/rent?month=${month}`);
      board = r.data; stale = r.stale; failed = null;
    } catch (e) { failed = e; }
    render();
  }

  function render() {
    if (failed && !board) {
      content.replaceChildren(Empty('alert', t('common.error_title'), failed.message, Btn(t('common.retry'), { onClick: () => reload(true) })));
      return;
    }
    const s = board.summary;
    const cur = curMonth();
    const nav = h('div', { class: 'month-nav' },
      h('button', { class: 'round press', type: 'button', 'aria-label': 'Previous month', onClick: () => { month = addMonth(month, -1); haptic(); reload(true); } }, icon('left', 20)),
      h('div', { class: 'mn' }, monthLabel(month, true)),
      h('button', { class: 'round press', type: 'button', 'aria-label': 'Next month', disabled: month >= cur, onClick: () => { month = addMonth(month, 1); haptic(); reload(true); } }, icon('right', 20)));

    const pct = s.expected ? Math.min(100, Math.round((s.collected / s.expected) * 100)) : 0;
    const claimsCount = board.units.reduce((a, u) => a + u.claims.length, 0);
    const summary = h('div', { class: 'card stack tight' },
      h('div', { class: 'row-flex' }, h('div', { class: 'grow' },
        h('div', { class: 'hero-num' }, h('small', null, '₹'), new Intl.NumberFormat('en-IN').format(s.collected)),
        h('div', { class: 'small muted' }, t('w.of_expected', { amt: inr(s.expected) }))), Chip(`${pct}%`, pct >= 100 ? 'good' : 'accent')),
      h('div', { class: 'progress' }, h('i', { style: { width: `${pct}%` } })),
      h('div', { class: 'stats' },
        h('div', { class: `stat ${s.overdue_count ? 'bad' : ''}` }, h('b', null, String(s.overdue_count)), h('span', null, t('w.overdue'))),
        h('div', { class: `stat ${claimsCount ? 'warn' : ''}` }, h('b', null, String(claimsCount)), h('span', null, t('w.to_confirm'))),
        h('div', { class: 'stat' }, h('b', null, inr(s.outstanding)), h('span', null, t('rent.outstanding')))));

    const out = [stale ? StaleNote() : null, nav, summary];

    if (!board.units.length) {
      out.push(Empty('building', t('rent.empty_title'), t('rent.empty_body'), Btn(t('w.add_property'), { kind: 'primary', onClick: () => launch('properties', { add: true }) })));
      content.replaceChildren(...out.filter(Boolean));
      return;
    }

    // claims inbox
    const claimRows = board.units.filter((u) => u.claims.length);
    if (claimRows.length || s.other_claims) {
      const box = h('div', { class: 'stack tight' }, h('div', { class: 'sec' }, t('rent.claims_title')));
      for (const u of claimRows) for (const c of u.claims) box.append(ClaimCard(u, c, reload));
      if (s.other_claims) box.append(h('div', { class: 'small muted', style: { padding: '0 4px' } }, t('rent.other_claims', { n: s.other_claims })));
      out.push(box);
    }

    // filters
    const fopts = [
      { v: 'all', label: t('rent.filter_all') }, { v: 'overdue', label: t('rent.filter_overdue') },
      { v: 'waiting', label: t('rent.filter_waiting') }, { v: 'paid', label: t('rent.filter_paid') },
    ];
    const chips = Chips(fopts, filter, (v) => { filter = v; renderList(); });
    const listBox = h('div');
    function renderList() {
      const rows = board.units.filter((u) => {
        if (filter === 'overdue') return u.status === 'overdue';
        if (filter === 'waiting') return u.claims.length > 0;
        if (filter === 'paid') return u.status === 'paid';
        return true;
      });
      if (!rows.length) { listBox.replaceChildren(h('div', { class: 'empty' }, h('p', null, t('rent.nothing_here')))); return; }
      const multi = new Set(board.units.map((u) => u.property_id)).size > 1;
      listBox.replaceChildren(h('div', { class: 'list' }, rows.map((u) => UnitRow(u, multi))));
    }
    renderList();
    out.push(chips.el, listBox);
    content.replaceChildren(...out.filter(Boolean));
  }

  function UnitRow(u, multi) {
    const occupied = u.status !== 'vacant';
    const kind = statusKind(u.status);
    let amountText = '';
    if (u.status === 'paid') amountText = inr(u.paid);
    else if (u.status === 'partial') amountText = `${inr(u.paid)} / ${inr(u.rent)}`;
    else if (u.status === 'overdue' || u.status === 'due') amountText = inr(Math.max(0, u.rent - u.paid));
    return Item({
      lead: Avatar(String(u.label).slice(0, 3), kind),
      title: occupied ? `${u.tenant_name || t('rent.no_tenant')}` : t('st.vacant'),
      sub: `${multi ? `${u.property_name} · ` : ''}${t('rent.unit_rent', { unit: u.label, amt: inr(u.rent) })}`,
      trail: h('div', { class: 'trail' }, statusChip(u.claims.length ? 'pending' : u.status), amountText ? h('span', { class: 'amt' }, amountText) : null),
      onClick: occupied ? () => openUnitSheet(u) : () => toast(t('rent.vacant_note')),
    });
  }

  function ClaimCard(u, c, done) {
    const card = h('div', { class: 'card flat stack tight' },
      h('div', { class: 'row-flex' }, Avatar(String(u.label).slice(0, 3), 'warn'),
        h('div', { class: 'grow' },
          h('div', { class: 'bold' }, `${u.tenant_name || u.label} · ${inr(c.amount)}`),
          h('div', { class: 'small muted' }, `${methodLabel(c.method)}${c.utr ? ` · ${t('rent.claim_utr', { utr: c.utr })}` : ''} · ${timeAgo(c.created_at)}`))),
      h('div', { class: 'btn-row' },
        Btn(t('rent.reject'), { kind: 'danger', size: 'sm', onClick: () => rejectClaim(c, done) }),
        Btn(t('rent.confirm'), { kind: 'good', size: 'sm', icon: 'check', onClick: () => confirmClaim(c, done) })));
    return card;
  }

  async function afterChange() {
    await reload();
    refreshData(['rent']);
  }

  async function confirmClaim(c, done) {
    const r = await api.post(`/payments/${c.id}/confirm`);
    haptic('success');
    toast(t('rent.confirmed_toast', { no: r.receipt_no }), 'good');
    await afterChange();
    if (done && done !== reload) done();
  }

  function rejectClaim(c) {
    openSheet({
      title: t('rent.reject_title'),
      build: (sh) => {
        const reason = Field({ label: t('rent.reject_reason'), hint: t('rent.reject_hint'), maxlength: 140 });
        return [reason.el, Btn(t('rent.reject_go'), {
          kind: 'danger', block: true,
          onClick: async () => { await api.post(`/payments/${c.id}/reject`, { reason: reason.get() }); sh.close(); toast(t('rent.rejected_toast')); await afterChange(); },
        })];
      },
    });
  }

  // ---- unit sheet ----
  function openUnitSheet(u) {
    openSheet({
      title: `${u.label} · ${u.tenant_name || ''}`,
      build: (sh) => {
        const box = h('div', { class: 'stack' }, Skeleton(4));
        const prop = (S.me.properties || []).find((p) => p.id === u.property_id) || {};
        const unitCtx = { id: u.unit_id, label: u.label, rent: u.rent, tenant_name: u.tenant_name, tenant_phone: u.tenant_phone, property_id: u.property_id, property_name: u.property_name };

        async function fill() {
          let res;
          try { res = (await load(`/units/${u.unit_id}/payments`)).data; } catch (e) { box.replaceChildren(h('p', { class: 'muted' }, e.message)); return; }
          const rows = res.ledger.rows;
          const pending = res.payments.filter((p) => p.status === 'pending');
          const outstanding = res.ledger.outstanding;
          const oldest = rows.slice().reverse().find((r) => r.balance > 0);

          const actions = h('div', { class: 'btn-row' },
            Btn(t('rent.record_title'), { kind: 'primary', size: 'sm', icon: 'plus', onClick: () => openRecordSheet(unitCtx, { period: oldest ? oldest.period : month, amount: oldest ? oldest.balance : u.rent, onDone: async () => { await afterChange(); fill(); } }) }),
            outstanding > 0 ? Btn(t('rent.remind'), { size: 'sm', icon: 'chat', onClick: () => remind(unitCtx, prop, oldest ? oldest.period : month, outstanding) }) : null,
            u.tenant_phone ? h('a', { class: 'btn sm press', href: `tel:${u.tenant_phone}`, 'aria-label': t('rent.call') }, icon('phone', 18)) : null);

          const kids = [
            h('div', { class: 'card flat' }, h('div', { class: 'small muted' }, outstanding > 0 ? t('rent.outstanding') : t('w.all_paid')),
              h('div', { class: 'hero-num', style: { fontSize: '34px' } }, outstanding > 0 ? inr(outstanding) : '✓'),
              u.tenant_phone ? h('div', { class: 'small muted selectable', style: { marginTop: '6px' } }, u.tenant_phone) : null),
            actions,
          ];
          if (pending.length) {
            kids.push(h('div', { class: 'sec' }, t('rent.claims_title')));
            for (const p of pending) kids.push(ClaimCard({ ...u, tenant_name: u.tenant_name }, { id: p.id, amount: p.amount, method: p.method, utr: p.utr, created_at: p.created_at }, () => fill()));
          }
          kids.push(h('div', { class: 'sec' }, t('rent.ledger')),
            h('div', { class: 'list' }, rows.map((r) => Item({
              lead: Avatar(monthLabel(r.period).slice(0, 3), statusKind(r.status)),
              title: monthLabel(r.period, true),
              sub: r.status === 'paid' ? t('rent.paid_amt', { amt: inr(r.paid) }) : t('rent.expected_amt', { paid: inr(r.paid), amt: inr(r.expected) }),
              trail: h('div', { class: 'trail' }, statusChip(r.pending > 0 && r.status !== 'paid' ? 'pending' : r.status)),
              onClick: r.balance > 0 ? () => openRecordSheet(unitCtx, { period: r.period, amount: r.balance, onDone: async () => { await afterChange(); fill(); } }) : null,
            }))));
          const hist = res.payments.filter((p) => p.status !== 'pending');
          kids.push(h('div', { class: 'sec' }, t('rent.history')));
          kids.push(hist.length ? h('div', { class: 'list' }, hist.map((p) => Item({
            lead: h('div', { class: 'avatar sq' }, icon(methodIcon(p.method), 20)),
            title: `${inr(p.amount)} · ${monthLabel(p.period)}`,
            sub: `${methodLabel(p.method)} · ${fmtDate(p.decided_at || p.created_at)}`,
            trail: h('div', { class: 'trail' }, statusChip(p.status)),
            onClick: p.status === 'confirmed' ? () => openReceipt(p.id) : null,
          }))) : h('div', { class: 'small muted' }, t('rent.no_history')));
          box.replaceChildren(...kids.filter(Boolean));
        }
        fill();
        return box;
      },
    });
  }

  function remind(unit, prop, period, amount) {
    const text = prop.upi_id
      ? t('rent.remind_upi', { name: firstWord(unit.tenant_name), amt: inr(amount), month: monthLabel(period), upi: prop.upi_id, upi_name: prop.upi_name || S.me.user.name, landlord: S.me.user.name })
      : t('rent.remind_plain', { name: firstWord(unit.tenant_name), amt: inr(amount), month: monthLabel(period), landlord: S.me.user.name });
    openLink(unit.tenant_phone ? waLink(unit.tenant_phone, text) : waShare(text));
  }

  // ---- record payment ----
  function recordFlow() {
    const occupied = (board ? board.units : []).filter((u) => u.status !== 'vacant' && u.status !== 'na');
    if (!occupied.length) { toast(t('rent.no_occupied'), 'bad'); return; }
    const go = (u) => openRecordSheet(
      { id: u.unit_id, label: u.label, rent: u.rent, tenant_name: u.tenant_name, tenant_phone: u.tenant_phone, property_id: u.property_id },
      { period: month, amount: Math.max(0, u.rent - u.paid) || u.rent, onDone: afterChange });
    if (occupied.length === 1) { go(occupied[0]); return; }
    openSheet({
      title: t('rent.pick_unit'),
      build: (sh) => h('div', { class: 'list' }, occupied.map((u) => Item({
        lead: Avatar(String(u.label).slice(0, 3), statusKind(u.status)), title: u.tenant_name || u.label, sub: t('rent.unit_rent', { unit: u.label, amt: inr(u.rent) }),
        trail: statusChip(u.status), onClick: () => { sh.close(); setTimeout(() => go(u), 280); },
      }))),
    });
  }

  function exportCsv() {
    if (!board || !board.units.length) { toast(t('rent.nothing_here')); return; }
    const head = ['Unit', 'Property', 'Tenant', 'Phone', 'Rent', 'Paid', 'Waiting', 'Status'];
    const lines = [head.join(',')];
    for (const u of board.units) lines.push([u.label, u.property_name, u.tenant_name, u.tenant_phone, u.rent, u.paid, u.pending, u.status].map(csvCell).join(','));
    downloadFile(`rent-${month}.csv`, lines.join('\r\n'));
    toast(t('common.downloaded'), 'good');
  }

  reload(true).then(() => { if (opts.record) setTimeout(recordFlow, 300); });
  return frame;
}

/** Landlord records money they already received (cash, UPI, bank). */
function openRecordSheet(unit, { period, amount, onDone }) {
  openSheet({
    title: t('rent.record_title'),
    build: (sh) => {
      const cur = curMonth();
      const months = Array.from({ length: 12 }, (_, i) => addMonth(cur, -i));
      const sub = h('div', { class: 'small muted center' }, `${unit.tenant_name || ''} · ${unit.label}`);
      const amt = Field({ label: t('rent.amount'), type: 'number', inputmode: 'numeric', big: true, value: amount ? String(amount) : '' });
      const month = Select({ label: t('rent.month'), options: months.map((m) => ({ v: m, label: monthLabel(m, true) })), value: months.includes(period) ? period : cur });
      const method = Chips(METHODS.map((m) => ({ v: m, label: methodLabel(m), icon: methodIcon(m) })), 'cash');
      const utr = Field({ label: t('rent.utr'), maxlength: 30, autocomplete: 'off' });
      const note = Field({ label: t('rent.note'), maxlength: 140 });
      return [sub, amt.el, month.el, h('div', { class: 'field' }, h('label', null, t('rent.method')), method.el), utr.el, note.el,
        Btn(t('rent.save_payment'), {
          kind: 'primary', block: true,
          onClick: async () => {
            const a = Math.round(Number(amt.get()));
            if (!a || a < 1) return amt.error(t('rent.err_amount'));
            const r = await api.post(`/units/${unit.id}/payments`, { amount: a, period: month.get(), method: method.get(), utr: utr.get(), note: note.get() });
            haptic('success');
            sh.close();
            toast(t('rent.saved', { no: r.receipt_no }), 'good');
            if (onDone) await onDone();
          },
        })];
    },
  });
}

// =====================================================================================
// TENANT
// =====================================================================================
function openTenant(opts) {
  let data = null; let stale = false; let failed = null;
  const frame = AppFrame({ title: t('rent.my_title'), from: opts.from });
  const content = h('div', { class: 'stack' }, Skeleton(4));
  frame.body.append(content);

  async function reload(initial = false) {
    if (initial) content.replaceChildren(Skeleton(4));
    try { const r = await load('/my/rent'); data = r.data; stale = r.stale; failed = null; } catch (e) { failed = e; }
    render();
  }
  async function afterChange() { await reload(); refreshData(['myrent']); }

  function render() {
    if (failed && !data) { content.replaceChildren(Empty('alert', t('common.error_title'), failed.message, Btn(t('common.retry'), { onClick: () => reload(true) }))); return; }
    const out = [stale ? StaleNote() : null];
    if (!data.tenancies.length) {
      out.push(Empty('key', t('rent.joined_none'), t('w.join_sub'), Btn(t('rent.join_cta'), { kind: 'primary', onClick: () => launch('join') })));
    }
    for (const ten of data.tenancies) out.push(TenancyView(ten));
    content.replaceChildren(...out.filter(Boolean));
  }

  function TenancyView(ten) {
    const { unit, property, ledger, payments } = ten;
    const pending = payments.filter((p) => p.status === 'pending');
    const pendingSum = pending.reduce((a, p) => a + p.amount, 0);
    const owe = ledger.outstanding;
    const row0 = ledger.rows[0];
    let line = '';
    if (owe > 0) line = ledger.oldest && ledger.oldest.status === 'overdue' ? t('w.overdue_since', { m: monthLabel(ledger.oldest.period) }) : t('w.due_on', { d: row0 ? fmtDay(row0.due_ts) : '' });
    else line = t('w.next_due_simple');

    const head = h('div', { class: 'card stack tight' },
      h('div', { class: 'row-flex' }, Avatar(String(unit.label).slice(0, 3), owe > 0 ? 'info' : 'good'),
        h('div', { class: 'grow' }, h('div', { class: 'bold' }, property.name), h('div', { class: 'small muted' }, `${t('join.unit', { unit: unit.label })} · ${t('rent.landlord_is', { name: property.landlord })}`))),
      h('div', { class: 'hero-num' }, owe > 0 ? [h('small', null, '₹'), new Intl.NumberFormat('en-IN').format(owe)] : t('w.all_paid')),
      h('div', { class: 'small muted' }, line),
      pending.length ? h('div', { class: 'stale', style: { background: 'var(--info-bg)', color: 'var(--info)' } }, icon('clock', 16), t('rent.pending_note', { amt: inr(pendingSum) })) : null,
      Btn(owe > 0 ? t('rent.pay_now', { amt: inr(owe) }) : t('rent.pay_more'), {
        kind: owe > 0 ? 'primary' : '', block: true, icon: 'upi',
        onClick: () => openPaySheet(ten, { period: ledger.oldest ? ledger.oldest.period : (row0 ? row0.period : curMonth()), amount: ledger.oldest ? ledger.oldest.balance : unit.rent }),
      }));

    const rows = h('div', { class: 'list' }, ledger.rows.map((r) => Item({
      lead: Avatar(monthLabel(r.period).slice(0, 3), statusKind(r.status)),
      title: monthLabel(r.period, true),
      sub: r.status === 'paid' ? t('rent.paid_amt', { amt: inr(r.paid) }) : t('rent.expected_amt', { paid: inr(r.paid), amt: inr(r.expected) }),
      trail: h('div', { class: 'trail' }, statusChip(r.pending > 0 && r.status !== 'paid' ? 'pending' : r.status)),
      onClick: r.balance > 0 ? () => openPaySheet(ten, { period: r.period, amount: r.balance }) : null,
    })));

    const hist = payments.length ? h('div', { class: 'list' }, payments.map((p) => PaymentRow(p))) : h('div', { class: 'small muted' }, t('rent.no_history'));
    return h('div', { class: 'stack' }, head, h('div', { class: 'sec' }, t('rent.ledger')), rows, h('div', { class: 'sec' }, t('rent.history')), hist);
  }

  function PaymentRow(p) {
    let sub = `${methodLabel(p.method)} · ${timeAgo(p.created_at)}`;
    if (p.status === 'rejected') sub = p.reject_reason ? t('rent.rejected_reason', { reason: p.reject_reason }) : t('rent.rejected_plain');
    const trail = h('div', { class: 'trail' }, statusChip(p.status));
    if (p.status === 'pending') {
      trail.append(Btn(t('rent.withdraw'), {
        kind: 'ghost', size: 'xs', quiet: true,
        onClick: async (ev) => {
          ev.stopPropagation();
          if (!(await confirmSheet({ title: t('rent.withdraw_q'), text: t('rent.withdraw_body'), confirm: t('rent.withdraw'), danger: true }))) return;
          await api.post(`/payments/${p.id}/cancel`);
          toast(t('rent.withdrawn'));
          await afterChange();
        },
      }));
    }
    return Item({
      lead: h('div', { class: 'avatar sq' }, icon(methodIcon(p.method), 20)),
      title: `${inr(p.amount)} · ${monthLabel(p.period)}`, sub, trail,
      onClick: p.status === 'confirmed' ? () => openReceipt(p.id) : null,
    });
  }

  function openPaySheet(ten, { period, amount }) {
    const { unit, property } = ten;
    openSheet({
      title: t('rent.pay_title'),
      build: (sh) => {
        const months = ten.ledger.rows.map((r) => r.period);
        let touched = false;
        let method = 'upi';
        const amt = Field({ label: t('rent.amount'), type: 'number', inputmode: 'numeric', big: true, value: amount ? String(amount) : '', onInput: () => { touched = true; refresh(); } });
        const month = Select({
          label: t('rent.month'), options: months.map((m) => ({ v: m, label: monthLabel(m, true) })), value: months.includes(period) ? period : months[0],
          onChange: (m) => { const r = ten.ledger.rows.find((x) => x.period === m); if (r && !touched) { amt.set(String(r.balance || unit.rent)); } refresh(); },
        });
        const methods = Chips(['upi', 'cash', 'bank'].map((m) => ({ v: m, label: methodLabel(m), icon: methodIcon(m) })), method, (v) => { method = v; refresh(); });
        const utr = Field({ label: t('rent.utr'), maxlength: 30, autocomplete: 'off' });
        const panel = h('div', { class: 'stack' });
        const submit = Btn('', {
          kind: 'primary', block: true,
          onClick: async () => {
            const a = Math.round(Number(amt.get()));
            if (!a || a < 1) return amt.error(t('rent.err_amount'));
            await api.post(`/units/${unit.id}/payments`, { amount: a, period: month.get(), method, utr: utr.get() });
            haptic('success');
            sh.close();
            toast(t('rent.sent'), 'good');
            await afterChange();
          },
        });

        function refresh() {
          const a = Math.round(Number(amt.get())) || 0;
          const label = method === 'cash' ? t('rent.paid_cash') : t('rent.paid_btn', { amt: inr(a) });
          submit.querySelector('span').textContent = label;
          const kids = [];
          if (method === 'upi') {
            if (property.upi_id) {
              const link = upiLink({ pa: property.upi_id, pn: property.upi_name || property.landlord, am: a || undefined, tn: `Rent ${unit.label} ${monthLabel(month.get())}` });
              kids.push(
                h('div', { class: 'card flat stack tight' },
                  h('div', { class: 'small muted' }, t('rent.paying_to')),
                  h('div', { class: 'bold' }, property.upi_name || property.landlord),
                  h('div', { class: 'mono small selectable' }, property.upi_id)),
                h('div', { class: 'btn-row' },
                  Btn(t('rent.open_upi'), { kind: 'primary', icon: 'upi', onClick: () => openLink(link) }),
                  Btn(t('rent.copy_upi'), { icon: 'copy', onClick: () => copyText(property.upi_id) })),
                a ? h('div', { class: 'stack tight' }, QRBox(link, t('rent.scan_upi')), h('div', { class: 'tiny faint center' }, t('rent.scan_upi'))) : null,
                h('div', { class: 'small muted center' }, t('rent.upi_after')));
            } else kids.push(h('div', { class: 'stale' }, icon('info', 16), t('rent.no_upi')));
            kids.push(utr.el);
          } else if (method === 'cash') {
            kids.push(h('div', { class: 'card flat small muted' }, t('rent.cash_note')));
          } else {
            kids.push(h('div', { class: 'card flat small muted' }, t('rent.bank_note')), utr.el);
          }
          panel.replaceChildren(...kids.filter(Boolean));
        }
        refresh();
        return [h('div', { class: 'small muted center' }, `${property.name} · ${unit.label}`), amt.el, month.el,
          h('div', { class: 'field' }, h('label', null, t('rent.method_pay')), methods.el), panel, submit];
      },
    });
  }

  reload(true);
  return frame;
}
