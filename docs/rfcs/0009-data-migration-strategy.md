# RFC 0009: Data Migration Strategy

## Metadata

- **RFC Number**: 0009
- **Title**: Data Migration Strategy for Couples Language Learning
- **Author**: Development Team
- **Status**: Superseded
- **Created**: 2025-11-02
- **Last Updated**: 2025-11-03
- **Superseded By**: Direct implementation in migration 0004
- **Depends On**: RFC 0007 (Partnership), RFC 0008 (Bidirectional Learning)

## Note

**This RFC is no longer applicable.**

During implementation, RFC 0007 and RFC 0008 were implemented directly without requiring a phased data migration strategy, because:

1. **No production data existed** when the new schema was introduced
2. **Additive approach used**: New fields (`language_a`, `language_b`, language codes) were added alongside legacy fields (`front`, `back`) in migration `0004`
3. **Backward compatibility maintained**: Application code supports both old and new field formats
4. **No breaking changes required**: Legacy fields remain for backward compatibility

If future production data migration becomes necessary, this RFC provides a comprehensive strategy for reference.

## Summary

Define a comprehensive, safe migration strategy to transform the existing single-user flashcard application into a couples language learning tool, preserving all existing data while introducing new models and field changes.

## Motivation

**Why is this critical?**

The transformation from single-user to couples language learning requires **breaking changes** to the data model:

### Data Model Changes Required

1. **Card Model**:
   - Rename: `front` → `language_a`, `back` → `language_b`
   - Add: `language_a_code`, `language_b_code`, `context`
   - Remove: `ease_factor`, `interval`, `repetitions`, `next_review`

2. **Deck Model**:
   - Rename: `user` → `created_by`
   - Change: `on_delete=CASCADE` → `on_delete=SET_NULL`

3. **New Models**:
   - `Partnership`: Link two users
   - `PartnershipInvitation`: Invitation code system
   - `UserCardProgress`: Per-user, per-direction SM-2 tracking

4. **Modified Models**:
   - `Review`: Add `study_direction` field
   - `StudySession`: Add `study_direction` field

### Risks Without Proper Migration

- **Data loss**: Existing cards, reviews, and progress could be lost
- **Broken application**: Users unable to access their decks
- **Inconsistent state**: Partial migration leaving database corrupted
- **Downtime**: Extended outage during migration
- **No rollback**: Unable to revert if migration fails

### Migration Goals

1. **Zero data loss**: All existing cards, decks, reviews preserved
2. **Backward compatible**: Existing users can continue studying immediately after migration
3. **Safe execution**: Migration can be tested and rolled back if needed
4. **Minimal downtime**: Migration completes in seconds/minutes, not hours
5. **Audit trail**: Track what was migrated and when

## Proposed Solution

**What are we building and how?**

### Overview

A **phased migration approach** with Django migrations, data transformation scripts, and comprehensive testing:

1. **Phase 1**: Add new models (non-breaking)
2. **Phase 2**: Add new fields to existing models (non-breaking)
3. **Phase 3**: Migrate data from old fields to new fields
4. **Phase 4**: Remove old fields (breaking)
5. **Phase 5**: Update application code to use new schema

Each phase is a separate Django migration that can be tested and rolled back independently.

### Technical Details

#### Phase 1: Add New Models

**Goal**: Create Partnership, PartnershipInvitation, UserCardProgress without touching existing data.

**Migration** (`flashcards/migrations/0002_add_partnership_models.py`):

