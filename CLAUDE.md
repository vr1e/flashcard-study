# CLAUDE.md - Project Context for AI Assistants

## Project Overview

**Flashcard Study Tool** - Couples language learning platform with bidirectional spaced repetition
**Stack**: Django 4.2 + TypeScript + Bootstrap 5 + Chart.js
**Status**: ✅ Partnership & bidirectional learning fully implemented

### Core Features

- **Partnership system** - Two users share decks and study together
- **Bidirectional learning** - Study language pairs in both directions (A→B, B→A, Random)
- **Per-user progress** - Separate SM-2 tracking for each user and direction
- **Language-aware cards** - Cards with language codes and context
- Study sessions with card rating (0-5)
- Statistics dashboard

## Architecture

### Backend (Django)

```
flashcard_project/          # Django configuration
flashcards/                 # Main app
├── models.py              # Deck, Card, Partnership, UserCardProgress, etc.
├── views.py               # API endpoints (20+ endpoints)
├── urls.py                # Complete routing
├── utils.py               # SM-2 algorithm implementation
└── admin.py               # Admin configuration
```

### Frontend (TypeScript)

```
src/ts/
├── api.ts                 # API client + type definitions
├── decks.ts               # Deck management (index.html)
├── cards.ts               # Card CRUD with language fields (deck_detail.html)
├── study.ts               # Study with direction selection (study.html)
├── partnership.ts         # Partnership management (partnership.html)
└── stats.ts               # Chart.js integration (stats.html)
```

**Compilation**: `npm run watch` → outputs to `static/js/`

### Templates

```
templates/
├── base.html              # Bootstrap 5, navbar, auth status
├── index.html             # Dashboard (personal + shared decks)
├── deck_detail.html       # Card management with language fields
├── study.html             # Direction selection + flashcards
├── partnership.html       # Partnership management UI
└── stats.html             # Charts + statistics
```

## Data Models

### Card (language-aware)

```python
language_a: TextField          # First language text
language_b: TextField          # Second language text
language_a_code: CharField     # e.g., 'sr' for Serbian
language_b_code: CharField     # e.g., 'de' for German
context: TextField             # Optional usage example
# Legacy: front, back (kept for backward compatibility)
```

### UserCardProgress (per-user, per-direction SM-2)

```python
user: ForeignKey              # Which user
card: ForeignKey              # Which card
study_direction: CharField    # 'A_TO_B' or 'B_TO_A'
ease_factor: FloatField       # SM-2 ease factor
interval: IntegerField        # Days until next review
repetitions: IntegerField     # Success count
next_review: DateTimeField    # When due for this user/direction
# unique_together = ('user', 'card', 'study_direction')
```

### Partnership

```python
user_a: ForeignKey            # First partner
user_b: ForeignKey            # Second partner
decks: ManyToManyField        # Shared decks
is_active: BooleanField       # Active status
```

**See**: `docs/rfcs/0001-spaced-repetition-algorithm.md` for SM-2 implementation details

## API Design

All endpoints return JSON with structure:

```typescript
{
  success: boolean;
  data?: any;
  error?: { code: string; message: string; }
}
```

### Key Endpoints

**Decks**:

- `GET /api/decks/` - List decks (returns {personal: [], shared: []})
- `POST /api/decks/create/` - Create deck (supports `shared: true`)
- `GET/PUT/DELETE /api/decks/<id>/` - Deck operations

**Cards**:

- `POST /api/decks/<id>/cards/create/` - Create card with language fields
- `PUT /api/cards/<id>/update/` - Update card

**Study**:

- `POST /api/decks/<id>/study/` - Start session with direction ('A_TO_B', 'B_TO_A', 'RANDOM')
- `POST /api/cards/<id>/review/` - Submit rating (updates UserCardProgress)

**Partnership**:

