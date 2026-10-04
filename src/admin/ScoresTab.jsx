import { Fragment, useState, useEffect } from 'react';
import ScoreEditForm from './ScoreEditForm';
import { getAllScores, updateScore, deleteScore } from './adminApi';
import { getConfig } from '../api';

// What identifies a presentation: a number for Poster, a time slot for
// Oral/Video, plus room/session when a category uses them.
function presentationLabel(score) {
  const parts = [];
  if (score.presentationNumber) parts.push(`#${score.presentationNumber}`);
  if (score.timeSlot) parts.push(score.timeSlot);
  if (score.room) parts.push(`Room ${score.room}`);
  if (score.session) parts.push(`Session ${score.session}`);
  return parts.join(' · ') || '—';
}

function compareScores(a, b, column) {
  switch (column) {
    case 'total':
      return a.total - b.total;
    case 'submittedAt':
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    case 'presentation': {
      // Numbers sort as numbers (so 2 comes before 10); time slots as text.
      if (a.presentationNumber !== null && b.presentationNumber !== null) {
        return Number(a.presentationNumber) - Number(b.presentationNumber);
      }
      return presentationLabel(a).localeCompare(presentationLabel(b));
    }
    default:
      return String(a[column] ?? '').localeCompare(String(b[column] ?? ''));
  }
}

function sortArrow(column, sortColumn, sortDirection) {
  if (column !== sortColumn) return '';
  return sortDirection === 'asc' ? ' ▲' : ' ▼';
}

// The expanded view of one score: every rating with its real criterion name,
// and every comment with its real question.
function ScoreDetails({ score, config, styles }) {
  const categoryConfig = config.categories.find((c) => c.name === score.category) || null;

  const criterionIds = categoryConfig
    ? [
        ...categoryConfig.rubric.criteria.map((c) => c.id),
        ...(categoryConfig.abstractCriterion ? [categoryConfig.abstractCriterion.id] : []),
      ]
    : [];
  const questionIds = categoryConfig ? categoryConfig.openEndedQuestions.map((q) => q.id) : [];

  // Show things in the order the config lists them; anything the config
  // doesn't know about (renamed or deleted since) goes last, by raw id.
  const byConfigOrder = (configIds) => (a, b) => {
    const ai = configIds.indexOf(a);
    const bi = configIds.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  };
  const ratingIds = Object.keys(score.criteria || {}).sort(byConfigOrder(criterionIds));
  const answerIds = Object.keys(score.openEndedAnswers || {}).sort(byConfigOrder(questionIds));

  const criterionLabel = (id) => {
    if (!categoryConfig) return id;
    const found = categoryConfig.rubric.criteria.find((c) => c.id === id);
    if (found) return found.label;
    if (categoryConfig.abstractCriterion && categoryConfig.abstractCriterion.id === id) {
      return categoryConfig.abstractCriterion.label;
    }
    return id;
  };
  const questionLabel = (id) => {
    const found = categoryConfig ? categoryConfig.openEndedQuestions.find((q) => q.id === id) : null;
    return found ? found.label : id;
  };

  return (
    <div style={{ padding: 12, background: '#fafafa', border: '1px solid #ddd', borderRadius: 6 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Ratings</div>
      {ratingIds.map((id) => {
        const value = score.criteria[id];
        const scaleLabel = categoryConfig ? categoryConfig.rubric.scaleLabels[value] : null;
        return (
          <div key={id} style={{ marginBottom: 4 }}>
            {criterionLabel(id)}: <strong>{value}</strong>
            {scaleLabel ? ` — ${scaleLabel}` : ''}
          </div>
        );
      })}

      <div style={{ fontWeight: 'bold', margin: '12px 0 6px' }}>Comments</div>
      {answerIds.length === 0 ? (
        <div style={styles.help}>No comments were entered.</div>
      ) : (
        answerIds.map((id) => (
          <div key={id} style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 'bold', fontSize: 13 }}>{questionLabel(id)}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{score.openEndedAnswers[id]}</div>
          </div>
        ))
      )}

      {score.discipline && <div style={{ marginTop: 8 }}>Discipline: {score.discipline}</div>}
    </div>
  );
}

