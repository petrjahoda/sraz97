// "Třídní kniha": who changed what, newest first, plus the CSV download.
import { html, nothing } from '../lib/html.js';
import { relativeTime } from '../cz.js';
import { buildCsv } from '../csv.js';
import { DAYS, update } from '../store.js';
import { LOG_LIMIT } from '../firebase.js';
import { LABEL, CHIP_COUNT_LABEL } from './bits.js';

const DESKTOP_ENTRIES = 8;
const PHONE_ENTRIES = 4;

function chipLabel(chip) {
  return chip.count ? `${chip.count}× ${CHIP_COUNT_LABEL[chip.kind]}` : LABEL[chip.kind];
}

function entry(e, s, d) {
  return html`
    <li class="log-entry">
      <div class="log-head">
        <span class="hand log-who">${d.nameOf(e.name)}</span>
        <span class="log-when">${relativeTime(e.at, s.now)}</span>
      </div>
      <span class="log-text">${e.text}</span>
      ${e.chips.length ? html`
        <div class="log-chips">
          ${e.chips.map((chip) => html`<span class=${`chip chip-${chip.kind}`}>${chipLabel(chip)}</span>`)}
        </div>` : nothing}
    </li>`;
}

function downloadCsv(s) {
  const blob = new Blob([buildCsv(s.people, DAYS)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sraz97-hlasovani.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function history(s, d, phone) {
  const shown = phone ? (s.historyExpanded ? LOG_LIMIT : PHONE_ENTRIES) : DESKTOP_ENTRIES;
  const entries = s.log.slice(0, shown);
  const canExpand = phone && !s.historyExpanded && s.log.length > PHONE_ENTRIES;
  return html`
    <aside class=${phone ? 'history history-phone' : 'history tilt'} aria-labelledby="history-title">
      <h2 class="hand history-title" id="history-title">Třídní kniha</h2>
      <span class="history-sub">${phone ? 'nejčerstvější nahoře' : 'kdo co udělal, nejčerstvější nahoře'}</span>
      ${entries.length
        ? html`<ol class="log">${entries.map((e) => entry(e, s, d))}</ol>`
        : html`<p class="log-empty">Zatím prázdno. Buď první!</p>`}
      ${canExpand ? html`
        <button type="button" class="history-more" @click=${() => update({ historyExpanded: true })}>Ukázat celou knihu</button>` : nothing}
      <button type="button" class="link-button csv-link" @click=${() => downloadCsv(s)}>Stáhnout tabulku (CSV)</button>
    </aside>`;
}
