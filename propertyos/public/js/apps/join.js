// Join (tenants, gate staff): enter or open an invite code, see where it leads, confirm.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { S, setRole } from '../core/store.js';
import { t } from '../core/i18n.js';
import { refreshMe } from '../core/api.js';
import { refreshAll } from '../core/data.js';
import { AppFrame, Btn, Field } from '../core/ui.js';
import { toast } from '../core/layers.js';
import { haptic } from '../core/fx.js';
import { setJoinCode } from './auth.js';

export function open(opts = {}) {
  let joined = false;
  const frame = AppFrame({ title: t('join.title'), from: opts.from, onClose: () => { if (!joined) setJoinCode(''); } });
  const box = h('div', { class: 'stack' });
  frame.body.append(box);

  const field = Field({ label: t('join.code'), value: (opts.code || '').toUpperCase(), big: true, upper: true, maxlength: 12, autocomplete: 'off', autocapitalize: 'characters' });
  field.input.setAttribute('autocapitalize', 'characters');
  field.input.setAttribute('spellcheck', 'false');

  function entry() {
    box.replaceChildren(
      h('div', { class: 'center', style: { padding: '8px 0 0' } }, h('div', { class: 'hero-ico' }, icon('key', 34))),
      h('p', { class: 'muted center' }, t('join.body')),
      field.el,
      Btn(t('join.check'), { kind: 'primary', block: true, onClick: () => check(field.get()) }));
    field.input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); check(field.get()); } };
  }

  async function check(raw) {
    const code = raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
    if (code.length < 6) { field.error(t('join.err_code')); return; }
    let p;
    try { p = await api.get(`/invite/peek?code=${encodeURIComponent(code)}`); } catch (e) { entry(); field.error(e.message); return; }
    haptic('success');
    const isGuard = p.kind === 'guard';
    box.replaceChildren(
      h('div', { class: 'card stack center' },
        h('div', { class: `avatar big ${isGuard ? 'bad' : 'good'}`, style: { margin: '0 auto' } }, icon(isGuard ? 'shield' : 'home', 30)),
        h('h2', null, p.property),
        h('div', { class: 'muted' }, isGuard ? t('join.guard') : t('join.unit', { unit: p.unit })),
        h('p', { class: 'small muted' }, isGuard ? t('join.for_guard') : t('join.for_tenant'))),
      Btn(isGuard ? t('join.confirm_guard', { property: p.property }) : t('join.confirm_unit', { property: p.property, unit: p.unit }), {
        kind: 'primary', block: true,
        onClick: async () => {
          let r;
          try { r = await api.post('/join', { code }); } catch (e) { if (e.code === 'invite_own') { toast(e.message, 'bad'); return; } throw e; }
          joined = true; setJoinCode('');
          await refreshMe();
          setRole(r.kind === 'guard' ? 'guard' : 'tenant');
          await refreshAll();
          haptic('success'); toast(t('join.done'), 'good');
          frame.close();
        },
      }),
      Btn(t('join.other'), { kind: 'ghost', block: true, quiet: true, onClick: () => { field.set(''); entry(); } }));
  }

  if (opts.code) check(opts.code); else entry();
  return frame;
}
