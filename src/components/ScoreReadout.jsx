import { getEffectiveCriteria } from '../utils';

export default function ScoreReadout({ categoryConfig, entry, styles }) {
  const rubric = categoryConfig.rubric;
  const criteria = getEffectiveCriteria(categoryConfig, entry);
  const total = criteria.reduce((sum, c) => sum + (entry.ratings[c.id] || 0), 0);
  const answeredQuestions = categoryConfig.openEndedQuestions.filter((q) => {
    const answer = entry.openEndedAnswers && entry.openEndedAnswers[q.id];
    return answer && answer.trim() !== '';
  });

  return (
    <div style={styles.card}>
      <h3 style={{ marginBottom: 8 }}>{categoryConfig.name}</h3>

      {/* Which presentation this is: a number for Poster, a time slot for Oral/Video. */}
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
        {categoryConfig.usesTimeSlots
          ? `Time Slot: ${entry.timeSlot}`
          : `Presentation Number: #${entry.presentationNumber}`}
      </div>
      {entry.room && <div style={styles.help}>Room: {entry.room}</div>}
      {entry.session && <div style={styles.help}>Session: {entry.session}</div>}
      {entry.discipline && <div style={styles.help}>Discipline: {entry.discipline}</div>}

      <div style={{ marginTop: 12 }}>
        {criteria.map((criterion) => (
          <div key={criterion.id} style={{ marginBottom: 6, fontSize: 'calc(14px * var(--font-scale, 1))' }}>
            <strong>{criterion.label}:</strong> {entry.ratings[criterion.id]} —{' '}
            {rubric.scaleLabels[entry.ratings[criterion.id]] || ''}
          </div>
        ))}
      </div>

      <div style={{ fontWeight: 'bold', margin: '10px 0' }}>
        Total: {total} / {rubric.scaleMax * criteria.length}
      </div>

      {answeredQuestions.map((q) => (
        <div key={q.id} style={{ marginBottom: 10 }}>
          <div style={styles.label}>{q.label}</div>
          <div style={{ fontSize: 'calc(14px * var(--font-scale, 1))', whiteSpace: 'pre-wrap' }}>
            {entry.openEndedAnswers[q.id]}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 'calc(13px * var(--font-scale, 1))', color: '#666' }}>
        Scored at {new Date(entry.savedAt).toLocaleString()}
      </div>
    </div>
  );
}