// "Kdo může kdy": stacked bars per day and the yellow tooltip with names.
import { html, classMap, styleMap } from '../lib/html.js';
import { chartUnit, tooltipGroups } from '../model.js';
import { DAYS, MONTHS, update } from '../store.js';
import { monthAxis } from './hero.js';

const GROUP_TITLE = { love: 'Hodí se', ok: 'Šlo by to', no: 'Nemůžou' };

export function chartHeading(phone) {
  return html`
    <div class="chart-head">
      <div class="chart-head-text">
        <h2 class="hand section-title" id="chart-title">Kdo může kdy</h2>
        <p class="section-note">${phone
          ? 'Ťukni na sloupeček, do strany posouvej prstem.'
          : 'Najeď myší na sloupeček a uvidíš, kdo to je.'}</p>
      </div>
      ${phone ? '' : html`
        <div class="legend" aria-hidden="true">
          <span><span class="legend-box bg-love"></span>hodí se</span>
          <span><span class="legend-box bg-ok"></span>šlo by to</span>
          <span><span class="legend-box bg-no"></span>nemůžou</span>
        </div>`}
    </div>`;
}

function barSegments(c, unit) {
  return html`
    <span class="seg bg-no seg-top" style=${styleMap({ height: `${c.no * unit}px` })}></span>
    <span class="seg bg-ok" style=${styleMap({ height: `${c.ok * unit}px` })}></span>
    <span class="seg bg-love" style=${styleMap({ height: `${c.love * unit}px` })}></span>`;
}

function bars(s, d, phone) {
  const unit = chartUnit(s.people.length, phone);
  return MONTHS.map((m) => html`
    <div class="bar-month" style=${styleMap({ flex: `${m.days.length} 1 0px` })}>
      ${m.days.map((day) => {
        const c = d.counts[day.index];
        const cls = classMap({ bar: true, on: d.selected === day.index });
        // Desktop: hovering (or tapping on a tablet) selects. Phone: real buttons.
        return phone
          ? html`<button type="button" class=${cls}
              aria-label="${day.full}: hodí se ${c.love}, šlo by ${c.ok}, nemůže ${c.no}"
              @click=${() => update({ selected: day.index })}>${barSegments(c, unit)}</button>`
          : html`<div class=${cls} @pointerenter=${() => update({ selected: day.index })}>${barSegments(c, unit)}</div>`;
      })}
    </div>`);
}

function tooltipContent(d) {
  const day = DAYS[d.selected];
  const groups = tooltipGroups(d.people, day.iso, d.person ? d.person.id : null, d.nameOf);
  return html`
    <span class="hand tip-title">${day.full}</span>
    ${groups.map((g) => html`
      <div class="tip-row">
        <span class=${`tip-dot bg-${g.kind}`}></span>
        <span class="tip-text"><strong>${GROUP_TITLE[g.kind]} (${g.n}):</strong> ${g.names}</span>
      </div>`)}`;
}

export function chart(s, d) {
  const x = ((d.selected + 0.5) / DAYS.length) * 100;
  const tipStyle = {
    left: `${x.toFixed(2)}%`,
    '--tip-shift': x > 55 ? 'calc(-100% - 12px)' : '12px',
  };
  return html`
    <div class="chart">
      <div class="plot">
        ${bars(s, d, false)}
        <div class="tooltip" style=${styleMap(tipStyle)} aria-live="polite">${tooltipContent(d)}</div>
      </div>
      ${monthAxis('month-axis chart-axis')}
    </div>`;
}

export function phoneChart(s, d) {
  return html`
    <section class="chart-phone" aria-labelledby="chart-title">
      ${chartHeading(true)}
      <div class="chart-scroll">
        <div class="chart-inner">
          <div class="plot plot-phone">${bars(s, d, true)}</div>
          ${monthAxis('month-axis chart-axis')}
        </div>
      </div>
      <div class="sticky tip-panel" aria-live="polite">${tooltipContent(d)}</div>
    </section>`;
}
