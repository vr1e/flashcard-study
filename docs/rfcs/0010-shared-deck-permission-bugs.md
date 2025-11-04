# RFC 0010: Shared Deck Permission Bugs

**Status**: Identified
**Date**: 2025-01-04

## Bug List

### 1. `deck_stats` excludes partners (HIGH)

**Location**: `flashcards/views.py:852`
**Issue**: Uses `user=request.user` filter instead of permission checking
**Impact**: Partners cannot view statistics for shared decks (404 error)
**Fix**: Replace filter with `can_view()` permission check

```python
# Current (WRONG)
deck = Deck.objects.get(id=deck_id, user=request.user)

# Fixed
deck = Deck.objects.get(id=deck_id)
if not deck.can_view(request.user):
    return JsonResponse({...}, status=403)
```

### 2. Global stats exclude shared decks (HIGH)

**Location**: `flashcards/utils.py:108-109`
**Issue**: `get_study_stats()` only counts cards from owned decks
**Impact**: User statistics don't include shared deck cards
**Fix**: Include cards from partnership decks in queries

### 3. Fragile partner identification (LOW)

**Location**: `flashcards/views.py:506`
**Issue**: Assumes `deck.user` is always a partnership member
**Impact**: Could return wrong partner if ownership changes
**Fix**: Get both partners directly from partnership, not via deck.user

```python
# Current (FRAGILE)
partner = partnership.user_b if partnership.user_a == deck.user else partnership.user_a

# Better
users_with_access = [partnership.user_a, partnership.user_b] if partnership else [deck.user]
```

### 4. `user` vs `created_by` confusion (MEDIUM)

**Location**: `flashcards/models.py:27-35`
**Issue**: Both fields set to same value, unclear semantics
**Impact**: Code duplication, confusion about intended use
**Fix**: Document distinction or remove `created_by` field

### 5. Generic partnership error messages (LOW)

**Location**: `templates/partnership.html:172, 187, 154`
**Issue**: Error handlers don't parse API error codes, show generic messages
**Impact**: Users don't know why their action failed (expired vs invalid vs already partnered)
**Fix**: Parse `error.code` from API response and show specific messages

```javascript
// Current (GENERIC)
alert('Failed to accept invitation. The code may be invalid or expired.');

// Fixed
catch (error) {
    const messages = {
        'INVALID_CODE': 'This invitation code was not found.',
        'EXPIRED': 'This invitation has expired.',
        'SELF_INVITATION': 'You cannot accept your own invitation.',
        'ALREADY_PARTNERED': 'You already have an active partnership.'
    };
    alert(messages[error.code] || 'Failed to accept invitation.');
}
```

### 6. Inline onclick handlers with string params (MEDIUM)

**Location**: `src/ts/cards.ts:111, 114`
**Issue**: Uses onclick attributes with concatenated strings, violates CSP
**Impact**:
- Blocked by Content Security Policy (unsafe-inline)
- XSS risk if escaping fails
- Harder to test and maintain
**Fix**: Use data attributes + programmatic event listeners

```javascript
// Current (UNSAFE)
<button onclick="editCard(${card.id}, '${escapedLangA}', '${escapedLangB}', '${escapedContext}')">

// Fixed
<button class="edit-card-btn" data-card-id="${card.id}"
        data-lang-a="${escapedLangA}" data-lang-b="${escapedLangB}"
        data-context="${escapedContext}">

// Then attach listeners after rendering:
document.querySelectorAll('.edit-card-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        editCard(
            parseInt(btn.dataset.cardId),
            btn.dataset.langA,
            btn.dataset.langB,
            btn.dataset.context
        );
    });
});
```

### 7. Silent fallback masks data integrity issues (LOW)

**Location**: `src/ts/study.ts:117`
**Issue**: Missing `card.direction` silently defaults to 'A_TO_B'
**Impact**:
- Hides bugs where UserCardProgress wasn't created properly
- Makes debugging harder
- Could save reviews with wrong direction
**Fix**: Log warning when fallback is used

```javascript
// Current (SILENT)
direction: card.direction || 'A_TO_B', // Default to A_TO_B for backward compatibility

// Fixed
direction: (() => {
    if (!card.direction) {
        console.warn(`Card ${card.id} missing direction, defaulting to A_TO_B`);
    }
    return card.direction || 'A_TO_B';
})()
```

**Root cause**: If `card.direction` is undefined, likely means UserCardProgress records weren't created when the card was added (bug in `card_create` view at views.py:509-530).

## Notes

- All other views (deck_detail, card_list, study_session, etc.) correctly use `can_view()`/`can_edit()`
- Only `deck_stats` has the permission bug
- API returns error codes: `INVALID_CODE`, `EXPIRED`, `SELF_INVITATION`, `ALREADY_PARTNERED`, `NO_PARTNERSHIP`
