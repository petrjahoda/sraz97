// #/jmeno (design F2): first visit, or "změnit jméno" from the main page.
import { html, nothing, classMap } from '../lib/html.js';
import { createPerson, updatePerson } from '../firebase.js';
import { joinText, renameText } from '../cz.js';
import { displayName } from '../model.js';
import { state, update, me, showToast } from '../store.js';
import { go } from '../router.js';
import { arrowIcon, SAVE_ERROR } from './bits.js';

// Form state for this screen only. null = not started, filled from the
// existing person (rename) or empty (first visit) on first render.
let form = null;
function setForm(patch) {
  form = { ...form, ...patch };
  update({});
}

function startForm() {
  const person = me();
  return {
    personId: state.meId,
    name: person ? person.name : '',
    maiden: person ? person.maiden : '',
    gender: person ? person.gender : '',
    error: '',
  };
}

function tidy(text) {
  return text.trim().replace(/\s+/g, ' ');
}

function onSubmit(event) {
  event.preventDefault();
  const name = tidy(form.name);
  const maiden = tidy(form.maiden);
  if (name.length < 2) return setForm({ error: 'Napiš, jak se jmenuješ.' });
  if (!form.gender) return setForm({ error: 'Vyber, jak o tobě máme psát.' });

  const existing = me();
  const person = { id: state.meId, name, maiden, gender: form.gender };
  form = null;

  if (existing && existing.name === name && existing.maiden === maiden && existing.gender === person.gender) {
    go('main'); // nothing changed, nothing to log
    return;
  }
  // Firestore shows the write locally right away, so don't wait for the server
  // (offline it would wait forever); report a failure when it comes.
  const saving = existing
    ? updatePerson(person, { text: renameText(person.gender), chips: [] })
    : createPerson(person, { text: joinText(person.gender), chips: [] });
  saving.catch((err) => {
    console.warn('Saving the name failed', err.code || err);
    showToast(SAVE_ERROR);
  });
  go('main');
}

function genderOption(value, first, verbForm, note) {
  const checked = form.gender === value;
  return html`
    <label class=${classMap({ 'radio-card': true, on: checked })}>
      <input type="radio" name="rod" value=${value} .checked=${checked}
        @change=${() => setForm({ gender: value, error: '' })}>
      <span class="radio-text"><span class="radio-title">${first} ${verbForm}</span><span class="radio-note">${note}</span></span>
    </label>`;
}

// "změnit jméno" on the main page: always start from the saved name.
export function startRename() {
  form = null;
  go('name');
}

export function nameView() {
  if (!form || form.personId !== state.meId) form = startForm();
  const first = tidy(form.name).split(' ')[0] || 'Ty';
  const preview = displayName({ name: tidy(form.name) || 'Tvoje jméno', maiden: tidy(form.maiden) });
  const verb = { f: 'naklikala', m: 'naklikal' }[form.gender] || 'naklikal(a)';

  return html`
    <div class="page page-top">
      <main class="name-step">
        <ol class="progress" aria-label="Postup">
          <li class="done"><span class="progress-dot">
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 8.5l3.2 3.2 6.8-7.5"></path></svg>
          </span>přihlášení</li>
          <li class="current" aria-current="step"><span class="progress-dot">2</span>kdo seš</li>
          <li><span class="progress-dot">3</span>naklikat dny</li>
        </ol>

        <div class="name-head">
          <h1 class="hand name-title">Ahoj! Kdo seš?</h1>
          <p class="name-sub">Ať víme, kdo co naklikal. Jméno uvidí enem děcka z naší třídy.</p>
        </div>

        <form class="paper-card name-card" @submit=${onSubmit} novalidate>
          <div class="field">
            <label for="jmeno">Jméno a příjmení</label>
            <input id="jmeno" type="text" autocomplete="name" maxlength="80" placeholder="třeba Martina Nováková"
              .value=${form.name} @input=${(e) => setForm({ name: e.target.value, error: '' })}>
          </div>
          <div class="field">
            <label for="svobodna">Příjmení za svobodna <span class="optional">(nepovinné)</span></label>
            <input id="svobodna" type="text" maxlength="60" placeholder="když se ti změnilo, ať tě poznáme"
              .value=${form.maiden} @input=${(e) => setForm({ maiden: e.target.value })}>
          </div>
          <fieldset class="gender">
            <legend>Jak o tobě máme psát?</legend>
            <div class="radio-grid">
              ${genderOption('f', first, 'naklikala', 'jsem ženská')}
              ${genderOption('m', first, 'naklikal', 'jsem chlap')}
            </div>
          </fieldset>

          <div class="sticky preview tilt">
            <span class="preview-label">V třídní knize to pak bude vypadat takto:</span>
            <div class="preview-line">
              <span class="hand preview-name">${preview}</span>
              <span>${verb} So 19. 6.</span>
              <span class="chip chip-love">Hodí se mi</span>
            </div>
          </div>

          <button class="btn-primary" type="submit">Hotovo, jdem na to${arrowIcon}</button>
          ${form.error ? html`<p class="form-error" role="alert">${form.error}</p>` : nothing}
          <p class="name-note">Jméno můžeš kdykoli změnit, nic se neztratí.</p>
        </form>
      </main>
    </div>`;
}
