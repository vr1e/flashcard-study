# RFC 0004: Testing Strategy

**Status**: Draft
**Created**: 2025-01-29

---

## What are we building?

A comprehensive testing infrastructure and test suite for the flashcard application, focusing on the SM-2 spaced repetition algorithm, model methods, and critical API endpoints. This establishes automated testing to ensure core functionality works correctly and provides a safety net for future changes.

## Why?

The core functionality is now complete (all API endpoints, models, and utils are implemented), making this the ideal time to add tests. Testing now provides:

1. **Confidence in core logic** - The SM-2 algorithm is complex and critical; bugs here would break the entire learning system
2. **Safety for refactoring** - Tests allow us to change code with confidence we haven't broken existing functionality
3. **Documentation** - Tests serve as executable examples of how the code should behave
4. **Faster development** - Catching bugs in tests is faster than manual clicking through the UI
5. **Regression prevention** - Ensures fixed bugs stay fixed

## How?

### Testing Infrastructure

**Dependencies** (add to `requirements.txt`):
```
pytest==7.4.3
pytest-django==4.7.0
factory-boy==3.3.0
freezegun==1.4.0
```

**Configuration** (`pytest.ini` at project root):
```ini
[pytest]
DJANGO_SETTINGS_MODULE = flashcard_project.settings
python_files = tests.py test_*.py *_tests.py
addopts = -v --strict-markers --tb=short
```

**Directory Structure**:
```
flashcards/
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Pytest fixtures
│   ├── factories.py         # Factory Boy model factories
│   ├── test_utils.py        # SM-2 algorithm tests
│   ├── test_models.py       # Model method tests
│   └── test_views.py        # API endpoint tests
```

### Test Factories

Factory Boy factories for creating test data:

```python
# flashcards/tests/factories.py
import factory
from django.contrib.auth.models import User
from flashcards.models import Deck, Card, StudySession, Review

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user{n}')
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')

class DeckFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Deck

    user = factory.SubFactory(UserFactory)
    title = factory.Faker('sentence', nb_words=3)
    description = factory.Faker('paragraph')

class CardFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Card

    deck = factory.SubFactory(DeckFactory)
    front = factory.Faker('sentence')
    back = factory.Faker('paragraph')
    ease_factor = 2.5
    interval = 1
    repetitions = 0
```

### Test Priority Levels

**Priority 1: Core Business Logic (Must Have)**
- SM-2 algorithm correctness (7 tests)
- Model helper methods (3-5 tests)
- Review submission API (6-8 tests)

**Priority 2: Feature Completeness (Should Have)**
- Study session API (4-6 tests)
- Deck CRUD operations (8-10 tests)
- Card CRUD operations (8-10 tests)

**Priority 3: Edge Cases (Nice to Have)**
- Statistics calculation
- Empty states
- Concurrent operations
- Error boundary cases

### Code Example

Example test for SM-2 algorithm:

```python
# flashcards/tests/test_utils.py
import pytest
from freezegun import freeze_time
from datetime import datetime, timedelta
from flashcards.utils import calculate_next_review
from .factories import CardFactory

class TestSM2Algorithm:
    @freeze_time("2025-01-29 12:00:00")
    def test_first_successful_review_sets_interval_to_1_day(self):
        """Quality >= 3 with no previous repetitions should set interval to 1 day"""
        card = CardFactory(repetitions=0, interval=1)

        card = calculate_next_review(card, quality=4)

        assert card.repetitions == 1
        assert card.interval == 1
        expected_review = datetime(2025, 1, 30, 12, 0, 0)
        assert card.next_review == expected_review

    def test_failed_review_resets_repetitions(self):
        """Quality < 3 should reset repetitions to 0 and interval to 1"""
        card = CardFactory(repetitions=5, interval=30, ease_factor=2.8)

        card = calculate_next_review(card, quality=2)

        assert card.repetitions == 0
        assert card.interval == 1

    def test_ease_factor_never_goes_below_minimum(self):
        """Even with terrible performance, ease factor stays >= 1.3"""
        card = CardFactory(ease_factor=1.3)

        card = calculate_next_review(card, quality=0)

        assert card.ease_factor >= 1.3
```

### High-Priority Tests to Write

#### SM-2 Algorithm Tests (`test_utils.py`)

1. **test_first_successful_review_sets_interval_to_1_day**
   - Input: repetitions=0, quality>=3
   - Expected: interval=1, repetitions=1

2. **test_second_successful_review_sets_interval_to_6_days**
   - Input: repetitions=1, quality>=3
   - Expected: interval=6, repetitions=2

3. **test_subsequent_reviews_multiply_by_ease_factor**
   - Input: repetitions>=2, quality>=3
   - Expected: interval = previous_interval × ease_factor

4. **test_failed_review_resets_repetitions_and_interval**
   - Input: quality<3
   - Expected: repetitions=0, interval=1

5. **test_ease_factor_adjusts_based_on_quality**
   - Test quality 0, 3, 5 produce correct ease_factor changes

6. **test_ease_factor_never_goes_below_minimum**
   - Even with quality=0, ease_factor >= 1.3

7. **test_next_review_date_calculated_correctly**
   - Verify next_review = now + interval days

#### Model Method Tests (`test_models.py`)

1. **test_card_is_due_when_next_review_in_past**
2. **test_card_is_not_due_when_next_review_in_future**
3. **test_deck_cards_due_count_returns_correct_number**
4. **test_deck_total_cards_returns_all_cards**
5. **test_cards_due_count_zero_for_empty_deck**

