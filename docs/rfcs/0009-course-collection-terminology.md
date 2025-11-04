# RFC 0009: Course/Collection Terminology

**Status**: Implemented (Minimal Viable Version)
**Created**: 2025-11-02
**Last Updated**: 2025-11-04
**Implemented**: 2025-11-04

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

---

## Implementation Plan

### Scope & Decisions

**Approach**: All-at-once implementation (8-12 hours)

**Included in this phase**:
- ✅ Backend API updates (`deck_list()` response structure)
- ✅ TypeScript interface updates and logic refactoring
- ✅ Dual-mode dashboard with progressive disclosure
- ✅ **NEW** `welcome.html` onboarding page for first-time users
- ✅ CSS color coding (orange for buddy, blue for personal)
- ✅ Terminology updates across all templates

**Deferred to Phase 2**:
- ⏭️ Stats filtering API (`/api/stats/?filter=all|courses|collections`)
- ⏭️ Activity feed UI (backend not yet implemented)

### Files to Modify

**Backend** (1 file):
- `flashcards/views.py` (lines 157-209) - Update `deck_list()` function

**TypeScript** (3 files):
- `src/ts/api.ts` (lines 27-40, 124-128) - Interface updates
- `src/ts/decks.ts` (lines 18-118) - Major logic refactor (~30 lines)
- `src/ts/partnership.ts` (line 78) - Minor text update

**Templates** (6 files):
- **NEW** `templates/welcome.html` - First-time user onboarding
- `templates/index.html` - **Major restructure** (~100 lines)
- `templates/base.html` (line 55) - Nav link text
- `templates/deck_detail.html` (lines 11-12) - Breadcrumb
- `templates/partnership.html` (lines 32, 44) - Text updates
- `templates/stats.html` (lines 20, 84) - Minor updates

**CSS** (1 file):
- `static/css/styles.css` - Add ~40 lines (color coding, dual-mode grid)

### Implementation Steps

1. **Create `welcome.html` onboarding template**
   - Vision-first messaging explaining collaborative learning
   - CTA to create first collection or invite buddy
   - Shown only on first visit (session flag)

2. **Update backend API response structure**
   - Modify `deck_list()` in `views.py` (lines 157-209)
   - Change response from `{personal: [], shared: []}` to `{courses: [], collections: []}`
   - Add `type` field to serialized deck objects

3. **Update TypeScript interfaces**
   - Add `type?: 'course' | 'collection'` to `Deck` interface in `api.ts`
   - Change `DecksResponse` from `{personal, shared}` to `{courses, collections}`

4. **Refactor `decks.ts` dashboard logic**
   - Update API response destructuring (lines 29-31)
   - Rename variables: `personalDecks` → `collections`, `sharedDecks` → `courses`
   - Update grid rendering logic and card creation
   - Update modal text and button labels

5. **Restructure `index.html` for dual-mode dashboard**
   - Implement progressive disclosure logic (check for partnership)
   - Before partnership: Single "My Collections" section + invite CTA
   - After partnership: Side-by-side buddy (left) + personal (right) sections
   - Update all modal text ("Create Deck" → "Create Course/Collection")
   - Update button text and help text

6. **Add CSS for color coding and responsive layout**
   - Add `.buddy-section` class with orange accent
   - Add `.personal-section` class with blue accent
   - Add `.dual-mode-dashboard` grid layout (2 columns on desktop, stack on mobile)
   - Add `.course-badge` and `.collection-badge` styles

7. **Update remaining templates for terminology consistency**
   - `base.html`: "Partnership" → "Learning Buddy" in nav
   - `deck_detail.html`: Dynamic breadcrumb ("Course" or "Collection")
   - `partnership.html`: "Shared Decks" → "Shared Courses"
   - `stats.html`: Update chart labels

8. **Compile TypeScript and test**
   - Run `npm run build` to compile TypeScript
   - Test both partnership states (before/after)
   - Verify mobile responsiveness
   - Check terminology consistency

### Detailed Changes by File

#### `flashcards/views.py` (lines 157-209)