```python
from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):
    dependencies = [
        ('flashcards', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Create Partnership model
        migrations.CreateModel(
            name='Partnership',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(default=True)),
                ('user_a', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='partnerships_as_a',
                    to=settings.AUTH_USER_MODEL
                )),
                ('user_b', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='partnerships_as_b',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'unique_together': {('user_a', 'user_b')},
            },
        ),

        # Add indexes
        migrations.AddIndex(
            model_name='partnership',
            index=models.Index(fields=['user_a', 'is_active'], name='partnership_user_a_idx'),
        ),
        migrations.AddIndex(
            model_name='partnership',
            index=models.Index(fields=['user_b', 'is_active'], name='partnership_user_b_idx'),
        ),

        # Create PartnershipInvitation model
        migrations.CreateModel(
            name='PartnershipInvitation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True)),
                ('code', models.CharField(max_length=10, unique=True, db_index=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('accepted_at', models.DateTimeField(null=True, blank=True)),
                ('inviter', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sent_invitations',
                    to=settings.AUTH_USER_MODEL
                )),
                ('accepted_by', models.ForeignKey(
                    null=True,
                    blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='accepted_invitations',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
        ),

        # Create UserCardProgress model
        migrations.CreateModel(
            name='UserCardProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True)),
                ('study_direction', models.CharField(
                    max_length=10,
                    choices=[('A_TO_B', 'Language A → Language B'), ('B_TO_A', 'Language B → Language A')]
                )),
                ('ease_factor', models.FloatField(default=2.5)),
                ('interval', models.IntegerField(default=1)),
                ('repetitions', models.IntegerField(default=0)),
                ('next_review', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='card_progress',
                    to=settings.AUTH_USER_MODEL
                )),
                ('card', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='user_progress',
                    to='flashcards.Card'
                )),
            ],
            options={
                'unique_together': {('user', 'card', 'study_direction')},
            },
        ),

        # Add indexes for UserCardProgress
        migrations.AddIndex(
            model_name='usercardprogress',
            index=models.Index(fields=['user', 'next_review'], name='ucp_user_next_review_idx'),
        ),
        migrations.AddIndex(
            model_name='usercardprogress',
            index=models.Index(fields=['user', 'card'], name='ucp_user_card_idx'),
        ),

        # Add many-to-many relationship: Partnership -> Decks
        migrations.AddField(
            model_name='partnership',
            name='decks',
            field=models.ManyToManyField(
                blank=True,
                related_name='partnerships',
                to='flashcards.Deck'
            ),
        ),
    ]
```

**Testing**:
```bash
python manage.py makemigrations --dry-run  # Preview
python manage.py migrate --plan  # Show migration plan
python manage.py migrate flashcards 0002  # Apply migration
```

**Rollback**:
```bash
python manage.py migrate flashcards 0001  # Revert to previous
```

**Impact**: No breaking changes. New models created but not yet used.

---

#### Phase 2: Add New Fields to Existing Models

**Goal**: Add language fields to Card, change Deck ownership, add direction fields to Review/StudySession.

**Migration** (`flashcards/migrations/0003_add_language_fields.py`):

```python
from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):
    dependencies = [
        ('flashcards', '0002_add_partnership_models'),
    ]

    operations = [
        # Add language fields to Card (keep old fields for now)
        migrations.AddField(
            model_name='card',
            name='language_a',
            field=models.TextField(default='', blank=True),
        ),
        migrations.AddField(
            model_name='card',
            name='language_b',
            field=models.TextField(default='', blank=True),
        ),
        migrations.AddField(
            model_name='card',
            name='language_a_code',
            field=models.CharField(max_length=10, default='en'),
        ),
        migrations.AddField(
            model_name='card',
            name='language_b_code',
            field=models.CharField(max_length=10, default='en'),
        ),
        migrations.AddField(
            model_name='card',
            name='context',
            field=models.TextField(blank=True, default=''),
        ),

        # Add created_by to Deck (keep old user field for now)
        migrations.AddField(
            model_name='deck',
            name='created_by',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_decks',
                to=settings.AUTH_USER_MODEL
            ),
        ),

        # Add study_direction to Review
        migrations.AddField(
            model_name='review',
            name='study_direction',
            field=models.CharField(
                max_length=10,
                choices=[('A_TO_B', 'Language A → Language B'), ('B_TO_A', 'Language B → Language A')],
                default='A_TO_B'
            ),
        ),

        # Add study_direction to StudySession
        migrations.AddField(
            model_name='studysession',
            name='study_direction',
            field=models.CharField(
                max_length=10,
                choices=[('A_TO_B', 'Language A → Language B'), ('B_TO_A', 'Language B → Language A')],
                null=True,
                blank=True
            ),
        ),
    ]
```

**Testing**:
```bash
python manage.py migrate flashcards 0003
```

**Impact**: No breaking changes. New fields added with defaults, old fields still exist.

---

#### Phase 3: Migrate Data

