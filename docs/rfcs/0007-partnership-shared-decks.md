# RFC 0007: Partnership & Shared Deck System

## Metadata

- **RFC Number**: 0007
- **Title**: Partnership & Shared Deck System
- **Author**: Development Team
- **Status**: Draft
- **Created**: 2025-11-02
- **Last Updated**: 2025-11-02

## Summary

Enable two users to form a partnership and collaboratively create and manage shared flashcard decks, transforming the single-user application into a couples language learning tool.

## Motivation

**Why are we doing this?**

The current application is designed for individual learners, but language learning is often more effective and engaging as a shared activity. Couples learning each other's languages face specific challenges:

- **No shared workspace**: Each person must duplicate cards or maintain separate decks
- **Coordination overhead**: Manually syncing new words/phrases across two accounts
- **Lost motivation**: Learning alone without a shared goal or progress visibility
- **Inefficient**: Both partners spend time creating the same content

A partnership system solves this by:

- **Collaborative deck creation**: Both partners can add and edit cards in shared decks
- **Synchronized content**: Changes made by one partner are immediately available to the other
- **Individual progress tracking**: Each partner maintains separate study progress while sharing content
- **Simplified workflow**: One shared deck instead of duplicating effort

**Target Use Case**: Couples learning each other's native languages (e.g., Serbian ↔ German).

## Proposed Solution

**What are we building and how?**

### Overview

A simple partnership system that:

1. Links two users together via invitation codes
2. Allows partners to create shared decks accessible to both
3. Maintains individual user ownership of personal decks
4. Provides collaborative editing permissions on shared decks
5. Handles partnership dissolution gracefully

**Design Principle**: Keep it simple - one active partnership per user, minimal complexity.

### Technical Details

#### Data Models

##### Partnership Model

```python
class Partnership(models.Model):
    """Links two users together for shared deck access."""

    user_a = ForeignKey(
        User,
        on_delete=CASCADE,
        related_name='partnerships_as_a',
        help_text="First partner in the relationship"
    )
    user_b = ForeignKey(
        User,
        on_delete=CASCADE,
        related_name='partnerships_as_b',
        help_text="Second partner in the relationship"
    )
    created_at = DateTimeField(auto_now_add=True)
    is_active = BooleanField(
        default=True,
        help_text="False when partnership is dissolved (soft delete)"
    )

    # Shared decks (many-to-many relationship)
    decks = ManyToManyField(
        'Deck',
        related_name='partnerships',
        blank=True,
        help_text="Decks shared between partners"
    )

    class Meta:
        unique_together = [['user_a', 'user_b']]
        indexes = [
            models.Index(fields=['user_a', 'is_active']),
            models.Index(fields=['user_b', 'is_active']),
        ]

    def get_partner(self, user):
        """Get the other user in the partnership."""
        if user == self.user_a:
            return self.user_b
        elif user == self.user_b:
            return self.user_a
        else:
            raise ValueError(f"User {user} is not in this partnership")

    def has_member(self, user):
        """Check if user is in this partnership."""
        return user in [self.user_a, self.user_b]

    def clean(self):
        """Validate partnership constraints."""
        from django.core.exceptions import ValidationError
        from django.db.models import Q

        # Cannot partner with yourself
        if self.user_a == self.user_b:
            raise ValidationError("Cannot create partnership with yourself")

        # Only one active partnership per user
        existing = Partnership.objects.filter(
            Q(user_a=self.user_a) | Q(user_b=self.user_a) |
            Q(user_a=self.user_b) | Q(user_b=self.user_b),
            is_active=True
        ).exclude(pk=self.pk)

        if existing.exists():
            raise ValidationError("User already has an active partnership")
```

##### PartnershipInvitation Model

