// #/prihlaseni (design F1)
import { html, nothing } from '../lib/html.js';
import { ORGANIZER_CONTACT } from '../config.js';
import { isValidEmail } from '../identity.js';
import { logIn } from '../session.js';
import { update } from '../store.js';
import { arrowIcon, squiggle } from './bits.js';

const WRONG_PASSWORD = 'Heslo nesedí. Mrkni do pozvánky.';
const NETWORK = 'Nejde se připojit. Zkus to za chvilku.';
const AUTH_ERRORS = {
  'auth/invalid-credential': WRONG_PASSWORD,
  'auth/invalid-login-credentials': WRONG_PASSWORD,
  'auth/wrong-password': WRONG_PASSWORD,
  'auth/too-many-requests': 'Moc pokusů. Dej si chvilku pauzu a zkus to znova.',
  'auth/network-request-failed': NETWORK,
};

// Login form state lives here, not in the store: only this screen uses it.
let form = { busy: false, error: '' };
function setForm(patch) {
  form = { ...form, ...patch };
  update({}); // re-render
}

async function onSubmit(event) {
  event.preventDefault();
  if (form.busy) return;
  const email = event.target.elements.email.value.trim();
  const password = event.target.elements.heslo.value;
  if (!email) return setForm({ error: 'Napiš svůj e-mail.' });
  if (!isValidEmail(email)) return setForm({ error: 'Tenhle e-mail nějak nesedí.' });
  if (!password) return setForm({ error: 'Napiš heslo z pozvánky.' });

  setForm({ busy: true, error: '' });
  try {
    await logIn(email, password);
    setForm({ busy: false });
  } catch (err) {
    if (!AUTH_ERRORS[err.code]) console.warn('Login failed', err.code || err);
    setForm({ busy: false, error: AUTH_ERRORS[err.code] || NETWORK });
  }
}

const doodle = html`
  <svg class="login-doodle" viewBox="0 0 450 110" aria-hidden="true">
    <path class="doodle-wave" d="M4 96 C 40 92, 60 70, 90 78 S 140 96, 170 70 S 220 14, 250 22 S 290 80, 320 70 S 370 56, 396 84"></path>
    <circle class="doodle-dot" cx="250" cy="22" r="7"></circle>
    <path class="doodle-pointer" d="M282 10 C 272 6, 266 10, 262 16"></path>
    <text class="doodle-label" x="286" y="16">tady se sejdem!</text>
  </svg>`;

const contact = ORGANIZER_CONTACT.includes('@')
  ? html`<a href="mailto:${ORGANIZER_CONTACT}">${ORGANIZER_CONTACT}</a>`
  : ORGANIZER_CONTACT;

export function loginView() {
  return html`
    <div class="page page-center">
      <main class="login">
        <div class="login-intro">
          <h1 class="hand login-title">Sraz po 30 rokách!</h1>
          ${squiggle}
          <p class="login-sub">Maturita ’97 · léto 2027. Pomož nám najít den, kdy se sejdem všeci.</p>
          ${doodle}
          <ol class="login-steps">
            <li>přihlásíš se mailem a heslem z pozvánky,</li>
            <li>napíšeš, kdo seš,</li>
            <li>naklikáš, které dny ti sednou. Hotovo.</li>
          </ol>
        </div>

        <form class="paper-card login-card tilt" @submit=${onSubmit} novalidate>
          <h2 class="hand card-title">Pusť mě dovnitř</h2>
          <div class="field">
            <label for="email">Tvůj e-mail</label>
            <input id="email" name="email" type="email" autocomplete="email" placeholder="tvuj@email.cz" required>
          </div>
          <div class="field">
            <label for="heslo">Heslo z pozvánky</label>
            <input id="heslo" name="heslo" type="password" autocomplete="current-password" placeholder="••••••••" required aria-describedby="heslo-hint">
            <span class="hint" id="heslo-hint">Heslo je pro všecky stejné, najdeš ho v pozvánce.</span>
          </div>
          <button class="btn-primary" type="submit" ?disabled=${form.busy}>
            ${form.busy ? 'Moment…' : html`Jdu dovnitř${arrowIcon}`}
          </button>
          ${form.error ? html`<p class="form-error" role="alert">${form.error}</p>` : nothing}
          <p class="card-foot">Nemáš pozvánku nebo nejde heslo? Napiš na ${contact}.</p>
        </form>
      </main>
    </div>`;
}
