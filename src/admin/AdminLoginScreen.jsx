import { useState } from 'react';

export default function AdminLoginScreen({ styles, onLogin, error, loading }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = !loading && username.trim() !== '' && password !== '';
  const submit = () => {
    if (canSubmit) onLogin(username.trim(), password);
  };

  return (
    <div style={{ ...styles.card, maxWidth: 400, margin: '40px auto' }}>
      <h2>Admin Login</h2>

      <label style={styles.label}>Username</label>
      <input
        style={styles.input}
        type="text"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      <label style={styles.label}>Password</label>
      <input
        style={styles.input}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      {error && <div style={styles.error}>{error}</div>}

      <button
        style={{ ...styles.button, ...(canSubmit ? {} : styles.buttonDisabled) }}
        disabled={!canSubmit}
        onClick={submit}
      >
        {loading ? 'Logging in…' : 'Log In'}
      </button>
    </div>
  );
}