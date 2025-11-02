# RFC 0008: Bidirectional Language Learning System

## Metadata

- **RFC Number**: 0008
- **Title**: Bidirectional Language Learning System
- **Author**: Development Team
- **Status**: Draft
- **Created**: 2025-11-02
- **Last Updated**: 2025-11-02
- **Depends On**: RFC 0007 (Partnership System)

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

**Current (Generic):**
```python
class Card(models.Model):
    deck = ForeignKey(Deck, on_delete=CASCADE)
    front = TextField()  # Generic question
    back = TextField()   # Generic answer

    # SM-2 fields (PROBLEM: shared across all users)
    ease_factor = FloatField(default=2.5)
    interval = IntegerField(default=1)
    repetitions = IntegerField(default=0)
    next_review = DateTimeField()

    created_at = DateTimeField(auto_now_add=True)
```

**New (Language-Specific):**
```python
class Card(models.Model):
    """
    Language-aware flashcard.

    Each card represents a word/phrase in two languages.
    Can be studied in either direction (A→B or B→A).
    SM-2 progress is tracked per user per direction (see UserCardProgress).
    """
    deck = ForeignKey(Deck, on_delete=CASCADE, related_name='cards')

    # Language content
    language_a = TextField(help_text="First language (e.g., Serbian word)")
    language_b = TextField(help_text="Second language (e.g., German translation)")

    # Language metadata
    language_a_code = CharField(
        max_length=10,
        default='sr',
        help_text="ISO 639-1 language code (e.g., 'sr', 'de', 'en')"
    )
    language_b_code = CharField(
        max_length=10,
        default='de',
        help_text="ISO 639-1 language code"
    )

    # Optional context
    context = TextField(
        blank=True,
        help_text="Usage example or additional notes"
    )

    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    # Remove: ease_factor, interval, repetitions, next_review
    # These now live in UserCardProgress

    class Meta:
        indexes = [
            models.Index(fields=['deck', 'created_at']),
        ]

    def __str__(self):
        return f"{self.language_a} ↔ {self.language_b}"
```

**Migration Note**: Existing `front` → `language_a`, `back` → `language_b` (see RFC 0009).

##### UserCardProgress Model (NEW)

**Purpose**: Track SM-2 progress per user, per card, per direction.

```python
class UserCardProgress(models.Model):
    """
    Individual user's spaced repetition progress for a card in a specific direction.

    Example:
    - User A learning Serbian→German: separate progress
    - User A learning German→Serbian: separate progress
    - User B learning Serbian→German: separate progress

    This allows partners to study the same card at their own pace.
    """

    # Identifiers
    user = ForeignKey(
        User,
        on_delete=CASCADE,
        related_name='card_progress',
        help_text="User studying this card"
    )
    card = ForeignKey(
        Card,
        on_delete=CASCADE,
        related_name='user_progress',
        help_text="The card being studied"
    )
    study_direction = CharField(
        max_length=10,
        choices=[
            ('A_TO_B', 'Language A → Language B'),
            ('B_TO_A', 'Language B → Language A'),
        ],
        help_text="Which direction user is studying"
    )

    # SM-2 algorithm fields (per user, per direction)
    ease_factor = FloatField(
        default=2.5,
        help_text="Difficulty multiplier (1.3 minimum)"
    )
    interval = IntegerField(
        default=1,
        help_text="Days until next review"
    )
    repetitions = IntegerField(
        default=0,
        help_text="Consecutive successful reviews"
    )
    next_review = DateTimeField(
        default=timezone.now,
        help_text="When this card is due for review"
    )

    # Metadata
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['user', 'card', 'study_direction']]
        indexes = [
            models.Index(fields=['user', 'next_review']),
            models.Index(fields=['user', 'card']),
        ]
        verbose_name_plural = "User card progress records"

    def __str__(self):
        direction = "→" if self.study_direction == 'A_TO_B' else "←"
        return f"{self.user.username}: {self.card} ({direction})"

    def is_due(self):
        """Check if card is due for review."""
        return self.next_review <= timezone.now()
```

**Key Design Points**:

1. **Unique together constraint**: Each (user, card, direction) combination is unique
2. **Separate direction tracking**: Same user can have different progress for A→B vs B→A
3. **Index on (user, next_review)**: Efficient querying for "cards due now"
4. **Default next_review**: New cards are immediately available for study

**Example Data**:

