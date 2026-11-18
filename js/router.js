// Hash routes, friendly to GitHub Pages: #/prihlaseni, #/jmeno, #/.
const ROUTE_BY_HASH = { '#/prihlaseni': 'login', '#/jmeno': 'name', '#/': 'main' };
export const HASH_BY_ROUTE = { login: '#/prihlaseni', name: '#/jmeno', main: '#/' };

export function routeFromHash() {
  return ROUTE_BY_HASH[location.hash] || 'main';
}

export function go(route) {
  if (location.hash !== HASH_BY_ROUTE[route]) location.hash = HASH_BY_ROUTE[route];
}
