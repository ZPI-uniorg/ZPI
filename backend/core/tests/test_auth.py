from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from organizations.models import Membership, Organization


class AuthTests(APITestCase):
    def setUp(self):
        self.password = "testpass123"
        self.user = User.objects.create_user(username="alice", password=self.password)
        self.organization = Organization.objects.create(name="Org", created_by=self.user)
        Membership.objects.create(organization=self.organization, user=self.user, role=Membership.Role.ADMIN)

    def test_login_returns_tokens(self):
        url = reverse("login")
        response = self.client.post(
            url,
            {"username": "alice", "password": self.password, "organization": self.organization.slug},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["token"])
        self.assertIn("refresh", response.data["token"])
        self.assertEqual(response.data["user"]["username"], "alice")
        self.assertEqual(response.data["organization"]["slug"], self.organization.slug)

    def test_login_rejects_wrong_organization(self):
        other = Organization.objects.create(name="Other Org", created_by=self.user)
        url = reverse("login")
        response = self.client.post(
            url,
            {"username": "alice", "password": self.password, "organization": other.slug},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_change_requires_current_password(self):
        login_url = reverse("login")
        response = self.client.post(
            login_url,
            {"username": "alice", "password": self.password, "organization": self.organization.slug},
            format="json",
        )
        access_token = response.data["token"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        change_password_url = reverse("change-password")
        response = self.client.post(change_password_url, {"current_password": "wrong", "new_password": "newpass123"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Current password is incorrect.")

    def test_password_change_updates_password(self):
        token = self.client.post(
            reverse("login"),
            {"username": "alice", "password": self.password, "organization": self.organization.slug},
            format="json",
        ).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token['access']}")
        response = self.client.post(reverse("change-password"), {"current_password": self.password, "new_password": "newpass123"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # Ensure we can log in with new password
        response = self.client.post(
            reverse("login"),
            {"username": "alice", "password": "newpass123", "organization": self.organization.slug},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_refresh_token_returns_new_access(self):
        tokens = self.client.post(
            reverse("login"),
            {"username": "alice", "password": self.password, "organization": self.organization.slug},
            format="json",
        ).data["token"]
        refresh_response = self.client.post(reverse("token-refresh"), {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)


