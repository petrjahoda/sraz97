// Who is using this browser. Everyone shares one Firebase account, so a person
// is identified by a hash of the e-mail they typed. The e-mail itself is never stored.

const STORAGE_KEY = 'sraz97.me';

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// First 20 hex characters of SHA-256 of the trimmed, lowercased e-mail.
export async function personIdFromEmail(email) {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 20);
}

// localStorage can throw (private mode, blocked storage); treat that as "not saved".
export function loadMe() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved.personId === 'string' ? saved.personId : null;
  } catch {
    return null;
  }
}

export function saveMe(personId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ personId }));
  } catch {
    // Without storage the person just has to log in again next time.
  }
}

export function clearMe() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
