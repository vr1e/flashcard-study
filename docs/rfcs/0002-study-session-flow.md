# RFC 0002: Study Session Flow

## Metadata

- **RFC Number**: 0002
- **Title**: Interactive Study Session Design
- **Author**: Development Team
- **Status**: Implemented
- **Created**: 2024-10-25
- **Last Updated**: 2025-11-01

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

The study session is managed by a TypeScript class with the following responsibilities:

- **Session Management**: Fetch due cards and create session via API
- **Card Display**: Show current card front with flip animation
- **Progress Tracking**: Track current card index and session timing
- **Rating Submission**: Submit quality ratings and move to next card
- **Session Completion**: Display summary statistics at end

Key methods:
- `start()`: Fetch due cards and initialize session
- `showCard()`: Display current card front
- `flipCard()`: Animate flip to reveal back
- `submitRating(quality)`: Submit review and advance to next card
- `nextCard()`: Progress to next card or end session
- `endSession()`: Show summary and statistics

#### API Endpoints

**Start Study Session:**
- `GET /api/decks/{deck_id}/study/`
- Returns: cards due for review and session ID

**Submit Card Review:**
- `POST /api/cards/{card_id}/review/`
- Body: session_id, quality rating (0-5), time_taken (seconds)
- Returns: success status and next review date

#### UI States

1. **Loading**: Fetching cards
2. **Card Front**: Question visible, "Show Answer" button
3. **Card Back**: Answer visible, rating buttons (0-5)
4. **Transition**: Animating to next card
5. **Complete**: Session summary with stats


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

**Unit Tests:**
- Start session and fetch cards
- Flip card on button click
- Submit rating and advance to next card
- End session after last card
- Handle zero cards gracefully (no cards due)

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

## Implementation Notes (Added 2025-11-01)

### Actual Implementation vs. Original Design

The following features were implemented as additional enhancements beyond the original RFC:

#### 1. Auto-Start Behavior
**Original Design**: User clicks "Study Now" button to start session
**Implemented**: Study session auto-starts when page loads

- Session initializes automatically via TypeScript `DOMContentLoaded` handler
- No explicit button click required
- Deck ID parsed from URL path
- Improves UX by reducing clicks

#### 2. Real-Time Timer Display
**Added Feature**: Live timer showing elapsed time during study session

- Timer displays at top of study interface with clock icon
- Updates every second using interval timer
- Format: MM:SS (e.g., "0:45" for 45 seconds, "12:30" for 12 minutes 30 seconds)
- Timer stops when session ends
- Final time displayed in completion screen

Implementation uses:
- Session start time tracking
- Interval-based updates every 1000ms
- Elapsed time calculation and formatting

#### 3. Average Quality Calculation
**Added Feature**: Calculate and display average quality rating at session end

- Tracks all quality ratings during session
- Calculates average on session completion
- Displays with 1 decimal place (e.g., "3.8")
- Shows "-" if no cards were rated (edge case: user quits without rating)

Implementation:
- Accumulate ratings as user submits them
- Calculate mean on session end
- Handle edge case of empty ratings array

Completion screen shows three metrics:
- **Cards Studied**: Total count
- **Time Spent**: Elapsed time in MM:SS
- **Average Quality**: Mean of all ratings (1 decimal)

### Testing
All features verified via Playwright browser automation testing on 2025-11-01:
- Timer updates correctly every second ✅
- Average quality calculates accurately ✅
- Auto-start works without user interaction ✅
- Keyboard shortcuts (Space, 0-5, Esc) functional ✅
