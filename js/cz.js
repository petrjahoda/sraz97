// Czech language helpers: plurals, dates, vocative, relative time, log sentences.
// Pure functions, unit-tested with node --test.

// ---- plurals ----

export function dny(n) {
  if (n === 1) return 'den';
  if (n >= 2 && n <= 4) return 'dny';
  return 'dní';
}

export function daysText(n) {
  return `${n} ${dny(n)}`;
}

export function markedText(n) {
  return n === 0 ? 'zatím nic' : daysText(n);
}

// ---- dates (UTC dates from model.buildDays) ----

// Indexed by Date#getUTCDay(), Sunday first.
const WEEKDAY_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const WEEKDAY_LONG = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];

// Calendar header, weeks start on Monday.
export const WEEK_HEADER = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

const MONTH_NAME = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
const MONTH_GENITIVE = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
const MONTH_LOCATIVE = ['v lednu', 'v únoru', 'v březnu', 'v dubnu', 'v květnu', 'v červnu',
  'v červenci', 'v srpnu', 'v září', 'v říjnu', 'v listopadu', 'v prosinci'];

export const monthName = (m) => MONTH_NAME[m];
export const monthGenitive = (m) => MONTH_GENITIVE[m];
export const monthLocative = (m) => MONTH_LOCATIVE[m];
export const monthWhole = (m) => `celý ${MONTH_NAME[m].toLowerCase()}`;

// "So 19. 6."
export function shortLabel(date) {
  return `${WEEKDAY_SHORT[date.getUTCDay()]} ${date.getUTCDate()}. ${date.getUTCMonth() + 1}.`;
}

// "Sobota 19. června"
export function fullLabel(date) {
  return `${WEEKDAY_LONG[date.getUTCDay()]} ${date.getUTCDate()}. ${MONTH_GENITIVE[date.getUTCMonth()]}`;
}

// ---- vocative for "čau, Martino!" (reference implementation from the handoff) ----

const VOCATIVE_EXCEPTIONS = { pavel: 'Pavle', karel: 'Karle' };
const SOFTENED = { n: 'ň', d: 'ď', t: 'ť' };

export function vocative(first, gender) {
  const n = (first || '').trim();
  if (!n) return n;
  const low = n.toLowerCase();
  if (VOCATIVE_EXCEPTIONS[low]) return VOCATIVE_EXCEPTIONS[low];
  if (/a$/i.test(n)) return n.slice(0, -1) + 'o'; // Martina → Martino, Honza → Honzo
  if (gender === 'f') return n; // Lucie, Dagmar, Ester
  if (/[eěiíéoóuůúyý]$/i.test(n)) return n; // Jiří, René, Hugo
  if (/[ndt]ěk$/i.test(n)) return n.slice(0, -3) + SOFTENED[n.slice(-3, -2).toLowerCase()] + 'ku'; // Zdeněk → Zdeňku
  if (/ek$/i.test(n)) return n.slice(0, -2) + 'ku'; // Marek → Marku
  if (/el$/i.test(n)) return n + 'i'; // Daniel → Danieli
  if (/[bcčdďfghjklmnňpqrřsštťvwxzž]r$/i.test(n)) return n.slice(0, -1) + 'ře'; // Petr → Petře
  if (/(ch|[kgh])$/i.test(n)) return n + 'u'; // Vojtěch → Vojtěchu
  if (/[šžčřjcňťďszx]$/i.test(n)) return n + 'i'; // Tomáš → Tomáši, Max → Maxi
  return n + 'e'; // Jakub → Jakube, Jan → Jane
}

// ---- relative time for the history log (local time) ----

function calendarDaysBetween(earlier, later) {
  const a = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const b = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  // Rounding absorbs 23 h / 25 h days around DST changes.
  return Math.round((b - a) / 86400000);
}

export function relativeTime(at, now) {
  const minutes = Math.floor((now - at) / 60000);
  if (minutes < 1) return 'teďka';
  if (minutes < 60) return `před ${minutes} min`;
  if (minutes < 120) return 'před hodinou';
  const days = calendarDaysBetween(at, now);
  if (days === 0) return `před ${Math.floor(minutes / 60)} h`;
  if (days === 1) return 'včera';
  if (days === 2) return 'předevčírem';
  return `${at.getDate()}. ${at.getMonth() + 1}.`;
}

// ---- log sentences (the text stored after the person's name) ----

// Past-tense verbs get an "a" for women: naklikal → naklikala.
export function verb(base, gender) {
  return gender === 'f' ? base + 'a' : base;
}

function setOrClear(gender, value) {
  return verb(value ? 'naklikal' : 'smazal', gender);
}

// dates: sorted UTC dates touched by one click, drag or range.
export function paintText(gender, value, dates) {
  const first = dates[0];
  const last = dates[dates.length - 1];
  const what = dates.length === 1
    ? shortLabel(first)
    : `${daysText(dates.length)} (${shortLabel(first)} – ${shortLabel(last)})`;
  return `${setOrClear(gender, value)} ${what}`;
}

const FILL_OBJECT = {
  weekends: 'všecky víkendy',
  friSun: 'všecky pátky až neděle',
  weekdays: 'všecky všední dny',
};

// scope: { whole: true, firstMonth, lastMonth } for the whole range,
//        { whole: false, month } for one month (phone fill chips).
export function fillText(gender, value, kind, scope) {
  let what;
  if (kind === 'all') {
    what = scope.whole ? 'úplně všecko' : monthWhole(scope.month);
  } else {
    let where;
    if (!scope.whole) where = monthLocative(scope.month);
    else if (scope.firstMonth === scope.lastMonth) where = monthLocative(scope.firstMonth);
    else where = `od ${monthGenitive(scope.firstMonth)} do ${monthGenitive(scope.lastMonth)}`;
    what = `${FILL_OBJECT[kind]} ${where}`;
  }
  return `${setOrClear(gender, value)} ${what}`;
}

export function joinText(gender) {
  return `se poprvé ${verb('ukázal', gender)}`;
}

export function renameText(gender) {
  return `si ${verb('změnil', gender)} jméno`;
}
