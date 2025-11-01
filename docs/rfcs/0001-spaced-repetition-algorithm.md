# RFC 0001: Spaced Repetition Algorithm (SM-2)

## Metadata

- **RFC Number**: 0001
- **Title**: Spaced Repetition Algorithm Implementation
- **Author**: Development Team
- **Status**: Draft
- **Created**: 2024-10-25
- **Last Updated**: 2024-10-25

## Summary

Implement the SM-2 (SuperMemo 2) spaced repetition algorithm to optimize flashcard review intervals for efficient learning and long-term retention.

## Motivation

**Why are we doing this?**

Traditional flashcard systems review all cards equally, leading to:

- Wasted time reviewing easy cards too frequently
- Forgetting difficult cards due to insufficient review
- Inefficient learning outcomes

Spaced repetition solves this by:

- Scheduling reviews at optimal intervals based on individual card difficulty
- Increasing intervals for well-known cards
- Decreasing intervals for difficult cards
- Maximizing retention while minimizing study time

## Proposed Solution

**What are we building and how?**

### Overview

We'll implement the SM-2 algorithm, which calculates the next review date based on:

1. **Quality** (0-5): User's self-assessment of recall
2. **Ease Factor**: Card difficulty (adjusted over time)
3. **Interval**: Days until next review
4. **Repetitions**: Consecutive successful reviews

### Technical Details

#### Algorithm Flow

```
1. User reviews card and rates quality (0-5)
2. If quality < 3:
   - Reset repetitions to 0
   - Set interval to 1 day
3. If quality >= 3:
   - Increment repetitions
   - Calculate new interval based on repetitions:
     * 1st repetition: 1 day
     * 2nd repetition: 6 days
     * 3rd+ repetition: previous_interval × ease_factor
4. Adjust ease_factor based on quality
5. Set next_review = today + interval
```

#### Data Model

```python
class Card(models.Model):
    # ... existing fields
    ease_factor = FloatField(default=2.5)    # Range: 1.3+
    interval = IntegerField(default=1)        # Days
    repetitions = IntegerField(default=0)     # Count
    next_review = DateTimeField()             # Timestamp
```

### Code Examples

```python
def calculate_next_review(card, quality):
    """SM-2 Algorithm implementation."""

    if quality < 3:
        # Failed: reset repetitions, review tomorrow
        card.repetitions = 0
        card.interval = 1
    else:
        # Passed: increase interval
        if card.repetitions == 0:
            card.interval = 1
        elif card.repetitions == 1:
            card.interval = 6
        else:
            card.interval = round(card.interval * card.ease_factor)

        card.repetitions += 1

    # Adjust ease factor based on performance
    # EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
    card.ease_factor = max(
        1.3,
        card.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )

    # Set next review date
    card.next_review = datetime.now() + timedelta(days=card.interval)

    return card
```

### User Interface/Experience

1. User clicks "Study" on deck
2. System fetches cards where `next_review <= now()`
3. User views card front, flips to see back
4. User rates recall quality (0-5) via buttons/slider
5. Algorithm updates card, shows next card
6. Session ends when no cards remain

## Alternatives Considered

### Alternative 1: Leitner System

- **Description**: Simple box-based system (5 boxes, move forward on success, back on failure)
- **Pros**: Simpler to implement, easier to understand
- **Cons**: Less precise intervals, not optimized for individual cards
- **Why not chosen**: SM-2 provides better retention with proven research

### Alternative 2: SM-17+ (SuperMemo 17)

- **Description**: Latest SuperMemo algorithm with neural networks
- **Pros**: Most advanced, potentially better results
- **Cons**: Extremely complex, requires large datasets, overkill for this project
- **Why not chosen**: SM-2 offers best balance of simplicity and effectiveness

### Alternative 3: Anki's Modified SM-2

- **Description**: Anki's tweaked version with fuzz factor and additional features
- **Pros**: Battle-tested in production app
- **Cons**: More complex than needed for MVP
- **Why not chosen**: Pure SM-2 is sufficient for initial version

## Implementation Notes

### Dependencies

- Python `datetime` and `timedelta` (built-in)
- No external libraries required

### Migration Strategy

- New cards get default values (ease_factor=2.5, interval=1, repetitions=0)
- Existing cards (if any) will be migrated with same defaults

### Testing Approach

```python
# Unit tests for algorithm
def test_first_review_success():
    """First successful review should set interval to 1 day"""

def test_second_review_success():
    """Second successful review should set interval to 6 days"""

def test_failed_review_resets():
    """Failed review should reset repetitions to 0"""

def test_ease_factor_adjusts():
    """Ease factor should adjust based on quality rating"""

def test_ease_factor_minimum():
    """Ease factor should never go below 1.3"""
```

### Performance Considerations

- Querying due cards: Add index on `next_review` field
- Batch update cards after study session
- Cache deck statistics (cards due count)

### Security Considerations

- Validate quality rating is 0-5
- Ensure user can only review their own cards
- Prevent manipulation of ease_factor/interval via API

## Timeline

- **Estimated Effort**: 1-2 days
- **Target Completion**: During implementation phase

## Open Questions

- [ ] Should we add a "hard/good/easy" quick rating (maps to quality 2/3/4)?
- [ ] Do we need to cap maximum interval (e.g., 365 days)?
- [ ] Should we add random fuzz factor to intervals to avoid card clumping?

## References

- [Original SM-2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [SM-2 Wikipedia](https://en.wikipedia.org/wiki/SuperMemo#SM-2_algorithm)
- [Anki's SRS Documentation](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)
