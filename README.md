# Flashcard Study Tool — Couples Language Learning

#### Video Demo: <!-- TODO: paste your YouTube URL here -->

#### Author

<!-- TODO: fill in before submitting -->
- **Name:** Nikola Vrhovac
- **GitHub username:** TODO
- **edX username:** TODO
- **Location:** TODO

---

## Description

The Flashcard Study Tool is a web application that helps **two people learn a
language together**. It combines a classic spaced-repetition flashcard system
(the SM-2 algorithm, the same family of algorithms behind Anki) with a
partnership model designed specifically for couples, friends, or study buddies
who are learning each other's languages.

The motivating problem is personal: when two people from different language
backgrounds want to learn each other's language, generic flashcard apps fall
short in two ways. First, they treat a card as a single fact with one
"front" and one "back," whereas a language pair is genuinely **bidirectional** —
knowing *casa → house* does not mean you know *house → casa*, and each direction
needs to be scheduled independently. Second, they are built for a single,
isolated learner, with no notion of two people studying a shared body of
vocabulary at their own individual paces. This project addresses both gaps.

### What it does

- **Bidirectional spaced repetition.** Every card stores a word/phrase in two
  languages (`language_a` and `language_b`) plus optional usage context. A card
  can be studied A→B, B→A, or in a randomized mix. Crucially, the spaced-
  repetition state (ease factor, interval, repetition count, next-review date)
  is tracked **separately for each user and each direction** via the
  `UserCardProgress` model. Two partners studying the same shared deck therefore
  have completely independent schedules, and even a single user has independent
  schedules for the two directions of the same card.

- **Private learning partnerships.** A user can generate a time-limited,
  six-character invitation code (or a shareable `/join/<code>/` link with a QR
  code). When exactly one other user accepts it, a `Partnership` is formed and
  the two can share decks ("courses"). Either partner can add or edit cards in a
  shared course, but their progress through it remains personal.

- **Study sessions with self-rating.** During a session the user is shown one
  side of a card, recalls the other, flips it, and rates their recall from 0–5.
  That rating feeds the SM-2 algorithm, which computes the next interval and due
  date. A session timer and per-card timing are recorded for analytics.

- **Statistics dashboard.** Chart.js visualizations show cards due, study
  activity over time, quality distribution, and a personal-vs-shared breakdown
  of decks and cards.

- **Onboarding and activity feed.** First-time users get a guided welcome flow,
  and partners see a small private activity feed of each other's actions on
  shared courses (e.g. "added 5 cards to Spanish") to create a sense of studying
  together.

---

## Distinctiveness and Complexity

**Why this project is distinct from the course's other projects.**

This project is *not* a social network, and it is *not* an e-commerce site — the
two categories CS50W explicitly scrutinizes.

It is emphatically **not a social network** (Project 4). It has no public
content of any kind: no posts, no global or chronological feed of strangers, no
"following"/"followers" graph, no likes, no comments, and no browsable user
profiles. The only social construct is a strictly **one-to-one, mutually
consented partnership** between exactly two users who exchange a private
invitation code. A user can have only one active partner. The so-called
"activity feed" is not a content stream; it is a small, private progress log
shared between two partners about their work on *their own shared decks*. There
is no way to discover, view, or interact with any other user on the platform.
Where Project 4 is fundamentally about broadcasting content to a network, this
application is fundamentally about a spaced-repetition **algorithm** that
personalizes a study schedule — the partnership exists only to share a body of
vocabulary, not to socialize.

It is also clearly **not e-commerce** (Project 2): there are no products, no
catalog, no shopping cart, no listings, no bids, no payments, and no
transactions of any kind. Nothing is bought or sold.

**Why this project is sufficiently complex.**

The complexity lives primarily in the data model and the scheduling logic:

1. **Per-user, per-direction spaced repetition.** Rather than storing SM-2 state
   on the card (the naive design), the app introduces a dedicated
   `UserCardProgress` model keyed by `(user, card, study_direction)` with a
   `unique_together` constraint. A single shared card can therefore have up to
   four independent progress records across two partners and two directions.
   This is a meaningfully harder data-modeling problem than a one-learner,
   one-direction flashcard app.

2. **A real algorithm.** `flashcards/utils.py` implements the SM-2 spaced-
   repetition algorithm, including the ease-factor adjustment formula, interval
   progression (1 day → 6 days → interval × ease factor), failure resets, and a
   1.3 ease-factor floor. This logic is covered by a dedicated unit-test module.

3. **A partnership and permission layer.** Eight models
   (`Deck`, `Card`, `UserCardProgress`, `StudySession`, `Review`,
   `Partnership`, `PartnershipInvitation`, `Activity`, plus `UserProfile`) work
   together. Decks carry `can_view`/`can_edit` permission methods that account
   for ownership *and* active partnerships, and every API endpoint enforces
   them. Invitations use cryptographically random codes (`secrets`), expire
   after seven days, and are validated against self-acceptance and reuse.

