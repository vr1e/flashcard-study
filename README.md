# Flashcard Study Tool — Couples Language Learning

#### Video Demo: <!-- TODO: paste your YouTube URL here -->

#### Author

- **Name:** Nikola Vrhovac
- **GitHub username:** vr1e
- **edX username:** vrle
- **Location:** Vienna, Austria

---

## Description

This is a flashcard app for **two people learning each other's language**. It
uses spaced repetition (the SM-2 algorithm, the same idea behind Anki), but
unlike a normal flashcard app it's built around a _partnership_: two users share
their decks and study the same vocabulary, each at their own pace.

I built it for a specific situation. When two people from different language
backgrounds want to learn each other's language, ordinary flashcard apps get two
things wrong. First, they treat a card as one "front" and one "back" — but a
word pair is really **two cards in one**: knowing _casa → house_ doesn't mean you
know _house → casa_, and each direction has to be scheduled on its own. Second,
they assume a single, solitary learner — there's no good way for two people to
work through a shared set of words together. This app fixes both.

### What it does

- **Studies both directions independently.** Every card holds a word in two
  languages (`language_a` / `language_b`) plus optional context. You can study
  A→B, B→A, or a random mix, and the spaced-repetition state (ease factor,
  interval, repetitions, next review date) is stored _per user, per direction_.
  So two partners sharing a deck never interfere with each other's schedules —
  and even one person learns each direction separately.
- **Lets two people pair up.** You generate a six-character invite code (or a
  shareable `/join/<code>/` link with a QR code). Once someone accepts, you're
  partners and can share decks. Either partner can add or edit cards; progress
  stays personal.
- **Runs study sessions.** You see one side of a card, try to recall the other,
  flip it, and rate yourself 0–5. That rating drives SM-2, which picks the next
  review date. Time per card is recorded for the stats.
- **Shows your progress.** A Chart.js dashboard covers cards due, activity over
  time, quality distribution, and a personal-vs-shared breakdown.
- **Eases you in.** First-time users get a short welcome flow, and partners see a
  small private feed of each other's activity ("added 5 cards to Spanish") so it
  feels like studying together.

---

## Distinctiveness and Complexity

**Why it's distinct from the other projects.**

It's neither a social network nor an e-commerce site — the two things CS50W
warns about.

It is **not a social network** (Project 4). There's no public content at all: no
posts, no feed of strangers, no followers, no likes, no comments, no profiles to
browse. The only "social" feature is a strictly **one-to-one partnership**
between two people who deliberately exchange a private code, and each user can
have only one partner. The activity feed isn't a content stream — it's a small
private log shared between the two partners about their own decks. You can't find
or interact with anyone else on the platform. Project 4 is about broadcasting to
a network; this is about an **algorithm** that schedules your studying, with the
partnership existing only to share vocabulary.

It's also clearly **not e-commerce** (Project 2): no products, cart, listings,
payments, or transactions of any kind.

**Why it's complex enough.**

Most of the complexity is in the data model and the scheduling logic:

1. **Per-user, per-direction scheduling.** Instead of putting the SM-2 state on
   the card, there's a dedicated `UserCardProgress` model keyed by
   `(user, card, study_direction)` with a uniqueness constraint. One shared card
   can have up to four independent progress records (two partners × two
   directions) — a noticeably harder modeling problem than a single-learner app.
2. **A real algorithm.** `flashcards/utils.py` implements SM-2: the ease-factor
   formula, interval growth (1 → 6 → interval × ease), failure resets, and the
   1.3 ease floor. It has its own unit tests.
3. **Partnerships and permissions.** Nine models work together. Decks have
   `can_view`/`can_edit` methods that respect both ownership and active
   partnerships, and every API endpoint enforces them. Invite codes are
   cryptographically random (`secrets`), expire after a week, and are checked
   against self-acceptance and reuse.
4. **A typed front end.** The whole front end is **TypeScript** (compiled to ES
   modules, no framework) with one typed API client, interfaces for every
   payload, card-flip animations, keyboard controls, and Chart.js dashboards. It
   is mobile-responsive via Bootstrap 5.
5. **Tests and CI.** 46 automated tests cover the algorithm, models, statistics,
   and the API/permission layer, run by a GitHub Actions pipeline that also
   builds the TypeScript and deploys to PythonAnywhere.

---

## What's contained in each file

These are the files I wrote (standard Django/Node scaffolding is left out).

**Backend — `flashcards/`**

- `models.py` — all models: `Deck`, `Card`, `UserCardProgress`, `StudySession`,
  `Review`, `Partnership`, `PartnershipInvitation`, `Activity`, `UserProfile`,
  plus permission methods and invite-code generation.
- `views.py` — ~20 views: the pages and a JSON API for decks, cards, study
  sessions, reviews, stats, partnerships, and the activity feed. Every API
  response uses a consistent `{success, data, error}` shape and checks
  authentication and permissions.
- `utils.py` — the SM-2 algorithm and the `get_study_stats` aggregation.
- `urls.py` — routing for pages and API endpoints.
- `admin.py` — admin registrations.
- `context_processors.py` — adds the partnership "New" badge flag to templates.
- `migrations/` — schema history.
- `tests/` — `test_sm2.py`, `test_models.py`, `test_stats.py`, `test_views.py`.

**Config — `flashcard_project/settings.py`** — Django settings, env-var config
(`python-decouple`), WhiteNoise static files, the context processor.

**Front end — `src/ts/` (compiled to `static/js/`)**

- `api.ts` — typed API client with CSRF handling.
- `decks.ts` — dashboard, deck CRUD, activity feed.
- `cards.ts` — card management with the language fields.
- `study.ts` — the study screen (direction, flipping, shortcuts, reviews).
- `partnership.ts` — invites, shareable link + QR code, accept/dissolve.
- `stats.ts` — the Chart.js dashboard.

**Templates — `templates/`** — `base.html` (layout/navbar) plus `index.html`,
`deck_detail.html`, `study.html`, `partnership.html`, `stats.html`,
`welcome.html`, `login.html`, `register.html`.

**Other** — `docs/` (design RFCs + deployment guide),
`.github/workflows/deploy.yml` (CI), `requirements.txt` / `package.json`,
`.env.example`.

---

## How to run it

Requirements: Python 3.10+ (Django 5.2 needs it) and Node.js 18+.

```bash
# 1. Install dependencies
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
npm install                      # also compiles the TypeScript

# 2. Configure environment
cp .env.example .env             # edit if you like

# 3. Set up the database
python manage.py migrate
python manage.py createsuperuser

# 4. Run it
python manage.py runserver
```

Then open **http://localhost:8000/**. During development, `npm run watch` in a
second terminal recompiles TypeScript on save. Run the tests with
`python manage.py test`.

## Notes

- The app reads `SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS` from `.env` (see
  `.env.example`); it won't start without `SECRET_KEY`.
- `static/js/` is generated from `src/ts/` and is git-ignored — `npm install`
  rebuilds it.
- Database is SQLite by default. Bootstrap 5, Bootstrap Icons, Chart.js, and
  qrcodejs are loaded via CDN.

## License

MIT