- `POST /api/partnership/invite/` - Generate 6-char invitation code
- `POST /api/partnership/accept/` - Accept invitation
- `GET /api/partnership/` - Get partnership info
- `DELETE /api/partnership/dissolve/` - End partnership

**See**: `docs/rfcs/0003-api-design.md` for complete API docs

## TypeScript Patterns

### API Usage

```typescript
// All HTTP calls go through singleton
import { api } from "./api";

const decks = await api.getDecks(); // Returns {personal: [], shared: []}
await api.createCard(
	deckId,
	language_a,
	language_b,
	lang_a_code,
	lang_b_code,
	context
);
```

### Type Safety

- Explicit types for all functions
- Interfaces defined in `api.ts`: `Deck`, `Card`, `StudySession`, `Review`, `Statistics`
- Avoid `any` type

### DOM Manipulation

```typescript
const element = document.getElementById("my-id") as HTMLElement;
```

## Conventions

### Python

- `snake_case` for functions/variables
- `@login_required` on all views except auth
- Return `JsonResponse` for APIs, `render()` for pages
- Imports: Django → third-party → local

### Git

- **Commit messages**: One line only, concise and descriptive
- **Example**: `Add partnership and bidirectional learning models`

### TypeScript

- `camelCase` for functions/variables
- `PascalCase` for classes/interfaces
- Export functions individually (not default)
- CSRF tokens handled automatically by `api` singleton

### Templates

- `{% load static %}` when using static files
- IDs: `kebab-case` (e.g., `create-deck-btn`)
- Bootstrap 5 classes (already in CDN)

## Implementation Status

### ✅ Complete (RFC 0007 & 0008)

- **Partnership system**: Invite codes, shared decks, permissions
- **Bidirectional learning**: A→B, B→A, Random study directions
- **Per-user progress**: UserCardProgress model tracks each user/direction separately
- **Language-aware cards**: language_a/b with codes + context
- Complete API (20+ endpoints)
- TypeScript frontend with direction selection
- Study sessions with SM-2 algorithm
- Statistics dashboard
- User authentication

## Development Workflow

### Quick Start

```bash
# First time setup
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
npm install
npm run build
python manage.py migrate

# Terminal 1: TypeScript watch mode
npm run watch

# Terminal 2: Django server (activate venv first)
source .venv/bin/activate
python manage.py runserver
```

### Adding Features

**New API Endpoint:**

1. Add view to `flashcards/views.py`
2. Add URL to `flashcards/urls.py`
3. Add method to `FlashcardAPI` in `src/ts/api.ts`
4. TypeScript auto-compiles (if watch mode running)

**Model Changes:**

```bash
python manage.py makemigrations
python manage.py migrate
```

## Critical Notes for AI Assistants

1. **No Framework**: Vanilla TypeScript with direct DOM manipulation (no React/Vue/Angular)
2. **CSRF Required**: All POST/PUT/DELETE need CSRF token (handled by `api.ts`)
3. **TypeScript Must Compile**: Changes to `.ts` files require compilation
4. **Bootstrap 5**: Already included via CDN in `base.html`
5. **Authentication**: Django session-based, `@login_required` required on views
6. **UserCardProgress**: When creating cards, MUST create UserCardProgress for both directions for all users with deck access (see `views.py:507-530`)
7. **RFCs**: Check `docs/rfcs/` for detailed design decisions (0007: Partnership, 0008: Bidirectional)

## Quick Reference

- **Main RFC Docs**: `docs/rfcs/` (0007: Partnership, 0008: Bidirectional, 0001: Algorithm)
- **User Docs**: `README.md`
- **Deployment**: `docs/DEPLOYMENT.md`
- **Database**: SQLite (`db.sqlite3` in root)
- **Static Files**: `static/` (served by Django in dev)
- **TypeScript Config**: `tsconfig.json`

---

**Last Updated**: 2025-11-03
**Status**: Couples language learning platform - partnership & bidirectional learning fully implemented
