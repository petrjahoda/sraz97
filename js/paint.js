// Marking days: click/tap, drag painting, range mode and fills.
// Every gesture becomes one Firestore batch with one history entry.
import { saveVotes } from './firebase.js';
import { paintText, fillText } from './cz.js';
import { resolveClick, votesWithOverlay, fillIndices } from './model.js';
import { DAYS, MONTHS, state, update, me, showToast } from './store.js';
import { SAVE_ERROR } from './views/bits.js';

const CONFIRM_CLEAR_FROM = 10;

let gesture = null; // { value, indices, overlayBefore }
// A tap is handled on pointerdown/up; the browser then also sends a click for
// the same tap, which must not toggle the day back. Reset on every pointerdown.
let swallowNextPointerClick = false;

function myVotes() {
  const person = me();
  return votesWithOverlay(person ? person.votes : {}, state.overlay);
}

function penValue() {
  return state.pen === 'eraser' ? null : state.pen;
}

// Saves `value` for the given days. Only days that actually change are written;
// the history sentence still names every day of the gesture ("naklikal 5 dní").
// Returns false when nothing changed.
function commit(indices, value, text) {
  const person = me();
  const current = myVotes();
  const changes = {};
  for (const index of indices) {
    const iso = DAYS[index].iso;
    if ((current[iso] || null) !== value) changes[iso] = value;
  }
  if (!person || Object.keys(changes).length === 0) return false;

  // Show it right away; the next people snapshot (latency-compensated) replaces the overlay.
  update({ overlay: { ...state.overlay, ...changes } });
  const chips = value ? [{ kind: value }] : [];
  saveVotes(person, changes, { text, chips }).catch((err) => {
    console.warn('Saving votes failed', err.code || err);
    update({ overlay: {} });
    showToast(SAVE_ERROR);
  });
  return true;
}

function gestureText(indices, value) {
  const sorted = [...indices].sort((a, b) => a - b);
  const person = me();
  return paintText(person ? person.gender : 'f', value, sorted.map((i) => DAYS[i].date));
}

// ---- drag painting ----

export function dayPointerDown(event, index) {
  swallowNextPointerClick = false;
  if (state.rangeMode) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  // Touch pointers are captured by the first element they hit; without
  // releasing, pointerenter never fires on the other days.
  try {
    event.target.releasePointerCapture(event.pointerId);
  } catch {
    // Not captured, fine.
  }
  const value = resolveClick(state.pen, myVotes()[DAYS[index].iso]);
  gesture = { value, indices: [index], overlayBefore: state.overlay };
  update({
    overlay: { ...state.overlay, [DAYS[index].iso]: value },
    painting: { value, count: 1 },
    selected: index,
    confirmFill: null,
  });
}

export function dayPointerEnter(index) {
  if (!gesture) {
    if (state.selected !== index) update({ selected: index }); // hover selects
    return;
  }
  if (gesture.indices.includes(index)) return;
  gesture.indices.push(index);
  update({
    overlay: { ...state.overlay, [DAYS[index].iso]: gesture.value },
    painting: { value: gesture.value, count: gesture.indices.length },
    selected: index,
  });
}

// pointerup anywhere, or the pointer left the calendar: save the gesture.
export function endPaint() {
  if (!gesture) return;
  const { value, indices, overlayBefore } = gesture;
  gesture = null;
  swallowNextPointerClick = true;
  // Compare against what was shown before the gesture, not the painted preview.
  update({ overlay: overlayBefore, painting: null });
  commit(indices, value, gestureText(indices, value));
}

// pointercancel: the browser took the touch over to scroll the page. With
// touch-action: pan-y a sideways paint never gets here, so whatever was painted
// on the way (often the day above the finger) was an accident: drop it all.
export function cancelPaint() {
  if (!gesture) return;
  update({ overlay: gesture.overlayBefore, painting: null });
  gesture = null;
}

// ---- click / keyboard / range taps ----

export function dayClick(event, index) {
  // Keyboard clicks (Enter/Space) have detail 0 and always count.
  const fromPointer = event.detail > 0;
  if (fromPointer && swallowNextPointerClick) {
    swallowNextPointerClick = false;
    return;
  }
  if (state.rangeMode) {
    rangeTap(index);
    return;
  }
  // Keyboard (Enter/Space) arrives here without a pointer gesture.
  const value = resolveClick(state.pen, myVotes()[DAYS[index].iso]);
  update({ selected: index });
  commit([index], value, gestureText([index], value));
}

function rangeTap(index) {
  if (state.rangeAnchor === null) {
    update({ rangeAnchor: index, selected: index });
    return;
  }
  const from = Math.min(state.rangeAnchor, index);
  const to = Math.max(state.rangeAnchor, index);
  const indices = [];
  for (let i = from; i <= to; i++) indices.push(i);
  const value = penValue();
  update({ rangeAnchor: null, selected: index });
  commit(indices, value, gestureText(indices, value));
}

export function toggleRangeMode() {
  update({ rangeMode: !state.rangeMode, rangeAnchor: null });
}

// ---- fills ----

// month: calendar month number (phone chips) or null for the whole range.
export function fill(kind, month, confirmed = false) {
  const indices = fillIndices(DAYS, kind, month);
  const value = penValue();
  const votes = myVotes();
  if (value === null && !confirmed) {
    const cleared = indices.filter((i) => votes[DAYS[i].iso]).length;
    if (cleared >= CONFIRM_CLEAR_FROM) {
      update({ confirmFill: { kind, month, count: cleared } });
      return;
    }
  }
  const scope = month === null
    ? { whole: true, firstMonth: MONTHS[0].month, lastMonth: MONTHS[MONTHS.length - 1].month }
    : { whole: false, month };
  const person = me();
  update({ confirmFill: null });
  commit(indices, value, fillText(person ? person.gender : 'f', value, kind, scope));
}

export function confirmFill() {
  const pending = state.confirmFill;
  if (pending) fill(pending.kind, pending.month, true);
}

export function cancelFill() {
  update({ confirmFill: null });
}

export function pickPen(pen) {
  update({ pen, confirmFill: null });
}

// The page-wide pointerup ends a drag even when released outside the calendar.
document.addEventListener('pointerup', endPaint);
