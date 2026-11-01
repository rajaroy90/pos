// Settings: profile, language, look and feel, app lock, password, your data, about.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { api, deriveKey, refreshMe } from '../core/api.js';
import { S, emit, setPrefs } from '../core/store.js';
import { t } from '../core/i18n.js';
import { initials } from '../core/format.js';
import { AppFrame, Avatar, Btn, Chip, Field, Seg, Switch, copyText } from '../core/ui.js';
import { confirmSheet, openSheet, toast } from '../core/layers.js';
import { applyGlass, applyTheme, haptic, refractionSupported } from '../core/fx.js';
import { chooseLang, privacySheet } from './auth.js';
import { checkPin, clearPin, hasPin, PinPad, setPin } from '../shell/pin.js';
import { downloadFile } from './common.js';

const WALLS = ['auto', 'sky', 'emerald', 'coral', 'dusk', 'graphite'];
export const APP_VERSION = '1.0';

/** One PIN task at a time: verify the current PIN and/or choose a new one. */
function pinFlow({ verify, choose, done }) {
  openSheet({
    title: choose ? (verify ? t('set.pin_change') : t('set.pin_set')) : t('set.pin_off'),
    build: (sh) => {
      let step = verify ? 'verify' : 'choose';
      let first = '';
      const prompt = () => (step === 'verify' ? t('set.pin_current') : step === 'choose' ? t('set.pin_new') : t('set.pin_again'));
      const pad = PinPad({
        len: 4, solid: true, resetAfter: true, sub: prompt(),
        onDone: async (pin) => {
          if (step === 'verify') {
            if (!(await checkPin(pin))) { pad.setSub(t('pin.wrong')); return false; }
            if (!choose) { clearPin(); setPrefs({ pinOn: false }); haptic('success'); sh.close(); toast(t('set.pin_is_off'), 'good'); done(); return true; }
            step = 'choose'; pad.setSub(prompt()); return true;
          }
          if (step === 'choose') { first = pin; step = 'again'; pad.setSub(prompt()); return true; }
          if (pin !== first) { step = 'choose'; first = ''; pad.setSub(t('set.pin_mismatch')); return false; }
          await setPin(pin); setPrefs({ pinOn: true });
          haptic('success'); sh.close(); toast(t('set.pin_is_on'), 'good'); done();
          return true;
        },
      });
      return [pad.el];
    },
  });
}

