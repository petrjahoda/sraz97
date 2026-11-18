# Sraz po 30 rokách — implementation handoff

**For:** Claude Code
**Goal:** build a fully working site for a class reunion (Maturita 1997), hosted on **GitHub Pages**, with **Firebase** (Auth + Cloud Firestore) for login and shared live data.
**Language of the site:** Czech, relaxed colloquial tone with a light Moravian touch (exact copy in §9 — use it verbatim).
**Design source:** `design/` folder (four reference screens, see §3). Match them closely.

> Suggested first prompt in Claude Code:
> *"Read `handoff/HANDOFF.md` and the files in `handoff/design/`, then implement the site in this repo exactly as specified. Ask me only about the open items in §15."*

---

## 1. What the site does (product summary)

Classmates want to find the best day to meet between **1 May and 31 July 2027**.

1. A classmate logs in with **their own e-mail + one shared password** (same for everyone, sent in the invitation).
2. On first login they enter their **name** (+ optional maiden name) and pick **how Czech grammar should refer to them** (*naklikala* vs *naklikal*).
3. On the main page they mark days with a "pen":
   - **Hodí se mi** (works for me, green circle)
   - **Šlo by to** (could work, dashed orange circle)
   - **Nemůžu** (can't, crossed out, light red)
   - **Guma** (eraser)
   They can click single days, **drag across many days**, use **one-click fills** (all weekends, all Fri–Sun, all weekdays, everything) and on phones a **from–to range** mode.
4. Everyone sees, **live**:
   - a **wave** (smoothed curve) of how good each day is + the **top 3 days**,
   - a **stacked histogram** (green/orange/red per day) with a tooltip listing names,
   - a **history log** ("Třídní kniha") of who changed what.
5. Users can **revote** any time. Help notes ("Jak na to") can be shown/hidden.

---

## 2. Tech stack & hard constraints

- **Static only**: GitHub Pages serves files; there is no server of our own. All dynamic behaviour = browser JS + Firebase.
- **No build step.** Plain HTML + CSS + native ES modules. The owner must be able to edit `js/config.js` and push. (A GitHub Actions build is *not* wanted.)
- **Firebase Web SDK (modular)** loaded as ES modules from the official CDN, e.g. `https://www.gstatic.com/firebasejs/<VERSION>/firebase-app.js`, `firebase-auth.js`, `firebase-firestore.js`. **Look up the current stable version when implementing** and pin it in one place.
- No other runtime dependencies required. If you want templating, `lit-html` from a CDN as an ES module is acceptable; otherwise vanilla DOM with a tiny `h()` helper.
- Fonts: Google Fonts **Caveat** (700) and **Kalam** (400, 700). Both support Czech diacritics.
- Routing: **hash routes** (GitHub Pages friendly): `#/prihlaseni`, `#/jmeno`, `#/` (main).
- Add an empty `.nojekyll` file.
- Must work in current Chrome, Safari (incl. iOS), Firefox, Edge. Must work on a 360–390 px wide phone.
- Pure logic (dates, Czech grammar, wave, top‑3, log text) goes in modules that can be unit-tested with `node --test` (no browser).

### Suggested repo layout
```
/index.html
/.nojekyll
/css/style.css
/js/config.js          ← owner edits this (Firebase config, shared account e-mail, organizer contact)
/js/firebase.js        ← init, auth helpers, Firestore helpers
/js/store.js           ← app state, subscriptions, derived data
/js/cz.js              ← Czech helpers: plural, dates, vocative, relative time, log sentences
/js/model.js           ← counts, score, wave, top-3 (pure)
/js/views/login.js
/js/views/name.js
/js/views/main.js      ← composes: header, help, hero (wave+top3), calendar, chart, history
/js/views/*.js         ← components as you see fit
/firestore.rules
/tests/*.test.js       ← node --test for cz.js and model.js
/README.md             ← owner setup guide (§12), in English
/handoff/              ← this folder (keep it)
```

---

## 3. Design reference files (`design/`)

| File | Screen | Route | Notes |
|---|---|---|---|
| `F1_Prihlaseni.dc.html` | Login | `#/prihlaseni` | desktop, centered two-column; stacks on phone |
| `F2_Jmeno.dc.html` | Name step ("Kdo seš?") | `#/jmeno` | single column |
| `F3_Hlavni.dc.html` | Main page, desktop | `#/` | the final layout |
| `F4_Mobil.dc.html` | Main page, phone (390 px) | `#/` under 720 px | the phone layout |

**How to read them:** they are "Design Component" files from a design tool, not runnable pages. Markup inside `<x-dc>` is plain HTML with inline styles (copy the styles), plus:
- `{{name}}` = value computed in the script's `renderVals()`; `{{a.b}}` = property lookup.
- `<sc-for list="{{items}}" as="x">…</sc-for>` = loop; `<sc-if value="{{flag}}">…</sc-if>` = conditional.
- `onClick="{{fn}}"` etc. = event handlers returned from `renderVals()`.
- The `<script type="text/x-dc">` at the bottom contains **reference logic** (wave smoothing, top‑3, cell states, paint/drag, range mode, Czech log texts). Port the algorithms; **drop the sample-data generator** (`data()` → `names`, `votes`, `initMe`) and the hard-coded `baseLog` — the real app starts empty and reads Firestore.
- Ignore `<script src="./support.js">`, `data-props`, `hint-*` attributes.

The human-viewable design canvas (owner only): https://claude.ai/artifact/2ED18ZnWYcKaz1ABhBHPLS

---

## 4. Authentication model (shared password)

- In Firebase Auth there is **exactly one** Email/Password user: the **shared class account** (e.g. `sraz97@example.com`, any address, it never receives mail). Its password = the shared password from the invitation.
- Login form asks for **the classmate's own e-mail** + **the shared password**.
  - Call `signInWithEmailAndPassword(auth, SHARED_ACCOUNT_EMAIL, password)`. The typed e-mail is **not** used for Firebase Auth.
  - The typed e-mail is the person's identity: `personId = first 20 hex chars of SHA-256(email.trim().toLowerCase())` (use `crypto.subtle`). **Do not store the e-mail itself anywhere in Firestore.** Store `{ personId }` in `localStorage` key `sraz97.me`.
- After sign-in: if `people/{personId}` exists → `#/`; otherwise → `#/jmeno`.
- Auth persistence: default browser-local persistence (stay logged in).
- **Log out** (`odhlásit`): `signOut(auth)`, remove `sraz97.me`, go to `#/prihlaseni`.
- Route guard: no Firebase user or no `sraz97.me` → `#/prihlaseni`; user but no `people` doc → `#/jmeno`.
- Known, accepted trade-off: anyone with the password could technically write someone else's votes. Every change is visible in the history log. Document this in the README.
- Firestore rules additionally require `request.auth.token.email == SHARED_ACCOUNT_EMAIL`, so other auth users (if ever created) can't access data.

---

## 5. Data model (Cloud Firestore)

### `people/{personId}`
```js
{
  name: "Martina Nováková",     // required, 2–80 chars, trimmed
  maiden: "Svobodová",          // "" if not given, ≤ 60 chars
  gender: "f",                  // "f" | "m" — only for Czech verb endings
  votes: {                      // keys are ISO dates within 2027-05-01..2027-07-31
    "2027-06-19": "love",       // "love" | "ok" | "no"; missing key = no vote
    "2027-06-26": "no"
  },
  createdAt: <serverTimestamp>,
  updatedAt: <serverTimestamp>
}
```
Writing votes: `updateDoc(ref, new FieldPath('votes', '2027-06-19'), 'love', 'updatedAt', serverTimestamp())`; clearing uses `deleteField()`. For multi-day changes pass several field/value pairs in one `updateDoc`. Always use `FieldPath` for the date keys.

### `log/{autoId}`
```js
{
  personId: "3fa1…",
  name: "Martina Nováková",   // snapshot at time of action
  gender: "f",
  text: "naklikala 4 dny (Út 1. 6. – Pá 4. 6.)",   // sentence AFTER the name, see §8
  chips: [{ kind: "love" }] | [{ kind: "love", count: 9 }, …] | [],
  at: <serverTimestamp>
}
```
Each user gesture (click, drag, fill, range) = **one** `writeBatch`: the `people` update + one `log` doc.

### Subscriptions (main page)
- `onSnapshot(collection(db, 'people'))` → full recompute (≈30 docs; trivial).
- `onSnapshot(query(collection(db, 'log'), orderBy('at', 'desc'), limit(30)))`.
- Rely on Firestore latency compensation for instant UI after writes. During a drag, keep a local overlay of the painted days and write once on release.
- Quota check: ~30 people × a few sessions/day is far under the free tier (50k reads / 20k writes per day). Don't add polling.

### `firestore.rules`
Replace `SHARED_ACCOUNT_EMAIL` with the real (lowercase) address.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isClass() {
      return request.auth != null
        && request.auth.token.email == 'SHARED_ACCOUNT_EMAIL';
    }

    match /people/{personId} {
      allow read: if isClass();
      allow create, update: if isClass()
        && request.resource.data.keys().hasOnly(['name', 'maiden', 'gender', 'votes', 'createdAt', 'updatedAt'])
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 2
        && request.resource.data.name.size() <= 80
        && request.resource.data.maiden is string
        && request.resource.data.maiden.size() <= 60
        && request.resource.data.gender in ['f', 'm']
        && request.resource.data.votes is map
        && request.resource.data.votes.size() <= 92;
      allow delete: if false;
    }

    match /log/{entryId} {
      allow read: if isClass();
      allow create: if isClass()
        && request.resource.data.keys().hasOnly(['personId', 'name', 'gender', 'text', 'chips', 'at'])
        && request.resource.data.text is string
        && request.resource.data.text.size() <= 200
        && request.resource.data.at == request.time;
      allow update, delete: if false;
    }
  }
}
```
(Vote *values* can't be iterated in rules; validate them in the client.)

---

## 6. Dates & domain rules

- Range: **2027-05-01 … 2027-07-31 = 92 days**. Put `START`, `END` in `config.js`; everything else derives from them.
- Build dates in **UTC** (`Date.UTC`) to avoid DST shifts; keys are `YYYY-MM-DD`.
- Weeks start on **Monday**. Day abbreviations: `Po Út St Čt Pá So Ne`.
- Month names: nominative `Květen, Červen, Červenec`; genitive `května, června, července`; locative `v květnu, v červnu, v červenci`; accusative "whole" `celý květen, celý červen, celý červenec`.
- Day labels:
  - short: `So 19. 6.`
  - full: `Sobota 19. června` (capitalised weekday + day + genitive month)
- Weekend = Sat, Sun (weekend day numbers are bold in the calendar).
- **Score** of a day: `love + 0.5·ok − no` (counting all people).
- **Czech plural of "day":** `1 den`, `2–4 dny`, `0` and `5+ dní`. Where a count of 0 is shown as text use `zatím nic`.

---

## 7. Screens & behaviour

### 7.1 Login — `#/prihlaseni` (F1)
Left: title, red squiggle underline, subtitle, small decorative wave doodle with label "tady se sejdem!", 3-step list. Right: paper card (slight −0.6° rotation) with the form.
- Fields: e-mail (`type=email`, `autocomplete=email`), password (`type=password`, `autocomplete=current-password`).
- Button "Jdu dovnitř →". While signing in: disabled, text "Moment…".
- Errors (shown under the button in red pen colour `#B02E24`):
  - empty e-mail → "Napiš svůj e-mail."
  - invalid e-mail → "Tenhle e-mail nějak nesedí."
  - empty password → "Napiš heslo z pozvánky."
  - wrong password (`auth/invalid-credential`, `auth/wrong-password`) → "Heslo nesedí. Mrkni do pozvánky."
  - too many attempts (`auth/too-many-requests`) → "Moc pokusů. Dej si chvilku pauzu a zkus to znova."
  - network → "Nejde se připojit. Zkus to za chvilku."