export default function ScoresTab({ styles, onSessionExpired }) {
  const [scores, setScores] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [judgeFilter, setJudgeFilter] = useState('');
  const [presentationFilter, setPresentationFilter] = useState('');
  const [sortColumn, setSortColumn] = useState('submittedAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Which row is open underneath, and how: { id, mode: 'details' | 'edit' }.
  const [openRow, setOpenRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  // Loads the scores and the config (the config supplies the real names of
  // criteria and questions). Runs when the tab opens and on every Refresh.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllScores(), getConfig()])
      .then(([loadedScores, loadedConfig]) => {
        if (cancelled) return;
        setScores(loadedScores);
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
    setActionError('');
    setOpenRow(null);
    setReloadCount((n) => n + 1);
  };

  const toggleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const openRowAs = (id, mode) => {
    setActionError('');
    setOpenRow({ id, mode });
  };

  const closeRow = () => {
    setActionError('');
    setOpenRow(null);
  };

  // Shared failure handling: an expired login sends the admin back to the
  // login screen; anything else shows as a message.
  const handleActionFailure = (err) => {
    if (err.status === 401) onSessionExpired();
    else setActionError(err.message);
  };

  const handleSaveEdit = async (score, updates) => {
    setSaving(true);
    setActionError('');
    try {
      const updated = await updateScore(score.id, updates);
      setScores((prev) => prev.map((s) => (s.id === score.id ? { ...s, ...updated } : s)));
      setOpenRow(null);
    } catch (err) {
      handleActionFailure(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (score) => {
    const confirmed = window.confirm(
      `Delete this score?\n\n${score.judgeName} (${score.judgeCode})\n${score.category} ${presentationLabel(score)}\nTotal: ${score.total}\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setActionError('');
    try {
      await deleteScore(score.id);
      setScores((prev) => prev.filter((s) => s.id !== score.id));
      if (openRow && openRow.id === score.id) setOpenRow(null);
    } catch (err) {
      handleActionFailure(err);
    }
  };

  // First load hasn't finished (or failed before any data arrived).
  if (!config) {
    return (
      <div style={styles.card}>
        {error ? (
          <>
            <div style={styles.error}>Could not load scores: {error}</div>
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

  // Category choices: everything in the config, plus any category that only
  // exists in old scores (renamed or deleted since), so nothing is hidden.
  const categoryOptions = [...new Set([...config.categories.map((c) => c.name), ...scores.map((s) => s.category)])];

  const judgeTerm = judgeFilter.trim().toLowerCase();
  const presentationTerm = presentationFilter.trim().toLowerCase();
  const filtered = scores.filter((s) => {
    if (categoryFilter && s.category !== categoryFilter) return false;
    if (judgeTerm && !`${s.judgeName} ${s.judgeCode}`.toLowerCase().includes(judgeTerm)) return false;
    if (presentationTerm && !presentationLabel(s).toLowerCase().includes(presentationTerm)) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    const result = compareScores(a, b, sortColumn);
    return sortDirection === 'asc' ? result : -result;
  });

  // The highest possible total for a score: the top rating times how many
  // criteria were rated (one more when the abstract criterion applied).
  const maxTotalFor = (score) => {
    const categoryConfig = config.categories.find((c) => c.name === score.category);
    return categoryConfig ? categoryConfig.rubric.scaleMax * Object.keys(score.criteria || {}).length : null;
  };

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.filterRow}>
          <div style={styles.filterCol}>
            <label style={styles.label}>Category</label>
            <select style={styles.input} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All</option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.filterCol}>
            <label style={styles.label}>Judge (name or code)</label>
            <input style={styles.input} value={judgeFilter} onChange={(e) => setJudgeFilter(e.target.value)} />
          </div>
          <div style={styles.filterCol}>
            <label style={styles.label}>Presentation (number or time slot)</label>
            <input
              style={styles.input}
              value={presentationFilter}
              onChange={(e) => setPresentationFilter(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: '#666' }}>
            {sorted.length} of {scores.length} entries shown
          </div>
          <button style={styles.buttonSecondary} onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {error && <div style={{ ...styles.error, marginTop: 8 }}>Could not refresh: {error}</div>}
        {actionError && !(openRow && openRow.mode === 'edit') && (
          <div style={{ ...styles.error, marginTop: 8 }}>{actionError}</div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th} onClick={() => toggleSort('judgeName')}>
                Judge{sortArrow('judgeName', sortColumn, sortDirection)}
              </th>
              <th style={styles.th} onClick={() => toggleSort('category')}>
                Category{sortArrow('category', sortColumn, sortDirection)}
              </th>
              <th style={styles.th} onClick={() => toggleSort('presentation')}>
                Presentation{sortArrow('presentation', sortColumn, sortDirection)}
              </th>
              <th style={styles.th} onClick={() => toggleSort('total')}>
                Total{sortArrow('total', sortColumn, sortDirection)}
              </th>
              <th style={styles.th} onClick={() => toggleSort('submittedAt')}>
                Submitted{sortArrow('submittedAt', sortColumn, sortDirection)}
              </th>
              <th style={{ ...styles.th, cursor: 'default' }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const maxTotal = maxTotalFor(s);
              const mode = openRow && openRow.id === s.id ? openRow.mode : null;
              const categoryConfig = config.categories.find((c) => c.name === s.category) || null;
              return (
                <Fragment key={s.id}>
                  <tr>
                    <td style={styles.td}>
                      {s.judgeName} <span style={{ color: '#888' }}>({s.judgeCode})</span>
                    </td>
                    <td style={styles.td}>{s.category}</td>
                    <td style={styles.td}>{presentationLabel(s)}</td>
                    <td style={styles.td}>
                      <strong>{s.total}</strong>
                      {maxTotal !== null ? ` / ${maxTotal}` : ''}
                    </td>
                    <td style={styles.td}>{new Date(s.submittedAt).toLocaleString()}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          style={styles.buttonSecondary}
                          onClick={() => (mode === 'details' ? closeRow() : openRowAs(s.id, 'details'))}
                        >
                          {mode === 'details' ? 'Hide' : 'Details'}
                        </button>
                        <button
                          style={{ ...styles.buttonSecondary, ...(categoryConfig ? {} : styles.buttonDisabled) }}
                          disabled={!categoryConfig}
                          title={categoryConfig ? '' : 'This category is no longer in the config, so its scores cannot be edited.'}
                          onClick={() => (mode === 'edit' ? closeRow() : openRowAs(s.id, 'edit'))}
                        >
                          {mode === 'edit' ? 'Close' : 'Edit'}
                        </button>
                        <button style={styles.dangerButton} onClick={() => handleDelete(s)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {mode && (
                    <tr>
                      <td colSpan={6} style={styles.td}>
                        {mode === 'details' ? (
                          <ScoreDetails score={s} config={config} styles={styles} />
                        ) : (
                          <ScoreEditForm
                            key={s.id}
                            score={s}
                            categoryConfig={categoryConfig}
                            styles={styles}
                            onSave={(updates) => handleSaveEdit(s, updates)}
                            onCancel={closeRow}
                            saving={saving}
                            error={actionError}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#888' }}>
                  {scores.length === 0 ? 'No scores have been submitted yet.' : 'No entries match these filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}