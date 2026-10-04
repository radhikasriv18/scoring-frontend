import RatingLegend from './RatingLegend';
import { getScaleValues, getEffectiveCriteria } from '../utils';

export default function ScoreForm({
  categoryConfig,
  timeSlot,
  discipline,
  entry,
  styles,
  onChangeRating,
  onChangeAnswer,
  onSave,
  onEdit,
}) {
  const rubric = categoryConfig.rubric;
  const criteria = getEffectiveCriteria(categoryConfig, entry);
  const hasCriteria = criteria.length > 0;
  const ratingsComplete = hasCriteria && criteria.every((c) => entry.ratings[c.id] != null);
  const total = criteria.reduce((sum, c) => sum + (entry.ratings[c.id] || 0), 0);
  const maxTotal = rubric.scaleMax * criteria.length;

  // Admin-controlled: if the config doesn't say otherwise, answers are
  // required. Setting requireOpenEnded: false in a category's config makes
  // them optional.
  const requireOpenEnded = categoryConfig.requireOpenEnded !== false;
  const answersComplete =
    !requireOpenEnded ||
    categoryConfig.openEndedQuestions.every(
      (q) => ((entry.openEndedAnswers && entry.openEndedAnswers[q.id]) || '').trim() !== ''
    );
  const canSave = ratingsComplete && answersComplete;

  if (entry.saved) {
    // SAVED: compact read-only summary with an Edit button.
    return (
      <div style={{ ...styles.card, ...styles.savedCard }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 'calc(16px * var(--font-scale, 1))' }}>
              ✓ {categoryConfig.name}
              {timeSlot ? ` — ${timeSlot}` : ''}
              {discipline ? ` — ${discipline}` : ''}
            </div>
            <div style={{ fontSize: 'calc(14px * var(--font-scale, 1))', color: '#444', marginTop: 4 }}>
              Total: {total} / {maxTotal} &nbsp;•&nbsp; Scored at {new Date(entry.savedAt).toLocaleString()}
            </div>
          </div>
          <button style={styles.buttonSecondary} onClick={onEdit}>
            Edit
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = criteria.filter((c) => entry.ratings[c.id] != null).length;
  const scaleValues = getScaleValues(rubric);

  return (
    <div style={styles.card}>
      <h3 style={{ marginBottom: 4 }}>{categoryConfig.name}</h3>
      {timeSlot && <div style={{ ...styles.help, marginBottom: 10 }}>Time Slot: {timeSlot}</div>}
      {discipline && <div style={{ ...styles.help, marginBottom: 10 }}>Discipline: {discipline}</div>}

      {!hasCriteria ? (
        <div style={styles.error}>
          This category doesn't have any rubric criteria configured yet. Please contact the symposium organizers.
        </div>
      ) : (
        <>
          <RatingLegend rubric={rubric} />

          {criteria.map((criterion) => (
            <div key={criterion.id} style={{ marginBottom: 14 }}>
              <label style={styles.label}>{criterion.label}</label>
              {criterion.bullets && criterion.bullets.length > 0 && (
                <ul style={{ ...styles.help, margin: '0 0 8px 18px', padding: 0 }}>
                  {criterion.bullets.map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              )}
              <select
                style={styles.select}
                value={entry.ratings[criterion.id] ?? ''}
                onChange={(e) => onChangeRating(criterion.id, Number(e.target.value))}
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

          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>
            Total: {total} / {maxTotal} ({answeredCount}/{criteria.length} criteria scored)
          </div>
        </>
      )}

      {categoryConfig.openEndedQuestions.map((q) => (
        <div key={q.id} style={{ marginBottom: 14 }}>
          <label style={styles.label}>{q.label}</label>
          <textarea
            style={{ ...styles.input, minHeight: 70 }}
            value={(entry.openEndedAnswers && entry.openEndedAnswers[q.id]) || ''}
            onChange={(e) => onChangeAnswer(q.id, e.target.value)}
          />
        </div>
      ))}

      <button style={{ ...styles.button, ...(canSave ? {} : styles.buttonDisabled) }} disabled={!canSave} onClick={onSave}>
        Save
      </button>
      {hasCriteria && !canSave && (
        <div style={styles.help}>
          {!ratingsComplete
            ? 'All criteria must be scored before saving.'
            : 'Please answer all of the questions above before saving.'}
        </div>
      )}
    </div>
  );
}