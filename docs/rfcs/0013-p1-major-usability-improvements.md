# RFC 0013: P1 Major Usability Improvements

**Status**: Draft
**Created**: 2025-11-11

---

## What are we building?

Six major usability improvements to reduce cognitive load and streamline workflows: (1) simplified 3-button rating system, (2) remember last study direction, (3) direction selection examples, (4) enhanced shared deck creation UX, (5) invitation management on dashboard, and (6) celebration animations.

## Why?

User testing revealed several friction points that slow down workflows and increase decision fatigue:

- **6-button rating system** creates decision fatigue every card (0-5 requires understanding 6 distinctions)
- **Direction selection screen** adds extra navigation step every study session (~5-10 seconds)
- **Direction options lack context** - Users may not understand what "A→B" means without examples
- **Shared deck checkbox easily overlooked** - Small checkbox in modal, easy to create personal deck by mistake
- **Invitation codes disappear** - After closing modal, no way to view active invitation or expiration
- **Partnership establishment feels flat** - Plain alert, no emotional reward

These improvements target **50% reduction in cognitive load** and **30% faster workflows**.

## How?

### 1. Simplified Rating System - "Simple Mode" (4-5 hours)

**Current System (6 buttons):**

- 0 = Blackout, 1 = Wrong/plausible, 2 = Wrong/easy, 3 = Correct/difficult, 4 = Correct/hesitation, 5 = Perfect
- **High cognitive load** - requires distinguishing 6 levels

**New "Simple Mode" (3 buttons):**

- 😰 Hard → Maps to SM-2 rating 2
- 😊 Good → Maps to SM-2 rating 4
- 🎉 Easy → Maps to SM-2 rating 5
- **Low cognitive load** - intuitive emotional response

**Implementation:**

Add user preference:

```python
# flashcards/models.py
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    # ... existing fields
    rating_mode = models.CharField(
        max_length=20,
        choices=[('SIMPLE', 'Simple (3 buttons)'), ('ADVANCED', 'Advanced (6 buttons)')],
        default='SIMPLE'
    )
```

Backend mapping:

```python
# flashcards/utils.py
SIMPLE_MODE_MAPPING = {
    'HARD': 2,   # Triggers shorter interval
    'GOOD': 4,   # Normal progression
    'EASY': 5,   # Longer interval
}

def map_simple_rating(simple_rating: str) -> int:
    """Convert simple mode rating to SM-2 rating"""
    return SIMPLE_MODE_MAPPING.get(simple_rating, 4)
```

Frontend UI adaptation:

```typescript
// src/ts/study.ts
function renderRatingButtons(mode: "simple" | "advanced") {
	const container = document.getElementById("rating-buttons")!;

	if (mode === "simple") {
		container.innerHTML = `
            <button class="btn btn-lg btn-warning" onclick="rateCard('HARD')">
                😰 Hard
            </button>
            <button class="btn btn-lg btn-success" onclick="rateCard('GOOD')">
                😊 Good
            </button>
            <button class="btn btn-lg btn-primary" onclick="rateCard('EASY')">
                🎉 Easy
            </button>
        `;
	} else {
		// Render existing 6-button interface
		container.innerHTML = `...`;
	}
}

async function rateCard(rating: string | number) {
	let sm2Rating: number;

	if (typeof rating === "string") {
		// Simple mode - convert to SM-2 rating
		const mapping: Record<string, number> = {
			HARD: 2,
			GOOD: 4,
			EASY: 5,
		};
		sm2Rating = mapping[rating];
	} else {
		// Advanced mode - use direct rating
		sm2Rating = rating;
	}

	// Submit to backend
	await api.reviewCard(currentCard.id, sm2Rating);
	// ... next card logic
}
```

Settings toggle:

```html
<!-- templates/settings.html -->
<div class="form-group">
	<label>Rating System</label>
	<select name="rating_mode" class="form-control">
		<option value="SIMPLE">
			Simple (3 buttons) - Recommended for beginners
		</option>
		<option value="ADVANCED">
			Advanced (6 buttons) - More control over intervals
		</option>
	</select>
	<small class="form-text text-muted">
		Simple mode maps to: Hard=2, Good=4, Easy=5 in the SM-2 algorithm
	</small>
</div>
```

**Impact:** 50% reduction in decision time per card, default for new users

---

### 2. Remember Last Direction (3-4 hours)

**Current Flow:** Deck Detail → Study Button → Direction Selection Screen → Study Session

**Enhanced Flow:** Deck Detail → Study Button → Study Session (using remembered direction)

**Implementation:**

LocalStorage persistence:

