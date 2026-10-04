import { useState, useEffect } from 'react';
import { getDataCounts, resetAllData } from './adminApi';
import { getLastExport } from './exportMark';

const CONFIRM_PHRASE = 'DELETE ALL DATA';

export default function DangerZone({ styles, onSessionExpired, onGoToExport, onReset }) {
  const [counts, setCounts] = useState(null); // null until loaded
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  // How much would be deleted. Reloaded after a reset so it shows zeros.
  useEffect(() => {
    let cancelled = false;
    getDataCounts()
      .then((loaded) => {
        if (!cancelled) setCounts(loaded);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) onSessionExpired();
        else setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadCount, onSessionExpired]);

  const lastExport = getLastExport();

  // The button only unlocks when the phrase matches exactly (capital
  // letters and all), so it can't be triggered by accident.
  const canDelete = confirmText === CONFIRM_PHRASE && counts !== null && !deleting;

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `This will permanently delete ${counts.scores} score(s), ${counts.judges} judge(s) and ${counts.presentations} presentation(s).\n\nThis cannot be undone. Continue?`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setResult(null);
    try {
      const deleted = await resetAllData();
      setResult(deleted);
      setReloadCount((n) => n + 1);
      if (onReset) onReset();
    } catch (err) {
      if (err.status === 401) onSessionExpired();
      else setError(err.message);
    } finally {
      setDeleting(false);
      // Never stays "armed" after an attempt, whether it worked or not.
      setConfirmText('');
    }
  };

  return (
    <div style={{ ...styles.card, border: '2px solid #b00020', marginTop: 24 }}>
      <h2 style={{ color: '#b00020', marginTop: 0 }}>Danger Zone</h2>

      <p style={{ color: '#444' }}>
        <strong>Start fresh for a new event.</strong> This permanently deletes <strong>all scores, all judges and all
        presentations</strong>. Your settings (title, categories, rubric) and the admin account are kept.
      </p>

      {counts && (
        <div style={{ fontWeight: 'bold', marginBottom: 10 }}>
          Right now that is {counts.scores} score{counts.scores === 1 ? '' : 's'}, {counts.judges} judge
          {counts.judges === 1 ? '' : 's'} and {counts.presentations} presentation
          {counts.presentations === 1 ? '' : 's'}.
        </div>
      )}

      {lastExport ? (
        <div style={{ color: '#1a7a1a', marginBottom: 12 }}>
          ✓ You downloaded an Excel export from this tab at {new Date(lastExport).toLocaleString()}. If scores have
          come in since then, download a new one first.
        </div>
      ) : (
        <div style={{ ...styles.error, marginBottom: 12 }}>
          ⚠ You have not downloaded an Excel export from this browser tab. Deleted data cannot be recovered.
        </div>
      )}
      <button style={{ ...styles.buttonSecondary, marginBottom: 14 }} onClick={onGoToExport}>
        Go to Export
      </button>

      <label style={styles.label}>
        To unlock the button, type {CONFIRM_PHRASE} exactly:
      </label>
      <input
        style={styles.input}
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        autoComplete="off"
      />

      <button
        style={{
          ...styles.button,
          background: '#b00020',
          border: '1px solid #b00020',
          ...(canDelete ? {} : styles.buttonDisabled),
        }}
        disabled={!canDelete}
        onClick={handleDelete}
      >
        {deleting ? 'Deleting…' : 'Delete All Scores, Judges and Presentations'}
      </button>

      {result && (
        <div style={{ ...styles.successBanner, marginTop: 14 }}>
          ✓ Deleted {result.scoresDeleted} score(s), {result.judgesDeleted} judge(s) and{' '}
          {result.presentationsDeleted} presentation(s).
        </div>
      )}
      {error && <div style={{ ...styles.error, marginTop: 12 }}>{error}</div>}
    </div>
  );
}