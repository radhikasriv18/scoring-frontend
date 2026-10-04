import { getCategoryConfig } from '../utils';

export default function MySubmittedPresentations({ scores, config, styles }) {
  const sorted = scores.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  return (
    <details style={styles.card} open={sorted.length > 0 && sorted.length <= 3}>
      <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: 'calc(16px * var(--font-scale, 1))' }}>
        My Submitted Presentations ({sorted.length})
      </summary>
      <div style={{ marginTop: 10 }}>
        {sorted.map((s) => {
          const categoryConfig = getCategoryConfig(config, s.category);
          const maxTotal = categoryConfig ? categoryConfig.rubric.scaleMax * categoryConfig.rubric.criteria.length : null;

          // Poster is identified by number, Oral/Video by time slot.
          // Show whichever one this score actually has.
          const identifier = s.presentationNumber ? `#${s.presentationNumber}` : s.timeSlot;

          return (
            <div key={s.id} style={{ borderTop: '1px solid #eee', padding: '10px 0' }}>
              <div style={{ fontWeight: 'bold' }}>
                {s.category} {identifier}
              </div>
              <div style={{ fontSize: 'calc(14px * var(--font-scale, 1))', color: '#444' }}>
                Total: {s.total}
                {maxTotal !== null ? ` / ${maxTotal}` : ''} &nbsp;•&nbsp; Submitted {new Date(s.submittedAt).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}