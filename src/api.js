// All communication with the backend lives here, so the rest of the app
// never builds a URL or calls fetch directly. Paths are relative (/api/...):
// in development Vite's proxy forwards them to the local backend, and in
// production they hit the same domain the page was served from.

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// An Error that also remembers the HTTP status, so callers can react to
// specific cases (like 409 = already scored) instead of parsing messages.
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    // fetch only throws when the request never got an answer at all
    // (offline, server down), which is common on conference wifi.
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }

  if (!res.ok) {
    // 502/503/504 mean something in front of the app (the dev proxy, or
    // Caddy in production) couldn't reach the backend. Those messages are
    // technical, so show a plain one instead.
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw httpError(res.status, 'The server is not responding right now. Please try again in a moment.');
    }

    const message = await res.text();
    // The backend's own errors are short plain text ("You already
    // submitted...", etc.), so those show as written. But if what came back
    // is empty or is a web page (for example "Cannot PUT /..." from a
    // missing route), don't show raw HTML to a judge.
    if (!message.trim() || message.trim().startsWith('<')) {
      throw httpError(res.status, 'Something went wrong on the server. Please try again in a moment.');
    }
    throw httpError(res.status, message);
  }
  return res.json();
}
// Fills in anything a saved config might be missing, so the screens never
// crash on a category that has no time slots, bullets, etc.
function normalizeConfig(config) {
  return {
    ...config,
    disciplines: config.disciplines || [],
    categories: (config.categories || []).map((c) => ({
      ...c,
      timeSlots: c.timeSlots || [],
      openEndedQuestions: c.openEndedQuestions || [],
      rubric: {
        ...c.rubric,
        criteria: (c.rubric.criteria || []).map((cr) => ({ ...cr, bullets: cr.bullets || [] })),
      },
    })),
  };
}

// GET /api/config returns { id, config } (or null if nothing is seeded yet).
export async function getConfig() {
  const row = await request('/api/config');
  if (!row || !row.config) {
    throw new Error('No configuration has been set up yet.');
  }
  return normalizeConfig(row.config);
}

// POST /api/judges creates the judge if the code is new, or returns the
// existing one. The backend uses snake_case names (first_name); the app
// uses camelCase (firstName), so this is where they get translated.
export async function signInJudge({ code, firstName, lastName }) {
  const row = await request('/api/judges', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ code, first_name: firstName, last_name: lastName }),
  });
  return { id: row.id, code: row.code, firstName: row.first_name, lastName: row.last_name };
}

// Translates one score row from the backend into the shape the screens use.
function mapScoreRow(row) {
  return {
    id: row.id,
    judgeName: `${row.judge_first_name.trim()} ${row.judge_last_name.trim()}`,
    category: row.category, // the category's NAME, e.g. "Poster"
    presentationNumber: row.presentation_number, // text like "3", or null for time-slot categories
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

// GET /api/scores?judge_id=X returns only that judge's scores. Used for
// "My Submitted Presentations" and the already-scored checks.
export async function getJudgeScores(judgeId) {
  const rows = await request(`/api/scores?judge_id=${encodeURIComponent(judgeId)}`);
  return rows.map(mapScoreRow);
}

// Submits one finished score. Two requests, in order:
//   1. find or create the presentation (the backend returns the existing
//      one if it's already there, so retrying is safe)
//   2. submit the score for that presentation
// The backend stores the category by NAME ("Poster"), not the id the
// screens use ("poster"), so the caller passes the name in.
// Returns the new score in the shape the screens use.
export async function submitScore({ judge, entry, categoryName }) {
  const presentation = await request('/api/presentations', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      category: categoryName,
      presentation_number: entry.presentationNumber,
      time_slot: entry.timeSlot,
      room: entry.room,
      session: entry.session,
      discipline: entry.discipline,
    }),
  });

  const row = await request('/api/scores', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      judge_id: judge.id,
      presentation_id: presentation.id,
      criteria: entry.ratings,
      open_ended_answers: entry.openEndedAnswers,
      includes_abstract: entry.includesAbstract,
    }),
  });

  return {
    id: row.id,
    judgeName: `${judge.firstName.trim()} ${judge.lastName.trim()}`,
    category: categoryName,
    presentationNumber: entry.presentationNumber,
    timeSlot: entry.timeSlot,
    room: entry.room,
    session: entry.session,
    discipline: entry.discipline,
    criteria: row.criteria,
    openEndedAnswers: row.open_ended_answers,
    includesAbstract: row.includes_abstract,
    total: row.total, // calculated by the server, never trusted from the browser
    submittedAt: row.submitted_at,
  };
}

// Tells the backend whether this judge has finished ALL their assigned
// presentations (true) or is going back to keep scoring (false), so the
// organizers can see who has left.
export async function setJudgeFinished(judgeId, finished) {
  return request(`/api/judges/${encodeURIComponent(judgeId)}/finished`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ finished }),
  });
}