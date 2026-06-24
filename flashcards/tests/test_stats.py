"""
Tests for the statistics aggregation in utils.get_study_stats().

Focuses on the personal-vs-shared breakdown added in RFC 0012 (which fixed the
bug where a partner saw "0 courses" despite having shared-deck access) and
refined in RFC 0016 (creator's shared decks count as shared; real chart data).
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

    def test_creator_of_shared_deck_counts_it_as_shared(self):
        # Bob created the shared deck. It is in an active partnership, so it
        # must count as shared for Bob too -- NOT personal. (Previously the
        # owner's shared decks were miscounted under "personal".)
        stats = get_study_stats(self.bob)
        self.assertEqual(stats["shared_decks"], 1)
        self.assertEqual(stats["personal_decks"], 0)
        self.assertEqual(stats["total_decks"], 1)

    def test_breakdown_absent_when_filtering_specific_deck(self):
        stats = get_study_stats(self.alice, deck=self.personal)
        self.assertNotIn("personal_decks", stats)
        self.assertEqual(stats["total_decks"], 1)

    def test_chart_data_present_and_real(self):
        # No more placeholder arrays: chart payloads are computed from the DB.
        stats = get_study_stats(self.alice)

        # Forecast covers the next 7 days, day 0 = today.
        self.assertEqual(len(stats["cards_due_forecast"]), 7)
        self.assertIn("count", stats["cards_due_forecast"][0])

        # Quality distribution is six buckets (ratings 0..5), all zero with no reviews.
        self.assertEqual(stats["quality_distribution"], [0, 0, 0, 0, 0, 0])

        # No reviews yet, so no deck has an average quality.
        self.assertEqual(stats["deck_quality"], [])