- Footer line uses `ORGANIZER_CONTACT` from config.

### 7.2 Name step — `#/jmeno` (F2)
Progress row (✓ přihlášení · 2 kdo seš · 3 naklikat dny), heading, card with:
- "Jméno a příjmení" (required) and "Příjmení za svobodna (nepovinné)".
- Radio cards (`<input type=radio>` inside `<label>`): "{Křestní} naklikala — jsem ženská" / "{Křestní} naklikal — jsem chlap", where {Křestní} = first word of the typed name (fallback "Ty").
- Live preview (yellow sticky note): "{display} naklikal(a) So 19. 6." + green chip "Hodí se mi". `display = name + (maiden ? ", roz. " + maiden : "")`.
- Button "Hotovo, jdem na to →": validate (name ≥ 2 chars → else "Napiš, jak se jmenuješ."; gender chosen → else "Vyber, jak o tobě máme psát."), then:
  - new person: create `people` doc with `votes: {}` + log `join`;
  - existing person (came via "změnit jméno"): prefill, update name/maiden/gender + log `rename`.
  - go to `#/`.

### 7.3 Main page — `#/` desktop/tablet (F3)
Paper background (grid 24 px), red margin line at left (x = 56 px), content padding-left 88 px.

**Header:** title "Sraz po 30 rokách!", squiggle, subtitle with live count of `people` docs. Right side: help toggle pill ("Jak na to?" ↔ "Už vím, schovat") and the yellow name sticky: "čau," / **"{vocative}!"** (§8) / links "změnit jméno" (→ `#/jmeno`) and "odhlásit".

