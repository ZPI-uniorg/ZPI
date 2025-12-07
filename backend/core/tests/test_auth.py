# python
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from organizations.models import Organization, Membership

User = get_user_model()


class AuthAPITests(APITestCase):
    def setUp(self):
        # identifier musi być zgodny z logiką authenticate: username + "_" + organization.name
        self.admin_user = User.objects.create_user(
            username="admin",
            password="password123",
            identifier=f"admin_TestOrg",
            first_name="Admin",
            last_name="User",
            email="admin@example.com",
        )
        self.org = Organization.objects.create(
            name="TestOrg",
            created_by=self.admin_user,
            slug="test-organization",
        )
        self.admin_membership = Membership.objects.create(
            organization=self.org, user=self.admin_user, role="admin"
        )

    def _login(self, username="admin", password="password123", org_slug=None):
        if org_slug is None:
            org_slug = self.org.slug
        url = reverse("login", args=[org_slug])
        response = self.client.post(url, {"username": username, "password": password})
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Logowanie nie powiodło się: {response.content}")

    def test_login_success_and_response_contents(self):
        url = reverse("login", args=[self.org.slug])
        response = self.client.post(url, {"username": "admin", "password": "password123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertIn("sessionKey", data)
        self.assertEqual(data.get("username"), "admin")
        self.assertIn("organization", data)
        self.assertEqual(data["organization"]["role"], self.admin_membership.role)

    def test_login_invalid_credentials_returns_401(self):
        url = reverse("login", args=[self.org.slug])
        response = self.client.post(url, {"username": "admin", "password": "wrongpassword"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_and_check_auth(self):
        # Najpierw zaloguj
        self._login()
        logout_url = reverse("logout", args=[self.org.slug])
        response = self.client.post(logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Po wylogowaniu check-auth powinien zwrócić 401
        check_url = reverse("check-auth")
        response = self.client.get(check_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_check_auth_authenticated(self):
        self._login()
        check_url = reverse("check-auth")
        response = self.client.get(check_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data.get("username"), "admin")

    def test_change_password_success_and_wrong_old_password(self):
        # Zaloguj się
        self._login()
        url = reverse("change-password")

        # Błędne stare hasło
        response = self.client.post(url, {"old_password": "bad", "new_password": "newpass"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Poprawna zmiana hasła
        response = self.client.post(url, {"old_password": "password123", "new_password": "newpass"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Odśwież z DB i sprawdź nowe hasło
        self.admin_user.refresh_from_db()
        self.assertTrue(self.admin_user.check_password("newpass"))

    def test_change_password_unauthenticated(self):
        # Upewnij się, że klient jest wylogowany
        self.client.logout()
        url = reverse("change-password")
        response = self.client.post(url, {"old_password": "password123", "new_password": "newpass"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
