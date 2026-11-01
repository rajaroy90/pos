// Gate (security guard, or owner): scan passes, enter codes, ask residents about walk-ins.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { api, load } from '../core/api.js';
import { S, nowTs, setPrefs } from '../core/store.js';
import { t } from '../core/i18n.js';
import { gateProperties, gateProperty, refreshData } from '../core/data.js';
import { fmtTime, remaining, timeAgo } from '../core/format.js';
import { AppFrame, Btn, Chip, Chips, Empty, Field, Item, Select, Skeleton, StaleNote } from '../core/ui.js';
import { openSheet, toast } from '../core/layers.js';
import { haptic, sound } from '../core/fx.js';
import { PinPad } from '../shell/pin.js';

const RES_KIND = { allowed: 'good', used: 'warn', expired: 'bad', not_yet: 'warn', cancelled: 'bad', denied: 'bad', waiting: 'warn', wrong_property: 'bad', not_found: 'bad' };
const RES_ICON = { allowed: 'check', used: 'alert', expired: 'clock', not_yet: 'clock', cancelled: 'x', denied: 'x', waiting: 'clock', wrong_property: 'alert', not_found: 'x' };
const WALK_PURPOSES = ['delivery', 'guest', 'cab', 'service', 'other'];

export function open(opts = {}) {
  let ov = null; let stale = false; let failed = null;
  let pid = gateProperty();
  const frame = AppFrame({ title: t('app.gate'), from: opts.from, onClose: () => clearInterval(timer) });
  const content = h('div', { class: 'stack' }, Skeleton(4));
  frame.body.append(content);

  async function reload(initial = false) {
    pid = gateProperty();
    if (!pid) { render(); return; }
    if (initial) content.replaceChildren(Skeleton(4));
    try { const r = await load(`/guard/overview?property_id=${encodeURIComponent(pid)}`); ov = r.data; stale = r.stale; failed = null; } catch (e) { failed = e; }
    render();
  }
  const timer = setInterval(() => { if (!document.hidden && content.isConnected) reload(); }, 5000);

  function render() {
    const props = gateProperties();
    if (!props.length) { content.replaceChildren(Empty('shield', t('w.no_gate'), t('w.no_gate_sub'))); return; }
    if (failed && !ov) { content.replaceChildren(Empty('alert', t('common.error_title'), failed.message, Btn(t('common.retry'), { onClick: () => reload(true) }))); return; }
    frame.setTitle(t('app.gate'), ov.property.name);
    const out = [stale ? StaleNote() : null];
    if (props.length > 1) {
      const sel = Select({ label: t('gate.building'), options: props.map((p) => ({ v: p.id, label: p.name })), value: pid, onChange: (v) => { setPrefs({ gateProp: v }); ov = null; reload(true); refreshData(['guard']); } });
      out.push(sel.el);
    }
    out.push(h('div', { class: 'btn-row' },
      Btn(t('gate.scan'), { kind: 'primary', icon: 'scan', onClick: openScanner }),
      Btn(t('gate.enter_code'), { icon: 'key', onClick: openCode })));
    out.push(Btn(t('gate.walkin'), { block: true, icon: 'door', onClick: openWalkin }));

    const walk = ov.walkins;
    if (walk.length) {
      out.push(h('div', { class: 'sec' }, t('gate.walkins')));
      out.push(h('div', { class: 'list' }, walk.map(WalkRow)));
    }
    out.push(h('div', { class: 'sec' }, `${t('gate.expected')} (${ov.expected.length})`));
    out.push(ov.expected.length ? h('div', { class: 'list' }, ov.expected.map((v) => Item({
      lead: h('div', { class: 'avatar info' }, icon('user', 22)), title: v.name,
      sub: `${t('join.unit', { unit: v.unit })}${v.purpose ? ` · ${v.purpose}` : ''}`,
      trail: h('div', { class: 'trail' }, h('span', { class: 'small' }, remaining(v.valid_to)), h('span', { class: 'tiny faint' }, t('vis.uses', { u: v.uses, m: v.max_uses }))),
    }))) : h('div', { class: 'small muted' }, t('gate.none_expected')));

    out.push(h('div', { class: 'sec' }, t('gate.recent')));
    out.push(ov.recent.length ? h('div', { class: 'list' }, ov.recent.map((r) => Item({
      lead: h('div', { class: `avatar ${RES_KIND[r.result] || ''}` }, icon(RES_ICON[r.result] || 'info', 20)),
      title: r.name || t('gate.unknown'), sub: `${r.unit ? `${t('join.unit', { unit: r.unit })} · ` : ''}${timeAgo(r.at)}`,
      trail: h('div', { class: 'trail' }, Chip(t(`gate.res.${r.result}.t`), RES_KIND[r.result] || '')),
    }))) : h('div', { class: 'small muted' }, t('gate.no_recent')));
    content.replaceChildren(...out.filter(Boolean));
  }

  function WalkRow(w) {
    let chip; let action = null;
    if (w.status === 'requested') chip = Chip(t('gate.asking'), 'warn');
    else if (w.status === 'active') { chip = Chip(t('vis.allowed'), 'good'); action = Btn(t('gate.admit'), { kind: 'good', size: 'xs', onClick: async () => { const r = await api.post('/guard/admit', { id: w.id }); haptic('success'); showResult({ result: r.result, visitor: { name: w.name, unit: w.unit, uses: 1, max_uses: 1 } }); await reload(); refreshData(['guard']); } }); }
    else chip = Chip(t('vis.denied'), 'bad');
    return Item({
      lead: h('div', { class: `avatar ${w.status === 'active' ? 'good' : w.status === 'denied' ? 'bad' : 'warn'}` }, icon('door', 22)),
      title: w.name, sub: `${t('join.unit', { unit: w.unit })}${w.purpose ? ` · ${w.purpose}` : ''}`,
      trail: h('div', { class: 'trail' }, chip, action),
    });
  }

  // ---------- result ----------
  function showResult(res, onClose) {
    const kind = RES_KIND[res.result] || 'bad';
    haptic(res.result === 'allowed' ? 'success' : 'error'); sound(res.result === 'allowed' ? 'success' : 'error');
    openSheet({
      title: '', onClose,
      build: (sh) => {
        const v = res.visitor;
        const detail = v ? [
          h('div', { class: 'bold', style: { fontSize: '20px' } }, v.name),
          h('div', { class: 'muted' }, `${t('join.unit', { unit: v.unit })}${v.purpose ? ` · ${v.purpose}` : ''}`),
          res.result === 'allowed' ? h('div', { class: 'chip good', style: { justifySelf: 'center' } }, t('gate.entry_n', { u: v.uses, m: v.max_uses })) : null,
        ] : [];
        return [
          h('div', { class: `result ${kind}` },
            h('div', { class: `big-check ${kind}` }, icon(RES_ICON[res.result] || 'x', 44)),
            h('h2', null, t(`gate.res.${res.result}.t`)),
            h('div', { class: 'small muted' }, t(`gate.res.${res.result}.s`)), ...detail),
          Btn(t('common.done'), { kind: 'primary', block: true, onClick: () => sh.close() }),
        ];
      },
    });
  }

  async function verify(body, onClose) {
    const res = await api.post('/guard/verify', { property_id: pid, ...body });
    showResult(res, onClose);
    reload(); refreshData(['guard']);
    return res;
  }

  // ---------- code entry ----------
  function openCode() {
    openSheet({
      title: t('gate.enter_code'),
      build: (sh) => {
        const pad = PinPad({
          len: 6, solid: true, resetAfter: true, sub: t('gate.code_hint'),
          onDone: async (code) => {
            try { const r = await verify({ code }); return r.result === 'allowed'; } catch (e) { toast(e.message, 'bad'); return false; }
          },
        });
        pad.el.querySelector('.lock-sub').style.color = 'var(--ink-2)';
        pad.el.querySelectorAll('.dots i').forEach((d) => { d.style.boxShadow = 'inset 0 0 0 2px var(--ink-3)'; });
        const style = pad.el.querySelector('.dots'); style.style.margin = '12px 0 4px';
        return [pad.el];
      },
    });
  }

  // ---------- scanner ----------
  function openScanner() {
    let stopper = () => {};
    openSheet({
      title: t('gate.scan'),
      onClose: () => stopper(),
      build: (sh) => {
        let stream = null; let stopped = false; let busy = false; let detector = null;
        const supported = 'BarcodeDetector' in window;
        const video = h('video', { playsinline: '', muted: '', autoplay: '' });
        video.muted = true;
        const note = h('div', { class: 'small muted center' }, supported ? t('gate.scan_hint') : t('gate.no_scanner'));
        const box = h('div', { class: 'scan' }, video, h('div', { class: 'frame' }), h('div', { class: 'line' }));
        stopper = () => { stopped = true; if (stream) stream.getTracks().forEach((tr) => tr.stop()); };

        async function loop() {
          if (stopped) return;
          if (!busy && video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              if (codes.length && !stopped) {
                busy = true;
                try { await verify({ token: codes[0].rawValue }, () => { busy = false; }); } catch (e) { toast(e.message, 'bad'); busy = false; }
              }
            } catch { /* frame not ready */ }
          }
          setTimeout(loop, 160);
        }

        (async () => {
          if (!supported) { box.replaceChildren(h('div', { style: { color: '#fff', padding: '24px', textAlign: 'center' } }, icon('alert', 36))); return; }
          try {
            detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
            if (stopped) { stream.getTracks().forEach((tr) => tr.stop()); return; }
            video.srcObject = stream;
            await video.play();
            loop();
          } catch (e) {
            note.textContent = e && e.name === 'NotAllowedError' ? t('gate.cam_denied') : t('gate.cam_fail');
            box.replaceChildren(h('div', { style: { color: '#fff', padding: '24px', textAlign: 'center' } }, icon('camera', 36)));
          }
        })();
        return [box, note, Btn(t('gate.enter_code'), { icon: 'key', block: true, onClick: () => { sh.close(); setTimeout(openCode, 300); } })];
      },
    });
  }

  // ---------- walk-in ----------
  function openWalkin() {
    if (!ov) return;
    const units = ov.units.filter((u) => u.occupied);
    if (!units.length) { toast(t('gate.no_residents'), 'bad'); return; }
    openSheet({
      title: t('gate.walkin'),
      build: (sh) => {
        const unit = Select({ label: t('gate.visiting'), options: units.map((u) => ({ v: u.id, label: t('join.unit', { unit: u.label }) })), value: units[0].id });
        const name = Field({ label: t('vis.name'), maxlength: 60, autocomplete: 'off' });
        const purpose = Chips(WALK_PURPOSES.map((p) => ({ v: p, label: t(`vp.${p}`) })), 'guest');
        return [
          h('p', { class: 'small muted' }, t('gate.walkin_note')), unit.el, name.el,
          h('div', { class: 'field' }, h('label', null, t('vis.purpose')), purpose.el),
          Btn(t('gate.ask'), {
            kind: 'primary', block: true, icon: 'send',
            onClick: async () => {
              if (!name.get()) return name.error(t('vis.err_name'));
              await api.post('/guard/walkin', { property_id: pid, unit_id: unit.get(), name: name.get(), purpose: t(`vp.${purpose.get()}`) });
              haptic('success'); sh.close(); toast(t('gate.asked'), 'good'); await reload();
            },
          }),
        ];
      },
    });
  }

  reload(true);
  return frame;
}
