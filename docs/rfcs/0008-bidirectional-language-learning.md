# RFC 0008: Bidirectional Language Learning System

## Metadata

- **RFC Number**: 0008
- **Title**: Bidirectional Language Learning System
- **Author**: Development Team
- **Status**: Implemented
- **Created**: 2025-11-02
- **Last Updated**: 2025-11-03
- **Implemented**: 2025-11-03
- **Depends On**: RFC 0007 (Partnership System)
- **Pull Request**: #3

## Summary

Transform the generic flashcard system into a language-specific bidirectional learning tool where each card represents a word/phrase in two languages, and users can study in either direction (Language A → Language B or B → A) with separate progress tracking per direction per user.

## Motivation

**Why are we doing this?**

### Current Problem

The existing flashcard system uses generic "front" and "back" fields:

- **Not language-aware**: No semantic understanding of content
- **One-directional only**: Cards work in only one direction
- **Inefficient for language learning**: Must create duplicate cards for bidirectional practice
  - Card 1: "hello" (front) → "здраво" (back)
  - Card 2: "здраво" (front) → "hello" (back)
- **Shared progress tracking**: In a partnership, both users would share the same SM-2 progress (impossible with current Card model)

### Use Case: Couples Language Learning

**Scenario**: Partner A (native Serbian speaker) and Partner B (native German speaker) want to learn each other's languages.

**Requirements**:
1. Create one card with Serbian ↔ German translation
2. Partner A studies Serbian → German (learning German)
3. Partner B studies German → Serbian (learning Serbian)
4. Each partner has separate SM-2 progress
5. Same card can be "easy" for one partner but "hard" for the other

**Current system cannot support this** because:
- SM-2 fields (ease_factor, interval, etc.) are on the Card model (one set of values per card)
- No concept of language direction
- No per-user progress tracking

### Solution Benefits

A bidirectional language learning system provides:

- **Efficient content creation**: One card, two study directions
- **Language-specific features**: Future support for pronunciation, language detection, etc.
- **Individual progress**: Each user's SM-2 schedule independent per direction
- **Reduced maintenance**: No duplicate cards to keep in sync
- **Better UX**: Clear language labels instead of generic "front/back"

## Proposed Solution

**What are we building and how?**

### Overview

1. **Language-specific Card model**: Replace `front`/`back` with `language_a`/`language_b` + language codes
2. **UserCardProgress model**: Move SM-2 fields from Card to per-user, per-direction tracking
3. **Study direction selection**: User chooses direction before starting session
4. **Modified SM-2 algorithm**: Operate on UserCardProgress instead of Card
5. **Updated API**: Study sessions and reviews work with directions
6. **Language-aware UI**: Display language names instead of "Question/Answer"

### Technical Details

#### Data Models

##### Card Model Changes

**Change Summary:** Transform generic flashcards into language-specific bidirectional cards.

**Removed Fields:**
- `front`, `back` - Generic question/answer fields
- `ease_factor`, `interval`, `repetitions`, `next_review` - SM-2 fields (moved to UserCardProgress)

**New Fields:**
- `language_a` - First language text (TextField)
- `language_b` - Second language text (TextField)
- `language_a_code` - ISO 639-1 language code (CharField, e.g., 'sr', 'de', 'en')
- `language_b_code` - ISO 639-1 language code (CharField)
- `context` - Optional usage example or notes (TextField, blank=True)
- `updated_at` - Last modification timestamp

**Key Changes:**
- Cards now represent language pairs instead of generic Q&A
- SM-2 tracking moved to per-user, per-direction model (UserCardProgress)
- Supports bidirectional study (A→B or B→A)
- Index on (deck, created_at) for efficient queries

**Migration Strategy:** Existing cards migrate `front` → `language_a`, `back` → `language_b` (see RFC 0009)

##### UserCardProgress Model (NEW)

**Purpose**: Track SM-2 progress per user, per card, per direction.

Enables partners to study the same card at their own pace, and users to have different progress for each study direction.

**Fields:**

**Identifiers:**
- `user` - User studying this card (ForeignKey to User, CASCADE delete)
- `card` - Card being studied (ForeignKey to Card, CASCADE delete)
- `study_direction` - Direction ('A_TO_B' or 'B_TO_A')

**SM-2 Algorithm Fields:**
- `ease_factor` - Difficulty multiplier (Float, default 2.5, minimum 1.3)
- `interval` - Days until next review (Integer, default 1)
- `repetitions` - Consecutive successful reviews count (Integer, default 0)
- `next_review` - When card is due for review (DateTime, defaults to now)

