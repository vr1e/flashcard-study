"""
Django admin configuration for flashcard models.
"""

from django.contrib import admin
from .models import Deck, Card, StudySession, Review


@admin.register(Deck)
class DeckAdmin(admin.ModelAdmin):
    """Admin interface for Deck model."""
    list_display = ('title', 'user', 'created_at', 'updated_at')
    list_filter = ('created_at', 'user')
    search_fields = ('title', 'description', 'user__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    """Admin interface for Card model."""
    list_display = ('front', 'deck', 'ease_factor', 'interval', 'next_review')
    list_filter = ('deck', 'created_at')
    search_fields = ('front', 'back', 'deck__title')
    readonly_fields = ('created_at',)


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    """Admin interface for StudySession model."""
    list_display = ('user', 'deck', 'started_at', 'ended_at', 'cards_studied')
    list_filter = ('started_at', 'user', 'deck')
    readonly_fields = ('started_at',)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Admin interface for Review model."""
    list_display = ('card', 'session', 'quality', 'reviewed_at', 'time_taken')
    list_filter = ('quality', 'reviewed_at')
    search_fields = ('card__front',)
    readonly_fields = ('reviewed_at',)
