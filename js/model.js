// Pure calendar and voting logic: days, counts, wave, top 3, fills, names.
// No DOM, no Firebase; unit-tested with node --test.
import { shortLabel, fullLabel, monthName } from './cz.js';

export const VOTE_KINDS = ['love', 'ok', 'no'];

// ---- days ----

// One entry per day from startIso to endIso inclusive. Built in UTC so DST
// never shifts a date.
export function buildDays(startIso, endIso) {
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const end = Date.parse(`${endIso}T00:00:00Z`);
  const days = [];
  for (let t = start, index = 0; t <= end; t += 86400000, index++) {
    const date = new Date(t);
    const dow = date.getUTCDay(); // 0 = Sunday
    days.push({
      index,
      iso: date.toISOString().slice(0, 10),
      date,
      dow,
      dom: date.getUTCDate(),
      month: date.getUTCMonth(),
      weekend: dow === 0 || dow === 6,
      label: shortLabel(date),
      full: fullLabel(date),
    });
  }
  return days;
}

// Groups days by calendar month. lead = empty cells before day 1 in a Monday-first week.
export function monthsOf(days) {
  const months = [];
  for (const day of days) {
    let current = months[months.length - 1];
    if (!current || current.month !== day.month) {
      current = { month: day.month, name: monthName(day.month), days: [], lead: (day.dow + 6) % 7 };
      months.push(current);
    }
    current.days.push(day);
  }
  return months;
}

// ---- votes and counts ----

// overlay: { iso: value | null } painted locally but not yet saved; null clears.
export function votesWithOverlay(votes, overlay) {
  const merged = { ...votes };
  for (const [iso, value] of Object.entries(overlay)) {
    if (value) merged[iso] = value;
    else delete merged[iso];
  }
  return merged;
}

// voteMaps: one { iso: kind } per person.
export function dayCounts(days, voteMaps) {
  return days.map((day) => {
    const count = { love: 0, ok: 0, no: 0 };
    for (const votes of voteMaps) {
      const kind = votes[day.iso];
      if (kind in count) count[kind]++;
    }
    count.score = count.love + 0.5 * count.ok - count.no;
    return count;
  });
}

export function countVoted(votes, isos) {
  return isos.filter((iso) => votes[iso]).length;
}

// ---- wave ----

const WAVE_TOP = 10;
const WAVE_BOTTOM = 96;

// Steffen (1990) slopes for a curve through evenly spaced points: smooth, but
// never higher or lower than the neighbouring days, so a peak day stays the
// highest point and the range edges behave like the middle.
function steffenSlopes(ys) {
  const n = ys.length;
  if (n < 2) return ys.map(() => 0);
  const d = ys.slice(1).map((y, i) => y - ys[i]); // day-to-day change
  return ys.map((_, i) => {
    if (i === 0) return d[0];
    if (i === n - 1) return d[n - 2];
    const before = d[i - 1];
    const after = d[i];
    if (before * after <= 0) return 0; // a peak, a valley or flat: level curve
    const size = Math.min(2 * Math.abs(before), 2 * Math.abs(after), (Math.abs(before) + Math.abs(after)) / 2);
    return Math.sign(before) * size;
  });
}

// The wave as SVG paths in a viewBox of "0 0 <days> 100": a smooth curve
// through every day's score, day i at x = i + 0.5. Best score at the top
// (y 10), worst at the bottom (y 96); flat at the bottom when all are equal.
// ys are the days' heights in %, used to place the top-3 dots.
export function wavePaths(scores) {
  const n = scores.length;
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const range = (hi - lo) || 1;
  const ys = scores.map((v) => WAVE_BOTTOM - ((v - lo) / range) * (WAVE_BOTTOM - WAVE_TOP));
  const slopes = steffenSlopes(ys);
  const f = (v) => v.toFixed(2);
  const x = (i) => i + 0.5;
  let line = `M${f(x(0))},${f(ys[0])}`;
  for (let i = 0; i < n - 1; i++) {
    line += ` C${f(x(i) + 1 / 3)},${f(ys[i] + slopes[i] / 3)}`
      + ` ${f(x(i + 1) - 1 / 3)},${f(ys[i + 1] - slopes[i + 1] / 3)}`
      + ` ${f(x(i + 1))},${f(ys[i + 1])}`;
  }
  const area = `${line} L${f(x(n - 1))},100.00 L${f(x(0))},100.00 Z`;
  return { line, area, ys };
}

// Best days first (score, then earlier day). Days nobody wants are not "best".
export function topDays(counts, howMany = 3) {
  return counts
    .map((count, index) => index)
    .filter((index) => counts[index].score > 0)
    .sort((a, b) => counts[b].score - counts[a].score || a - b)
    .slice(0, howMany);
}

