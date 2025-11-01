# API Fixes & Testing - Task Checklist

**Last Updated**: 2025-01-29

This checklist provides a quick-reference format for tracking progress through the implementation plan.

---

## Phase 1: Fix Critical API Structure (Day 1)

**Goal**: Make all API calls functional
**Duration**: 4-6 hours

### Tasks

- [ ] **1.1** Update API Client Base Fetcher ⚡ CRITICAL
  - File: `src/ts/api.ts` (line 87-107)
  - Modify `fetch()` to unwrap `{success, data}` responses
  - Add error throwing for failed requests
  - Effort: M

- [ ] **1.2** Fix Deck API Method Signatures
  - File: `src/ts/api.ts` (line 113-154)
  - Change `getDecks()` return type to `Promise<Deck[]>`
  - Update other deck method types as needed
  - Effort: S

- [ ] **1.3** Fix Card API Method Signatures
  - File: `src/ts/api.ts` (line 160-201)
  - Change `getCards()` return type to `Promise<Card[]>`
  - Update other card method types as needed
  - Effort: S

- [ ] **1.4** Fix Study Session API Method Signatures
  - File: `src/ts/api.ts` (line 207-224)
  - Verify `startStudySession()` returns unwrapped `StudySession`
  - Update if needed
  - Effort: S

- [ ] **1.5** Fix Statistics API Method Signatures
  - File: `src/ts/api.ts` (line 230-236)
  - Verify `getUserStats()` returns unwrapped `Statistics`
  - Update if needed
  - Effort: S

- [ ] **1.6** Update All TypeScript Controllers
  - Files: `src/ts/decks.ts`, `cards.ts`, `study.ts`, `stats.ts`
  - Update all code accessing API responses
  - Change from `response.decks` to just `decks` (unwrapped)
  - Effort: M

- [ ] **1.7** Add ApiError Class
  - File: `src/ts/api.ts` (top of file)
  - Create custom error class for API failures
  - Include code and message properties
  - Effort: S

- [ ] **1.8** Compile and Test TypeScript
  - Run: `npm run build`
  - Verify: No type errors
  - Verify: All `.js` files in `static/js/`
  - Effort: S

### Phase 1 Acceptance Criteria
- [ ] All TypeScript compiles without errors
- [ ] All API calls return data in expected format
- [ ] No runtime errors in browser console
- [ ] Deck list loads and displays correctly
- [ ] Card creation works end-to-end

---

## Phase 2: Fix Backend Field Names & Missing Features (Day 2)

**Goal**: Backend returns data matching frontend expectations
**Duration**: 3-4 hours

### Tasks

- [ ] **2.1** Fix Statistics Field Names ⚡ CRITICAL
  - File: `flashcards/utils.py` (line 127-134)
  - Rename `study_streak` → `study_streak_days`
  - Rename `decks_count` → `total_decks`
  - Add `recent_activity` field (empty array for now)
  - Effort: S

- [ ] **2.2** Implement Recent Activity Data
  - File: `flashcards/utils.py` (after line 125)
  - Query last 7 days of review activity
  - Group by date with cards_studied and time_spent
  - Return as array of objects
  - Effort: M

- [ ] **2.3** Verify Backend Deck List Response Structure
  - File: `flashcards/views.py` (line 122)
  - Confirm returns `{success: True, 'data': [...]}`
  - No changes needed (verification only)
  - Effort: XS

- [ ] **2.4** Add Review Time Tracking Field
  - File: `flashcards/models.py` (Review model)
  - Add `time_taken` IntegerField (default=0)
  - Run migrations: `makemigrations` + `migrate`
  - Effort: S

- [ ] **2.5** Update Card Review Endpoint to Store Time
  - File: `flashcards/views.py` (card_review function)
  - Accept `time_taken` from request
  - Store in Review.objects.create()
  - Effort: S

### Phase 2 Acceptance Criteria
- [ ] Statistics page shows correct field values
- [ ] No `undefined` or `NaN` in stats display
- [ ] Recent activity chart displays real data
- [ ] Time tracking works in reviews

---

## Phase 3: UI Enhancements & Missing Features (Day 3)

**Goal**: Add missing UI elements and improve UX
**Duration**: 4-5 hours

### Tasks

- [ ] **3.1** Add Timer Display to Study Session
  - File: `templates/study.html` (after line 70)
  - Add timer element: `<span id="timer-text">Time: 0:00</span>`
  - Effort: S

- [ ] **3.2** Implement Timer Logic in TypeScript
  - File: `src/ts/study.ts`
  - Add timer tracking to StudyController class
  - Update every second with `setInterval()`
  - Clean up on session end
  - Effort: M

- [ ] **3.3** Add Average Quality to Completion Screen
  - File: `templates/study.html` (completion screen, ~line 156-182)
  - Add element: `<p>Average Quality: <strong id="average-quality">0.0</strong> / 5.0</p>`
  - Effort: S

- [ ] **3.4** Calculate and Display Average Quality
  - File: `src/ts/study.ts` (completion logic)
  - Track ratings array in StudyController
  - Calculate average on completion
  - Display in completion screen
  - Effort: S

- [ ] **3.5** Fix Card/Deck Count Pluralization
  - Files: `src/ts/decks.ts`, `cards.ts`
  - Add `pluralize()` helper function
  - Apply to all counts: "1 card" not "1 cards"
  - Effort: S

- [ ] **3.6** Add Deck Edit Modal & Functionality
  - File: `templates/index.html`
  - Add edit button to deck cards
  - Add edit modal (similar to create modal)
  - Effort: M

