// Error message pinned to the bottom of the screen (failed saves).
import { html } from '../lib/html.js';

export function toast(s) {
  return html`<div class="toast" role="alert" ?hidden=${!s.toast}>${s.toast}</div>`;
}
