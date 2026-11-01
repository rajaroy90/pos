// Sign-in, sign-up, password reset, invites and demo start.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { api, clearCache, deriveKey, refreshMe } from '../core/api.js';
import { S, emit, setPrefs } from '../core/store.js';
import { t, loadLang } from '../core/i18n.js';
import { Btn, Check, Chips, Field, copyText, shareText } from '../core/ui.js';
import { openSheet, toast, closeAllLayers } from '../core/layers.js';
import { applyGlass, haptic } from '../core/fx.js';

const looksEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const JOIN_KEY = 'po:join';
export const getJoinCode = () => { try { return sessionStorage.getItem(JOIN_KEY) || ''; } catch { return ''; } };
export const setJoinCode = (c) => { try { if (c) sessionStorage.setItem(JOIN_KEY, c); else sessionStorage.removeItem(JOIN_KEY); } catch { /* ignore */ } };

/** Called after any successful sign-in: load the account and show the home screen. */
export async function afterAuth(user) {
  clearCache();
  if (user && !user.is_demo && user.lang && user.lang !== S.prefs.lang) {
    await loadLang(user.lang);
    setPrefs({ lang: user.lang });
  }
  await refreshMe();
  closeAllLayers();
  emit('signedin');
}

async function acceptPendingJoin() {
  const code = getJoinCode();
  if (!code) return;
  try {
    await api.post('/join', { code });
    toast(t('join.done'), 'good');
  } catch (e) {
    if (e.code !== 'invite_own') toast(e.message, 'bad');
  }
  setJoinCode('');
}

export async function signedInFlow(user) {
  await acceptPendingJoin();
  await afterAuth(user);
}

export function privacySheet() {
  openSheet({
    title: t('privacy.title'),
    build: () => [
      ...t('privacy.body').split('\n\n').map((p) => h('p', { class: 'pre muted' }, p)),
      h('p', { class: 'small faint' }, t('privacy.legal')),
    ],
  });
}

export function showRecovery(code, then) {
  let saved = false;
  openSheet({
    title: t('rec.title'),
    dismissable: false,
    build: (sh) => {
      const chk = Check(t('rec.saved'), false, (v) => { saved = v; go.disabled = !v; });
      const go = Btn(t('common.continue'), { kind: 'primary', block: true, disabled: true, onClick: () => { if (!saved) return; sh.close(); if (then) then(); } });
      return [
        h('div', { class: 'center' }, h('div', { class: 'big-check good' }, icon('key', 40))),
        h('p', { class: 'muted center' }, t('rec.body')),
        h('div', { class: 'card flat' }, h('div', { class: 'code-big selectable', style: { fontSize: '26px', letterSpacing: '.12em' } }, code)),
        h('div', { class: 'btn-row' },
          Btn(t('common.copy'), { icon: 'copy', onClick: () => copyText(code) }),
          Btn(t('common.share'), { icon: 'share', onClick: () => shareText(`PropertyOS ${t('rec.share_label')}: ${code}`) })),
        chk.el, go,
      ];
    },
  });
}

// ---------- sign in ----------
export function openSignIn() {
  openSheet({
    title: t('auth.signin'),
    build: (sh) => {
      const email = Field({ label: t('auth.email'), type: 'email', autocomplete: 'username', inputmode: 'email' });
      const pw = Field({ label: t('auth.password'), type: 'password', autocomplete: 'current-password' });
      const submit = Btn(t('auth.signin'), {
        kind: 'primary', block: true,
        onClick: async () => {
          const e = email.get().toLowerCase();
          if (!looksEmail(e)) return email.error(t('auth.err_email'));
          if (!pw.raw()) return pw.error(t('auth.err_pw_empty'));
          const authKey = await deriveKey(e, pw.raw());
          try {
            const { user } = await api.post('/auth/login', { email: e, authKey }, { quiet401: true });
            sh.close();
            await signedInFlow(user);
          } catch (err) {
            if (err.code === 'bad_login') return pw.error(err.message);
            throw err;
          }
        },
      });
      pw.input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') submit.click(); });
      return [
        email.el, pw.el, submit,
        h('div', { class: 'btn-row' },
          Btn(t('auth.forgot'), { kind: 'ghost', size: 'sm', onClick: () => { sh.close(); setTimeout(openReset, 280); } }),
          Btn(t('auth.create'), { kind: 'ghost', size: 'sm', onClick: () => { sh.close(); setTimeout(() => openSignUp(), 280); } })),
      ];
    },
  });
}

