# RFC 0014: P2 Engagement Boosters

**Status**: Draft
**Created**: 2025-11-11

---

## What are we building?

Six engagement-focused features to gamify learning and increase retention: (1) achievement badges system, (2) deck templates library, (3) study mode variety, (4) online status indicators, (5) friendly leaderboard, and (6) collaborative goals.

## Why?

User testing shows strong core functionality but limited engagement mechanisms. Users complete their immediate tasks but lack motivation to return regularly. These features target:

- **40% better 7-day retention** through gamification
- **60% partnership adoption** (up from 30%) through better social features
- **50% more study sessions** through variety and goals
- **20x faster initial deck population** with templates

Social and gamification elements proven to increase educational app engagement in competitive analysis (Quizlet, Memrise).

## How?

### 1. Achievement Badges System (2 days)

**Badge Categories (15+ badges):**

**Study Achievements:**
- 🔥 "Streak Master" - 7 day streak
- 🌟 "Century Club" - 100 cards studied
- 🎯 "Perfectionist" - 50 cards rated 5
- 🏃 "Speed Demon" - 30 cards in one session
- 🌙 "Night Owl" - Study after 10 PM

**Social Achievements:**
- 🤝 "First Partner" - Create first partnership
- 👥 "Collaborator" - Add 20 cards to shared deck
- 🎁 "Card Creator" - Create 100 cards

**Milestone Achievements:**
- 📚 "Polyglot" - Study 3 different languages
- 🏆 "Dedicated" - 30 day streak
- 💎 "Expert" - 1000 cards studied

**Database Schema:**
```python
# flashcards/models.py
class Achievement(models.Model):
    code = models.CharField(max_length=50, unique=True)  # e.g., 'STREAK_7'
    name = models.CharField(max_length=100)  # "Streak Master"
    description = models.TextField()
    icon = models.CharField(max_length=10)  # Emoji
    category = models.CharField(
        max_length=20,
        choices=[
            ('STUDY', 'Study'),
            ('SOCIAL', 'Social'),
            ('MILESTONE', 'Milestone')
        ]
    )
    points = models.IntegerField(default=10)  # For future leaderboard

    def __str__(self):
        return f"{self.icon} {self.name}"

class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(auto_now_add=True)
    is_displayed = models.BooleanField(default=True)  # Show on profile
    progress = models.IntegerField(default=0)  # For multi-step achievements

    class Meta:
        unique_together = ('user', 'achievement')
```

**Achievement Checking:**
```python
# flashcards/achievements.py - New file
from django.db.models.signals import post_save
from django.dispatch import receiver

def check_and_unlock_achievement(user, achievement_code):
    """Check if user meets criteria and unlock badge"""
    try:
        achievement = Achievement.objects.get(code=achievement_code)
        UserAchievement.objects.get_or_create(
            user=user,
            achievement=achievement
        )
        return True
    except Achievement.DoesNotExist:
        return False

@receiver(post_save, sender=StudySession)
def check_study_achievements(sender, instance, created, **kwargs):
    """Check study-related achievements after session"""
    if not created:
        return

    user = instance.user

    # Check streak
    streak = user.get_current_streak()
    if streak == 7:
        check_and_unlock_achievement(user, 'STREAK_7')
    elif streak == 30:
        check_and_unlock_achievement(user, 'STREAK_30')

    # Check total cards
    total_cards = StudySession.objects.filter(user=user).aggregate(
        total=models.Sum('cards_studied')
    )['total'] or 0

    if total_cards >= 100:
        check_and_unlock_achievement(user, 'CENTURY_CLUB')
    if total_cards >= 1000:
        check_and_unlock_achievement(user, 'EXPERT')

    # Check perfect ratings
    perfect_count = Review.objects.filter(user=user, quality=5).count()
    if perfect_count >= 50:
        check_and_unlock_achievement(user, 'PERFECTIONIST')

@receiver(post_save, sender=Partnership)
def check_partnership_achievements(sender, instance, created, **kwargs):
    """Check partnership achievements"""
    if not created:
        return

    # Unlock "First Partner" for both users
    check_and_unlock_achievement(instance.user_a, 'FIRST_PARTNER')
    check_and_unlock_achievement(instance.user_b, 'FIRST_PARTNER')
```

