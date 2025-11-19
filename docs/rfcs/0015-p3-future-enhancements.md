# RFC 0015: P3 Future Enhancements

**Status**: Draft
**Created**: 2025-11-11

---

## What are we building?

Ten future enhancements for personalization, advanced features, and community: (1) timer hide option, (2) theme picker, (3) profile avatars, (4) enhanced card creation tools, (5) card comments & reactions, (6) public deck discovery, (7) daily study goals, (8) smart reminders, (9) accessibility improvements, and (10) mobile optimization.

## Why?

These features represent **long-term vision** for the platform - personalization, community building, and advanced workflows. They're lower priority than core UX fixes and engagement boosters, but important for:

- **User personalization** - Making app feel like "theirs"
- **Community features** - Building shared learning ecosystem
- **Advanced workflows** - Power user capabilities
- **Accessibility & inclusivity** - Reaching broader audience
- **Mobile experience** - Supporting on-the-go learning

Target outcomes: Increase user satisfaction, expand user base, enable power users.

## How?

### 1. Timer Hide Option (0.5 days)

**Problem:** Timer creates anxiety for some learners

**Solution:** Add toggle in user settings

```python
# flashcards/models.py
class UserProfile(models.Model):
    # ... existing fields
    show_study_timer = models.BooleanField(default=True)
```

```html
<!-- templates/settings.html -->
<div class="form-check">
	<input
		type="checkbox"
		class="form-check-input"
		name="show_study_timer"
		{%
		if
		profile.show_study_timer
		%}checked{%
		endif
		%} />
	<label class="form-check-label">Show timer during study sessions</label>
	<small class="form-text text-muted"
		>Some learners prefer to study without time pressure</small
	>
</div>
```

```typescript
// src/ts/study.ts
function initStudySession() {
	const showTimer = getUserPreference("show_study_timer", true);

	if (showTimer) {
		startTimer();
		document.getElementById("timer-display")!.style.display = "block";
	} else {
		document.getElementById("timer-display")!.style.display = "none";
	}
}
```

**Impact:** Reduces study anxiety for pressure-sensitive users

---

### 2. Theme Picker (1 day)

**Five color themes:**

1. Classic Blue (current)
2. Forest Green (calming)
3. Sunset Purple (creative)
4. Warm Orange (energetic)
5. Dark Mode (night study)

**Implementation:**

```css
/* static/css/themes.css - New file */
:root {
	--primary: #0d6efd;
	--secondary: #6c757d;
	--success: #198754;
	--background: #ffffff;
	--text: #212529;
	--card-bg: #ffffff;
}

[data-theme="dark"] {
	--primary: #4dabf7;
	--secondary: #adb5bd;
	--success: #51cf66;
	--background: #1a1a1a;
	--text: #e0e0e0;
	--card-bg: #2d2d2d;
}

[data-theme="forest"] {
	--primary: #2e7d32;
	--secondary: #558b2f;
	--success: #66bb6a;
	--background: #f1f8e9;
	--text: #1b5e20;
	--card-bg: #ffffff;
}

[data-theme="sunset"] {
	--primary: #7e57c2;
	--secondary: #5e35b1;
	--success: #ab47bc;
	--background: #f3e5f5;
	--text: #4a148c;
	--card-bg: #ffffff;
}

[data-theme="warm"] {
	--primary: #ff6f00;
	--secondary: #e65100;
	--success: #fb8c00;
	--background: #fff3e0;
	--text: #e65100;
	--card-bg: #ffffff;
}

/* Apply variables to components */
body {
	background-color: var(--background);
	color: var(--text);
}

.card {
	background-color: var(--card-bg);
}

.btn-primary {
	background-color: var(--primary);
	border-color: var(--primary);
}
```

```typescript
// src/ts/themes.ts - New file
function setTheme(themeName: string) {
	document.documentElement.setAttribute("data-theme", themeName);
	localStorage.setItem("theme", themeName);

	// Save to backend
	api.updateUserPreference("theme", themeName);
}

function loadTheme() {
	const saved = localStorage.getItem("theme") || "classic";
	setTheme(saved);
}

// Apply on page load
document.addEventListener("DOMContentLoaded", loadTheme);
```