**Help notes ("Jak na to")** — when visible, a 200 px column with a red right border appears to the left of: the hero (note 1), the calendar header (notes 2+3), the chart header (note 4); note 5 sits above the history column. Small "schovat ✕" at the top of the column. Persist in `localStorage` key `sraz97.help` (`"1"`/`"0"`); default **visible** on first visit. **The three months must still fit side by side at 1440 px when help is open** — that's why notes sit beside section *headers*, while the month grid and the chart span the full main-column width below them.

**Hero — "Kdy to vychází nejlíp"** (white card):
- Left: the **wave** (SVG, `viewBox="0 0 92 100" preserveAspectRatio="none"`, height 150 px): area fill `#1E3A8A` @ 8 % + 3 px line `#1E3A8A` with `vector-effect: non-scaling-stroke`; red-ringed white dots at the top‑3 days; a dashed red vertical line at the **selected day**; month labels below (Caveat, separated by 2 px ink lines).
- Right: "Zatím nejlíp vychází:" + 3 cards (rank "1." in red Caveat, full date, "hodí se: n · šlo by: n · nemůže: n"); card #1 has yellow background. Clicking a card selects that day.
- Empty state (no votes yet): flat wave, cards replaced by "Až někdo něco naklikne, ukážou se tu nejlepší dny."

