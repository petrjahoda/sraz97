// "A kdy můžeš ty?": pens, tips, fills and the month grids.
import { html, nothing, classMap } from '../lib/html.js';
import { WEEK_HEADER, daysText, markedText, dny } from '../cz.js';
import { DAYS, MONTHS, update } from '../store.js';
import {
  dayPointerDown, dayPointerEnter, endPaint, cancelPaint, dayClick,
  fill, confirmFill, cancelFill, pickPen, toggleRangeMode,
} from '../paint.js';
import { LABEL, dragIcon } from './bits.js';

const PENS = ['love', 'ok', 'no', 'eraser'];
const CHOICE = { love: 'Hodí se mi', ok: 'Šlo by to', no: 'Nemůžu' };

const DESKTOP_FILLS = [
  ['weekends', 'všecky víkendy'], ['friSun', 'všecky pátky až neděle'],
  ['weekdays', 'všecky všední dny'], ['all', 'úplně všecko'],
];
const PHONE_FILLS = [['weekends', 'Víkendy'], ['friSun', 'Pá–Ne'], ['weekdays', 'Všední dny'], ['all', 'Celý měsíc']];

// ---- pieces ----

function penButton(s, pen) {
  return html`
    <button type="button" class=${classMap({ pen: true, [`pen-${pen}`]: true, on: s.pen === pen })}
      aria-pressed=${s.pen === pen ? 'true' : 'false'} @click=${() => pickPen(pen)}>
      <span class=${`pen-sample mark-${pen}`} aria-hidden="true">19</span>${LABEL[pen]}
    </button>`;
}

function paintingText(s) {
  if (!s.painting) return '';
  const { value, count } = s.painting;
  return value ? `Značíš ${count} ${dny(count)}: ${LABEL[value]}` : `Mažeš ${count} ${dny(count)}`;
}

function fillConfirm(s) {
  if (!s.confirmFill) return nothing;
  return html`
    <div class="fill-confirm" role="alert">
      <span>Fakt smazat ${daysText(s.confirmFill.count)}?</span>
      <button type="button" class="confirm-yes" @click=${confirmFill}>Jo, smazat</button>
      <button type="button" class="confirm-no" @click=${cancelFill}>Ne</button>
    </div>`;
}

function dayAria(day, d) {
  const mine = d.myVotes[day.iso];
  const c = d.counts[day.index];
  return `${day.full}. Tvoje volba: ${mine ? CHOICE[mine] : 'nic'}. Všichni: hodí se ${c.love}, šlo by ${c.ok}, nemůže ${c.no}.`;
}

// Arrow keys move focus within one month grid.
const ARROW_STEP = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
function onDayKey(event) {
  const step = ARROW_STEP[event.key];
  if (!step) return;
  const grid = event.currentTarget.closest('.month-grid');
  const target = grid.querySelector(`[data-index="${Number(event.currentTarget.dataset.index) + step}"]`);
  if (target) {
    event.preventDefault();
    target.focus();
  }
}

function dayButton(s, d, day) {
  const mine = d.myVotes[day.iso];
  const rank = d.rank.get(day.index);
  return html`
    <button type="button" data-index=${day.index}
      class=${classMap({
        day: true,
        [`mark-${mine}`]: Boolean(mine),
        weekend: day.weekend,
        selected: d.selected === day.index,
        anchor: s.rangeAnchor === day.index,
      })}
      aria-label=${dayAria(day, d)}
      @pointerdown=${(e) => dayPointerDown(e, day.index)}
      @pointerenter=${() => dayPointerEnter(day.index)}
      @click=${(e) => dayClick(e, day.index)}
      @keydown=${onDayKey}>${day.dom}${rank ? html`<span class="hand day-rank" aria-hidden="true">${rank}.</span>` : nothing}</button>`;
}

function monthGrid(s, d, month) {
  return html`
    <div class="month-grid">
      ${WEEK_HEADER.map((w) => html`<span class="dow" aria-hidden="true">${w}</span>`)}
      ${Array.from({ length: month.lead }, () => html`<span aria-hidden="true"></span>`)}
      ${month.days.map((day) => dayButton(s, d, day))}
    </div>`;
}