```html
<!-- templates/settings.html -->
<div class="form-group">
	<label>Theme</label>
	<div class="theme-picker">
		<button class="theme-btn" data-theme="classic" style="background: #0d6efd;">
			Classic Blue
		</button>
		<button class="theme-btn" data-theme="forest" style="background: #2e7d32;">
			Forest Green
		</button>
		<button class="theme-btn" data-theme="sunset" style="background: #7e57c2;">
			Sunset Purple
		</button>
		<button class="theme-btn" data-theme="warm" style="background: #ff6f00;">
			Warm Orange
		</button>
		<button
			class="theme-btn"
			data-theme="dark"
			style="background: #1a1a1a; color: white;">
			Dark Mode
		</button>
	</div>
</div>
```

**Impact:** Personalization, reduces eye strain (dark mode), aesthetic preference

---

### 3. Profile Avatars (1 day)

**Upload or preset avatars:**

```python
# flashcards/models.py
class UserProfile(models.Model):
    # ... existing fields
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    avatar_preset = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=[
            ('avatar_1', '🦊 Fox'),
            ('avatar_2', '🐼 Panda'),
            ('avatar_3', '🦉 Owl'),
            ('avatar_4', '🐨 Koala'),
            ('avatar_5', '🦁 Lion'),
            ('avatar_6', '🐸 Frog'),
            ('avatar_7', '🦋 Butterfly'),
            ('avatar_8', '🐧 Penguin'),
        ]
    )

    def get_avatar_url(self):
        if self.avatar:
            return self.avatar.url
        elif self.avatar_preset:
            # Return emoji or preset image
            preset_map = dict(self._meta.get_field('avatar_preset').choices)
            return preset_map.get(self.avatar_preset, '👤')
        return '👤'  # Default
```

```html
<!-- templates/profile.html -->
<div class="avatar-selector">
	<h5>Profile Avatar</h5>

	<!-- Upload custom -->
	<div class="mb-3">
		<label>Upload Image</label>
		<input type="file" class="form-control" name="avatar" accept="image/*" />
	</div>

	<!-- Or choose preset -->
	<div>
		<label>Or Choose Preset</label>
		<div class="preset-avatars">
			{% for code, emoji in avatar_choices %}
			<button class="avatar-btn" data-preset="{{ code }}">{{ emoji }}</button>
			{% endfor %}
		</div>
	</div>

	<!-- Preview -->
	<div class="avatar-preview mt-3">
		<img
			id="avatar-preview"
			src="{{ user.userprofile.get_avatar_url }}"
			alt="Avatar"
			class="rounded-circle"
			width="100"
			height="100" />
	</div>
</div>
```

**Display in UI:**

```html
<!-- Show in partnership card, activity feed, etc. -->
<div class="user-info">
	<img
		src="{{ user.userprofile.get_avatar_url }}"
		alt="{{ user.username }}"
		class="avatar-sm rounded-circle" />
	<strong>@{{ user.username }}</strong>
</div>
```

**Impact:** Visual identity, makes partnership feel more personal

---

### 4. Enhanced Card Creation Tools (5-7 days)

**Four enhancements:**

#### 4.1 Voice Input (1 day)

```typescript
// src/ts/cards.ts
const recognition = new (window as any).webkitSpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;

function startVoiceInput(fieldId: string, languageCode: string) {
	recognition.lang = languageCode; // e.g., 'en-US', 'es-ES'

	recognition.onresult = (event: any) => {
		const transcript = event.results[0][0].transcript;
		(document.getElementById(fieldId) as HTMLInputElement).value = transcript;
	};

	recognition.start();
}
```

```html
<!-- Add microphone button next to text fields -->
<div class="input-group">
	<input type="text" class="form-control" id="language-a-input" />
	<button
		class="btn btn-outline-secondary"
		onclick="startVoiceInput('language-a-input', 'en-US')">
		🎤
	</button>
</div>
```

#### 4.2 Bulk Text Import (1 day)