```python
# Card: "здраво" (sr) ↔ "hallo" (de)

# Partner A (learning German) - Serbian → German
UserCardProgress(
    user=partner_a,
    card=card_1,
    study_direction='A_TO_B',
    ease_factor=2.5,
    interval=1,
    repetitions=0,
    next_review=now
)

# Partner A (learning German backwards) - German → Serbian
UserCardProgress(
    user=partner_a,
    card=card_1,
    study_direction='B_TO_A',
    ease_factor=2.8,  # Different progress!
    interval=6,
    repetitions=2,
    next_review=now + 6 days
)

# Partner B (learning Serbian) - German → Serbian
UserCardProgress(
    user=partner_b,
    card=card_1,
    study_direction='B_TO_A',
    ease_factor=2.3,
    interval=1,
    repetitions=0,
    next_review=now
)
```

##### Review Model Changes

**Current:**
```python
class Review(models.Model):
    card = ForeignKey(Card, on_delete=CASCADE)
    session = ForeignKey(StudySession, on_delete=CASCADE)
    quality = IntegerField()
    reviewed_at = DateTimeField(auto_now_add=True)
    time_taken = IntegerField()
```

**Modified:**
```python
class Review(models.Model):
    card = ForeignKey(Card, on_delete=CASCADE)
    session = ForeignKey(StudySession, on_delete=CASCADE)
    quality = IntegerField(
        choices=[(i, str(i)) for i in range(6)],
        help_text="User rating 0-5"
    )
    study_direction = CharField(  # NEW
        max_length=10,
        choices=[
            ('A_TO_B', 'Language A → Language B'),
            ('B_TO_A', 'Language B → Language A'),
        ],
        help_text="Direction studied for this review"
    )
    reviewed_at = DateTimeField(auto_now_add=True)
    time_taken = IntegerField(help_text="Seconds spent on card")

    # Reverse relationship to get user
    # user = session.user
```

**Why add direction**: For analytics and statistics (e.g., "Which direction is harder?").

##### StudySession Model Changes

**Current:**
```python
class StudySession(models.Model):
    user = ForeignKey(User, on_delete=CASCADE)
    deck = ForeignKey(Deck, on_delete=CASCADE)
    started_at = DateTimeField(auto_now_add=True)
    ended_at = DateTimeField(null=True, blank=True)
    cards_studied = IntegerField(default=0)
```

**Modified:**
```python
class StudySession(models.Model):
    user = ForeignKey(User, on_delete=CASCADE)
    deck = ForeignKey(Deck, on_delete=CASCADE)
    study_direction = CharField(  # NEW
        max_length=10,
        choices=[
            ('A_TO_B', 'Language A → Language B'),
            ('B_TO_A', 'Language B → Language A'),
        ],
        null=True,
        blank=True,
        help_text="Primary direction for this session (null if mixed)"
    )
    started_at = DateTimeField(auto_now_add=True)
    ended_at = DateTimeField(null=True, blank=True)
    cards_studied = IntegerField(default=0)
```

**Note**: `study_direction` can be null for mixed-direction sessions (future feature).

#### Modified SM-2 Algorithm

**Current Implementation** (`flashcards/utils.py`):
```python
def calculate_next_review(card, quality):
    """Operates on Card model directly."""
    if quality < 3:
        card.repetitions = 0
        card.interval = 1
    else:
        # ... calculate interval
        card.repetitions += 1

    card.ease_factor = max(1.3, ...)
    card.next_review = timezone.now() + timedelta(days=card.interval)

    return card
```

**New Implementation**:
```python
def calculate_next_review(progress, quality):
    """
    Apply SM-2 algorithm to UserCardProgress.

    Args:
        progress: UserCardProgress instance
        quality: int (0-5) user rating

    Returns:
        Updated UserCardProgress instance (not saved)
    """
    if quality < 3:
        # Failed: reset repetitions, review tomorrow
        progress.repetitions = 0
        progress.interval = 1
    else:
        # Passed: increase interval
        if progress.repetitions == 0:
            progress.interval = 1
        elif progress.repetitions == 1:
            progress.interval = 6
        else:
            progress.interval = round(progress.interval * progress.ease_factor)

        progress.repetitions += 1

    # Adjust ease factor based on performance
    # EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
    progress.ease_factor = max(
        1.3,
        progress.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )

    # Set next review date
    progress.next_review = timezone.now() + timedelta(days=progress.interval)

    return progress
```

**Change Summary**: Accept `UserCardProgress` instead of `Card`. Algorithm logic unchanged.

### API Endpoints

#### Study Session Start (Modified)