**"A kdy můžeš ty?"** section:
- Subtitle: "Máš naklikáno: {N dní} · ukládá se to samo, neboj".
- Pen row "Vem si pero:" — 4 buttons with `aria-pressed`; each shows a 28 px sample mark with "19" drawn in that pen's style. Default pen: **Hodí se mi**.
- Yellow tip box with a drag icon: "Víc dní naráz? Podrž myš a táhni přes dny. Na mobilu přejeď prstem do strany." While dragging, show live counter in red: "Značíš 4 dny: Hodí se mi" / "Mažeš 4 dny".
- Fill links: "Nebo to vyplň naráz:" všecky víkendy · všecky pátky až neděle · všecky všední dny · úplně všecko (whole range).
- Calendar: **all three months side by side** (`grid-template-columns: repeat(auto-fit, minmax(min(280px,100%),1fr))`, gap 28 px). Per month: Caveat month name + "máš: {N dny|zatím nic}", weekday header, 7-column grid of **40 px circular buttons**:

| state | border | background | text |
|---|---|---|---|
| none | transparent | transparent | `#22304D` |
| love | 2px solid `#1F7A45` | transparent | `#17703C` |
| ok | 2px **dashed** `#E39A1E` | transparent | `#7A4A00` |
| no | none | `#FBE1DC` | `#9B2C1C`, `line-through` 2px |

  Top‑3 days get a small red Caveat "1." / "2." / "3." at the top-right. The selected day gets a 2 px dotted ink outline. The range anchor (mobile) gets a red outline.

**Interaction rules (exact):**
1. **Click / tap / Enter / Space on a day**: pen = Guma → clear; day already has the pen's value → clear (toggle); otherwise set. One write + one log entry.
2. **Drag painting:** `pointerdown` on a day decides the value *v* using rule 1 for that first day; while the pointer is down, every day the pointer **enters** gets *v* (local overlay, instant visual). On `pointerup` (listen on the page), `pointerleave` / `pointercancel` of the calendar → commit once (one batch, one log entry). Implementation details that matter:
   - In `pointerdown`, call `e.target.releasePointerCapture(e.pointerId)` (touch has implicit capture; without releasing it, `pointerenter` never fires on other cells).
   - Calendar container and day buttons: `touch-action: pan-y` (horizontal finger drag paints, vertical swipe still scrolls) and `user-select: none`.
   - Ignore the synthetic `click` that follows the `pointerup` of a paint gesture (e.g. if it arrives within 400 ms of commit).
3. **Hover** a day (no drag in progress) → it becomes the selected day (updates tooltip + wave marker).
4. **Fills** apply the current pen to every matching day in the whole range (Guma clears). If the fill would **clear ≥ 10 marked days**, ask inline first: "Fakt smazat {N dní}? [Jo, smazat] [Ne]". No `window.confirm`.
5. **Range mode** (phone; optional on desktop): toggle "Od–do"; first tap sets the anchor ("Ťukni na první den." → "Teď ťukni na poslední den."), second tap applies the current pen to the inclusive range, then the anchor resets. While range mode is on, dragging is disabled.

