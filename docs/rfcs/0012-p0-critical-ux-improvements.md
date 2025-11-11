# RFC 0012: P0 Critical UX Improvements

**Status**: Draft
**Created**: 2025-11-11

---

## What are we building?

Four critical UX improvements to fix discoverability issues and broken functionality: (1) shareable invitation links with QR codes, (2) partnership link in navbar, (3) activity feed display, and (4) statistics counting fix for shared courses.

## Why?

User journey testing identified these as **critical blockers** (P0 priority):

1. **Partnership setup is too slow** - Current 5-step process (generate code → copy → send externally → enter code → accept) takes 35 seconds and requires external communication. Users must manually type 6-character codes.

2. **Partnership features are hidden** - Partnership functionality only accessible via dashboard card. No navbar link means users struggle to find it. UX report identified this as "Partnership Discovery Problem."

3. **Activity feed incomplete** - Backend and API exist, but frontend doesn't render activities. Users have no feedback about partner actions, limiting sense of collaboration.

4. **Statistics show zero for shared courses** - Bob's stats show "0 Total Courses" despite accessing shared courses. Confusing and makes dashboard appear broken.

## How?

### 1. Shareable Invitation Links (5-7 hours)

**Backend Changes:**

```python
# flashcards/views.py - New endpoint
@login_required
def join_partnership(request, code):
    """Auto-accept partnership from shareable link"""
    try:
        invitation = PartnershipInvitation.objects.get(
            code=code,
            expires_at__gt=timezone.now(),
            is_used=False
        )

        if request.user == invitation.invited_by:
            return JsonResponse({'error': 'Cannot accept own invitation'})

        # Auto-accept partnership
        partnership = Partnership.objects.create(
            user_a=invitation.invited_by,
            user_b=request.user,
            is_active=True
        )
        invitation.is_used = True
        invitation.save()

        return redirect('index')  # Redirect to dashboard with success message

    except PartnershipInvitation.DoesNotExist:
        return render(request, 'error.html', {'message': 'Invalid or expired invitation'})

# flashcards/urls.py
urlpatterns += [
    path('join/<str:code>/', views.join_partnership, name='join_partnership'),
]
```

**Frontend Changes:**

```typescript
// src/ts/partnership.ts
function displayInvitationCode(code: string, expiresAt: string) {
	// Generate shareable URL
	const shareUrl = `${window.location.origin}/join/${code}`;

	// Update UI with link and copy button
	const html = `
        <div class="invitation-display">
            <p><strong>Invitation Code:</strong> ${code}</p>
            <p><strong>Shareable Link:</strong></p>
            <input type="text" value="${shareUrl}" readonly id="share-url">
            <button onclick="copyShareUrl()">Copy Link</button>

            <div id="qr-code"></div>

            <div class="social-share">
                <a href="whatsapp://send?text=Join me on Flashcard Study! ${shareUrl}">WhatsApp</a>
                <a href="mailto:?subject=Join me on Flashcard Study&body=${shareUrl}">Email</a>
            </div>
        </div>
    `;

	// Generate QR code using qrcode.js library
	new QRCode(document.getElementById("qr-code"), {
		text: shareUrl,
		width: 200,
		height: 200,
	});
}
```

**Dependencies:**

- Add `qrcode.js` library via CDN in `base.html`

**Impact:** Reduces partnership setup from 35s to ~5s (6x faster)

---

### 2. Partnership Link in Navbar (1 hour)

**Template Changes:**

```html
<!-- templates/base.html - Add to navbar around line 40 -->
<nav class="navbar navbar-expand-lg navbar-light bg-light">
	<div class="container">
		<!-- ... existing links ... -->
		<ul class="navbar-nav ms-auto">
			{% if user.is_authenticated %}
			<li class="nav-item">
				<a class="nav-link" href="{% url 'index' %}">Dashboard</a>
			</li>
			<li class="nav-item">
				<a class="nav-link" href="{% url 'partnership_page' %}">
					🤝 Learning Partner {% if is_first_visit %}
					<span class="badge bg-primary">New</span>
					{% endif %}
				</a>
			</li>
			<!-- ... rest of nav ... -->
			{% endif %}
		</ul>
	</div>
</nav>
```

**Backend Changes:**

```python
# flashcards/context_processors.py - New file
def partnership_context(request):
    """Add partnership info to all templates"""
    if request.user.is_authenticated:
        # Check if first visit (user registered today or has no partnership yet)
        is_first_visit = (
            request.user.date_joined.date() == timezone.now().date() or
            not Partnership.objects.filter(
                Q(user_a=request.user) | Q(user_b=request.user),
                is_active=True
            ).exists()
        )
        return {'is_first_visit': is_first_visit}
    return {}

# flashcard_project/settings.py - Add context processor
TEMPLATES[0]['OPTIONS']['context_processors'].append(
    'flashcards.context_processors.partnership_context'
)
```

**Impact:** Makes partnership feature discoverable from any page

---

### 3. Activity Feed Display (4-5 hours)

**Current State:** Backend complete (Activity model + API at views.py:1174-1239), but frontend doesn't load activities.

**Frontend Implementation:**

