import { get, set, remove, KEYS } from './storage.js';

export function setSession(userId) {
  set(KEYS.SESSION, { userId });
}

export function clearSession() {
  remove(KEYS.SESSION);
}

export function getCurrentUser() {
  const session = get(KEYS.SESSION);
  if (!session) return null;
  const users = get(KEYS.USERS) || [];
  return users.find(u => u.id === session.userId) || null;
}

export function requireSession() {
  if (!getCurrentUser()) {
    window.location.href = 'index.html';
  }
}