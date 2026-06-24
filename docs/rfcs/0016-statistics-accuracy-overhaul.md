# RFC 0016: Statistics Accuracy Overhaul

**Status**: Implemented
**Created**: 2026-06-24

---

## What are we building?

A correctness pass over the `/stats` page so every number and chart reflects
real, per-user data. This finishes the statistics work started in
[RFC 0012](0012-p0-critical-ux-improvements.md) (which fixed the "0 courses"
count for partners) by (1) counting a shared course as *shared* even for the
partner who created it, (2) basing "due" counts on each user's own spaced-
repetition schedule, and (3) replacing the three placeholder charts with data
computed from the database.

## Why?

Manual testing (`docs.local/manual-test-plan.md`) found `/stats` was the one
weak spot once partnerships worked end-to-end:

1. **Creator's shared decks counted as personal.** The breakdown in
   `get_study_stats()` was ownership-based: `personal_decks` was *every* deck
   the user owned (including shared ones they created), and `shared_decks` only
   counted the partner's decks (`.exclude(user=user)`). So the creator of a
   shared course saw its decks and cards tallied under "personal", contradicting
   the filter tabs in `user_stats()`, where *courses* = `partnership.decks.all()`
   and *collections* = owned decks with no partnership.

2. **Due counts weren't per-user.** `cards_due_today` read the legacy, shared
   `Card.next_review` field. Each partner has their own `UserCardProgress` per
   direction, so a shared deck should show each partner their own due count, not
   a single shared number.

3. **Three charts were placeholders.** "Cards Due Per Day", "Average Quality by
   Course/Collection", and "Review Quality Distribution" rendered hardcoded
   arrays (`[12, 15, 8, ...]`, `Deck 1/2/3`, `[5, 10, 15, ...]`). The backend
   never computed them, so the page looked functional but showed fiction.

The study-streak number was also a stand-in ("1 if studied in the last 24h").

## How?

All changes are in `flashcards/utils.py::get_study_stats()` (data),
`src/ts/stats.ts` + `src/ts/api.ts` (display). No schema changes.

### Personal vs shared breakdown — match the filter tabs

The breakdown now uses the same definitions as the `/api/stats/` filter tabs, so
a deck is classified the same way regardless of who created it:

```python
# Shared: any deck in an active partnership the user belongs to (creator or not)
shared_decks = Deck.objects.filter(
    Q(partnerships__user_a=user) | Q(partnerships__user_b=user),
    partnerships__is_active=True,
).distinct()

# Personal: decks the user owns that are NOT shared
personal_decks = Deck.objects.filter(user=user).exclude(
    pk__in=shared_decks.values('pk')
).distinct()
```

### Per-user due counts via `UserCardProgress`

Due counts (and the new forecast) are computed from the current user's progress
rows, not the legacy `Card.next_review`:

```python
progress_qs = UserCardProgress.objects.filter(user=user, card__in=cards)
cards_due_today = progress_qs.filter(next_review__lte=now).count()
```

### Real chart data

- **`cards_due_forecast`** — list of 7 `{date, count}` entries from
  `progress_qs`; day 0 ("Today") includes everything due now or overdue.
- **`deck_quality`** — `{title, average_quality}` per deck the user has actually
  reviewed, via `reviews.values('card__deck__title').annotate(avg=Avg('quality'))`.
- **`quality_distribution`** — six-element array counting the user's reviews by
  rating 0..5.

### Real study streak

Replaces the 24h heuristic with consecutive-day counting (ending today or
yesterday) over the distinct dates the user has reviews:

```python
review_dates = set(reviews.annotate(d=TruncDate('reviewed_at')).values_list('d', flat=True))
study_streak_days = 0
check = timezone.localdate()
if check not in review_dates:
    check = check - timedelta(days=1)
while check in review_dates:
    study_streak_days += 1
    check = check - timedelta(days=1)
```

### Frontend

`updateCardsDueChart`, `updateDeckQualityChart`, and
`updateQualityDistributionChart` now read the new fields off the stats payload
instead of returning hardcoded arrays. The `Statistics` interface in `api.ts`
gains `cards_due_forecast`, `deck_quality`, and `quality_distribution`.

### Data/API Changes

- Database: none.
- API: `GET /api/stats/` (and `?filter=courses|collections`) gains three fields
  in `data`: `cards_due_forecast`, `deck_quality`, `quality_distribution`. The
  existing `cards_due_today` and `study_streak_days` are now per-user accurate.
  The `personal_*`/`shared_*` breakdown values change for users who created a
  shared course (those decks/cards move from personal → shared).

## Notes

- **Consistency is the design goal.** The breakdown, the `courses`/`collections`
  filter tabs, and the dashboard's personal/shared split now all agree on what
  "shared" means: membership in an active partnership, not ownership.
- **Per-deck quality only lists reviewed decks.** A deck with no reviews is
  omitted from `deck_quality` rather than shown as 0, so the chart compares decks
  the user has actually studied.
- **Tests:** `flashcards/tests/test_stats.py` was updated — the old
  `test_partner_sees_shared_deck_in_stats` only asserted `total_decks` and its
  comment baked in the bug ("for Bob it counts as personal"). It is now
  `test_creator_of_shared_deck_counts_it_as_shared`, plus
  `test_chart_data_present_and_real` covering the three new payloads.
- **Performance:** `deck_quality` is a single grouped aggregate; the forecast
  issues 7 small count queries. Fine at the per-couple scale this app targets; if
  deck counts grow, the forecast could be collapsed into one `TruncDate` group-by.
