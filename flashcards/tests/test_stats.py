"""
Tests for the statistics aggregation in utils.get_study_stats().

Focuses on the personal-vs-shared breakdown added in RFC 0012, which fixed
the bug where a partner saw "0 courses" despite having shared-deck access.
"""

from django.contrib.auth.models import User
from django.test import TestCase

from flashcards.models import Card, Deck, Partnership
from flashcards.utils import get_study_stats


class StudyStatsBreakdownTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", password="pw")
        self.bob = User.objects.create_user("bob", password="pw")

        # Alice owns a personal deck with 2 cards.
        self.personal = Deck.objects.create(
            user=self.alice, created_by=self.alice, title="Alice Personal"
        )
        Card.objects.create(deck=self.personal, language_a="hola", language_b="hallo")
        Card.objects.create(deck=self.personal, language_a="adios", language_b="tschuss")

        # Bob owns a deck shared with Alice via a partnership (1 card).
        self.shared = Deck.objects.create(
            user=self.bob, created_by=self.bob, title="Shared Course"
        )
        Card.objects.create(deck=self.shared, language_a="si", language_b="ja")
        self.partnership = Partnership.objects.create(
            user_a=self.bob, user_b=self.alice
        )
        self.partnership.decks.add(self.shared)

    def test_personal_and_shared_decks_counted_separately(self):
        stats = get_study_stats(self.alice)
        self.assertEqual(stats["personal_decks"], 1)
        self.assertEqual(stats["shared_decks"], 1)
        self.assertEqual(stats["total_decks"], 2)

    def test_card_counts_split_by_ownership(self):
        stats = get_study_stats(self.alice)
        self.assertEqual(stats["personal_cards"], 2)
        self.assertEqual(stats["shared_cards"], 1)
        self.assertEqual(stats["total_cards"], 3)

    def test_partner_sees_shared_deck_in_stats(self):
        # Regression test for RFC 0012: Bob should see the shared course too.
        stats = get_study_stats(self.bob)
        # Bob owns the shared deck, so for Bob it counts as personal.
        self.assertEqual(stats["total_decks"], 1)

    def test_breakdown_absent_when_filtering_specific_deck(self):
        stats = get_study_stats(self.alice, deck=self.personal)
        self.assertNotIn("personal_decks", stats)
        self.assertEqual(stats["total_decks"], 1)
