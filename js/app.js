// Entry point: auth gate, route guard and rendering.
import { html, render } from './lib/html.js';
import { watchAuth } from './firebase.js';
import { state, update, subscribe, startData, stopData, me } from './store.js';
import { routeFromHash, HASH_BY_ROUTE } from './router.js';
import { loginView } from './views/login.js';
import { nameView } from './views/name.js';
import { mainView } from './views/main.js';

const VIEWS = { login: loginView, name: nameView, main: mainView };
const root = document.getElementById('app');

// Where the visitor may be right now; null while auth or data are still loading.
function allowedRoute(s) {
  if (!s.authReady) return null;
  if (!s.user || !s.meId) return 'login';
  if (!s.peopleLoaded) return null;
  if (!me()) {
    // Only the server can say "this person is new". A cache-only list (offline,
    // flaky signal) may simply not have them yet, and the name step would then
    // create the person again over their saved votes.
    return s.peopleFromServer ? 'name' : null;
  }
  return s.route === 'login' ? 'main' : s.route; // #/jmeno stays reachable for renaming
}

function bootScreen(s) {
  const text = s.dataError || !s.online ? 'Nejde se připojit. Zkus to za chvilku.' : 'Moment…';
  return html`<div class="boot" role="status">${text}</div>`;
}

function renderApp(s) {
  const allowed = allowedRoute(s);
  if (allowed === null) {
    render(bootScreen(s), root);
  } else if (allowed !== s.route) {
    location.replace(HASH_BY_ROUTE[allowed]);
    update({ route: allowed });
  } else {
    render(VIEWS[s.route](s), root);
  }
}

subscribe(renderApp);
window.addEventListener('hashchange', () => update({ route: routeFromHash() }));

watchAuth((user) => {
  if (user) startData();
  else stopData();
  update({ user, authReady: true });
});

update({ route: routeFromHash() });

// Keep `state` reachable from the console for debugging.
window.sraz = { state };