```typescript
// src/ts/study.ts
interface DeckPreferences {
	[deckId: number]: {
		lastDirection: "A_TO_B" | "B_TO_A" | "RANDOM";
		lastStudied: string;
	};
}

function saveDirectionPreference(deckId: number, direction: string) {
	const prefs = getPreferences();
	prefs[deckId] = {
		lastDirection: direction as any,
		lastStudied: new Date().toISOString(),
	};
	localStorage.setItem("deckPreferences", JSON.stringify(prefs));
}

function getPreferences(): DeckPreferences {
	const stored = localStorage.getItem("deckPreferences");
	return stored ? JSON.parse(stored) : {};
}

function getLastDirection(deckId: number): string | null {
	const prefs = getPreferences();
	return prefs[deckId]?.lastDirection || null;
}

// On study start
async function startStudySession(deckId: number) {
	const lastDirection = getLastDirection(deckId);

	if (lastDirection) {
		// Skip direction selection, use saved preference
		await beginStudyWithDirection(deckId, lastDirection);
	} else {
		// First time studying - show direction selection
		showDirectionSelection(deckId);
	}
}

// After direction selected
async function onDirectionSelected(deckId: number, direction: string) {
	saveDirectionPreference(deckId, direction);
	await beginStudyWithDirection(deckId, direction);
}
```

Quick change option:

```html
<!-- Add to study session UI -->
<div class="study-header">
	<span class="current-direction">
		Studying: Language A → Language B
		<button class="btn btn-sm btn-link" onclick="changeDirection()">
			↔️ Change
		</button>
	</span>
</div>
```

**Alternative: Quick Direction Buttons on Deck Detail**

```html
<!-- templates/deck_detail.html - Replace single Study button -->
<div class="btn-group">
	<button class="btn btn-primary" onclick="studyDeck({{ deck.id }}, 'A_TO_B')">
		Study A→B
	</button>
	<button
		class="btn btn-outline-primary"
		onclick="studyDeck({{ deck.id }}, 'B_TO_A')">
		Study B→A
	</button>
	<button
		class="btn btn-outline-secondary"
		onclick="studyDeck({{ deck.id }}, 'RANDOM')">
		Random
	</button>
</div>
```

**Impact:** Saves 5-10 seconds per study session, removes navigation friction

---

### 3. Direction Selection Examples (1-2 hours)

**Current State:** Generic labels only - "Language A → Language B", "Language B → Language A", "Random"

**Enhanced State:** Show preview examples below each option

**Implementation:**

```typescript
// src/ts/study.ts
async function showDirectionSelection(deckId: number) {
	// Fetch sample card from deck
	const response = await api.fetch(`/api/decks/${deckId}/sample-card/`);
	const sample = await response.json();

	const modal = `
        <div class="direction-selection">
            <h4>Choose Study Direction</h4>

            <div class="direction-option">
                <button class="btn btn-lg btn-outline-primary" onclick="selectDirection('A_TO_B')">
                    Language A → Language B
                </button>
                <p class="example">
                    Example: You'll see "<strong>${sample.language_a}</strong>",
                    answer "<strong>${sample.language_b}</strong>"
                </p>
            </div>

            <div class="direction-option">
                <button class="btn btn-lg btn-outline-primary" onclick="selectDirection('B_TO_A')">
                    Language B → Language A
                </button>
                <p class="example">
                    Example: You'll see "<strong>${sample.language_b}</strong>",
                    answer "<strong>${sample.language_a}</strong>"
                </p>
            </div>

            <div class="direction-option">
                <button class="btn btn-lg btn-outline-secondary" onclick="selectDirection('RANDOM')">
                    ⟲ Random Direction
                </button>
                <p class="example">
                    Each card will randomly show either direction
                </p>
            </div>
        </div>
    `;

	// Display modal
	showModal("Study Direction", modal);
}
```

Backend sample endpoint:

```python
# flashcards/views.py
@login_required
def get_sample_card(request, deck_id):
    """Get random card from deck for preview"""
    deck = get_object_or_404(Deck, id=deck_id)
    check_deck_access(request.user, deck)

    card = deck.cards.order_by('?').first()
    if not card:
        return JsonResponse({'error': 'No cards in deck'})

    return JsonResponse({
        'success': True,
        'data': {
            'language_a': card.language_a,
            'language_b': card.language_b,
            'language_a_code': card.language_a_code,
            'language_b_code': card.language_b_code
        }
    })

# flashcards/urls.py
path('api/decks/<int:deck_id>/sample-card/', views.get_sample_card),
```

**Impact:** Reduces confusion, educates users about bidirectional learning

---

### 4. Enhanced Shared Deck Creation UX (2-3 hours)

**Current Issue:** Small checkbox, easy to overlook, no confirmation