// ---------- sign up ----------
export function openSignUp({ inviteCode = getJoinCode(), preview = null } = {}) {
  openSheet({
    title: t('auth.create'),
    build: (sh) => {
      let role = 'landlord';
      const roleChips = Chips([
        { v: 'landlord', label: t('role.landlord'), icon: 'building' },
        { v: 'tenant', label: t('role.tenant'), icon: 'home' },
      ], role, (v) => { role = v; });
      const name = Field({ label: t('auth.name'), autocomplete: 'name' });
      const phone = Field({ label: t('auth.phone'), type: 'tel', inputmode: 'tel', autocomplete: 'tel', hint: t('auth.phone_hint') });
      const email = Field({ label: t('auth.email'), type: 'email', autocomplete: 'username', inputmode: 'email' });
      const pw = Field({ label: t('auth.password'), type: 'password', autocomplete: 'new-password', hint: t('auth.pw_hint') });
      const code = Field({ label: t('auth.invite_code'), value: inviteCode, upper: true, maxlength: 12, autocomplete: 'off' });
      const consent = Check(t('auth.consent'), false);
      const submit = Btn(t('auth.create'), {
        kind: 'primary', block: true,
        onClick: async () => {
          const n = name.get(); const e = email.get().toLowerCase(); const p = pw.raw();
          if (n.length < 2) return name.error(t('auth.err_name'));
          if (!looksEmail(e)) return email.error(t('auth.err_email'));
          if (p.length < 8) return pw.error(t('auth.err_pw_short'));
          if (p.toLowerCase() === e) return pw.error(t('auth.err_pw_same'));
          if (!consent.get()) { toast(t('auth.err_consent'), 'bad'); haptic('error'); return; }
          const authKey = await deriveKey(e, p);
          const body = { email: e, name: n, phone: phone.get(), authKey, lang: S.prefs.lang || 'en', role, consent: true };
          const ic = code.get().toUpperCase();
          if (ic) body.inviteCode = ic;
          let res;
          try {
            res = await api.post('/auth/signup', body, { quiet401: true });
          } catch (err) {
            if (err.code === 'email_taken') return email.error(err.message);
            if (err.code === 'invite_invalid') return code.error(err.message);
            throw err;
          }
          setJoinCode('');
          sh.close();
          setTimeout(() => showRecovery(res.recovery, () => afterAuth(res.user)), 300);
        },
      });
      return [
        preview ? h('div', { class: 'card flat row-flex' }, icon('building', 22), h('div', null,
          h('div', { class: 'bold' }, preview.property), h('div', { class: 'small muted' }, preview.unit ? t('join.unit', { unit: preview.unit }) : t('join.guard')))) : null,
        inviteCode ? null : h('div', { class: 'field' }, h('label', null, t('auth.i_am')), roleChips.el),
        name.el, phone.el, email.el, pw.el,
        inviteCode ? code.el : h('div', { class: 'field' }, code.el),
        h('div', { class: 'row-flex' }, consent.el, Btn(t('common.read'), { kind: 'ghost', size: 'xs', onClick: privacySheet })),
        submit,
        Btn(t('auth.have_account'), { kind: 'ghost', size: 'sm', block: true, onClick: () => { sh.close(); setTimeout(openSignIn, 280); } }),
      ];
    },
  });
}

// ---------- reset ----------
export function openReset() {
  openSheet({
    title: t('auth.reset'),
    build: (sh) => {
      const email = Field({ label: t('auth.email'), type: 'email', autocomplete: 'username', inputmode: 'email' });
      const code = Field({ label: t('auth.reset_code'), upper: true, hint: t('auth.reset_hint'), autocomplete: 'off' });
      const pw = Field({ label: t('auth.new_password'), type: 'password', autocomplete: 'new-password', hint: t('auth.pw_hint') });
      return [
        h('p', { class: 'muted small' }, t('auth.reset_body')),
        email.el, code.el, pw.el,
        Btn(t('auth.reset_go'), {
          kind: 'primary', block: true,
          onClick: async () => {
            const e = email.get().toLowerCase();
            if (!looksEmail(e)) return email.error(t('auth.err_email'));
            if (!code.get()) return code.error(t('auth.err_code'));
            if (pw.raw().length < 8) return pw.error(t('auth.err_pw_short'));
            const authKey = await deriveKey(e, pw.raw());
            const res = await api.post('/auth/reset', { email: e, code: code.get().toUpperCase(), authKey }, { quiet401: true });
            sh.close();
            setTimeout(() => showRecovery(res.recovery, () => afterAuth(res.user)), 300);
          },
        }),
      ];
    },
  });
}

// ---------- demo ----------
export async function startDemo(role) {
  const { user } = await api.post('/demo/start', { role }, { quiet401: true });
  await afterAuth(user);
}

// ---------- change language while signed out or in ----------
export async function chooseLang(lang) {
  await loadLang(lang);
  setPrefs({ lang });
  document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
  applyGlass();
  emit('lang', lang);
  if (S.me && S.me.user && !S.me.user.is_demo) api.patch('/me', { lang }).catch(() => {});
}
