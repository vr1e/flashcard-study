# CLAUDE.md - Project Context for AI Assistants

## Project Overview

**Flashcard Study Tool** - Spaced repetition learning system using SM-2 algorithm  
**Stack**: Django 4.2 + TypeScript + Bootstrap 5 + Chart.js  
**Status**: Base structure complete, implementing core views/logic

### Core Features

- User-owned flashcard decks
- SM-2 spaced repetition algorithm
- Study sessions with card rating (0-5)
- Statistics dashboard with visualizations

## Architecture

### Backend (Django)

```
flashcard_project/          # Django configuration
flashcards/                 # Main app
├── models.py              # Deck, Card, StudySession, Review
├── views.py               # API endpoints (TODO: implement most)
├── urls.py                # Complete routing ✓
├── utils.py               # SM-2 algorithm (TODO: complete)
└── admin.py               # Admin config ✓
```

### Frontend (TypeScript)

```
src/ts/
├── api.ts                 # API client + type definitions
├── decks.ts               # Deck management (index.html)
├── cards.ts               # Card CRUD (deck_detail.html)
├── study.ts               # Study session logic (study.html)
└── stats.ts               # Chart.js integration (stats.html)
```

**Compilation**: `npm run watch` → outputs to `static/js/`

### Templates

```
templates/
├── base.html              # Bootstrap 5, navbar, auth status
├── index.html             # Dashboard (deck list)
├── deck_detail.html       # Card management
├── study.html             # Flashcard interface
└── stats.html             # Charts + statistics
```

## Data Models

### Card (spaced repetition fields)

```python
ease_factor: FloatField(default=2.5)    # 1.3+ after adjustments
interval: IntegerField(default=1)       # Days until next review
repetitions: IntegerField(default=0)    # Success count
next_review: DateTimeField              # When card is due
```

### Review

```python
quality: IntegerField(0-5)              # User rating
# 0-2: Failed → reset card
# 3-5: Success → increase interval
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

- `GET/POST /api/decks/` - List/create decks
- `GET/PUT/DELETE /api/decks/<id>/` - Deck operations
- `GET/POST /api/decks/<id>/cards/` - Cards in deck
- `POST /api/study/start/<deck_id>/` - Start session
- `POST /api/study/review/` - Submit card rating
- `GET /api/stats/` - User statistics

**See**: `docs/rfcs/0003-api-design.md` for complete API docs

## TypeScript Patterns

### API Usage

```typescript
// All HTTP calls go through singleton
import { api } from "./api";

const decks = await api.getDecks();
await api.createCard(deckId, { front, back });
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

### ✅ Complete

- Project structure and configuration
- All models, URLs, templates
- TypeScript modules (structure)
- Admin panel configuration

### 🚧 In Progress (Has TODO comments)

- `flashcards/views.py` - Most view functions need implementation
- `flashcards/utils.py` - Complete SM-2 algorithm
- `flashcards/models.py` - Add `cards_due_count()`, `is_due()` methods
- Statistics calculation logic

### 📋 Planned

- Unit and integration tests
- User registration implementation
- Production deployment config

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
6. **SM-2 Algorithm**: See RFC 0001 for formula and implementation requirements
7. **RFCs**: Check `docs/rfcs/` for detailed design decisions

## Quick Reference

- **Main RFC Docs**: `docs/rfcs/` (0001: Algorithm, 0002: UX Flow, 0003: API)
- **User Docs**: `README.md`
- **Database**: SQLite (`db.sqlite3` in root)
- **Static Files**: `static/` (served by Django in dev)
- **TypeScript Config**: `tsconfig.json`

---

**Last Updated**: 2024-10-25  
**Next Priority**: Implement view functions in `flashcards/views.py`
- Don't make it too long, I wand brief and focused documentation that is easily human readable.