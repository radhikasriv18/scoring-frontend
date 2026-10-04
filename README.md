# Scoring Frontend

The React app for the *Embracing Global Engagement* judge scoring system. It
contains **two separate pages** built from one project:

| Page | File | For |
|---|---|---|
| Judge app | `index.html` | judges, mostly on phones |
| Admin dashboard | `admin.html` | organizers, on a computer |

The backend (Express + PostgreSQL) lives in the other repository,
`scoring_system_V2`. Its README explains the whole system; this file covers
only the frontend. Endpoint details are in that repo's `API.md`.

Live: judge app `https://csvm16.cs.bgsu.edu`, dashboard `https://csvm16.cs.bgsu.edu/admin.html`.

## Run it locally

```
npm install
npm run dev
```

Open `http://localhost:5173` (judge app) and `http://localhost:5173/admin.html`
(dashboard). The backend must also be running on `localhost:3000`.

The app only ever calls **relative** paths such as `/api/config`. In
development, Vite forwards `/api` to `localhost:3000` (see `vite.config.js`); in
production, Caddy forwards `/api` to Express. So there is no address to change
between environments. After editing `vite.config.js`, restart `npm run dev`.

Build for production with `npm run build`. It produces `dist/`, which must
contain both `index.html` and `admin.html`. Check that before publishing.

## Project layout

```
index.html, admin.html        the two pages
vite.config.js                dev proxy to the backend + the two-page build
src/
├── main.jsx, App.jsx         judge app: starting point and the screen-by-screen flow
├── api.js                    every judge-side request to the backend (and the shared request helper)
├── styles.js, index.css      the shared look (BGSU colors, spacing)
├── utils.js                  validation and lookup helpers
├── draft.js                  saves a half-finished score on the judge's device
├── fontScale.js              the Normal / Large / X-Large text-size choice
├── components/               judge app screens and pieces
│   ├── JudgeEntryScreen        sign in (code + name)
│   ├── PresentationEntryScreen choose category and presentation
│   ├── ScoringScreen, ScoreForm, RatingLegend, EditablePresentationNumber
│   ├── ReviewScreen, ScoreReadout
│   ├── SubmittedScreen         "Score another" or "I've finished ALL my presentations"
│   ├── DoneScreen              thank-you with the count
│   ├── MySubmittedPresentations, FontScaleToggle
└── admin/                    the dashboard
    ├── main.jsx, AdminApp.jsx  starting point, login, tabs
    ├── AdminLoginScreen.jsx
    ├── adminApi.js             every admin request (adds the login token)
    ├── adminStyles.js
    ├── ScoresTab, ScoreEditForm
    ├── WorkloadTab, LeaderboardTab, ExportTab
    ├── ConfigTab, RubricEditor, DangerZone, exportMark.js
```

(The Vite template may have left unused files such as `src/App.css` and
`src/assets/`; they can be deleted.)

## How the judge app works

`App.jsx` holds the state and decides which screen to show:

```
judgeEntry → entry → scoring → review → submitted → (entry again, or) done
```

- **Sign in** calls `POST /api/judges`. The app keeps what the *server* returns,
  so if the code was used before, the name stored the first time is the one shown.
- **Past scores** for that judge are loaded right after sign-in
  (`GET /api/scores?judge_id=`). They drive the "already scored" checks and the
  "My Submitted Presentations" list.
- **Poster** presentations are identified by a number; **Oral and Video** by a
  time slot. The screens read the category's settings to decide which. Room,
  session and discipline are asked only for categories that turn them on.
- **Drafts**: while a judge scores, `App.jsx` saves the in-progress score to
  `localStorage` (one per judge). After a refresh and sign-in the judge lands back
  on it with a "Welcome back" message. A draft is dropped if its category no
  longer exists or that presentation was already submitted. "Choose a Different
  Presentation" discards it.
- **Submit** calls `submitScore` in `api.js`, which makes two requests in order:
  find-or-create the presentation, then submit the score. Retrying after a failure
  is safe. A `409 already scored` reply is treated as success (an earlier attempt
  saved but its reply was lost) and the list is refreshed.
- **"I've Finished ALL My Presentations"** calls
  `PUT /api/judges/:id/finished`. The wording is deliberately explicit, with a
  confirmation that repeats the judge's count, so nobody mistakes it for "finished
  with this presentation".

## How the dashboard works

`AdminApp.jsx` shows a login screen until it holds a token. The token is kept in
`sessionStorage`: it survives a refresh but is forgotten when the tab closes. Every
admin request goes through `adminRequest` in `adminApi.js`, which adds the
`Authorization: Bearer` header. If the server answers `401` (the login expired), the
dashboard returns to the login screen.

| Tab | Does |
|---|---|
| Scores | filter and sort every score; **Details** shows ratings and comments with their real wording; **Edit** corrects ratings and comments and can move the score to another presentation; **Delete** |
| Judge Workload | one row per judge: counts per category, a status (still scoring / finished / hasn't scored yet), and **Rename** |
| Leaderboard | ranked presentations per category, top 5 / top 10 / all, ties share a rank |
| Export | downloads the Excel file |
| Config | the event settings (title, disciplines, categories, time slots, rubric), and the **Danger Zone** reset |

The Config tab edits a *draft* copy of the settings. A bar shows "unsaved changes",
and leaving the tab, logging out or refreshing asks first. Settings that scores
depend on are shown locked (the server refuses those changes too).

## Conventions

- **Components get what they need as props**; nothing relies on global variables.
  All styling comes from the shared `styles` object.
- **All backend calls live in `api.js` / `adminApi.js`.** Screens never call
  `fetch` themselves. Those two files also translate the backend's `snake_case`
  into the `camelCase` the screens use.
- **Errors reach the user as plain words.** The shared `request` helper turns
  network failures, 502/503/504, and web-page error replies into friendly messages.
- **Browser storage keys:** `localStorage`: `judgeDraft:<judgeId>`,
  `judgeFontScale`. `sessionStorage`: `adminToken`, `lastExportAt`.
- The Config tab edits through one helper, `update(mutator)`: it clones the draft,
  lets the mutator change the clone, and stores it. That keeps each edit to a line.

## Publishing a change

On the server, in `~/scoring-frontend`:

```
git pull
npm install
npm run build
ls dist                      # must list admin.html
sudo rm -rf /var/www/scoring/*
sudo cp -r dist/. /var/www/scoring/
```

The full release checklist (backend and frontend, in the right order) is in the
backend repo's `deployment-pm2-caddy-steps.md`, Part 5. Judges who already have
the app open keep the old version until they reload.

## Known limitations

- No automated tests; everything was checked by hand (lists in the backend repo's
  `BEFORE_THE_EVENT.md`).
- The dashboard cannot add or delete a whole category yet, and the Excel export is
  fixed to Poster, Oral and Video.
- A judge's session settings (such as which screen they were on) are not kept,
  only their in-progress score.
