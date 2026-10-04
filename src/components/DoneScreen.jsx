export default function DoneScreen({ judge, scoreCount, styles, onResume, onSignOut, error, busy }) {
  return (
    <div>
      <div style={styles.card}>
        <h2>Thank you, {judge.firstName}!</h2>
        <div style={{ fontSize: 'calc(18px * var(--font-scale, 1))', marginBottom: 8 }}>
          You scored <strong>{scoreCount}</strong> presentation{scoreCount === 1 ? '' : 's'}.
        </div>
        <div style={styles.help}>
          The organizers have been told that you have finished judging. You can close this page.
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.help}>Tapped finish by mistake? You can go back and keep scoring.</div>
        {error && <div style={styles.error}>{error}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            style={{ ...styles.buttonSecondary, ...(busy ? styles.buttonDisabled : {}) }}
            disabled={busy}
            onClick={onResume}
          >
            Go Back and Score More
          </button>
          <button
            style={{ ...styles.buttonSecondary, ...(busy ? styles.buttonDisabled : {}) }}
            disabled={busy}
            onClick={onSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}