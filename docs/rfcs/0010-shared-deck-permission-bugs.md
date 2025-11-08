# RFC 0010: Shared Deck Permission Bugs

**Status**: ✅ Implemented
**Date**: 2025-01-04
**Fixed**: 2025-01-08
**Branch**: `fix/rfc-0010-permission-and-security-bugs`

## Bug List

### 1. `deck_stats` excludes partners (HIGH)

**Location**: `flashcards/views.py:852`
**Issue**: Uses `user=request.user` filter instead of permission checking
**Impact**: Partners cannot view statistics for shared decks (404 error)
**Fix**: Replace filter with `can_view()` permission check (return 403 if not authorized)

### 2. Global stats exclude shared decks (HIGH)

**Location**: `flashcards/utils.py:108-109`
**Issue**: `get_study_stats()` only counts cards from owned decks
**Impact**: User statistics don't include shared deck cards
**Fix**: Include cards from partnership decks in queries

### 3. Fragile partner identification (LOW)

**Location**: `flashcards/views.py:506`
**Issue**: Assumes `deck.user` is always a partnership member
**Impact**: Could return wrong partner if ownership changes
**Fix**: Get both partners directly from partnership, not via deck.user assumption

### 4. `user` vs `created_by` confusion (MEDIUM)

**Location**: `flashcards/models.py:27-35`
**Issue**: Both fields set to same value, unclear semantics
**Impact**: Code duplication, confusion about intended use
**Fix**: Document distinction or remove `created_by` field

### 5. Generic partnership error messages (LOW)

**Location**: `templates/partnership.html:172, 187, 154`
**Issue**: Error handlers don't parse API error codes, show generic messages
**Impact**: Users don't know why their action failed (expired vs invalid vs already partnered)
**Fix**: Parse `error.code` from API response and map to specific user-friendly messages (INVALID_CODE, EXPIRED, SELF_INVITATION, ALREADY_PARTNERED)

### 6. Inline onclick handlers with string params (MEDIUM)

**Location**: `src/ts/cards.ts:111, 114`
**Issue**: Uses onclick attributes with concatenated strings, violates CSP
**Impact**:
- Blocked by Content Security Policy (unsafe-inline)
- XSS risk if escaping fails
- Harder to test and maintain
**Fix**: Replace with data attributes + programmatic event listeners (CSP compliant)

### 7. Silent fallback masks data integrity issues (LOW)

**Location**: `src/ts/study.ts:117`
**Issue**: Missing `card.direction` silently defaults to 'A_TO_B'
**Impact**:
- Hides bugs where UserCardProgress wasn't created properly
- Makes debugging harder
- Could save reviews with wrong direction
**Fix**: Log console warning when fallback is used

**Root cause**: If `card.direction` is undefined, likely means UserCardProgress records weren't created when the card was added (bug in `card_create` view at views.py:509-530).

## Notes

- All other views (deck_detail, card_list, study_session, etc.) correctly use `can_view()`/`can_edit()`
- Only `deck_stats` has the permission bug
- API returns error codes: `INVALID_CODE`, `EXPIRED`, `SELF_INVITATION`, `ALREADY_PARTNERED`, `NO_PARTNERSHIP`

---

## Implementation Summary (2025-01-08)

### All 7 Bugs Fixed ✅

**Commits**:
- `7335ca9` - "Fix 7 bugs from RFC 0010: permissions, security, and UX improvements"
- `08687f5` - "improve cards.ts security add migrations"

### Changes by Bug

1. **✅ deck_stats permissions** - Fixed to use `can_view()` permission check
2. **✅ Global stats** - Now includes cards from partnership decks
3. **✅ Partner identification** - Improved to get both partners from partnership directly
4. **✅ user vs created_by** - Documented and clarified semantics
5. **✅ Generic error messages** - Added specific error code parsing in frontend
6. **✅ Inline onclick handlers** - Replaced with data attributes and event listeners (CSP compliant)
7. **✅ Silent fallback** - Added console warnings when card.direction is missing

### Security Improvements

- **CSP Compliance**: Removed all inline `onclick` handlers
- **XSS Prevention**: Using data attributes instead of string concatenation
- **Better Error Messages**: Users now see specific error codes for partnership failures

### Status

Ready for PR to merge into `main`
