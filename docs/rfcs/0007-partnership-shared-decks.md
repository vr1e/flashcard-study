# RFC 0007: Partnership & Shared Deck System

## Metadata

- **RFC Number**: 0007
- **Title**: Partnership & Shared Deck System
- **Author**: Development Team
- **Status**: Implemented
- **Created**: 2025-11-02
- **Last Updated**: 2025-11-03
- **Implemented**: 2025-11-03
- **Pull Request**: #3

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

Links two users together for shared deck access.

**Fields:**
- `user_a` - First partner (ForeignKey to User, CASCADE delete)
- `user_b` - Second partner (ForeignKey to User, CASCADE delete)
- `created_at` - Partnership creation timestamp
- `is_active` - Boolean flag (False when dissolved, enables soft delete)
- `decks` - Many-to-many relationship to shared Deck objects

**Constraints:**
- Unique together on (user_a, user_b) - prevents duplicate partnerships
- Database indexes on (user_a, is_active) and (user_b, is_active) for fast lookups

**Helper Methods:**
- `get_partner(user)` - Returns the other user in the partnership
- `has_member(user)` - Checks if user is in this partnership

**Validation Rules:**
- Users cannot partner with themselves
- Only one active partnership allowed per user
- Validation enforced at model level via `clean()` method

##### PartnershipInvitation Model

Invitation code system for creating partnerships.

**Fields:**
- `inviter` - User who created the invitation (ForeignKey to User, CASCADE delete)
- `code` - Unique 6-character alphanumeric code (CharField, unique, indexed)
- `created_at` - Invitation creation timestamp
- `expires_at` - Expiration timestamp (7 days from creation)
- `accepted_by` - User who accepted (ForeignKey to User, SET_NULL, nullable)
- `accepted_at` - Acceptance timestamp (nullable)

**Indexes:**
- On `code` field for fast lookup
- On (inviter, expires_at) for cleanup queries

**Helper Methods:**
- `generate_code()` - Static method to generate unique 6-character code using uppercase letters and digits
- `is_valid()` - Checks if invitation is not yet accepted and not expired
- Auto-generation logic in `save()` method creates code and sets expiration if not provided

##### Deck Model Changes

**Change Summary:** Deck ownership model updated to support both personal and shared decks.

**New Fields:**
- `created_by` - User who created the deck (ForeignKey, SET_NULL to preserve deck if user deletes account)
- `created_at` - Deck creation timestamp
- `updated_at` - Last modification timestamp

**Relationships:**
- Reverse relationship `partnerships` - Many-to-many from Partnership model
- Personal decks have no partnership associations
- Shared decks are linked to one active Partnership

**Permission Methods:**
- `is_shared()` - Returns true if deck is linked to an active partnership
- `can_edit(user)` - Returns true if user is creator OR is partner in active partnership
- `can_view(user)` - Currently same as `can_edit()` (view and edit permissions are identical)

### API Endpoints

#### Partnership Management

##### Create Invitation

**Endpoint:** `POST /api/partnership/invite/`

**Request:** No body required

**Success Response (200):**
- `code` - 6-character invitation code
- `expires_at` - Expiration timestamp (7 days from now)
- `created_at` - Creation timestamp

**Error Response (400 - Already Partnered):**
- Error code: `ALREADY_PARTNERED`
- Message: "You already have an active partnership"

**Business Logic:**
1. Check if user already has an active partnership
2. If yes, return error (one partnership per user limit)
3. If no, create new PartnershipInvitation with auto-generated code
4. Return invitation details

##### Accept Invitation

**Endpoint:** `POST /api/partnership/accept/`

**Request Body:**
- `code` - 6-character invitation code (case-insensitive)

**Success Response (200):**
- `partnership_id` - ID of created partnership
- `partner` - Partner user details (id, username, email)
- `created_at` - Partnership creation timestamp

**Error Responses:**
- **404 INVALID_CODE** - Invitation code not found or expired
- **400 EXPIRED** - Invitation has expired (>7 days old)
- **400 SELF_INVITATION** - User trying to accept their own invitation
- **400 ALREADY_PARTNERED** - User already has an active partnership

**Business Logic:**
1. Lookup invitation by code (convert to uppercase)
2. Validate invitation is not expired and not already accepted
3. Check inviter is not the same as acceptor (prevent self-partnership)
4. Check acceptor doesn't already have an active partnership
5. Create Partnership record linking both users
6. Mark invitation as accepted with timestamp
7. Return partnership details

##### Get Partnership Info

**Endpoint:** `GET /api/partnership/`

**Success Response (200 - has partnership):**
- `id` - Partnership ID
- `partner` - Partner user details (id, username, email)
- `created_at` - Partnership creation timestamp
- `shared_decks_count` - Number of shared decks

**Success Response (200 - no partnership):**
- `data: null`

**Business Logic:**
- Query for active partnership where user is either user_a or user_b
- If found, return partnership details with partner info
- If not found, return null

##### Dissolve Partnership

**Endpoint:** `DELETE /api/partnership/`

