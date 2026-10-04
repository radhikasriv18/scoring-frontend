import { useState } from 'react';
import { getScaleValues } from '../utils';

export default function ScoreEditForm({ score, categoryConfig, styles, onSave, onCancel, saving, error }) {
  const [ratings, setRatings] = useState({ ...(score.criteria || {}) });
  const [answers, setAnswers] = useState({ ...(score.openEndedAnswers || {}) });
  const [includesAbstract, setIncludesAbstract] = useState(score.includesAbstract);

  // Which presentation this score belongs to. Poster-style scores are
  // identified by a number, Oral/Video scores by a time slot (and
  // room/session when used). The category itself can't be changed here.
  const numberBased = Boolean(score.presentationNumber);
  const [presentationNumber, setPresentationNumber] = useState(score.presentationNumber || '');
  const [timeSlot, setTimeSlot] = useState(score.timeSlot || '');
  const [room, setRoom] = useState(score.room || '');
  const [session, setSession] = useState(score.session || '');

  const rubric = categoryConfig.rubric;
  const scaleValues = getScaleValues(rubric);
  const abstractCriterion = categoryConfig.abstractCriterion || null;

  const maxNumber = categoryConfig.maxPresentationNumber;
  const trimmedNumber = presentationNumber.trim();
  const numberValid =
    trimmedNumber !== '' &&
    Number.isInteger(Number(trimmedNumber)) &&
    Number(trimmedNumber) >= 1 &&
    Number(trimmedNumber) <= maxNumber;
  const presentationValid = numberBased ? numberValid : timeSlot !== '';

  // Time slot choices come from the config. If this score's current slot
  // isn't in it any more, keep it as an extra choice so it isn't lost.
  const slotLabels = categoryConfig.timeSlots.map((slot) => slot.label);
  const slotOptions = timeSlot && !slotLabels.includes(timeSlot) ? [timeSlot, ...slotLabels] : slotLabels;
  const showRoom = Boolean(categoryConfig.usesRoom || score.room);
  const showSession = Boolean(categoryConfig.usesSession || score.session);

  // The abstract checkbox only appears when this category offers an
  // abstract (or this particular score already has one).
  const showAbstractToggle = categoryConfig.hasAbstractOption || score.includesAbstract;

  // Ratings the score has that the current rubric doesn't know about
  // (a criterion renamed or removed after this score was submitted). They
  // stay editable, labelled by their raw id, so nothing is silently lost.
  const rubricIds = rubric.criteria.map((c) => c.id);
  const abstractId = abstractCriterion ? abstractCriterion.id : null;
  const orphanIds = Object.keys(score.criteria || {}).filter((id) => !rubricIds.includes(id) && id !== abstractId);

  // The criteria this score is rated on right now: the rubric, the abstract
  // one if it applies, and any leftovers.
  const activeCriteria = [
    ...rubric.criteria,
    ...(includesAbstract && abstractCriterion ? [abstractCriterion] : []),
    ...orphanIds.map((id) => ({ id, label: `${id} (no longer in the rubric)`, bullets: [] })),
  ];

  const ratingsComplete = activeCriteria.every((c) => ratings[c.id] != null);
  const total = activeCriteria.reduce((sum, c) => sum + (ratings[c.id] || 0), 0);
  const maxTotal = rubric.scaleMax * activeCriteria.length;
  const canSave = ratingsComplete && presentationValid && !saving;

  // Comments: every configured question, plus any leftover answers.
  const questionIds = categoryConfig.openEndedQuestions.map((q) => q.id);
  const orphanAnswerIds = Object.keys(score.openEndedAnswers || {}).filter((id) => !questionIds.includes(id));
  const answerFields = [
    ...categoryConfig.openEndedQuestions,
    ...orphanAnswerIds.map((id) => ({ id, label: `${id} (question no longer configured)` })),
  ];

  const handleSave = () => {
    // Only send ratings for the criteria in play, so unchecking the
    // abstract box also drops its rating.
    const criteria = {};
    activeCriteria.forEach((c) => {
      criteria[c.id] = ratings[c.id];
    });
    onSave({
      criteria,
      openEndedAnswers: answers,
      includesAbstract,
      presentation: numberBased
        ? { presentation_number: trimmedNumber }
        : { time_slot: timeSlot, room: room.trim() || null, session: session.trim() || null },
    });
  };

  return (
    <div style={{ padding: 12, background: '#fafafa', border: '1px solid #ddd', borderRadius: 6 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 10 }}>
        Editing: {score.judgeName} ({score.judgeCode}) — {score.category}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Presentation</div>
        {numberBased ? (
          <>
            <label style={styles.label}>Presentation Number (1 to {maxNumber})</label>
            <input
              style={{ ...styles.input, maxWidth: 160, marginBottom: 4 }}
              type="text"
              inputMode="numeric"
              value={presentationNumber}
              onChange={(e) => setPresentationNumber(e.target.value)}
            />
            {!numberValid && <div style={styles.error}>Enter a whole number from 1 to {maxNumber}.</div>}
          </>
        ) : (
          <>
            <label style={styles.label}>Time Slot</label>
            <select
              style={{ ...styles.select, marginBottom: 4 }}
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
            >
              <option value="" disabled>
                Select a time slot
              </option>
              {slotOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                  {slotLabels.includes(label) ? '' : ' (not in the current config)'}
                </option>
              ))}
            </select>
            {showRoom && (
              <>
                <label style={styles.label}>Room</label>
                <input style={{ ...styles.input, maxWidth: 240 }} value={room} onChange={(e) => setRoom(e.target.value)} />
              </>
            )}
            {showSession && (
              <>
                <label style={styles.label}>Session</label>
                <input
                  style={{ ...styles.input, maxWidth: 240 }}
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                />
              </>
            )}
          </>
        )}
        <div style={styles.help}>
          Changing this moves only this judge's score to the other presentation. Other judges' scores are not
          affected. To change the category, delete this score and have the judge score it again.
        </div>
      </div>

      {showAbstractToggle && (
        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            style={{ accentColor: 'var(--bgsu-orange)' }}
            checked={includesAbstract}
            onChange={(e) => setIncludesAbstract(e.target.checked)}
          />
          This presentation includes an abstract
        </label>
      )}

      {activeCriteria.map((criterion) => (
        <div key={criterion.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <label style={{ ...styles.label, minWidth: 320, marginBottom: 0 }}>{criterion.label}</label>
          <select
            style={{ ...styles.input, width: 190, marginBottom: 0 }}
            value={ratings[criterion.id] ?? ''}
            onChange={(e) => setRatings({ ...ratings, [criterion.id]: Number(e.target.value) })}
          >
            <option value="" disabled>
              Select rating
            </option>
            {scaleValues.map((v) => (
              <option key={v} value={v}>
                {v} — {rubric.scaleLabels[v] || v}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div style={{ fontWeight: 'bold', margin: '10px 0' }}>
        Total: {total} / {maxTotal}
        {!ratingsComplete && <span style={{ color: '#b00020', fontWeight: 'normal' }}> (every criterion needs a rating)</span>}
      </div>

      {answerFields.map((q) => (
        <div key={q.id} style={{ marginBottom: 10 }}>
          <label style={styles.label}>{q.label}</label>
          <textarea
            style={{ ...styles.input, minHeight: 60 }}
            value={answers[q.id] || ''}
            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
          />
        </div>
      ))}

      {error && <div style={styles.error}>{error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button style={{ ...styles.button, ...(canSave ? {} : styles.buttonDisabled) }} disabled={!canSave} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button style={styles.buttonSecondary} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}