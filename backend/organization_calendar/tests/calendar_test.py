import datetime

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from organizations.models import Membership, Organization, Tag
from organization_calendar.models import Event


class ComprehensiveCalendarAPITests(APITestCase):
    def _login(self, username, password, organization_name):
        url = reverse("login", args=[organization_name])
        response = self.client.post(
            url, {"username": username, "password": password}
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            f"Logowanie jako {username} nie powiodło się: {response.content}",
        )

    def _logout(self, organization_name):
        url = reverse("logout", args=[organization_name])
        response = self.client.post(url)
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            f"Wylogowanie nie powiodło się: {response.content}",
        )

    def setUp(self):
        # Użytkownicy
        self.admin_user = User.objects.create_user(
            username="admin",
            password="password123",
            identifier="admin_Test Organization",
        )
        self.coordinator_user = User.objects.create_user(
            username="coordinator",
            password="password123",
            identifier="coordinator_Test Organization",
        )
        self.member_user = User.objects.create_user(
            username="member",
            password="password123",
            identifier="member_Test Organization",
        )

        # Organizacja
        self.org = Organization.objects.create(
            name="Test Organization",
            created_by=self.admin_user,
            slug="test-organization",
        )

        # Członkostwa
        self.admin_membership = Membership.objects.create(
            organization=self.org, user=self.admin_user, role="admin"
        )
        self.coordinator_membership = Membership.objects.create(
            organization=self.org, user=self.coordinator_user, role="coordinator"
        )
        self.member_membership = Membership.objects.create(
            organization=self.org, user=self.member_user, role="member"
        )

        # Tagi i uprawnienia
        self.tag1 = Tag.objects.create(name="Dev", organization=self.org)
        self.tag2 = Tag.objects.create(name="QA", organization=self.org)
        self.coordinator_membership.permissions.add(self.tag1)
        self.member_membership.permissions.add(self.tag2)

        # Wydarzenia
        now = timezone.now()
        self.event1 = Event.objects.create(
            name="Dev Meeting",
            organization=self.org,
            start_time=now + datetime.timedelta(hours=1),
            end_time=now + datetime.timedelta(hours=2),
        )
        self.event1.permissions.add(self.tag1)

        self.event2 = Event.objects.create(
            name="QA Sync",
            organization=self.org,
            start_time=now + datetime.timedelta(days=1),
            end_time=now + datetime.timedelta(days=1, hours=1),
        )
        self.event2.permissions.add(self.tag2)

        self.event3 = Event.objects.create(
            name="All Hands",
            organization=self.org,
            start_time=now + datetime.timedelta(days=2),
            end_time=now + datetime.timedelta(days=2, hours=1),
        )  # Brak uprawnień, każdy powinien widzieć

        # Zaloguj jako admin do setupu
        self._login("admin", "password123", self.org.slug)

    # --- Pobieranie wydarzeń ---
    def test_admin_can_get_all_events(self):
        url = reverse("get_all_events", args=[self.org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 3)

    def test_non_admin_cannot_get_all_events(self):
        self._login("member", "password123", self.org.slug)
        url = reverse("get_all_events", args=[self.org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_my_events(self):
        # Koordynator powinien widzieć event1 (Dev) i event3 (All Hands)
        self._login("coordinator", "password123", self.org.slug)
        url = reverse(
            "get_my_events", args=[self.org.pk, self.coordinator_user.username]
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)
        event_names = {e["name"] for e in data}
        self.assertIn("Dev Meeting", event_names)
        self.assertIn("All Hands", event_names)

    def test_get_event_details(self):
        # Koordynator może pobrać szczegóły event1
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("get_event_details", args=[self.org.pk, self.event1.event_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["name"], self.event1.name)

    def test_get_event_details_unauthorized(self):
        # Koordynator nie może pobrać szczegółów event2
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("get_event_details", args=[self.org.pk, self.event2.event_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_events_by_tag(self):
        # Koordynator ma tag1 ('Dev'), powinien dostać event1
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("get_events_by_tag", args=[self.org.pk, self.tag1.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], self.event1.name)

    def test_get_events_by_tag_unauthorized(self):
        # Koordynator nie ma tagu2 ('QA'), powinien dostać błąd
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("get_events_by_tag", args=[self.org.pk, self.tag2.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Tworzenie wydarzeń ---
    def test_admin_can_create_event(self):
        url = reverse("create_event", args=[self.org.pk])
        now = timezone.now()
        payload = {
            "name": "Admin Event",
            "start_time": now + datetime.timedelta(days=5),
            "end_time": now + datetime.timedelta(days=5, hours=1),
            "permissions": f"{self.tag1.name},{self.tag2.name}",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Event.objects.filter(name="Admin Event").exists())
        event = Event.objects.get(name="Admin Event")
        self.assertEqual(event.permissions.count(), 2)

    def test_coordinator_can_create_event_with_owned_tag(self):
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("create_event", args=[self.org.pk])
        now = timezone.now()
        payload = {
            "name": "Coordinator Event",
            "start_time": now + datetime.timedelta(days=6),
            "end_time": now + datetime.timedelta(days=6, hours=1),
            "permissions": self.tag1.name,
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Event.objects.filter(name="Coordinator Event").exists())

    def test_coordinator_cannot_create_event_with_unowned_tag(self):
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("create_event", args=[self.org.pk])
        now = timezone.now()
        payload = {
            "name": "Illegal Coordinator Event",
            "start_time": now + datetime.timedelta(days=7),
            "end_time": now + datetime.timedelta(days=7, hours=1),
            "permissions": self.tag2.name,  # Koordynator nie ma tagu QA
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_event_invalid_time(self):
        url = reverse("create_event", args=[self.org.pk])
        now = timezone.now()
        payload = {
            "name": "Invalid Time Event",
            "start_time": now + datetime.timedelta(days=5, hours=1),
            "end_time": now + datetime.timedelta(days=5),  # Koniec przed początkiem
            "permissions": "",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Aktualizacja wydarzeń ---
    def test_admin_can_update_event(self):
        url = reverse("update_event", args=[self.org.pk, self.event1.event_id])
        payload = {"name": "Updated Dev Meeting", "permissions": self.tag2.name}
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event1.refresh_from_db()
        self.assertEqual(self.event1.name, "Updated Dev Meeting")
        self.assertIn(self.tag2, self.event1.permissions.all())
        self.assertNotIn(self.tag1, self.event1.permissions.all())

    def test_user_can_update_owned_event(self):
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("update_event", args=[self.org.pk, self.event1.event_id])
        payload = {"name": "Coordinator Updated Meeting"}
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event1.refresh_from_db()
        self.assertEqual(self.event1.name, "Coordinator Updated Meeting")

    def test_user_cannot_update_unowned_event(self):
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("update_event", args=[self.org.pk, self.event2.event_id])
        payload = {"name": "Illegal Update"}
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Usuwanie wydarzeń ---
    def test_admin_can_delete_event(self):
        event_to_delete_id = self.event1.event_id
        url = reverse("delete_event", args=[self.org.pk, event_to_delete_id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Event.objects.filter(event_id=event_to_delete_id).exists())

    def test_user_can_delete_owned_event(self):
        self._login("coordinator", "password123", self.org.slug)
        event_to_delete_id = self.event1.event_id
        url = reverse("delete_event", args=[self.org.pk, event_to_delete_id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Event.objects.filter(event_id=event_to_delete_id).exists())

    def test_user_cannot_delete_unowned_event(self):
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("delete_event", args=[self.org.pk, self.event2.event_id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
