import { useState } from 'react';
import EditablePresentationNumber from './EditablePresentationNumber';
import ScoreForm from './ScoreForm';
import { getCategoryConfigById, getJudgeFullName, resolveDisciplineOnNumberChange } from '../utils';

export default function ScoringScreen({ currentEntry, setCurrentEntry, allScores, judge, config, styles, onReview, onCancel }) {
  const categoryConfig = getCategoryConfigById(config, currentEntry.category);
  const [disciplineNotice, setDisciplineNotice] = useState(null);

  const handleRatingChange = (criterionId, value) => {
    setCurrentEntry((prev) => ({ ...prev, ratings: { ...prev.ratings, [criterionId]: value } }));
  };

  const handleAnswerChange = (questionId, value) => {
    setCurrentEntry((prev) => ({ ...prev, openEndedAnswers: { ...prev.openEndedAnswers, [questionId]: value } }));
  };

  const handleSave = () => {
    setCurrentEntry((prev) => ({ ...prev, saved: true, savedAt: new Date().toISOString() }));
  };

  const handleEdit = () => {
    setCurrentEntry((prev) => ({ ...prev, saved: false }));
  };

  // Only used by Poster-style categories (the ones identified by number).
  // The discipline lock is only re-checked if this category actually uses
  // discipline, which this event doesn't.
  const handleNumberChange = (presentationNumber) => {
    if (categoryConfig.usesDiscipline) {
      const { discipline, notice } = resolveDisciplineOnNumberChange(
        allScores,
        categoryConfig,
        currentEntry.discipline,
        presentationNumber
      );
      setDisciplineNotice(notice);
      setCurrentEntry((prev) => ({ ...prev, presentationNumber, discipline }));
    } else {
      setCurrentEntry((prev) => ({ ...prev, presentationNumber }));
    }
  };

  const handleCancelClick = () => {
    const confirmed = window.confirm(
      'Discard this score and choose a different presentation? Everything you entered for it will be lost.'
    );
    if (confirmed) onCancel();
  };

  if (!categoryConfig) {
    return (
      <div style={styles.card}>
        <div style={styles.error}>This presentation's category is no longer configured.</div>
        <button style={styles.buttonSecondary} onClick={onCancel}>
          Choose a Different Presentation
        </button>
      </div>
    );
  }

  return (
    <div>
      {categoryConfig.usesTimeSlots ? (
        // Oral/Video: identified by time slot, shown read-only. If it's
        // wrong, the judge uses "Choose a Different Presentation" below.
        <div style={{ ...styles.card, ...styles.savedCard }}>
          <div style={{ fontWeight: 'bold', fontSize: 'calc(16px * var(--font-scale, 1))' }}>
            Time Slot: {currentEntry.timeSlot}
          </div>
          {currentEntry.room && <div style={styles.help}>Room: {currentEntry.room}</div>}
          {currentEntry.session && <div style={styles.help}>Session: {currentEntry.session}</div>}
        </div>
      ) : (
        <EditablePresentationNumber
          categoryConfig={categoryConfig}
          value={currentEntry.presentationNumber}
          allScores={allScores}
          judgeName={getJudgeFullName(judge)}
          styles={styles}
          onChange={handleNumberChange}
        />
      )}

      {disciplineNotice && (
        <div style={styles.noticeBanner}>
          <span>{disciplineNotice}</span>
          <button style={styles.dismissBtn} onClick={() => setDisciplineNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <ScoreForm
        categoryConfig={categoryConfig}
        timeSlot={currentEntry.timeSlot}
        discipline={currentEntry.discipline}
        entry={currentEntry}
        styles={styles}
        onChangeRating={handleRatingChange}
        onChangeAnswer={handleAnswerChange}
        onSave={handleSave}
        onEdit={handleEdit}
      />

      <div style={styles.card}>
        {!currentEntry.saved && <div style={styles.help}>Save your score above before reviewing.</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            style={{ ...styles.button, ...(currentEntry.saved ? {} : styles.buttonDisabled) }}
            disabled={!currentEntry.saved}
            onClick={onReview}
          >
            Review Score
          </button>
          <button style={styles.buttonSecondary} onClick={handleCancelClick}>
            Choose a Different Presentation
          </button>
        </div>
      </div>
    </div>
  );
}