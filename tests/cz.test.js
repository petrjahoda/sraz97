import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dny, daysText, markedText, shortLabel, fullLabel,
  monthName, monthGenitive, monthLocative, monthWhole,
  vocative, relativeTime, verb, paintText, fillText, joinText, renameText,
} from '../js/cz.js';

const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));

test('dny picks den / dny / dní by count', () => {
  assert.equal(dny(1), 'den');
  assert.equal(dny(2), 'dny');
  assert.equal(dny(4), 'dny');
  assert.equal(dny(0), 'dní');
  assert.equal(dny(5), 'dní');
  assert.equal(dny(22), 'dní');
});

test('daysText joins count and plural, markedText says zatím nic for zero', () => {
  assert.equal(daysText(1), '1 den');
  assert.equal(daysText(3), '3 dny');
  assert.equal(daysText(0), '0 dní');
  assert.equal(markedText(0), 'zatím nic');
  assert.equal(markedText(5), '5 dní');
});

test('short and full day labels', () => {
  assert.equal(shortLabel(utc(2027, 6, 19)), 'So 19. 6.');
  assert.equal(shortLabel(utc(2027, 5, 3)), 'Po 3. 5.');
  assert.equal(fullLabel(utc(2027, 6, 19)), 'Sobota 19. června');
  assert.equal(fullLabel(utc(2027, 7, 1)), 'Čtvrtek 1. července');
});

test('month forms for May to July', () => {
  assert.deepEqual([4, 5, 6].map(monthName), ['Květen', 'Červen', 'Červenec']);
  assert.deepEqual([4, 5, 6].map(monthGenitive), ['května', 'června', 'července']);
  assert.deepEqual([4, 5, 6].map(monthLocative), ['v květnu', 'v červnu', 'v červenci']);
  assert.deepEqual([4, 5, 6].map(monthWhole), ['celý květen', 'celý červen', 'celý červenec']);
});

test('month forms exist for all twelve months', () => {
  for (let m = 0; m < 12; m++) {
    assert.ok(monthName(m) && monthGenitive(m) && monthLocative(m) && monthWhole(m), `month ${m}`);
  }
  assert.equal(monthLocative(8), 'v září');
  assert.equal(monthGenitive(10), 'listopadu');
});

test('vocative matches the handoff table', () => {
  const table = [
    ['Martina', 'f', 'Martino'], ['Jana', 'f', 'Jano'], ['Lucie', 'f', 'Lucie'],
    ['Kateřina', 'f', 'Kateřino'], ['Petr', 'm', 'Petře'], ['Tomáš', 'm', 'Tomáši'],
    ['Jakub', 'm', 'Jakube'], ['Pavel', 'm', 'Pavle'], ['Karel', 'm', 'Karle'],
    ['Daniel', 'm', 'Danieli'], ['Marek', 'm', 'Marku'], ['Radek', 'm', 'Radku'],
    ['Ondřej', 'm', 'Ondřeji'], ['Jiří', 'm', 'Jiří'], ['David', 'm', 'Davide'],
    ['Michal', 'm', 'Michale'], ['Libor', 'm', 'Libore'], ['Vojtěch', 'm', 'Vojtěchu'],
    ['Honza', 'm', 'Honzo'], ['Zdeněk', 'm', 'Zdeňku'], ['Max', 'm', 'Maxi'],
    ['Dagmar', 'f', 'Dagmar'], ['Ester', 'f', 'Ester'],
  ];
  for (const [name, gender, expected] of table) {
    assert.equal(vocative(name, gender), expected, name);
  }
});

test('vocative of empty input is empty', () => {
  assert.equal(vocative('', 'f'), '');
  assert.equal(vocative('   ', 'm'), '');
});

test('verb adds a for women', () => {
  assert.equal(verb('naklikal', 'f'), 'naklikala');
  assert.equal(verb('naklikal', 'm'), 'naklikal');
});