**Display UI:**
```html
<!-- templates/profile.html - New page -->
<div class="achievement-showcase">
    <h3>🏆 Your Achievements</h3>

    <div class="row">
        {% for user_achievement in user.achievements.all %}
            <div class="col-md-3 mb-3">
                <div class="achievement-card unlocked">
                    <div class="achievement-icon">{{ user_achievement.achievement.icon }}</div>
                    <h5>{{ user_achievement.achievement.name }}</h5>
                    <p class="small">{{ user_achievement.achievement.description }}</p>
                    <small class="text-muted">
                        Unlocked {{ user_achievement.unlocked_at|date:"M d, Y" }}
                    </small>
                </div>
            </div>
        {% endfor %}

        <!-- Show locked achievements -->
        {% for achievement in locked_achievements %}
            <div class="col-md-3 mb-3">
                <div class="achievement-card locked">
                    <div class="achievement-icon grayscale">{{ achievement.icon }}</div>
                    <h5>???</h5>
                    <p class="small">{{ achievement.description }}</p>
                    <div class="progress">
                        <div class="progress-bar" style="width: {{ achievement.progress }}%"></div>
                    </div>
                    <small>{{ achievement.progress_text }}</small>
                </div>
            </div>
        {% endfor %}
    </div>
</div>
```

**Unlock Notification:**
```typescript
// src/ts/achievements.ts
function showAchievementUnlock(achievement: Achievement) {
    // Confetti
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });

    // Popup
    showModal('Achievement Unlocked!', `
        <div class="text-center">
            <div class="achievement-unlock">
                <div class="achievement-icon-large">${achievement.icon}</div>
                <h3>${achievement.name}</h3>
                <p>${achievement.description}</p>
                <p class="text-muted">+${achievement.points} points</p>
            </div>
            <button class="btn btn-primary" onclick="closeModal()">Awesome! ✨</button>
        </div>
    `);
}
```

**Impact:** Provides extrinsic motivation, increases engagement through gamification

---

### 2. Deck Templates Library (2-3 days)

**Create 15-20 pre-made decks** across categories to eliminate blank slate problem.

**Template Categories:**
1. **Travel Languages** (5 decks)
   - Spanish for Travelers (50 cards)
   - French Travel Essentials (40 cards)
   - German Basics (30 cards)
   - Italian Restaurant & Shopping (35 cards)
   - Japanese Survival Phrases (45 cards)

2. **Professional** (3 decks)
   - Business English (60 cards)
   - Medical Terminology (100 cards)
   - Tech Interview Prep (80 cards)

3. **Academic** (4 decks)
   - SAT Vocabulary (200 cards)
   - Spanish 101 (100 cards)
   - German A1 Level (120 cards)
   - French Verbs (80 cards)

**Database Schema:**
```python
# flashcards/models.py
class DeckTemplate(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(
        max_length=50,
        choices=[
            ('TRAVEL', 'Travel'),
            ('PROFESSIONAL', 'Professional'),
            ('ACADEMIC', 'Academic'),
            ('HOBBY', 'Hobby')
        ]
    )
    language_a_code = models.CharField(max_length=10)
    language_b_code = models.CharField(max_length=10)
    card_count = models.IntegerField()
    times_imported = models.IntegerField(default=0)
    is_public = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

class TemplateCard(models.Model):
    template = models.ForeignKey(DeckTemplate, on_delete=models.CASCADE, related_name='cards')
    language_a = models.TextField()
    language_b = models.TextField()
    context = models.TextField(blank=True)
    order = models.IntegerField(default=0)
```

**Template Browser UI:**
```html
<!-- templates/templates.html - New page -->
<div class="template-browser">
    <h2>📚 Deck Templates</h2>
    <p class="lead">Start studying in seconds with pre-made decks</p>

    <!-- Filters -->
    <div class="filters mb-4">
        <button class="btn btn-outline-primary" data-category="all">All</button>
        <button class="btn btn-outline-primary" data-category="TRAVEL">Travel</button>
        <button class="btn btn-outline-primary" data-category="PROFESSIONAL">Professional</button>
        <button class="btn btn-outline-primary" data-category="ACADEMIC">Academic</button>
    </div>

    <!-- Search -->
    <input type="text" class="form-control mb-4" placeholder="Search templates..." id="template-search">

    <!-- Template Grid -->
    <div class="row" id="template-grid">
        {% for template in templates %}
            <div class="col-md-4 mb-4 template-item" data-category="{{ template.category }}">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">{{ template.title }}</h5>
                        <p class="card-text">{{ template.description }}</p>
                        <p class="text-muted small">
                            {{ template.language_a_code|upper }} → {{ template.language_b_code|upper }} |
                            {{ template.card_count }} cards
                        </p>
                        <p class="text-muted small">
                            🔽 {{ template.times_imported }} imports
                        </p>
                        <button class="btn btn-primary btn-sm" onclick="previewTemplate({{ template.id }})">
                            Preview
                        </button>
                        <button class="btn btn-success btn-sm" onclick="importTemplate({{ template.id }})">
                            Use Template
                        </button>
                    </div>
                </div>
            </div>
        {% endfor %}
    </div>
</div>
```

