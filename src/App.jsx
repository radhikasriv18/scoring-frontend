import { useState, useEffect } from 'react';
import JudgeEntryScreen from './components/JudgeEntryScreen';
import PresentationEntryScreen from './components/PresentationEntryScreen';
import ScoringScreen from './components/ScoringScreen';
import ReviewScreen from './components/ReviewScreen';
import SubmittedScreen from './components/SubmittedScreen';
import DoneScreen from './components/DoneScreen';
import FontScaleToggle from './components/FontScaleToggle';
import { loadFontScale, saveFontScale } from './fontScale';
import { loadDraft, saveDraft, clearDraft, isDraftStillValid } from './draft';
import { getJudgeFullName, getCategoryConfigById } from './utils';
import { getConfig, signInJudge, getJudgeScores, submitScore, setJudgeFinished } from './api';
import { styles } from './styles';

const EMPTY_JUDGE = { id: null, code: '', firstName: '', lastName: '' };

function App() {
  // judgeEntry | entry | scoring | review | submitted | done
  const [screen, setScreen] = useState('judgeEntry');
  const [judge, setJudge] = useState(EMPTY_JUDGE);
  const [currentEntry, setCurrentEntry] = useState(null);

  // This judge's own past scores, loaded right after sign-in.
  const [allScores, setAllScores] = useState([]);

  const [signInError, setSignInError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(false);

  const [finishError, setFinishError] = useState('');
  const [finishing, setFinishing] = useState(false);

  // null = still loading.
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState('');

  const [fontScale, setFontScale] = useState(() => loadFontScale());
  useEffect(() => {
    saveFontScale(fontScale);
  }, [fontScale]);

  // Load the real config once, when the app first opens.
  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then((loaded) => {
        if (!cancelled) setConfig(loaded);
      })
      .catch((err) => {
        if (!cancelled) setConfigError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Save the in-progress score on this device every time it changes, so a
  // refresh or closed tab loses nothing.
  useEffect(() => {
    if (judge.id && currentEntry) saveDraft(judge.id, currentEntry);
  }, [judge.id, currentEntry]);

  // Creates the judge in the database, or finds them if this code already
  // exists, then loads their past scores. We keep what the SERVER returns,
  // not what was typed: if the code was used before, the name stored the
  // first time is the one that stays. Nothing changes on screen until BOTH
  // requests succeed, so a failure leaves the judge on the sign-in screen.
  const handleSignIn = async () => {
    setSigningIn(true);
    setSignInError('');
    try {
      const signedIn = await signInJudge({
        code: judge.code.trim(),
        firstName: judge.firstName.trim(),
        lastName: judge.lastName.trim(),
      });
      const scores = await getJudgeScores(signedIn.id);
      setJudge(signedIn);
      setAllScores(scores);

      // If this judge left a score half-finished on this device, pick up
      // where they left off. A draft that can't be used any more is deleted.
      const draft = loadDraft(signedIn.id);
      if (draft && isDraftStillValid(draft, config, scores)) {
        setCurrentEntry(draft);
        setWelcomeBack(true);
        setScreen('scoring');
      } else {
        if (draft) clearDraft(signedIn.id);
        setScreen('entry');
      }
    } catch (err) {
      setSignInError(err.message);
    } finally {
      setSigningIn(false);
    }
  };

  const handleStart = (entry) => {
    setWelcomeBack(false);
    setFinishError('');
    setCurrentEntry(entry);
    setScreen('scoring');
  };

  // The judge chose to throw away the score in progress.
  const handleCancelEntry = () => {
    clearDraft(judge.id);
    setCurrentEntry(null);
    setWelcomeBack(false);
    setScreen('entry');
  };

  // A score was just submitted: show the "what next?" choice.
  const finishSubmission = () => {
    clearDraft(judge.id);
    setCurrentEntry(null);
    setWelcomeBack(false);
    setFinishError('');
    setScreen('submitted');
  };

  // Sends the finished score to the backend. If it fails, the judge stays
  // on the Review screen with the error and can tap Confirm again (safe:
  // the presentation step reuses an existing record).
  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError('');
    const categoryConfig = getCategoryConfigById(config, currentEntry.category);
    try {
      const newScore = await submitScore({ judge, entry: currentEntry, categoryName: categoryConfig.name });
      setAllScores((prev) => [newScore, ...prev]);
      finishSubmission();
    } catch (err) {
      if (err.status === 409) {
        // "Already scored": the score is already in the database. Most
        // likely an earlier attempt saved but its reply got lost on a bad
        // connection. Refresh the list from the server and carry on.
        try {
          setAllScores(await getJudgeScores(judge.id));
        } catch {
          // Keep the list we have; it refreshes at the next sign-in.
        }
        finishSubmission();
      } else {
        setSubmitError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleScoreAnother = () => {
    setFinishError('');
    setScreen('entry');
  };

  // "I've Finished ALL My Presentations". The wording is deliberately
  // explicit, and the popup repeats it with the judge's count, so nobody
  // mistakes this for "finished with THIS presentation".
  const handleFinish = async () => {
    const count = allScores.length;
    const confirmed = window.confirm(
      `You have scored ${count} presentation${count === 1 ? '' : 's'}.\n\n` +
        'Tap OK ONLY if you have finished scoring ALL of the presentations assigned to you. ' +
        'This tells the organizers you are done and leaving.\n\n' +
        'If you still have presentations to score, tap Cancel.'
    );
    if (!confirmed) return;

    setFinishing(true);
    setFinishError('');
    try {
      await setJudgeFinished(judge.id, true);
      setScreen('done');
    } catch (err) {
      setFinishError(err.message);
    } finally {
      setFinishing(false);
    }
  };

  // Tapped finish by mistake: tell the backend they're scoring again.
  const handleResume = async () => {
    setFinishing(true);
    setFinishError('');
    try {
      await setJudgeFinished(judge.id, false);
      setScreen('entry');
    } catch (err) {
      setFinishError(err.message);
    } finally {
      setFinishing(false);
    }
  };

  // Back to a blank sign-in screen (for a shared device).
  const handleSignOut = () => {
    setJudge(EMPTY_JUDGE);
    setAllScores([]);
    setCurrentEntry(null);
    setSignInError('');
    setSubmitError('');
    setFinishError('');
    setWelcomeBack(false);
    setScreen('judgeEntry');
  };

  // Still loading, or failed to load: show a simple header and message.
  if (config === null) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <h1>Judge Scoring</h1>
          <div style={{ color: 'rgba(255,255,255,0.85)' }}>{configError ? 'Something went wrong' : 'Loading…'}</div>
        </div>
        {configError && (
          <div style={styles.card}>
            <div style={styles.error}>Could not load the scoring setup: {configError}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, '--font-scale': fontScale }}>
      <div style={styles.header}>
        <h1>{config.conferenceTitle}</h1>
        <div style={{ color: 'rgba(255,255,255,0.85)' }}>Research Symposium — Judge Scoring</div>
        {judge.id && screen !== 'judgeEntry' && (
          <div style={{ fontSize: 'calc(13px * var(--font-scale, 1))', color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            Judge: {getJudgeFullName(judge)}
          </div>
        )}
      </div>

      <FontScaleToggle fontScale={fontScale} setFontScale={setFontScale} styles={styles} />

      {welcomeBack && screen !== 'judgeEntry' && (
        <div style={styles.noticeBanner}>
          <span>Welcome back — your in-progress presentation was restored.</span>
          <button style={styles.dismissBtn} onClick={() => setWelcomeBack(false)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {screen === 'judgeEntry' && (
        <JudgeEntryScreen
          judge={judge}
          setJudge={setJudge}
          styles={styles}
          onContinue={handleSignIn}
          error={signInError}
          loading={signingIn}
        />
      )}

      {screen === 'entry' && (
        <>
          <PresentationEntryScreen
            judge={judge}
            allScores={allScores}
            config={config}
            styles={styles}
            onStart={handleStart}
          />

          {/* Always available once the judge has scored something, so they can
              still say they're finished after signing back in. */}
          {allScores.length > 0 && (
            <div style={styles.card}>
              <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Finished judging?</div>
              <div style={styles.help}>
                Only tap this if you have scored ALL of your assigned presentations and are leaving. It tells the
                organizers you are done.
              </div>
              {finishError && <div style={styles.error}>{finishError}</div>}
              <button
                style={{ ...styles.buttonSecondary, ...(finishing ? styles.buttonDisabled : {}) }}
                disabled={finishing}
                onClick={handleFinish}
              >
                {finishing ? 'Please wait…' : "I've Finished ALL My Presentations"}
              </button>
            </div>
          )}
        </>
      )}

      {screen === 'scoring' && currentEntry && (
        <ScoringScreen
          currentEntry={currentEntry}
          setCurrentEntry={setCurrentEntry}
          allScores={allScores}
          judge={judge}
          config={config}
          styles={styles}
          onReview={() => {
            setSubmitError('');
            setScreen('review');
          }}
          onCancel={handleCancelEntry}
        />
      )}

      {screen === 'review' && currentEntry && (
        <ReviewScreen
          currentEntry={currentEntry}
          config={config}
          styles={styles}
          onGoBack={() => {
            setSubmitError('');
            setScreen('scoring');
          }}
          onConfirm={handleConfirm}
          error={submitError}
          submitting={submitting}
        />
      )}

      {screen === 'submitted' && (
        <SubmittedScreen
          styles={styles}
          onScoreAnother={handleScoreAnother}
          onFinish={handleFinish}
          error={finishError}
          busy={finishing}
        />
      )}

      {screen === 'done' && (
        <DoneScreen
          judge={judge}
          scoreCount={allScores.length}
          styles={styles}
          onResume={handleResume}
          onSignOut={handleSignOut}
          error={finishError}
          busy={finishing}
        />
      )}
    </div>
  );
}

export default App;