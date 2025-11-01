# Manual Verification Checklist

**Date Created**: 2025-01-29
**Purpose**: Verify all implemented features work correctly before writing automated tests
**Estimated Time**: ~65 minutes

---

## Current Implementation Status

Based on comprehensive code audit:

✅ **Complete:**

- 16 API endpoints (5 deck, 4 card, 2 study, 2 stats, 3 auth)
- 4 models with helper methods
- SM-2 spaced repetition algorithm
- Complete TypeScript frontend
- All templates and routing

❓ **Needs Verification:**

- End-to-end user workflows
- SM-2 algorithm correctness with real data
- API response/request format compatibility
- Error handling edge cases

---

## Pre-Test Setup

### Environment Check

```bash
# 1. Activate virtual environment
source .venv/bin/activate

# 2. Verify dependencies installed
pip list | grep -E "Django|psycopg"

# 3. Check database migrations
python manage.py showmigrations

# 4. Start development server
python manage.py runserver
```

### Test User Credentials

**Existing user:**

- Username: `test`
- Password: `test123`

**If needed, create new:**

```bash
python manage.py createsuperuser
```

### Testing Tools

- Browser: Chrome/Firefox with DevTools open (F12)
- Check Network tab for API requests
- Check Console for JavaScript errors

---

## Phase 1: Authentication & Setup (5 min)

### 1.1 Login Test

**URL**: `http://localhost:8000/login/`

**Steps:**

1. Navigate to login page
2. Enter username: `test`
3. Enter password: `test123`
4. Click "Login"

**Expected:**

- ✅ Redirects to dashboard (`/`)
- ✅ Navbar shows username "test"
- ✅ "Logout" link visible
- ✅ No console errors

**Issues Found:**

```
[Record any issues here]
```

---

### 1.2 Registration Test

**URL**: `http://localhost:8000/register/`

**Steps:**

1. Click "Register" link or navigate directly
2. Enter username: `testuser2`
3. Enter password: `test456`
4. Enter confirm password: `test456`
5. Click "Register"

**Expected:**

- ✅ Account created successfully
- ✅ Automatically logged in
- ✅ Redirects to empty dashboard
- ✅ Navbar shows "testuser2"

**Test Invalid Cases:**

- ❌ Empty username → Shows error "Username and password are required"
- ❌ Passwords don't match → Shows error "Passwords do not match"
- ❌ Username "test" (exists) → Shows error "Username already exists"

**Issues Found:**

```
[Record any issues here]
```

---

### 1.3 Logout Test

**Steps:**

1. Click "Logout" in navbar

**Expected:**

- ✅ Redirects to login page
- ✅ Attempting to access `/` redirects to `/login/?next=/`
- ✅ Session cleared

**Issues Found:**

```
[Record any issues here]
```

---

## Phase 2: Deck Management (10 min)

**Log back in as `test` user for remaining tests**

### 2.1 View Dashboard

**URL**: `http://localhost:8000/`

**Expected:**

- ✅ Dashboard page loads
- ✅ "Create New Deck" button visible
- ✅ Empty state message OR existing decks displayed
- ✅ No JavaScript errors in console

**Check Network Tab:**

- ✅ GET `/api/decks/` request made on page load
- ✅ Response format: `{success: true, data: [...]}`

**Issues Found:**

```
[Record any issues here]
```

---

### 2.2 Create Deck

**Steps:**

1. Click "Create New Deck" button
2. Modal opens
3. Fill in:
   - Title: "Spanish Vocabulary"
   - Description: "Common Spanish words and phrases"
4. Click "Create Deck"

**Expected:**

- ✅ Modal closes automatically
- ✅ New deck appears in dashboard grid
- ✅ Deck card shows:
  - Title: "Spanish Vocabulary"
  - Description: "Common Spanish words and phrases"
  - Badge: "0 cards"
  - Badge: "0 due"
- ✅ No page refresh required

**Check Network Tab:**

- ✅ POST `/api/decks/create/` request
- ✅ Status: 201 Created
- ✅ Response includes deck with `id`, `title`, `description`, timestamps

**Issues Found:**

```
[Record any issues here]
```

---

### 2.3 View Deck Detail

**Steps:**

1. Click on "Spanish Vocabulary" deck card
2. Or click "View Cards" button

