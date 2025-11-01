"""
Flashcard application views.

Provides API endpoints and page views for:
- Deck management (CRUD)
- Card management (CRUD)
- Study sessions
- Statistics
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json

from .models import Deck, Card, StudySession, Review


# ============================================================================
# Page Views
# ============================================================================

@login_required
def index(request):
    """
    Dashboard/home page.
    Shows all user's decks with due card counts.
    """
    decks = Deck.objects.filter(user=request.user).order_by('-updated_at')
    return render(request, 'index.html', {'decks': decks})


@login_required
def deck_detail(request, deck_id):
    """
    Deck detail page.
    Shows all cards in a deck with management options.
    """
    deck = get_object_or_404(Deck, id=deck_id, user=request.user)
    return render(request, 'deck_detail.html', {'deck': deck})


@login_required
def study_view(request, deck_id):
    """
    Study session page.
    Interactive card study interface.
    """
    deck = get_object_or_404(Deck, id=deck_id, user=request.user)
    return render(request, 'study.html', {'deck': deck})


@login_required
def stats_view(request):
    """
    Statistics page.
    Shows user learning analytics and charts.
    """
    return render(request, 'stats.html')


def register(request):
    """
    User registration page.
    Handles both GET (show form) and POST (create user).
    """
    from django.contrib.auth.models import User
    from django.contrib.auth import login

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        password_confirm = request.POST.get('password_confirm', '')

        # Validation
        if not username or not password:
            return render(request, 'register.html', {
                'error': 'Username and password are required'
            })

        if password != password_confirm:
            return render(request, 'register.html', {
                'error': 'Passwords do not match'
            })

        if User.objects.filter(username=username).exists():
            return render(request, 'register.html', {
                'error': 'Username already exists'
            })

        # Create user
        user = User.objects.create_user(username=username, password=password)
        login(request, user)
        return redirect('index')

    return render(request, 'register.html')


# ============================================================================
# Deck API Endpoints
# ============================================================================

@login_required
@require_http_methods(["GET"])
def deck_list(request):
    """
    GET /api/decks/
    Return all decks for the current user.
    """
    decks = Deck.objects.filter(user=request.user).order_by('-updated_at')
    data = [{
        'id': deck.id,
        'title': deck.title,
        'description': deck.description,
        'created_at': deck.created_at.isoformat(),
        'updated_at': deck.updated_at.isoformat(),
        'total_cards': deck.total_cards(),
        'cards_due': deck.cards_due_count(),
    } for deck in decks]

    return JsonResponse({'success': True, 'data': data})


@login_required
@require_http_methods(["POST"])
def deck_create(request):
    """
    POST /api/decks/create/
    Create a new deck.
    """
    try:
        data = json.loads(request.body)
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()

        if not title:
            return JsonResponse({
                'success': False,
                'error': {'code': 'INVALID_INPUT', 'message': 'Title is required'}
            }, status=400)

        deck = Deck.objects.create(
            user=request.user,
            title=title,
            description=description
        )

        return JsonResponse({
            'success': True,
            'data': {
                'id': deck.id,
                'title': deck.title,
                'description': deck.description,
                'created_at': deck.created_at.isoformat(),
                'updated_at': deck.updated_at.isoformat(),
                'total_cards': 0,
                'cards_due': 0,
            }
        }, status=201)

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': {'code': 'INVALID_JSON', 'message': 'Invalid JSON in request body'}
        }, status=400)


@login_required
@require_http_methods(["GET"])
def deck_detail_api(request, deck_id):
    """
    GET /api/decks/<deck_id>/
    Return deck details with cards.
    """
    try:
        deck = Deck.objects.get(id=deck_id, user=request.user)
        return JsonResponse({
            'success': True,
            'data': {
                'id': deck.id,
                'title': deck.title,
                'description': deck.description,
                'created_at': deck.created_at.isoformat(),
                'updated_at': deck.updated_at.isoformat(),
                'total_cards': deck.total_cards(),
                'cards_due': deck.cards_due_count(),
            }
        })
    except Deck.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Deck not found'}
        }, status=404)


@login_required
@require_http_methods(["PUT", "PATCH"])
def deck_update(request, deck_id):
    """
    PUT/PATCH /api/decks/<deck_id>/update/
    Update deck information.
    """
    try:
        deck = Deck.objects.get(id=deck_id, user=request.user)
        data = json.loads(request.body)

        title = data.get('title', '').strip()
        if title:
            deck.title = title

        if 'description' in data:
            deck.description = data['description'].strip()

        deck.save()

        return JsonResponse({
            'success': True,
            'data': {
                'id': deck.id,
                'title': deck.title,
                'description': deck.description,
                'created_at': deck.created_at.isoformat(),
                'updated_at': deck.updated_at.isoformat(),
                'total_cards': deck.total_cards(),
                'cards_due': deck.cards_due_count(),
            }
        })

    except Deck.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Deck not found'}
        }, status=404)
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': {'code': 'INVALID_JSON', 'message': 'Invalid JSON in request body'}
        }, status=400)


@login_required
@require_http_methods(["DELETE"])
def deck_delete(request, deck_id):
    """
    DELETE /api/decks/<deck_id>/delete/
    Delete a deck and all its cards.
    """
    try:
        deck = Deck.objects.get(id=deck_id, user=request.user)
        deck.delete()
        return JsonResponse({'success': True, 'data': {'message': 'Deck deleted successfully'}})
    except Deck.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Deck not found'}
        }, status=404)


# ============================================================================
# Card API Endpoints
# ============================================================================

@login_required
@require_http_methods(["GET"])
def card_list(request, deck_id):
    """
    GET /api/decks/<deck_id>/cards/
    Return all cards in a deck.
    """
    try:
        deck = Deck.objects.get(id=deck_id, user=request.user)
        cards = deck.cards.all().order_by('created_at')
        data = [{
            'id': card.id,
            'front': card.front,
            'back': card.back,
            'created_at': card.created_at.isoformat(),
            'ease_factor': card.ease_factor,
            'interval': card.interval,
            'repetitions': card.repetitions,
            'next_review': card.next_review.isoformat(),
            'is_due': card.is_due(),
        } for card in cards]

        return JsonResponse({'success': True, 'data': data})
    except Deck.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Deck not found'}
        }, status=404)


@login_required
@require_http_methods(["POST"])
def card_create(request, deck_id):
    """
    POST /api/decks/<deck_id>/cards/create/
    Create a new card in the deck.
    """
    try:
        deck = Deck.objects.get(id=deck_id, user=request.user)
        data = json.loads(request.body)

        front = data.get('front', '').strip()
        back = data.get('back', '').strip()

        if not front or not back:
            return JsonResponse({
                'success': False,
                'error': {'code': 'INVALID_INPUT', 'message': 'Front and back are required'}
            }, status=400)

        card = Card.objects.create(
            deck=deck,
            front=front,
            back=back
        )

        return JsonResponse({
            'success': True,
            'data': {
                'id': card.id,
                'front': card.front,
                'back': card.back,
                'created_at': card.created_at.isoformat(),
                'ease_factor': card.ease_factor,
                'interval': card.interval,
                'repetitions': card.repetitions,
                'next_review': card.next_review.isoformat(),
                'is_due': card.is_due(),
            }
        }, status=201)

    except Deck.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Deck not found'}
        }, status=404)
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': {'code': 'INVALID_JSON', 'message': 'Invalid JSON in request body'}
        }, status=400)


@login_required
@require_http_methods(["PUT", "PATCH"])
def card_update(request, card_id):
    """
    PUT/PATCH /api/cards/<card_id>/update/
    Update card content.
    """
    try:
        card = Card.objects.get(id=card_id, deck__user=request.user)
        data = json.loads(request.body)

        if 'front' in data:
            card.front = data['front'].strip()
        if 'back' in data:
            card.back = data['back'].strip()

        card.save()

        return JsonResponse({
            'success': True,
            'data': {
                'id': card.id,
                'front': card.front,
                'back': card.back,
                'created_at': card.created_at.isoformat(),
                'ease_factor': card.ease_factor,
                'interval': card.interval,
                'repetitions': card.repetitions,
                'next_review': card.next_review.isoformat(),
                'is_due': card.is_due(),
            }
        })

    except Card.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=404)
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': {'code': 'INVALID_JSON', 'message': 'Invalid JSON in request body'}
        }, status=400)


@login_required
@require_http_methods(["DELETE"])
def card_delete(request, card_id):
    """
    DELETE /api/cards/<card_id>/delete/
    Delete a card.
    """
    try:
        card = Card.objects.get(id=card_id, deck__user=request.user)
        card.delete()
        return JsonResponse({'success': True, 'data': {'message': 'Card deleted successfully'}})
    except Card.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=404)


# ============================================================================
# Study Session API Endpoints
# ============================================================================

@login_required
@require_http_methods(["GET", "POST"])
def study_session(request, deck_id):
    """
    GET /api/decks/<deck_id>/study/
    Return cards due for review.

    POST /api/decks/<deck_id>/study/
    Start a new study session.
    """
    from .utils import get_due_cards

    try:
        deck = Deck.objects.get(id=deck_id, user=request.user)

        if request.method == 'GET':
            # Return cards due for review
            due_cards = get_due_cards(deck)
            data = [{
                'id': card.id,
                'front': card.front,
                'back': card.back,
                'created_at': card.created_at.isoformat(),
                'ease_factor': card.ease_factor,
                'interval': card.interval,
                'repetitions': card.repetitions,
                'next_review': card.next_review.isoformat(),
            } for card in due_cards]

            return JsonResponse({'success': True, 'data': data})

        elif request.method == 'POST':
            # Start a new study session
            session = StudySession.objects.create(
                user=request.user,
                deck=deck
            )

            due_cards = get_due_cards(deck)
            data = {
                'session_id': session.id,
                'deck_id': deck.id,
                'cards': [{
                    'id': card.id,
                    'front': card.front,
                    'back': card.back,
                } for card in due_cards]
            }

            return JsonResponse({'success': True, 'data': data}, status=201)

    except Deck.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Deck not found'}
        }, status=404)


@login_required
@require_http_methods(["POST"])
def submit_review(request, card_id):
    """
    POST /api/cards/<card_id>/review/
    Submit a card review with quality rating.
    Updates card using spaced repetition algorithm.
    """
    from .utils import calculate_next_review

    try:
        card = Card.objects.get(id=card_id, deck__user=request.user)
        data = json.loads(request.body)

        quality = data.get('quality')
        session_id = data.get('session_id')
        time_taken = data.get('time_taken', 0)

        if quality is None or not isinstance(quality, int) or quality < 0 or quality > 5:
            return JsonResponse({
                'success': False,
                'error': {'code': 'INVALID_INPUT', 'message': 'Quality must be an integer between 0 and 5'}
            }, status=400)

        # Apply SM-2 algorithm
        card = calculate_next_review(card, quality)
        card.save()

        # Record the review
        if session_id:
            try:
                session = StudySession.objects.get(id=session_id, user=request.user)
                Review.objects.create(
                    card=card,
                    session=session,
                    quality=quality,
                    time_taken=time_taken
                )
                # Update session cards studied count
                session.cards_studied += 1
                session.save()
            except StudySession.DoesNotExist:
                pass  # Session not found, but we still update the card

        return JsonResponse({
            'success': True,
            'data': {
                'id': card.id,
                'ease_factor': card.ease_factor,
                'interval': card.interval,
                'repetitions': card.repetitions,
                'next_review': card.next_review.isoformat(),
            }
        })

    except Card.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=404)
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': {'code': 'INVALID_JSON', 'message': 'Invalid JSON in request body'}
        }, status=400)


# ============================================================================
# Statistics API Endpoints
# ============================================================================

@login_required
@require_http_methods(["GET"])
def user_stats(request):
    """
    GET /api/stats/
    Return user-wide learning statistics.
    """
    from .utils import get_study_stats

    stats = get_study_stats(request.user)
    return JsonResponse({'success': True, 'data': stats})


@login_required
@require_http_methods(["GET"])
def deck_stats(request, deck_id):
    """
    GET /api/decks/<deck_id>/stats/
    Return statistics for a specific deck.
    """
    from .utils import get_study_stats

    try:
        deck = Deck.objects.get(id=deck_id, user=request.user)
        stats = get_study_stats(request.user, deck=deck)
        return JsonResponse({'success': True, 'data': stats})
    except Deck.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Deck not found'}
        }, status=404)