```python
class PartnershipInvitation(models.Model):
    """Invitation code system for creating partnerships."""

    inviter = ForeignKey(
        User,
        on_delete=CASCADE,
        related_name='sent_invitations',
        help_text="User who created the invitation"
    )
    code = CharField(
        max_length=10,
        unique=True,
        db_index=True,
        help_text="Unique 6-character invitation code"
    )
    created_at = DateTimeField(auto_now_add=True)
    expires_at = DateTimeField(help_text="Invitation expires after 7 days")
    accepted_by = ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=SET_NULL,
        related_name='accepted_invitations',
        help_text="User who accepted the invitation"
    )
    accepted_at = DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['inviter', 'expires_at']),
        ]

    @staticmethod
    def generate_code():
        """Generate unique 6-character alphanumeric code."""
        import random
        import string
        while True:
            code = ''.join(random.choices(
                string.ascii_uppercase + string.digits,
                k=6
            ))
            if not PartnershipInvitation.objects.filter(code=code).exists():
                return code

    def is_valid(self):
        """Check if invitation is still valid."""
        from django.utils import timezone
        return (
            self.accepted_by is None and
            self.expires_at > timezone.now()
        )

    def save(self, *args, **kwargs):
        """Auto-generate code and expiration if not set."""
        from django.utils import timezone
        from datetime import timedelta

        if not self.code:
            self.code = self.generate_code()
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
```

##### Deck Model Changes

**Current:**
```python
class Deck(models.Model):
    user = ForeignKey(User, on_delete=CASCADE)  # Single owner
    title = CharField(max_length=200)
    description = TextField(blank=True)
```

**Modified:**
```python
class Deck(models.Model):
    """
    Flashcard deck - can be personal or shared.

    Personal decks: created_by is set, no partnerships
    Shared decks: created_by is set, linked to Partnership via partnerships M2M
    """
    title = CharField(max_length=200)
    description = TextField(blank=True)
    created_by = ForeignKey(
        User,
        on_delete=SET_NULL,  # Keep deck if creator deletes account
        null=True,
        related_name='created_decks',
        help_text="User who created this deck"
    )
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    # Reverse relationship: partnerships (ManyToManyField from Partnership)

    def is_shared(self):
        """Check if deck is shared via a partnership."""
        return self.partnerships.filter(is_active=True).exists()

    def can_edit(self, user):
        """Check if user has edit permissions."""
        # Creator can always edit
        if self.created_by == user:
            return True

        # Partner can edit if deck is shared
        partnership = self.partnerships.filter(is_active=True).first()
        if partnership and partnership.has_member(user):
            return True

        return False

    def can_view(self, user):
        """Check if user has view permissions."""
        return self.can_edit(user)  # Same permissions for now
```

### API Endpoints

#### Partnership Management

##### Create Invitation

```
POST /api/partnership/invite/

Request Body: (none)

Response (200):
{
  "success": true,
  "data": {
    "code": "ABC123",
    "expires_at": "2025-11-09T12:00:00Z",
    "created_at": "2025-11-02T12:00:00Z"
  }
}

Error (400 - Already has partnership):
{
  "success": false,
  "error": {
    "code": "ALREADY_PARTNERED",
    "message": "You already have an active partnership"
  }
}
```

**Implementation:**
```python
@login_required
def create_invitation(request):
    # Check if user already has active partnership
    existing = Partnership.objects.filter(
        Q(user_a=request.user) | Q(user_b=request.user),
        is_active=True
    ).exists()

    if existing:
        return JsonResponse({
            'success': False,
            'error': {
                'code': 'ALREADY_PARTNERED',
                'message': 'You already have an active partnership'
            }
        }, status=400)

    # Create invitation
    invitation = PartnershipInvitation.objects.create(
        inviter=request.user
    )

    return JsonResponse({
        'success': True,
        'data': {
            'code': invitation.code,
            'expires_at': invitation.expires_at.isoformat(),
            'created_at': invitation.created_at.isoformat()
        }
    })
```

##### Accept Invitation