**Expected:**

- ✅ Navigates to `/decks/<id>/`
- ✅ Page shows deck title and description
- ✅ Shows empty cards list or "No cards yet" message
- ✅ "Add Card" button visible
- ✅ Breadcrumb navigation works
- ✅ "Study" button visible (may be disabled if no cards)

**Issues Found:**

```
[Record any issues here]
```

---

### 2.4 Create Additional Decks

**Create 2 more decks:**

1. "French Numbers" - "Numbers 1-100 in French"
2. "German Greetings" - "Common German greetings"

**Expected:**

- ✅ All 3 decks appear on dashboard
- ✅ Can navigate to each deck detail page

**Issues Found:**

```
[Record any issues here]
```

---

### 2.5 Delete Deck

**Steps:**

1. Return to dashboard (`/`)
2. Click delete button (trash icon) on "German Greetings"
3. Confirm deletion in dialog

**Expected:**

- ✅ Confirmation dialog appears with deck name
- ✅ After confirmation, deck disappears from dashboard
- ✅ No page refresh required
- ✅ Network shows DELETE `/api/decks/<id>/delete/` request

**Issues Found:**

```
[Record any issues here]
```

---

## Phase 3: Card Management (15 min)

**Use "Spanish Vocabulary" deck for these tests**

### 3.1 Create First Card

**Steps:**

1. Navigate to "Spanish Vocabulary" deck detail page
2. Click "Add Card" button
3. Fill in:
   - Front: "Hola"
   - Back: "Hello"
4. Click "Create Card"

**Expected:**

- ✅ Modal closes
- ✅ Card appears in cards list
- ✅ Card shows front text "Hola"
- ✅ Edit and delete buttons visible
- ✅ Deck header updates to "1 card, 1 due"
- ✅ No page refresh

**Check Network Tab:**

- ✅ POST `/api/decks/<id>/cards/create/`
- ✅ Status: 201 Created
- ✅ Response includes card with SM-2 fields:
  - `ease_factor: 2.5`
  - `interval: 1`
  - `repetitions: 0`
  - `next_review: <today's date>`

**Issues Found:**

```
[Record any issues here]
```

---

### 3.2 Create Multiple Cards

**Create 4 more cards:**

1. "Buenos días" / "Good morning"
2. "Gracias" / "Thank you"
3. "Por favor" / "Please"
4. "Adiós" / "Goodbye"

**Expected:**

- ✅ All 5 cards display in cards list
- ✅ Deck header shows "5 cards, 5 due"
- ✅ Cards ordered by creation date

**Issues Found:**

```
[Record any issues here]
```

---

### 3.3 Edit Card

**Steps:**

1. Click edit button (pencil icon) on first card "Hola"
2. Modal opens with existing data
3. Change:
   - Front: "¡Hola!" (add exclamation marks)
4. Click "Update Card"

**Expected:**

- ✅ Modal closes
- ✅ Card updates immediately
- ✅ Front now shows "¡Hola!"
- ✅ Back still shows "Hello"
- ✅ No page refresh

**Check Network Tab:**

- ✅ PUT `/api/cards/<id>/update/`
- ✅ Status: 200 OK
- ✅ Response includes updated card data

**Issues Found:**

```
[Record any issues here]
```

---

### 3.4 Delete Card

**Steps:**

1. Click delete button (trash icon) on "Adiós" card
2. Confirm deletion

**Expected:**

- ✅ Confirmation dialog appears
- ✅ Card removed from list
- ✅ Deck header updates to "4 cards, 4 due"
- ✅ Network shows DELETE `/api/cards/<id>/delete/`

**Issues Found:**

```
[Record any issues here]
```

---

### 3.5 View Card Details

**Check each card's display:**

- ✅ Front text displayed correctly
- ✅ Created date shown (e.g., "2 minutes ago")
- ✅ Next review shows "Today" or "Overdue"
- ✅ Edit/delete buttons functional

**Issues Found:**

```
[Record any issues here]
```

---

## Phase 4: Study Session Testing ⚠️ CRITICAL (20 min)

**This is the core functionality - test thoroughly!**

### 4.1 Navigate to Study Page

**Steps:**

