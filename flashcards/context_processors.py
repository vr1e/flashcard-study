"""
Context processors for flashcards app.

These functions add extra context variables to all templates.
"""
from django.db.models import Q
from .models import Partnership, UserProfile


def partnership_context(request):
    """
    Add partnership-related context to all templates.

    Adds:
        - is_first_visit: Whether to show "NEW" badge on partnership link
    """
    if not request.user.is_authenticated:
        return {}

    try:
        # Get user profile to check if partnership tutorial has been seen
        profile = UserProfile.objects.get(user=request.user)

        # Show badge if user hasn't seen the partnership tutorial yet
        # or if they don't have any active partnerships
        has_partnership = Partnership.objects.filter(
            Q(user_a=request.user) | Q(user_b=request.user),
            is_active=True
        ).exists()

        show_partnership_badge = not profile.partnership_tutorial_seen or not has_partnership

        return {
            'show_partnership_badge': show_partnership_badge,
        }
    except UserProfile.DoesNotExist:
        # If profile doesn't exist, don't show badge
        return {
            'show_partnership_badge': False,
        }
