# Flashcard Study Tool — Couples Language Learning

#### Video Demo: https://youtu.be/7UW9j3sAn2U

#### Author

- **Name:** Nikola Vrhovac
- **GitHub username:** vr1e
- **edX username:** vrle
- **Location:** Vienna, Austria

---

## Description

This is a flashcard app for two people who are learning each other's language.
I built it because ordinary flashcard apps get two things wrong for a couple
in that situation.

They treat a card as a front and a back. But knowing _casa → house_ doesn't
mean you know _house → casa_, so a word pair is really two things to learn, and
each needs its own schedule. They also assume you study alone. A couple wants
one shared list of words that both can add to, while each learns at their own
pace.

So in this app every card holds a word in two languages and can be studied in
either direction. Two users link their accounts with an invite code and share
decks. You study by looking at one side, recalling the other, flipping the card
and rating yourself from 0 to 5. That rating feeds the SM-2 spaced repetition
algorithm (the idea behind Anki), which decides when you see the card again. A
statistics page shows what is due, how much you studied and how well it went.

---

## Distinctiveness and Complexity

### Distinctiveness

At its core this project is a scheduler. For every word you are learning, it
works out the day you should see it again and revises that each time you
answer. The other projects in the course store what users submit and show it
back: wiki entries, auction listings, emails, posts. Here the data that matters
most is never typed by anyone. The app computes it from how well you remembered
a word, and it decides what you are shown tomorrow and next month.

It is also a language-learning tool, and that shapes the design. Recognising a
foreign word and producing it from memory are different skills, so the app
tracks the two directions of a card separately. That one decision runs through
the data model, the study screen and the statistics.

The third part is that it is built for exactly two people. A couple connects
with a private code and builds decks together. The cards are shared, but the
learning state is not: when my partner reviews a word, my schedule for it
doesn't change. Getting "shared content, private progress" right was the main
design problem, and none of the course projects have it.

This is why it isn't a social network like Project 4. Nothing is public, and you
can't find or interact with anyone except the one person you swapped a code
with. The small activity feed ("added 5 cards to Spanish") is only visible to
the two partners. It isn't e-commerce like Project 2 either, since nothing is
listed or sold.

### Complexity

The data model has nine models. The important one is `UserCardProgress`, which
holds the SM-2 state per user, per card and per direction. A single shared card
can have four separate schedules: two partners times two directions. Adding a
card creates progress rows for everyone with access to the deck, and when a
partnership forms, the new partner gets rows for every card that already
exists.

I implemented SM-2 myself in `flashcards/utils.py`: the ease-factor formula,
intervals that grow 1 → 6 → interval × ease, a reset when you fail a card
(rating below 3) and a minimum ease of 1.3. The same file calculates the
statistics, including the study streak, a seven-day forecast of due cards and
average quality per deck.

Partnerships have a full lifecycle. Invite codes are random (Python's
`secrets`), unique, valid for seven days and usable once. You can't accept your
own code, and you can't pair up if either side already has a partner. You can
mark a deck as shared before you have a partner, and it becomes shared
automatically once you do. Ending a partnership is a soft delete, so pairing up
with the same person again reactivates the old record. Every page and API
endpoint checks that you own the deck or are the owner's partner.

The front end is TypeScript, about 2,100 lines in six modules, with no
framework. Django renders the page shells and everything else goes through a
JSON API of 18 endpoints using `fetch`, without page reloads. The study screen
keeps track of the session state, times each card, animates the flip and
supports keyboard shortcuts (Space to flip, 0–5 to rate, Esc to exit). The
statistics page draws four Chart.js charts that reload when you change the
filter.

The app is mobile-responsive. It uses the Bootstrap 5 grid and a collapsing
navbar, and `styles.css` has its own media queries so the deck cards, study
card and rating buttons work on a phone.

There are 58 automated tests for the algorithm, permissions, statistics and
API. A GitHub Actions workflow runs them on every push, along with Django's
deployment checks and a TypeScript build.

---

## What's contained in each file

### Project root

- `manage.py` — Django's command-line tool.
- `requirements.txt` — Python packages: Django, `python-decouple`, WhiteNoise,
  and optionally gunicorn and django-debug-toolbar.
- `package.json`, `package-lock.json` — TypeScript is the only Node
  dependency. Defines the `build` and `watch` scripts.
- `tsconfig.json` — compiles `src/ts/` to `static/js/` in strict mode.
- `.env.example` — template for `SECRET_KEY`, `DEBUG` and `ALLOWED_HOSTS`.
- `.gitignore` — ignores the virtualenv, database, `.env`, `node_modules` and
  compiled JavaScript.
