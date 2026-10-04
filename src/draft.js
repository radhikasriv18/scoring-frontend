import { getCategoryConfigById } from './utils';

// A judge's in-progress score is saved on their own device (localStorage),
// separately for each judge, so a refresh or a closed tab loses nothing.
// It never goes to the server: only a finished, confirmed score does.

function keyFor(judgeId) {
  return `judgeDraft:${judgeId}`;
}

export function loadDraft(judgeId) {
  try {
    const raw = localStorage.getItem(keyFor(judgeId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(judgeId, entry) {
  try {
    localStorage.setItem(keyFor(judgeId), JSON.stringify(entry));
  } catch {
    // Ignore storage errors (e.g. private browsing). The app still works,
    // it just can't restore after a refresh.
  }
}

export function clearDraft(judgeId) {
  try {
    localStorage.removeItem(keyFor(judgeId));
  } catch {
    // Ignore storage errors.
  }
}

// Decides whether a saved draft is safe to restore. It isn't if it's
// malformed, if its category was removed from the config, or if this judge
// already submitted that same presentation (for example from another phone).
export function isDraftStillValid(draft, config, scores) {
  if (!draft || typeof draft !== 'object' || !draft.ratings || !draft.openEndedAnswers) return false;

  const categoryConfig = getCategoryConfigById(config, draft.category);
  if (!categoryConfig) return false;

  const alreadySubmitted = scores.some(
    (s) =>
      s.category === categoryConfig.name &&
      (categoryConfig.usesTimeSlots
        ? s.timeSlot === draft.timeSlot &&
          (s.room || '') === (draft.room || '') &&
          (s.session || '') === (draft.session || '')
        : s.presentationNumber === draft.presentationNumber)
  );
  return !alreadySubmitted;
}