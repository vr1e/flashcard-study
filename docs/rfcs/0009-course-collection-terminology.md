# RFC 0009: Course/Collection Terminology

**Status**: Proposed
**Created**: 2025-11-02
**Last Updated**: 2025-11-03

---

## What are we building?

A dual-mode UX that distinguishes between shared content ("Courses" - created with your learning buddy) and personal content ("Collections" - private study materials). The interface progressively reveals collaboration features after users form a partnership, with clear visual separation using color coding and dedicated dashboard sections.

## Why?

The partnership system transforms the app from a personal flashcard tool to a collaborative couples learning platform (especially for language exchange). The current "Deck" terminology creates confusion:
- Users can't distinguish between private and shared content
- No clear mental model for "learning together" vs "studying alone"
- Generic UI doesn't communicate the collaborative value proposition
- New users don't understand the partnership use case

Without distinct terminology and visual design, users won't grasp the core collaborative features that make this app unique for couples.

## How?

### Terminology Changes

| Old | New (Shared) | New (Personal) |
|-----|--------------|----------------|
| Deck | Course | Collection |
| Partnership | Learning Buddy | - |

### Dual-Mode Dashboard

**Before partnership**: Single section showing "My Collections" + CTA to invite buddy

**After partnership**: Two side-by-side sections:
- 🤝 **Learning Buddy** (orange/warm colors) - Shared courses, activity feed
- 📚 **Personal Study** (blue/cool colors) - Private collections

**Progressive disclosure**: Collaboration features only appear after forming partnership.

### Code Example

```python
# View update to include type information
def list_decks(request):
    from django.db.models import Q

    user_decks = Deck.objects.filter(user=request.user)
    partnership = Partnership.objects.filter(
        Q(user_a=request.user) | Q(user_b=request.user),
        is_active=True
    ).first()

    courses = []
    collections = []

    for deck in user_decks:
        # Check if deck is shared via active partnership
        is_shared = partnership and partnership.is_active and deck in partnership.decks.all()

        deck_data = {
            'id': deck.id,
            'name': deck.name,
            'type': 'course' if is_shared else 'collection',
            'is_shared': is_shared
        }

        if is_shared:
            courses.append(deck_data)
        else:
            collections.append(deck_data)

    return JsonResponse({
        'success': True,
        'data': {
            'courses': courses,
            'collections': collections
        }
    })
```

### Data/API Changes

**Database**: No changes - existing schema supports this via `partnerships.decks` M2M relationship

**API**: Updated responses only

- `GET /api/decks/` - Returns `{courses: [...], collections: [...]}`
- Each deck object includes: `type: "course"|"collection"` and `is_shared: boolean`
- `GET /api/stats/?filter=all|courses|collections` - Stats filtering support

**Frontend**:
- TypeScript: Update `Deck` interface, refactor dashboard rendering (dual-mode)
- Templates: New `welcome.html`, redesigned `index.html`, terminology updates
- CSS: Color-coded sections, responsive side-by-side layout

## Notes

**UX Decisions** (from user feedback):
- "Collection" for personal content (consistency with "Course")
- Buddy activity only in buddy section (no nav notifications)
- Combined stats view with filter tabs
- Vision-first onboarding (explain collaborative use case)

**Implementation**:
- Estimated effort: 6-8 hours
- Zero breaking changes (backward compatible)
- All existing URLs continue working
- Internal code keeps "deck" variable names (display-only change)

**Tradeoffs**:
- More complex UI (dual-mode) vs clearer mental model → chose clarity
- "Course" implies structure vs "Deck" familiar → chose collaborative framing
- Progressive disclosure vs always-visible buddy section → chose gradual reveal

**Future Considerations**:
- Buddy notifications for activity ("Alex added 5 cards")
- Onboarding tooltips for first course creation
- Choosing course ownership when dissolving partnership

**Testing Priority**:
- New user onboarding flows (both paths)
- Partnership connection/dissolution
- Mobile responsive layout (stack sections vertically)
- Terminology consistency audit across all templates
