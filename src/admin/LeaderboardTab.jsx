import { useState, useEffect } from 'react';
import { getLeaderboard } from './adminApi';
import { getConfig } from '../api';

// What identifies a presentation: a number for Poster, a time slot for
// Oral/Video, plus room/session when a category uses them.
function presentationLabel(entry) {
  const parts = [];
  if (entry.presentationNumber) parts.push(`#${entry.presentationNumber}`);
  if (entry.timeSlot) parts.push(entry.timeSlot);
  if (entry.room) parts.push(`Room ${entry.room}`);
  if (entry.session) parts.push(`Session ${entry.session}`);
  return parts.join(' · ') || '—';
}

// Adds a rank to each entry (they arrive already sorted, best first).
// Scores are compared the way they're shown, to one decimal place, so two
// presentations that display the same score share a rank instead of
// looking arbitrarily ordered: 1, 2, 2, 4.
function withRanks(entries) {
  let rank = 0;
  let previousShown = null;
  return entries.map((entry, index) => {
    const shown = entry.averageScaledScore.toFixed(1);
    if (shown !== previousShown) {
      rank = index + 1;
      previousShown = shown;
    }
    return { ...entry, rank };
  });
}

const SHOW_OPTIONS = [
  { value: '5', label: 'Top 5' },
  { value: '10', label: 'Top 10' },
  { value: 'all', label: 'All' },
];

export default function LeaderboardTab({ styles, onSessionExpired }) {
  const [leaderboard, setLeaderboard] = useState(null); // null until loaded
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [showTop, setShowTop] = useState('5');

  // Loads the ranking and the config (the config supplies the category
  // order and each category's highest possible score). Runs when the tab
  // opens and on every Refresh.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getLeaderboard(), getConfig()])
      .then(([loadedLeaderboard, loadedConfig]) => {
        if (cancelled) return;
        setLeaderboard(loadedLeaderboard);
        setConfig(loadedConfig);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) onSessionExpired();
        else setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadCount, onSessionExpired]);

  const handleRefresh = () => {
    setLoading(true);
    setError('');
    setReloadCount((n) => n + 1);
  };

  // First load hasn't finished (or failed before any data arrived).
  if (!leaderboard || !config) {
    return (
      <div style={styles.card}>
        {error ? (
          <>
            <div style={styles.error}>Could not load the leaderboard: {error}</div>
            <button style={styles.button} onClick={handleRefresh}>
              Try Again
            </button>
          </>
        ) : (
          'Loading…'
        )}
      </div>
    );
  }

  // Categories in the config's order, then any that only appear in old
  // scores (renamed or deleted since), so no results are hidden.
  const categoryNames = [...new Set([...config.categories.map((c) => c.name), ...Object.keys(leaderboard)])];

  return (
    <div>
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ ...styles.label, marginBottom: 0 }}>Show</label>
          <select
            style={{ ...styles.select, marginBottom: 0, width: 140 }}
            value={showTop}
            onChange={(e) => setShowTop(e.target.value)}
          >
            {SHOW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button style={styles.buttonSecondary} onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div style={{ ...styles.help, marginTop: 10 }}>
          Each score is the average across the judges who scored that presentation, scaled so a judge who rated an
          extra criterion (the abstract) doesn't get an advantage. Presentations that show the same score share a
          rank.
        </div>
        {error && <div style={{ ...styles.error, marginTop: 8 }}>Could not refresh: {error}</div>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
        {categoryNames.map((name) => {
          const categoryConfig = config.categories.find((c) => c.name === name) || null;
          const maxScore = categoryConfig ? categoryConfig.rubric.scaleMax * categoryConfig.rubric.criteria.length : null;
          const ranked = withRanks(leaderboard[name] || []);
          // Everyone ranked within the chosen cut-off, so a presentation
          // tied with the last place is never left off.
          const shown = showTop === 'all' ? ranked : ranked.filter((entry) => entry.rank <= Number(showTop));

          return (
            <div key={name} style={{ ...styles.card, flex: '1 1 360px', marginBottom: 0 }}>
              <h3>
                {name} — {showTop === 'all' ? 'All' : `Top ${showTop}`}
              </h3>
              {ranked.length === 0 ? (
                <div style={{ color: '#888' }}>No scores yet.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, cursor: 'default' }}>#</th>
                      <th style={{ ...styles.th, cursor: 'default' }}>Presentation</th>
                      <th style={{ ...styles.th, cursor: 'default' }}>Score{maxScore !== null ? ` (out of ${maxScore})` : ''}</th>
                      <th style={{ ...styles.th, cursor: 'default' }}>Judges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((entry) => (
                      <tr key={entry.presentationId}>
                        <td style={styles.td}>{entry.rank}</td>
                        <td style={styles.td}>{presentationLabel(entry)}</td>
                        <td style={styles.td}>
                          <strong>{entry.averageScaledScore.toFixed(1)}</strong>
                          {maxScore !== null ? ` / ${maxScore}` : ''}
                        </td>
                        <td style={styles.td}>{entry.judgeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}