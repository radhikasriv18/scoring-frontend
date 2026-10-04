import { useState, useEffect, useCallback } from 'react';
import AdminLoginScreen from './AdminLoginScreen';
import ScoresTab from './ScoresTab';
import WorkloadTab from './WorkloadTab';
import LeaderboardTab from './LeaderboardTab';
import ExportTab from './ExportTab';
import ConfigTab from './ConfigTab';
import { adminStyles as styles } from './adminStyles';
import { adminLogin, getToken, saveToken, clearToken } from './adminApi';

const TABS = [
  { key: 'scores', label: 'Scores' },
  { key: 'workload', label: 'Judge Workload' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'export', label: 'Export' },
  { key: 'config', label: 'Config' },
];

const LEAVE_MESSAGE = 'You have unsaved settings changes. Leave without saving them?';

export default function AdminApp() {
  // A token left over from earlier in this tab (a refresh keeps it).
  const [token, setToken] = useState(() => getToken());
  const [tab, setTab] = useState('scores');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // True while the Config tab has changes that haven't been saved.
  const [configDirty, setConfigDirty] = useState(false);

  // Refreshing or closing the page with unsaved settings: the browser asks.
  useEffect(() => {
    if (!configDirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [configDirty]);

  const handleLogin = async (username, password) => {
    setLoggingIn(true);
    setLoginError('');
    try {
      const newToken = await adminLogin(username, password);
      saveToken(newToken);
      setToken(newToken);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  // Moving to another tab throws away an unsaved Config draft, so ask first.
  const switchTab = useCallback(
    (key) => {
      if (key === tab) return;
      if (tab === 'config' && configDirty && !window.confirm(LEAVE_MESSAGE)) return;
      setConfigDirty(false);
      setTab(key);
    },
    [tab, configDirty]
  );

  const handleLogout = () => {
    if (configDirty && !window.confirm(LEAVE_MESSAGE)) return;
    clearToken();
    setToken(null);
    setConfigDirty(false);
    setTab('scores');
  };

  // Called by a tab when the server says the login has expired (tokens last
  // 8 hours). useCallback keeps the function the same between renders, so
  // the tabs' data loading doesn't restart every time something changes.
  const handleSessionExpired = useCallback(() => {
    clearToken();
    setToken(null);
    setConfigDirty(false);
    setLoginError('Your session expired. Please log in again.');
  }, []);

  const goToExport = useCallback(() => switchTab('export'), [switchTab]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1>Admin Dashboard</h1>
        <div style={{ color: 'rgba(255,255,255,0.85)' }}>Embracing Global Engagement — Research Symposium</div>
      </div>

      {!token ? (
        <AdminLoginScreen styles={styles} onLogin={handleLogin} error={loginError} loading={loggingIn} />
      ) : (
        <>
          <div style={styles.tabBar}>
            {TABS.map((t) => (
              <button
                key={t.key}
                style={{ ...styles.tabButton, ...(tab === t.key ? styles.tabButtonActive : {}) }}
                onClick={() => switchTab(t.key)}
              >
                {t.label}
              </button>
            ))}
            <button style={{ ...styles.buttonSecondary, marginLeft: 'auto' }} onClick={handleLogout}>
              Log Out
            </button>
          </div>

          {tab === 'scores' && <ScoresTab styles={styles} onSessionExpired={handleSessionExpired} />}
          {tab === 'workload' && <WorkloadTab styles={styles} onSessionExpired={handleSessionExpired} />}
          {tab === 'leaderboard' && <LeaderboardTab styles={styles} onSessionExpired={handleSessionExpired} />}
          {tab === 'export' && <ExportTab styles={styles} onSessionExpired={handleSessionExpired} />}
          {tab === 'config' && (
            <ConfigTab
              styles={styles}
              onSessionExpired={handleSessionExpired}
              onGoToExport={goToExport}
              onDirtyChange={setConfigDirty}
            />
          )}
        </>
      )}
    </div>
  );
}