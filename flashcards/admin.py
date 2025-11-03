"""
Django admin configuration for flashcard models.
"""

from django.contrib import admin
from .models import (
    Deck, Card, StudySession, Review,
    Partnership, PartnershipInvitation, UserCardProgress
)


@admin.register(Deck)
class DeckAdmin(admin.ModelAdmin):
    """Admin interface for Deck model."""
    list_display = ('title', 'user', 'created_by', 'created_at', 'updated_at')
    list_filter = ('created_at', 'user')
    search_fields = ('title', 'description', 'user__username', 'created_by__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    """Admin interface for Card model."""
    list_display = ('__str__', 'deck', 'language_a_code', 'language_b_code', 'created_at')
    list_filter = ('deck', 'language_a_code', 'language_b_code', 'created_at')
    search_fields = ('language_a', 'language_b', 'front', 'back', 'deck__title', 'context')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(UserCardProgress)
class UserCardProgressAdmin(admin.ModelAdmin):
    """Admin interface for UserCardProgress model."""
    list_display = ('user', 'card', 'study_direction', 'ease_factor', 'interval', 'next_review')
    list_filter = ('study_direction', 'user', 'next_review')
    search_fields = ('user__username', 'card__language_a', 'card__language_b')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    """Admin interface for StudySession model."""
    list_display = ('user', 'deck', 'study_direction', 'started_at', 'ended_at', 'cards_studied')
    list_filter = ('study_direction', 'started_at', 'user', 'deck')
    readonly_fields = ('started_at',)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Admin interface for Review model."""
    list_display = ('card', 'session', 'study_direction', 'quality', 'reviewed_at', 'time_taken')
    list_filter = ('study_direction', 'quality', 'reviewed_at')
    search_fields = ('card__language_a', 'card__language_b', 'card__front')
    readonly_fields = ('reviewed_at',)


@admin.register(Partnership)
class PartnershipAdmin(admin.ModelAdmin):
    """Admin interface for Partnership model."""
    list_display = ('__str__', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('user_a__username', 'user_b__username')
    readonly_fields = ('created_at',)
    filter_horizontal = ('decks',)


@admin.register(PartnershipInvitation)
class PartnershipInvitationAdmin(admin.ModelAdmin):
    """Admin interface for PartnershipInvitation model."""
    list_display = ('code', 'inviter', 'accepted_by', 'created_at', 'expires_at', 'is_valid')
    list_filter = ('created_at', 'expires_at', 'accepted_at')
    search_fields = ('code', 'inviter__username', 'accepted_by__username')
    readonly_fields = ('created_at', 'accepted_at')
