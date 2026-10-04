import ScoreReadout from './ScoreReadout';
import { getCategoryConfigById } from '../utils';

export default function ReviewScreen({ currentEntry, config, styles, onGoBack, onConfirm, error, submitting }) {
  const categoryConfig = getCategoryConfigById(config, currentEntry.category);

  const handleConfirmClick = () => {
    const confirmed = window.confirm('Are you sure? You cannot change this score after submitting.');
    if (confirmed) onConfirm();
  };

  if (!categoryConfig) {
    return (
      <div style={styles.card}>
        <div style={styles.error}>This presentation's category is no longer configured.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.card}>
        <h2>Review Your Score</h2>
        <div style={styles.help}>
          Check everything below before confirming. Once submitted, this score cannot be changed. To fix something,
          use "Go Back and Edit."
        </div>
      </div>

      <ScoreReadout categoryConfig={categoryConfig} entry={currentEntry} styles={styles} />

      <div style={styles.card}>
        {error && <div style={styles.error}>{error}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            style={{ ...styles.buttonSecondary, ...(submitting ? styles.buttonDisabled : {}) }}
            disabled={submitting}
            onClick={onGoBack}
          >
            Go Back and Edit
          </button>
          <button
            style={{ ...styles.button, ...(submitting ? styles.buttonDisabled : {}) }}
            disabled={submitting}
            onClick={handleConfirmClick}
          >
            {submitting ? 'Submitting…' : 'Confirm and Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}