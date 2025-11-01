# RFC 0003: API Design

## Metadata

- **RFC Number**: 0003
- **Title**: RESTful API Endpoints
- **Author**: Development Team
- **Status**: Implemented
- **Created**: 2024-10-25
- **Last Updated**: 2025-11-01

## Summary

Define a RESTful JSON API for managing decks, cards, study sessions, and statistics with consistent structure, error handling, and authentication.

## Motivation

**Why are we doing this?**

A well-designed API is crucial for:

- **Frontend integration**: TypeScript code needs predictable responses
- **Future expansion**: Mobile app, browser extension, or third-party integrations
- **Debugging**: Clear error messages and consistent patterns
- **Maintainability**: Documented contracts between frontend/backend

## Proposed Solution

**What are we building and how?**

### Overview

RESTful JSON API following these principles:

- **Resource-based URLs**: `/api/decks/`, `/api/cards/{id}/`
- **HTTP verbs**: GET (read), POST (create), PUT/PATCH (update), DELETE (delete)
- **JSON format**: All requests/responses in JSON
- **Authentication**: Django session-based auth
- **Consistent responses**: Standard structure for success/errors

### API Endpoints

#### Decks

```
GET /api/decks/
Description: List all decks for authenticated user
Response: {
  "decks": [
    {
      "id": 1,
      "title": "Spanish Vocabulary",
      "description": "Common phrases",
      "total_cards": 50,
      "cards_due": 12,
      "created_at": "2024-10-25T10:00:00Z",
      "updated_at": "2024-10-25T14:30:00Z"
    }
  ]
}

POST /api/decks/create/
Body: {
  "title": "New Deck",
  "description": "Optional description"
}
Response: {
  "success": true,
  "deck": { ...deck object... }
}

GET /api/decks/{deck_id}/
Description: Get single deck with all cards
Response: {
  "deck": { ...deck object... },
  "cards": [ ...card objects... ]
}

PUT /api/decks/{deck_id}/update/
Body: {
  "title": "Updated Title",
  "description": "New description"
}
Response: {
  "success": true,
  "deck": { ...updated deck... }
}

DELETE /api/decks/{deck_id}/delete/
Response: {
  "success": true,
  "message": "Deck deleted"
}
```

#### Cards

```
GET /api/decks/{deck_id}/cards/
Description: List all cards in deck
Response: {
  "cards": [
    {
      "id": 1,
      "front": "¿Cómo estás?",
      "back": "How are you?",
      "ease_factor": 2.5,
      "interval": 7,
      "repetitions": 3,
      "next_review": "2024-10-30T10:00:00Z",
      "created_at": "2024-10-25T10:00:00Z"
    }
  ]
}

POST /api/decks/{deck_id}/cards/create/
Body: {
  "front": "Question text",
  "back": "Answer text"
}
Response: {
  "success": true,
  "card": { ...card object... }
}

PUT /api/cards/{card_id}/update/
Body: {
  "front": "Updated question",
  "back": "Updated answer"
}
Response: {
  "success": true,
  "card": { ...updated card... }
}

DELETE /api/cards/{card_id}/delete/
Response: {
  "success": true,
  "message": "Card deleted"
}
```

#### Study Sessions

```
POST /api/decks/{deck_id}/study/
Description: Start study session, get due cards
Response: {
  "session_id": 123,
  "cards": [
    { ...card object... },
    { ...card object... }
  ],
  "total_due": 12
}

POST /api/cards/{card_id}/review/
Body: {
  "session_id": 123,
  "quality": 4,
  "time_taken": 8
}
Response: {
  "success": true,
  "card": {
    "id": 1,
    "next_review": "2024-11-02T10:00:00Z",
    "interval": 14,
    "ease_factor": 2.6
  }
}
```

#### Statistics

```
GET /api/stats/
Description: User-wide statistics
Response: {
  "total_decks": 5,
  "total_cards": 250,
  "cards_due_today": 32,
  "total_reviews": 450,
  "average_quality": 3.8,
  "study_streak_days": 7,
  "recent_activity": [
    {
      "date": "2024-10-25",
      "cards_studied": 25,
      "time_spent": 900
    }
  ]
}

GET /api/decks/{deck_id}/stats/
Description: Deck-specific statistics
Response: {
  "deck_id": 1,
  "total_cards": 50,
  "cards_due": 12,
  "mastered_cards": 20,
  "learning_cards": 18,
  "new_cards": 12,
  "average_quality": 4.1,
  "total_reviews": 85
}
```