**"Kdo může kdy" chart:**
- 92 bars, each a column split into stacked segments from the bottom: green `#1F7A45` (love), orange `#F0B23E` (ok), red `#E06650` (no), opacity .92, 1.5 px gaps. Plot height 200 px; px per vote `U = min(5, 180 / peopleCount)`.
- Bars are grouped per month (`flex: <days> 1 0`) so x positions match the wave's 0–92 coordinate system; month labels below with 2 px ink separators.
- Hovering (desktop) or tapping (touch) a bar selects the day. Selected bar column gets background `rgba(30,58,138,.10)`.
- **Tooltip** = yellow sticky note `#FFF2A6`, rotated −1.2°, 340 px wide, placed beside the selected bar (to the right if x ≤ 55 %, else to the left), top-aligned: heading = full date (Caveat), then three rows with coloured dots: "Hodí se ({n}): names", "Šlo by to ({n}): …", "Nemůžou ({n}): …". Names sorted with `localeCompare(x, 'cs')`; the current user appended as "{short name} (ty)"; empty group → "nikdo". Default selected day = top‑1 (or today-ish first day if no votes).
- **Short names** (chart, history): first name + first letter of the last word + "." (e.g. "Martina N."). If two people would get the same short name, use full names for those two.

**"Třídní kniha" (history)** — right column (300 px) on ≥1100 px; below the main column on 720–1099 px:
- Paper card rotated 0.5°, heading + "kdo co udělal, nejčerstvější nahoře".
- Latest 8 entries: short name (Caveat 28 px, ink), relative time (§8) right-aligned, sentence, chips (outlined pills: border = pen colour, text = pen text colour; label "Hodí se mi" / "Šlo by to" / "Nemůžu", or with count "9× hodí se", "5× šlo by", "4× nemůžu").
- Empty state: "Zatím prázdno. Buď první!"
- Footer link "Stáhnout tabulku (CSV)" (§11).

### 7.4 Main page — phone < 720 px (F4)
Single column, 16 px side padding, order:
1. Header: title (Caveat 38), "Maturita ’97 · ozvalo se {N} z nás", name sticky ("čau," / "{vocative}!" / "odhlásit"). When help is hidden, a "? Jak na to?" pill under the header.
2. Help card (yellow): "Jak na to" + "Už vím, schovat ✕" + 4 numbered steps (§9).
3. Wave card (height 96 px) + "Zatím nejlíp vychází:" with 3 stacked full-width cards (min-height 56 px).
4. "A kdy můžeš ty?" + "Máš naklikáno…", "Vem si pero:" pens in a **2×2 grid** (min-height 52 px), range toggle switch (full width, dashed border), month tabs **Květen / Červen / Červenec** (3 equal buttons, one month visible, default = month of top‑1 day or June), calendar with **46 px** circles, drag tip "Přejeď prstem do strany přes týden a označí se celý.", live counter, horizontal-scroll fill chips "Naráz: Víkendy · Pá–Ne · Všední dny · Celý měsíc" (apply to the **visible month** only).
5. "Kdo může kdy" + "Ťukni na sloupeček, do strany posouvej prstem." Chart in a horizontally scrollable box (inner width 736 px, height 130 px, U = 4); bars are `<button>`s with aria-labels. The tooltip becomes a **static** yellow panel under the chart.
6. History: 4 latest + "Ukázat celou knihu" (expands to 30).

---

## 8. Czech language helpers (`js/cz.js`)

### Verb endings
Gender `f` adds `a`: `naklikal|naklikala`, `smazal|smazala`, `ukázal|ukázala`, `změnil|změnila`.

### Log sentences (text stored after the name)
| action | text | chips |
|---|---|---|
| set one day | `naklikal{a} So 19. 6.` | `[{kind}]` |
| clear one day | `smazal{a} So 19. 6.` | `[]` |
| drag / range, N>1 | `naklikal{a} 4 dny (Út 1. 6. – Pá 4. 6.)` / `smazal{a} 4 dny (…)` | `[{kind}]` / `[]` |
| fill | `naklikal{a} všecky víkendy od května do července` (also `všecky pátky až neděle …`, `všecky všední dny …`, `úplně všecko`; phone month fills: `… v červnu`, `celý červen`) | `[{kind}]` |
| fill with Guma | `smazal{a} …` same objects | `[]` |
| first join | `se poprvé ukázal{a}` | `[]` |
| rename | `si změnil{a} jméno` | `[]` |

### Relative time
`< 1 min` → "teďka"; `< 60 min` → "před {m} min"; `< 2 h` → "před hodinou"; same day → "před {h} h"; yesterday → "včera"; day before → "předevčírem"; older → "{d}. {m}." (e.g. "12. 6."). Re-render once a minute.