**Current:**
```
POST /api/study/start/{deck_id}/

Response:
{
  "session_id": 123,
  "cards": [
    {"id": 1, "front": "hello", "back": "hola"}
  ]
}
```

**New:**
```
POST /api/study/start/{deck_id}/

Request Body:
{
  "direction": "A_TO_B"  // or "B_TO_A" or "RANDOM"
}

Response:
{
  "success": true,
  "data": {
    "session_id": 123,
    "deck": {
      "id": 5,
      "title": "Serbian-German Basics",
      "language_a": "sr",
      "language_b": "de"
    },
    "direction": "A_TO_B",
    "cards": [
      {
        "id": 1,
        "question": "здраво",        // language_a (based on direction)
        "answer": "hallo",           // language_b
        "context": "greeting",
        "direction": "A_TO_B"
      },
      {
        "id": 2,
        "question": "добро јутро",
        "answer": "guten Morgen",
        "context": "morning greeting",
        "direction": "A_TO_B"
      }
    ]
  }
}
```

**Implementation:**
```python
@login_required
def start_study_session(request, deck_id):
    data = json.loads(request.body)
    direction = data.get('direction', 'A_TO_B')

    if direction not in ['A_TO_B', 'B_TO_A', 'RANDOM']:
        return JsonResponse({
            'success': False,
            'error': {'code': 'INVALID_DIRECTION', 'message': 'Invalid study direction'}
        }, status=400)

    deck = get_object_or_404(Deck, id=deck_id)

    # Check permissions (user owns or deck is shared)
    if not deck.can_view(request.user):
        return JsonResponse({
            'success': False,
            'error': {'code': 'FORBIDDEN', 'message': 'Access denied'}
        }, status=403)

    # Get due cards for this user in this direction
    progress_items = UserCardProgress.objects.filter(
        user=request.user,
        card__deck=deck,
        study_direction=direction if direction != 'RANDOM' else None,
        next_review__lte=timezone.now()
    ).select_related('card')[:20]  # Limit to 20 cards per session

    # If RANDOM, alternate direction for each card
    if direction == 'RANDOM':
        # Implementation detail: mix A_TO_B and B_TO_A
        pass

    # Format cards based on direction
    cards = []
    for progress in progress_items:
        card = progress.card
        if direction == 'A_TO_B':
            question = card.language_a
            answer = card.language_b
        else:  # B_TO_A
            question = card.language_b
            answer = card.language_a

        cards.append({
            'id': card.id,
            'question': question,
            'answer': answer,
            'context': card.context,
            'direction': direction
        })

    # Create session
    session = StudySession.objects.create(
        user=request.user,
        deck=deck,
        study_direction=direction if direction != 'RANDOM' else None
    )

    return JsonResponse({
        'success': True,
        'data': {
            'session_id': session.id,
            'deck': {
                'id': deck.id,
                'title': deck.title,
                'language_a': deck.cards.first().language_a_code if deck.cards.exists() else 'en',
                'language_b': deck.cards.first().language_b_code if deck.cards.exists() else 'en'
            },
            'direction': direction,
            'cards': cards
        }
    })
```

#### Submit Review (Modified)

**Current:**
```
POST /api/study/review/

Body:
{
  "session_id": 123,
  "card_id": 1,
  "quality": 4,
  "time_taken": 12
}
```

**New:**
```
POST /api/study/review/

Body:
{
  "session_id": 123,
  "card_id": 1,
  "quality": 4,
  "time_taken": 12,
  "direction": "A_TO_B"  // NEW: Must match session direction
}

Response:
{
  "success": true,
  "data": {
    "next_review": "2025-11-08T10:00:00Z",
    "interval": 6,
    "ease_factor": 2.6
  }
}
```

**Implementation:**
```python
@login_required
def submit_review(request):
    data = json.loads(request.body)
    card_id = data['card_id']
    quality = data['quality']
    direction = data['direction']
    session_id = data['session_id']
    time_taken = data['time_taken']

    # Validate quality
    if not 0 <= quality <= 5:
        return JsonResponse({
            'success': False,
            'error': {'code': 'INVALID_QUALITY', 'message': 'Quality must be 0-5'}
        }, status=400)

    # Get or create progress
    progress, created = UserCardProgress.objects.get_or_create(
        user=request.user,
        card_id=card_id,
        study_direction=direction,
        defaults={
            'ease_factor': 2.5,
            'interval': 1,
            'repetitions': 0,
            'next_review': timezone.now()
        }
    )

    # Apply SM-2 algorithm
    progress = calculate_next_review(progress, quality)
    progress.save()

    # Create review record
    Review.objects.create(
        card_id=card_id,
        session_id=session_id,
        quality=quality,
        study_direction=direction,
        time_taken=time_taken
    )

    # Update session stats
    session = StudySession.objects.get(id=session_id)
    session.cards_studied += 1
    session.save()

    return JsonResponse({
        'success': True,
        'data': {
            'next_review': progress.next_review.isoformat(),
            'interval': progress.interval,
            'ease_factor': round(progress.ease_factor, 2)
        }
    })
```