// ---- pens ----

// Rule 1: the eraser clears; the same pen again clears (toggle); otherwise set.
export function resolveClick(pen, current) {
  if (pen === 'eraser') return null;
  return current === pen ? null : pen;
}

const FILL_FILTERS = {
  weekends: (day) => day.dow === 0 || day.dow === 6,
  friSun: (day) => day.dow === 5 || day.dow === 6 || day.dow === 0,
  weekdays: (day) => day.dow >= 1 && day.dow <= 5,
  all: () => true,
};

// month: calendar month number to limit to, or null for the whole range.
export function fillIndices(days, kind, month) {
  return days
    .filter((day) => (month === null || day.month === month) && FILL_FILTERS[kind](day))
    .map((day) => day.index);
}

// ---- names ----

function words(name) {
  return (name || '').trim().split(/\s+/).filter(Boolean);
}

function initialOf(word) {
  const ch = /^ch/i.test(word) ? word.slice(0, 2) : word.charAt(0);
  return ch.charAt(0).toLocaleUpperCase('cs') + ch.slice(1).toLowerCase();
}

function basicShortName(name) {
  const parts = words(name);
  if (parts.length === 0) return '';
  const first = parts[0];
  if (parts.length === 1) return first;
  return `${first} ${initialOf(parts[parts.length - 1])}.`;
}

function fullName(name) {
  return words(name).join(' ');
}

// Returns name → short name ("Martina N."). When two different people would
// get the same short name, both are shown in full.
export function shortNamer(allNames) {
  const fullNamesByShort = new Map();
  for (const name of allNames) {
    const short = basicShortName(name);
    if (!fullNamesByShort.has(short)) fullNamesByShort.set(short, new Set());
    fullNamesByShort.get(short).add(fullName(name));
  }
  return (name) => {
    const short = basicShortName(name);
    const owners = new Set(fullNamesByShort.get(short));
    owners.add(fullName(name));
    return owners.size > 1 ? fullName(name) : short;
  };
}

export function displayName(person) {
  const maiden = (person.maiden || '').trim();
  return maiden ? `${person.name}, roz. ${maiden}` : person.name;
}

// Who said what for one day, for the chart tooltip.
export function tooltipGroups(people, iso, meId, nameOf) {
  return VOTE_KINDS.map((kind) => {
    const others = people
      .filter((p) => p.id !== meId && p.votes[iso] === kind)
      .map((p) => nameOf(p.name))
      .sort((a, b) => a.localeCompare(b, 'cs'));
    const me = people.find((p) => p.id === meId && p.votes[iso] === kind);
    const names = me ? [...others, `${nameOf(me.name)} (ty)`] : others;
    return { kind, n: names.length, names: names.length ? names.join(', ') : 'nikdo' };
  });
}

// ---- chart ----

// Pixels per vote so a full bar fits the plot (180 px desktop, 130 px phone).
export function chartUnit(peopleCount, phone) {
  const max = phone ? 4 : 5;
  const fit = phone ? 125 : 180;
  return peopleCount > 0 ? Math.min(max, fit / peopleCount) : max;
}

// Phone shows one month: the month of the best day, else the middle one.
export function defaultMonthIndex(months, days, top) {
  if (top.length) {
    const month = days[top[0]].month;
    return months.findIndex((m) => m.month === month);
  }
  return Math.floor((months.length - 1) / 2);
}

// ---- history ----

// A person's totals per pen. Every vote change stores these in its history
// entry, so the history can show "má naklikáno 18 dní (9× hodí se …)" per day.
export function voteTotals(votes) {
  const values = Object.values(votes);
  return VOTE_KINDS.map((kind) => ({ kind, count: values.filter((v) => v === kind).length }));
}

function hasTotals(chips) {
  return chips.length === VOTE_KINDS.length && chips.every((chip) => typeof chip.count === 'number');
}

function localDayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// One line per person per calendar day. entries come newest first: the newest
// entry of a group gives its time and text, the newest entry carrying totals
// gives the sums (null when that day only had a first visit or a rename).
export function historyGroups(entries) {
  const groups = [];
  const byKey = new Map();
  for (const entry of entries) {
    const key = `${entry.personId}|${localDayKey(entry.at)}`;
    let group = byKey.get(key);
    if (!group) {
      group = { personId: entry.personId, name: entry.name, at: entry.at, totals: null, text: entry.text };
      byKey.set(key, group);
      groups.push(group);
    }
    if (!group.totals && hasTotals(entry.chips)) group.totals = entry.chips;
  }
  return groups;
}