test('relativeTime covers every branch', () => {
  const now = new Date(2027, 5, 12, 15, 30);
  const at = (d, h, min) => new Date(2027, 5, d, h, min);
  assert.equal(relativeTime(new Date(2027, 5, 12, 15, 29, 40), now), 'teďka');
  assert.equal(relativeTime(new Date(now.getTime() + 5000), now), 'teďka');
  assert.equal(relativeTime(at(12, 15, 18), now), 'před 12 min');
  assert.equal(relativeTime(at(12, 14, 31), now), 'před 59 min');
  assert.equal(relativeTime(at(12, 14, 30), now), 'před hodinou');
  assert.equal(relativeTime(at(12, 13, 31), now), 'před hodinou');
  assert.equal(relativeTime(at(12, 13, 30), now), 'před 2 h');
  assert.equal(relativeTime(at(12, 0, 5), now), 'před 15 h');
  assert.equal(relativeTime(at(11, 23, 59), now), 'včera');
  assert.equal(relativeTime(at(10, 8, 0), now), 'předevčírem');
  assert.equal(relativeTime(at(9, 8, 0), now), '9. 6.');
});

test('relativeTime just after midnight counts calendar days, not 24h blocks', () => {
  const now = new Date(2027, 5, 12, 0, 20);
  assert.equal(relativeTime(new Date(2027, 5, 11, 23, 50), now), 'před 30 min');
  assert.equal(relativeTime(new Date(2027, 5, 11, 22, 0), now), 'včera');
  assert.equal(relativeTime(new Date(2027, 5, 10, 23, 0), now), 'předevčírem');
});

test('paintText for one day, several days, and clearing', () => {
  const d1 = utc(2027, 6, 19);
  const range = [utc(2027, 6, 1), utc(2027, 6, 2), utc(2027, 6, 3), utc(2027, 6, 4)];
  assert.equal(paintText('m', 'love', [d1]), 'naklikal So 19. 6.');
  assert.equal(paintText('f', null, [d1]), 'smazala So 19. 6.');
  assert.equal(paintText('f', 'ok', range), 'naklikala 4 dny (Út 1. 6. – Pá 4. 6.)');
  assert.equal(paintText('m', null, range), 'smazal 4 dny (Út 1. 6. – Pá 4. 6.)');
});

test('fillText for the whole range', () => {
  const whole = { whole: true, firstMonth: 4, lastMonth: 6 };
  assert.equal(fillText('f', 'love', 'weekends', whole), 'naklikala všecky víkendy od května do července');
  assert.equal(fillText('m', 'ok', 'friSun', whole), 'naklikal všecky pátky až neděle od května do července');
  assert.equal(fillText('f', 'no', 'weekdays', whole), 'naklikala všecky všední dny od května do července');
  assert.equal(fillText('m', 'love', 'all', whole), 'naklikal úplně všecko');
  assert.equal(fillText('f', null, 'weekends', whole), 'smazala všecky víkendy od května do července');
});

test('fillText for one month (phone)', () => {
  const june = { whole: false, month: 5 };
  assert.equal(fillText('f', 'love', 'weekends', june), 'naklikala všecky víkendy v červnu');
  assert.equal(fillText('m', 'love', 'all', june), 'naklikal celý červen');
  assert.equal(fillText('m', null, 'all', june), 'smazal celý červen');
});

test('fillText for a range inside one month says v <month>', () => {
  assert.equal(
    fillText('f', 'love', 'weekends', { whole: true, firstMonth: 5, lastMonth: 5 }),
    'naklikala všecky víkendy v červnu',
  );
});

test('join and rename sentences', () => {
  assert.equal(joinText('f'), 'se poprvé ukázala');
  assert.equal(joinText('m'), 'se poprvé ukázal');
  assert.equal(renameText('f'), 'si změnila jméno');
  assert.equal(renameText('m'), 'si změnil jméno');
});
