"""
URL configuration for flashcards app.
"""

from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    # ========================================================================
    # Page Views
    # ========================================================================
    path('', views.index, name='index'),
    path('decks/<int:deck_id>/', views.deck_detail, name='deck_detail'),
    path('decks/<int:deck_id>/study/', views.study_view, name='study'),
    path('stats/', views.stats_view, name='stats'),
    path('partnership/', views.partnership_view, name='partnership'),

    # ========================================================================
    # Authentication
    # ========================================================================
    path('login/', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register, name='register'),

    # ========================================================================
    # Deck API Endpoints
    # ========================================================================
    path('api/decks/', views.deck_list, name='api_deck_list'),
    path('api/decks/create/', views.deck_create, name='api_deck_create'),
    path('api/decks/<int:deck_id>/', views.deck_detail_api, name='api_deck_detail'),
    path('api/decks/<int:deck_id>/update/', views.deck_update, name='api_deck_update'),
    path('api/decks/<int:deck_id>/delete/', views.deck_delete, name='api_deck_delete'),

    # ========================================================================
    # Card API Endpoints
    # ========================================================================
    path('api/decks/<int:deck_id>/cards/', views.card_list, name='api_card_list'),
    path('api/decks/<int:deck_id>/cards/create/', views.card_create, name='api_card_create'),
    path('api/cards/<int:card_id>/update/', views.card_update, name='api_card_update'),
    path('api/cards/<int:card_id>/delete/', views.card_delete, name='api_card_delete'),

    # ========================================================================
    # Study Session API Endpoints
    # ========================================================================
    path('api/decks/<int:deck_id>/study/', views.study_session, name='api_study_session'),
    path('api/cards/<int:card_id>/review/', views.submit_review, name='api_submit_review'),

    # ========================================================================
    # Statistics API Endpoints
    # ========================================================================
    path('api/stats/', views.user_stats, name='api_user_stats'),
    path('api/decks/<int:deck_id>/stats/', views.deck_stats, name='api_deck_stats'),

    # ========================================================================
    # Partnership API Endpoints
    # ========================================================================
    path('api/partnership/invite/', views.partnership_invite, name='api_partnership_invite'),
    path('api/partnership/accept/', views.partnership_accept, name='api_partnership_accept'),
    path('api/partnership/', views.partnership_get, name='api_partnership_get'),
    path('api/partnership/dissolve/', views.partnership_dissolve, name='api_partnership_dissolve'),
]