**Goal**: Copy data from old fields to new fields, create UserCardProgress entries.

**Migration** (`flashcards/migrations/0004_migrate_data.py`):

```python
from django.db import migrations
from django.utils import timezone

def migrate_cards_and_progress(apps, schema_editor):
    """
    Migrate existing cards to new structure:
    1. Copy front → language_a, back → language_b
    2. Create UserCardProgress from Card SM-2 fields
    3. Copy deck.user → deck.created_by
    """
    Card = apps.get_model('flashcards', 'Card')
    Deck = apps.get_model('flashcards', 'Deck')
    UserCardProgress = apps.get_model('flashcards', 'UserCardProgress')

    # Migrate Cards
    cards_migrated = 0
    for card in Card.objects.all():
        # Copy text content
        card.language_a = card.front
        card.language_b = card.back

        # Set default language codes (can be updated manually later)
        # Try to detect if deck has specific languages based on deck title
        deck_title_lower = card.deck.title.lower()
        if 'serbian' in deck_title_lower or 'srpski' in deck_title_lower:
            card.language_a_code = 'sr'
        elif 'german' in deck_title_lower or 'deutsch' in deck_title_lower:
            card.language_a_code = 'de'
        else:
            card.language_a_code = 'en'  # Default

        if 'german' in deck_title_lower or 'deutsch' in deck_title_lower:
            card.language_b_code = 'de'
        elif 'serbian' in deck_title_lower or 'srpski' in deck_title_lower:
            card.language_b_code = 'sr'
        else:
            card.language_b_code = 'en'  # Default

        card.save()
        cards_migrated += 1

    print(f"✓ Migrated {cards_migrated} cards (front/back → language_a/language_b)")

    # Create UserCardProgress from existing Card SM-2 data
    progress_created = 0
    for card in Card.objects.select_related('deck', 'deck__user').all():
        deck_owner = card.deck.user

        # Create progress for A_TO_B direction (default study direction)
        UserCardProgress.objects.get_or_create(
            user=deck_owner,
            card=card,
            study_direction='A_TO_B',
            defaults={
                'ease_factor': card.ease_factor,
                'interval': card.interval,
                'repetitions': card.repetitions,
                'next_review': card.next_review,
            }
        )
        progress_created += 1

    print(f"✓ Created {progress_created} UserCardProgress entries")

    # Migrate Deck ownership
    decks_migrated = 0
    for deck in Deck.objects.all():
        deck.created_by = deck.user
        deck.save()
        decks_migrated += 1

    print(f"✓ Migrated {decks_migrated} decks (user → created_by)")

def reverse_migration(apps, schema_editor):
    """
    Reverse migration: clear new fields.
    """
    Card = apps.get_model('flashcards', 'Card')
    Deck = apps.get_model('flashcards', 'Deck')
    UserCardProgress = apps.get_model('flashcards', 'UserCardProgress')

    # Clear new Card fields
    Card.objects.update(
        language_a='',
        language_b='',
        language_a_code='en',
        language_b_code='en',
        context=''
    )

    # Clear Deck.created_by
    Deck.objects.update(created_by=None)

    # Delete all UserCardProgress entries
    UserCardProgress.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('flashcards', '0003_add_language_fields'),
    ]

    operations = [
        migrations.RunPython(migrate_cards_and_progress, reverse_migration),
    ]
```

**Testing**:
```bash
# Dry run (check SQL)
python manage.py sqlmigrate flashcards 0004

# Apply migration
python manage.py migrate flashcards 0004

# Verify data
python manage.py shell
>>> from flashcards.models import Card, UserCardProgress
>>> Card.objects.first()  # Check language_a, language_b populated
>>> UserCardProgress.objects.count()  # Should equal Card.objects.count()
```

**Rollback**:
```bash
python manage.py migrate flashcards 0003  # Runs reverse_migration
```

**Impact**: Data copied to new fields. Old fields still exist (safety net).

---

#### Phase 4: Remove Old Fields

**Goal**: Drop deprecated fields after confirming migration success.

**Migration** (`flashcards/migrations/0005_remove_old_fields.py`):

