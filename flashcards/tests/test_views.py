"""
Tests for API endpoints: authentication gating, deck CRUD, permission
enforcement, and the full partnership invite/accept/join flow.
"""

import json

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse

from flashcards.models import (
    Card,
    Deck,
    Partnership,
    PartnershipInvitation,
    UserCardProgress,
)


class AuthenticationRequiredTests(TestCase):
    def test_dashboard_redirects_anonymous_user_to_login(self):
        response = self.client.get(reverse("index"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login/", response.url)

    def test_deck_list_api_requires_login(self):
        response = self.client.get(reverse("api_deck_list"))
        self.assertEqual(response.status_code, 302)


class DeckApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("owner", password="pw")
        self.client.force_login(self.user)

    def test_create_personal_deck(self):
        response = self.client.post(
            reverse("api_deck_create"),
            data=json.dumps({"title": "My Collection"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["title"], "My Collection")
        self.assertTrue(Deck.objects.filter(id=body["data"]["id"]).exists())

    def test_create_deck_requires_title(self):
        response = self.client.post(
            reverse("api_deck_create"),
            data=json.dumps({"title": "   "}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "INVALID_INPUT")

    def test_create_shared_deck_without_partnership_is_pending(self):
        response = self.client.post(
            reverse("api_deck_create"),
            data=json.dumps({"title": "Shared", "shared": True}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(body["data"]["share_pending"])
        self.assertFalse(body["data"]["is_shared"])
        deck = Deck.objects.get(id=body["data"]["id"])
        self.assertTrue(deck.share_pending)
        self.assertFalse(deck.partnerships.exists())

    def test_deck_list_separates_collections_and_courses(self):
        Deck.objects.create(user=self.user, created_by=self.user, title="Solo")
        response = self.client.get(reverse("api_deck_list"))
        data = response.json()["data"]
        self.assertEqual(len(data["collections"]), 1)
        self.assertEqual(len(data["courses"]), 0)


class DeckPermissionApiTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", password="pw")
        self.stranger = User.objects.create_user("stranger", password="pw")
        self.deck = Deck.objects.create(
            user=self.owner, created_by=self.owner, title="Private"
        )

    def test_stranger_cannot_view_deck(self):
        self.client.force_login(self.stranger)
        response = self.client.get(
            reverse("api_deck_detail", args=[self.deck.id])
        )
        self.assertEqual(response.status_code, 403)

    def test_stranger_cannot_delete_deck(self):
        self.client.force_login(self.stranger)
        response = self.client.delete(
            reverse("api_deck_delete", args=[self.deck.id])
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Deck.objects.filter(id=self.deck.id).exists())


class PartnershipFlowTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", password="pw")
        self.bob = User.objects.create_user("bob", password="pw")

    def test_invite_creates_code(self):
        self.client.force_login(self.alice)
        response = self.client.post(reverse("api_partnership_invite"))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.json()["data"]["code"]), 6)

    def test_cannot_invite_with_existing_partnership(self):
        Partnership.objects.create(user_a=self.alice, user_b=self.bob)
        self.client.force_login(self.alice)
        response = self.client.post(reverse("api_partnership_invite"))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "ALREADY_PARTNERED")

    def test_accept_invitation_creates_partnership(self):
        invitation = PartnershipInvitation.objects.create(inviter=self.alice)
        self.client.force_login(self.bob)
        response = self.client.post(
            reverse("api_partnership_accept"),
            data=json.dumps({"code": invitation.code}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            Partnership.objects.filter(
                user_a=self.alice, user_b=self.bob, is_active=True
            ).exists()
        )

    def test_accept_promotes_pending_shared_decks(self):
        # Alice marks a deck shared before partnering; it should attach and
        # backfill progress for Bob on existing cards once Bob accepts.
        deck = Deck.objects.create(
            user=self.alice, created_by=self.alice, title="Pending", share_pending=True
        )
        card = Card.objects.create(
            deck=deck, language_a="hund", language_b="dog", front="hund", back="dog"
        )
        invitation = PartnershipInvitation.objects.create(inviter=self.alice)
        self.client.force_login(self.bob)
        self.client.post(
            reverse("api_partnership_accept"),
            data=json.dumps({"code": invitation.code}),
            content_type="application/json",
        )

        deck.refresh_from_db()
        self.assertFalse(deck.share_pending)
        self.assertTrue(deck.partnerships.filter(is_active=True).exists())
        self.assertEqual(
            UserCardProgress.objects.filter(user=self.bob, card=card).count(), 2
        )

    def test_cannot_accept_own_invitation(self):
        invitation = PartnershipInvitation.objects.create(inviter=self.alice)
        self.client.force_login(self.alice)
        response = self.client.post(
            reverse("api_partnership_accept"),
            data=json.dumps({"code": invitation.code}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "SELF_INVITATION")

    def test_accept_unknown_code_returns_404(self):
        self.client.force_login(self.bob)
        response = self.client.post(
            reverse("api_partnership_accept"),
            data=json.dumps({"code": "ZZZZZZ"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_cannot_accept_when_inviter_already_partnered(self):
        # Alice sends Bob a code, then partners with Carol before Bob accepts.
        # Bob's accept must be rejected so Alice keeps a single partnership.
        carol = User.objects.create_user("carol", password="pw")
        invitation = PartnershipInvitation.objects.create(inviter=self.alice)
        Partnership.objects.create(user_a=self.alice, user_b=carol)
        self.client.force_login(self.bob)
        response = self.client.post(
            reverse("api_partnership_accept"),
            data=json.dumps({"code": invitation.code}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "INVITER_UNAVAILABLE")
        self.assertFalse(
            Partnership.objects.filter(user_a=self.alice, user_b=self.bob).exists()
        )

    def test_repartnering_same_pair_after_dissolve_reuses_row(self):
        # A dissolved (soft-deleted) partnership exists for the pair; accepting
        # a fresh invite must reactivate it, not hit the unique constraint.
        Partnership.objects.create(
            user_a=self.alice, user_b=self.bob, is_active=False
        )
        invitation = PartnershipInvitation.objects.create(inviter=self.alice)
        self.client.force_login(self.bob)
        response = self.client.post(
            reverse("api_partnership_accept"),
            data=json.dumps({"code": invitation.code}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            Partnership.objects.filter(user_a=self.alice, user_b=self.bob).count(), 1
        )
        self.assertTrue(
            Partnership.objects.get(user_a=self.alice, user_b=self.bob).is_active
        )


class JoinLinkTests(TestCase):
    """The shareable /join/<code>/ link (RFC 0012)."""

    def setUp(self):
        self.alice = User.objects.create_user("alice", password="pw")
        self.bob = User.objects.create_user("bob", password="pw")

    def test_join_link_creates_partnership_and_redirects(self):
        invitation = PartnershipInvitation.objects.create(inviter=self.alice)
        self.client.force_login(self.bob)
        response = self.client.get(
            reverse("join_partnership", args=[invitation.code])
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            Partnership.objects.filter(
                user_a=self.alice, user_b=self.bob, is_active=True
            ).exists()
        )

    def test_join_link_lowercase_code_is_normalized(self):
        invitation = PartnershipInvitation.objects.create(inviter=self.alice)
        self.client.force_login(self.bob)
        self.client.get(
            reverse("join_partnership", args=[invitation.code.lower()])
        )
        self.assertTrue(
            Partnership.objects.filter(user_a=self.alice, user_b=self.bob).exists()
        )

    def test_join_link_rejects_self_invitation(self):
        invitation = PartnershipInvitation.objects.create(inviter=self.alice)
        self.client.force_login(self.alice)
        response = self.client.get(
            reverse("join_partnership", args=[invitation.code])
        )
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Partnership.objects.exists())

    def test_join_link_rejects_when_inviter_already_partnered(self):
        carol = User.objects.create_user("carol", password="pw")
        invitation = PartnershipInvitation.objects.create(inviter=self.alice)
        Partnership.objects.create(user_a=self.alice, user_b=carol)
        self.client.force_login(self.bob)
        response = self.client.get(
            reverse("join_partnership", args=[invitation.code])
        )
        self.assertEqual(response.status_code, 302)
        self.assertFalse(
            Partnership.objects.filter(user_a=self.alice, user_b=self.bob).exists()
        )


# Rendering full pages needs a static manifest; use plain storage in tests so
# we don't depend on collectstatic having run.
@override_settings(STORAGES={
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
})
class WelcomeRedirectTests(TestCase):
    """First-time onboarding redirect must fire exactly once per user (A5)."""

    def setUp(self):
        self.user = User.objects.create_user("newbie", password="pw")

    def test_first_dashboard_visit_redirects_to_welcome(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("index"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("/welcome/", response.url)

    def test_welcome_not_shown_again_after_logout_and_relogin(self):
        self.client.force_login(self.user)
        self.client.get(reverse("index"))  # first visit -> welcome
        self.client.logout()  # flushes the session
        self.client.force_login(self.user)
        response = self.client.get(reverse("index"))  # second login
        self.assertEqual(response.status_code, 200)  # dashboard, no redirect


class CardListApiTests(TestCase):
    """card_list must expose the deck id so the client can build URLs (B7)."""

    def setUp(self):
        self.user = User.objects.create_user("owner", password="pw")
        self.deck = Deck.objects.create(
            user=self.user, created_by=self.user, title="D"
        )
        self.client.force_login(self.user)

    def test_card_list_includes_deck_id(self):
        Card.objects.create(deck=self.deck, language_a="casa", language_b="house")
        response = self.client.get(reverse("api_card_list", args=[self.deck.id]))
        self.assertEqual(response.status_code, 200)
        cards = response.json()["data"]["cards"]
        self.assertEqual(cards[0]["deck"], self.deck.id)
