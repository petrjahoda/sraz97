// #/ main page: F3 on desktop/tablet, F4 on phones (< 720 px).
import { html } from '../lib/html.js';
import {
  votesWithOverlay, dayCounts, smoothScores, wavePaths, topDays, shortNamer,
  countVoted, defaultMonthIndex,
} from '../model.js';
import { DAYS, MONTHS, me, update } from '../store.js';
import { desktopHeader, phoneHeader } from './header.js';
import { helpColumnTop, helpNotesCalendar, helpNoteChart, helpNoteHistory, phoneHelp } from './help.js';
import { hero } from './hero.js';
import { calendarControls, calendarMonths, phoneCalendar } from './calendar.js';
import { chartHeading, chart, phoneChart } from './chart.js';
import { history } from './history.js';
import { toast } from './toast.js';

// Everything derived from people + my unsaved overlay. Recomputed only when
// those change, not on every hover.
let cache = { people: null, overlay: null, meId: null, data: null };

function derive(s) {
  if (cache.people === s.people && cache.overlay === s.overlay && cache.meId === s.meId) return cache.data;
  const person = me();
  const myVotes = votesWithOverlay(person ? person.votes : {}, s.overlay);
  // Everyone as they should look right now, including my not-yet-saved strokes.
  const people = s.people.map((p) => (p.id === s.meId ? { ...p, votes: myVotes } : p));
  const counts = dayCounts(DAYS, people.map((p) => p.votes));
  const wave = wavePaths(smoothScores(counts.map((c) => c.score)));
  const top = topDays(counts);
  const rank = new Map(top.map((index, i) => [index, i + 1]));
  const isos = DAYS.map((d) => d.iso);
  const data = {
    person,
    people,
    myVotes,
    counts,
    wave,
    top,
    rank,
    anyVotes: counts.some((c) => c.love || c.ok || c.no),
    nameOf: shortNamer(s.people.map((p) => p.name)),
    myCount: countVoted(myVotes, isos),
    monthCounts: MONTHS.map((m) => countVoted(myVotes, m.days.map((d) => d.iso))),
  };
  cache = { people: s.people, overlay: s.overlay, meId: s.meId, data };
  return data;
}

function withSelection(s, d) {
  const selected = s.selected ?? d.top[0] ?? 0;
  let phoneMonth = s.phoneMonth;
  if (phoneMonth === null) {
    // Pick the phone's month once (the best day's month) and keep it. Following
    // the best day live would flip the month under someone's finger mid-drag.
    phoneMonth = defaultMonthIndex(MONTHS, DAYS, d.top);
    update({ phoneMonth });
  }
  return { ...d, selected, phoneMonth };
}

function desktopPage(s, d) {
  return html`
    <div class="page page-main">
      <div class="main-wrap">
        ${desktopHeader(s, d)}

        <div class="help-row">
          ${s.help ? helpColumnTop() : ''}
          <div class="help-row-main">${hero(s, d, false)}</div>
        </div>

        <div class="main-cols">
          <div class="main-col">
            <section class="cal-section" aria-labelledby="cal-title">
              <div class="help-row">
                ${s.help ? helpNotesCalendar() : ''}
                <div class="help-row-main">${calendarControls(s, d)}</div>
              </div>
              ${calendarMonths(s, d)}
            </section>

            <section class="chart-section" aria-labelledby="chart-title">
              <div class="help-row">
                ${s.help ? helpNoteChart() : ''}
                <div class="help-row-main">${chartHeading(false)}</div>
              </div>
              ${chart(s, d)}
            </section>
          </div>

          <div class="side-col">
            ${s.help ? helpNoteHistory() : ''}
            ${history(s, d, false)}
          </div>
        </div>
      </div>
      ${toast(s)}
    </div>`;
}

function phonePage(s, d) {
  return html`
    <div class="page page-phone">
      ${phoneHeader(s, d)}
      ${s.help ? phoneHelp() : ''}
      ${hero(s, d, true)}
      ${phoneCalendar(s, d)}
      ${phoneChart(s, d)}
      ${history(s, d, true)}
      ${toast(s)}
    </div>`;
}

export function mainView(s) {
  const d = withSelection(s, derive(s));
  return s.isPhone ? phonePage(s, d) : desktopPage(s, d);
}