```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('flashcards', '0004_migrate_data'),
    ]

    operations = [
        # Remove old Card fields
        migrations.RemoveField(
            model_name='card',
            name='front',
        ),
        migrations.RemoveField(
            model_name='card',
            name='back',
        ),
        migrations.RemoveField(
            model_name='card',
            name='ease_factor',
        ),
        migrations.RemoveField(
            model_name='card',
            name='interval',
        ),
        migrations.RemoveField(
            model_name='card',
            name='repetitions',
        ),
        migrations.RemoveField(
            model_name='card',
            name='next_review',
        ),

        # Remove old Deck.user field
        migrations.RemoveField(
            model_name='deck',
            name='user',
        ),

        # Make language fields non-nullable (now required)
        migrations.AlterField(
            model_name='card',
            name='language_a',
            field=models.TextField(),
        ),
        migrations.AlterField(
            model_name='card',
            name='language_b',
            field=models.TextField(),
        ),
    ]
```

**Testing**:
```bash
python manage.py migrate flashcards 0005
```

**WARNING**: This migration is **irreversible** without backups. Old fields are permanently deleted.

**Rollback**: Requires restoring from database backup (see Backup Strategy section).

**Impact**: Breaking change. Application code must be updated to use new fields before this migration.

---

#### Phase 5: Update Application Code

**Goal**: Update views, serializers, forms to use new schema.

**Changes Required**:

1. **Views** (`flashcards/views.py`):
   ```python
   # OLD
   card = Card.objects.create(deck=deck, front=data['front'], back=data['back'])

   # NEW
   card = Card.objects.create(
       deck=deck,
       language_a=data['language_a'],
       language_b=data['language_b'],
       language_a_code=data.get('language_a_code', 'en'),
       language_b_code=data.get('language_b_code', 'en'),
       context=data.get('context', '')
   )
   ```

2. **SM-2 Algorithm** (`flashcards/utils.py`):
   ```python
   # OLD
   def calculate_next_review(card, quality):
       card.ease_factor = ...
       card.next_review = ...
       return card

   # NEW
   def calculate_next_review(progress, quality):
       progress.ease_factor = ...
       progress.next_review = ...
       return progress
   ```

3. **Frontend** (`src/ts/api.ts`):
   ```typescript
   // OLD
   interface Card {
       id: number;
       front: string;
       back: string;
   }

   // NEW
   interface Card {
       id: number;
       language_a: string;
       language_b: string;
       language_a_code: string;
       language_b_code: string;
       context?: string;
   }
   ```

**Testing**: Comprehensive integration tests before deploying.

---

### Migration Execution Plan

#### Pre-Migration Checklist

- [ ] **Backup database**:
  ```bash
  python manage.py dumpdata > backup_$(date +%Y%m%d_%H%M%S).json
  # OR for production
  pg_dump database_name > backup.sql
  ```

- [ ] **Test migrations on copy of production database**:
  ```bash
  # Copy production DB to staging
  # Run all migrations
  # Verify data integrity
  # Test application functionality
  ```

- [ ] **Code review**: All migration files reviewed by team

- [ ] **Rollback plan documented**: Steps to revert if migration fails

- [ ] **Monitoring setup**: Track migration progress and errors

#### Migration Steps (Production)

1. **Put application in maintenance mode** (optional, recommended):
   ```python
   # settings.py
   MAINTENANCE_MODE = True
   ```

2. **Backup database**:
   ```bash
   python manage.py dumpdata > pre_migration_backup.json
   ```

3. **Run migrations sequentially**:
   ```bash
   python manage.py migrate flashcards 0002  # Add new models
   python manage.py migrate flashcards 0003  # Add new fields
   python manage.py migrate flashcards 0004  # Migrate data
   # CHECKPOINT: Verify data before continuing
   python manage.py migrate flashcards 0005  # Remove old fields (irreversible!)
   ```

4. **Verify data integrity**:
   ```python
   python manage.py shell
   >>> from flashcards.models import Card, UserCardProgress
   >>> assert Card.objects.exclude(language_a='').count() == Card.objects.count()
   >>> assert UserCardProgress.objects.count() > 0
   ```

5. **Deploy updated application code**:
   ```bash
   git pull origin main
   npm run build  # Rebuild TypeScript
   python manage.py collectstatic --noinput
   systemctl restart gunicorn  # Or reload web server
   ```