**Metadata:**
- `created_at`, `updated_at` - Timestamps

**Constraints:**
- Unique together on (user, card, study_direction) - ensures one progress record per combination
- Index on (user, next_review) for efficient "cards due now" queries
- Index on (user, card) for lookups

**Helper Methods:**
- `is_due()` - Returns true if next_review <= now

**Example Usage:**

For a card "здраво" (Serbian) ↔ "hallo" (German):

- **Partner A learning German** (Serbian→German): Has UserCardProgress with study_direction='A_TO_B'
- **Partner A practicing German→Serbian**: Has separate UserCardProgress with study_direction='B_TO_A' and different SM-2 values
- **Partner B learning Serbian** (German→Serbian): Has their own UserCardProgress with study_direction='B_TO_A' and independent SM-2 tracking

Each progress record tracks completely independent SM-2 state.

##### Review Model Changes

**Added Field:**
- `study_direction` - Direction studied for this review ('A_TO_B' or 'B_TO_A')
- Quality field now has choices constraint (0-5)

**Purpose:** Track which direction was studied for analytics (e.g., "Which direction is harder for this user?")

**Other Fields (unchanged):**
- `card`, `session`, `quality`, `reviewed_at`, `time_taken`

##### StudySession Model Changes

**Added Field:**
- `study_direction` - Primary direction for session ('A_TO_B', 'B_TO_A', or null)

**Purpose:** Track session-level study direction. Set to null for mixed-direction sessions (future feature).

**Other Fields (unchanged):**
- `user`, `deck`, `started_at`, `ended_at`, `cards_studied`

#### Modified SM-2 Algorithm

**Change Summary:** Function signature updated to accept `UserCardProgress` instead of `Card`. Core SM-2 logic remains identical.

**Old:** `calculate_next_review(card, quality)`
**New:** `calculate_next_review(progress, quality)`

**Function Behavior:**

