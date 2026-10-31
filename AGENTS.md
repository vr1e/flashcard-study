# Flashcard Study

Django + vanilla-TypeScript spaced-repetition app for two partners learning each other's language (CS50W capstone).

## Commands
- CI (`.github/workflows/ci.yml`, push/PR to `main`) gates on `python manage.py check`, `check --deploy`, `test`, and `npm run build` — run all four before finishing. They need `SECRET_KEY` (local `.env` provides it).
- `static/js/` is tsc output and gitignored: edit `src/ts/`, then `npm run build`. `npm run watch`/`dev` never terminate.
- Nothing deploys from CI (the README is wrong about this); deploys are `scripts/deploy.sh`, run by hand on PythonAnywhere.

## Traps
- TS imports need the `.js` extension (`./api.js`): tsc emits unbundled ES modules the browser loads directly, and `moduleResolution: "bundler"` compiles extensionless imports that then 404.
- Scheduling state lives in `UserCardProgress` (user × card × direction). `Card.front/back/ease_factor/interval/repetitions/next_review` are legacy columns, not the schedule.
- A card with no `UserCardProgress` row never appears in a study session, so code that grants a user access to cards must create rows for both directions (as `card_create` and `_attach_pending_decks` in `flashcards/views.py` do).
- UI says "Shared Decks"/"Personal Decks"; code and API say `courses`/`collections` (`GET /api/decks/` → `{collections, courses, pending_courses}`, `/api/stats/?filter=courses|collections`).
- The `/partnership/` page runs its own inline script in `templates/partnership.html`; `src/ts/partnership.ts` only drives the dashboard widget (imported by `index.html`).

## Conventions
- API views return `{success, data?, error?: {code, message}}` with real HTTP status codes; browser HTTP goes through `api` (`FlashcardAPI` in `src/ts/api.ts`), which unwraps that shape and sends the CSRF header.
- Deck access checks use `deck.can_view(user)` / `deck.can_edit(user)` (owner, creator, or active partner), not ownership filters — RFC 0010 lists the bugs those caused.
- Commit messages: one line, no body.

## Deeper guidance
- Before changing scheduling, sharing, or the API shape, read the relevant RFC in `docs/rfcs/` (0001 SM-2, 0003 API, 0007 partnership, 0008 bidirectional).