**Import Endpoint:**
```python
# flashcards/views.py
@login_required
def import_template(request, template_id):
    """Create deck from template"""
    template = get_object_or_404(DeckTemplate, id=template_id)

    # Create deck
    deck = Deck.objects.create(
        title=template.title,
        description=f"{template.description} (from template)",
        created_by=request.user,
        shared=False
    )

    # Bulk create cards
    cards_to_create = []
    for template_card in template.cards.all():
        card = Card(
            deck=deck,
            language_a=template_card.language_a,
            language_b=template_card.language_b,
            language_a_code=template.language_a_code,
            language_b_code=template.language_b_code,
            context=template_card.context
        )
        cards_to_create.append(card)

    Card.objects.bulk_create(cards_to_create)

    # Increment import count
    template.times_imported += 1
    template.save()

    return JsonResponse({
        'success': True,
        'data': {'deck_id': deck.id, 'card_count': len(cards_to_create)}
    })
```

**Seeding Templates:**
```python
# flashcards/management/commands/seed_templates.py
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    def handle(self, *args, **options):
        # Create Spanish for Travelers template
        spanish_travel = DeckTemplate.objects.create(
            title="Spanish for Travelers",
            description="Essential Spanish phrases for travel",
            category="TRAVEL",
            language_a_code="en",
            language_b_code="es",
            card_count=50
        )

        cards = [
            ("Hello", "Hola", "Common greeting"),
            ("Goodbye", "Adiós", "Common farewell"),
            ("Thank you", "Gracias", "Expression of gratitude"),
            # ... 47 more cards
        ]

        for lang_a, lang_b, context in cards:
            TemplateCard.objects.create(
                template=spanish_travel,
                language_a=lang_a,
                language_b=lang_b,
                context=context
            )

        # Create more templates...
```

**Impact:** 20x faster deck population, eliminates blank slate problem

---

### 3. Study Mode Variety (1-2 days)

**Four new study modes** to prevent monotony:

**3.1 Quick Review Mode (2 hours)**
```python
# flashcards/views.py - Modify study session endpoint
@login_required
def start_study_session(request, deck_id):
    mode = request.data.get('mode', 'standard')
    card_limit = request.data.get('card_limit')

    if mode == 'quick':
        card_limit = 5

    # ... existing logic with card_limit applied
```

**3.2 Speed Round Mode (4 hours)**
```typescript
// src/ts/study.ts
async function startSpeedRound(deckId: number) {
    let cardsCompleted = 0;
    let timeRemaining = 60; // seconds

    const timer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay(timeRemaining);

        if (timeRemaining <= 0) {
            endSpeedRound(cardsCompleted);
            clearInterval(timer);
        }
    }, 1000);

    // Auto-advance on rating
    // Track cards per minute
}
```

**3.3 Mixed Partnership Mode (3 hours)**
```python
# flashcards/views.py
@login_required
def start_mixed_partnership_session(request):
    """Study random cards from all shared decks"""
    partnerships = get_user_partnerships(request.user)
    shared_decks = get_shared_decks_for_partnerships(partnerships)

    # Get due cards from all shared decks
    all_due_cards = []
    for deck in shared_decks:
        due_cards = get_due_cards(deck, request.user)
        all_due_cards.extend(due_cards)

    # Shuffle
    random.shuffle(all_due_cards)

    # Return up to 20 cards
    return JsonResponse({
        'success': True,
        'data': {
            'cards': all_due_cards[:20],
            'mode': 'mixed_partnership'
        }
    })
```