**Success Response (200):**
- `message` - Confirmation message
- `decks_affected` - Number of decks that were shared

**Error Response (404 - No Partnership):**
- Error code: `NO_PARTNERSHIP`
- Message: "No active partnership found"

**Business Logic:**
1. Find active partnership for current user
2. If not found, return 404 error
3. Count number of shared decks (for reporting)
4. Set `is_active = False` (soft delete for audit trail)
5. Clear deck associations (decks remain, just no longer shared)
6. Return success with count of affected decks

Note: Uses soft delete pattern - partnership record remains in database with `is_active=False`

#### Deck Management Changes

##### Create Deck (Modified)

**Endpoint:** `POST /api/decks/create/`

**Request Body:**
- `title` - Deck title (required)
- `description` - Deck description (optional)
- `shared` - Boolean flag to create as shared deck (NEW field)

**Success Response (200):**
- `id`, `title`, `description` - Deck details
- `is_shared` - Boolean indicating if deck is shared
- `created_by` - Creator user details (id, username)
- `shared_with` - Partner user details (id, username) if shared, null otherwise
- `created_at` - Creation timestamp

**Error Response (400 - No Partnership):**
- Error code: `NO_PARTNERSHIP`
- Message: "Cannot create shared deck without active partnership"

**Business Logic:**
1. Create Deck with provided title and description
2. If `shared: true`:
   - Find user's active partnership
   - If no partnership exists, delete deck and return error
   - If partnership exists, link deck to partnership via M2M relationship
3. Return deck details including sharing status

##### List Decks (Modified)

**Endpoint:** `GET /api/decks/`

**Success Response (200):**
Returns two arrays:
- `personal` - Decks created by user with no partnership association
- `shared` - Decks linked to user's active partnership

Each deck includes:
- `id`, `title`, `description` - Basic deck info
- `total_cards` - Total card count
- `cards_due` - Number of cards due for review
- `created_at` - Creation timestamp
- `created_by` - Creator details (for shared decks)
- `shared_with` - Partner username (for shared decks)

**Business Logic:**
1. Find user's active partnership (if exists)
2. Query personal decks: created by user AND not in any partnership
3. Query shared decks: all decks in active partnership
4. Return both lists with deck statistics

### User Interface/Experience

#### Partnership Management Page

**New Template**: `templates/partnership.html`

**Layout States:**

**1. With Active Partnership:**
- Display partner username
- Show partnership creation date
- Show count of shared decks
- Provide "Dissolve Partnership" button

**2. No Partnership:**
- "Generate Invitation Code" button to create invitation
- Input field + "Accept" button to accept existing code

**3. After Generating Invitation:**
- Display 6-character code prominently
- Show expiration date (7 days from creation)
- "Copy Code" button for easy sharing
- "Cancel Invitation" option

#### Deck Dashboard Changes

**Modified**: `templates/index.html`

**Layout Changes:**

**Partnership Status Banner:**
- Display partner username with active indicator
- Link to partnership management page

**Two Deck Sections:**

1. **Shared Decks Section:**
   - Heading with count "(3)"
   - "New Shared Deck" button
   - Each deck shows:
     - Title
     - Card count and cards due
     - Creator attribution ("Created by: [username]")
   - Visual indicator (partner badge/icon)

2. **Personal Decks Section:**
   - Heading with count
   - "New Personal Deck" button
   - Each deck shows title, card count, and cards due
   - No special visual indicator

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

**Unit Tests:**
- Partnership creation links two users correctly
- Invitation codes are unique and valid
- Expired invitations cannot be accepted
- Both partners can edit shared decks
- Only creator can access personal decks
- Dissolving partnership removes deck access
- User cannot accept their own invitation
- User can only have one active partnership

**Integration Tests:**
- End-to-end partnership creation flow (invite → accept → share deck)
- Deck access permissions after partnership dissolution
- Multi-user scenarios

### Performance Considerations

- Index on `(user_a, is_active)` and `(user_b, is_active)` for fast partnership lookups
- Index on `code` field for invitation code lookups
- Use `prefetch_related('decks')` when fetching partnerships
- Use `select_related('created_by')` when fetching decks

### Security Considerations

**Permission Checks:**
- View decorator pattern to verify user can access deck before operations
- Return 403 Forbidden if user lacks access
- Check both creator and partnership membership

**Invitation Code Security:**
- Random alphanumeric codes (36^6 = 2.1 billion combinations)
- 7-day expiration
- One-time use (marked as accepted after use)
- Consider rate limiting invitation creation to prevent spam

**Partnership Constraints:**
- Validate users cannot partner with themselves (model-level validation)
- Validate only one active partnership per user (model-level validation)
- Soft delete partnerships for audit trail (set `is_active=False`)

### Database Indexes

Required indexes for performance:
- `(user_a, is_active)` on Partnership model
- `(user_b, is_active)` on Partnership model
- `code` on PartnershipInvitation model
- `(inviter, expires_at)` on PartnershipInvitation model

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
