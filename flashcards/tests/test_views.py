"""
Tests for API endpoints: authentication gating, deck CRUD, permission
enforcement, and the full partnership invite/accept/join flow.
"""

import json

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from flashcards.models import Deck, Partnership, PartnershipInvitation


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

    def test_create_shared_deck_without_partnership_fails(self):
        response = self.client.post(
            reverse("api_deck_create"),
            data=json.dumps({"title": "Shared", "shared": True}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "NO_PARTNERSHIP")

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