#### API Endpoint Tests (`test_views.py`)

Focus on review submission endpoint (`POST /api/cards/<id>/review/`):

1. **test_submit_review_applies_sm2_algorithm** - Verify card updates
2. **test_submit_review_creates_review_record** - Review object created
3. **test_submit_review_increments_session_cards_studied** - Session updated
4. **test_submit_review_rejects_invalid_quality** - 400 for quality > 5
5. **test_submit_review_requires_authentication** - 401/302 without login
6. **test_submit_review_enforces_card_ownership** - User A can't review User B's cards
7. **test_submit_review_returns_updated_card_data** - Response format correct
8. **test_submit_review_handles_nonexistent_card** - 404 for invalid card_id

## Notes

### Running Tests

```bash
# Install dependencies
pip install -r requirements.txt

# Run all tests
pytest

# Run specific test file
pytest flashcards/tests/test_utils.py

# Run with coverage (if pytest-cov installed)
pytest --cov=flashcards

# Run verbose with full output
pytest -vv
```

### Known Issues to Fix

**Timezone Issue in Models**:
```python
# Current (WRONG):
next_review = models.DateTimeField(default=datetime.now)

# Should be (CORRECT):
from django.utils import timezone
next_review = models.DateTimeField(default=timezone.now)
```

This ensures timezone-aware datetimes for proper testing.

### Dependencies

- **pytest-django**: Integrates pytest with Django test database
- **factory-boy**: Creates test objects with realistic data
- **freezegun**: Mocks time for testing time-dependent code (crucial for SM-2)

### Tradeoffs

- **Pytest over Django TestCase**: Pytest provides better fixtures, cleaner syntax, and better output
- **Factory Boy over fixtures**: More flexible than JSON fixtures, easier to maintain
- **Focus on unit tests first**: Integration tests come later once core logic is verified

### Success Criteria

✅ Can run `pytest` and see green output
✅ 16-20 tests passing (7 SM-2, 3-5 model, 6-8 API)
✅ SM-2 algorithm verified for all quality ratings (0-5)
✅ Model methods return correct counts and booleans
✅ Review submission properly applies algorithm and creates records
✅ Authentication/authorization enforced

### Future Considerations

- Add integration tests for complete study workflows
- Add frontend JavaScript tests (TypeScript/Jest)
- Set up CI/CD to run tests automatically
- Add performance tests for large card collections
- Test edge cases (concurrent reviews, deleted sessions, etc.)

---

**Implementation Steps**:
1. Install dependencies: `pip install -r requirements.txt`
2. Create test directory structure
3. Write factories in `factories.py`
4. Write SM-2 tests in `test_utils.py`
5. Write model tests in `test_models.py`
6. Write API tests in `test_views.py`
7. Fix timezone issue in `models.py`
8. Run `pytest` and iterate until green

---

## E2E/UI Testing with Playwright (Added 2025-11-01)

### What Was Tested

Successfully used **Playwright browser automation** via Claude Code's MCP integration to test Phase 3 UI enhancements:

**Features Verified** (2025-11-01):
1. **Pluralization**: Deck/card counts show "1 card" vs "2 cards" correctly
2. **Deck Editing**: Edit modal opens, pre-fills data, saves changes, refreshes UI
3. **Study Timer**: Displays and updates every second (verified: 0:00 → 0:15 → 0:45)
4. **Average Quality**: Calculates correctly (rating 4 → shows "4.0")

### Playwright Benefits

**Advantages over manual testing**:
- **Reproducible**: Same test sequence every time
- **Fast**: Automated clicks/navigation faster than manual
- **Documentation**: Test actions serve as usage examples
- **Real browser**: Tests actual DOM rendering, CSS, JavaScript
- **Screenshot capable**: Can capture visual bugs

**MCP Integration Features Used**:
```typescript
// Navigate to pages
mcp__playwright__browser_navigate({ url: "http://localhost:8000/" })

// Click elements
mcp__playwright__browser_click({ element: "Add Card button", ref: "e44" })

// Type in fields
mcp__playwright__browser_type({
    element: "Title textbox",
    ref: "e59",
    text: "Test Deck - Edited Title"
})

// Wait and verify updates
mcp__playwright__browser_wait_for({ time: 3 })

// Take screenshots
mcp__playwright__browser_take_screenshot({ filename: "study-session.png" })
```

### Test Results

**All tests passed** ✅:
- No console errors
- All features functional
- UI updates correctly
- State persists across navigation

### Recommended Testing Strategy

**Layered Approach**:
1. **Unit tests** (pytest): SM-2 algorithm, model methods, API endpoints
2. **Integration tests** (pytest): Complete workflows (deck → cards → study → stats)
3. **E2E tests** (Playwright): User-facing features, UI interactions, visual regression

**When to use Playwright**:
- Testing JavaScript-heavy features (study session, timer, modals)
- Verifying visual elements (animations, responsive design)
- User flow testing (create deck → add card → study → complete)
- Cross-browser compatibility (if needed)

**When to use pytest**:
- Backend logic (SM-2 algorithm, model methods)
- API endpoints (request/response validation)
- Database operations (CRUD, queries)
- Business logic (statistics calculations)

### Future Enhancements

Consider adding to testing infrastructure:
- **Playwright test suite**: Formalize E2E tests as actual test files
- **CI/CD integration**: Run Playwright tests on PR
- **Visual regression**: Screenshot comparison testing
- **Performance testing**: Load testing for large decks
- **Mobile testing**: Responsive design verification