**3.4 Typing Test Mode (1 day)**
```typescript
// src/ts/study.ts
async function startTypingMode(deckId: number) {
    // Show question
    // User types answer in input field
    // Fuzzy match checking

    function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
        // Use levenshtein distance or similar
        const similarity = calculateSimilarity(userAnswer, correctAnswer);

        if (similarity >= 0.9) {
            showFeedback('correct', '✓ Perfect!');
            return true;
        } else if (similarity >= 0.7) {
            showFeedback('close', `Close! Correct answer: ${correctAnswer}`);
            return false;
        } else {
            showFeedback('wrong', `Incorrect. Answer: ${correctAnswer}`);
            return false;
        }
    }
}
```

**Mode Selection UI:**
```html
<!-- Add to study button area -->
<div class="dropdown">
    <button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown">
        Study Now
    </button>
    <ul class="dropdown-menu">
        <li><a class="dropdown-item" onclick="startStudy('standard')">📚 Standard</a></li>
        <li><a class="dropdown-item" onclick="startStudy('quick')">⚡ Quick Review (5 cards)</a></li>
        <li><a class="dropdown-item" onclick="startStudy('speed')">⏱️ Speed Round</a></li>
        <li><a class="dropdown-item" onclick="startStudy('typing')">⌨️ Typing Test</a></li>
        <li><a class="dropdown-item" onclick="startStudy('mixed')">🔀 Mixed (All Shared)</a></li>
    </ul>
</div>
```

**Impact:** Increases variety, prevents boredom, targets different learning styles

---

### 4. Online Status Indicators (3-4 hours polling, 1 day WebSocket)

**Simple Polling Implementation:**

```python
# flashcards/models.py - Add to User or UserProfile
class UserProfile(models.Model):
    # ... existing fields
    last_active = models.DateTimeField(auto_now=True)

    def is_online(self):
        """User is online if active within last 5 minutes"""
        threshold = timezone.now() - timedelta(minutes=5)
        return self.last_active >= threshold
```

**Update last_active middleware:**
```python
# flashcards/middleware.py - New file
class UpdateLastActiveMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Update timestamp on any request
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            profile.last_active = timezone.now()
            profile.save(update_fields=['last_active'])

        response = self.get_response(request)
        return response
```

**API Endpoint:**
```python
# flashcards/views.py
@login_required
def get_partner_status(request):
    """Get partner's online status"""
    partnership = get_user_partnership(request.user)
    if not partnership:
        return JsonResponse({'error': 'No partnership'})

    partner = get_partner_user(request.user, partnership)
    profile = partner.userprofile

    return JsonResponse({
        'success': True,
        'data': {
            'username': partner.username,
            'is_online': profile.is_online(),
            'last_active': profile.last_active.isoformat()
        }
    })
```

**Frontend Polling:**
```typescript
// src/ts/partnership.ts
async function pollPartnerStatus() {
    const response = await api.fetch('/api/partnership/status/');
    const data = await response.json();

    updatePartnerStatusIndicator(data);
}

function updatePartnerStatusIndicator(status: PartnerStatus) {
    const indicator = document.getElementById('partner-status-indicator')!;

    if (status.is_online) {
        indicator.className = 'status-indicator online';
        indicator.title = 'Online now';
    } else {
        indicator.className = 'status-indicator offline';
        const lastActive = formatTimeAgo(status.last_active);
        indicator.title = `Last active ${lastActive}`;
    }
}

// Poll every 30 seconds
setInterval(pollPartnerStatus, 30000);
```

**Display:**
```html
<!-- templates/index.html - Partnership card -->
<div class="partnership-info">
    <span class="status-indicator" id="partner-status-indicator"></span>
    <strong>@{{ partner.username }}</strong>
    <small id="partner-status-text">Loading...</small>
</div>
```

**CSS:**
```css
.status-indicator {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 5px;
}

.status-indicator.online {
    background-color: #28a745;
    box-shadow: 0 0 5px #28a745;
}

.status-indicator.offline {
    background-color: #6c757d;
}
```

**Impact:** Makes partnership feel more connected, real-time presence awareness

---

### 5. Friendly Leaderboard (1 day)

**Partner Comparison Widget on Dashboard:**