### Vocative for the name sticky ("čau, Martino!")
Use the first word of the name. Reference implementation (unit-test it with the table below):
```js
const VOC_EXC = { pavel: 'Pavle', karel: 'Karle' };
export function vocative(first, gender) {
  const n = (first || '').trim();
  if (!n) return n;
  const low = n.toLowerCase();
  if (VOC_EXC[low]) return VOC_EXC[low];
  if (/a$/i.test(n)) return n.slice(0, -1) + 'o';                 // Martina→Martino, Honza→Honzo
  if (gender === 'f') return n;                                   // Lucie, Dagmar, Ester
  if (/[eěiíéoóuůúyý]$/i.test(n)) return n;                       // Jiří, René, Hugo
  if (/[ndt]ěk$/i.test(n)) return n.slice(0, -3) + { n: 'ň', d: 'ď', t: 'ť' }[n.slice(-3, -2).toLowerCase()] + 'ku'; // Zdeněk→Zdeňku
  if (/ek$/i.test(n)) return n.slice(0, -2) + 'ku';               // Marek→Marku, Radek→Radku
  if (/el$/i.test(n)) return n + 'i';                             // Daniel→Danieli, Marcel→Marceli
  if (/[bcčdďfghjklmnňpqrřsštťvwxzž]r$/i.test(n)) return n.slice(0, -1) + 'ře'; // Petr→Petře
  if (/(ch|[kgh])$/i.test(n)) return n + 'u';                     // Vojtěch→Vojtěchu, Dominik→Dominiku
  if (/[šžčřjcňťďszx]$/i.test(n)) return n + 'i';                 // Tomáš→Tomáši, Ondřej→Ondřeji, Max→Maxi
  return n + 'e';                                                 // Jakub→Jakube, Jan→Jane, Michal→Michale
}
```
Test table: Martina→Martino, Jana→Jano, Lucie→Lucie, Kateřina→Kateřino, Petr→Petře, Tomáš→Tomáši, Jakub→Jakube, Pavel→Pavle, Karel→Karle, Daniel→Danieli, Marek→Marku, Radek→Radku, Ondřej→Ondřeji, Jiří→Jiří, David→Davide, Michal→Michale, Libor→Libore, Vojtěch→Vojtěchu, Honza→Honzo (gender m), Zdeněk→Zdeňku, Max→Maxi. If unsure, falling back to the nominative is acceptable.

---

## 9. Copy deck (use verbatim)

**Global:** site title (`<title>`) "Sraz po 30 rokách · Maturita ’97". `<html lang="cs">`.

**F1 Login**
- H1: Sraz po 30 rokách!
- Sub: Maturita ’97 · léto 2027. Pomož nám najít den, kdy se sejdem všeci. *(“Pomož” is intentional Moravian; owner may switch to “Pomoz”.)*
- Doodle label: tady se sejdem!
- Steps: 1) přihlásíš se mailem a heslem z pozvánky, 2) napíšeš, kdo seš, 3) naklikáš, které dny ti sednou. Hotovo.
- Card H2: Pusť mě dovnitř
- Labels: Tvůj e-mail (placeholder: tvuj@email.cz) · Heslo z pozvánky
- Hint: Heslo je pro všecky stejné, najdeš ho v pozvánce.
- Button: Jdu dovnitř → (busy: Moment…)
- Footer: Nemáš pozvánku nebo nejde heslo? Napiš na {ORGANIZER_CONTACT}.
- Errors: see §7.1

**F2 Name**
- Progress: přihlášení · kdo seš · naklikat dny
- H1: Ahoj! Kdo seš?
- Sub: Ať víme, kdo co naklikal. Jméno uvidí enem děcka z naší třídy.
- Label: Jméno a příjmení (placeholder: třeba Martina Nováková)
- Label: Příjmení za svobodna (nepovinné) (placeholder: když se ti změnilo, ať tě poznáme)
- Legend: Jak o tobě máme psát?
- Options: {Křestní} naklikala — jsem ženská · {Křestní} naklikal — jsem chlap
- Preview: V třídní knize to pak bude vypadat takto:
- Button: Hotovo, jdem na to →
- Note: Jméno můžeš kdykoli změnit, nic se neztratí.
- Errors: Napiš, jak se jmenuješ. · Vyber, jak o tobě máme psát.