```
POST /api/partnership/accept/

Request Body:
{
  "code": "ABC123"
}

Response (200):
{
  "success": true,
  "data": {
    "partnership_id": 1,
    "partner": {
      "id": 2,
      "username": "maria_doe",
      "email": "maria@example.com"
    },
    "created_at": "2025-11-02T12:05:00Z"
  }
}

Error (404 - Invalid code):
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "Invitation code not found or expired"
  }
}

Error (400 - Self invitation):
{
  "success": false,
  "error": {
    "code": "SELF_INVITATION",
    "message": "Cannot accept your own invitation"
  }
}
```

**Implementation:**
```python
@login_required
def accept_invitation(request):
    data = json.loads(request.body)
    code = data.get('code', '').upper()

    try:
        invitation = PartnershipInvitation.objects.get(code=code)
    except PartnershipInvitation.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': {
                'code': 'INVALID_CODE',
                'message': 'Invitation code not found or expired'
            }
        }, status=404)

    # Validate invitation
    if not invitation.is_valid():
        return JsonResponse({
            'success': False,
            'error': {
                'code': 'EXPIRED',
                'message': 'This invitation has expired'
            }
        }, status=400)

    if invitation.inviter == request.user:
        return JsonResponse({
            'success': False,
            'error': {
                'code': 'SELF_INVITATION',
                'message': 'Cannot accept your own invitation'
            }
        }, status=400)

    # Check if acceptor already has partnership
    existing = Partnership.objects.filter(
        Q(user_a=request.user) | Q(user_b=request.user),
        is_active=True
    ).exists()

    if existing:
        return JsonResponse({
            'success': False,
            'error': {
                'code': 'ALREADY_PARTNERED',
                'message': 'You already have an active partnership'
            }
        }, status=400)

    # Create partnership
    partnership = Partnership.objects.create(
        user_a=invitation.inviter,
        user_b=request.user
    )

    # Mark invitation as accepted
    invitation.accepted_by = request.user
    invitation.accepted_at = timezone.now()
    invitation.save()

    return JsonResponse({
        'success': True,
        'data': {
            'partnership_id': partnership.id,
            'partner': {
                'id': invitation.inviter.id,
                'username': invitation.inviter.username,
                'email': invitation.inviter.email
            },
            'created_at': partnership.created_at.isoformat()
        }
    })
```

##### Get Partnership Info

```
GET /api/partnership/

Response (200 - has partnership):
{
  "success": true,
  "data": {
    "id": 1,
    "partner": {
      "id": 2,
      "username": "maria_doe",
      "email": "maria@example.com"
    },
    "created_at": "2025-11-02T12:05:00Z",
    "shared_decks_count": 3
  }
}

Response (200 - no partnership):
{
  "success": true,
  "data": null
}
```

##### Dissolve Partnership

```
DELETE /api/partnership/

Response (200):
{
  "success": true,
  "message": "Partnership dissolved",
  "decks_affected": 3
}

Note: Sets is_active=False instead of deleting (audit trail)
```

**Implementation:**
```python
@login_required
def dissolve_partnership(request):
    partnership = Partnership.objects.filter(
        Q(user_a=request.user) | Q(user_b=request.user),
        is_active=True
    ).first()

    if not partnership:
        return JsonResponse({
            'success': False,
            'error': {
                'code': 'NO_PARTNERSHIP',
                'message': 'No active partnership found'
            }
        }, status=404)

    # Count affected decks
    decks_count = partnership.decks.count()

    # Soft delete partnership
    partnership.is_active = False
    partnership.save()

    # Clear deck associations (decks remain, just not shared)
    partnership.decks.clear()

    return JsonResponse({
        'success': True,
        'message': 'Partnership dissolved',
        'decks_affected': decks_count
    })
```

#### Deck Management Changes

##### Create Deck (Modified)

