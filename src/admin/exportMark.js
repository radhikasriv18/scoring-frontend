// Remembers whether an Excel export has been downloaded from this browser
// tab, so the Danger Zone can warn if it hasn't. Kept in sessionStorage
// like the login token: it's forgotten when the tab closes.

const KEY = 'lastExportAt';

export function markExported() {
  try {
    sessionStorage.setItem(KEY, new Date().toISOString());
  } catch {
    // Ignore storage errors. The only effect is a missing reminder.
  }
}

export function getLastExport() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}