### Error Handling

#### Standard Error Response

```json
{
	"success": false,
	"error": {
		"code": "DECK_NOT_FOUND",
		"message": "Deck with id 999 does not exist",
		"details": {}
	}
}
```

#### HTTP Status Codes

- **200 OK**: Successful GET/PUT
- **201 Created**: Successful POST
- **204 No Content**: Successful DELETE
- **400 Bad Request**: Invalid input
- **401 Unauthorized**: Not authenticated
- **403 Forbidden**: Not authorized for this resource
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Server error

#### Common Error Codes

```python
ERROR_CODES = {
    'DECK_NOT_FOUND': 'Deck does not exist or access denied',
    'CARD_NOT_FOUND': 'Card does not exist or access denied',
    'INVALID_QUALITY': 'Quality rating must be 0-5',
    'SESSION_INVALID': 'Study session is invalid or expired',
    'VALIDATION_ERROR': 'Input validation failed',
}
```

### Authentication

All API endpoints require authentication except:

- Login/logout endpoints
- Registration endpoint

**Method**: Django session-based authentication

- Frontend sends credentials to `/login/`
- Django sets session cookie
- Subsequent API requests include session cookie
- CSRF token required for POST/PUT/DELETE

### Code Examples

#### Django View Template

```python
@login_required
@require_http_methods(["POST"])
def deck_create(request):
    try:
        data = json.loads(request.body)

        # Validate input
        if not data.get('title'):
            return JsonResponse({
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Title is required'
                }
            }, status=400)

        # Create deck
        deck = Deck.objects.create(
            user=request.user,
            title=data['title'],
            description=data.get('description', '')
        )

        # Return success
        return JsonResponse({
            'success': True,
            'deck': {
                'id': deck.id,
                'title': deck.title,
                'description': deck.description,
                'total_cards': 0,
                'cards_due': 0,
                'created_at': deck.created_at.isoformat(),
                'updated_at': deck.updated_at.isoformat()
            }
        }, status=201)

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': str(e)
            }
        }, status=500)
```

#### TypeScript API Client

```typescript
class FlashcardAPI {
	private baseURL = "/api";

	async getDecks(): Promise<Deck[]> {
		const response = await fetch(`${this.baseURL}/decks/`);
		const data = await response.json();
		return data.decks;
	}

	async createDeck(title: string, description: string): Promise<Deck> {
		const response = await fetch(`${this.baseURL}/decks/create/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRFToken": this.getCsrfToken(),
			},
			body: JSON.stringify({ title, description }),
		});

		const data = await response.json();

		if (!data.success) {
			throw new Error(data.error.message);
		}

		return data.deck;
	}

	private getCsrfToken(): string {
		return document.querySelector("[name=csrfmiddlewaretoken]")?.value || "";
	}
}
```

## Alternatives Considered

### Alternative 1: GraphQL

- **Description**: Use GraphQL instead of REST
- **Pros**: Flexible queries, single endpoint, type safety
- **Cons**: More complex, requires additional dependencies, overkill for simple CRUD
- **Why not chosen**: REST is simpler and sufficient for this project

### Alternative 2: Django REST Framework (DRF)

- **Description**: Use DRF for API serialization and views
- **Pros**: Built-in serializers, viewsets, automatic documentation
- **Cons**: Adds dependency, more abstraction, learning curve
- **Why not chosen**: Hand-written views are more transparent for educational purposes

### Alternative 3: Token Authentication (JWT)

- **Description**: Use JWT tokens instead of session auth
- **Pros**: Stateless, works better for mobile apps
- **Cons**: More complex, requires token refresh logic, session auth is Django default
- **Why not chosen**: Session auth is simpler for web-first application

## Implementation Notes

### Dependencies

- No external packages (using built-in Django JSON responses)
- CSRF middleware (already in Django)

### Migration Strategy

- N/A - New API

### Testing Approach

```python
# Django tests
class APITestCase(TestCase):
    def test_deck_list_requires_auth(self):
        response = self.client.get('/api/decks/')
        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_deck_create_success(self):
        self.client.login(username='test', password='test')
        response = self.client.post('/api/decks/create/',
            data={'title': 'New Deck'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['success'])

    def test_card_review_updates_srs(self):
        # ... test that reviewing updates ease_factor, interval, etc.
```

### Performance Considerations

- Use `select_related()` to avoid N+1 queries
- Cache deck statistics (cards_due_count)
- Add database indexes on frequently queried fields
- Paginate large lists (if needed)

### Security Considerations

- **Authorization**: Users can only access their own resources
- **CSRF protection**: Required for all mutating requests
- **Input validation**: Sanitize all user input
- **SQL injection**: Use Django ORM (safe by default)
- **Rate limiting**: Consider for production (optional)

## Timeline

- **Estimated Effort**: 2-3 days (in parallel with frontend)
- **Target Completion**: After models are complete

## Open Questions

- [ ] Do we need pagination for large card lists?
- [ ] Should we version the API (/api/v1/)?
- [ ] Do we need bulk operations (create multiple cards at once)?
- [ ] Should we add search/filter endpoints?

## References

- [REST API Best Practices](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)
- [Django JsonResponse](https://docs.djangoproject.com/en/4.2/ref/request-response/#jsonresponse-objects)
- [HTTP Status Codes](https://developer.mozilla.org/en/docs/Web/HTTP/Status)

## Implementation Notes (Added 2025-11-01)

### Actual API Response Structure

All backend responses follow a consistent wrapper format:

```json
{
  "success": true,
  "data": <actual_data>
}
```

Or for errors:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

### Frontend Response Unwrapping

The TypeScript API client automatically unwraps responses in the `fetch()` method:

```typescript
class FlashcardAPI {
    private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
        const response = await window.fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
                ...options?.headers,
            },
        });

        const json: ApiResponse<any> = await response.json();

        if (!json.success) {
            throw new ApiError(json.error || {
                code: 'UNKNOWN_ERROR',
                message: 'An unexpected error occurred'
            });
        }

        return json.data as T;  // ← Unwrap and return just the data
    }
}
```

**Result**: All API methods return clean, unwrapped data types:

```typescript
// Method signature
async getDecks(): Promise<Deck[]>

