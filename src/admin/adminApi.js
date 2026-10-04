import { request, JSON_HEADERS } from '../api';

const TOKEN_KEY = 'adminToken';

// The login token is kept in sessionStorage: it survives a page refresh,
// but is forgotten when the tab is closed (safer on a shared computer than
// localStorage, which would keep it until it expires).
export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore storage errors. The dashboard still works until a refresh.
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage errors.
  }
}

// POST /api/admin/login returns { token } when the username and password
// are right, or a plain-text error ("Invalid username or password.").
export async function adminLogin(username, password) {
  const data = await request('/api/admin/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ username, password }),
  });
  return data.token;
}

// Same as request(), but sends the login token on every call. With no token
// it fails right away with status 401, exactly like an expired one would,
// so the dashboard can send the admin back to the login screen.
export async function adminRequest(path, options = {}) {
  const token = getToken();
  if (!token) {
    const err = new Error('Please log in again.');
    err.status = 401;
    throw err;
  }
  return request(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
}

// Translates one score row from the backend's snake_case into the camelCase
// shape the dashboard uses.
function mapScoreRow(row) {
  return {
    id: row.id,
    judgeId: row.judge_id,
    judgeCode: row.judge_code,
    judgeName: `${row.judge_first_name.trim()} ${row.judge_last_name.trim()}`,
    category: row.category,
    presentationNumber: row.presentation_number,
    timeSlot: row.time_slot,
    room: row.room,
    session: row.session,
    discipline: row.discipline,
    criteria: row.criteria,
    openEndedAnswers: row.open_ended_answers,
    includesAbstract: row.includes_abstract,
    total: row.total,
    submittedAt: row.submitted_at,
  };
}

// Every score, newest first.
export async function getAllScores() {
  const rows = await adminRequest('/api/scores');
  return rows.map(mapScoreRow);
}

// PUT /api/scores/:id corrects a score. The server recalculates the total
// from the ratings. `presentation` is optional: pass
// { presentation_number } (Poster-style) or { time_slot, room, session }
// to move this one score to a different presentation. Returns the full
// updated score.
export async function updateScore(id, { criteria, openEndedAnswers, includesAbstract, presentation }) {
  const row = await adminRequest(`/api/scores/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      criteria,
      open_ended_answers: openEndedAnswers,
      includes_abstract: includesAbstract,
      presentation,
    }),
  });
  return mapScoreRow(row);
}

// DELETE /api/scores/:id removes one score for good.
export async function deleteScore(id) {
  return adminRequest(`/api/scores/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// GET /api/workload: every judge with their score counts per category and
// whether they've finished. The backend already sends this in the shape
// the dashboard uses, so there's nothing to translate.
export async function getWorkload() {
  return adminRequest('/api/workload');
}

// PUT /api/judges/:id fixes a judge's name. The code never changes.
export async function renameJudge(id, firstName, lastName) {
  const row = await adminRequest(`/api/judges/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  });
  return { firstName: row.first_name, lastName: row.last_name };
}


// GET /api/leaderboard: every scored presentation ranked per category.
// The backend already sends this in the shape the dashboard uses.
export async function getLeaderboard() {
  return adminRequest('/api/leaderboard');
}


// GET /api/export/excel returns an .xlsx file, not JSON, and a plain
// download link can't send the login token. So the page asks for the file
// itself (with the token) and then hands it to the browser as a download.
// Returns the file name.
export async function downloadExcelExport() {
  const token = getToken();
  if (!token) {
    const err = new Error('Please log in again.');
    err.status = 401;
    throw err;
  }

  let res;
  try {
    res = await fetch('/api/export/excel', { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }

  if (!res.ok) {
    let message = 'Something went wrong on the server. Please try again in a moment.';
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      message = 'The server is not responding right now. Please try again in a moment.';
    } else {
      // The backend's own errors are short plain text. Anything empty or
      // that looks like a web page gets the generic message above.
      const text = await res.text();
      if (text.trim() && !text.trim().startsWith('<')) message = text;
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : 'symposium_scores.xlsx';

  // Turn the file into a temporary link and click it, then clean up.
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return filename;
}

// How much data a reset would delete, shown in the Danger Zone so the
// admin sees exactly what is about to go.
export async function getDataCounts() {
  const [scores, judges, presentations] = await Promise.all([
    adminRequest('/api/scores'),
    request('/api/judges'),
    request('/api/presentations'),
  ]);
  return { scores: scores.length, judges: judges.length, presentations: presentations.length };
}

// DELETE /api/scores/reset-all wipes every score, judge and presentation
// (in that order, because scores point at the other two). The settings and
// the admin account are not touched. Returns the counts that were deleted:
// { scoresDeleted, judgesDeleted, presentationsDeleted }.
export async function resetAllData() {
  return adminRequest('/api/scores/reset-all', { method: 'DELETE' });
}


// PUT /api/config replaces the whole configuration. The server checks it and
// refuses a change that would break existing data, replying with a
// plain-text reason. Returns the saved config.
export async function saveConfig(config) {
  const row = await adminRequest('/api/config', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ config }),
  });
  return row.config;
}

// What the existing data already uses, so the editor can lock the settings
// that can't change safely: categories and time slots that presentations
// refer to by name, and disciplines in use.
export async function getUsage() {
  const presentations = await request('/api/presentations');
  return {
    categories: [...new Set(presentations.map((p) => p.category))],
    timeSlots: [
      ...new Set(presentations.filter((p) => p.time_slot).map((p) => `${p.category}|${p.time_slot.trim()}`)),
    ],
    disciplines: [...new Set(presentations.filter((p) => p.discipline).map((p) => p.discipline.trim()))],
  };
}