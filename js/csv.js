// CSV export of everyone's votes. Semicolons and a BOM so Excel with Czech
// regional settings splits the columns and shows diacritics correctly.
import { displayName } from './model.js';

const WORDS = { love: 'hodí se', ok: 'šlo by', no: 'nemůžu' };

function cell(text) {
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(people, days) {
  const header = ['Jméno', ...days.map((d) => `${d.dom}. ${d.month + 1}.`)];
  const rows = people
    .map((p) => [displayName(p), ...days.map((d) => WORDS[p.votes[d.iso]] || '')])
    .sort((a, b) => a[0].localeCompare(b[0], 'cs'));
  const lines = [header, ...rows].map((row) => row.map(cell).join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
