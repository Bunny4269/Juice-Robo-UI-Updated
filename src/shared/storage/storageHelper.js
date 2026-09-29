/**
 * Generic Storage Helper
 * Provides safe JSON serialization and retrieval for localStorage & sessionStorage.
 */

export function readStorage(storage, key, fallback = null) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[Storage] Failed to write key "${key}":`, err);
  }
}

export function removeStorage(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore removal errors
  }
}

export function readLocalJson(key, fallback = null) {
  return readStorage(localStorage, key, fallback);
}

export function writeLocalJson(key, value) {
  writeStorage(localStorage, key, value);
}

export function removeLocalItem(key) {
  removeStorage(localStorage, key);
}

export function readSessionJson(key, fallback = null) {
  return readStorage(sessionStorage, key, fallback);
}

export function writeSessionJson(key, value) {
  writeStorage(sessionStorage, key, value);
}

export function removeSessionItem(key) {
  removeStorage(sessionStorage, key);
}
