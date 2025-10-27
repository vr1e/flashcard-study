"""
Utility functions for flashcard application.

Includes:
- SM-2 Spaced Repetition Algorithm
- Helper functions for card scheduling
"""

from datetime import datetime, timedelta


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
    # TODO: Implement SM-2 algorithm
    # Reference implementation in project specification

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
    card.next_review = datetime.now() + timedelta(days=card.interval)

    return card


def get_due_cards(deck):
    """
    Get all cards due for review in a deck.

    Args:
        deck: Deck model instance

    Returns:
        QuerySet of Card instances due for review
    """
    # TODO: Implement
    pass


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
        - study_streak
        - cards_due_today
        - etc.
    """
    # TODO: Implement
    pass
