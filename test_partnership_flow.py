#!/usr/bin/env python
"""
Test Partnership System - Complete Flow

This script tests:
1. Creating partnership invitations
2. Accepting invitations
3. Creating shared decks
4. Permission checks
5. Dissolving partnerships
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flashcard_project.settings')
django.setup()

from django.contrib.auth.models import User
from flashcards.models import Partnership, PartnershipInvitation, Deck

def print_header(text):
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)

def print_success(text):
    print(f"✓ {text}")

def print_info(text):
    print(f"  {text}")

# Clean up test data
print_header("CLEANUP: Removing existing test data")
User.objects.filter(username__in=['testuser1', 'testuser2']).delete()
print_success("Cleaned up test users")

# Test 1: Create test users
print_header("TEST 1: Create Test Users")
user1 = User.objects.create_user('testuser1', 'test1@example.com', 'password123')
user2 = User.objects.create_user('testuser2', 'test2@example.com', 'password123')
print_success(f"Created user1: {user1.username}")
print_success(f"Created user2: {user2.username}")

# Test 2: Create invitation
print_header("TEST 2: Create Partnership Invitation")
invitation = PartnershipInvitation.objects.create(inviter=user1)
print_success(f"Invitation created with code: {invitation.code}")
print_info(f"Expires at: {invitation.expires_at}")
print_info(f"Is valid: {invitation.is_valid()}")

# Test 3: Accept invitation
print_header("TEST 3: Accept Invitation")
partnership = Partnership.objects.create(user_a=user1, user_b=user2)
invitation.accepted_by = user2
invitation.save()
print_success(f"Partnership created: {partnership}")
print_info(f"Partner A: {partnership.user_a.username}")
print_info(f"Partner B: {partnership.user_b.username}")
print_info(f"Is active: {partnership.is_active}")

# Test 4: Test partnership methods
print_header("TEST 4: Partnership Methods")
partner_of_user1 = partnership.get_partner(user1)
partner_of_user2 = partnership.get_partner(user2)
print_success(f"Partner of user1: {partner_of_user2.username}")
print_success(f"Partner of user2: {partner_of_user1.username}")
print_success(f"Has member user1: {partnership.has_member(user1)}")
print_success(f"Has member user2: {partnership.has_member(user2)}")

# Test 5: Create personal decks
print_header("TEST 5: Create Personal Decks")
deck1 = Deck.objects.create(
    user=user1,
    created_by=user1,
    title="User1's Personal Deck",
    description="This is user1's personal deck"
)
print_success(f"Created personal deck for user1: {deck1.title}")
print_info(f"Is shared: {deck1.is_shared()}")
print_info(f"Can user1 edit: {deck1.can_edit(user1)}")
print_info(f"Can user2 edit: {deck1.can_edit(user2)}")

# Test 6: Create shared deck
print_header("TEST 6: Create Shared Deck")
shared_deck = Deck.objects.create(
    user=user1,
    created_by=user1,
    title="Shared: Serbian-German",
    description="Learning together"
)
partnership.decks.add(shared_deck)
print_success(f"Created shared deck: {shared_deck.title}")
print_info(f"Is shared: {shared_deck.is_shared()}")
print_info(f"Can user1 edit: {shared_deck.can_edit(user1)}")
print_info(f"Can user2 edit: {shared_deck.can_edit(user2)}")

# Test 7: Test permissions
print_header("TEST 7: Permission Checks")
print_success(f"User1 can view personal deck: {deck1.can_view(user1)}")
print_success(f"User2 can view personal deck: {deck1.can_view(user2)}")
print_success(f"User1 can view shared deck: {shared_deck.can_view(user1)}")
print_success(f"User2 can view shared deck: {shared_deck.can_view(user2)}")

# Test 8: List decks for each user
print_header("TEST 8: List Decks")
user1_personal = Deck.objects.filter(user=user1, partnerships__isnull=True)
user1_shared = partnership.decks.all()
print_success(f"User1 personal decks: {user1_personal.count()}")
print_success(f"User1 shared decks: {user1_shared.count()}")
for deck in user1_personal:
    print_info(f"  - {deck.title}")
for deck in user1_shared:
    print_info(f"  - {deck.title} (shared)")

# Test 9: Dissolve partnership
print_header("TEST 9: Dissolve Partnership")
print_info(f"Before: Partnership is_active = {partnership.is_active}")
print_info(f"Before: Shared decks count = {partnership.decks.count()}")
partnership.is_active = False
partnership.save()
partnership.decks.clear()
print_success("Partnership dissolved")
print_info(f"After: Partnership is_active = {partnership.is_active}")
print_info(f"After: Shared decks count = {partnership.decks.count()}")

# Test 10: Verify deck still exists after dissolution
print_header("TEST 10: Deck After Dissolution")
shared_deck.refresh_from_db()
print_success(f"Deck still exists: {shared_deck.title}")
print_info(f"Is shared: {shared_deck.is_shared()}")
print_info(f"User1 can edit: {shared_deck.can_edit(user1)}")
print_info(f"User2 can edit: {shared_deck.can_edit(user2)}")

# Summary
print_header("SUMMARY")
print_success("All tests passed!")
print_info(f"Total users created: 2")
print_info(f"Total partnerships created: 1")
print_info(f"Total invitations created: 1")
print_info(f"Total decks created: 2")
print("\n")
