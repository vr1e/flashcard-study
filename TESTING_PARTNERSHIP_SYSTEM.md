# Partnership System - Browser Testing Guide

## Overview
This guide will help you test the partnership system implementation (RFC 0007) in your browser.

## What's Been Implemented

✅ **Backend Models**
- Partnership model (links two users)
- PartnershipInvitation model (6-character codes, 7-day expiry)
- Updated Deck model with `created_by` and permission methods

✅ **API Endpoints**
- `POST /api/partnership/invite/` - Create invitation
- `POST /api/partnership/accept/` - Accept invitation
- `GET /api/partnership/` - Get partnership info
- `DELETE /api/partnership/dissolve/` - Dissolve partnership

✅ **Updated Deck APIs**
- `POST /api/decks/create/` - Now supports `shared: true` flag
- `GET /api/decks/` - Returns `{personal: [], shared: []}` structure
- All deck endpoints now use `can_view()` and `can_edit()` permissions

✅ **Test Coverage**
- All models tested ✓
- All API endpoints tested ✓
- Permission system tested ✓

---

## Browser Testing Steps

### Prerequisites
1. Server is running: `http://localhost:8000`
2. You have two user accounts (we created `testuser1` and `testuser2` in our tests)

### Test 1: Check Partnership Status

**Login as any user** and open browser console (F12):

```javascript
// Check current partnership
fetch('/api/partnership/')
  .then(r => r.json())
  .then(d => console.log('Partnership:', d));
```

**Expected:** Should see partnership between testuser1 and testuser2 (from our test script)

---

### Test 2: Check Deck List Structure

```javascript
// Get decks (should return personal and shared separately)
fetch('/api/decks/')
  .then(r => r.json())
  .then(d => console.log('Decks:', d));
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "personal": [...],
    "shared": [...]
  }
}
```

---

### Test 3: Create a Shared Deck

```javascript
// Create shared deck
fetch('/api/decks/create/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
  },
  body: JSON.stringify({
    title: 'Serbian-German Learning',
    description: 'Learning together!',
    shared: true  // <-- This makes it shared
  })
})
  .then(r => r.json())
  .then(d => console.log('Created deck:', d));
```

**Expected:** Deck created and linked to partnership

---

### Test 4: Test Partnership Invitation Flow

**Step 1: Create Invitation (as testuser1)**
```javascript
fetch('/api/partnership/invite/', {
  method: 'POST',
  headers: {
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
  }
})
  .then(r => r.json())
  .then(d => {
    console.log('Invitation code:', d.data.code);
    // Copy this code!
  });
```

**Step 2: Accept Invitation (login as different user in incognito window)**
```javascript
fetch('/api/partnership/accept/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
  },
  body: JSON.stringify({
    code: 'ABC123'  // <-- Use the code from Step 1
  })
})
  .then(r => r.json())
  .then(d => console.log('Partnership created:', d));
```

---

### Test 5: Test Permissions

**Create a personal deck (without shared flag):**
```javascript
fetch('/api/decks/create/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
  },
  body: JSON.stringify({
    title: 'My Private Deck',
    description: 'Only I can see this',
    shared: false
  })
})
  .then(r => r.json())
  .then(d => console.log('Personal deck:', d));
```

**Then login as partner and try to access it:**
- They should NOT be able to view/edit personal decks
- They SHOULD be able to view/edit shared decks

---

### Test 6: Dissolve Partnership

```javascript
fetch('/api/partnership/dissolve/', {
  method: 'DELETE',
  headers: {
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
  }
})
  .then(r => r.json())
  .then(d => console.log('Dissolved:', d));
```

**Expected:** Partnership dissolved, shared decks become personal to creator

---

## Test Users Available

From our test script, you can use:
- **Username:** `testuser1` / **Password:** `password123`
- **Username:** `testuser2` / **Password:** `password123`

These users already have a partnership and test decks set up!

---

## Expected Behavior

### ✅ What Should Work

1. **Partnership Creation**
   - Generate invitation codes (6 characters, uppercase)
   - Codes expire after 7 days
   - Can't accept your own invitation
   - Can only have one active partnership

2. **Shared Decks**
   - Both partners can create shared decks
   - Both partners can edit/delete shared decks
   - Both partners can add cards to shared decks
   - Shared decks show creator info

3. **Personal Decks**
   - Only owner can view/edit personal decks
   - Partners cannot access each other's personal decks
   - Personal decks separate from shared decks in listings

4. **Permissions**
   - `can_view()` checks if user has read access
   - `can_edit()` checks if user has write access
   - Works for both page views and API endpoints

### ❌ What Should Fail

1. Creating shared deck without partnership → Error: `NO_PARTNERSHIP`
2. Accepting invalid/expired code → Error: `INVALID_CODE` or `EXPIRED`
3. Creating second partnership → Error: `ALREADY_PARTNERED`
4. Accepting own invitation → Error: `SELF_INVITATION`
5. Editing partner's personal deck → Error: `FORBIDDEN`

---

## What's NOT Yet Implemented

⚠️ **Frontend UI** - There's no partnership management page yet
- Need to create `/partnership/` page
- Need to update TypeScript API client (`src/ts/api.ts`)
- Need to update deck dashboard to show personal/shared sections

This means:
- ✅ All backend functionality works (tested)
- ✅ All API endpoints work (tested)
- ❌ No UI buttons/forms yet (need to use browser console for now)

---

## Next Steps

To complete RFC 0007 implementation:

1. **Create Partnership Page** (`templates/partnership.html`)
   - Show current partnership
   - Button to generate invitation
   - Input to accept invitation
   - Button to dissolve partnership

2. **Update TypeScript** (`src/ts/api.ts`, `src/ts/partnership.ts`)
   - Add partnership API methods
   - Create partnership management controller

3. **Update Dashboard** (`templates/index.html`, `src/ts/decks.ts`)
   - Show "Personal Decks" section
   - Show "Shared Decks" section
   - Add "Create Shared Deck" button
   - Show partnership status

4. **Update Deck Creation Form**
   - Add checkbox: "Share with partner"
   - Only show if user has active partnership

---

## Quick Test Command

Run the automated test:
```bash
source .venv/bin/activate
python test_partnership_flow.py
```

Should see: `✓ All tests passed!`

---

## Troubleshooting

**Error: "NO_PARTNERSHIP" when creating shared deck**
- Make sure you have an active partnership first
- Check: `fetch('/api/partnership/').then(r => r.json()).then(console.log)`

**Error: "FORBIDDEN" when accessing deck**
- Check deck permissions
- Personal decks only accessible to creator
- Shared decks accessible to both partners

**Error: "ALREADY_PARTNERED"**
- User already has an active partnership
- Dissolve existing partnership first

---

## Summary

🎉 **RFC 0007 Backend Implementation: COMPLETE**

All core functionality is working:
- ✅ Partnership model
- ✅ Invitation system
- ✅ Shared deck creation
- ✅ Permission system
- ✅ API endpoints
- ✅ Tests passing

Next: Frontend UI for user-friendly interactions!
