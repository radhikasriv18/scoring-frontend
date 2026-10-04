import { Fragment, useState, useEffect } from 'react';
import { getWorkload, renameJudge } from './adminApi';
import { getConfig } from '../api';

const STATUS_LABELS = {
  finished: 'Finished',
  scoring: 'Still scoring',
  notStarted: "Hasn't scored yet",
};

// For sorting by status: the judges the organizers care about most (still
// scoring) come first when sorted ascending.
const STATUS_RANK = { scoring: 0, notStarted: 1, finished: 2 };

function statusOf(judge) {
  if (judge.finishedAt) return 'finished';
  if (judge.total > 0) return 'scoring';
  return 'notStarted';
}

function fullName(judge) {
  return `${judge.firstName.trim()} ${judge.lastName.trim()}`;
}

function sortArrow(column, sortColumn, sortDirection) {
  if (column !== sortColumn) return '';
  return sortDirection === 'asc' ? ' ▲' : ' ▼';
}

function compareJudges(a, b, column) {
  switch (column) {
    case 'total':
      return a.total - b.total;
    case 'status':
      return STATUS_RANK[statusOf(a)] - STATUS_RANK[statusOf(b)];
    default:
      return fullName(a).localeCompare(fullName(b));
  }
}

// The small form that opens under a judge's row to fix their name.
function RenameForm({ judge, styles, onSave, onCancel, saving, error }) {
  const [firstName, setFirstName] = useState(judge.firstName);
  const [lastName, setLastName] = useState(judge.lastName);

  const changed = firstName.trim() !== judge.firstName.trim() || lastName.trim() !== judge.lastName.trim();
  const canSave = !saving && firstName.trim() !== '' && lastName.trim() !== '' && changed;

  return (
    <div style={{ padding: 12, background: '#fafafa', border: '1px solid #ddd', borderRadius: 6 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
        Fix the name for code {judge.code}
      </div>
      <div style={styles.filterRow}>
        <div style={styles.filterCol}>
          <label style={styles.label}>First Name</label>
          <input style={styles.input} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div style={styles.filterCol}>
          <label style={styles.label}>Last Name</label>
          <input style={styles.input} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div style={styles.help}>The judge's code stays the same. Only the name shown to the organizers changes.</div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          style={{ ...styles.button, ...(canSave ? {} : styles.buttonDisabled) }}
          disabled={!canSave}
          onClick={() => onSave(firstName.trim(), lastName.trim())}
        >
          {saving ? 'Saving…' : 'Save Name'}
        </button>
        <button style={styles.buttonSecondary} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function WorkloadTab({ styles, onSessionExpired }) {
  const [judges, setJudges] = useState([]);
  const [configCategories, setConfigCategories] = useState(null); // null until loaded
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const [renamingId, setRenamingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [renameError, setRenameError] = useState('');

  // Loads the workload and the config (the config supplies the category
  // names, in the order the organizers set them). Runs when the tab opens
  // and on every Refresh.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getWorkload(), getConfig()])
      .then(([loadedJudges, config]) => {
        if (cancelled) return;
        setJudges(loadedJudges);
        setConfigCategories(config.categories.map((c) => c.name));
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
    setRenameError('');
    setRenamingId(null);
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

  const handleRename = async (judge, firstName, lastName) => {
    setSaving(true);
    setRenameError('');
    try {
      const updated = await renameJudge(judge.judgeId, firstName, lastName);
      setJudges((prev) => prev.map((j) => (j.judgeId === judge.judgeId ? { ...j, ...updated } : j)));
      setRenamingId(null);
    } catch (err) {
      if (err.status === 401) onSessionExpired();
      else setRenameError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // First load hasn't finished (or failed before any data arrived).
  if (!configCategories) {
    return (
      <div style={styles.card}>
        {error ? (
          <>
            <div style={styles.error}>Could not load the workload: {error}</div>
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

  // Category columns: everything in the config, plus any category that only
  // appears in old scores (renamed or deleted since), so no count is hidden.
  const categoryColumns = [
    ...new Set([...configCategories, ...judges.flatMap((j) => Object.keys(j.counts))]),
  ];

  const counts = { finished: 0, scoring: 0, notStarted: 0 };
  judges.forEach((j) => {
    counts[statusOf(j)] += 1;
  });

  const term = search.trim().toLowerCase();
  const filtered = judges.filter((j) => {
    if (statusFilter && statusOf(j) !== statusFilter) return false;
    if (term && !`${fullName(j)} ${j.code}`.toLowerCase().includes(term)) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    const result = compareJudges(a, b, sortColumn);
    return sortDirection === 'asc' ? result : -result;
  });

  const columnCount = 1 + categoryColumns.length + 3; // judge, categories, total, status, actions

  return (
    <div>
      <div style={styles.card}>
        <div style={{ fontWeight: 'bold', marginBottom: 10 }}>
          {judges.length} judge{judges.length === 1 ? '' : 's'} · {counts.finished} finished · {counts.scoring} still
          scoring · {counts.notStarted} haven't scored yet
        </div>

        <div style={styles.filterRow}>
          <div style={styles.filterCol}>
            <label style={styles.label}>Judge (name or code)</label>
            <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={styles.filterCol}>
            <label style={styles.label}>Status</label>
            <select style={styles.input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="scoring">{STATUS_LABELS.scoring}</option>
              <option value="finished">{STATUS_LABELS.finished}</option>
              <option value="notStarted">{STATUS_LABELS.notStarted}</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: '#666' }}>
            {sorted.length} of {judges.length} judges shown
          </div>
          <button style={styles.buttonSecondary} onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {error && <div style={{ ...styles.error, marginTop: 8 }}>Could not refresh: {error}</div>}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th} onClick={() => toggleSort('name')}>
                Judge{sortArrow('name', sortColumn, sortDirection)}
              </th>
              {categoryColumns.map((name) => (
                <th key={name} style={{ ...styles.th, cursor: 'default' }}>
                  {name}
                </th>
              ))}
              <th style={styles.th} onClick={() => toggleSort('total')}>
                Total{sortArrow('total', sortColumn, sortDirection)}
              </th>
              <th style={styles.th} onClick={() => toggleSort('status')}>
                Status{sortArrow('status', sortColumn, sortDirection)}
              </th>
              <th style={{ ...styles.th, cursor: 'default' }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((j) => {
              const status = statusOf(j);
              return (
                <Fragment key={j.judgeId}>
                  <tr>
                    <td style={styles.td}>
                      {fullName(j)} <span style={{ color: '#888' }}>({j.code})</span>
                    </td>
                    {categoryColumns.map((name) => (
                      <td key={name} style={styles.td}>
                        {j.counts[name] || 0}
                      </td>
                    ))}
                    <td style={styles.td}>
                      <strong>{j.total}</strong>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: status === 'scoring' ? 'bold' : 'normal', color: status === 'finished' ? '#1a7a1a' : 'inherit' }}>
                        {status === 'finished' ? '✓ ' : ''}
                        {STATUS_LABELS[status]}
                      </div>
                      {status === 'finished' && (
                        <div style={{ fontSize: 12, color: '#666' }}>{new Date(j.finishedAt).toLocaleString()}</div>
                      )}
                      {status === 'scoring' && j.lastScoredAt && (
                        <div style={{ fontSize: 12, color: '#666' }}>
                          Last score {new Date(j.lastScoredAt).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.buttonSecondary}
                        onClick={() => {
                          setRenameError('');
                          setRenamingId(renamingId === j.judgeId ? null : j.judgeId);
                        }}
                      >
                        {renamingId === j.judgeId ? 'Close' : 'Rename'}
                      </button>
                    </td>
                  </tr>
                  {renamingId === j.judgeId && (
                    <tr>
                      <td colSpan={columnCount} style={styles.td}>
                        <RenameForm
                          key={j.judgeId}
                          judge={j}
                          styles={styles}
                          onSave={(first, last) => handleRename(j, first, last)}
                          onCancel={() => setRenamingId(null)}
                          saving={saving}
                          error={renameError}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columnCount} style={{ ...styles.td, textAlign: 'center', color: '#888' }}>
                  {judges.length === 0 ? 'No judges have signed in yet.' : 'No judges match these filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}