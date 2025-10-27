# RFC 0002: Study Session Flow

## Metadata
- **RFC Number**: 0002
- **Title**: Interactive Study Session Design
- **Author**: Development Team
- **Status**: Draft
- **Created**: 2024-10-25
- **Last Updated**: 2024-10-25

## Summary
Design and implement an interactive, JavaScript-driven study session interface with card flipping animations, quality ratings, and progress tracking.

## Motivation
**Why are we doing this?**

The study session is the core user experience of the application. It needs to be:
- **Engaging**: Smooth animations and interactions keep users motivated
- **Efficient**: Quick keyboard shortcuts and minimal clicks
- **Informative**: Clear progress indicators and feedback
- **Mobile-friendly**: Touch gestures and responsive design

A well-designed study flow directly impacts user retention and learning outcomes.

## Proposed Solution
**What are we building and how?**

### Overview
Build a single-page study interface that:
1. Fetches cards due for review via API
2. Displays cards one at a time with flip animation
3. Records time spent on each card
4. Submits quality ratings to update spaced repetition data
5. Shows progress and completion summary

### Technical Details

#### Frontend Architecture (TypeScript)
```typescript
class StudySession {
  private deckId: number;
  private cards: Card[];
  private currentIndex: number = 0;
  private sessionId: number;
  private startTime: number;
  private flipped: boolean = false;

  async start(): Promise<void> {
    // Fetch due cards and create session
  }

  showCard(): void {
    // Display current card front
  }

  flipCard(): void {
    // Animate flip to reveal back
  }

  async submitRating(quality: number): Promise<void> {
    // Submit review and move to next card
  }

  nextCard(): void {
    // Progress to next card or end session
  }

  endSession(): void {
    // Show summary and statistics
  }
}
```

#### API Endpoints
```
GET  /api/decks/{deck_id}/study/
     → Returns: { cards: Card[], session_id: number }

POST /api/cards/{card_id}/review/
     Body: { session_id, quality, time_taken }
     → Returns: { success: boolean, next_review: datetime }
```

#### UI States
1. **Loading**: Fetching cards
2. **Card Front**: Question visible, "Show Answer" button
3. **Card Back**: Answer visible, rating buttons (0-5)
4. **Transition**: Animating to next card
5. **Complete**: Session summary with stats

### Code Examples

#### TypeScript Session Manager
```typescript
class StudySession {
  constructor(deckId: number) {
    this.deckId = deckId;
    this.cards = [];
    this.currentIndex = 0;
  }

  async start(): Promise<void> {
    const response = await fetch(`/api/decks/${this.deckId}/study/`, {
      method: 'POST'
    });
    const data = await response.json();

    this.cards = data.cards;
    this.sessionId = data.session_id;

    if (this.cards.length === 0) {
      this.showNoCardsMessage();
      return;
    }

    this.showCard();
  }

  showCard(): void {
    const card = this.cards[this.currentIndex];
    this.flipped = false;
    this.startTime = Date.now();

    // Update UI
    document.getElementById('card-front').textContent = card.front;
    document.getElementById('card-back').textContent = card.back;
    document.getElementById('progress').textContent =
      `${this.currentIndex + 1} / ${this.cards.length}`;

    // Show front, hide back
    this.showFront();
  }

  flipCard(): void {
    if (this.flipped) return;

    this.flipped = true;
    // CSS animation to flip card
    document.querySelector('.card-container').classList.add('flipped');
  }

  async submitRating(quality: number): Promise<void> {
    const card = this.cards[this.currentIndex];
    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);

    await fetch(`/api/cards/${card.id}/review/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.sessionId,
        quality: quality,
        time_taken: timeSpent
      })
    });

    this.nextCard();
  }

  nextCard(): void {
    this.currentIndex++;

    if (this.currentIndex < this.cards.length) {
      this.showCard();
    } else {
      this.endSession();
    }
  }

  endSession(): void {
    // Show completion modal with statistics
    const stats = {
      cards_studied: this.cards.length,
      time_elapsed: Math.floor((Date.now() - this.sessionStart) / 1000)
    };

    this.showCompletionModal(stats);
  }
}
```

#### HTML Structure
```html
<div class="study-container">
  <div class="progress-bar">
    <span id="progress">0 / 0</span>
  </div>

  <div class="card-container">
    <div class="card">
      <div class="card-front">
        <h2 id="card-front"></h2>
        <button onclick="session.flipCard()">Show Answer</button>
      </div>

      <div class="card-back">
        <h3>Answer:</h3>
        <p id="card-back"></p>

        <div class="rating-buttons">
          <button onclick="session.submitRating(0)">0 - Forgot</button>
          <button onclick="session.submitRating(1)">1 - Hard</button>
          <button onclick="session.submitRating(2)">2 - Medium</button>
          <button onclick="session.submitRating(3)">3 - Good</button>
          <button onclick="session.submitRating(4)">4 - Easy</button>
          <button onclick="session.submitRating(5)">5 - Perfect</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