#### Card CRUD (Modified)

**Create Card:**
```
POST /api/decks/{deck_id}/cards/

Current Body:
{
  "front": "hello",
  "back": "hola"
}

New Body:
{
  "language_a": "здраво",
  "language_b": "hallo",
  "language_a_code": "sr",
  "language_b_code": "de",
  "context": "greeting"  // optional
}

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "language_a": "здраво",
    "language_b": "hallo",
    "language_a_code": "sr",
    "language_b_code": "de",
    "context": "greeting",
    "created_at": "2025-11-02T14:00:00Z"
  }
}
```

**List Cards:**
```
GET /api/decks/{deck_id}/cards/

Response:
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": 1,
        "language_a": "здраво",
        "language_b": "hallo",
        "language_a_code": "sr",
        "language_b_code": "de",
        "context": "greeting"
      }
    ],
    "language_a_code": "sr",
    "language_b_code": "de"
  }
}
```

### User Interface/Experience

#### Study Direction Selection

**New UI Component** (add to `study.html`):

```html
<!-- Before study session starts -->
<div id="direction-selector" class="card mb-4">
  <div class="card-body text-center">
    <h4 class="mb-3">Choose Study Direction</h4>
    <p class="text-muted">
      This deck contains Serbian ↔ German cards
    </p>

    <div class="btn-group-vertical w-100" role="group">
      <button type="button" class="btn btn-outline-primary btn-lg mb-2"
              onclick="startStudy('A_TO_B')">
        🇷🇸 Serbian → 🇩🇪 German
        <small class="d-block text-muted">Learn German vocabulary</small>
      </button>

      <button type="button" class="btn btn-outline-primary btn-lg mb-2"
              onclick="startStudy('B_TO_A')">
        🇩🇪 German → 🇷🇸 Serbian
        <small class="d-block text-muted">Learn Serbian vocabulary</small>
      </button>

      <button type="button" class="btn btn-outline-secondary btn-lg"
              onclick="startStudy('RANDOM')">
        🔀 Random Direction
        <small class="d-block text-muted">Mix both directions</small>
      </button>
    </div>
  </div>
</div>
```

**TypeScript** (`src/ts/study.ts`):

```typescript
interface StudySessionConfig {
    deckId: number;
    direction: 'A_TO_B' | 'B_TO_A' | 'RANDOM';
}

class StudyController {
    private config: StudySessionConfig;
    private sessionId: number;

    async startStudy(direction: 'A_TO_B' | 'B_TO_A' | 'RANDOM'): Promise<void> {
        this.config = {
            deckId: this.deckId,
            direction: direction
        };

        // Hide direction selector
        document.getElementById('direction-selector')!.style.display = 'none';

        // Show loading
        this.showLoading();

        // Start session
        const response = await api.startStudySession(this.deckId, direction);

        if (response.success) {
            this.sessionId = response.data.session_id;
            this.loadCards(response.data.cards);
            this.showDirectionIndicator(response.data.deck, direction);
        }
    }

    showDirectionIndicator(deck: any, direction: string): void {
        const indicator = document.getElementById('direction-indicator');
        const arrow = direction === 'A_TO_B' ? '→' : '←';
        const langA = this.getLanguageName(deck.language_a);
        const langB = this.getLanguageName(deck.language_b);

        indicator!.textContent = direction === 'A_TO_B'
            ? `${langA} → ${langB}`
            : `${langB} → ${langA}`;
    }

    async submitRating(quality: number): Promise<void> {
        const timeSpent = this.calculateTimeSpent();

        await api.submitReview({
            session_id: this.sessionId,
            card_id: this.currentCard.id,
            quality: quality,
            time_taken: timeSpent,
            direction: this.config.direction
        });

        this.nextCard();
    }
}
```

#### Card Creation Form

**Modified** (`deck_detail.html`):

