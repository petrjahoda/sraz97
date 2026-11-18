// "Jak na to" notes: a red-pen column beside the sections on desktop,
// one yellow card on phones.
import { html } from '../lib/html.js';
import { setHelp } from '../store.js';
import { arrowRight, arrowDown, closeIcon } from './bits.js';

const hide = () => setHelp(false);

function note(title, body, arrow = '') {
  return html`
    <div class="help-note">
      <span class="hand help-note-title">${title}</span>
      ${body ? html`<span class="help-note-body">${body}</span>` : ''}
      ${arrow}
    </div>`;
}

export function helpColumnTop() {
  return html`
    <aside class="help-col" aria-label="Jak na to">
      <div class="help-col-head">
        <span class="help-col-label">Jak na to</span>
        <button type="button" class="help-hide" aria-label="Schovat nápovědu" @click=${hide}>schovat${closeIcon}</button>
      </div>
      ${note('1. Tady uvidíš, kdy to zatím vychází nejlíp.',
        'Čím výš vlna, tím víc nás dorazí. Vpravo sú tři nejlepší dny, klikni a ukážou se ti v kalendáři.',
        arrowRight)}
    </aside>`;
}

export function helpNotesCalendar() {
  return html`
    <aside class="help-col help-col-spaced" aria-label="Jak na to">
      ${note('2. Nejdřív si vem pero.', 'Zelené kolečko = hodí se, oranžové čárkované = šlo by to, přeškrtnuté = nemůžu.')}
      ${note('3. Pak klikej na dny, nebo táhni.',
        'Podrž myš a přejeď přes víc dní, označí se všecky naráz. Když klikneš podruhé, zas to zmizí.',
        arrowDown)}
    </aside>`;
}

export function helpNoteChart() {
  return html`
    <aside class="help-col" aria-label="Jak na to">
      ${note('4. Kdo přesně kdy může?', 'Najeď myší na sloupeček a vyskočí jména.', arrowDown)}
    </aside>`;
}

export function helpNoteHistory() {
  return html`<span class="hand help-note-title help-note-history">5. Třídní kniha: kdo co kdy pozměnil. ↓</span>`;
}

export function phoneHelp() {
  return html`
    <section class="sticky phone-help tilt" aria-labelledby="phone-help-title">
      <div class="phone-help-head">
        <h2 class="hand phone-help-title" id="phone-help-title">Jak na to</h2>
        <button type="button" class="phone-help-hide" @click=${hide}>Už vím, schovat${closeIcon}</button>
      </div>
      <ol class="phone-help-steps">
        <li>Hned pod tím uvidíš, kdy to zatím vychází nejlíp.</li>
        <li>Vem si pero: hodí se, šlo by to, nebo nemůžu.</li>
        <li>Ťukej na dny. Víc dní naráz: přejeď prstem do strany, nebo zapni „od–do“.</li>
        <li>Ukládá se to samo, neboj. Dycky to můžeš změnit.</li>
      </ol>
    </section>`;
}
