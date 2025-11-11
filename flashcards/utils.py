"""
Utility functions for flashcard application.

Includes:
- SM-2 Spaced Repetition Algorithm
- Helper functions for card scheduling
"""

from datetime import timedelta
from django.utils import timezone


def calculate_next_review(progress, quality):
    """
    SM-2 Algorithm for spaced repetition (new version for UserCardProgress).

    Args:
        progress: UserCardProgress model instance (or Card for legacy support)
        quality: int (0-5) - user's self-assessment
            0 - Complete blackout
            1 - Incorrect, but familiar
            2 - Incorrect, but easy to recall
            3 - Correct, but difficult
            4 - Correct, with hesitation
            5 - Perfect response

    Returns:
        Updated progress/card instance with:
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
        progress.repetitions = 0
        progress.interval = 1
    else:
        # Passed: increase interval
        if progress.repetitions == 0:
            progress.interval = 1
        elif progress.repetitions == 1:
            progress.interval = 6
        else:
            progress.interval = round(progress.interval * progress.ease_factor)

        progress.repetitions += 1

    # Adjust ease factor based on performance
    # EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
    progress.ease_factor = max(
        1.3,
        progress.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )

    # Set next review date
    progress.next_review = timezone.now() + timedelta(days=progress.interval)

    return progress


def get_due_cards(deck):
    """
    Get all cards due for review in a deck.

    Args:
        deck: Deck model instance

    Returns:
        QuerySet of Card instances due for review
    """
    return deck.cards.filter(next_review__lte=timezone.now()).order_by('next_review')


def get_study_stats(user, deck=None, deck_filter=None):
    """
    Calculate study statistics for a user or specific deck.

    Args:
        user: User model instance
        deck: Optional Deck model instance for deck-specific stats
        deck_filter: Optional queryset of Deck instances to filter by (for courses/collections)

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

    # Initialize separate counts (may not be available for specific deck/filter)
    personal_decks_count = None
    shared_decks_count = None
    personal_cards_count = None
    shared_cards_count = None

    # Filter reviews by deck if specified
    if deck:
        reviews = Review.objects.filter(card__deck=deck)
        cards = Card.objects.filter(deck=deck)
        total_decks = 1
    elif deck_filter is not None:
        # Filter by specific set of decks (courses or collections)
        reviews = Review.objects.filter(session__user=user, card__deck__in=deck_filter)
        cards = Card.objects.filter(deck__in=deck_filter)
        total_decks = deck_filter.count()
    else:
        from django.db.models import Q

        reviews = Review.objects.filter(session__user=user)

        # Separate personal and shared decks for breakdown
        personal_decks = Deck.objects.filter(user=user).distinct()

        shared_decks = Deck.objects.filter(
            Q(partnerships__user_a=user, partnerships__is_active=True) |
            Q(partnerships__user_b=user, partnerships__is_active=True)
        ).exclude(user=user).distinct()

        # Include both owned decks and partnership decks
        user_decks = personal_decks | shared_decks

        cards = Card.objects.filter(deck__in=user_decks)
        total_decks = user_decks.count()
        personal_decks_count = personal_decks.count()
        shared_decks_count = shared_decks.count()

        # Separate card counts
        personal_cards_count = Card.objects.filter(deck__in=personal_decks).count()
        shared_cards_count = Card.objects.filter(deck__in=shared_decks).count()

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

    result = {
        'total_reviews': total_reviews,
        'total_cards': total_cards,
        'average_quality': average_quality,
        'cards_due_today': cards_due_today,
        'study_streak_days': study_streak_days,
        'total_decks': total_decks,
        'recent_activity': recent_activity,
    }

    # Add separate counts if available (when not filtering by specific deck)
    if personal_decks_count is not None:
        result['personal_decks'] = personal_decks_count
        result['shared_decks'] = shared_decks_count
        result['personal_cards'] = personal_cards_count
        result['shared_cards'] = shared_cards_count

    return result