**Current:**
```html
<form id="create-card-form">
  <div class="mb-3">
    <label for="card-front" class="form-label">Front (Question)</label>
    <textarea id="card-front" class="form-control"></textarea>
  </div>
  <div class="mb-3">
    <label for="card-back" class="form-label">Back (Answer)</label>
    <textarea id="card-back" class="form-control"></textarea>
  </div>
  <button type="submit" class="btn btn-primary">Create Card</button>
</form>
```

**New:**
```html
<form id="create-card-form">
  <div class="mb-3">
    <label for="card-language-a" class="form-label">
      🇷🇸 Serbian (Српски)
    </label>
    <textarea id="card-language-a" class="form-control"
              placeholder="здраво" required></textarea>
  </div>

  <div class="mb-3">
    <label for="card-language-b" class="form-label">
      🇩🇪 German (Deutsch)
    </label>
    <textarea id="card-language-b" class="form-control"
              placeholder="hallo" required></textarea>
  </div>

  <div class="mb-3">
    <label for="card-context" class="form-label">
      Context (Optional)
    </label>
    <input type="text" id="card-context" class="form-control"
           placeholder="greeting, informal">
  </div>

  <button type="submit" class="btn btn-primary">Create Card</button>
</form>
```

**TypeScript** (`src/ts/cards.ts`):

```typescript
async createCard(): Promise<void> {
    const languageA = (document.getElementById('card-language-a') as HTMLTextAreaElement).value;
    const languageB = (document.getElementById('card-language-b') as HTMLTextAreaElement).value;
    const context = (document.getElementById('card-context') as HTMLInputElement).value;

    const response = await api.createCard(this.deckId, {
        language_a: languageA,
        language_b: languageB,
        language_a_code: 'sr',  // TODO: Get from deck settings
        language_b_code: 'de',
        context: context
    });

    if (response.success) {
        this.refreshCardList();
        this.clearForm();
    }
}
```

#### Card Display in List

**Modified** (deck_detail.html):

```html
<div class="card mb-2">
  <div class="card-body">
    <div class="row">
      <div class="col-md-5">
        <strong>🇷🇸</strong> здраво
      </div>
      <div class="col-md-2 text-center">
        ↔
      </div>
      <div class="col-md-5">
        <strong>🇩🇪</strong> hallo
      </div>
    </div>
    <small class="text-muted">Context: greeting</small>
  </div>
</div>
```

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

```python
# Unit tests for UserCardProgress
def test_user_card_progress_creation():
    """Can create progress for user + card + direction"""

def test_separate_progress_per_direction():
    """Same user has different progress for A→B vs B→A"""

def test_separate_progress_per_user():
    """Different users have different progress for same card"""

def test_sm2_algorithm_with_progress():
    """SM-2 algorithm works with UserCardProgress"""

# Integration tests
def test_study_session_with_direction():
    """Can start study session with specific direction"""

def test_cards_formatted_by_direction():
    """Cards show correct language based on direction"""

def test_review_updates_correct_progress():
    """Submitting review updates only user's progress for that direction"""

# API tests
def test_start_session_requires_direction():
    """POST /api/study/start/ validates direction parameter"""

def test_submit_review_with_direction():
    """POST /api/study/review/ accepts and stores direction"""

def test_create_card_with_languages():
    """POST /api/decks/{id}/cards/ accepts language fields"""
```

### Performance Considerations

**Database Queries**:
```python
# Efficient: Get due cards for user
UserCardProgress.objects.filter(
    user=request.user,
    next_review__lte=timezone.now()
).select_related('card')  # Join with Card model

# Index on (user, next_review) makes this fast
```

**N+1 Query Prevention**:
```python
# When listing cards with user progress
cards = Card.objects.filter(deck=deck).prefetch_related(
    Prefetch(
        'user_progress',
        queryset=UserCardProgress.objects.filter(user=request.user)
    )
)
```

**Database Size**:
- UserCardProgress grows with (users × cards × 2 directions)
- Example: 2 partners, 1000 cards, both directions = 4000 progress records
- Not a concern for couples use case (small scale)

### Security Considerations

**Permission Checks**:
- Verify user can access deck before starting study
- Verify card belongs to deck in review submission
- Prevent manipulation of UserCardProgress via API (no direct endpoint)

**Direction Validation**:
```python
VALID_DIRECTIONS = ['A_TO_B', 'B_TO_A', 'RANDOM']
if direction not in VALID_DIRECTIONS:
    return error_response('INVALID_DIRECTION')
```

**Quality Rating Validation**:
```python
if not 0 <= quality <= 5:
    return error_response('INVALID_QUALITY')
```

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
