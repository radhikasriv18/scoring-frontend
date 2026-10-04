import { useState } from 'react';
import MySubmittedPresentations from './MySubmittedPresentations';
import {
  getJudgeFullName,
  getCategoryConfigById,
  findExistingDiscipline,
  validatePresentationNumber,
  checkTimeSlotAlreadySubmitted,
} from '../utils';

export default function PresentationEntryScreen({ judge, allScores, config, styles, onStart }) {
  const [categoryId, setCategoryId] = useState(config.categories[0] ? config.categories[0].id : '');
  const [timeSlotId, setTimeSlotId] = useState('');
  const [numberInput, setNumberInput] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [sessionInput, setSessionInput] = useState('');
  const [disciplineId, setDisciplineId] = useState('');
  const [includesAbstract, setIncludesAbstract] = useState(null); // null = unanswered
  const [error, setError] = useState('');

  const judgeFullName = getJudgeFullName(judge);
  const myScores = allScores.filter((s) => s.judgeName === judgeFullName);
  const categoryConfig = getCategoryConfigById(config, categoryId);

  // The real branch point: does this category identify a presentation by
  // number (Poster), or by time slot (this event's Oral/Video)? Never both.
  const needsTimeSlot = categoryConfig ? categoryConfig.usesTimeSlots : false;
  const needsRoom = categoryConfig ? !!categoryConfig.usesRoom : false;
  const needsSession = categoryConfig ? !!categoryConfig.usesSession : false;
  const needsDiscipline = categoryConfig ? !!categoryConfig.usesDiscipline : false;

  const selectedSlot = categoryConfig ? categoryConfig.timeSlots.find((t) => t.id === timeSlotId) : null;
  const hasCriteria = categoryConfig ? categoryConfig.rubric.criteria.length > 0 : false;

  // "Has the judge entered enough to show discipline/abstract?" now
  // depends on which identifying method this category uses — a typed
  // number for Poster, or a picked time slot for Oral/Video.
  const trimmedNumber = numberInput.trim();
  const isParseableNumber = trimmedNumber !== '' && Number.isInteger(Number(trimmedNumber));
  const identifyingInfoEntered = needsTimeSlot ? !!timeSlotId : isParseableNumber;

  const existingDiscipline =
    needsDiscipline && identifyingInfoEntered && categoryConfig
      ? findExistingDiscipline(allScores, categoryConfig.name, needsTimeSlot ? selectedSlot?.label : trimmedNumber)
      : null;
  const selectedDiscipline = disciplineId ? config.disciplines.find((d) => d.id === disciplineId) : null;
  const resolvedDiscipline = existingDiscipline || (selectedDiscipline ? selectedDiscipline.label : null);

  const handleCategoryChange = (next) => {
    setCategoryId(next);
    setTimeSlotId('');
    setNumberInput('');
    setRoomInput('');
    setSessionInput('');
    setDisciplineId('');
    setIncludesAbstract(null);
    setError('');
  };

  const handleNumberChange = (next) => {
    setNumberInput(next);
    setDisciplineId('');
  };

  const handleTimeSlotChange = (next) => {
    setTimeSlotId(next);
    setDisciplineId('');
  };

  const handleStart = () => {
    if (!categoryConfig) {
      setError('Please select a category.');
      return;
    }
    if (!hasCriteria) {
      setError("This category doesn't have any rubric criteria configured yet.");
      return;
    }

    // Branch: validate by number OR by time slot, never both.
    let presentationNumberValue = null;
    let timeSlotLabel = null;

    if (needsTimeSlot) {
      if (!timeSlotId) {
        setError('Please select a time slot.');
        return;
      }
      timeSlotLabel = selectedSlot.label;
      const result = checkTimeSlotAlreadySubmitted(categoryConfig, timeSlotLabel, roomInput.trim(), sessionInput.trim(), allScores, judgeFullName);
      if (result.error) {
        setError(result.error);
        return;
      }
    } else {
      const result = validatePresentationNumber(categoryConfig, numberInput, allScores, judgeFullName);
      if (result.error) {
        setError(result.error);
        return;
      }
      presentationNumberValue = result.value;
    }

    if (needsRoom && !roomInput.trim()) {
      setError('Please enter a room.');
      return;
    }
    if (needsSession && !sessionInput.trim()) {
      setError('Please enter a session.');
      return;
    }
    if (needsDiscipline && !resolvedDiscipline) {
      setError('Please select a discipline.');
      return;
    }
    if (categoryConfig.hasAbstractOption && includesAbstract === null) {
      setError('Please answer whether this presentation includes an abstract.');
      return;
    }

    onStart({
      category: categoryId,
      timeSlot: timeSlotLabel,
      room: needsRoom ? roomInput.trim() : null,
      session: needsSession ? sessionInput.trim() : null,
      presentationNumber: presentationNumberValue,
      discipline: needsDiscipline ? resolvedDiscipline : null,
      includesAbstract: categoryConfig.hasAbstractOption ? includesAbstract : false,
      ratings: {},
      openEndedAnswers: {},
      saved: false,
      savedAt: null,
    });
  };

  return (
    <div>
      {myScores.length > 0 && <MySubmittedPresentations scores={myScores} config={config} styles={styles} />}

      <div style={styles.card}>
        <h2>Score a Presentation</h2>

        {config.categories.length === 0 ? (
          <div style={styles.error}>No categories are configured yet. Please contact the symposium organizers.</div>
        ) : (
          <>
            <label style={styles.label}>Category</label>
            {config.categories.map((cat) => (
              <label key={cat.id} style={styles.radioRow}>
                <input
                  type="radio"
                  name="category"
                  style={styles.radio}
                  checked={categoryId === cat.id}
                  onChange={() => handleCategoryChange(cat.id)}
                />
                {cat.name}
              </label>
            ))}

            {categoryConfig && !hasCriteria && (
              <div style={styles.error}>
                This category doesn't have any rubric criteria configured yet — it isn't ready to be judged.
              </div>
            )}

            {needsTimeSlot ? (
              <div style={{ marginTop: 12 }}>
                <label style={styles.label}>Time Slot</label>
                <select style={styles.select} value={timeSlotId} onChange={(e) => handleTimeSlotChange(e.target.value)}>
                  <option value="" disabled>
                    Select a time slot
                  </option>
                  {categoryConfig.timeSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                {selectedSlot && (
                  <div style={styles.help}>{selectedSlot.rangeHint}</div>
                )}
              </div>
            ) : (
              <>
                <label style={{ ...styles.label, marginTop: 12 }}>Presentation Number</label>
                <input
                  style={styles.input}
                  type="text"
                  inputMode="numeric"
                  value={numberInput}
                  onChange={(e) => handleNumberChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                />
              </>
            )}

            {needsRoom && (
              <div style={{ marginTop: 12 }}>
                <label style={styles.label}>Room</label>
                <input
                  style={styles.input}
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                />
              </div>
            )}

            {needsSession && (
              <div style={{ marginTop: 12 }}>
                <label style={styles.label}>Session</label>
                <input
                  style={styles.input}
                  type="text"
                  value={sessionInput}
                  onChange={(e) => setSessionInput(e.target.value)}
                />
              </div>
            )}

            {needsDiscipline && identifyingInfoEntered && (
              <div style={{ marginBottom: 12 }}>
                <label style={styles.label}>Discipline</label>
                {existingDiscipline ? (
                  <div style={{ ...styles.help, color: '#333', marginBottom: 0 }}>
                    {existingDiscipline} — set by a previous judge for this presentation
                  </div>
                ) : config.disciplines.length === 0 ? (
                  <div style={styles.error}>No disciplines are configured yet. Please contact the symposium organizers.</div>
                ) : (
                  <select style={styles.select} value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>
                    <option value="" disabled>
                      Select a discipline
                    </option>
                    {config.disciplines.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {identifyingInfoEntered && categoryConfig && categoryConfig.hasAbstractOption && (
              <div style={{ marginBottom: 12 }}>
                <label style={styles.label}>Does this presentation include an abstract?</label>
                <label style={styles.radioRow}>
                  <input
                    type="radio"
                    name="includesAbstract"
                    style={styles.radio}
                    checked={includesAbstract === true}
                    onChange={() => setIncludesAbstract(true)}
                  />
                  Yes
                </label>
                <label style={styles.radioRow}>
                  <input
                    type="radio"
                    name="includesAbstract"
                    style={styles.radio}
                    checked={includesAbstract === false}
                    onChange={() => setIncludesAbstract(false)}
                  />
                  No
                </label>
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}

            <button
              style={{ ...styles.button, ...(hasCriteria ? {} : styles.buttonDisabled) }}
              disabled={!hasCriteria}
              onClick={handleStart}
            >
              Start Scoring
            </button>
          </>
        )}
      </div>
    </div>
  );
}