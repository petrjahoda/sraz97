import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDays, monthsOf, votesWithOverlay, dayCounts, wavePaths, topDays,
  resolveClick, fillIndices, countVoted, shortNamer, displayName, tooltipGroups,
  chartUnit, defaultMonthIndex, voteTotals, historyGroups,
} from '../js/model.js';

const days = buildDays('2027-05-01', '2027-07-31');
const KIND = ['', 'love', 'ok', 'no'];

// Deterministic pseudo-random votes for comparing against the reference algorithm.
function fakePeople(count, seed) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  return Array.from({ length: count }, (_, p) => {
    const votes = {};
    for (const d of days) {
      const k = Math.floor(rnd() * 6); // half of the days stay empty
      if (k >= 1 && k <= 3) votes[d.iso] = KIND[k];
    }
    return { id: `p${p}`, name: `Person ${p}`, maiden: '', gender: 'f', votes };
  });
}

// The design's reference logic (F3_Hlavni.dc.html renderVals), ported verbatim as the oracle.
function referenceWaveAndTop(counts) {
  const n = counts.length;
  const sm = [];
  for (let a = 0; a < n; a++) {
    let acc = 0; let wsum = 0;
    for (let j = Math.max(0, a - 6); j <= Math.min(n - 1, a + 6); j++) {
      const kk = Math.exp(-((a - j) * (a - j)) / 6.5);
      acc += counts[j].score * kk; wsum += kk;
    }
    sm.push(acc / wsum);
  }
  const lo = Math.min(...sm); const hi = Math.max(...sm);
  const yOf = (val) => 96 - (val - lo) / ((hi - lo) || 1) * (96 - 10);
  let wave = '';
  for (let q = 0; q < n; q++) wave += (q ? ' L' : 'M') + (q + 0.5).toFixed(1) + ',' + yOf(sm[q]).toFixed(2);
  const waveArea = wave + ' L' + (n - 0.5) + ',100 L0.5,100 Z';
  const idx = counts.map((c, k) => k);
  idx.sort((x, y) => counts[y].score - counts[x].score || x - y);
  return { wave, waveArea, top: idx.slice(0, 3) };
}

test('buildDays covers 1 May to 31 July 2027 as 92 UTC days', () => {
  assert.equal(days.length, 92);
  assert.equal(days[0].iso, '2027-05-01');
  assert.equal(days[91].iso, '2027-07-31');
  assert.equal(days[0].dow, 6); // Saturday
  assert.equal(days[0].weekend, true);
  assert.equal(days[0].label, 'So 1. 5.');
  assert.equal(days[49].full, 'Sobota 19. června');
  assert.deepEqual(days.map((d) => d.index), [...Array(92).keys()]);
});

test('monthsOf groups days and computes Monday-based leading blanks', () => {
  const months = monthsOf(days);
  assert.deepEqual(months.map((m) => m.name), ['Květen', 'Červen', 'Červenec']);
  assert.deepEqual(months.map((m) => m.days.length), [31, 30, 31]);
  assert.deepEqual(months.map((m) => m.lead), [5, 1, 3]); // Sat, Tue, Thu
});

test('votesWithOverlay sets and clears days on top of saved votes', () => {
  assert.deepEqual(
    votesWithOverlay({ a: 'love', b: 'no' }, { b: null, c: 'ok' }),
    { a: 'love', c: 'ok' },
  );
});

test('dayCounts counts every person and scores love + 0.5 ok - no', () => {
  const counts = dayCounts(days, [
    { '2027-05-01': 'love', '2027-05-02': 'no' },
    { '2027-05-01': 'ok', '2027-05-02': 'no' },
    { '2027-05-01': 'love' },
  ]);
  assert.deepEqual(counts[0], { love: 2, ok: 1, no: 0, score: 2.5 });
  assert.deepEqual(counts[1], { love: 0, ok: 0, no: 2, score: -2 });
  assert.deepEqual(counts[2], { love: 0, ok: 0, no: 0, score: 0 });
});

test('top 3 match the reference algorithm', () => {
  for (const seed of [1, 7, 42]) {
    const people = fakePeople(25, seed);
    const counts = dayCounts(days, people.map((p) => p.votes));
    assert.deepEqual(topDays(counts), referenceWaveAndTop(counts).top, `top, seed ${seed}`);
  }
});

