// Logging in and out. Everyone signs in to the shared Firebase account;
// the typed e-mail only becomes a hashed person id (see identity.js).
import { signInShared, signOutShared } from './firebase.js';
import { personIdFromEmail, saveMe, clearMe } from './identity.js';
import { update, startData, stopData } from './store.js';
import { go } from './router.js';

export async function logIn(email, password) {
  const personId = await personIdFromEmail(email);
  const credential = await signInShared(password);
  saveMe(personId);
  // Set the user here too: the auth listener may fire a moment later, and the
  // route guard would otherwise bounce back to the login page.
  update({ user: credential.user, meId: personId });
  startData();
  // The app's route guard sends the person to #/jmeno or #/ once their
  // people document is known.
  go('main');
}

export async function logOut() {
  // Unsubscribe first: once signed out, live listeners would fail with permission-denied.
  stopData();
  clearMe();
  update({ meId: null, overlay: {}, painting: null, selected: null, rangeAnchor: null, confirmFill: null });
  await signOutShared();
  go('login');
}
