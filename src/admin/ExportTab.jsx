import { useState, useEffect } from 'react';
import { getAllScores, downloadExcelExport } from './adminApi';
import { markExported } from './exportMark';

export default function ExportTab({ styles, onSessionExpired }) {
  const [scoreCount, setScoreCount] = useState(null); // null until loaded
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [lastFile, setLastFile] = useState('');

  // Shows how many scores the file will contain, so the admin can see at a
  // glance that it isn't empty. If this fails the download still works.
  useEffect(() => {
    let cancelled = false;
    getAllScores()
      .then((scores) => {
        if (!cancelled) setScoreCount(scores.length);
      })
      .catch((err) => {
        if (!cancelled && err.status === 401) onSessionExpired();
      });
    return () => {
      cancelled = true;
    };
  }, [onSessionExpired]);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    setLastFile('');
    try {
      const filename = await downloadExcelExport();
      markExported();
      setLastFile(filename);
    } catch (err) {
      if (err.status === 401) onSessionExpired();
      else setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2>Export to Excel</h2>
      <p style={{ color: '#444' }}>
        Downloads one Excel file with six sheets. This file is the permanent record of the event, so keep a copy
        somewhere safe before the data is ever cleared.
      </p>

      <ul style={{ color: '#444', lineHeight: 1.6 }}>
        <li>
          <strong>PosterPresentations, OralPresentations, VideoPresentations:</strong> the university's results
          layout. One column per judge, one row per presentation, each cell that judge's score, plus the total,
          the number of judges, and the mean.
        </li>
        <li>
          <strong>RawData-Poster, RawData-Oral, RawData-Video:</strong> the full detail, one row per score, with
          every rating, every comment, the room and session, and when it was submitted.
        </li>
      </ul>

      <div style={styles.help}>
        Scores in the layout sheets are adjusted so a judge who rated an extra criterion (the abstract) doesn't get
        an advantage, the same as the Leaderboard. Everything is calculated at the moment you download.
      </div>

      {scoreCount !== null && (
        <div style={{ fontWeight: 'bold', margin: '14px 0 6px' }}>
          {scoreCount} score{scoreCount === 1 ? '' : 's'} will be included.
        </div>
      )}
      {scoreCount === 0 && (
        <div style={styles.help}>There are no scores yet, so the sheets will only contain their headings.</div>
      )}

      {error && <div style={{ ...styles.error, margin: '10px 0' }}>{error}</div>}
      {lastFile && (
        <div style={{ ...styles.successBanner, margin: '10px 0' }}>
          ✓ Downloaded {lastFile}. Check your Downloads folder.
        </div>
      )}

      <button
        style={{ ...styles.button, marginTop: 8, ...(downloading ? styles.buttonDisabled : {}) }}
        disabled={downloading}
        onClick={handleDownload}
      >
        {downloading ? 'Preparing file…' : 'Download Excel File'}
      </button>
    </div>
  );
}