```
POST /api/decks/create/

Request Body:
{
  "title": "Serbian-German Basics",
  "description": "Common phrases and vocabulary",
  "shared": true  // NEW: Link to active partnership
}

Response (200):
{
  "success": true,
  "data": {
    "id": 5,
    "title": "Serbian-German Basics",
    "description": "Common phrases and vocabulary",
    "is_shared": true,
    "created_by": {
      "id": 1,
      "username": "john_doe"
    },
    "shared_with": {
      "id": 2,
      "username": "maria_doe"
    },
    "created_at": "2025-11-02T14:00:00Z"
  }
}

Error (400 - No partnership):
{
  "success": false,
  "error": {
    "code": "NO_PARTNERSHIP",
    "message": "Cannot create shared deck without active partnership"
  }
}
```

**Implementation:**
```python
@login_required
def create_deck(request):
    data = json.loads(request.body)
    is_shared = data.get('shared', False)

    # Create deck
    deck = Deck.objects.create(
        title=data['title'],
        description=data.get('description', ''),
        created_by=request.user
    )

    # Link to partnership if shared
    partner = None
    if is_shared:
        partnership = Partnership.objects.filter(
            Q(user_a=request.user) | Q(user_b=request.user),
            is_active=True
        ).first()

        if not partnership:
            deck.delete()  # Rollback
            return JsonResponse({
                'success': False,
                'error': {
                    'code': 'NO_PARTNERSHIP',
                    'message': 'Cannot create shared deck without active partnership'
                }
            }, status=400)

        partnership.decks.add(deck)
        partner = partnership.get_partner(request.user)

    return JsonResponse({
        'success': True,
        'data': {
            'id': deck.id,
            'title': deck.title,
            'description': deck.description,
            'is_shared': is_shared,
            'created_by': {
                'id': request.user.id,
                'username': request.user.username
            },
            'shared_with': {
                'id': partner.id,
                'username': partner.username
            } if partner else None,
            'created_at': deck.created_at.isoformat()
        }
    })
```

##### List Decks (Modified)

```
GET /api/decks/

Response (200):
{
  "success": true,
  "data": {
    "personal": [
      {
        "id": 1,
        "title": "My Private Deck",
        "description": "Personal notes",
        "total_cards": 25,
        "cards_due": 5,
        "created_at": "2025-10-15T10:00:00Z"
      }
    ],
    "shared": [
      {
        "id": 2,
        "title": "Serbian-German",
        "description": "Learning together",
        "total_cards": 50,
        "cards_due": 12,
        "created_by": {
          "id": 1,
          "username": "john_doe"
        },
        "shared_with": "maria_doe",
        "created_at": "2025-11-01T14:00:00Z"
      }
    ]
  }
}
```

**Implementation:**
```python
@login_required
def list_decks(request):
    # Get user's partnership
    partnership = Partnership.objects.filter(
        Q(user_a=request.user) | Q(user_b=request.user),
        is_active=True
    ).prefetch_related('decks').first()

    # Personal decks (created by user, not shared)
    personal = Deck.objects.filter(
        created_by=request.user,
        partnerships__isnull=True
    )

    # Shared decks (via partnership)
    shared = partnership.decks.all() if partnership else Deck.objects.none()

    partner = partnership.get_partner(request.user) if partnership else None

    return JsonResponse({
        'success': True,
        'data': {
            'personal': [serialize_deck(d, include_stats=True) for d in personal],
            'shared': [serialize_deck(d, include_stats=True, partner=partner) for d in shared]
        }
    })
```

### User Interface/Experience

#### Partnership Management Page

**New Template**: `templates/partnership.html`

**Layout:**
```
┌─────────────────────────────────────┐
│  Partnership Status                 │
├─────────────────────────────────────┤
│  ✓ Partnered with: maria_doe        │
│  Since: Nov 2, 2025                 │
│  Shared Decks: 3                    │
│                                     │
│  [Manage Partnership] [Dissolve]    │
└─────────────────────────────────────┘

         OR (if no partnership)

┌─────────────────────────────────────┐
│  Create Partnership                 │
├─────────────────────────────────────┤
│  Invite a partner to share decks    │
│                                     │
│  [Generate Invitation Code]         │
│                                     │
│  ─── OR ───                         │
│                                     │
│  Have a code?                       │
│  [____________________] [Accept]    │
└─────────────────────────────────────┘
```

