"""
Flashcard application models.

Models:
- Deck: A collection of flashcards
- Card: Individual flashcard with spaced repetition data
- StudySession: Track study sessions
- Review: Individual card reviews within sessions
- Partnership: Link two users for shared deck access
- PartnershipInvitation: Invitation code system for creating partnerships
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import secrets
import string


class Deck(models.Model):
    """
    A deck is a collection of flashcards.

    Can be personal (owned by one user) or shared (via Partnership).
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='decks')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_decks',
        help_text="User who created this deck"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        creator = self.created_by.username if self.created_by else "unknown"
        return f"{self.title} ({creator})"

    def cards_due_count(self):
        """Count cards due for review."""
        return self.cards.filter(next_review__lte=timezone.now()).count()

    def total_cards(self):
        """Return total number of cards in deck."""
        return self.cards.count()

    def is_shared(self):
        """Check if deck is shared via a partnership."""
        return self.partnerships.filter(is_active=True).exists()

    def can_edit(self, user):
        """Check if user has edit permissions."""
        # Creator can always edit
        if self.created_by == user:
            return True
        # Original owner can edit (backward compatibility)
        if self.user == user:
            return True
        # Partner can edit if deck is shared
        partnership = self.partnerships.filter(is_active=True).first()
        if partnership and partnership.has_member(user):
            return True
        return False

    def can_view(self, user):
        """Check if user has view permissions."""
        return self.can_edit(user)  # Same permissions for now


class Card(models.Model):
    """
    Individual flashcard with spaced repetition algorithm data.
    Uses SM-2 algorithm for optimal review scheduling.
    """
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='cards')
    front = models.TextField()  # Question
    back = models.TextField()   # Answer
    created_at = models.DateTimeField(auto_now_add=True)

    # Spaced Repetition fields (SM-2 Algorithm)
    ease_factor = models.FloatField(default=2.5)  # How "easy" the card is
    interval = models.IntegerField(default=1)      # Days until next review
    repetitions = models.IntegerField(default=0)   # Successful reviews in a row
    next_review = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.front[:50]}..."

    def is_due(self):
        """Check if card is due for review."""
        return self.next_review <= timezone.now()


class StudySession(models.Model):
    """
    Tracks a study session for analytics and progress tracking.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_sessions')
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='sessions')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    cards_studied = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username} - {self.deck.title} - {self.started_at}"


class Review(models.Model):
    """
    Individual card review within a study session.
    Stores quality rating and time taken for analytics.
    """
    QUALITY_CHOICES = [
        (0, 'Complete blackout'),
        (1, 'Incorrect, but familiar'),
        (2, 'Incorrect, but easy to recall'),
        (3, 'Correct, but difficult'),
        (4, 'Correct, with hesitation'),
        (5, 'Perfect response'),
    ]

    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='reviews')
    session = models.ForeignKey(StudySession, on_delete=models.CASCADE, related_name='reviews')
    quality = models.IntegerField(choices=QUALITY_CHOICES)  # User's self-rating
    reviewed_at = models.DateTimeField(auto_now_add=True)
    time_taken = models.IntegerField()  # seconds

    def __str__(self):
        return f"{self.card} - Quality: {self.quality}"


class Partnership(models.Model):
    """
    Links two users together for shared deck access.

    Users can form partnerships to collaboratively create and study
    flashcard decks. Only one active partnership per user is allowed.
    """
    user_a = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='partnerships_as_a',
        help_text="First partner in the relationship"
    )
    user_b = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='partnerships_as_b',
        help_text="Second partner in the relationship"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(
        default=True,
        help_text="False when partnership is dissolved (soft delete)"
    )

    # Shared decks (many-to-many relationship)
    decks = models.ManyToManyField(
        'Deck',
        related_name='partnerships',
        blank=True,
        help_text="Decks shared between partners"
    )

    class Meta:
        unique_together = [['user_a', 'user_b']]
        indexes = [
            models.Index(fields=['user_a', 'is_active']),
            models.Index(fields=['user_b', 'is_active']),
        ]

    def __str__(self):
        return f"{self.user_a.username} ↔ {self.user_b.username}"

    def get_partner(self, user):
        """Get the other user in the partnership."""
        if user == self.user_a:
            return self.user_b
        elif user == self.user_b:
            return self.user_a
        else:
            raise ValueError(f"User {user} is not in this partnership")

    def has_member(self, user):
        """Check if user is in this partnership."""
        return user in [self.user_a, self.user_b]


class PartnershipInvitation(models.Model):
    """
    Invitation code system for creating partnerships.

    Allows users to invite others to form a partnership by sharing
    a unique 6-character code. Invitations expire after 7 days.
    """
    inviter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_invitations',
        help_text="User who created the invitation"
    )
    code = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
        help_text="Unique 6-character invitation code"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="Invitation expires after 7 days")
    accepted_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='accepted_invitations',
        help_text="User who accepted the invitation"
    )
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['inviter', 'expires_at']),
        ]

    def __str__(self):
        status = "accepted" if self.accepted_by else "pending"
        return f"{self.code} ({self.inviter.username}) - {status}"

    @staticmethod
    def generate_code():
        """Generate unique 6-character alphanumeric code."""
        while True:
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
            if not PartnershipInvitation.objects.filter(code=code).exists():
                return code

    def is_valid(self):
        """Check if invitation is still valid."""
        return (
            self.accepted_by is None and
            self.expires_at > timezone.now()
        )

    def save(self, *args, **kwargs):
        """Auto-generate code and expiration if not set."""
        if not self.code:
            self.code = self.generate_code()
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
