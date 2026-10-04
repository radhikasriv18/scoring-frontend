export default function JudgeEntryScreen({ judge, setJudge, styles, onContinue, error, loading }) {
  const canContinue =
    !loading && judge.code.trim() !== '' && judge.firstName.trim() !== '' && judge.lastName.trim() !== '';

  return (
    <div style={styles.card}>
      <h2>Judge Sign-In</h2>
      <label style={styles.label}>Judge Code</label>
      <input
        style={styles.input}
        type="text"
        value={judge.code}
        onChange={(e) => setJudge({ ...judge, code: e.target.value })}
      />

      <label style={styles.label}>First Name</label>
      <input
        style={styles.input}
        type="text"
        value={judge.firstName}
        onChange={(e) => setJudge({ ...judge, firstName: e.target.value })}
      />

      <label style={styles.label}>Last Name</label>
      <input
        style={styles.input}
        type="text"
        value={judge.lastName}
        onChange={(e) => setJudge({ ...judge, lastName: e.target.value })}
      />

      {error && <div style={styles.error}>{error}</div>}

      <button
        style={{ ...styles.button, ...(canContinue ? {} : styles.buttonDisabled) }}
        disabled={!canContinue}
        onClick={onContinue}
      >
        {loading ? 'Signing in…' : 'Continue'}
      </button>
    </div>
  );
}