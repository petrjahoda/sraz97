// "Třídní kniha": who changed what, newest first, plus the CSV download.
import { html, nothing } from '../lib/html.js';
import { relativeTime, markedText } from '../cz.js';
import { buildCsv } from '../csv.js';
import { historyGroups } from '../model.js';
import { DAYS, update } from '../store.js';
import { LABEL, CHIP_COUNT_LABEL } from './bits.js';

// Lines shown, one line per person per day.
const DESKTOP_LINES = 8;
const PHONE_LINES = 4;

function chipLabel(chip) {
  return chip.count ? `${chip.count}× ${CHIP_COUNT_LABEL[chip.kind]}` : LABEL[chip.kind];
}

// "má naklikáno 18 dní" with 9× hodí se · 5× šlo by · 4× nemůžu, or, for a day
// with only a first visit or a rename, that sentence.
function line(group, s, d) {
  const total = group.totals ? group.totals.reduce((sum, chip) => sum + chip.count, 0) : 0;
  const text = group.totals ? `má naklikáno ${markedText(total)}` : group.text;
  const chips = group.totals ? group.totals.filter((chip) => chip.count > 0) : [];
  return html`
    <li class="log-entry">
      <div class="log-head">
        <span class="hand log-who">${d.nameOf(group.name)}</span>
        <span class="log-when">${relativeTime(group.at, s.now)}</span>
      </div>
      <span class="log-text">${text}</span>
      ${chips.length ? html`
        <div class="log-chips">
          ${chips.map((chip) => html`<span class=${`chip chip-${chip.kind}`}>${chipLabel(chip)}</span>`)}
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
  const groups = historyGroups(s.log);
  const shown = phone ? (s.historyExpanded ? groups.length : PHONE_LINES) : DESKTOP_LINES;
  const lines = groups.slice(0, shown);
  const canExpand = phone && !s.historyExpanded && groups.length > PHONE_LINES;
  return html`
    <aside class=${phone ? 'history history-phone' : 'history'} aria-labelledby="history-title">
      <h2 class="hand history-title" id="history-title">Třídní kniha</h2>
      <span class="history-sub">${phone ? 'nejčerstvější nahoře' : 'kdo co udělal, nejčerstvější nahoře'}</span>
      ${lines.length
        ? html`<ol class="log">${lines.map((group) => line(group, s, d))}</ol>`
        : html`<p class="log-empty">Zatím prázdno. Buď první!</p>`}
      ${canExpand ? html`
        <button type="button" class="history-more" @click=${() => update({ historyExpanded: true })}>Ukázat celou knihu</button>` : nothing}
      <button type="button" class="link-button csv-link" @click=${() => downloadCsv(s)}>Stáhnout tabulku (CSV)</button>
    </aside>`;
}
