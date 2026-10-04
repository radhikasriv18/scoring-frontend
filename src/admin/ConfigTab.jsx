import { useState, useEffect } from 'react';
import DangerZone from './DangerZone';
import RubricEditor from './RubricEditor';
import { saveConfig, getUsage } from './adminApi';
import { getConfig } from '../api';

const clone = (value) => JSON.parse(JSON.stringify(value));

// A labelled checkbox with a line of explanation under it.
function Toggle({ checked, disabled, onChange, label, help }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <input
          type="checkbox"
          style={{ accentColor: 'var(--bgsu-orange)', marginTop: 3 }}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <strong>{label}</strong>
          {help && <span style={{ display: 'block', fontSize: 13, color: '#666' }}>{help}</span>}
        </span>
      </label>
    </div>
  );
}

// One category's settings. `update` changes the draft; `inUse` means
// presentations already exist for this category, which locks the settings
// that scores depend on.
function CategoryEditor({ category, index, inUse, usedSlots, update, styles }) {
  const [open, setOpen] = useState(false);

  const setField = (field, value) =>
    update((d) => {
      d.categories[index][field] = value;
    });

  // Turning the abstract question on also makes sure its criterion exists.
  const setAbstractOption = (value) =>
    update((d) => {
      const c = d.categories[index];
      c.hasAbstractOption = value;
      if (value && !c.abstractCriterion) {
        c.abstractCriterion = { id: 'abstract', label: 'Abstract', bullets: [] };
      }
    });

  const addSlot = () =>
    update((d) => {
      d.categories[index].timeSlots.push({ id: `slot-${Date.now()}`, label: '', rangeHint: '' });
    });
  const setSlot = (slotIndex, field, value) =>
    update((d) => {
      d.categories[index].timeSlots[slotIndex][field] = value;
    });
  const removeSlot = (slotIndex) =>
    update((d) => {
      d.categories[index].timeSlots.splice(slotIndex, 1);
    });

  const addQuestion = () =>
    update((d) => {
      d.categories[index].openEndedQuestions.push({ id: `question-${Date.now()}`, label: '' });
    });
  const setQuestion = (questionIndex, value) =>
    update((d) => {
      d.categories[index].openEndedQuestions[questionIndex].label = value;
    });
  const removeQuestion = (questionIndex) => {
    if (
      inUse &&
      !window.confirm('Scores already exist for this category. Comments judges wrote for this question will stay in the data but will no longer show its wording. Remove it anyway?')
    ) {
      return;
    }
    update((d) => {
      d.categories[index].openEndedQuestions.splice(questionIndex, 1);
    });
  };

  const criteriaCount = category.rubric.criteria.length;
  const questionCount = category.openEndedQuestions.length;
  const summary = [
    category.usesTimeSlots ? `Time slots (${category.timeSlots.length})` : 'Numbered presentations',
    `${criteriaCount} criteri${criteriaCount === 1 ? 'on' : 'a'}`,
    `${questionCount} open-ended question${questionCount === 1 ? '' : 's'}`,
  ].join(' · ');

  const sectionTitle = { fontWeight: 'bold', margin: '18px 0 8px' };

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 18 }}>{category.name || '(unnamed)'}</div>
          <div style={styles.help}>{summary}</div>
        </div>
        <button style={styles.buttonSecondary} onClick={() => setOpen(!open)}>
          {open ? 'Collapse' : 'Edit'}
        </button>
      </div>

      {inUse && (
        <div style={{ ...styles.help, color: '#8a6d1d', marginTop: 8 }}>
          🔒 Scores already exist for this category, so its name, how presentations are identified (number, time slot,
          room, session), its rating scale and its set of criteria are locked, along with any time slot that's in use.
          They unlock once the data is cleared.
        </div>
      )}

      {open && (
        <div style={{ marginTop: 14 }}>
          <label style={styles.label}>Category name</label>
          <input
            style={styles.input}
            value={category.name}
            disabled={inUse}
            onChange={(e) => setField('name', e.target.value)}
          />

          <div style={sectionTitle}>How judges identify a presentation</div>
          <Toggle
            checked={Boolean(category.usesTimeSlots)}
            disabled={inUse}
            onChange={(value) => setField('usesTimeSlots', value)}
            label="By time slot, not a presentation number"
            help="Judges pick a time slot from a list. Oral and Video work this way at this event; Poster uses numbers."
          />
          <Toggle
            checked={Boolean(category.usesRoom)}
            disabled={inUse}
            onChange={(value) => setField('usesRoom', value)}
            label="Ask for the room"
            help="For events where several rooms run at the same time."
          />
          <Toggle
            checked={Boolean(category.usesSession)}
            disabled={inUse}
            onChange={(value) => setField('usesSession', value)}
            label="Ask for the session"
          />

          {!category.usesTimeSlots && (
            <>
              <label style={styles.label}>Highest presentation number</label>
              <input
                style={{ ...styles.input, maxWidth: 160 }}
                type="number"
                min="1"
                value={category.maxPresentationNumber}
                onChange={(e) => setField('maxPresentationNumber', Math.max(1, Math.floor(Number(e.target.value)) || 1))}
              />
            </>
          )}

          {category.usesTimeSlots && (
            <>
              <div style={sectionTitle}>Time slots</div>
              {category.timeSlots.map((slot, slotIndex) => {
                const slotInUse = usedSlots.includes(`${category.name}|${slot.label.trim()}`);
                return (
                  <div key={slot.id} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                    <input
                      style={{ ...styles.input, marginBottom: 0, flex: '1 1 200px' }}
                      value={slot.label}
                      placeholder="Label, e.g. 9:00 – 9:20 AM"
                      disabled={slotInUse}
                      onChange={(e) => setSlot(slotIndex, 'label', e.target.value)}
                    />
                    <input
                      style={{ ...styles.input, marginBottom: 0, flex: '1 1 200px' }}
                      value={slot.rangeHint || ''}
                      placeholder="Hint, e.g. Presentations 1–5"
                      onChange={(e) => setSlot(slotIndex, 'rangeHint', e.target.value)}
                    />
                    <button
                      style={{ ...styles.dangerButton, ...(slotInUse ? styles.buttonDisabled : {}) }}
                      disabled={slotInUse}
                      title={slotInUse ? 'This time slot is already in use.' : ''}
                      onClick={() => removeSlot(slotIndex)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              {category.timeSlots.length === 0 && (
                <div style={{ ...styles.error, marginBottom: 8 }}>A category that uses time slots needs at least one.</div>
              )}
              <button style={styles.buttonSecondary} onClick={addSlot}>
                + Add Time Slot
              </button>
            </>
          )}

          <div style={sectionTitle}>What judges are asked</div>
          <Toggle
            checked={Boolean(category.usesDiscipline)}
            onChange={(value) => setField('usesDiscipline', value)}
            label="Ask which discipline the presentation belongs to"
            help="The choices come from the Disciplines list above. Off at this event."
          />
          <Toggle
            checked={Boolean(category.hasAbstractOption)}
            onChange={setAbstractOption}
            label="Ask whether the presentation includes an abstract"
            help="If yes, judges rate one extra criterion, and scores are scaled so it's fair."
          />
          <Toggle
            checked={category.requireOpenEnded !== false}
            onChange={(value) => setField('requireOpenEnded', value)}
            label="Require an answer to every open-ended question"
            help="When on, a judge can't save a score until every question below has an answer."
          />

          <div style={sectionTitle}>Open-ended questions</div>
          {category.openEndedQuestions.map((question, questionIndex) => (
            <div key={question.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input
                style={{ ...styles.input, marginBottom: 0, flex: '1 1 auto' }}
                value={question.label}
                onChange={(e) => setQuestion(questionIndex, e.target.value)}
              />
              <button style={styles.dangerButton} onClick={() => removeQuestion(questionIndex)}>
                Remove
              </button>
            </div>
          ))}
          {questionCount === 0 && <div style={{ color: '#888', marginBottom: 8 }}>No open-ended questions.</div>}
          <button style={styles.buttonSecondary} onClick={addQuestion}>
            + Add Question
          </button>

          <div style={sectionTitle}>Rubric</div>
          <RubricEditor category={category} index={index} inUse={inUse} update={update} styles={styles} />
        </div>
      )}
    </div>
  );
}

export default function ConfigTab({ styles, onSessionExpired, onGoToExport, onDirtyChange }) {
  const [saved, setSaved] = useState(null); // the settings as stored on the server
  const [draft, setDraft] = useState(null); // the settings being edited
  const [usage, setUsage] = useState(null); // what existing data already uses
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getConfig(), getUsage()])
      .then(([loadedConfig, loadedUsage]) => {
        if (cancelled) return;
        setSaved(loadedConfig);
        setDraft(clone(loadedConfig));
        setUsage(loadedUsage);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = Boolean(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved));

  // Tell the dashboard whether there are unsaved changes, so it can warn
  // before the admin leaves this tab.
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // Changes the draft by cloning it, letting `mutator` edit the clone, and
  // storing the result. Keeps every edit handler to a line or two.
  const update = (mutator) => {
    setJustSaved(false);
    setDraft((prev) => {
      const next = clone(prev);
      mutator(next);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setJustSaved(false);
    try {
      await saveConfig(draft);
      setSaved(clone(draft));
      setJustSaved(true);
    } catch (err) {
      if (err.status === 401) onSessionExpired();
      else setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!window.confirm('Discard all your unsaved changes?')) return;
    setDraft(clone(saved));
    setSaveError('');
    setJustSaved(false);
  };

  // After a reset there is no data left, so the locks should lift.
  const refreshUsage = () => {
    getUsage()
      .then(setUsage)
      .catch(() => {
        // Keep the old locks if this fails. They're only a convenience;
        // the server enforces the same rules.
      });
  };

  if (!draft || !usage) {
    return (
      <div style={styles.card}>
        {loadError ? <div style={styles.error}>Could not load the settings: {loadError}</div> : 'Loading…'}
      </div>
    );
  }

  const addDiscipline = () =>
    update((d) => {
      d.disciplines.push({ id: `discipline-${Date.now()}`, label: '' });
    });
  const setDiscipline = (disciplineIndex, value) =>
    update((d) => {
      d.disciplines[disciplineIndex].label = value;
    });
  const removeDiscipline = (disciplineIndex) =>
    update((d) => {
      d.disciplines.splice(disciplineIndex, 1);
    });

  return (
    <div>
      <div
        style={{
          ...styles.card,
          position: 'sticky',
          top: 0,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          border: dirty ? '2px solid var(--bgsu-orange)' : '1px solid #ddd',
        }}
      >
        <div>
          {dirty ? (
            <strong style={{ color: '#b45309' }}>You have unsaved changes.</strong>
          ) : justSaved ? (
            <strong style={{ color: '#1a7a1a' }}>✓ Saved. Judges see the changes the next time they open the app.</strong>
          ) : (
            <span style={{ color: '#666' }}>All changes saved.</span>
          )}
          {saveError && <div style={{ ...styles.error, marginTop: 6, marginBottom: 0 }}>{saveError}</div>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{ ...styles.button, ...(dirty && !saving ? {} : styles.buttonDisabled) }}
            disabled={!dirty || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            style={{ ...styles.buttonSecondary, ...(dirty && !saving ? {} : styles.buttonDisabled) }}
            disabled={!dirty || saving}
            onClick={handleDiscard}
          >
            Discard
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2>Conference Title</h2>
        <input
          style={styles.input}
          value={draft.conferenceTitle}
          onChange={(e) =>
            update((d) => {
              d.conferenceTitle = e.target.value;
            })
          }
        />
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ margin: 0 }}>Disciplines</h2>
          <button style={styles.buttonSecondary} onClick={addDiscipline}>
            + Add Discipline
          </button>
        </div>
        <div style={styles.help}>
          Only asked for categories that have "Ask which discipline" turned on below (none at this event). A discipline
          that's already in use can't be renamed or removed.
        </div>
        {draft.disciplines.map((discipline, disciplineIndex) => {
          const disciplineInUse = usage.disciplines.includes(discipline.label.trim());
          return (
            <div key={discipline.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input
                style={{ ...styles.input, marginBottom: 0, flex: '1 1 auto' }}
                value={discipline.label}
                disabled={disciplineInUse}
                onChange={(e) => setDiscipline(disciplineIndex, e.target.value)}
              />
              <button
                style={{ ...styles.dangerButton, ...(disciplineInUse ? styles.buttonDisabled : {}) }}
                disabled={disciplineInUse}
                title={disciplineInUse ? 'This discipline is already in use.' : ''}
                onClick={() => removeDiscipline(disciplineIndex)}
              >
                Remove
              </button>
            </div>
          );
        })}
        {draft.disciplines.length === 0 && <div style={{ color: '#888', marginTop: 8 }}>No disciplines yet.</div>}
      </div>

      <h2 style={{ margin: '24px 0 12px' }}>Categories</h2>
      {draft.categories.map((category, index) => (
        <CategoryEditor
          key={category.id}
          category={category}
          index={index}
          inUse={usage.categories.includes(category.name)}
          usedSlots={usage.timeSlots}
          update={update}
          styles={styles}
        />
      ))}

      <DangerZone
        styles={styles}
        onSessionExpired={onSessionExpired}
        onGoToExport={onGoToExport}
        onReset={refreshUsage}
      />
    </div>
  );
}