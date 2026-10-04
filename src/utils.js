// Shared helper functions — ported directly from the old index.html.
// These are pure logic (no Supabase, no localStorage) and work exactly
// the same here as before — just explicitly exported now, instead of
// living as globals in one giant script tag.

export function getJudgeFullName(judge) {
  return `${judge.firstName.trim()} ${judge.lastName.trim()}`;
}

// Name-based lookup: scores store category.name (a string), not the id.
export function getCategoryConfig(config, categoryName) {
  return config.categories.find((c) => c.name === categoryName) || null;
}

// Id-based lookup: used throughout the in-progress scoring flow, where
// currentEntry.category holds the config category's stable id.
export function getCategoryConfigById(config, categoryId) {
  return config.categories.find((c) => c.id === categoryId) || null;
}

export function getScaleValues(rubric) {
  const values = [];
  for (let v = rubric.scaleMin; v <= rubric.scaleMax; v++) values.push(v);
  return values;
}

// The criteria list actually in play for an entry. The abstract criterion
// only joins the list when the category offers it AND the judge said this
// presentation has one.
export function getEffectiveCriteria(categoryConfig, entry) {
  if (categoryConfig.hasAbstractOption && entry.includesAbstract) {
    return [...categoryConfig.rubric.criteria, categoryConfig.abstractCriterion];
  }
  return categoryConfig.rubric.criteria;
}

// Used by Poster-style categories (identified by presentation number).
export function validatePresentationNumber(categoryConfig, input, allScores, judgeName) {
  if (!categoryConfig) {
    return { error: "This category is no longer available." };
  }
  const trimmed = input.trim();
  if (trimmed === "" || isNaN(Number(trimmed)) || !Number.isInteger(Number(trimmed))) {
    return { error: "Please enter a whole number." };
  }
  const num = Number(trimmed);
  if (num < 1 || num > categoryConfig.maxPresentationNumber) {
    return { error: `Presentation number must be between 1 and ${categoryConfig.maxPresentationNumber}.` };
  }
  const alreadySubmitted = allScores.some(
    (s) => s.judgeName === judgeName && s.category === categoryConfig.name && s.presentationNumber === String(num)
  );
  if (alreadySubmitted) {
    return { error: `You already submitted a score for ${categoryConfig.name} #${num}.` };
  }
  return { value: String(num) };
}

// Sibling to validatePresentationNumber, for categories identified by time
// slot instead of a number (this event's Oral/Video). Also considers
// room/session when present, so a future event with parallel rooms
// sharing the same time label is still checked correctly.
export function checkTimeSlotAlreadySubmitted(categoryConfig, timeSlotLabel, room, session, allScores, judgeName) {
  const alreadySubmitted = allScores.some(
    (s) =>
      s.judgeName === judgeName &&
      s.category === categoryConfig.name &&
      s.timeSlot === timeSlotLabel &&
      (s.room || '') === (room || '') &&
      (s.session || '') === (session || '')
  );
  if (alreadySubmitted) {
    return { error: `You already submitted a score for ${categoryConfig.name} — ${timeSlotLabel}.` };
  }
  return { ok: true };
}

// Discipline must stay consistent across judges, so once any judge has
// recorded one for a (category, identifier) pair, every later judge
// scoring that same presentation is locked to it. "identifier" is a
// presentation number for Poster-style categories, or a time slot label
// for time-slot categories — the caller passes whichever applies.
export function findExistingDiscipline(allScores, categoryName, identifier) {
  const match = allScores.find(
    (s) =>
      s.category === categoryName &&
      (s.presentationNumber === String(identifier) || s.timeSlot === identifier)
  );
  return match && match.discipline ? match.discipline : null;
}

// Whenever a judge edits the presentation number after discipline was
// already resolved, the lock must be re-checked against the new number.
export function resolveDisciplineOnNumberChange(allScores, categoryConfig, currentDiscipline, newPresentationNumber) {
  const found = findExistingDiscipline(allScores, categoryConfig.name, newPresentationNumber);
  if (found && found !== currentDiscipline) {
    return { discipline: found, notice: `Discipline updated to ${found} for this presentation.` };
  }
  return { discipline: currentDiscipline, notice: null };
}