1. From "Spanish Vocabulary" deck detail page
2. Click "Study" button
3. Or navigate directly to `/decks/<id>/study/`

**Expected:**

- ✅ Study page loads
- ✅ Shows deck title
- ✅ "Start Study Session" button visible
- ✅ Shows number of cards due (should be 4)

**Issues Found:**

```
[Record any issues here]
```

---

### 4.2 Start Study Session

**Steps:**

1. Click "Start Study Session"

**Expected:**

- ✅ Button disappears
- ✅ First card appears showing ONLY the front
- ✅ Back is hidden
- ✅ "Show Answer" button visible
- ✅ Rating buttons (0-5) are disabled/hidden
- ✅ Progress counter shows "1 / 4"
- ✅ Timer starts (shows elapsed time)

**Check Network Tab:**

- ✅ POST `/api/decks/<id>/study/`
- ✅ Response includes:
  - `session_id: <number>`
  - `cards: [{id, front, back}, ...]`
- ✅ JavaScript console shows StudyController initialized

**Issues Found:**

```
[Record any issues here]
```

---

### 4.3 Flip Card (Test Keyboard Shortcut)

**Steps:**

1. Press **Space bar**

**Expected:**

- ✅ Card flips to show back
- ✅ Both front and back now visible
- ✅ "Show Answer" button changes to "Next Card"
- ✅ Rating buttons (0-5) become enabled/visible
- ✅ Each button shows label (e.g., "4: Correct, with hesitation")

**Alternative Test:**

- Click "Show Answer" button instead of Space

**Issues Found:**

```
[Record any issues here]
```

---

### 4.4 Submit Rating: Quality 4

**Steps:**

1. Click rating button "4" (or press "4" key)
2. Note the card front/back for verification

**Expected:**

- ✅ Rating submitted immediately
- ✅ Next card appears (progress now "2 / 4")
- ✅ Next card shows only front (not flipped)
- ✅ Timer continues
- ✅ No error messages

**Check Network Tab:**

- ✅ POST `/api/cards/<id>/review/`
- ✅ Request body includes:
  ```json
  {
    "quality": 4,
    "session_id": <session_id>,
    "time_taken": <seconds>
  }
  ```
- ✅ Status: 200 OK
- ✅ Response includes updated card:
  ```json
  {
  	"success": true,
  	"data": {
  		"ease_factor": 2.5, // slightly adjusted from 2.5
  		"interval": 1, // first success = 1 day
  		"repetitions": 1, // incremented
  		"next_review": "<tomorrow's ISO date>"
  	}
  }
  ```

**Verify SM-2 Algorithm:**

- ❗ First successful review (repetitions 0→1)
- ❗ Quality 4 (correct with hesitation)
- ❗ Expected: interval=1, repetitions=1
- ❗ ease_factor should be ~2.5 (slight adjustment)

**Issues Found:**

```
[Record any issues here]
```

---

### 4.5 Test Different Quality Ratings

**Review remaining 3 cards with different ratings:**

**Card 2: Quality 5 (Perfect response)**

- Press "5" key or click button
- Expected interval: 1 day (still first success)
- Expected repetitions: 1
- Expected ease_factor: increases slightly from 2.5

**Card 3: Quality 2 (Failed - incorrect but familiar)**

- Press "2" key or click button
- ❗ **CRITICAL CHECK**: Failed card behavior
- Expected repetitions: **0** (reset)
- Expected interval: **1** (reset)
- Expected next_review: tomorrow (card should be due again)

**Card 4: Quality 3 (Correct but difficult)**

- Press "3" key or click button
- Expected interval: 1 day
- Expected repetitions: 1
- Expected ease_factor: slight decrease from 2.5

**Issues Found:**

```
[Record any issues here]
```

---

### 4.6 Session Completion

**Expected after last card:**

- ✅ Completion screen appears
- ✅ Shows session summary:
  - Number of cards studied: 4
  - Time taken: <minutes>
  - Average quality or performance message
- ✅ "Return to Deck" button visible
- ✅ Session recorded in database (check in Django admin or stats)

**Check Network Tab:**

- ✅ All 4 review POST requests succeeded
- ✅ Session data tracked correctly

**Issues Found:**

```
[Record any issues here]
```

---

### 4.7 Verify Card States After Study

