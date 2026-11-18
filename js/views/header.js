// Page header with the live head count and the "čau, Martino!" sticky.
import { html } from '../lib/html.js';
import { vocative } from '../cz.js';
import { setHelp } from '../store.js';
import { logOut } from '../session.js';
import { startRename } from './name.js';
import { squiggle } from './bits.js';

function greeting(d) {
  const first = d.person ? d.person.name.split(' ')[0] : '';
  return `${vocative(first, d.person ? d.person.gender : 'f')}!`;
}

function renameLink() {
  return html`<a href="#/jmeno" @click=${(e) => { e.preventDefault(); startRename(); }}>změnit jméno</a>`;
}

function logoutButton() {
  return html`<button type="button" class="link-button" @click=${logOut}>odhlásit</button>`;
}

export function helpToggle(s) {
  return html`
    <button type="button" class="help-pill" aria-pressed=${s.help ? 'true' : 'false'} @click=${() => setHelp(!s.help)}>
      <span class="help-pill-q" aria-hidden="true">?</span>${s.help ? 'Už vím, schovat' : 'Jak na to?'}
    </button>`;
}

export function desktopHeader(s, d) {
  return html`
    <header class="main-header">
      <div class="main-title-block">
        <h1 class="hand main-title">Sraz po 30 rokách!</h1>
        ${squiggle}
        <p class="main-sub">Maturita ’97 · děcka, hledáme den, kdy se sejdem všeci. Už se ozvalo ${s.people.length} z nás.</p>
      </div>
      <div class="header-side">
        ${helpToggle(s)}
        <div class="sticky name-sticky tilt">
          <span class="name-sticky-hi">čau,</span>
          <span class="hand name-sticky-name">${greeting(d)}</span>
          <span class="name-sticky-links">${renameLink()}${logoutButton()}</span>
        </div>
      </div>
    </header>`;
}

export function phoneHeader(s, d) {
  return html`
    <header class="phone-header">
      <div class="phone-header-row">
        <div class="phone-title-block">
          <h1 class="hand phone-title">Sraz po 30 rokách!</h1>
          <span class="phone-sub">Maturita ’97 · ozvalo se ${s.people.length} z nás</span>
        </div>
        <div class="sticky name-sticky name-sticky-phone tilt">
          <span class="name-sticky-hi">čau,</span>
          <span class="hand name-sticky-name">${greeting(d)}</span>
          <span class="name-sticky-links">${renameLink()}${logoutButton()}</span>
        </div>
      </div>
      ${s.help ? '' : helpToggle(s)}
    </header>`;
}