```python
def serialize_deck(deck, is_shared=False):
    # ... existing fields ...
    return {
        'id': deck.id,
        'title': deck.title,
        'description': deck.description,
        'type': 'course' if is_shared else 'collection',  # NEW
        'is_shared': is_shared,
        # ... rest ...
    }

# In deck_list():
return JsonResponse({
    'success': True,
    'data': {
        'courses': [serialize_deck(d, is_shared=True) for d in shared],      # RENAMED
        'collections': [serialize_deck(d, is_shared=False) for d in personal] # RENAMED
    }
})
```

#### `src/ts/api.ts` (lines 27-40)

```typescript
interface Deck {
    id: number;
    title: string;
    description?: string;
    type?: 'course' | 'collection';  // NEW
    is_shared?: boolean;
    card_count?: number;
    cards_due?: number;
}

interface DecksResponse {
    courses: Deck[];      // Was: shared
    collections: Deck[];  // Was: personal
}
```

#### `src/ts/decks.ts` (major refactor)

**Lines 29-31**: Update variable names
```typescript
const collections = response.collections || [];  // Was: personalDecks
const courses = response.courses || [];          // Was: sharedDecks
```

**Lines 42-52**: Update grid rendering
```typescript
if (courses.length > 0) {  // Was: sharedDecks
    // Render buddy section with orange theme
}
if (collections.length > 0) {  // Was: personalDecks
    // Render personal section with blue theme
}
```

**Line 70**: Update deck card creation
```typescript
function createDeckCard(deck: any, isCourse: boolean = false): string {
    const badgeClass = isCourse ? 'course-badge' : 'collection-badge';
    const badgeText = isCourse ? 'Course' : 'Collection';
    // ... rest
}
```

#### `templates/welcome.html` (NEW FILE)

```html
{% extends 'base.html' %}
{% load static %}

{% block content %}
<div class="welcome-container">
    <div class="hero-section">
        <h1>Learn Languages Together</h1>
        <p>Create flashcard courses with your learning buddy and master languages through bidirectional practice.</p>
    </div>

    <div class="cta-section">
        <button class="btn btn-primary btn-lg">Create Your First Collection</button>
        <button class="btn btn-outline-primary btn-lg">Invite Your Learning Buddy</button>
    </div>

    <div class="features-section">
        <!-- Feature cards explaining collaborative learning -->
    </div>
</div>
{% endblock %}
```

#### `templates/index.html` (major restructure)

**Before partnership** (single-mode):
```html
<div class="single-mode-view" id="pre-partnership-view">
    <h1>My Collections</h1>
    <div class="invite-cta-banner">
        <p>💡 Want to learn together? <a href="{% url 'partnership' %}">Invite your learning buddy!</a></p>
    </div>
    <div id="collections-grid"><!-- Collections only --></div>
</div>
```

**After partnership** (dual-mode):
```html
<div class="dual-mode-dashboard" id="post-partnership-view">
    <!-- Left: Buddy Section (Orange) -->
    <section class="buddy-section">
        <h2>🤝 Learning Buddy</h2>
        <div class="partner-info"><!-- Partnership status --></div>
        <div id="courses-grid"><!-- Shared courses --></div>
        <button class="btn btn-warning">Create New Course</button>
    </section>

    <!-- Right: Personal Section (Blue) -->
    <section class="personal-section">
        <h2>📚 Personal Study</h2>
        <div id="collections-grid"><!-- Personal collections --></div>
        <button class="btn btn-primary">Create New Collection</button>
    </section>
</div>
```

**Modal updates**:
- "Create Deck" modal title → "Create Course" or "Create Collection" (context-aware)
- "Share with partner" checkbox → "Create as shared course"
- Help text updates throughout

#### `static/css/styles.css` (new additions)

```css
/* Dual-mode dashboard layout */
.dual-mode-dashboard {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 2rem;
}

@media (max-width: 991px) {
    .dual-mode-dashboard {
        grid-template-columns: 1fr;
    }
}

/* Color-coded sections */
.buddy-section {
    border-left: 4px solid #ff8c42;  /* Orange/warm */
    padding-left: 1.5rem;
}

.personal-section {
    border-left: 4px solid #0d6efd;  /* Blue/cool */
    padding-left: 1.5rem;
}

/* Badges */
.course-badge {
    background-color: #ff8c42 !important;
    color: white;
}

.collection-badge {
    background-color: #0d6efd !important;
    color: white;
}

/* Invite CTA banner */
.invite-cta-banner {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
}

.invite-cta-banner a {
    color: white;
    text-decoration: underline;
    font-weight: bold;
}
```

