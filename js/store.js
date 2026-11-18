// App state in one plain object. Views read it; update() changes it and
// schedules one re-render per animation frame.
import { START, END } from './config.js';
import { buildDays, monthsOf } from './model.js';
import { watchPeople, watchLog } from './firebase.js';
import { loadMe } from './identity.js';

export const DAYS = buildDays(START, END);
export const MONTHS = monthsOf(DAYS);

const HELP_KEY = 'sraz97.help';
const phoneQuery = window.matchMedia('(max-width: 719px)');

function loadHelp() {
  try {
    return localStorage.getItem(HELP_KEY) !== '0'; // visible on the first visit
  } catch {
    return true;
  }
}

export const state = {
  // session
  authReady: false,
  user: null,
  meId: loadMe(),
  route: 'main',
  // shared data
  people: [],
  peopleLoaded: false,
  log: [],
  dataError: false,
  // main page UI
  pen: 'love',
  overlay: {}, // { iso: value | null } painted but not saved yet
  painting: null, // { value, count } while a drag is in progress
  selected: null, // day index; null = best day
  rangeMode: false,
  rangeAnchor: null,
  confirmFill: null, // { kind, month, count } waiting for "Jo, smazat"
  phoneMonth: null, // index into MONTHS; null = month of the best day
  historyExpanded: false,
  help: loadHelp(),
  toast: '',
  isPhone: phoneQuery.matches,
  now: new Date(),
};

const listeners = new Set();
let frame = 0;

export function subscribe(listener) {
  listeners.add(listener);
}

export function update(patch) {
  Object.assign(state, patch);
  if (!frame) {
    frame = requestAnimationFrame(() => {
      frame = 0;
      for (const listener of listeners) listener(state);
    });
  }
}

export function setHelp(visible) {
  try {
    localStorage.setItem(HELP_KEY, visible ? '1' : '0');
  } catch {
    // Not remembered, still toggled for this visit.
  }
  update({ help: visible });
}

let toastTimer = 0;
export function showToast(text) {
  clearTimeout(toastTimer);
  update({ toast: text });
  toastTimer = setTimeout(() => update({ toast: '' }), 6000);
}

phoneQuery.addEventListener('change', (e) => update({ isPhone: e.matches }));
setInterval(() => update({ now: new Date() }), 60000);

// ---- Firestore subscriptions, alive while signed in ----

let unsubscribers = [];

export function startData() {
  if (unsubscribers.length) return;
  const onError = (err) => {
    console.warn('Firestore subscription failed', err.code || err);
    update({ dataError: true });
  };
  unsubscribers = [
    watchPeople((people) => {
      // The painted overlay is now part of the (latency-compensated) snapshot.
      update({ people, peopleLoaded: true, dataError: false, overlay: state.painting ? state.overlay : {} });
    }, onError),
    watchLog((log) => update({ log }), onError),
  ];
}

// Stop listening before signing out, otherwise the listeners fail with
// permission-denied the moment the user is gone.
export function stopData() {
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
  update({ people: [], peopleLoaded: false, log: [], dataError: false });
}

export function me() {
  return state.people.find((p) => p.id === state.meId) || null;
}