```python
# flashcards/views.py
@login_required
def get_partner_comparison(request):
    """Get this week's stats comparison with partner"""
    partnership = get_user_partnership(request.user)
    if not partnership:
        return JsonResponse({'error': 'No partnership'})

    partner = get_partner_user(request.user, partnership)
    week_start = timezone.now() - timedelta(days=7)

    # Get stats for both users
    user_stats = get_weekly_stats(request.user, week_start)
    partner_stats = get_weekly_stats(partner, week_start)

    return JsonResponse({
        'success': True,
        'data': {
            'user': user_stats,
            'partner': partner_stats,
            'categories': ['Cards Studied', 'Study Time', 'Perfect Ratings', 'Streak']
        }
    })

def get_weekly_stats(user, since):
    sessions = StudySession.objects.filter(user=user, created_at__gte=since)

    return {
        'username': user.username,
        'cards_studied': sessions.aggregate(Sum('cards_studied'))['cards_studied__sum'] or 0,
        'study_time_minutes': sessions.aggregate(Sum('duration'))['duration__sum'] or 0,
        'perfect_ratings': Review.objects.filter(user=user, quality=5, created_at__gte=since).count(),
        'current_streak': user.get_current_streak()
    }
```

**Display Widget:**
```html
<!-- templates/index.html -->
<div class="card mb-4">
    <div class="card-header">
        <h5 class="mb-0">📊 This Week's Progress</h5>
    </div>
    <div class="card-body">
        <div class="comparison-stat">
            <label>Cards Studied</label>
            <div class="progress-bars">
                <div class="user-bar">
                    <strong>You</strong>
                    <div class="progress">
                        <div class="progress-bar bg-primary" id="user-cards-bar"></div>
                    </div>
                    <span id="user-cards-count"></span>
                </div>
                <div class="partner-bar">
                    <strong id="partner-name"></strong>
                    <div class="progress">
                        <div class="progress-bar bg-info" id="partner-cards-bar"></div>
                    </div>
                    <span id="partner-cards-count"></span>
                </div>
            </div>
        </div>

        <div class="encouragement text-center mt-3" id="encouragement-message">
            <!-- Dynamic: "You're ahead by 13!" or "Great teamwork! 🎉" -->
        </div>
    </div>
</div>
```

**Encouraging Messages:**
```typescript
// src/ts/stats.ts
function generateEncouragementMessage(userCount: number, partnerCount: number): string {
    const diff = Math.abs(userCount - partnerCount);

    if (diff === 0) {
        return "Perfect tie! Great teamwork! 🤝";
    } else if (diff < 5) {
        return "Neck and neck! Keep it up! 🏃";
    } else if (userCount > partnerCount) {
        return `You're ahead by ${diff}! 🎯`;
    } else {
        return `Your partner is ahead by ${diff}. You can catch up! 💪`;
    }
}
```

**Impact:** Friendly competition without negative pressure, motivates both users

---

### 6. Collaborative Goals (1.5 days)

**Shared Partnership Goals:**

```python
# flashcards/models.py
class PartnershipGoal(models.Model):
    partnership = models.ForeignKey(Partnership, on_delete=models.CASCADE)
    goal_type = models.CharField(
        max_length=50,
        choices=[
            ('WEEKLY_CARDS', 'Study X cards this week'),
            ('DECK_COMPLETION', 'Complete deck together'),
            ('STREAK_CHALLENGE', 'Both maintain 7-day streak'),
            ('SPEED_CHALLENGE', 'Complete deck in one day')
        ]
    )
    target_value = models.IntegerField()  # e.g., 100 cards
    current_value = models.IntegerField(default=0)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField()
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True)

    def progress_percentage(self):
        return min(100, int((self.current_value / self.target_value) * 100))