#### Minor template updates

**`base.html` (line 55)**:
```html
<a class="nav-link" href="{% url 'partnership' %}">Learning Buddy</a>
```

**`deck_detail.html` (line 12)**:
```html
<li class="breadcrumb-item active">
    {{ deck.type|default:"Deck"|title }}  <!-- Shows "Course" or "Collection" -->
</li>
```

**`partnership.html` (lines 32, 44)**:
```html
<strong>Shared Courses:</strong> <span id="shared-deck-count">0</span>
<!-- Line 44: -->
<p class="text-muted">Partner with someone to create courses together and learn as a team.</p>
```

**`stats.html` (lines 20, 84)**:
```html
<!-- Line 20: -->
<h6 class="text-muted mb-0">Total Courses & Collections</h6>
<!-- Line 84: -->
<h5>Average Quality by Course/Collection</h5>
```

### Testing Checklist

**Pre-partnership state**:
- [ ] Welcome page shown on first visit
- [ ] Dashboard shows "My Collections" heading
- [ ] Invite CTA banner visible
- [ ] Only collections grid visible (no buddy section)
- [ ] "Create New Collection" button uses correct text

**Post-partnership state**:
- [ ] Dashboard shows dual-mode layout (buddy + personal sections)
- [ ] Buddy section (left) has orange accent, shows partner info
- [ ] Personal section (right) has blue accent
- [ ] Courses grid shows shared decks with "Course" badge (orange)
- [ ] Collections grid shows personal decks with "Collection" badge (blue)
- [ ] Both "Create Course" and "Create Collection" buttons present

**API**:
- [ ] `GET /api/decks/` returns `{courses: [], collections: []}`
- [ ] Each deck has `type: 'course'` or `type: 'collection'`
- [ ] Each deck has `is_shared: boolean`

**Mobile responsiveness**:
- [ ] Dual-mode sections stack vertically on small screens
- [ ] All buttons remain accessible
- [ ] Text remains readable

**Terminology consistency**:
- [ ] All templates use "Course" for shared content
- [ ] All templates use "Collection" for personal content
- [ ] Nav link says "Learning Buddy" (not "Partnership")
- [ ] Breadcrumbs show correct type
- [ ] Modals use correct terminology
- [ ] No lingering "Deck" references in user-facing text

**Backward compatibility**:
- [ ] Existing decks load correctly
- [ ] URLs continue working (`/decks/<id>/`)
- [ ] No database migration required
- [ ] No breaking changes for existing users

### Estimated Timeline

- **Welcome page creation**: 2 hours
- **Backend API updates**: 1 hour
- **TypeScript refactor**: 2 hours
- **Dashboard restructure**: 3 hours
- **CSS styling**: 1 hour
- **Minor template updates**: 1 hour
- **Testing & QA**: 2 hours
- **Total**: **12 hours**

### Risks & Mitigations

**Risk**: Breaking changes for frontend
- **Mitigation**: Update API and TypeScript together in same deployment

**Risk**: Color scheme doesn't fit existing design
- **Mitigation**: Use CSS variables for easy adjustment

**Risk**: Mobile layout cramped
- **Mitigation**: Stack sections vertically on small screens (already planned)

**Risk**: Users confused by terminology change
- **Mitigation**: Welcome page explains collaborative vision upfront

---

## Implementation Summary (2025-11-04)

### Scope: Minimal Viable Version

**Implemented features:**
- ✅ Backend API response structure changes
- ✅ TypeScript interface updates and refactoring
- ✅ Simplified dashboard with renamed sections
- ✅ CSS color coding (orange for buddy, blue for personal)
- ✅ Terminology consistency across all templates
- ✅ Course/Collection badges with icons

**Deferred to future phases:**
- ⏭️ Welcome page for first-time users
- ⏭️ Progressive disclosure (showing/hiding sections based on partnership)
- ⏭️ Dual-mode responsive grid layout
- ⏭️ Stats filtering API
- ⏭️ Activity feed UI

### Changes by File

