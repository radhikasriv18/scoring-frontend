import { FONT_SCALE_OPTIONS } from '../fontScale';

// Sets --font-scale on the page root (see App), so every font size defined
// as calc(...px * var(--font-scale, 1)) in styles.js updates immediately,
// with no prop-passing through the component tree.
export default function FontScaleToggle({ fontScale, setFontScale, styles }) {
  return (
    <div style={styles.fontScaleRow}>
      <span style={styles.fontScaleLabel}>Text Size:</span>
      {FONT_SCALE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          style={{ ...styles.fontScaleButton, ...(fontScale === opt.value ? styles.fontScaleButtonActive : {}) }}
          onClick={() => setFontScale(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}