```typescript
// src/ts/decks.ts - Add activity feed loading
async function loadActivityFeed() {
	const response = await api.fetch("/api/activity/");
	const data = await response.json();

	const feedDiv = document.getElementById("activity-feed");
	if (!feedDiv) return;

	if (data.activities.length === 0) {
		feedDiv.innerHTML = '<p class="text-muted">No recent activity</p>';
		return;
	}

	const html = data.activities
		.map((activity: any) => {
			const icon = getActivityIcon(activity.activity_type);
			const timeAgo = formatTimeAgo(activity.created_at);

			return `
            <div class="activity-item">
                <span class="activity-icon">${icon}</span>
                <div class="activity-content">
                    <strong>@${activity.user_username}</strong>
                    ${activity.description}
                    <small class="text-muted">${timeAgo}</small>
                </div>
            </div>
        `;
		})
		.join("");

	feedDiv.innerHTML = html;
}

function getActivityIcon(type: string): string {
	const icons: Record<string, string> = {
		DECK_CREATED: "📚",
		CARD_ADDED: "📝",
		STUDY_SESSION: "✅",
		PARTNERSHIP_FORMED: "🤝",
		ACHIEVEMENT_UNLOCKED: "🏆",
	};
	return icons[type] || "•";
}

function formatTimeAgo(timestamp: string): string {
	const now = new Date();
	const then = new Date(timestamp);
	const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

	if (seconds < 60) return "Just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

// Call on page load
document.addEventListener("DOMContentLoaded", () => {
	loadActivityFeed();
	// Refresh every 30 seconds
	setInterval(loadActivityFeed, 30000);
});
```

**Template Changes:**

```html
<!-- templates/index.html - Update activity feed section around line 85 -->
<div class="card mb-4">
	<div class="card-header">
		<h5 class="mb-0">🔔 Recent Activity</h5>
	</div>
	<div class="card-body">
		<div id="activity-feed">
			<p class="text-muted">Loading...</p>
		</div>
	</div>
</div>
```

**Impact:** Provides real-time collaboration feedback

---

### 4. Statistics Counting Fix (1-2 hours)

**Current Issue:** Shared courses show as "0 Total Courses" for non-creators.

**Backend Fix:**

```python
# flashcards/views.py - Update statistics view around line 892
@login_required
def get_statistics(request):
    user = request.user

    # Get personal decks
    personal_decks = Deck.objects.filter(created_by=user, shared=False)

    # Get shared decks (either created by user or accessible via partnership)
    shared_decks = Deck.objects.filter(
        shared=True
    ).filter(
        Q(created_by=user) |
        Q(created_by__in=get_partners(user))
    )

    # Separate counts
    personal_count = personal_decks.count()
    shared_count = shared_decks.count()
    total_count = personal_count + shared_count

    # Update total cards count
    personal_cards = Card.objects.filter(deck__in=personal_decks).count()
    shared_cards = Card.objects.filter(deck__in=shared_decks).count()
    total_cards = personal_cards + shared_cards

    return JsonResponse({
        'success': True,
        'data': {
            'total_decks': total_count,
            'personal_decks': personal_count,
            'shared_decks': shared_count,
            'total_cards': total_cards,
            'personal_cards': personal_cards,
            'shared_cards': shared_cards,
            # ... rest of stats
        }
    })

def get_partners(user):
    """Helper to get user's partners"""
    partnerships = Partnership.objects.filter(
        Q(user_a=user) | Q(user_b=user),
        is_active=True
    )
    partner_ids = []
    for p in partnerships:
        partner_ids.append(p.user_a.id if p.user_b == user else p.user_b.id)
    return partner_ids
```

**Frontend Update:**

```typescript
// src/ts/stats.ts - Display breakdown
function displayStats(stats: Statistics) {
	document.getElementById(
		"total-decks"
	)!.textContent = `${stats.total_decks} (${stats.personal_decks} personal, ${stats.shared_decks} shared)`;

	document.getElementById(
		"total-cards"
	)!.textContent = `${stats.total_cards} (${stats.personal_cards} personal, ${stats.shared_cards} shared)`;

	// ... rest of display logic
}
```

**Impact:** Shows accurate counts, fixes user confusion

---

### Data/API Changes

**New Endpoints:**

- `GET /join/<code>/` - Auto-accept partnership invitation

**Modified Endpoints:**

- `GET /api/statistics/` - Returns separate personal/shared counts

**Database:**

- No schema changes required

**Frontend:**

- Add `qrcode.js` dependency
- New TypeScript function: `loadActivityFeed()`
- Modified: statistics display logic

## Notes

**Implementation Order:**

1. Statistics fix (1-2h) - Quick win, fixes broken functionality
2. Activity feed (4-5h) - Uses existing backend
3. Navbar link (1h) - Simple template change
4. Shareable links (5-7h) - Requires new endpoint

**Total Estimate:** 11-15 hours (1.5-2 days)

**Testing Requirements:**

- Test shareable links work with/without authentication
- Verify QR codes scan correctly on mobile
- Test activity feed updates in real-time
- Confirm statistics show correct counts for both partners

**Dependencies:**

- `qrcode.js` library (CDN or npm package)

**Quick Wins:**

- All four improvements have high impact relative to effort
- No complex algorithm changes required
- Fixes identified pain points from user testing
- Improves partnership adoption rate

---

**Tips:** These are foundational fixes that unblock user adoption. Prioritize statistics fix and activity feed first (backend already exists), then add shareable links for maximum onboarding improvement.