6. **Exit maintenance mode**:
   ```python
   # settings.py
   MAINTENANCE_MODE = False
   ```

7. **Monitor for errors**:
   - Check logs for exceptions
   - Test core functionality (create card, study session, review)
   - Monitor user reports

#### Rollback Procedure

**If migration fails BEFORE Phase 4** (old fields still exist):
```bash
# Revert to previous migration
python manage.py migrate flashcards 0001

# Restore application code
git checkout main
systemctl restart gunicorn
```

**If migration fails AFTER Phase 4** (old fields deleted):
```bash
# Restore database from backup
python manage.py flush --noinput
python manage.py loaddata pre_migration_backup.json

# Revert application code
git checkout main
systemctl restart gunicorn
```

---

### Data Integrity Validation

#### Post-Migration Checks

```python
# Check 1: All cards have language content
from flashcards.models import Card

empty_language_a = Card.objects.filter(language_a='').count()
empty_language_b = Card.objects.filter(language_b='').count()

assert empty_language_a == 0, f"{empty_language_a} cards have empty language_a"
assert empty_language_b == 0, f"{empty_language_b} cards have empty language_b"

# Check 2: UserCardProgress exists for all cards
from flashcards.models import UserCardProgress

total_cards = Card.objects.count()
total_progress = UserCardProgress.objects.filter(study_direction='A_TO_B').count()

assert total_progress >= total_cards, f"Missing UserCardProgress entries: {total_cards - total_progress}"

# Check 3: All decks have created_by
from flashcards.models import Deck

decks_without_creator = Deck.objects.filter(created_by__isnull=True).count()
assert decks_without_creator == 0, f"{decks_without_creator} decks missing created_by"

# Check 4: SM-2 data preserved
# Compare old Review data with new UserCardProgress
from flashcards.models import Review

review_count = Review.objects.count()
assert review_count > 0, "Reviews should still exist"
```

#### Automated Validation Script

```python
# flashcards/management/commands/validate_migration.py

from django.core.management.base import BaseCommand
from flashcards.models import Card, Deck, UserCardProgress

class Command(BaseCommand):
    help = 'Validate data integrity after migration'

    def handle(self, *args, **options):
        errors = []

        # Check cards
        total_cards = Card.objects.count()
        self.stdout.write(f"Total cards: {total_cards}")

        empty_lang_a = Card.objects.filter(language_a='').count()
        if empty_lang_a > 0:
            errors.append(f"❌ {empty_lang_a} cards have empty language_a")

        empty_lang_b = Card.objects.filter(language_b='').count()
        if empty_lang_b > 0:
            errors.append(f"❌ {empty_lang_b} cards have empty language_b")

        # Check UserCardProgress
        total_progress = UserCardProgress.objects.count()
        self.stdout.write(f"Total UserCardProgress: {total_progress}")

        if total_progress < total_cards:
            errors.append(f"❌ Missing UserCardProgress entries: expected {total_cards}, got {total_progress}")

        # Check decks
        total_decks = Deck.objects.count()
        decks_no_creator = Deck.objects.filter(created_by__isnull=True).count()
        if decks_no_creator > 0:
            errors.append(f"❌ {decks_no_creator} decks missing created_by")

        # Report
        if errors:
            self.stdout.write(self.style.ERROR("\n❌ VALIDATION FAILED:"))
            for error in errors:
                self.stdout.write(self.style.ERROR(f"  {error}"))
            return

        self.stdout.write(self.style.SUCCESS("\n✓ VALIDATION PASSED"))
        self.stdout.write(self.style.SUCCESS(f"  - {total_cards} cards migrated"))
        self.stdout.write(self.style.SUCCESS(f"  - {total_progress} progress records created"))
        self.stdout.write(self.style.SUCCESS(f"  - {total_decks} decks migrated"))
```

**Usage**:
```bash
python manage.py validate_migration
```

---

### Backup Strategy

#### Pre-Migration Backup

**Option 1: Django dumpdata** (small databases, < 1GB):
```bash
python manage.py dumpdata --indent 2 > backup_$(date +%Y%m%d_%H%M%S).json
```

