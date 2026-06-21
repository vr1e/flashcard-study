"""
Tests for model methods: deck permissions, partnership helpers,
invitation validity/code generation, and activity display text.
"""

from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from flashcards.models import (
    Activity,
    Deck,
    Partnership,
    PartnershipInvitation,
)


class DeckPermissionTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", password="pw")
        self.partner = User.objects.create_user("partner", password="pw")
        self.stranger = User.objects.create_user("stranger", password="pw")
        self.deck = Deck.objects.create(
            user=self.owner, created_by=self.owner, title="My Deck"
        )

    def test_owner_can_edit_and_view(self):
        self.assertTrue(self.deck.can_edit(self.owner))
        self.assertTrue(self.deck.can_view(self.owner))

    def test_stranger_cannot_edit_or_view(self):
        self.assertFalse(self.deck.can_edit(self.stranger))
        self.assertFalse(self.deck.can_view(self.stranger))

    def test_partner_can_edit_shared_deck(self):
        partnership = Partnership.objects.create(
            user_a=self.owner, user_b=self.partner
        )
        partnership.decks.add(self.deck)
        self.assertTrue(self.deck.is_shared())
        self.assertTrue(self.deck.can_edit(self.partner))

    def test_partner_cannot_edit_after_partnership_dissolved(self):
        partnership = Partnership.objects.create(
            user_a=self.owner, user_b=self.partner, is_active=False
        )
        partnership.decks.add(self.deck)
        self.assertFalse(self.deck.is_shared())
        self.assertFalse(self.deck.can_edit(self.partner))


class PartnershipHelperTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", password="pw")
        self.bob = User.objects.create_user("bob", password="pw")
        self.carol = User.objects.create_user("carol", password="pw")
        self.partnership = Partnership.objects.create(
            user_a=self.alice, user_b=self.bob
        )

    def test_get_partner_returns_the_other_user(self):
        self.assertEqual(self.partnership.get_partner(self.alice), self.bob)
        self.assertEqual(self.partnership.get_partner(self.bob), self.alice)

    def test_get_partner_raises_for_non_member(self):
        with self.assertRaises(ValueError):
            self.partnership.get_partner(self.carol)

    def test_has_member(self):
        self.assertTrue(self.partnership.has_member(self.alice))
        self.assertTrue(self.partnership.has_member(self.bob))
        self.assertFalse(self.partnership.has_member(self.carol))


class PartnershipInvitationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("inviter", password="pw")

    def test_save_auto_generates_code_and_expiry(self):
        invitation = PartnershipInvitation.objects.create(inviter=self.user)
        self.assertEqual(len(invitation.code), 6)
        self.assertTrue(invitation.code.isalnum())
        self.assertTrue(invitation.code.isupper())
        self.assertGreater(invitation.expires_at, timezone.now())

    def test_generated_codes_are_unique(self):
        codes = {
            PartnershipInvitation.objects.create(inviter=self.user).code
            for _ in range(25)
        }
        self.assertEqual(len(codes), 25)

    def test_fresh_invitation_is_valid(self):
        invitation = PartnershipInvitation.objects.create(inviter=self.user)
        self.assertTrue(invitation.is_valid())

    def test_expired_invitation_is_invalid(self):
        invitation = PartnershipInvitation.objects.create(
            inviter=self.user,
            expires_at=timezone.now() - timedelta(days=1),
        )
        self.assertFalse(invitation.is_valid())

    def test_accepted_invitation_is_invalid(self):
        acceptor = User.objects.create_user("acceptor", password="pw")
        invitation = PartnershipInvitation.objects.create(inviter=self.user)
        invitation.accepted_by = acceptor
        invitation.save()
        self.assertFalse(invitation.is_valid())


class ActivityDisplayTextTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("learner", password="pw")
        self.deck = Deck.objects.create(
            user=self.user, created_by=self.user, title="Spanish"
        )

    def test_card_added_pluralizes(self):
        activity = Activity.objects.create(
            user=self.user, action_type="CARD_ADDED",
            deck=self.deck, details={"count": 3},
        )
        self.assertEqual(activity.get_display_text(), "added 3 cards to Spanish")

    def test_card_added_singular(self):
        activity = Activity.objects.create(
            user=self.user, action_type="CARD_ADDED",
            deck=self.deck, details={"count": 1},
        )
        self.assertEqual(activity.get_display_text(), "added 1 card to Spanish")

    def test_deck_created_text(self):
        activity = Activity.objects.create(
            user=self.user, action_type="DECK_CREATED", deck=self.deck,
        )
        self.assertEqual(activity.get_display_text(), "created course Spanish")