// The painting surface: dragging out of it saves, the browser taking over cancels.
function paintArea(className, content) {
  return html`<div class=${className} @pointerleave=${endPaint} @pointercancel=${cancelPaint}>${content}</div>`;
}

// ---- desktop (F3) ----

export function calendarControls(s, d) {
  return html`
    <div class="cal-controls">
      <div class="section-head">
        <h2 class="hand section-title" id="cal-title">A kdy můžeš ty?</h2>
        <span class="section-note">Máš naklikáno: <strong>${markedText(d.myCount)}</strong> · ukládá se to samo, neboj</span>
      </div>
      <div class="pens" role="group" aria-label="Vyber pero">
        <span class="pens-label">Vem si pero:</span>
        ${PENS.map((pen) => penButton(s, pen))}
      </div>
      <div class="drag-tip">
        ${dragIcon()}
        <span class="drag-tip-text"><strong>Víc dní naráz?</strong> Podrž myš a táhni přes dny. Na mobilu přejeď prstem do strany.</span>
        <span class="painting" aria-live="polite">${paintingText(s)}</span>
      </div>
      <div class="fills">
        <span>Nebo to vyplň naráz:</span>
        ${DESKTOP_FILLS.map(([kind, label]) => html`
          <button type="button" class="fill-link" @click=${() => fill(kind, null)}>${label}</button>`)}
      </div>
      ${fillConfirm(s)}
    </div>`;
}

export function calendarMonths(s, d) {
  return paintArea('months', MONTHS.map((month, i) => html`
    <div class="month">
      <div class="month-head">
        <h3 class="hand month-name">${month.name}</h3>
        <span class="month-count">máš: ${markedText(d.monthCounts[i])}</span>
      </div>
      ${monthGrid(s, d, month)}
    </div>`));
}

// ---- phone (F4) ----

export function phoneCalendar(s, d) {
  const month = MONTHS[d.phoneMonth];
  const rangeHint = s.rangeAnchor === null ? 'Ťukni na první den.' : 'Teď ťukni na poslední den.';
  return html`
    <section class="cal-phone" aria-labelledby="cal-title">
      <div>
        <h2 class="hand section-title" id="cal-title">A kdy můžeš ty?</h2>
        <span class="section-note">Máš naklikáno: <strong>${markedText(d.myCount)}</strong> · ukládá se to samo</span>
      </div>
      <span class="pens-label">Vem si pero:</span>
      <div class="pens pens-phone" role="group" aria-label="Vem si pero">
        ${PENS.map((pen) => penButton(s, pen))}
      </div>
      <button type="button" class="range-toggle" aria-pressed=${s.rangeMode ? 'true' : 'false'} @click=${toggleRangeMode}>
        <span class=${classMap({ switch: true, on: s.rangeMode })} aria-hidden="true"><span class="switch-knob"></span></span>
        Od–do: ťukni na první a pak na poslední den
      </button>
      ${s.rangeMode ? html`<span class="range-hint" aria-live="polite">${rangeHint}</span>` : nothing}
      <nav class="month-tabs" aria-label="Měsíc">
        ${MONTHS.map((m, i) => html`
          <button type="button" class=${classMap({ 'month-tab': true, on: i === d.phoneMonth })}
            aria-pressed=${i === d.phoneMonth ? 'true' : 'false'}
            @click=${() => update({ phoneMonth: i })}>${m.name}</button>`)}
      </nav>
      ${paintArea('months months-phone', html`
        <div class="month">
          <span class="visually-hidden">${month.name}, máš: ${markedText(d.monthCounts[d.phoneMonth])}</span>
          ${monthGrid(s, d, month)}
        </div>`)}
      <div class="drag-tip">
        ${dragIcon(44, 19)}
        <span class="drag-tip-text">Přejeď prstem do strany přes týden a označí se celý.</span>
      </div>
      ${s.painting ? html`<span class="painting" aria-live="polite">${paintingText(s)}</span>` : nothing}
      <div class="fill-chips">
        <span class="fill-chips-label">Naráz:</span>
        ${PHONE_FILLS.map(([kind, label]) => html`
          <button type="button" class="fill-chip" @click=${() => fill(kind, month.month)}>${label}</button>`)}
      </div>
      ${fillConfirm(s)}
    </section>`;
}
