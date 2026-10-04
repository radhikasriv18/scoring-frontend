export default function SubmittedScreen({ styles, onScoreAnother, onFinish, error, busy }) {
  return (
    <div>
      <div style={styles.successBanner}>✓ Score submitted!</div>

      <div style={styles.card}>
        <h2>What would you like to do next?</h2>

        <button
          style={{ ...styles.button, ...(busy ? styles.buttonDisabled : {}) }}
          disabled={busy}
          onClick={onScoreAnother}
        >
          Score Another Presentation
        </button>

        <div style={{ borderTop: '1px solid #eee', marginTop: 20, paddingTop: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Have you scored ALL of your assigned presentations?</div>
          <div style={styles.help}>
            Only tap the button below if you are completely finished and leaving. It tells the organizers you are
            done. If you still have presentations to score, tap "Score Another Presentation" above.
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button
            style={{ ...styles.buttonSecondary, ...(busy ? styles.buttonDisabled : {}) }}
            disabled={busy}
            onClick={onFinish}
          >
            {busy ? 'Please wait…' : "I've Finished ALL My Presentations"}
          </button>
        </div>
      </div>
    </div>
  );
}