- [ ] **3.7** Implement Deck Edit Logic
  - File: `src/ts/decks.ts`
  - Add `editDeck()` function
  - Load current data, show modal, save changes
  - Call `api.updateDeck()`
  - Effort: M

### Phase 3 Acceptance Criteria
- [ ] Timer displays and updates during study session
- [ ] Average quality shown in completion screen
- [ ] Pluralization correct ("1 card", "2 cards")
- [ ] Deck editing works end-to-end

---

## Phase 4: Update Verification Checklist & Documentation (Day 4)

**Goal**: Accurate, comprehensive testing documentation
**Duration**: 3-4 hours

### Tasks

- [ ] **4.1** Fix API Response Format Expectations
  - File: `docs/verification-checklist.md`
  - Update lines: 168, 202-205, 307-313, 366-368, 453-466, 519-540, 717-730
  - Show `{success: true, data: {...}}` structure everywhere
  - Effort: M

- [ ] **4.2** Document Study Session Auto-Start Behavior
  - File: `docs/verification-checklist.md` (line 428-474)
  - Update Phase 4.1 and 4.2
  - Remove "Start Study Session" button reference
  - Document auto-start on page load
  - Effort: S

- [ ] **4.3** Add TypeScript Compilation Verification Step
  - File: `docs/verification-checklist.md` (new Phase 1.0)
  - Add pre-test compilation check
  - Verify `npm run build` succeeds
  - Check `static/js/` files exist
  - Effort: S

- [ ] **4.4** Add Deck Update Tests
  - File: `docs/verification-checklist.md` (new Phase 2.6)
  - Add deck editing test section
  - Cover edit modal, update request, UI refresh
  - Effort: S

- [ ] **4.5** Add Edge Case Testing Section
  - File: `docs/verification-checklist.md` (new Phase 7)
  - Add empty input validation tests
  - Add XSS prevention tests
  - Add large dataset performance tests
  - Add network failure tests
  - Effort: M

- [ ] **4.6** Clarify Test Instructions
  - File: `docs/verification-checklist.md` (various)
  - Phase 4.3: Add focus requirement
  - Phase 4.7: Clarify date formats
  - Phase 4.8: Fix failed card behavior
  - Phase 5.2: Clarify study streak
  - Effort: S

- [ ] **4.7** Add Test Dependencies Documentation
  - File: `docs/verification-checklist.md` (top)
  - Add prerequisites section
  - Document phase order and dependencies
  - List critical prerequisites
  - Effort: S

- [ ] **4.8** Update Expected Behaviors
  - File: `docs/verification-checklist.md`
  - Fix all incorrect expectations found in analysis
  - Match implementation reality
  - Note known issues (grammar bugs, etc.)
  - Effort: M

### Phase 4 Acceptance Criteria
- [ ] Verification checklist matches implementation
- [ ] All API response examples correct
- [ ] Edge case testing section added
- [ ] No false test failures when following checklist

---

## Overall Success Criteria

- [ ] Can complete full user workflow without errors:
  - Register → Create Deck → Add Cards → Study → View Stats
- [ ] All 41 identified issues resolved
- [ ] Verification checklist can be followed successfully
- [ ] App is ready for automated test writing (RFC 0004)

---

## Testing Checkpoints

After each phase, verify:

### After Phase 1
- [ ] Run `npm run build` - no errors
- [ ] Open browser console - no errors
- [ ] Navigate to dashboard - decks load
- [ ] Create a deck - works without errors

### After Phase 2
- [ ] Navigate to stats page - no undefined values
- [ ] Check chart displays - shows data
- [ ] Complete a study session - time tracked

### After Phase 3
- [ ] Start study session - timer visible and running
- [ ] Complete session - quality average shown
- [ ] Check all counts - proper pluralization
- [ ] Edit a deck - modal works, saves correctly

### After Phase 4
- [ ] Read through entire checklist - makes sense
- [ ] Follow Phase 1 of checklist - no confusion
- [ ] Spot-check API response examples - accurate

---

## Quick Reference - Files Modified

### TypeScript (Compile after changes: `npm run build`)
- [ ] `src/ts/api.ts` - API client and types
- [ ] `src/ts/decks.ts` - Deck management
- [ ] `src/ts/cards.ts` - Card management
- [ ] `src/ts/study.ts` - Study session
- [ ] `src/ts/stats.ts` - Statistics

### Python (Migrate after model changes)
- [ ] `flashcards/utils.py` - Statistics field names
- [ ] `flashcards/models.py` - Add time_taken field
- [ ] `flashcards/views.py` - Store time in reviews

### Templates
- [ ] `templates/study.html` - Add timer and quality
- [ ] `templates/index.html` - Add deck edit modal

### Documentation
- [ ] `docs/verification-checklist.md` - Major updates

---

## Migration Commands

After modifying models (Task 2.4):

```bash
python manage.py makemigrations
python manage.py migrate
```

---

## Build Commands

After modifying TypeScript:

```bash
# One-time build
npm run build

# Watch mode (auto-recompile)
npm run watch
```

---

## Rollback Commands

If critical issues occur:

```bash
# Rollback TypeScript changes
git checkout -- src/ts/
npm run build

# Rollback Python changes
git checkout -- flashcards/utils.py flashcards/views.py

# Rollback database migration (if needed)
python manage.py migrate flashcards <previous_migration_number>
```

---

**Last Updated**: 2025-01-29
**Status**: Ready for Use
**Next Action**: Begin Phase 1, Task 1.1