// Numbers in an SVG path as [x, y] pairs.
function pathPoints(d) {
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

// One person: Thursdays "šlo by", Fridays and Saturdays "hodí se", Sunday to Wednesday "nemůžu".
function weeklyPattern() {
  const votes = {};
  for (const d of days) votes[d.iso] = d.dow === 4 ? 'ok' : (d.dow === 5 || d.dow === 6) ? 'love' : 'no';
  return dayCounts(days, [votes]).map((c) => c.score);
}

test('wave is a smooth curve through every day at its own height', () => {
  const scores = weeklyPattern();
  const wave = wavePaths(scores);
  assert.equal((wave.line.match(/C/g) || []).length, 91);
  const ends = wave.line.split(' C').slice(1).map((seg) => pathPoints(seg)[2]);
  ends.forEach(([x, y], i) => {
    assert.equal(x, i + 1.5);
    assert.equal(y, Number(wave.ys[i + 1].toFixed(2)));
  });
});

test('every Friday and Saturday peaks at the top, the range edges included', () => {
  const wave = wavePaths(weeklyPattern());
  days.forEach((d, i) => {
    if (d.dow === 5 || d.dow === 6) assert.equal(wave.ys[i], 10, d.iso);
    if (d.dow === 0 || (d.dow >= 1 && d.dow <= 3)) assert.equal(wave.ys[i], 96, d.iso);
  });
});

test('wave never overshoots the highest or lowest day', () => {
  for (const scores of [weeklyPattern(), dayCounts(days, fakePeople(25, 7).map((p) => p.votes)).map((c) => c.score)]) {
    for (const [, y] of pathPoints(wavePaths(scores).line)) {
      assert.ok(y >= 10 - 1e-9 && y <= 96 + 1e-9, String(y));
    }
  }
});

test('wave is flat at the bottom when nobody voted', () => {
  const wave = wavePaths(dayCounts(days, []).map((c) => c.score));
  assert.ok(wave.ys.every((y) => y === 96));
  assert.ok(pathPoints(wave.line).every(([, y]) => y === 96));
  assert.ok(wave.area.endsWith('L91.50,100.00 L0.50,100.00 Z'));
});

test('topDays skips days without a positive score', () => {
  const counts = dayCounts(days, [{ '2027-06-19': 'love', '2027-06-20': 'no' }]);
  assert.deepEqual(topDays(counts), [49]);
  assert.deepEqual(topDays(dayCounts(days, [])), []);
});

test('topDays breaks ties by earlier day', () => {
  const counts = dayCounts(days, [{ '2027-06-19': 'love', '2027-05-08': 'love', '2027-07-03': 'love', '2027-05-02': 'love' }]);
  assert.deepEqual(topDays(counts), [1, 7, 49]);
});

test('resolveClick sets, toggles off, and erases', () => {
  assert.equal(resolveClick('love', undefined), 'love');
  assert.equal(resolveClick('love', 'ok'), 'love');
  assert.equal(resolveClick('love', 'love'), null);
  assert.equal(resolveClick('eraser', 'no'), null);
  assert.equal(resolveClick('eraser', undefined), null);
});

test('fillIndices picks weekends, Fri-Sun, weekdays and all', () => {
  const weekends = fillIndices(days, 'weekends', null);
  assert.equal(weekends.length, 27); // 14 Saturdays + 13 Sundays
  assert.ok(weekends.every((i) => days[i].dow === 0 || days[i].dow === 6));
  assert.equal(fillIndices(days, 'friSun', null).length, 40); // + 13 Fridays
  assert.equal(fillIndices(days, 'weekdays', null).length, 65);
  assert.equal(fillIndices(days, 'all', null).length, 92);
});

test('fillIndices limited to one month', () => {
  const june = fillIndices(days, 'all', 5);
  assert.equal(june.length, 30);
  assert.equal(days[june[0]].iso, '2027-06-01');
  assert.equal(fillIndices(days, 'weekends', 5).length, 8);
});

test('countVoted counts days that already have a vote', () => {
  const votes = { '2027-05-01': 'love', '2027-05-02': 'no', '2027-05-03': 'ok' };
  assert.equal(countVoted(votes, ['2027-05-01', '2027-05-02', '2027-05-04']), 2);
});

test('shortNamer uses first name + last initial', () => {
  const nameOf = shortNamer(['Martina Nováková', 'Jan', '  Eva   malá ', 'Jan Amos Komenský', 'Josef Chalupa']);
  assert.equal(nameOf('Martina Nováková'), 'Martina N.');
  assert.equal(nameOf('Jan'), 'Jan');
  assert.equal(nameOf('  Eva   malá '), 'Eva M.');
  assert.equal(nameOf('Jan Amos Komenský'), 'Jan K.');
  assert.equal(nameOf('Josef Chalupa'), 'Josef Ch.');
});

test('shortNamer falls back to full names when two people would collide', () => {
  const nameOf = shortNamer(['Petr Novák', 'Petr Nedoma', 'Jana Nováková']);
  assert.equal(nameOf('Petr Novák'), 'Petr Novák');
  assert.equal(nameOf('Petr Nedoma'), 'Petr Nedoma');
  assert.equal(nameOf('Jana Nováková'), 'Jana N.');
  // A name only in the history log (renamed since) that collides with someone current.
  assert.equal(nameOf('Jana Nová'), 'Jana Nová');
});

test('displayName adds the maiden name', () => {
  assert.equal(displayName({ name: 'Martina Nováková', maiden: 'Svobodová' }), 'Martina Nováková, roz. Svobodová');
  assert.equal(displayName({ name: 'Petr Novák', maiden: '' }), 'Petr Novák');
});

test('tooltipGroups sorts with Czech collation, appends (ty), says nikdo', () => {
  const iso = '2027-06-19';
  const people = [
    { id: 'a', name: 'Ivan Malý', votes: { [iso]: 'love' } },
    { id: 'b', name: 'Chrudoš Bílý', votes: { [iso]: 'love' } },
    { id: 'c', name: 'Hana Zelená', votes: { [iso]: 'love' } },
    { id: 'me', name: 'Adam Král', votes: { [iso]: 'love' } },
    { id: 'd', name: 'Eva Nová', votes: { [iso]: 'no' } },
    { id: 'e', name: 'Ota Pes', votes: {} },
  ];
  const nameOf = shortNamer(people.map((p) => p.name));
  const groups = tooltipGroups(people, iso, 'me', nameOf);
  assert.deepEqual(groups, [
    { kind: 'love', n: 4, names: 'Hana Z., Chrudoš B., Ivan M., Adam K. (ty)' },
    { kind: 'ok', n: 0, names: 'nikdo' },
    { kind: 'no', n: 1, names: 'Eva N.' },
  ]);
});

test('chartUnit shrinks bars when many people vote', () => {
  assert.equal(chartUnit(0, false), 5);
  assert.equal(chartUnit(30, false), 5);
  assert.equal(chartUnit(45, false), 4);
  assert.equal(chartUnit(30, true), 4);
  assert.equal(chartUnit(50, true), 2.5);
});

test('defaultMonthIndex follows the top day, else the middle month', () => {
  const months = monthsOf(days);
  assert.equal(defaultMonthIndex(months, days, [80]), 2);
  assert.equal(defaultMonthIndex(months, days, []), 1);
});

test('voteTotals counts each pen, zeros included', () => {
  assert.deepEqual(voteTotals({ a: 'love', b: 'love', c: 'no' }), [
    { kind: 'love', count: 2 }, { kind: 'ok', count: 0 }, { kind: 'no', count: 1 },
  ]);
  assert.deepEqual(voteTotals({}), [
    { kind: 'love', count: 0 }, { kind: 'ok', count: 0 }, { kind: 'no', count: 0 },
  ]);
});

test('historyGroups makes one line per person per calendar day, newest first', () => {
  const at = (d, h, m = 0) => new Date(2027, 5, d, h, m);
  const totals = (love, ok, no) => [{ kind: 'love', count: love }, { kind: 'ok', count: ok }, { kind: 'no', count: no }];
  const entries = [ // as delivered: newest first
    { personId: 'p', name: 'Petr Novák', text: 'naklikal 4 dny (…)', chips: totals(9, 5, 38), at: at(12, 18, 5) },
    { personId: 'j', name: 'Jana Malá', text: 'naklikala So 19. 6.', chips: totals(1, 0, 0), at: at(12, 18, 0) },
    { personId: 'p', name: 'Petr Novák', text: 'naklikal 13 dní (…)', chips: totals(9, 5, 34), at: at(12, 17, 50) },
    { personId: 'p', name: 'Petr Novák', text: 'se poprvé ukázal', chips: [], at: at(12, 17, 40) },
    { personId: 'j', name: 'Jana Malá', text: 'se poprvé ukázala', chips: [], at: at(11, 9, 0) },
    { personId: 'p', name: 'Petr Novák', text: 'naklikal Po 3. 5.', chips: totals(1, 0, 0), at: at(11, 8, 0) },
  ];
  assert.deepEqual(historyGroups(entries), [
    { personId: 'p', name: 'Petr Novák', at: at(12, 18, 5), totals: totals(9, 5, 38), text: 'naklikal 4 dny (…)' },
    { personId: 'j', name: 'Jana Malá', at: at(12, 18, 0), totals: totals(1, 0, 0), text: 'naklikala So 19. 6.' },
    { personId: 'j', name: 'Jana Malá', at: at(11, 9, 0), totals: null, text: 'se poprvé ukázala' },
    { personId: 'p', name: 'Petr Novák', at: at(11, 8, 0), totals: totals(1, 0, 0), text: 'naklikal Po 3. 5.' },
  ]);
});

test('historyGroups ignores entries without per-pen totals when picking the sum', () => {
  const day = new Date(2027, 5, 12, 10, 0);
  const groups = historyGroups([
    { personId: 'p', name: 'Petr', text: 'si změnil jméno', chips: [], at: day },
    { personId: 'p', name: 'Petr', text: 'naklikal So 19. 6.', chips: [{ kind: 'love', count: 1 }, { kind: 'ok', count: 0 }, { kind: 'no', count: 0 }], at: day },
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].totals, [{ kind: 'love', count: 1 }, { kind: 'ok', count: 0 }, { kind: 'no', count: 0 }]);
  assert.equal(groups[0].text, 'si změnil jméno');
});
