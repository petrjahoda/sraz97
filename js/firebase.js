// The only module that talks to Firebase. The SDK version is pinned here.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import {
  getFirestore, collection, doc, query, orderBy, limit, onSnapshot,
  writeBatch, serverTimestamp, deleteField, FieldPath,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { FIREBASE_CONFIG, SHARED_ACCOUNT_EMAIL } from './config.js';

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

export const LOG_LIMIT = 30;

// ---- auth ----

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Everyone signs in to the same Firebase account; the typed e-mail is only
// used (hashed) to tell people apart, see identity.js.
export function signInShared(password) {
  return signInWithEmailAndPassword(auth, SHARED_ACCOUNT_EMAIL, password);
}

export function signOutShared() {
  return signOut(auth);
}

// ---- reading ----

export function watchPeople(onChange, onError) {
  return onSnapshot(collection(db, 'people'), (snap) => {
    const people = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || '',
        maiden: data.maiden || '',
        gender: data.gender === 'm' ? 'm' : 'f',
        votes: data.votes || {},
      };
    });
    onChange(people);
  }, onError);
}

export function watchLog(onChange, onError) {
  const q = query(collection(db, 'log'), orderBy('at', 'desc'), limit(LOG_LIMIT));
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((d) => {
      // 'estimate' gives a just-written entry the local time instead of null
      // until the server timestamp arrives.
      const data = d.data({ serverTimestamps: 'estimate' });
      return {
        id: d.id,
        personId: data.personId,
        name: data.name || '',
        gender: data.gender === 'm' ? 'm' : 'f',
        text: data.text || '',
        chips: Array.isArray(data.chips) ? data.chips : [],
        at: data.at ? data.at.toDate() : new Date(),
      };
    });
    onChange(entries);
  }, onError);
}

// ---- writing: every user gesture is one batch = person change + one log entry ----

function addLogEntry(batch, person, entry) {
  batch.set(doc(collection(db, 'log')), {
    personId: person.id,
    name: person.name,
    gender: person.gender,
    text: entry.text,
    chips: entry.chips,
    at: serverTimestamp(),
  });
}

export function createPerson(person, entry) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'people', person.id), {
    name: person.name,
    maiden: person.maiden,
    gender: person.gender,
    votes: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  addLogEntry(batch, person, entry);
  return batch.commit();
}

export function updatePerson(person, entry) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'people', person.id), {
    name: person.name,
    maiden: person.maiden,
    gender: person.gender,
    updatedAt: serverTimestamp(),
  });
  addLogEntry(batch, person, entry);
  return batch.commit();
}

// changes: { 'YYYY-MM-DD': 'love' | 'ok' | 'no' | null }, null clears the day.
// Date keys go through FieldPath so the dashes are never parsed as a path.
export function saveVotes(person, changes, entry) {
  const pairs = [];
  for (const [iso, value] of Object.entries(changes)) {
    pairs.push(new FieldPath('votes', iso), value === null ? deleteField() : value);
  }
  pairs.push('updatedAt', serverTimestamp());
  const batch = writeBatch(db);
  batch.update(doc(db, 'people', person.id), ...pairs);
  addLogEntry(batch, person, entry);
  return batch.commit();
}