4. **A typed JavaScript frontend.** The entire front end is written in
   **TypeScript** (compiled to ES modules, no framework) with a single typed API
   client, explicit interfaces for every API payload, direct DOM manipulation,
   keyboard controls, card-flip animations, and Chart.js dashboards. It is fully
   mobile-responsive via Bootstrap 5.

5. **Tested and CI-built.** The project ships with 46 automated tests covering
   the algorithm, model methods, statistics aggregation, and the API/permission
   layer, and a GitHub Actions pipeline that runs Django checks, the test suite,
   compiles TypeScript, and deploys to PythonAnywhere.

---

## What's contained in each file

Only the files I authored are listed; standard Django/Node scaffolding is
omitted for brevity.

### Backend — `flashcards/`
- **`models.py`** — All database models: `Deck`, `Card`, `UserCardProgress`,
  `StudySession`, `Review`, `Partnership`, `PartnershipInvitation`, `Activity`,
  and `UserProfile`, including permission methods, invitation code generation,
  and activity display-text helpers.
- **`views.py`** — ~20 view functions: page views and a JSON API for decks,
  cards, study sessions, reviews, statistics, partnerships (invite/accept/join/
  dissolve), and the activity feed. All API responses follow a consistent
  `{success, data, error}` shape and enforce authentication and permissions.
- **`utils.py`** — The SM-2 spaced-repetition algorithm and the statistics
  aggregation function (`get_study_stats`), including the personal-vs-shared
  breakdown.
- **`urls.py`** — URL routing for all pages and API endpoints.
- **`admin.py`** — Django admin registrations.
- **`context_processors.py`** — Adds a partnership "New" badge flag to every
  template.
- **`migrations/`** — Database schema migrations (initial schema through the
  language-aware card and partnership models).
- **`tests/`** — Test suite: `test_sm2.py` (algorithm), `test_models.py` (model
  methods/permissions), `test_stats.py` (statistics breakdown), and
  `test_views.py` (API, auth, partnership/join flows).

### Configuration — `flashcard_project/`
- **`settings.py`** — Django settings, environment-variable configuration
  (`python-decouple`), WhiteNoise static-file serving, and the partnership
  context processor.

### Frontend — `src/ts/` (compiled to `static/js/`)
- **`api.ts`** — Typed API client singleton with TypeScript interfaces for every
  payload and automatic CSRF handling.
- **`decks.ts`** — Dashboard logic: listing personal collections and shared
  courses, deck CRUD, and the activity feed.
- **`cards.ts`** — Card management with the bidirectional language fields.
- **`study.ts`** — The study screen: direction selection, card flipping,
  keyboard shortcuts, and review submission.
- **`partnership.ts`** — Invitation creation, shareable link + QR code, accepting
  invitations, and dissolving partnerships.
- **`stats.ts`** — Chart.js statistics dashboard.

### Templates — `templates/`
- **`base.html`** — Shared layout, navbar, Bootstrap/Chart.js/QR CDN includes.
- **`index.html`**, **`deck_detail.html`**, **`study.html`**,
  **`partnership.html`**, **`stats.html`**, **`welcome.html`**,
  **`login.html`**, **`register.html`** — The application's pages.

### Other
- **`docs/`** — RFCs documenting each major design decision (the algorithm,
  partnership system, bidirectional learning, etc.) and a deployment guide.
- **`.github/workflows/deploy.yml`** — CI: checks, tests, TypeScript build, and
  deploy.
- **`requirements.txt`** / **`package.json`** — Python and build dependencies.
- **`.env.example`** — Template for the required environment variables.

---

## How to run it

### Prerequisites
- Python 3.10+ (Django 5.2 requires it)
- Node.js 18+ and npm

### Setup
```bash
# 1. Install dependencies
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
npm install                      # also compiles the TypeScript to static/js/

# 2. Configure environment variables
cp .env.example .env             # then edit .env if desired

# 3. Set up the database
python manage.py migrate
python manage.py createsuperuser

# 4. Run the development server
python manage.py runserver
```
Then visit **http://localhost:8000/** and log in.

During development, run `npm run watch` in a second terminal to recompile
TypeScript automatically on save.

### Running the tests
```bash
python manage.py test
```

---

## Additional information

- **Environment variables:** the app reads `SECRET_KEY`, `DEBUG`, and
  `ALLOWED_HOSTS` from a `.env` file (see `.env.example`). It will not start
  without `SECRET_KEY`.
- **Compiled JavaScript:** `static/js/` is generated from `src/ts/` and is
  git-ignored; `npm install` (or `npm run build`) regenerates it.
- **Database:** SQLite by default (`db.sqlite3`), created by `migrate`.

## Technology stack

**Backend:** Django 5.2, Python, SQLite · **Frontend:** TypeScript, Bootstrap 5,
Chart.js · **Algorithm:** SM-2 spaced repetition · **Deploy:** PythonAnywhere via
GitHub Actions.

## License

MIT