**Option 2: Database dump** (production, PostgreSQL):
```bash
pg_dump -h localhost -U username database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Option 3: Database dump** (SQLite):
```bash
sqlite3 db.sqlite3 ".backup 'backup_$(date +%Y%m%d_%H%M%S).sqlite3'"
```

#### Restore from Backup

**Django loaddata**:
```bash
python manage.py flush --noinput  # Clear database
python manage.py migrate  # Ensure schema matches
python manage.py loaddata backup_20251102_140000.json
```

**PostgreSQL**:
```bash
dropdb database_name
createdb database_name
psql database_name < backup_20251102_140000.sql
```

**SQLite**:
```bash
mv db.sqlite3 db.sqlite3.corrupted
cp backup_20251102_140000.sqlite3 db.sqlite3
```

---

### Testing Strategy

#### Unit Tests for Migrations

```python
# flashcards/tests/test_migrations.py

from django.test import TestCase
from django.contrib.auth import get_user_model
from flashcards.models import Card, Deck, UserCardProgress

User = get_user_model()

class MigrationTestCase(TestCase):
    def test_card_migration(self):
        """Test card data migration from front/back to language_a/language_b"""
        # This test assumes old schema still exists
        # Run before Phase 4 migration

        user = User.objects.create_user('testuser', 'test@example.com', 'password')
        deck = Deck.objects.create(user=user, title='Test Deck')

        # Create card with old fields (if they still exist)
        card = Card.objects.create(
            deck=deck,
            front='hello',
            back='hola'
        )

        # Run migration
        # ... migration logic ...

        # Verify new fields populated
        card.refresh_from_db()
        self.assertEqual(card.language_a, 'hello')
        self.assertEqual(card.language_b, 'hola')

    def test_user_card_progress_creation(self):
        """Test UserCardProgress created from Card SM-2 data"""
        user = User.objects.create_user('testuser', 'test@example.com', 'password')
        deck = Deck.objects.create(created_by=user, title='Test Deck')

        card = Card.objects.create(
            deck=deck,
            language_a='test',
            language_b='prueba'
        )

        # Manually trigger migration logic
        UserCardProgress.objects.create(
            user=user,
            card=card,
            study_direction='A_TO_B',
            ease_factor=2.5,
            interval=1,
            repetitions=0
        )

        # Verify progress exists
        progress = UserCardProgress.objects.get(user=user, card=card, study_direction='A_TO_B')
        self.assertEqual(progress.ease_factor, 2.5)
        self.assertEqual(progress.interval, 1)
```

#### Integration Tests

```python
# Test full migration on test database
class FullMigrationTest(TestCase):
    def setUp(self):
        # Create test data with old schema
        self.user = User.objects.create_user('test', 'test@example.com', 'pass')
        self.deck = Deck.objects.create(user=self.user, title='Spanish')
        self.card = Card.objects.create(
            deck=self.deck,
            front='hello',
            back='hola',
            ease_factor=2.5,
            interval=6,
            repetitions=2
        )

    def test_complete_migration(self):
        """Test all migration phases"""
        # Phase 1-3: Add models and fields, migrate data
        # ... run migrations ...

        # Verify card migrated
        card = Card.objects.get(id=self.card.id)
        self.assertEqual(card.language_a, 'hello')
        self.assertEqual(card.language_b, 'hola')

        # Verify progress created
        progress = UserCardProgress.objects.get(
            user=self.user,
            card=card,
            study_direction='A_TO_B'
        )
        self.assertEqual(progress.ease_factor, 2.5)
        self.assertEqual(progress.interval, 6)
        self.assertEqual(progress.repetitions, 2)

        # Verify deck owner migrated
        deck = Deck.objects.get(id=self.deck.id)
        self.assertEqual(deck.created_by, self.user)
