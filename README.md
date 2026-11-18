# Sraz po 30 rokách (Maturita ’97)

A small static site where classmates pick the best day for the reunion between 1 May and 31 July 2027. Everyone logs in with their own e-mail and one shared password, marks the days that work, and sees live who can come when.

- Hosting: GitHub Pages (static files, no build step).
- Data: Firebase Authentication + Cloud Firestore, loaded from the official CDN.
- The only file you normally edit: `js/config.js`.

## Setup (step by step)

### Firebase

1. Open the [Firebase console](https://console.firebase.google.com/) and **create a project**. Google Analytics isn't needed.
2. **Build → Firestore Database → Create database.** Choose *production mode* and an EU location (e.g. `eur3` or `europe-west3`).
3. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.** (Only the first switch; "Email link" stays off.)
4. **Authentication → Users → Add user.** E-mail: any address, e.g. `sraz97@example.com`. It never receives mail. Password: the shared password from the invitation (at least 6 characters, longer is better).
   Put that e-mail, in lowercase, into `js/config.js` → `SHARED_ACCOUNT_EMAIL` **and** into `firestore.rules` (replace `SHARED_ACCOUNT_EMAIL`).
5. **Firestore Database → Rules:** paste the whole content of `firestore.rules` and click **Publish**.
6. **Project settings (gear icon) → General → Your apps → Web (`</>`)**: register an app (no Hosting needed) and copy the `firebaseConfig` object into `js/config.js` → `FIREBASE_CONFIG`.
   This config is public by design. The shared password and the rules protect the data.
7. Fill in `ORGANIZER_CONTACT` in `js/config.js` (shown on the login page: "Napiš na …").

### GitHub Pages

8. Create a **public** GitHub repository (e.g. `sraz97`), push these files, then **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**. After a minute the site is at `https://<user>.github.io/sraz97/`.
9. **Firebase → Authentication → Settings → Authorized domains → Add domain:** `<user>.github.io`. Without this the login fails on the live site.
10. Optional hardening: in the [Google Cloud console](https://console.cloud.google.com/) → APIs & Services → Credentials, open the "Browser key" of the project and restrict it to HTTP referrers `https://<user>.github.io/*` (and `http://localhost:*/*` if you want to keep testing locally).
11. Before sending invitations, delete any test data: Firestore → `people` and `log` collections → delete the documents.
12. Send the invitation (template below).

### Invitation template

> Ahoj děcka!
>
> Letos to bude 30 let od maturity, tak se sejdem. Hledáme den mezi 1. 5. a 31. 7. 2027, kdy se to hodí co nejvíc z nás.
>
> Mrkni sem: https://&lt;user&gt;.github.io/sraz97/
> Přihlas se svým mailem a tímhle heslem: **&lt;heslo&gt;**
> Pak napiš, kdo seš, a naklikej, které dny ti sednou. Zabere to dvě minuty a můžeš to kdykoli změnit.
>
> Heslo je pro všecky stejné, tak ho prosím nikam nevěšej.
>
> Těším se!
> &lt;organizátor&gt;

## Running locally

ES modules and `crypto.subtle` need `http://localhost` (not `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

`localhost` is an authorized Firebase domain by default.

Unit tests for the pure logic (dates, Czech grammar, wave, top 3, CSV) need only Node 20+:

```sh
node --test tests/
```

## Changing things

- **Dates:** `START` and `END` in `js/config.js`. Everything (calendar, wave, chart, texts like "od května do července") derives from them. If the range gets longer than 92 days, raise `votes.size() <= 92` in `firestore.rules` too.
- **Texts:** all Czech copy lives in `js/views/*.js` and `js/cz.js`.
- **Library versions:** Firebase in `js/firebase.js`, lit-html in `js/lib/html.js`.

## How login works, and the known trade-off

Firebase Auth has exactly one user: the shared class account. The login form asks for the classmate's own e-mail and the shared password, but signs in to the shared account. The typed e-mail is only hashed (SHA-256, first 20 hex characters) to tell people apart. The e-mail itself is never stored in Firestore; the browser keeps just the hash in `localStorage` (`sraz97.me`).

This means **anyone who knows the shared password could change someone else's votes** (they'd need to type that person's e-mail). For a class reunion that's an accepted trade-off: every change shows up in the "Třídní kniha" history with the name, so mischief is visible. Per-person passwords are out of scope.

The Firestore rules additionally allow access only to the shared account, so if anyone ever adds another Firebase user, it can't read or write the data.

## Project layout

```
index.html          page shell
css/style.css       all styles
js/config.js        owner settings
js/app.js           router, auth gate
js/firebase.js      Firebase init, reads and writes
js/store.js         app state and subscriptions
js/identity.js      e-mail → person id, local "who am I"
js/cz.js            Czech helpers: plurals, dates, vocative, relative time, log sentences
js/model.js         counts, score, wave, top 3, fills, names (pure)
js/csv.js           CSV export (pure)
js/paint.js         click / drag / range gestures on the calendar
js/views/*.js       screens and components
firestore.rules     security rules (paste into the console)
tests/*.test.js     node --test
handoff/            original spec and design references
```