**F3 Main (desktop)**
- H1: Sraz po 30 rokách!
- Sub: Maturita ’97 · děcka, hledáme den, kdy se sejdem všeci. Už se ozvalo {N} z nás.
- Help toggle: Jak na to? / Už vím, schovat
- Sticky: čau, · {Vocative}! · změnit jméno · odhlásit
- Notes column header: JAK NA TO · schovat
- Note 1: **1. Tady uvidíš, kdy to zatím vychází nejlíp.** Čím výš vlna, tím víc nás dorazí. Vpravo sú tři nejlepší dny, klikni a ukážou se ti v kalendáři.
- Note 2: **2. Nejdřív si vem pero.** Zelené kolečko = hodí se, oranžové čárkované = šlo by to, přeškrtnuté = nemůžu.
- Note 3: **3. Pak klikej na dny, nebo táhni.** Podrž myš a přejeď přes víc dní, označí se všecky naráz. Když klikneš podruhé, zas to zmizí.
- Note 4: **4. Kdo přesně kdy může?** Najeď myší na sloupeček a vyskočí jména.
- Note 5: **5. Třídní kniha: kdo co kdy pozměnil. ↓**
- Hero: Kdy to vychází nejlíp · čím výš vlna, tím víc nás dorazí · Zatím nejlíp vychází: · card stats "hodí se: n · šlo by: n · nemůže: n"
- Section: A kdy můžeš ty? · Máš naklikáno: {N dní} · ukládá se to samo, neboj
- Pens: Vem si pero: · Hodí se mi · Šlo by to · Nemůžu · Guma
- Tip: **Víc dní naráz?** Podrž myš a táhni přes dny. Na mobilu přejeď prstem do strany.
- Live: Značíš {N} {dny}: {Pen} · Mažeš {N} {dny}
- Fills: Nebo to vyplň naráz: · všecky víkendy · všecky pátky až neděle · všecky všední dny · úplně všecko
- Fill confirm: Fakt smazat {N dní}? · Jo, smazat · Ne
- Month header: máš: {N dny} / máš: zatím nic
- Chart: Kdo může kdy · Najeď myší na sloupeček a uvidíš, kdo to je. · legend: hodí se · šlo by to · nemůžou
- Tooltip groups: Hodí se ({n}): · Šlo by to ({n}): · Nemůžou ({n}): · nikdo · (ty)
- History: Třídní kniha · kdo co udělal, nejčerstvější nahoře · Zatím prázdno. Buď první! · Stáhnout tabulku (CSV)
- Empty hero: Zatím je to placka. Naklikej první dny! · Až někdo něco naklikne, ukážou se tu nejlepší dny.
- Save error toast: Nepodařilo se uložit. Zkus to prosím znova.

**F4 Main (phone) — differences**
- Sub: Maturita ’97 · ozvalo se {N} z nás
- Help card: Jak na to · Už vím, schovat · steps: 1) Hned pod tím uvidíš, kdy to zatím vychází nejlíp. 2) Vem si pero: hodí se, šlo by to, nebo nemůžu. 3) Ťukej na dny. Víc dní naráz: přejeď prstem do strany, nebo zapni „od–do“. 4) Ukládá se to samo, neboj. Dycky to můžeš změnit.
- Help pill (when hidden): ? Jak na to?
- Range toggle: Od–do: ťukni na první a pak na poslední den · hints: Ťukni na první den. / Teď ťukni na poslední den.
- Drag tip: Přejeď prstem do strany přes týden a označí se celý.
- Fill chips: Naráz: · Víkendy · Pá–Ne · Všední dny · Celý měsíc
- Chart sub: Ťukni na sloupeček, do strany posouvej prstem.
- History: nejčerstvější nahoře · Ukázat celou knihu

---

## 10. Visual tokens

| token | value |
|---|---|
| ink (headings, lines) | `#1E3A8A` |
| text | `#22304D`; secondary `#3B4A6B`; muted `#4A5878` |
| red pen | strokes `#C2352B`, text `#B02E24`, note body `#8A2A20` |
| margin line | `#EFA8A8`, 2 px |
| paper | `#FBFCFE` + grid lines `#E3EBF5` every 24 px (`linear-gradient` ×2) |
| cards | `#FFFFFF` / `#FFFEF7`, border `#D5DEEA`, shadow `0 10px 24px rgba(34,48,77,.08–.10)` |
| sticky note | `#FFF2A6`; text `#5B4A00` / `#2E2A12` |
| love | `#1F7A45`, text `#17703C`, light `#E4F3E9` |
| ok | `#F0B23E`, border `#E39A1E`, text `#7A4A00`, light `#FDF0D5` |
| no | `#E06650`, border `#D45A48`, text `#9B2C1C`, light `#FBE1DC` |
| neutral border | `#C6D1E0` |
| fonts | headings/names/numbers: Caveat 700; body: Kalam 400/700 (fallback `'Segoe Print', 'Comic Sans MS', cursive`) |
| shapes | hand-drawn radii like `16px 12px 18px 12px`; stickies rotated 2°, −0.5°, −1.2° |

