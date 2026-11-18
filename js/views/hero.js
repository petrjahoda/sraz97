// "Kdy to vychází nejlíp": the wave and the top-3 cards.
import { html, svg, styleMap, classMap } from '../lib/html.js';
import { DAYS, MONTHS, update } from '../store.js';

const percentX = (index) => `${(((index + 0.5) / DAYS.length) * 100).toFixed(2)}%`;

function pickDay(index) {
  const monthIndex = MONTHS.findIndex((m) => m.month === DAYS[index].month);
  update({ selected: index, phoneMonth: monthIndex });
}

export function monthAxis(className) {
  return html`
    <div class=${className} aria-hidden="true">
      ${MONTHS.map((m) => html`<div class="axis-month" style=${styleMap({ flex: `${m.days.length} 1 0px` })}>${m.name}</div>`)}
    </div>`;
}

function wave(d, phone) {
  return html`
    <div class=${classMap({ 'wave-box': true, 'wave-box-phone': phone })}>
      <svg class="wave-svg" viewBox="0 0 ${DAYS.length} 100" preserveAspectRatio="none" aria-hidden="true">
        ${svg`<path class="wave-area" d=${d.wave.area}></path><path class="wave-line" d=${d.wave.line}></path>`}
      </svg>
      <span class="wave-marker" aria-hidden="true" style=${styleMap({ left: percentX(d.selected) })}></span>
      ${d.top.map((index) => html`
        <span class="wave-dot" aria-hidden="true"
          style=${styleMap({ left: percentX(index), top: `${d.wave.ys[index].toFixed(2)}%` })}></span>`)}
      ${d.anyVotes ? '' : html`<span class="wave-empty">Zatím je to placka. Naklikej první dny!</span>`}
    </div>
    ${monthAxis('month-axis wave-axis')}`;
}

function bestCards(d) {
  if (!d.top.length) {
    return html`<p class="best-empty">Až někdo něco naklikne, ukážou se tu nejlepší dny.</p>`;
  }
  return d.top.map((index, i) => {
    const c = d.counts[index];
    return html`
      <button type="button" class=${classMap({ 'best-card': true, first: i === 0, on: d.selected === index })}
        @click=${() => pickDay(index)}>
        <span class="hand best-rank">${i + 1}.</span>
        <span class="best-text">
          <span class="best-date">${DAYS[index].full}</span>
          <span class="best-stats">hodí se: <strong class="t-love">${c.love}</strong> · šlo by: <strong class="t-ok">${c.ok}</strong> · nemůže: <strong class="t-no">${c.no}</strong></span>
        </span>
      </button>`;
  });
}

export function hero(s, d, phone) {
  if (phone) {
    return html`
      <section class="hero hero-phone" aria-labelledby="hero-title">
        <h2 class="hand hero-title" id="hero-title">Kdy to vychází nejlíp</h2>
        <div>${wave(d, true)}</div>
        <span class="best-label">Zatím nejlíp vychází:</span>
        ${bestCards(d)}
      </section>`;
  }
  return html`
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-wave">
        <div class="section-head">
          <h2 class="hand hero-title" id="hero-title">Kdy to vychází nejlíp</h2>
          <span class="section-note">čím výš vlna, tím víc nás dorazí</span>
        </div>
        <div>${wave(d, false)}</div>
      </div>
      <div class="hero-best">
        <span class="best-label">Zatím nejlíp vychází:</span>
        ${bestCards(d)}
      </div>
    </section>`;
}