#### Backend (1 file)
**`flashcards/views.py`** (lines 181-210):
- Added `type` field to deck serialization (`'course'` if shared, `'collection'` if personal)
- Added `is_shared` field to all deck objects
- Changed response keys from `{personal, shared}` to `{collections, courses}`

#### TypeScript (3 files)
**`src/ts/api.ts`**:
- Added `type?: 'course' | 'collection'` to `Deck` interface
- Updated `DecksResponse` from `{personal, shared}` to `{collections, courses}`

**`src/ts/decks.ts`**:
- Refactored all variable names: `personalDecks` → `collections`, `sharedDecks` → `courses`
- Updated grid IDs: `shared-decks-grid` → `courses-grid`, `personal-decks-grid` → `collections-grid`
- Updated section IDs: `shared-decks-section` → `courses-section`, `personal-decks-section` → `collections-section`
- Changed badges: "Shared" → "Course" (with people icon) or "Collection" (with book icon)
- Updated `createDeckCard()` parameter: `isShared` → `isCourse`

**`src/ts/cards.ts`**:
- Updated breadcrumb to dynamically show deck type: "Course: [Title]" or "Collection: [Title]"

#### Templates (5 files)
**`templates/index.html`**:
- Main heading: "My Decks" → "My Study Materials"
- Section heading: "Shared Decks" → "🤝 Learning Buddy"
- Section heading: "Personal Decks" → "📚 Personal Study"
- Added CSS classes: `buddy-section` and `personal-section` for color coding
- Section IDs updated to match TypeScript changes
- Modal title: "Create New Deck" → "Create New Course or Collection"
- Checkbox label: "Share with partner" → "Create as shared course"
- Help text: "Deck will be accessible by both you and your partner" → "Course will be accessible by both you and your learning buddy"
- Dissolve modal: "Shared decks will become personal" → "Shared courses will become personal collections"

**`templates/base.html`** (line 55):
- Nav link: "Partnership" → "Learning Buddy"

**`templates/deck_detail.html`**:
- Breadcrumb dynamically shows deck type via TypeScript

**`templates/partnership.html`**:
- "Shared Decks:" → "Shared Courses:"
- "Partner with someone to share flashcard decks" → "Partner with your learning buddy to share courses"
- Confirm dialog: "Shared decks will become personal" → "Shared courses will become personal collections"

**`templates/stats.html`**:
- "Total Decks" → "Total Courses & Collections"
- "Average Quality by Deck" → "Average Quality by Course/Collection"

#### CSS (1 file)
**`static/css/styles.css`** (+22 lines):
```css
/* Course/Collection Color Coding */
.buddy-section {
    border-left: 4px solid #ff8c42;  /* Orange/warm */
    padding-left: 1.5rem;
    margin-bottom: 2rem;
}

.personal-section {
    border-left: 4px solid #0d6efd;  /* Blue/cool */
    padding-left: 1.5rem;
}

/* Course and Collection Badges */
.course-badge {
    background-color: #ff8c42 !important;
    color: white !important;
}

.collection-badge {
    background-color: #0d6efd !important;
    color: white !important;
}
```

### Key Design Decisions

1. **Simplified approach**: Kept existing two-section layout without progressive disclosure to minimize complexity
2. **Color coding**: Orange (#ff8c42) for collaborative/buddy features, blue (#0d6efd) for personal features
3. **Backward compatibility**: No database changes required; all changes are display-only
4. **Badge icons**: Course badge uses people icon, Collection badge uses book icon
5. **Internal naming**: Variable names updated in code, but kept internal "deck" references where appropriate

### Testing Results

✅ TypeScript compilation: Successful (no errors)
✅ API response structure: Verified `{collections: [], courses: []}` format
✅ Terminology consistency: All user-facing text updated
✅ Backward compatibility: No breaking changes for existing data

### Estimated Effort

**Planned**: 8-12 hours (full implementation)
**Actual**: 2-3 hours (minimal viable version)

### Future Enhancements

When ready to enhance this implementation:
1. Add welcome page for first-time users (2 hours)
2. Implement progressive disclosure based on partnership status (2 hours)
3. Create dual-mode responsive grid layout (2 hours)
4. Add stats filtering API (`/api/stats/?filter=all|courses|collections`) (1 hour)
5. Build activity feed UI (3 hours)

**Total for full RFC implementation**: Additional 10 hours