```typescript
// src/ts/cards.ts
async function importBulkText(text: string, deckId: number) {
	// Detect delimiter
	const delimiter = detectDelimiter(text); // -, |, →, tab

	// Parse lines
	const lines = text.split("\n").filter(line => line.trim());
	const cards = lines.map(line => {
		const [lang_a, lang_b] = line.split(delimiter).map(s => s.trim());
		return { language_a: lang_a, language_b: lang_b };
	});

	// Preview
	showBulkImportPreview(cards);
}

function detectDelimiter(text: string): string {
	const delimiters = [" - ", " | ", " → ", "\t", ","];
	for (const delim of delimiters) {
		if (text.includes(delim)) return delim;
	}
	return " - "; // default
}
```

#### 4.3 Image Support (2 days)

```python
# flashcards/models.py
class Card(models.Model):
    # ... existing fields
    image = models.ImageField(upload_to='card_images/', null=True, blank=True)
    image_url = models.URLField(null=True, blank=True)
```

```html
<!-- Add to card creation form -->
<div class="form-group">
	<label>Image (optional)</label>
	<input type="file" class="form-control" name="image" accept="image/*" />
	<small>Or paste image URL:</small>
	<input
		type="url"
		class="form-control"
		name="image_url"
		placeholder="https://..." />
</div>
```

#### 4.4 Context Suggestions (1-2 days)

```typescript
// src/ts/cards.ts
async function suggestContext(word_a: string, word_b: string) {
	// Template-based suggestions
	const templates: Record<string, string> = {
		hello: "Common greeting used in daily conversation",
		goodbye: "Farewell expression",
		"thank you": "Expression of gratitude",
		// ... more templates
	};

	const suggestion = templates[word_a.toLowerCase()];

	if (suggestion) {
		showContextSuggestion(suggestion);
	}
}

function showContextSuggestion(suggestion: string) {
	const suggestionDiv = document.getElementById("context-suggestion")!;
	suggestionDiv.innerHTML = `
        <div class="alert alert-info">
            💡 Suggested: "${suggestion}"
            <button class="btn btn-sm btn-link" onclick="useContextSuggestion()">Use This</button>
        </div>
    `;
}
```

**Impact:** 3x faster card creation, richer card content

---

### 5. Card Comments & Reactions (1 day)

**Add discussion to cards:**

```python
# flashcards/models.py
class CardComment(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class CardReaction(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    reaction_type = models.CharField(
        max_length=20,
        choices=[
            ('HELPFUL', '💡 Helpful'),
            ('DIFFICULT', '😰 Difficult'),
            ('FUNNY', '😄 Funny'),
            ('LOVE', '❤️ Love')
        ]
    )

    class Meta:
        unique_together = ('card', 'user', 'reaction_type')
```

```html
<!-- templates/deck_detail.html - Add to card display -->
<div class="card-interactions">
	<div class="reactions">
		<button class="btn btn-sm" onclick="reactToCard({{ card.id }}, 'HELPFUL')">
			💡 {{ card.reactions.filter(type='HELPFUL').count }}
		</button>
		<button
			class="btn btn-sm"
			onclick="reactToCard({{ card.id }}, 'DIFFICULT')">
			😰 {{ card.reactions.filter(type='DIFFICULT').count }}
		</button>
		<!-- ... more reactions -->
	</div>

	<div class="comments mt-2">
		<button class="btn btn-sm btn-link" onclick="showComments({{ card.id }})">
			💬 {{ card.comments.count }} comments
		</button>
	</div>
</div>
```

**Impact:** Enables collaboration on card content, identifies problematic cards

---

### 6. Public Deck Discovery (2 days)

**Browse community decks:**

```python
# flashcards/models.py
class Deck(models.Model):
    # ... existing fields
    is_public = models.BooleanField(default=False)
    times_imported = models.IntegerField(default=0)
    average_rating = models.FloatField(null=True, blank=True)

class DeckRating(models.Model):
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    review = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('deck', 'user')
```

