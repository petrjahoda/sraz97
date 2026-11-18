// Small shared drawings and helpers used by several views.
import { html, svg } from '../lib/html.js';

export const SAVE_ERROR = 'Nepodařilo se uložit. Zkus to prosím znova.';

export const arrowIcon = html`<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"></path></svg>`;

export const closeIcon = html`<svg class="icon-x" viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"></path></svg>`;

export const squiggle = html`<svg class="squiggle" viewBox="0 0 420 14" width="380" height="14" aria-hidden="true"><path d="M2 9 C 60 3, 120 12, 180 7 S 300 3, 418 8"></path></svg>`;

// Red hand-drawn arrows used by the help notes.
export const arrowRight = html`<svg class="red-arrow" viewBox="0 0 90 30" width="90" height="30" aria-hidden="true"><path d="M4 22 C 30 4, 58 4, 84 16"></path><path d="M73 8 L85 16 L72 22"></path></svg>`;
export const arrowDown = html`<svg class="red-arrow" viewBox="0 0 40 46" width="40" height="46" aria-hidden="true"><path d="M8 4 C 30 10, 30 26, 20 40"></path><path d="M12 32 L20 41 L27 32"></path></svg>`;

// Three linked circles: "drag across several days".
export const dragIcon = (width = 52, height = 22) => html`<svg class="drag-icon" viewBox="0 0 52 22" width=${width} height=${height} aria-hidden="true">${svg`
  <circle cx="9" cy="11" r="7"></circle><circle cx="26" cy="11" r="7"></circle><circle cx="43" cy="11" r="7"></circle>
  <path d="M9 11 H43"></path>`}</svg>`;

export const LABEL = { love: 'Hodí se mi', ok: 'Šlo by to', no: 'Nemůžu', eraser: 'Guma' };
export const CHIP_COUNT_LABEL = { love: 'hodí se', ok: 'šlo by', no: 'nemůžu' };
