"""
Utility functions for flashcard application.

Includes:
- SM-2 Spaced Repetition Algorithm
- Helper functions for card scheduling
"""

from datetime import timedelta
from django.utils import timezone


def calculate_next_review(card, quality):
    """
    SM-2 Algorithm for spaced repetition.

    Args:
        card: Card model instance
        quality: int (0-5) - user's self-assessment
            0 - Complete blackout
            1 - Incorrect, but familiar
            2 - Incorrect, but easy to recall
            3 - Correct, but difficult
            4 - Correct, with hesitation
            5 - Perfect response

    Returns:
        Card instance with updated:
        - ease_factor
        - interval
        - repetitions
        - next_review

    Algorithm:
        - If quality < 3: Failed, reset repetitions
        - If quality >= 3: Success, increase interval
        - Adjust ease_factor based on performance
    """
    if quality < 3:
        # Failed: reset repetitions, review tomorrow
        card.repetitions = 0
        card.interval = 1
    else:
        # Passed: increase interval
        if card.repetitions == 0:
            card.interval = 1
        elif card.repetitions == 1:
            card.interval = 6
        else:
            card.interval = round(card.interval * card.ease_factor)

        card.repetitions += 1

    # Adjust ease factor based on performance
    card.ease_factor = max(
        1.3,
        card.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )

    # Set next review date
    card.next_review = timezone.now() + timedelta(days=card.interval)

    return card


def get_due_cards(deck):
    """
    Get all cards due for review in a deck.

    Args:
        deck: Deck model instance

    Returns:
        QuerySet of Card instances due for review
    """
    return deck.cards.filter(next_review__lte=timezone.now()).order_by('next_review')


def get_study_stats(user, deck=None):
    """
    Calculate study statistics for a user or specific deck.

    Args:
        user: User model instance
        deck: Optional Deck model instance for deck-specific stats

    Returns:
        dict with statistics:
        - total_cards_studied
        - average_quality
        - study_streak_days
        - cards_due_today
        - recent_activity (last 7 days)
        - etc.
    """
    from .models import Review, Card, Deck, StudySession
    from django.db.models import Avg, Count, Sum
    from django.db.models.functions import TruncDate

    # Filter reviews by deck if specified
    if deck:
        reviews = Review.objects.filter(card__deck=deck)
        cards = Card.objects.filter(deck=deck)
        total_decks = 1
    else:
        reviews = Review.objects.filter(session__user=user)
        cards = Card.objects.filter(deck__user=user)
        total_decks = Deck.objects.filter(user=user).count()

    # Basic statistics
    total_reviews = reviews.count()
    total_cards = cards.count()

    # Average quality
    avg_quality_result = reviews.aggregate(Avg('quality'))
    average_quality = round(avg_quality_result['quality__avg'] or 0, 2)

    # Cards due today
    cards_due_today = cards.filter(next_review__lte=timezone.now()).count()

    # Study streak (simplified: check if user studied in last 24h)
    yesterday = timezone.now() - timedelta(days=1)
    studied_recently = reviews.filter(reviewed_at__gte=yesterday).exists()
    study_streak_days = 1 if studied_recently else 0

    # Recent activity (last 7 days)
    recent_activity = []
    for i in range(7):
        date = timezone.now() - timedelta(days=i)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)

        day_reviews = reviews.filter(reviewed_at__gte=day_start, reviewed_at__lte=day_end)
        cards_studied = day_reviews.count()

        # Sum up time_taken for all reviews on this day
        time_result = day_reviews.aggregate(Sum('time_taken'))
        time_spent = time_result['time_taken__sum'] or 0

        recent_activity.append({
            'date': day_start.strftime('%Y-%m-%d'),
            'cards_studied': cards_studied,
            'time_spent': time_spent,
        })

    # Reverse to get chronological order (oldest to newest)
    recent_activity.reverse()

    return {
        'total_reviews': total_reviews,
        'total_cards': total_cards,
        'average_quality': average_quality,
        'cards_due_today': cards_due_today,
        'study_streak_days': study_streak_days,
        'total_decks': total_decks,
        'recent_activity': recent_activity,
    }