```python
# flashcards/views.py
@login_required
def browse_public_decks(request):
    """Browse community decks"""
    search = request.GET.get('search', '')
    category = request.GET.get('category', '')

    decks = Deck.objects.filter(is_public=True)

    if search:
        decks = decks.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    decks = decks.annotate(
        card_count=Count('cards'),
        rating_count=Count('deckrating')
    ).order_by('-times_imported')

    return render(request, 'browse_decks.html', {'decks': decks})

@login_required
def import_public_deck(request, deck_id):
    """Import public deck to user's account"""
    source_deck = get_object_or_404(Deck, id=deck_id, is_public=True)

    # Create copy
    new_deck = Deck.objects.create(
        title=f"{source_deck.title} (imported)",
        description=source_deck.description,
        created_by=request.user,
        shared=False
    )

    # Copy cards
    for card in source_deck.cards.all():
        Card.objects.create(
            deck=new_deck,
            language_a=card.language_a,
            language_b=card.language_b,
            language_a_code=card.language_a_code,
            language_b_code=card.language_b_code,
            context=card.context
        )

    # Increment import count
    source_deck.times_imported += 1
    source_deck.save()

    return redirect('deck_detail', deck_id=new_deck.id)
```

**Impact:** Community-generated content, reduces content creation burden

---

### 7. Daily Study Goals (4 hours)

**Personal targets with progress tracking:**

```python
# flashcards/models.py
class UserProfile(models.Model):
    # ... existing fields
    daily_goal_cards = models.IntegerField(default=10)
    daily_goal_enabled = models.BooleanField(default=True)
```

```html
<!-- templates/index.html - Dashboard widget -->
<div class="card mb-4">
	<div class="card-header">
		<h5>🎯 Today's Goal</h5>
	</div>
	<div class="card-body">
		<p>Study {{ profile.daily_goal_cards }} cards</p>
		<div class="progress mb-2">
			<div
				class="progress-bar"
				id="goal-progress-bar"
				style="width: {{ goal_percentage }}%">
				{{ cards_today }}/{{ profile.daily_goal_cards }}
			</div>
		</div>
		<small class="text-muted">{{ remaining_cards }} cards to go!</small>
		{% if goal_met %}
		<div class="alert alert-success mt-2">🎉 Goal completed! Great job!</div>
		{% endif %}
	</div>
</div>
```

**Impact:** Daily motivation, habit formation

---

### 8. Smart Reminders (1 day)

**Desktop/mobile notifications:**

```typescript
// src/ts/reminders.ts
async function requestNotificationPermission() {
	if ("Notification" in window && Notification.permission === "default") {
		await Notification.requestPermission();
	}
}

function scheduleStudyReminder(hour: number, minute: number) {
	// Calculate time until reminder
	const now = new Date();
	const reminder = new Date();
	reminder.setHours(hour, minute, 0, 0);

	if (reminder < now) {
		reminder.setDate(reminder.getDate() + 1);
	}

	const delay = reminder.getTime() - now.getTime();

	setTimeout(() => {
		showNotification(
			"Time for your daily review! 📚",
			"You have 5 cards due today"
		);
	}, delay);
}

function showNotification(title: string, body: string) {
	if (Notification.permission === "granted") {
		new Notification(title, {
			body: body,
			icon: "/static/images/logo.png",
		});
	}
}
```

```html
<!-- templates/settings.html -->
<div class="form-group">
	<label>Daily Reminder</label>
	<input
		type="time"
		class="form-control"
		name="reminder_time"
		value="{{ profile.reminder_time }}" />
	<div class="form-check mt-2">
		<input type="checkbox" class="form-check-input" name="email_reminders" />
		<label>Also send email reminders</label>
	</div>
</div>
```

**Impact:** Increases return rate, habit formation

---

### 9. Accessibility Improvements (2-3 days)

**WCAG 2.1 AA compliance:**

- **Screen reader support:**

  - Add ARIA labels to all interactive elements
  - Provide text alternatives for charts
  - Ensure proper heading hierarchy

- **Keyboard navigation:**

  - Test all features with keyboard only
  - Add focus indicators
  - Implement focus trapping in modals

- **Color contrast:**
  - Verify all text meets 4.5:1 contrast ratio
  - Don't rely on color alone for information