```

---

### Risk Mitigation

#### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | Critical | Backups, dry runs, validation scripts |
| Migration takes too long | Medium | High | Test on production-size data, optimize queries |
| Rollback corrupts database | Low | Critical | Test rollback procedure, keep backups |
| Application breaks after migration | Medium | High | Integration tests, staged deployment |
| Users report missing cards | Low | High | Validation scripts, monitoring |
| Language codes incorrect | High | Low | Manual review after migration, update script |

#### Mitigation Strategies

1. **Test on staging**: Run full migration on copy of production database
2. **Phased deployment**: Test each migration phase independently
3. **Maintenance window**: Schedule migration during low-traffic period
4. **Monitoring**: Set up alerts for errors after migration
5. **Communication**: Notify users of upcoming changes and potential downtime

---

## Alternatives Considered

### Alternative 1: Create New Database, Migrate Data Externally

**Description**: Create new database with new schema, write custom script to copy data.

**Pros**:
- Clean separation (old DB untouched)
- Easy rollback (just switch connection string)
- No Django migration complexity

**Cons**:
- Requires double storage (two databases)
- Custom migration script harder to test
- No Django migration tracking
- More complex deployment

**Why not chosen**: Django migrations provide better tracking and rollback capabilities.

### Alternative 2: Feature Flags + Gradual Rollout

**Description**: Add new fields alongside old fields, use feature flags to toggle between old/new code paths.

**Pros**:
- Zero downtime
- Gradual user rollout
- Easy rollback (toggle flag)

**Cons**:
- Much more complex code (dual code paths)
- Data sync between old/new fields
- Technical debt (old code lingers)
- Longer timeline

**Why not chosen**: Migration is straightforward enough to do in one shot. Feature flags add unnecessary complexity.

### Alternative 3: No Migration, Fresh Start

**Description**: Launch new version as separate app, let users manually recreate decks.

**Pros**:
- No migration complexity
- Clean slate
- No risk to existing data

**Cons**:
- Users lose all progress (unacceptable)
- Loss of trust
- Manual effort for users

**Why not chosen**: Preserving user data is non-negotiable.

---

## Implementation Notes

### Dependencies

- Django migrations framework (built-in)
- No external tools required

### Timeline

- **Planning**: 1 day (review RFC, plan migrations)
- **Writing migrations**: 2 days (code + tests)
- **Testing on staging**: 1 day (dry runs, validation)
- **Production migration**: 1 hour (scheduled maintenance window)
- **Post-migration monitoring**: 2 days (watch for issues)

**Total Estimated Effort**: 4-5 days

### Performance Considerations

**Migration Time Estimate** (based on dataset size):

| Dataset Size | Cards | Users | Estimated Time |
|--------------|-------|-------|----------------|
| Small | < 1,000 | 1-10 | < 1 minute |
| Medium | 1,000-10,000 | 10-100 | 1-5 minutes |
| Large | 10,000-100,000 | 100-1,000 | 5-30 minutes |
| Very Large | > 100,000 | > 1,000 | 30+ minutes |

**Optimization Strategies**:
- Use `bulk_create()` for UserCardProgress entries
- Add indexes before migration (Phase 1)
- Use `select_related()` to reduce queries
- Run during low-traffic period

### Security Considerations

- **Backup encryption**: Encrypt database backups
- **Access control**: Limit who can run migrations
- **Audit logging**: Log all migration actions
- **Validation**: Verify no data exposed during migration

---

## Open Questions

- [ ] Should we support rollback after Phase 4 (requires restoring from backup)?
- [ ] How long should we keep database backups after migration?
- [ ] Should we add a "migration_version" field to models for tracking?
- [ ] Do we need a "dry run" mode for migrations?
- [ ] Should language code detection be smarter (auto-detect from content)?
- [ ] How to handle edge cases (e.g., cards with empty front/back)?

---

## Success Criteria

Migration is considered successful when:

✅ All existing cards migrated (language_a, language_b populated)
✅ All UserCardProgress entries created (count ≥ card count)
✅ All decks have created_by set
✅ All reviews and study sessions preserved
✅ No data loss (verified via validation script)
✅ Application runs without errors
✅ Users can create new cards, study, and review
✅ Existing study schedules still work

---

## References

- Django Migrations: https://docs.djangoproject.com/en/4.2/topics/migrations/
- Data Migration Best Practices: https://docs.djangoproject.com/en/4.2/topics/migrations/#data-migrations
- PostgreSQL Backup: https://www.postgresql.org/docs/current/backup.html
- Zero-Downtime Migrations: https://engineering.fb.com/2020/02/24/data-infrastructure/zero-downtime-migrations/
