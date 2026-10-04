import { useState } from 'react';
import { validatePresentationNumber } from '../utils';

export default function EditablePresentationNumber({ categoryConfig, value, allScores, judgeName, styles, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState('');

  const startEdit = () => {
    setInputValue(value);
    setError('');
    setIsEditing(true);
  };

  const handleSave = () => {
    const result = validatePresentationNumber(categoryConfig, inputValue, allScores, judgeName);
    if (result.error) {
      setError(result.error);
      return;
    }
    onChange(result.value);
    setIsEditing(false);
    setError('');
  };

  if (!isEditing) {
    return (
      <div
        style={{
          ...styles.card,
          ...styles.savedCard,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: 'calc(16px * var(--font-scale, 1))' }}>
          Presentation Number: #{value}
        </div>
        <button style={styles.buttonSecondary} onClick={startEdit}>
          Edit
        </button>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <label style={styles.label}>Presentation Number</label>
      <input
        style={styles.input}
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />
      {error && <div style={styles.error}>{error}</div>}
      <button style={styles.button} onClick={handleSave}>
        Save
      </button>
    </div>
  );
}