**Steps:**

1. Return to deck detail page
2. Check card list

**Expected:**

- ✅ Deck header shows "4 cards, 1 due" (only the failed card)
- ✅ Cards show updated "Next Review" dates:
  - 3 cards: "Tomorrow" or "1 day"
  - 1 card (failed): "Today" or "Overdue"
- ✅ Failed card (quality 2) still marked as due

**Issues Found:**

```
[Record any issues here]
```

---

### 4.8 Test Re-Study Immediately

**Steps:**

1. Click "Study" button again
2. Start new session

**Expected:**

- ✅ Shows only 1 card (the failed one from quality 2)
- ✅ Or shows "No cards due for review" if algorithm marked it for tomorrow
- ✅ Session only includes due cards

**Issues Found:**

```
[Record any issues here]
```

---

### 4.9 Test Keyboard Shortcuts

**During a study session, test:**

- ✅ **Space**: Flip card
- ✅ **0-5 keys**: Submit ratings (only works after flip)
- ✅ **Escape**: Exit study (shows confirmation dialog)

**Issues Found:**

```
[Record any issues here]
```

---

### 4.10 Test Edge Case: No Due Cards

**Steps:**

1. Go to "French Numbers" deck (empty)
2. Click "Study"

**Expected:**

- ✅ Shows message "No cards due for review"
- ✅ Or shows "No cards in this deck yet"
- ✅ Provides link back to deck or to add cards

**Issues Found:**

```
[Record any issues here]
```

---

## Phase 5: Statistics Testing (10 min)

### 5.1 Navigate to Statistics Page

**URL**: `http://localhost:8000/stats/`

**Steps:**

1. Click "Statistics" in navbar
2. Or navigate directly

**Expected:**

- ✅ Statistics page loads without errors
- ✅ 4 charts visible (even if showing placeholder data)
- ✅ Summary cards at top show numbers

**Check Network Tab:**

- ✅ GET `/api/stats/` request made
- ✅ Response includes statistics object:
  ```json
  {
    "success": true,
    "data": {
      "total_reviews": <number>,
      "total_cards": <number>,
      "average_quality": <float>,
      "cards_due_today": <number>,
      "study_streak": <number>,
      "decks_count": <number>
    }
  }
  ```

**Issues Found:**

```
[Record any issues here]
```

---

### 5.2 Verify Summary Cards

**Check displayed values:**

- ✅ **Total Decks**: Should match dashboard count (2-3 decks)
- ✅ **Total Cards**: Should show sum of all cards (4 in Spanish deck)
- ✅ **Cards Due Today**: Should show count of due cards
- ✅ **Study Streak**: Should show 1 (just studied today)

**Expected Calculation:**

- Study streak checks if reviewed in last 24 hours
- If no reviews yet, may show 0

**Issues Found:**

```
[Record any issues here]
```

---

### 5.3 Check Chart Display

**Known Limitation**: Some charts use placeholder data (documented in RFC 0004)

**Cards Due Chart (Line chart):**

- ⚠️ Currently shows placeholder data
- Future: Should show cards due per day

**Study Activity Chart (Bar chart):**

- ✅ Should show real data if `recent_activity` in API response
- Shows cards studied per day

**Deck Quality Chart (Bar chart):**

- ⚠️ Currently shows placeholder data
- Future: Should show average quality per deck

**Quality Distribution Chart (Doughnut):**

- ⚠️ Currently shows placeholder data
- Future: Should show count of ratings 0-5

**Issues Found:**

```
[Record any issues here]
```

---

### 5.4 Recent Sessions Table

**Expected:**

- ✅ Table shows recent study sessions
- ✅ Shows: Deck name, Date, Cards studied, Time taken
- ✅ Most recent session (Spanish Vocabulary) visible

**If table empty:**

- Check if `loadRecentSessions()` is receiving data
- May need backend implementation for session history

**Issues Found:**

```
[Record any issues here]
```

---

## Phase 6: Authorization & Security (5 min)

### 6.1 Test Cross-User Access

**Setup:**

1. Note the URL of "Spanish Vocabulary" deck: `/decks/<id>/`
2. Log out
3. Log in as `testuser2` (created earlier)

**Steps:**