// Usage (no .data access needed)
const decks = await api.getDecks();  // Returns Deck[] directly
```

### Corrected Response Examples

#### GET /api/decks/
**Backend Returns**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Spanish Vocabulary",
      "description": "Common phrases",
      "total_cards": 50,
      "cards_due": 12,
      "created_at": "2024-10-25T10:00:00Z",
      "updated_at": "2024-10-25T14:30:00Z"
    }
  ]
}
```

**Frontend Receives** (after unwrapping):
```typescript
const decks: Deck[] = await api.getDecks();
// decks is directly the array, not wrapped
```

#### POST /api/decks/create/
**Backend Returns**:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "title": "New Deck",
    "description": "Optional description",
    "total_cards": 0,
    "cards_due": 0,
    "created_at": "2024-10-25T15:00:00Z",
    "updated_at": "2024-10-25T15:00:00Z"
  }
}
```

**Frontend Receives** (after unwrapping):
```typescript
const deck: Deck = await api.createDeck(title, description);
// deck is the object directly
```

### Error Handling

Errors are thrown as `ApiError` exceptions:

```typescript
class ApiError extends Error {
    code: string;
    details?: any;

    constructor(error: { code: string; message: string; details?: any }) {
        super(error.message);
        this.name = 'ApiError';
        this.code = error.code;
        this.details = error.details;
    }
}
```

**Usage**:
```typescript
try {
    const decks = await api.getDecks();
} catch (error) {
    if (error instanceof ApiError) {
        console.error(`API Error [${error.code}]: ${error.message}`);
    }
}
```

### Benefits of This Approach

1. **Clean Controller Code**: No need to check `success` flag or access `.data` in every controller
2. **Type Safety**: Controllers work with clean types (e.g., `Deck[]`, not `ApiResponse<Deck[]>`)
3. **Centralized Error Handling**: All API errors go through the same path
4. **Consistent Backend**: Backend maintains clean, documented API structure
5. **Easy Debugging**: Can add logging/retry logic in one place (the `fetch()` method)

### Backend Implementation

All endpoints follow this pattern:

```python
@login_required
def deck_list(request):
    try:
        decks = Deck.objects.filter(user=request.user)

        data = [
            {
                'id': deck.id,
                'title': deck.title,
                'description': deck.description,
                'total_cards': deck.total_cards(),
                'cards_due': deck.cards_due_count(),
                'created_at': deck.created_at.isoformat(),
                'updated_at': deck.updated_at.isoformat()
            }
            for deck in decks
        ]

        return JsonResponse({'success': True, 'data': data})

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': str(e)
            }
        }, status=500)
```