```html
<!-- Example improvements -->
<button class="btn btn-primary" aria-label="Study this deck now">
	Study Now
</button>

<img
	src="{{ card.image }}"
	alt="{{ card.language_a }} - {{ card.language_b }}" />

<div
	role="progressbar"
	aria-valuenow="{{ progress }}"
	aria-valuemin="0"
	aria-valuemax="100">
	{{ progress }}%
</div>
```

**Impact:** Makes app usable by broader audience, legal compliance

---

### 10. Mobile Optimization (3 days)

**Touch-first design:**

- **Touch targets:** Minimum 44x44px
- **Swipe gestures:** Swipe to flip cards
- **Responsive modals:** Full-screen on mobile
- **Charts:** Optimize for small screens
- **Images:** Lazy loading, responsive sizes

```css
/* Mobile-specific styles */
@media (max-width: 768px) {
	.btn {
		min-width: 44px;
		min-height: 44px;
		padding: 12px 16px;
	}

	.modal-dialog {
		margin: 0;
		max-width: 100%;
		height: 100vh;
	}

	.flashcard {
		font-size: 1.5rem; /* Larger text on mobile */
	}
}
```

```typescript
// Swipe gesture support
let touchStartX = 0;
let touchEndX = 0;

document.getElementById("flashcard")!.addEventListener("touchstart", e => {
	touchStartX = e.changedTouches[0].screenX;
});

document.getElementById("flashcard")!.addEventListener("touchend", e => {
	touchEndX = e.changedTouches[0].screenX;
	handleSwipe();
});

function handleSwipe() {
	if (touchEndX < touchStartX - 50) {
		// Swipe left - next card
		nextCard();
	}
	if (touchEndX > touchStartX + 50) {
		// Swipe right - previous card (or flip)
		flipCard();
	}
}
```

**Impact:** Better mobile experience, supports on-the-go learning

---

### Data/API Changes

**New Models:**

- `CardComment` - Comments on cards
- `CardReaction` - Reactions (helpful, difficult, etc.)
- `DeckRating` - Ratings for public decks

**Modified Models:**

- `UserProfile` - Add theme, avatar, daily goal, reminders
- `Deck` - Add is_public, times_imported, average_rating
- `Card` - Add image, image_url

**New Endpoints:**

- `GET /api/decks/public/` - Browse public decks
- `POST /api/decks/<id>/import/` - Import public deck
- `POST /api/cards/<id>/comment/` - Add comment
- `POST /api/cards/<id>/react/` - Add reaction
- `POST /api/user/preferences/` - Update preferences

## Notes

**Implementation Priority (within P3):**

1. **Timer hide** (0.5d) - Quick, reduces anxiety
2. **Theme picker** (1d) - High personalization value
3. **Daily goals** (0.5d) - Motivation boost
4. **Avatars** (1d) - Visual personalization
5. **Smart reminders** (1d) - Return rate increase
6. **Enhanced card tools** (5-7d) - Power user features
7. **Public deck discovery** (2d) - Community building
8. **Card comments** (1d) - Collaboration
9. **Accessibility** (2-3d) - Inclusivity (can be ongoing)
10. **Mobile optimization** (3d) - Platform expansion

**Total Estimate:** 17-23 days (3-4 weeks)

**Dependencies:**

- Image support requires file upload handling
- Notifications require browser permission
- Public decks need moderation system (future)
- Mobile optimization requires testing on real devices

**Testing Requirements:**

- Screen reader testing (NVDA, JAWS, VoiceOver)
- Mobile testing (iOS, Android)
- Theme contrast verification
- Notification permission flows

**Phased Rollout:**

- Phase 1: Timer hide, themes, goals (quick wins)
- Phase 2: Avatars, reminders, card tools
- Phase 3: Community features (public decks, comments)
- Phase 4: Accessibility audit and mobile optimization

**Future Considerations:**

- Mobile native apps (React Native / Flutter)
- Offline mode (service workers)
- AI-powered features (context generation, translation suggestions)
- Advanced statistics and analytics
- Multiple partnerships (more than one partner)
- Deck folders and organization
- Export/backup functionality

---

**Tips:** These are "nice-to-have" features that polish the experience. Implement based on user feedback - if users request dark mode or mobile improvements, prioritize those. Otherwise, focus on P0-P2 features first.
