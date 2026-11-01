import { renderWorkspace } from './workspace.js';
// Signed-out lock screen: big clock, sign in / create account / try the demo.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { S, nowTs } from '../core/store.js';
import { t } from '../core/i18n.js';
import { api } from '../core/api.js';
import { fmtClock, fmtWeekday } from '../core/format.js';
import { Btn, toastError } from '../core/ui.js';
import { haptic, sound } from '../core/fx.js';
import { chooseLang, getJoinCode, openSignIn, openSignUp, startDemo } from '../apps/auth.js';

export function renderWelcome() {
  if (!getJoinCode() && S.prefs.lang !== 'hi') return renderWorkspace().home;
  const time = h('div', { class: 'clock-time' }, fmtClock(nowTs()));
  const date = h('div', { class: 'clock-date' }, fmtWeekday(nowTs()));
  const tick = () => { time.textContent = fmtClock(nowTs()); date.textContent = fmtWeekday(nowTs()); };
  const timer = setInterval(() => { if (!time.isConnected) { clearInterval(timer); return; } tick(); }, 15000);

  const lang = h('button', { class: 'lang-switch glass-fake press', type: 'button', 'aria-label': 'Language' },
    icon('globe', 16), S.prefs.lang === 'hi' ? 'English' : 'हिन्दी');
  lang.addEventListener('click', () => { haptic(); chooseLang(S.prefs.lang === 'hi' ? 'en' : 'hi'); });

  const card = h('div', { class: 'welcome-card glass-fake' });
  const invite = getJoinCode();
  if (invite) {
    card.append(h('div', { class: 'lead' }, t('welcome.invited')));
    api.get(`/invite/peek?code=${encodeURIComponent(invite)}`, { quiet401: true }).then((p) => {
      card.querySelector('.lead').textContent = p.unit ? t('welcome.invited_unit', { property: p.property, unit: p.unit }) : t('welcome.invited_guard', { property: p.property });
      card.dataset.preview = JSON.stringify(p);
    }).catch(() => { card.querySelector('.lead').textContent = t('welcome.invite_bad'); });
    card.append(
      h('button', { class: 'wbtn primary press', type: 'button', onClick: () => { haptic(); openSignUp({ inviteCode: invite, preview: card.dataset.preview ? JSON.parse(card.dataset.preview) : null }); } }, t('welcome.join_create')),
      h('button', { class: 'wbtn soft press', type: 'button', onClick: () => { haptic(); openSignIn(); } }, t('welcome.have_account')));
  } else {
    card.append(
      h('div', { class: 'lead' }, t('welcome.lead')),
      h('button', { class: 'wbtn primary press', type: 'button', onClick: () => { haptic(); sound('tap'); openSignIn(); } }, t('auth.signin')),
      h('button', { class: 'wbtn soft press', type: 'button', onClick: () => { haptic(); sound('tap'); openSignUp(); } }, t('auth.create')),
      h('div', { class: 'demo-label' }, t('welcome.try_demo')),
      h('div', { class: 'demo-row' }, [['landlord', 'building'], ['tenant', 'home'], ['guard', 'shield']].map(([role, ic]) => {
        const b = h('button', { class: 'demo-chip press', type: 'button' }, icon(ic, 20), t(`role.${role}`));
        b.addEventListener('click', async () => {
          if (b.classList.contains('busy')) return;
          haptic(); b.classList.add('busy'); b.style.opacity = '.6';
          try { await startDemo(role); } catch (e) { toastError(e); } finally { b.classList.remove('busy'); b.style.opacity = ''; }
        });
        return b;
      })));
  }

  return h('div', { class: 'welcome' },
    lang,
    h('div', { class: 'clock' }, date, time),
    h('div', { class: 'brand' },
      h('img', { class: 'brand-mark', src: '/icons/icon.svg', alt: '' }),
      h('div', null, h('div', { class: 'brand-name' }, 'PropertyOS'), h('div', { class: 'brand-tag' }, t('welcome.tag')))),
    card);
}