export function open(opts = {}) {
  const frame = AppFrame({ title: t('app.settings'), from: opts.from });
  const box = h('div', { class: 'stack' });
  frame.body.append(box);
  const demo = () => !!S.me.user.is_demo;

  const row = (title, sub, control, onClick) => {
    const el = h(onClick ? 'button' : 'div', { class: 'item set', type: onClick ? 'button' : undefined },
      h('div', { class: 'grow' }, h('div', { class: 't' }, title), sub ? h('div', { class: 's' }, sub) : null), control || h('span'));
    if (onClick) el.addEventListener('click', () => { haptic(); onClick(); });
    return el;
  };
  const stackRow = (title, control) => h('div', { class: 'item col' }, h('div', { class: 't' }, title), control);

  function render() {
    frame.setTitle(t('app.settings'));
    const u = S.me.user;
    const glassOpts = [{ v: 'auto', label: t('cc.auto') }, { v: '0', label: t('cc.solid') }, { v: '1', label: t('cc.frosted') }];
    if (refractionSupported()) glassOpts.push({ v: '2', label: t('cc.refract') });

    const wallRow = h('div', { class: 'walls' }, WALLS.map((w) => {
      const b = h('button', { type: 'button', class: `w-${w} ${S.prefs.wall === w ? 'on' : ''}`, 'aria-label': w });
      b.addEventListener('click', () => { haptic(); setPrefs({ wall: w }); wallRow.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); });
      return b;
    }));

    const kids = [];
    // profile
    kids.push(h('div', { class: 'card stack tight' },
      h('div', { class: 'row-flex' }, Avatar(initials(u.name), 'info'), h('div', { class: 'grow' },
        h('div', { class: 'bold' }, u.name), h('div', { class: 'small muted selectable' }, u.email), u.phone ? h('div', { class: 'small muted selectable' }, u.phone) : null)),
      h('div', { class: 'row-flex', style: { flexWrap: 'wrap' } }, S.me.roles.map((r) => Chip(t(`role.${r}`), 'accent'))),
      demo() ? h('div', { class: 'hint-box' }, t('set.demo_note')) : Btn(t('set.edit_profile'), { size: 'sm', icon: 'edit', onClick: editProfile })));

    // look and feel
    kids.push(h('div', { class: 'sec' }, t('set.preferences')));
    kids.push(h('div', { class: 'list' },
      stackRow(t('cc.language'), Seg([{ v: 'en', label: 'English' }, { v: 'hi', label: 'हिन्दी' }], S.prefs.lang, async (v) => { await chooseLang(v); render(); }).el),
      stackRow(t('cc.appearance'), Seg([{ v: 'auto', label: t('cc.auto') }, { v: 'light', label: t('cc.light') }, { v: 'dark', label: t('cc.dark') }], S.prefs.theme, (v) => { setPrefs({ theme: v }); applyTheme(); }).el),
      stackRow(t('cc.glass'), Seg(glassOpts, String(S.prefs.glass), (v) => { setPrefs({ glass: v }); applyGlass(); }).el),
      h('div', { class: 'item col' }, h('div', { class: 't' }, t('cc.wallpaper')), wallRow),
      row(t('cc.haptics'), t('set.haptics_sub'), Switch(!!S.prefs.haptics, (on) => { setPrefs({ haptics: on }); if (on) haptic(); })),
      row(t('cc.sound'), null, Switch(!!S.prefs.sound, (on) => setPrefs({ sound: on })))));

    // security
    kids.push(h('div', { class: 'sec' }, t('set.security')));
    const lockOn = S.prefs.pinOn && hasPin();
    const sec = [];
    sec.push(row(t('set.app_lock'), lockOn ? t('set.app_lock_on') : t('set.app_lock_sub'), Chip(lockOn ? t('common.on') : t('common.off'), lockOn ? 'good' : ''), () => pinFlow({ verify: lockOn, choose: !lockOn, done: render })));
    if (lockOn) {
      sec.push(row(t('set.pin_change'), null, icon('right', 18), () => pinFlow({ verify: true, choose: true, done: render })));
      sec.push(row(t('set.pin_off'), null, icon('right', 18), () => pinFlow({ verify: true, choose: false, done: render })));
    }
    if (!demo()) sec.push(row(t('set.change_pw'), null, icon('right', 18), changePassword));
    kids.push(h('div', { class: 'list' }, sec));

    // data
    kids.push(h('div', { class: 'sec' }, t('set.your_data')));
    const data = [row(t('privacy.title'), null, icon('right', 18), privacySheet)];
    if (!demo()) {
      data.push(row(t('set.export'), t('set.export_sub'), icon('download', 18), exportData));
      data.push(row(t('set.delete'), t('set.delete_sub'), icon('right', 18), deleteAccount));
    }
    kids.push(h('div', { class: 'list' }, data));

    // about
    kids.push(h('div', { class: 'sec' }, t('set.about')));
    const about = [];
    if (S.installEvent) about.push(Btn(t('cc.install'), { icon: 'download', block: true, onClick: async () => { const ev = S.installEvent; S.installEvent = null; try { await ev.prompt(); } catch { /* dismissed */ } render(); } }));
    about.push(h('div', { class: 'card stack tight' },
      h('div', { class: 'bold' }, `PropertyOS ${APP_VERSION}`),
      h('p', { class: 'small muted' }, t('set.about_body')),
      h('p', { class: 'small faint' }, t('privacy.legal'))));
    kids.push(...about);
    kids.push(Btn(t('set.signout'), { block: true, icon: 'logout', onClick: async () => { if (await confirmSheet({ title: t('set.signout_q'), confirm: t('set.signout') })) { emit('signout'); } } }));
    box.replaceChildren(...kids.filter(Boolean));
  }

  function editProfile() {
    openSheet({
      title: t('set.edit_profile'),
      build: (sh) => {
        const u = S.me.user;
        const name = Field({ label: t('auth.name'), value: u.name, maxlength: 60, autocomplete: 'name' });
        const phone = Field({ label: t('auth.phone'), value: u.phone || '', type: 'tel', inputmode: 'tel', autocomplete: 'tel', hint: t('auth.phone_hint') });
        return [name.el, phone.el, Btn(t('common.save'), {
          kind: 'primary', block: true,
          onClick: async () => {
            if (name.get().length < 2) return name.error(t('auth.err_name'));
            try { await api.patch('/me', { name: name.get(), phone: phone.get() }); } catch (e) { if (e.code === 'invalid_input') return phone.error(e.message); throw e; }
            await refreshMe(); haptic('success'); sh.close(); toast(t('common.saved'), 'good'); render();
          },
        })];
      },
    });
  }

  function changePassword() {
    openSheet({
      title: t('set.change_pw'),
      build: (sh) => {
        const cur = Field({ label: t('set.current_pw'), type: 'password', autocomplete: 'current-password' });
        const nw = Field({ label: t('auth.new_password'), type: 'password', autocomplete: 'new-password', hint: t('auth.pw_hint') });
        const again = Field({ label: t('set.repeat_pw'), type: 'password', autocomplete: 'new-password' });
        return [cur.el, nw.el, again.el, Btn(t('set.change_pw'), {
          kind: 'primary', block: true,
          onClick: async () => {
            const email = S.me.user.email;
            if (!cur.raw()) return cur.error(t('auth.err_pw_empty'));
            if (nw.raw().length < 8) return nw.error(t('auth.err_pw_short'));
            if (nw.raw().trim().toLowerCase() === email.toLowerCase()) return nw.error(t('auth.err_pw_same'));
            if (again.raw() !== nw.raw()) return again.error(t('set.pw_mismatch'));
            const authKey = await deriveKey(email, cur.raw());
            const newKey = await deriveKey(email, nw.raw());
            try { await api.post('/me/password', { authKey, newKey }); } catch (e) { if (e.code === 'bad_login') return cur.error(e.message); throw e; }
            haptic('success'); sh.close(); toast(t('set.pw_changed'), 'good');
          },
        })];
      },
    });
  }

  async function exportData() {
    const data = await api.get('/me/export');
    delete data.ok;
    downloadFile('propertyos-my-data.json', JSON.stringify(data, null, 2), 'application/json');
    toast(t('common.downloaded'), 'good');
  }

  function deleteAccount() {
    openSheet({
      title: t('set.delete'),
      build: (sh) => {
        const pw = Field({ label: t('auth.password'), type: 'password', autocomplete: 'current-password' });
        return [
          h('p', { class: 'muted' }, t('set.delete_body')),
          pw.el,
          Btn(t('set.delete_go'), {
            kind: 'danger', block: true,
            onClick: async () => {
              if (!pw.raw()) return pw.error(t('auth.err_pw_empty'));
              const authKey = await deriveKey(S.me.user.email, pw.raw());
              try { await api.post('/me/delete', { authKey }); } catch (e) { if (e.code === 'bad_login') return pw.error(e.message); throw e; }
              clearPin(); setPrefs({ pinOn: false });
              sh.close(); emit('signout'); toast(t('set.deleted'), 'good');
            },
          }),
        ];
      },
    });
  }

  render();
  return frame;
}
