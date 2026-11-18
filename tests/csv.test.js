import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv } from '../js/csv.js';
import { buildDays } from '../js/model.js';

const days = buildDays('2027-05-01', '2027-05-03');

test('CSV starts with a BOM and uses semicolons and CRLF', () => {
  const csv = buildCsv([], days);
  assert.equal(csv, '﻿Jméno;1. 5.;2. 5.;3. 5.\r\n');
});

test('CSV has one row per person sorted by name, with Czech vote words', () => {
  const csv = buildCsv([
    { name: 'Petr Novák', maiden: '', votes: { '2027-05-01': 'love', '2027-05-03': 'no' } },
    { name: 'Čeněk Malý', maiden: '', votes: { '2027-05-02': 'ok' } },
    { name: 'Martina Nováková', maiden: 'Svobodová', votes: {} },
  ], days);
  const rows = csv.slice(1).split('\r\n');
  assert.deepEqual(rows, [
    'Jméno;1. 5.;2. 5.;3. 5.',
    'Čeněk Malý;;šlo by;',
    'Martina Nováková, roz. Svobodová;;;',
    'Petr Novák;hodí se;;nemůžu',
    '',
  ]);
});

test('CSV quotes names containing separators or quotes', () => {
  const csv = buildCsv([{ name: 'Jan "Honza"; Dvořák', maiden: '', votes: {} }], days);
  assert.ok(csv.includes('"Jan ""Honza""; Dvořák";;;'));
});