### User Interface/Experience

#### Study Flow
1. User clicks "Study Now" from deck list
2. Loading spinner while fetching cards
3. First card appears showing question
4. User reads question, clicks "Show Answer" or presses Space
5. Card flips with CSS animation
6. User sees answer and rating buttons
7. User rates recall quality (0-5) or uses number keys
8. Card animates out, next card animates in
9. Progress bar updates
10. After last card, summary modal shows:
    - Total cards studied
    - Average time per card
    - Average quality rating
    - "Study More" or "Back to Dashboard" buttons

#### Keyboard Shortcuts
- **Space**: Flip card
- **0-5**: Rate card quality
- **Esc**: Exit study session (with confirmation)

#### Mobile Gestures (Optional Enhancement)
- **Swipe Up**: Flip card
- **Tap Buttons**: Rate quality

## Alternatives Considered

### Alternative 1: Multi-card Grid View
- **Description**: Show multiple cards at once like physical flashcards
- **Pros**: Faster for reviewing many cards
- **Cons**: Less focused, harder to track individual timing
- **Why not chosen**: Single card focus aligns with spaced repetition best practices

### Alternative 2: Server-Side Rendering
- **Description**: Full page reload for each card
- **Pros**: Simpler JavaScript, works without JS
- **Cons**: Slow, poor UX, doesn't meet JavaScript requirement
- **Why not chosen**: Doesn't showcase JavaScript skills, poor user experience

### Alternative 3: Real-time WebSocket Updates
- **Description**: Use WebSockets for live session updates
- **Pros**: Could enable multiplayer study sessions later
- **Cons**: Overkill for single-user sessions, adds complexity
- **Why not chosen**: REST API is sufficient for MVP

## Implementation Notes

### Dependencies
- **Frontend**: TypeScript, Bootstrap 5 (modals, buttons)
- **Backend**: Django views for API endpoints
- **No external libraries**: Pure TypeScript/CSS for animations

### Migration Strategy
- N/A - New feature

### Testing Approach
```typescript
// Unit tests
describe('StudySession', () => {
  test('starts session and fetches cards', async () => { });
  test('flips card on button click', () => { });
  test('submits rating and advances', async () => { });
  test('ends session after last card', () => { });
  test('handles zero cards gracefully', () => { });
});
```

**Manual Testing Scenarios**:
- [ ] Study session with 1 card
- [ ] Study session with 10+ cards
- [ ] Study session with 0 cards (all reviewed)
- [ ] Keyboard shortcuts work
- [ ] Mobile responsive (viewport <768px)
- [ ] Network error handling

### Performance Considerations
- Preload next card while user is reviewing current
- Debounce flip animation to prevent double-clicks
- Optimize card animations (CSS transforms, not position)
- Lazy load card images (if we add image support later)

### Security Considerations
- Validate session_id belongs to current user
- Ensure card_id belongs to specified deck
- Rate limit review submissions (prevent spam)
- CSRF protection on POST requests

## Timeline
- **Estimated Effort**: 2-3 days
- **Target Completion**: After models and basic views are complete

## Open Questions
- [ ] Should we allow pausing/resuming sessions?
- [ ] Should we shuffle card order or use next_review sorting?
- [ ] Do we need undo functionality for accidental ratings?
- [ ] Should we add sound effects for feedback?

## References
- [Anki Study Interface](https://docs.ankiweb.net/studying.html)
- [CSS Flip Animation Tutorial](https://www.w3schools.com/howto/howto_css_flip_card.asp)
- [Bootstrap 5 Modals](https://getbootstrap.com/docs/5.0/components/modal/)