**Input:**
- `progress` - UserCardProgress instance (contains ease_factor, interval, repetitions, next_review)
- `quality` - Integer 0-5 (user's self-assessment)

**Logic:**
1. If quality < 3 (failed):
   - Reset repetitions to 0
   - Set interval to 1 day
2. If quality >= 3 (passed):
   - If 1st repetition: interval = 1 day
   - If 2nd repetition: interval = 6 days
   - If 3rd+ repetition: interval = previous_interval × ease_factor (rounded)
   - Increment repetitions
3. Adjust ease_factor using SM-2 formula: `EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))`
4. Enforce minimum ease_factor of 1.3
5. Calculate next_review = now + interval (in days)

**Output:** Updated UserCardProgress instance (not saved - caller must save)

**Key Difference:** Operates on per-user, per-direction progress instead of shared card state.

### API Endpoints

#### Study Session Start (Modified)

**Endpoint:** `POST /api/study/start/{deck_id}/`

**Request Body:**
- `direction` - Study direction: 'A_TO_B', 'B_TO_A', or 'RANDOM'

**Success Response (200):**
- `session_id` - Created session ID
- `deck` - Deck info (id, title, language_a_code, language_b_code)
- `direction` - Confirmed study direction
- `cards` - Array of cards formatted for study direction

Each card includes:
- `id` - Card ID
- `question` - Text to show on card front (language_a or language_b based on direction)
- `answer` - Text to show on card back (opposite language)
- `context` - Optional usage example
- `direction` - Direction for this card

**Error Responses:**
- **400 INVALID_DIRECTION** - Direction not in ['A_TO_B', 'B_TO_A', 'RANDOM']
- **403 FORBIDDEN** - User doesn't have access to deck

**Business Logic:**
1. Validate direction parameter
2. Check user has deck access (owner or partner)
3. Query UserCardProgress for due cards:
   - Filter by user, deck, direction (if not RANDOM)
   - Filter by next_review <= now
   - Limit to 20 cards per session
4. Format cards based on direction (swap question/answer as needed)
5. Create StudySession record with direction
6. Return session details and formatted cards

#### Submit Review (Modified)

**Endpoint:** `POST /api/study/review/`

**Request Body:**
- `session_id` - Study session ID
- `card_id` - Card being reviewed
- `quality` - Quality rating 0-5
- `time_taken` - Seconds spent on card
- `direction` - Study direction ('A_TO_B' or 'B_TO_A') - NEW field

**Success Response (200):**
- `next_review` - Next review timestamp for this card/direction
- `interval` - Days until next review
- `ease_factor` - Updated ease factor

**Error Response (400 INVALID_QUALITY):** Quality must be 0-5

**Business Logic:**
1. Validate quality is 0-5
2. Get or create UserCardProgress for (user, card, direction)
   - If creating new: defaults (ease_factor=2.5, interval=1, repetitions=0, next_review=now)
3. Apply SM-2 algorithm to update progress
4. Save updated progress
5. Create Review record with direction for analytics
6. Update StudySession cards_studied counter
7. Return updated progress details

#### Card CRUD (Modified)

**Create Card:**

Endpoint: `POST /api/decks/{deck_id}/cards/`

Request body now requires:
- `language_a` - First language text (was `front`)
- `language_b` - Second language text (was `back`)
- `language_a_code` - ISO 639-1 code (e.g., 'sr', 'de')
- `language_b_code` - ISO 639-1 code
- `context` - Optional usage example

Response includes all card fields plus `created_at` timestamp.

**List Cards:**

Endpoint: `GET /api/decks/{deck_id}/cards/`

Response includes:
- `cards` - Array of card objects with language fields
- `language_a_code`, `language_b_code` - Deck-level language codes (from first card)

### User Interface/Experience

#### Study Direction Selection

**New UI Component** (add to `study.html`):

Before study session starts, display direction selector with three options:
1. Language A → Language B button (e.g., "🇷🇸 Serbian → 🇩🇪 German")
2. Language B → Language A button (e.g., "🇩🇪 German → 🇷🇸 Serbian")
3. Random Direction button (mix both directions)

Each button shows language flags/names and descriptive subtitle (e.g., "Learn German vocabulary").

**TypeScript Implementation** (`src/ts/study.ts`):

Study controller manages:
- Direction selection and session configuration
- Hiding direction selector after choice
- Starting study session with chosen direction
- Displaying direction indicator during study (e.g., "Serbian → German")
- Submitting reviews with direction parameter

Key methods:
- `startStudy(direction)` - Initialize session with chosen direction
- `showDirectionIndicator()` - Display current study direction
- `submitRating(quality)` - Include direction in review submission

#### Card Creation Form

**Modified** (`deck_detail.html`):

Form fields changed from:
- "Front (Question)" → "Language A" with language flag/name
- "Back (Answer)" → "Language B" with language flag/name
- Added "Context" field (optional usage example)

Each language field has:
- Language-specific label (e.g., "🇷🇸 Serbian (Српски)")
- Placeholder in that language
- Required validation

**TypeScript** (`src/ts/cards.ts`):

Card creation now sends:
- `language_a`, `language_b` - Card text
- `language_a_code`, `language_b_code` - ISO language codes
- `context` - Optional context

#### Card Display in List

**Modified** (deck_detail.html):

Cards displayed with bidirectional layout:
- Left column: Language A with flag (e.g., "🇷🇸 здраво")
- Center: Bidirectional arrow (↔)
- Right column: Language B with flag (e.g., "🇩🇪 hallo")
- Below: Context in smaller text if present

## Alternatives Considered

### Alternative 1: Keep Generic Front/Back + Add Direction Flag

**Description**: Keep `front`/`back` fields but add a `direction` flag to cards.

**Pros**:
- Simpler migration (no field renaming)
- Maintains flexibility for non-language cards

**Cons**:
- Doesn't capture language semantics
- Still can't support bidirectional efficiently (need duplicate cards)
- Misses future language-specific features (pronunciation, etc.)

**Why not chosen**: Language-specific fields enable better features and clearer semantics.

### Alternative 2: Single Progress Per User (No Direction Tracking)

**Description**: Track only one SM-2 progress per user per card (no direction differentiation).

**Pros**:
- Simpler data model
- Less database storage

**Cons**:
- Cannot learn bidirectionally (A→B is same difficulty as B→A, which is unrealistic)
- Limits study flexibility
- Not suitable for language learning (production → recognition are different skills)

**Why not chosen**: Bidirectional learning requires separate progress tracking.

### Alternative 3: Separate "Translation" Model

**Description**: Create a Translation model linking two Language entries.

**Pros**:
- More normalized database design
- Could support multiple translations per word
- Language entities reusable across decks

**Cons**:
- Much more complex (3 models instead of 1)
- Overkill for simple flashcard app
- Harder to understand and maintain

**Why not chosen**: Over-engineered for the use case. Simple card with two fields is sufficient.

### Alternative 4: Fixed Direction Per Card

**Description**: Each card has a fixed direction (e.g., "Serbian → German only").

**Pros**:
- Simpler UI (no direction selection)
- Clearer intent per card

**Cons**:
- Requires duplicate cards for bidirectional learning
- More maintenance overhead
- Doesn't meet requirements (partners study same cards in opposite directions)

**Why not chosen**: Bidirectional support is a core requirement.

## Implementation Notes

### Dependencies

- No new external dependencies
- Uses Django ORM features (unique_together, indexes)
- Existing `utils.py` SM-2 algorithm modified to accept different model

### Migration Strategy

See **RFC 0009: Data Migration Strategy** for detailed migration plan.

**Summary**:
1. Add new models (UserCardProgress)
2. Add new fields to Card (language_a, language_b, etc.)
3. Migrate existing data (front → language_a, back → language_b)
4. Create UserCardProgress entries from existing Card SM-2 data
5. Remove old fields (front, back, Card SM-2 fields)

### Testing Approach

**Unit Tests for UserCardProgress:**
- Can create progress for user + card + direction combination
- Same user has separate progress for A→B vs B→A directions
- Different users have independent progress for same card
- SM-2 algorithm correctly updates UserCardProgress

**Integration Tests:**
- Study session can start with specific direction
- Cards formatted correctly based on chosen direction (language swap)
- Submitting review updates only user's progress for that specific direction
- Multiple users studying same deck maintain independent progress

**API Tests:**
- `POST /api/study/start/` validates direction parameter (rejects invalid values)
- `POST /api/study/review/` accepts and stores direction
- `POST /api/decks/{id}/cards/` accepts language fields instead of front/back
- Direction parameter required in both study start and review submission

### Performance Considerations

**Database Queries:**
- Use `select_related('card')` when fetching UserCardProgress to avoid N+1 queries
- Index on (user, next_review) enables fast "cards due now" queries
- Use `prefetch_related()` with Prefetch object when listing cards with user progress

**Database Size:**
- UserCardProgress grows with (users × cards × 2 directions)
- Example: 2 partners, 1000 cards, both directions = 4000 progress records
- Not a concern for couples use case (small scale)
- Consider pagination for large decks (>1000 cards)

### Security Considerations

**Permission Checks:**
- Verify user can access deck before starting study (use `deck.can_view(user)`)
- Verify card belongs to deck in review submission
- Prevent direct manipulation of UserCardProgress via API (no direct endpoint exposed)

**Input Validation:**
- Direction parameter must be one of: 'A_TO_B', 'B_TO_A', 'RANDOM'
- Quality rating must be integer 0-5
- Validate card_id and session_id exist and belong to user
- Sanitize language text fields to prevent XSS

## Timeline

- **Phase 1 (Models)**: 1-2 days
  - Create UserCardProgress model
  - Modify Card, Review, StudySession models
  - Write model tests

- **Phase 2 (Backend)**: 2-3 days
  - Update SM-2 algorithm
  - Modify study session API
  - Modify review submission API
  - Update card CRUD API
  - Write API tests

- **Phase 3 (Frontend)**: 2-3 days
  - Direction selection UI
  - Update card creation form
  - Update study session display
  - Update API client (api.ts)
  - Update TypeScript types

- **Phase 4 (Testing)**: 1 day
  - Integration testing
  - End-to-end testing
  - Bug fixes

**Total Estimated Effort**: 6-9 days

**Dependencies**: Must complete RFC 0007 (Partnership) first for shared deck context.

## Open Questions

- [ ] Should we enforce language codes (ISO 639-1) or allow freeform text?
- [ ] Default language codes per deck or per partnership?
- [ ] UI for changing deck language codes after creation?
- [ ] Show language names (e.g., "Serbian") or codes (e.g., "sr") in UI?
- [ ] Support for language variants (e.g., "sr-Latn" vs "sr-Cyrl" for Serbian Latin/Cyrillic)?
- [ ] Auto-detect language from input text (future feature)?
- [ ] Should "RANDOM" direction truly randomize per card or alternate in sequence?
- [ ] Store user's last used direction as preference?

## References

- ISO 639-1 Language Codes: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
- Django Unique Together: https://docs.djangoproject.com/en/4.2/ref/models/options/#unique-together
- Spaced Repetition Bidirectional Learning: https://www.supermemo.com/en/blog/two-component-model-of-memory
- Language Learning Direction Research: https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/abs/receptive-and-productive-vocabulary-learning/