class GoalContribution(models.Model):
    goal = models.ForeignKey(PartnershipGoal, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    contribution = models.IntegerField(default=0)
```

**Goal Creation UI:**
```html
<!-- templates/partnership.html -->
<div class="card mb-4">
    <div class="card-header">
        <h5>🎯 Collaborative Goals</h5>
    </div>
    <div class="card-body">
        <button class="btn btn-primary" onclick="showCreateGoalModal()">
            Create New Goal
        </button>

        <!-- Active Goals -->
        <div id="active-goals">
            {% for goal in active_goals %}
                <div class="goal-card">
                    <h6>{{ goal.get_goal_type_display }}</h6>
                    <div class="progress mb-2">
                        <div class="progress-bar" style="width: {{ goal.progress_percentage }}%">
                            {{ goal.current_value }}/{{ goal.target_value }}
                        </div>
                    </div>
                    <div class="contributions">
                        <small>Your contribution: {{ goal.user_contribution }}</small><br>
                        <small>Partner: {{ goal.partner_contribution }}</small>
                    </div>
                    <small class="text-muted">Ends {{ goal.end_date|date:"M d" }}</small>
                </div>
            {% endfor %}
        </div>
    </div>
</div>
```

**Goal Progress Update:**
```python
# flashcards/signals.py
@receiver(post_save, sender=StudySession)
def update_goal_progress(sender, instance, created, **kwargs):
    """Update collaborative goals after study session"""
    if not created:
        return

    user = instance.user
    partnerships = get_user_partnerships(user)

    for partnership in partnerships:
        # Find active weekly card goals
        goals = PartnershipGoal.objects.filter(
            partnership=partnership,
            goal_type='WEEKLY_CARDS',
            is_completed=False,
            end_date__gte=timezone.now()
        )

        for goal in goals:
            # Update goal progress
            goal.current_value += instance.cards_studied
            goal.save()

            # Update user contribution
            contrib, _ = GoalContribution.objects.get_or_create(
                goal=goal,
                user=user
            )
            contrib.contribution += instance.cards_studied
            contrib.save()

            # Check if completed
            if goal.current_value >= goal.target_value:
                goal.is_completed = True
                goal.completed_at = timezone.now()
                goal.save()

                # Notify both users - trigger celebration
                notify_goal_completed(partnership, goal)
```

**Celebration on Goal Completion:**
```typescript
// src/ts/partnership.ts
function onGoalCompleted(goal: Goal) {
    // Big confetti
    confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
    });

    // Show achievement
    showModal('Goal Completed! 🎉', `
        <div class="text-center">
            <h3>${goal.title}</h3>
            <p>You and your partner studied <strong>${goal.target_value} cards</strong> together!</p>
            <p>Your contribution: ${goal.user_contribution} cards</p>
            <p>Partner's contribution: ${goal.partner_contribution} cards</p>
            <button class="btn btn-primary">Celebrate! 🎊</button>
        </div>
    `);
}
```

**Impact:** Creates shared accountability, increases partnership engagement

---

### Data/API Changes

**New Models:**
- `Achievement` - Badge definitions
- `UserAchievement` - User's unlocked badges
- `DeckTemplate` - Pre-made deck templates
- `TemplateCard` - Cards within templates
- `PartnershipGoal` - Shared goals
- `GoalContribution` - Individual contributions

**New Endpoints:**
- `GET /api/templates/` - List templates
- `POST /api/templates/<id>/import/` - Import template
- `GET /api/achievements/` - List user's achievements
- `GET /api/partnership/status/` - Partner online status
- `GET /api/partnership/comparison/` - Weekly stats comparison
- `POST /api/partnership/goals/` - Create goal
- `GET /api/partnership/goals/` - List active goals

**Modified Endpoints:**
- `POST /api/decks/<id>/study/` - Add mode parameter (quick, speed, typing, mixed)

## Notes

**Implementation Priority:**
1. **Deck templates** (2-3d) - Biggest onboarding improvement
2. **Achievement badges** (2d) - Core gamification system
3. **Online status** (3-4h) - Quick win for social connection
4. **Study modes** (1-2d) - Adds variety
5. **Leaderboard** (1d) - Friendly competition
6. **Collaborative goals** (1.5d) - Deep partnership engagement

**Total Estimate:** 10-12 days

**Dependencies:**
- Achievement system needs signal handlers
- Templates require data seeding command
- Online status needs middleware

**Testing Requirements:**
- Test achievement unlock conditions
- Verify template imports create cards correctly
- Test goal progress updates in real-time
- Confirm online status polling doesn't overload DB

**Quick Wins:**
- Online status (3-4h) - high social impact
- Simple achievements (select 5 badges to start)
- 3-4 starter templates (instead of 15-20)

**Future Enhancements:**
- WebSocket for real-time status (replace polling)
- AI-powered template recommendations
- Public template marketplace
- Multi-user goals (more than 2 people)

---

**Tips:** Start with templates (eliminates blank slate) and basic achievements (3-5 badges). These provide immediate value. Add online status for social connection, then expand achievement system gradually.