**After generating invitation:**
```
┌─────────────────────────────────────┐
│  Your Invitation Code               │
├─────────────────────────────────────┤
│                                     │
│      A B C 1 2 3                    │
│                                     │
│  Share this code with your partner  │
│  Expires: Nov 9, 2025 12:00 PM      │
│                                     │
│  [Copy Code] [Cancel Invitation]    │
└─────────────────────────────────────┘
```

#### Deck Dashboard Changes

**Modified**: `templates/index.html`

**Layout:**
```
┌─────────────────────────────────────┐
│  My Learning Dashboard              │
├─────────────────────────────────────┤
│  Partnership: maria_doe ●           │
│  [Manage]                           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Shared Decks (3)                   │
│  [+ New Shared Deck]                │
├─────────────────────────────────────┤
│  📚 Serbian-German Basics           │
│      50 cards • 12 due              │
│      Created by: maria_doe          │
│                                     │
│  📚 Advanced Vocabulary             │
│      30 cards • 5 due               │
│      Created by: you                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  My Personal Decks (1)              │
│  [+ New Personal Deck]              │
├─────────────────────────────────────┤
│  📚 Private Notes                   │
│      25 cards • 3 due               │
└─────────────────────────────────────┘
```

**Visual Indicators:**
- Shared decks: Show partner badge/icon
- Personal decks: No special indicator
- Creator attribution: "Created by: [username]"

## Alternatives Considered

### Alternative 1: No Partnership Model (Direct Deck Sharing)

**Description**: Allow users to share individual decks via email/username without formal partnerships.

**Pros**:
- More flexible (can share different decks with different people)
- No commitment/pairing required
- Simpler invitation flow

**Cons**:
- Complex permission management per deck
- No clear "learning partner" relationship
- Harder to implement collaborative features later
- More UI complexity (per-deck sharing controls)

**Why not chosen**: Partnership model better matches the couples use case and keeps permissions simple.

### Alternative 2: Team/Group Model (N users)

**Description**: Support multiple users in a shared workspace (like Trello boards).

**Pros**:
- Supports study groups, not just couples
- More scalable for classroom use
- Flexible team composition

**Cons**:
- Much more complex (roles, permissions, admin)
- Overkill for couples use case
- Harder to implement individual progress tracking
- More complex UI

**Why not chosen**: Start simple with 1:1 partnerships. Can expand to groups later if needed.

### Alternative 3: OAuth/Social Integration (Facebook/Google Connect)

**Description**: Use social media connections to suggest/auto-pair partners.

**Pros**:
- Easy discovery of existing connections
- No manual code sharing
- Leverages existing social graphs

**Cons**:
- Privacy concerns
- Requires OAuth integration (complexity)
- Not all users want to link social accounts
- Dependency on third-party APIs

**Why not chosen**: Simple invitation codes are more private and don't require external dependencies.

### Alternative 4: Multiple Active Partnerships

**Description**: Allow users to have multiple active partnerships simultaneously.

**Pros**:
- More flexible (e.g., partner + tutor + study group)
- Supports polyglots learning multiple languages

**Cons**:
- Complex deck ownership (which partnership owns which deck?)
- Confusing UI (must select partnership when creating deck)
- Harder to dissolve partnerships (which decks go where?)

**Why not chosen**: Start with 1:1 constraint for simplicity. Can relax later based on user feedback.

## Implementation Notes

### Dependencies

- Django ORM for models
- No external libraries required
- Uses existing authentication system

### Migration Strategy