**Enhancement:** Prominent toggle, partner preview, confirmation dialog

**Implementation:**

```html
<!-- templates/index.html - Update create deck modal -->
<div class="modal-body">
	<form id="create-deck-form">
		<div class="form-group">
			<label>Title</label>
			<input type="text" class="form-control" name="title" required />
		</div>

		<div class="form-group">
			<label>Description</label>
			<textarea class="form-control" name="description"></textarea>
		</div>

		<!-- Enhanced shared toggle -->
		<div class="form-group">
			<div class="card border-primary mb-3" id="shared-deck-toggle">
				<div class="card-body">
					<div class="form-check form-switch">
						<input
							class="form-check-input"
							type="checkbox"
							id="shared-checkbox"
							name="shared"
							onchange="toggleSharedPreview()"
							style="width: 3em; height: 1.5em;" />
						<label class="form-check-label" for="shared-checkbox">
							<strong>🤝 Create as Shared Course</strong>
						</label>
					</div>

					<!-- Preview shown when checked -->
					<div id="shared-preview" style="display: none;">
						<div class="alert alert-info mt-2">
							📢 This course will be accessible by:
							<ul class="mb-0 mt-2">
								<li>You (@{{ user.username }})</li>
								<li>
									Your learning partner (@<span id="partner-name"></span>)
								</li>
							</ul>
							Both of you can add and edit cards.
						</div>
					</div>
				</div>
			</div>
		</div>

		<button type="submit" class="btn btn-primary">Create Course</button>
	</form>
</div>
```

JavaScript toggle:

```typescript
// src/ts/decks.ts
function toggleSharedPreview() {
	const checkbox = document.getElementById(
		"shared-checkbox"
	) as HTMLInputElement;
	const preview = document.getElementById("shared-preview")!;
	const toggle = document.getElementById("shared-deck-toggle")!;

	if (checkbox.checked) {
		preview.style.display = "block";
		toggle.classList.add("border-primary");
		// Load partner name
		loadPartnerName();
	} else {
		preview.style.display = "none";
		toggle.classList.remove("border-primary");
	}
}

async function loadPartnerName() {
	const response = await api.getPartnership();
	if (response.data?.partner_username) {
		document.getElementById("partner-name")!.textContent =
			response.data.partner_username;
	}
}

// Confirmation on submit
async function createDeck(formData: FormData) {
	const isShared = formData.get("shared") === "on";

	if (isShared) {
		const confirmed = confirm(
			`Share "${formData.get("title")}" with @${partnerName}?\n\n` +
				`Both of you will be able to add and edit cards.`
		);
		if (!confirmed) return;
	}

	// Proceed with creation
	await api.createDeck(formData);
}
```

**Impact:** Reduces accidental personal deck creation, clearer sharing intent

---

### 5. Invitation Management on Dashboard (2-3 hours)

**Current Issue:** Invitation code only visible in modal, disappears after closing

**Enhancement:** Show active invitation with countdown, allow revocation

**Implementation:**

```html
<!-- templates/index.html - Add to partnership card when invitation exists -->
<div class="card mb-4">
	<div class="card-header">
		<h5 class="mb-0">🤝 Learning Partner</h5>
	</div>
	<div class="card-body">
		{% if has_active_invitation %}
		<div class="alert alert-warning">
			<strong>📬 Active Invitation</strong>
			<p class="mb-2">
				Code: <code>{{ invitation_code }}</code>
				<button
					class="btn btn-sm btn-outline-secondary"
					onclick="copyCode('{{ invitation_code }}')">
					Copy
				</button>
			</p>
			<p class="mb-2">
				<small
					>Expires in
					<strong id="invitation-countdown">{{ expires_in }}</strong></small
				>
			</p>
			<button class="btn btn-sm btn-danger" onclick="revokeInvitation()">
				Revoke Invitation
			</button>
		</div>
		{% elif has_partnership %}
		<!-- Existing partnership display -->
		{% else %}
		<!-- No partnership or invitation -->
		{% endif %}
	</div>
</div>
```

Backend changes:

```python
# flashcards/views.py - Update index view
@login_required
def index(request):
    # ... existing code

    # Check for active invitation
    invitation = PartnershipInvitation.objects.filter(
        invited_by=request.user,
        is_used=False,
        expires_at__gt=timezone.now()
    ).first()

    context = {
        # ... existing context
        'has_active_invitation': invitation is not None,
        'invitation_code': invitation.code if invitation else None,
        'invitation_expires_at': invitation.expires_at if invitation else None,
    }

    return render(request, 'index.html', context)

# New endpoint
@login_required
def revoke_invitation(request):
    """Delete active invitation"""
    PartnershipInvitation.objects.filter(
        invited_by=request.user,
        is_used=False
    ).delete()
    return JsonResponse({'success': True})

# flashcards/urls.py
path('api/partnership/revoke-invitation/', views.revoke_invitation),
```