- `DEPLOYMENT.md` — how to host the app on PythonAnywhere.

### `flashcard_project/`

- `settings.py` — Django settings. Reads secrets from the environment and sets
  up WhiteNoise and the context processor.
- `urls.py` — admin route plus the app's URLs.
- `wsgi.py`, `asgi.py`, `__init__.py` — standard Django files.

### `flashcards/`

- `models.py` — the nine models:
  - `Deck` — a set of cards, with permission checks and a due-card count.
  - `Card` — a word in two languages, with optional context.
  - `UserCardProgress` — SM-2 state per user, card and direction.
  - `StudySession`, `Review` — a study sitting and each rating given in it.
  - `Partnership` — links two users and their shared decks.
  - `PartnershipInvitation` — invite codes, with expiry.
  - `Activity` — entries in the partners' activity feed.
  - `UserProfile` — whether the user has seen the onboarding.
- `views.py` — page views (dashboard, welcome, deck, study, statistics,
  partnership, join link, register, logout) and the JSON API for decks, cards,
  study sessions, reviews, statistics, partnerships and the activity feed.
- `utils.py` — the SM-2 function and the statistics calculation.
- `urls.py` — routes for pages, login and the API.
- `admin.py` — admin setup for seven of the models.
- `context_processors.py` — tells templates whether to show the "New" badge on
  the partner link.
- `__init__.py` — package marker.
- `migrations/` — nine migrations:
  - `0001` — decks, cards, sessions and reviews.
  - `0002` — default for the review date.
  - `0003` — partnerships and invitations.
  - `0004` — per-user progress and the two language fields.
  - `0005` — drops two unused language-code fields.
  - `0006` — activity feed.
  - `0007` — deck owner fields.
  - `0008` — user profile.
  - `0009` — pending shared decks.
- `tests/test_sm2.py` — intervals, ease factor and review dates.
- `tests/test_models.py` — permissions, partnership helpers, invitations and
  activity text.
- `tests/test_stats.py` — the personal/shared breakdown and chart data.
- `tests/test_views.py` — the API: login, decks, permissions, the invite and
  join flows, onboarding, due counts and shared-deck cards.
- `tests/__init__.py` — package marker.

### `src/ts/` (compiled to `static/js/`)

- `api.ts` — typed API client with one method per endpoint and CSRF handling.
- `decks.ts` — dashboard: lists, creates, edits and deletes decks, and shows
  the activity feed.
- `cards.ts` — deck page: lists, adds, edits and deletes cards.
- `study.ts` — the study session: direction, flip, rating, timer, summary and
  keyboard shortcuts.
- `partnership.ts` — partner status, invite code with link and QR code,
  accepting a code and ending a partnership.
- `stats.ts` — loads the statistics and draws the charts.

### `static/css/`

- `styles.css` — my styles on top of Bootstrap: deck grid, flip animation,
  colours for shared and personal decks, activity feed and the mobile media
  queries.

### `templates/`

- `base.html` — layout with navbar and footer. Loads Bootstrap, Chart.js and
  the QR-code library.
- `index.html` — dashboard with shared and personal decks and the deck and
  partnership modals.
- `deck_detail.html` — a deck's cards with add and edit modals.
- `study.html` — direction chooser, flip card, rating buttons and session
  summary.
- `stats.html` — summary numbers and the four charts.
- `partnership.html` — partner status, invite creation and code entry.
- `welcome.html` — onboarding page shown once to new users.
- `login.html`, `register.html` — sign-in and sign-up forms.

### Other

- `.github/workflows/ci.yml` — runs checks, tests and the TypeScript build.
- `scripts/deploy.sh` — deploy script for PythonAnywhere.

---

## How to run it

You need Python 3.10+ and Node.js 18+.

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
npm install                      # also compiles the TypeScript
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

Then open http://localhost:8000/ and register. To try the partner features,
register a second user in another browser, create an invite code as one and
accept it as the other. Run the tests with `python manage.py test`.

## Additional information

- The app won't start without `SECRET_KEY` in `.env`.
- `static/js/` is compiled from `src/ts/` and is not in the repository, so the
  pages do nothing until `npm install` has run.
- The database is SQLite. Bootstrap, Chart.js and qrcodejs load from a CDN, so
  you need an internet connection.
- `Card` still has the `front`, `back` and scheduling columns from my first
  version. I kept them for compatibility; scheduling now uses
  `UserCardProgress`.

## License

MIT
