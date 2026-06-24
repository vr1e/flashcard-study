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
    from .models import Review, Card, Deck, StudySession, UserCardProgress
    from django.db.models import Avg, Count, Sum, Q
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
        decks_in_scope = Deck.objects.filter(pk=deck.pk)
        total_decks = 1
    elif deck_filter is not None:
        # Filter by specific set of decks (courses or collections)
        reviews = Review.objects.filter(session__user=user, card__deck__in=deck_filter)
        cards = Card.objects.filter(deck__in=deck_filter)
        decks_in_scope = deck_filter
        total_decks = deck_filter.count()
    else:
        reviews = Review.objects.filter(session__user=user)

        # Shared decks: any deck in an active partnership the user belongs to,
        # regardless of who created it. Mirrors user_stats() "courses" filter.
        shared_decks = Deck.objects.filter(
            Q(partnerships__user_a=user) | Q(partnerships__user_b=user),
            partnerships__is_active=True,
        ).distinct()

        # Personal decks: decks the user owns that are NOT shared.
        # Mirrors user_stats() "collections" filter.
        personal_decks = Deck.objects.filter(user=user).exclude(
            pk__in=shared_decks.values('pk')
        ).distinct()

        # Include both personal and shared decks
        user_decks = personal_decks | shared_decks

        cards = Card.objects.filter(deck__in=user_decks)
        decks_in_scope = user_decks
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

    # Per-user progress for the cards in scope (per-user, per-direction SM-2 state).
    # Due counts are based on this rather than the legacy Card.next_review so each
    # partner sees their own schedule for shared decks.
    progress_qs = UserCardProgress.objects.filter(user=user, card__in=cards)

    # Cards due today (and overdue) for this user
    now = timezone.now()
    cards_due_today = progress_qs.filter(next_review__lte=now).count()

    # Study streak: consecutive days (ending today or yesterday) with reviews
    review_dates = set(
        reviews.annotate(d=TruncDate('reviewed_at')).values_list('d', flat=True)
    )
    study_streak_days = 0
    check = timezone.localdate()
    if check not in review_dates:
        check = check - timedelta(days=1)
    while check in review_dates:
        study_streak_days += 1
        check = check - timedelta(days=1)

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

    # Cards due forecast (next 7 days) based on this user's progress schedule.
    # Day 0 includes everything due now or overdue.
    cards_due_forecast = []
    for i in range(7):
        day = now + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
        if i == 0:
            count = progress_qs.filter(next_review__lte=day_end).count()
        else:
            count = progress_qs.filter(
                next_review__gte=day_start, next_review__lte=day_end
            ).count()
        cards_due_forecast.append({
            'date': day_start.strftime('%Y-%m-%d'),
            'count': count,
        })

    # Average quality per deck (only decks the user has actually reviewed)
    deck_quality = [
        {'title': row['card__deck__title'], 'average_quality': round(row['avg'], 2)}
        for row in reviews.values('card__deck', 'card__deck__title')
        .annotate(avg=Avg('quality'))
        .order_by('card__deck__title')
        if row['avg'] is not None
    ]

    # Quality distribution (counts of reviews rated 0..5)
    quality_distribution = [0, 0, 0, 0, 0, 0]
    for row in reviews.values('quality').annotate(c=Count('id')):
        q = row['quality']
        if q is not None and 0 <= q <= 5:
            quality_distribution[q] = row['c']

    result = {
        'total_reviews': total_reviews,
        'total_cards': total_cards,
        'average_quality': average_quality,
        'cards_due_today': cards_due_today,
        'study_streak_days': study_streak_days,
        'total_decks': total_decks,
        'recent_activity': recent_activity,
        'cards_due_forecast': cards_due_forecast,
        'deck_quality': deck_quality,
        'quality_distribution': quality_distribution,
    }

    # Add separate counts if available (when not filtering by specific deck)
    if personal_decks_count is not None:
        result['personal_decks'] = personal_decks_count
        result['shared_decks'] = shared_decks_count
        result['personal_cards'] = personal_cards_count
        result['shared_cards'] = shared_cards_count

    return result