Countdown timer:

```typescript
// src/ts/decks.ts
function startInvitationCountdown(expiresAt: string) {
	const countdownEl = document.getElementById("invitation-countdown")!;

	setInterval(() => {
		const now = new Date();
		const expires = new Date(expiresAt);
		const diff = expires.getTime() - now.getTime();

		if (diff <= 0) {
			countdownEl.textContent = "Expired";
			return;
		}

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		countdownEl.textContent = `${days}d ${hours}h`;
	}, 1000);
}
```

**Impact:** Better invitation management, reduces "lost code" frustration

---

### 6. Celebration Animations (1-2 hours)

**Current State:** Plain alert on partnership establishment

**Enhancement:** Confetti particles + sound + achievement popup

**Implementation:**

Add library:

```html
<!-- templates/base.html -->
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
```

Confetti on partnership:

```typescript
// src/ts/partnership.ts
async function acceptInvitation(code: string) {
	const response = await api.acceptInvitation(code);

	if (response.success) {
		// Trigger confetti
		confetti({
			particleCount: 100,
			spread: 70,
			origin: { y: 0.6 },
			colors: ["#0d6efd", "#198754", "#ffc107"],
		});

		// Play success sound
		const audio = new Audio("/static/sounds/success.mp3");
		audio.volume = 0.3;
		audio.play();

		// Show achievement popup
		showAchievementPopup(
			"🏆 Achievement Unlocked!",
			"Learning Buddies",
			"You've established your first partnership!"
		);

		// Reload page after celebration
		setTimeout(() => location.reload(), 2000);
	}
}

function showAchievementPopup(
	title: string,
	name: string,
	description: string
) {
	const popup = document.createElement("div");
	popup.className = "achievement-popup";
	popup.innerHTML = `
        <div class="achievement-content">
            <h3>${title}</h3>
            <h4>${name}</h4>
            <p>${description}</p>
        </div>
    `;

	document.body.appendChild(popup);

	// Fade in
	setTimeout(() => popup.classList.add("show"), 100);

	// Fade out
	setTimeout(() => {
		popup.classList.remove("show");
		setTimeout(() => popup.remove(), 500);
	}, 3000);
}
```

CSS:

```css
/* static/css/style.css */
.achievement-popup {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background: white;
	padding: 2rem;
	border-radius: 15px;
	box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
	z-index: 9999;
	opacity: 0;
	transition: opacity 0.5s;
	text-align: center;
	min-width: 300px;
}

.achievement-popup.show {
	opacity: 1;
}

.achievement-popup h3 {
	font-size: 1.5rem;
	margin-bottom: 0.5rem;
}

.achievement-popup h4 {
	color: #0d6efd;
	margin-bottom: 1rem;
}
```

**Impact:** Makes social features feel rewarding and emotional

---

### Data/API Changes

**Database:**

- Add `UserProfile.rating_mode` field
- Existing models sufficient for other features

**New Endpoints:**

- `GET /api/decks/<id>/sample-card/` - Get preview card
- `POST /api/partnership/revoke-invitation/` - Delete invitation

**Modified Views:**

- `index()` - Include invitation data in context

**Frontend:**

- Add `canvas-confetti` library (CDN)
- Add localStorage for direction preferences
- Add success.mp3 sound file

## Notes

**Implementation Priority:**

1. **Simple rating mode** (4-5h) - Biggest cognitive load reduction
2. **Remember direction** (3-4h) - Biggest time savings per session
3. **Celebration animations** (1-2h) - Quick win, high emotional impact
4. **Direction examples** (1-2h) - Educational improvement
5. **Enhanced deck creation** (2-3h) - Prevents user errors
6. **Invitation management** (2-3h) - Nice-to-have polish

**Total Estimate:** 13-18 hours (2-3 days)

**Testing Requirements:**

- Test simple mode maps correctly to SM-2 ratings
- Verify localStorage persists across sessions
- Test confetti on various browsers
- Confirm sample card endpoint doesn't expose private decks

**User Education:**

- Add "Learn More" link explaining SM-2 algorithm
- Show tooltip on first direction selection
- Explain rating mode difference in settings

**Quick Wins:**

- Celebration animations (1-2h) - high emotional impact
- Remember direction (3-4h) - removes friction
- Simple rating mode (4-5h) - default for new users

---

**Tips:** Implement simple rating mode and remember direction first - these provide immediate workflow improvements. Celebration animations are a quick win for emotional engagement.
