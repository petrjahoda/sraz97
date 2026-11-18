// The site owner edits this file. Everything else derives from it.

// Firebase console → Project settings → Your apps → Web app → firebaseConfig.
// This config is public by design; the shared password protects the data.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBEwj0zoS7BjDhW5gFZCIBMqvahiEGRnac',
  authDomain: 'sraz-97.firebaseapp.com',
  projectId: 'sraz-97',
  storageBucket: 'sraz-97.firebasestorage.app',
  messagingSenderId: '1021726907601',
  appId: '1:1021726907601:web:8c79aaa427aafdbfde79f0',
};

// The one Email/Password user in Firebase Auth, in lowercase.
// The same address must be in firestore.rules.
export const SHARED_ACCOUNT_EMAIL = 'sraz97@example.com';

// Shown in the login footer ("Napiš na …").
export const ORGANIZER_CONTACT = 'petr.jahoda@me.com';

// First and last day people can mark, inclusive, as YYYY-MM-DD.
// firestore.rules caps the number of votes per person at the number of days (92).
export const START = '2027-05-01';
export const END = '2027-07-31';
