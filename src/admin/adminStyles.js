import { styles as judgeStyles } from '../styles';

// The dashboard is a desktop tool, so it reuses the judge styles (same BGSU
// look) and adds what only the dashboard needs: a wider page, the tab bar,
// tables, filters and a danger button.
export const adminStyles = {
  ...judgeStyles,
  page: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px 16px 64px',
  },
  tabBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 18,
    background: 'var(--bgsu-brown)',
    padding: '10px 12px',
    borderRadius: 8,
  },
  tabButton: {
    padding: '10px 16px',
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid transparent',
    background: 'rgba(255,255,255,0.14)',
    color: '#fff',
    cursor: 'pointer',
  },
  tabButtonActive: {
    background: 'var(--bgsu-orange)',
    color: '#fff',
    borderColor: 'var(--bgsu-orange)',
  },
  dangerButton: {
    padding: '8px 14px',
    fontSize: 13,
    borderRadius: 6,
    border: '1px solid #b00020',
    background: '#fff',
    color: '#b00020',
    cursor: 'pointer',
  },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 10 },
  filterCol: { flex: '1 1 200px' },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: 13 },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '2px solid #ccc',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  td: { padding: '8px 10px', borderBottom: '1px solid #eee', verticalAlign: 'top' },
};