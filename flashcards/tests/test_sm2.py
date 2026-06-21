"""
Tests for the SM-2 spaced-repetition algorithm in flashcards/utils.py.

These tests exercise calculate_next_review() directly using unsaved
UserCardProgress instances, so they require no database access and run fast.
The algorithm only reads/writes the .repetitions, .interval, .ease_factor and
.next_review attributes of the object it is given.
"""

from datetime import timedelta

from django.test import SimpleTestCase
from django.utils import timezone

from flashcards.models import UserCardProgress
from flashcards.utils import calculate_next_review


def make_progress(ease_factor=2.5, interval=1, repetitions=0):
    """Build an unsaved progress object with the given SM-2 state."""
    return UserCardProgress(
        ease_factor=ease_factor,
        interval=interval,
        repetitions=repetitions,
    )


class IntervalProgressionTests(SimpleTestCase):
    """The interval should grow on success and reset on failure."""

    def test_first_successful_review_sets_interval_to_one(self):
        progress = make_progress(repetitions=0)
        calculate_next_review(progress, quality=5)
        self.assertEqual(progress.interval, 1)
        self.assertEqual(progress.repetitions, 1)

    def test_second_successful_review_sets_interval_to_six(self):
        progress = make_progress(repetitions=1, interval=1)
        calculate_next_review(progress, quality=5)
        self.assertEqual(progress.interval, 6)
        self.assertEqual(progress.repetitions, 2)

    def test_third_successful_review_multiplies_by_ease_factor(self):
        # interval 6 * ease 2.5 = 15 (ease is applied before being updated)
        progress = make_progress(repetitions=2, interval=6, ease_factor=2.5)
        calculate_next_review(progress, quality=5)
        self.assertEqual(progress.interval, 15)
        self.assertEqual(progress.repetitions, 3)

    def test_failure_resets_repetitions_and_interval(self):
        progress = make_progress(repetitions=5, interval=30)
        calculate_next_review(progress, quality=1)
        self.assertEqual(progress.repetitions, 0)
        self.assertEqual(progress.interval, 1)

    def test_quality_below_three_is_a_failure(self):
        for quality in (0, 1, 2):
            progress = make_progress(repetitions=3, interval=15)
            calculate_next_review(progress, quality=quality)
            self.assertEqual(progress.repetitions, 0, f"q={quality}")
            self.assertEqual(progress.interval, 1, f"q={quality}")


class EaseFactorTests(SimpleTestCase):
    """The ease factor adjusts per SM-2 and never drops below 1.3."""

    def test_perfect_recall_increases_ease(self):
        progress = make_progress(ease_factor=2.5)
        calculate_next_review(progress, quality=5)
        self.assertAlmostEqual(progress.ease_factor, 2.6, places=2)

    def test_quality_four_leaves_ease_unchanged(self):
        progress = make_progress(ease_factor=2.5)
        calculate_next_review(progress, quality=4)
        self.assertAlmostEqual(progress.ease_factor, 2.5, places=2)

    def test_difficult_recall_decreases_ease(self):
        progress = make_progress(ease_factor=2.5)
        calculate_next_review(progress, quality=3)
        self.assertAlmostEqual(progress.ease_factor, 2.36, places=2)

    def test_ease_factor_never_drops_below_minimum(self):
        progress = make_progress(ease_factor=1.3)
        calculate_next_review(progress, quality=0)
        self.assertEqual(progress.ease_factor, 1.3)


class NextReviewDateTests(SimpleTestCase):
    """next_review should be scheduled `interval` days into the future."""

    def test_next_review_is_in_the_future(self):
        progress = make_progress()
        calculate_next_review(progress, quality=5)
        self.assertGreater(progress.next_review, timezone.now())

    def test_next_review_matches_interval(self):
        progress = make_progress(repetitions=1, interval=1)
        calculate_next_review(progress, quality=5)  # -> interval 6
        expected = timezone.now() + timedelta(days=6)
        # Allow a small delta for execution time between the two now() calls.
        self.assertAlmostEqual(
            progress.next_review.timestamp(), expected.timestamp(), delta=5
        )