1. Try to access Spanish Vocabulary deck URL directly
2. Try to access cards in that deck
3. Try to study that deck

**Expected:**

- ✅ GET `/decks/<id>/` → 404 Not Found (deck belongs to other user)
- ✅ GET `/api/decks/<id>/cards/` → 404 Not Found
- ✅ POST `/api/cards/<id>/review/` → 404 Not Found
- ✅ No data from other user visible
- ✅ Cannot manipulate other user's data

**Issues Found:**

```
[Record any issues here]
```

---

### 6.2 Test Unauthenticated Access

**Steps:**

1. Log out completely
2. Try to access:
   - `/` (dashboard)
   - `/decks/<id>/` (deck detail)
   - `/stats/` (statistics)
   - `/api/decks/` (API endpoint)

**Expected:**

- ✅ All page views redirect to `/login/?next=<path>`
- ✅ API endpoints return 302 redirect or 401/403 error
- ✅ No data exposed to anonymous users

**Issues Found:**

```
[Record any issues here]
```

---

## Critical Issues Log

**Record all critical issues that MUST be fixed:**

### 1. [Issue Title]

**Severity**: Critical / High / Medium / Low
**Component**: Backend / Frontend / Database
**Description**: [What went wrong]
**Steps to Reproduce**: [How to recreate]
**Expected Behavior**: [What should happen]
**Actual Behavior**: [What actually happened]
**Error Messages**: [Console/network errors]

---

## Summary Checklist

After completing all phases, verify:

### ✅ Authentication

- [ ] Can log in with test credentials
- [ ] Can register new user
- [ ] Can log out
- [ ] Authorization prevents cross-user access
- [ ] Unauthenticated users redirected to login

### ✅ Deck Management

- [ ] Can create deck
- [ ] Decks display on dashboard with correct counts
- [ ] Can view deck detail page
- [ ] Can delete deck
- [ ] Deck counts update in real-time

### ✅ Card Management

- [ ] Can create cards in deck
- [ ] Can edit card content
- [ ] Can delete cards
- [ ] Cards display with correct information
- [ ] Card counts update correctly

### ✅ Study Sessions (CRITICAL)

- [ ] Can start study session
- [ ] Cards display correctly (front only, then both sides)
- [ ] Can flip cards (button and Space key)
- [ ] Can submit ratings (0-5 via buttons and keys)
- [ ] SM-2 algorithm updates cards correctly:
  - [ ] Quality >= 3: Increments repetitions, sets interval
  - [ ] Quality < 3: Resets repetitions to 0, interval to 1
  - [ ] Ease factor adjusts based on quality
  - [ ] Next review date calculated correctly
- [ ] Progress tracking works (X / Y cards)
- [ ] Session completes and shows summary
- [ ] Keyboard shortcuts work (Space, 0-5, Escape)
- [ ] Only due cards appear in study session

### ✅ Statistics

- [ ] Statistics page loads
- [ ] Summary cards show correct data
- [ ] Charts display (acceptable if placeholder data)
- [ ] No console errors

### ✅ Data Integrity

- [ ] Database stores all data correctly
- [ ] Data persists across page refreshes
- [ ] No data loss during operations
- [ ] Timestamps accurate

### ✅ Error Handling

- [ ] Invalid inputs show appropriate errors
- [ ] 404 errors for non-existent resources
- [ ] User-friendly error messages
- [ ] No unhandled exceptions in console

---

## Next Steps

### If All Tests Pass ✅

→ **Proceed to RFC 0004 Implementation**

1. Set up test infrastructure (pytest, factories)
2. Write automated tests for verified functionality
3. Add additional edge case tests

### If Issues Found ❌

→ **Fix Critical Issues First**

1. Document all issues in this checklist
2. Prioritize by severity (Critical → High → Medium → Low)
3. Fix issues in order
4. Re-run verification for fixed areas
5. Once stable, proceed to automated tests

---

## Testing Notes

**Date Tested**: ********\_********
**Tester**: ********\_********
**Browser Used**: ********\_********
**Issues Found**: **\_** Critical, **\_** High, **\_** Medium, **\_** Low

**Overall Status**: ✅ Pass / ⚠️ Pass with Minor Issues / ❌ Fail

**Additional Notes**:

```
[Free-form notes about the testing session]
```
