// Edits one category's rubric: the rating scale and its labels, the
// criteria with their bullet points, and the abstract criterion.

const MAX_SCALE_VALUES = 10;

// A list of text boxes (bullet points) with add and remove.
function BulletList({ bullets, onAdd, onChange, onRemove, styles }) {
  return (
    <div style={{ marginLeft: 16 }}>
      {bullets.map((bullet, bulletIndex) => (
        <div key={bulletIndex} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <span style={{ color: '#888' }}>•</span>
          <input
            style={{ ...styles.input, marginBottom: 0, flex: '1 1 auto', fontSize: 13 }}
            value={bullet}
            onChange={(e) => onChange(bulletIndex, e.target.value)}
          />
          <button style={styles.dangerButton} onClick={() => onRemove(bulletIndex)} aria-label="Remove bullet point">
            ×
          </button>
        </div>
      ))}
      <button style={styles.buttonSecondary} onClick={onAdd}>
        + Add Bullet Point
      </button>
    </div>
  );
}

export default function RubricEditor({ category, index, inUse, update, styles }) {
  const rubric = category.rubric;
  const criteria = rubric.criteria;
  const abstractCriterion = category.abstractCriterion || { id: 'abstract', label: '', bullets: [] };

  const scaleValid =
    Number.isInteger(rubric.scaleMin) &&
    Number.isInteger(rubric.scaleMax) &&
    rubric.scaleMin < rubric.scaleMax &&
    rubric.scaleMax - rubric.scaleMin + 1 <= MAX_SCALE_VALUES;

  const scaleValues = [];
  if (scaleValid) {
    for (let v = rubric.scaleMin; v <= rubric.scaleMax; v++) scaleValues.push(v);
  }

  // --- rating scale ---
  const setScaleBound = (field, text) => {
    const number = parseInt(text, 10);
    if (Number.isNaN(number)) return;
    update((d) => {
      const r = d.categories[index].rubric;
      r[field] = number;
      // Rebuild the labels for the new range, keeping any text already
      // typed for values that are still in range.
      if (r.scaleMin < r.scaleMax && r.scaleMax - r.scaleMin + 1 <= MAX_SCALE_VALUES) {
        const labels = {};
        for (let v = r.scaleMin; v <= r.scaleMax; v++) labels[v] = (r.scaleLabels && r.scaleLabels[v]) || '';
        r.scaleLabels = labels;
      }
    });
  };
  const setScaleLabel = (value, text) =>
    update((d) => {
      const r = d.categories[index].rubric;
      r.scaleLabels = { ...(r.scaleLabels || {}), [value]: text };
    });

  // --- criteria ---
  const addCriterion = () =>
    update((d) => {
      d.categories[index].rubric.criteria.push({ id: `criterion-${Date.now()}`, label: '', bullets: [] });
    });
  const setCriterionLabel = (criterionIndex, text) =>
    update((d) => {
      d.categories[index].rubric.criteria[criterionIndex].label = text;
    });
  const removeCriterion = (criterionIndex) => {
    if (!window.confirm('Remove this criterion from the rubric?')) return;
    update((d) => {
      d.categories[index].rubric.criteria.splice(criterionIndex, 1);
    });
  };
  const addBullet = (criterionIndex) =>
    update((d) => {
      d.categories[index].rubric.criteria[criterionIndex].bullets.push('');
    });
  const setBullet = (criterionIndex, bulletIndex, text) =>
    update((d) => {
      d.categories[index].rubric.criteria[criterionIndex].bullets[bulletIndex] = text;
    });
  const removeBullet = (criterionIndex, bulletIndex) =>
    update((d) => {
      d.categories[index].rubric.criteria[criterionIndex].bullets.splice(bulletIndex, 1);
    });

  // --- abstract criterion ---
  const ensureAbstract = (d) => {
    const c = d.categories[index];
    if (!c.abstractCriterion) c.abstractCriterion = { id: 'abstract', label: '', bullets: [] };
    return c.abstractCriterion;
  };
  const setAbstractLabel = (text) =>
    update((d) => {
      ensureAbstract(d).label = text;
    });
  const addAbstractBullet = () =>
    update((d) => {
      ensureAbstract(d).bullets.push('');
    });
  const setAbstractBullet = (bulletIndex, text) =>
    update((d) => {
      ensureAbstract(d).bullets[bulletIndex] = text;
    });
  const removeAbstractBullet = (bulletIndex) =>
    update((d) => {
      ensureAbstract(d).bullets.splice(bulletIndex, 1);
    });

  const subTitle = { fontWeight: 'bold', margin: '16px 0 8px' };

  return (
    <div>
      <div style={subTitle}>Rating scale</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <label style={styles.label}>Lowest rating</label>
          <input
            style={{ ...styles.input, width: 110 }}
            type="number"
            value={rubric.scaleMin}
            disabled={inUse}
            onChange={(e) => setScaleBound('scaleMin', e.target.value)}
          />
        </div>
        <div>
          <label style={styles.label}>Highest rating</label>
          <input
            style={{ ...styles.input, width: 110 }}
            type="number"
            value={rubric.scaleMax}
            disabled={inUse}
            onChange={(e) => setScaleBound('scaleMax', e.target.value)}
          />
        </div>
      </div>
      {!scaleValid && (
        <div style={styles.error}>
          The lowest rating must be below the highest, with at most {MAX_SCALE_VALUES} values in between.
        </div>
      )}
      {scaleValues.map((value) => (
        <div key={value} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <label style={{ ...styles.label, minWidth: 34, marginBottom: 0 }}>{value} =</label>
          <input
            style={{ ...styles.input, marginBottom: 0, flex: '1 1 200px', maxWidth: 360 }}
            value={(rubric.scaleLabels && rubric.scaleLabels[value]) || ''}
            onChange={(e) => setScaleLabel(value, e.target.value)}
          />
        </div>
      ))}

      <div style={subTitle}>Criteria</div>
      {inUse && (
        <div style={{ ...styles.help, color: '#8a6d1d' }}>
          🔒 Scores already exist, so criteria can't be added or removed (that would change how existing totals
          compare). You can still edit their wording and bullet points.
        </div>
      )}
      {criteria.map((criterion, criterionIndex) => (
        <div key={criterion.id} style={{ marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 'bold', minWidth: 22 }}>{criterionIndex + 1}.</span>
            <input
              style={{ ...styles.input, marginBottom: 0, flex: '1 1 auto' }}
              value={criterion.label}
              placeholder="Criterion name"
              onChange={(e) => setCriterionLabel(criterionIndex, e.target.value)}
            />
            <button
              style={{ ...styles.dangerButton, ...(inUse ? styles.buttonDisabled : {}) }}
              disabled={inUse}
              title={inUse ? 'Scores already exist for this category.' : ''}
              onClick={() => removeCriterion(criterionIndex)}
            >
              Remove
            </button>
          </div>
          <BulletList
            bullets={criterion.bullets}
            styles={styles}
            onAdd={() => addBullet(criterionIndex)}
            onChange={(bulletIndex, text) => setBullet(criterionIndex, bulletIndex, text)}
            onRemove={(bulletIndex) => removeBullet(criterionIndex, bulletIndex)}
          />
        </div>
      ))}
      {criteria.length === 0 && (
        <div style={{ ...styles.error, marginBottom: 8 }}>
          This category has no criteria yet, so judges can't score it.
        </div>
      )}
      <button
        style={{ ...styles.buttonSecondary, ...(inUse ? styles.buttonDisabled : {}) }}
        disabled={inUse}
        onClick={addCriterion}
      >
        + Add Criterion
      </button>
      {scaleValid && criteria.length > 0 && (
        <div style={{ ...styles.help, marginTop: 8 }}>
          Highest possible total: {rubric.scaleMax * criteria.length}
        </div>
      )}

      {category.hasAbstractOption && (
        <>
          <div style={subTitle}>Abstract criterion</div>
          <div style={styles.help}>
            Judges rate this one extra criterion only when they say the presentation includes an abstract.
          </div>
          <input
            style={{ ...styles.input, marginBottom: 8 }}
            value={abstractCriterion.label}
            placeholder="Criterion name"
            onChange={(e) => setAbstractLabel(e.target.value)}
          />
          <BulletList
            bullets={abstractCriterion.bullets || []}
            styles={styles}
            onAdd={addAbstractBullet}
            onChange={setAbstractBullet}
            onRemove={removeAbstractBullet}
          />
        </>
      )}
    </div>
  );
}