Breakpoints: **≥ 1100 px** F3 with history column on the right · **720–1099 px** F3 with history below · **< 720 px** F4.

---

## 11. Extras (should-have)
- **CSV export** link in the history card: builds a CSV client-side (UTF‑8 with BOM so Excel opens Czech correctly). Rows = people (full display name), columns = dates `1. 5.` … `31. 7.`, cells `hodí se` / `šlo by` / `nemůžu` / empty. Filename `sraz97-hlasovani.csv`.
- **Accessibility:** real `<button>`s; day buttons have `aria-label` like "Sobota 19. června. Tvoje volba: Hodí se mi. Všichni: hodí se 19, šlo by 2, nemůže 1."; pens use `aria-pressed`; the wave SVG is `aria-hidden`; visible focus ring; arrow keys move focus within a month grid (nice to have); respect `prefers-reduced-motion` (no rotations/transitions if set).
- **Offline/errors:** if a write fails, revert the overlay and show the save-error toast.

## 12. Owner setup guide (write this into README.md, in English, step by step)
1. Go to the **Firebase console**, create a project (Google Analytics not needed).
2. **Build → Firestore Database → Create database** (production mode, EU location).
3. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
4. **Authentication → Users → Add user**: e-mail e.g. `sraz97@example.com` (needn't exist) + the shared password (min. 6 characters; longer is better). Put that e-mail into `js/config.js` → `SHARED_ACCOUNT_EMAIL` and into `firestore.rules`.
5. **Firestore → Rules**: paste `firestore.rules`, **Publish**.
6. **Project settings → Your apps → Web (</>)** → register app → copy the `firebaseConfig` object into `js/config.js`. (This config is public by design; the password protects the data.)
7. Fill `ORGANIZER_CONTACT` in `js/config.js`.
8. **GitHub:** create a *public* repo (e.g. `sraz97`), push the files, **Settings → Pages → Deploy from a branch → `main` / root → Save**. Site: `https://<user>.github.io/sraz97/`.
9. **Firebase → Authentication → Settings → Authorized domains**: add `<user>.github.io`.
10. Optional hardening: in Google Cloud console → APIs & Services → Credentials, restrict the browser API key to HTTP referrers `https://<user>.github.io/*`.
11. Before sending invitations, delete any test data in Firestore (`people`, `log`).
12. Invitation text template (Czech) with the link and the shared password — include one in the README.

## 13. Acceptance criteria (check all before calling it done)
- [ ] Wrong password → Czech error; right password + new e-mail → `#/jmeno`; existing e-mail → `#/`.
- [ ] Reload keeps you logged in; "odhlásit" logs out and returns to login.
- [ ] Name step: preview updates live; f/m changes "naklikala/naklikal"; maiden name shows as ", roz. …".
- [ ] Clicking a day cycles exactly per rule 1; second click with the same pen clears.
- [ ] Mouse drag across 5 days paints all 5 instantly, creates **one** log entry "naklikal(a) 5 dní (…)" and **one** Firestore batch.
- [ ] On a real phone: horizontal finger drag across a week paints it; vertical swipe on the calendar still scrolls the page.
- [ ] Range mode on phone works (first/last tap, hints, red anchor).
- [ ] Fills work; Guma fill of ≥ 10 days asks for inline confirmation.
- [ ] Two browsers logged in as different e-mails see each other's votes, wave, top‑3, chart and history update within ~2 s without reload.
- [ ] Tooltip lists names correctly sorted (Czech collation), "(ty)" for the current user, "nikdo" for empty groups.
- [ ] Top‑3 and wave match the reference algorithm (unit tests in `tests/`).
- [ ] Help notes show on first visit, hide/show via both controls, state persists; three months stay side by side at 1440 px with help open.
- [ ] Layout correct at 1440, 1024, 390 and 360 px; no horizontal page scroll on phone (only the chart box scrolls).
- [ ] Czech plurals and vocative helper pass unit tests; all copy matches §9.
- [ ] Firestore rules: unauthenticated read is denied (verify in the Rules Playground or with a REST call); writes with an unexpected field are denied.
- [ ] No console errors; Lighthouse accessibility ≥ 90.

## 14. Out of scope (not now)
Per-person passwords/accounts, e-mail notifications, admin roles, a "final date is set" announcement mode, other languages.

## 15. Open items to confirm with the owner
1. Organizer contact (e-mail/phone) for the login footer.
2. Shared password and the shared account e-mail.
3. GitHub username / repo name (or a custom domain).
4. Exact wording of the class (currently "Maturita ’97") and the date range (currently 1. 5. – 31. 7. 2027).
5. Keep "Pomož" (Moravian) or use "Pomoz".
