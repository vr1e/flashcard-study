"""
Flashcard application models.

Models:
- Deck: A collection of flashcards
- Card: Individual flashcard with spaced repetition data
- StudySession: Track study sessions
- Review: Individual card reviews within sessions
"""

from django.db import models
from django.contrib.auth.models import User
from datetime import datetime, timedelta


class Deck(models.Model):
    """
    A deck is a collection of flashcards owned by a user.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='decks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.user.username})"

    def cards_due_count(self):
        """Count cards due for review."""
        return self.cards.filter(next_review__lte=datetime.now()).count()

    def total_cards(self):
        """Return total number of cards in deck."""
        return self.cards.count()


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
    next_review = models.DateTimeField(default=datetime.now)

    def __str__(self):
        return f"{self.front[:50]}..."

    def is_due(self):
        """Check if card is due for review."""
        return self.next_review <= datetime.now()


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