**Phase 1: Add New Models (Non-Breaking)**
```bash
# Create new models without modifying existing ones
python manage.py makemigrations
python manage.py migrate
```

**Phase 2: Modify Deck Model**
```python
# Migration to change Deck.user to Deck.created_by
class Migration(migrations.Migration):
    operations = [
        migrations.RenameField(
            model_name='deck',
            old_name='user',
            new_name='created_by',
        ),
        migrations.AlterField(
            model_name='deck',
            name='created_by',
            field=models.ForeignKey(..., on_delete=models.SET_NULL, null=True),
        ),
    ]
```

**Existing Data**: All existing decks remain as personal decks (no partnership association).

### Testing Approach

```python
# Unit tests
def test_partnership_creation():
    """Create partnership links two users"""

def test_invitation_code_generation():
    """Generated codes are unique and valid"""

def test_invitation_expiration():
    """Expired invitations cannot be accepted"""

def test_shared_deck_permissions():
    """Both partners can edit shared decks"""

def test_personal_deck_permissions():
    """Only creator can access personal decks"""

def test_partnership_dissolution():
    """Dissolving partnership removes deck access"""

def test_cannot_partner_with_self():
    """User cannot accept their own invitation"""

def test_one_partnership_per_user():
    """User can only have one active partnership"""
```

### Performance Considerations

- Index on `(user_a, is_active)` and `(user_b, is_active)` for fast partnership lookups
- Index on `code` field for invitation code lookups
- Use `prefetch_related('decks')` when fetching partnerships
- Use `select_related('created_by')` when fetching decks

### Security Considerations

**Permission Checks**:
```python
def require_deck_access(view_func):
    """Decorator to verify user can access deck."""
    def wrapper(request, deck_id):
        deck = get_object_or_404(Deck, id=deck_id)
        if not deck.can_view(request.user):
            return JsonResponse({
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You do not have access to this deck'
                }
            }, status=403)
        return view_func(request, deck_id, deck)
    return wrapper
```

**Invitation Code Security**:
- Use random alphanumeric codes (36^6 = 2.1 billion combinations)
- Expire after 7 days
- One-time use (marked as accepted)
- Rate limit invitation creation (prevent spam)

**Partnership Constraints**:
- Validate users cannot partner with themselves
- Validate only one active partnership per user
- Soft delete partnerships (audit trail)

### Database Indexes

```python
# Add to models
class Meta:
    indexes = [
        models.Index(fields=['user_a', 'is_active']),
        models.Index(fields=['user_b', 'is_active']),
        models.Index(fields=['code']),  # PartnershipInvitation
    ]
```

## Timeline

- **Phase 1 (Models + Backend)**: 2-3 days
  - Create Partnership and Invitation models
  - Modify Deck model
  - Implement API endpoints
  - Write tests

- **Phase 2 (Frontend)**: 2-3 days
  - Partnership management page
  - Modified deck dashboard
  - Invitation flow UI
  - Update API client (api.ts)

- **Phase 3 (Testing + Polish)**: 1-2 days
  - Integration testing
  - UI/UX refinement
  - Documentation updates

**Total Estimated Effort**: 5-8 days

## Open Questions

- [ ] Should we allow users to have multiple pending invitations (for retry/backup)?
- [ ] Should dissolved partnerships be fully deletable or always soft-deleted?
- [ ] Do we need email notifications when invitation is accepted?
- [ ] Should there be a partnership "name" field (e.g., "John & Maria's Spanish Journey")?
- [ ] Rate limiting strategy for invitation creation (max per day/week)?
- [ ] Should we show partnership history (previous partnerships)?

## References

- Django Many-to-Many Relationships: https://docs.djangoproject.com/en/4.2/topics/db/examples/many_to_many/
- Django Model Validation: https://docs.djangoproject.com/en/4.2/ref/models/instances/#validating-objects
- Soft Delete Pattern: https://stackoverflow.com/questions/6126170/django-soft-delete-models
