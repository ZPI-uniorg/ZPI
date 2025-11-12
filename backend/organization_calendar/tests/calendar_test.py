from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from organizations.models import Organization
from ..models import Event
from datetime import datetime, timedelta

User = get_user_model()

class EventAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="testuser", password="password")
        self.organization = Organization.objects.create(
            name="Test Org", created_by=self.user
        )
        self.start_time = datetime.now()
        self.end_time = self.start_time + timedelta(hours=1)
        self.event = Event.objects.create(
            name="Test Event",
            description="A test event.",
            start_time=self.start_time,
            end_time=self.end_time,
            organization=self.organization,
        )

    def test_get_all_events(self):
        response = self.client.get(reverse("get_all_events"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["name"], "Test Event")

    def test_get_event(self):
        response = self.client.get(reverse("get_event", args=[self.event.event_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Test Event")

    def test_get_event_not_found(self):
        response = self.client.get(reverse("get_event", args=[999]))
        self.assertEqual(response.status_code, 404)

    def test_create_event(self):
        start_time = datetime.now() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        data = {
            "name": "New Event",
            "description": "Another test event.",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "organization_id": self.organization.id,
        }
        response = self.client.post(reverse("create_event"), data)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Event.objects.filter(name="New Event").exists())
        self.assertEqual(response.json()["name"], "New Event")

    def test_create_event_missing_fields(self):
        data = {"name": "Incomplete Event"}
        response = self.client.post(reverse("create_event"), data)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Missing required fields")

    def test_create_event_organization_not_found(self):
        start_time = datetime.now() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        data = {
            "name": "New Event",
            "description": "Another test event.",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "organization_id": 999,  # Non-existent org
        }
        response = self.client.post(reverse("create_event"), data)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"], "Organization not found")

    def test_update_event(self):
        data = {"name": "Updated Event Name"}
        response = self.client.put(
            reverse("update_event", args=[self.event.event_id]), data=data, content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.event.refresh_from_db()
        self.assertEqual(self.event.name, "Updated Event Name")
        self.assertEqual(response.json()["name"], "Updated Event Name")

    def test_update_event_not_found(self):
        data = {"name": "Updated Event Name"}
        response = self.client.put(reverse("update_event", args=[999]), data=data)
        self.assertEqual(response.status_code, 404)

    def test_delete_event(self):
        response = self.client.delete(reverse("delete_event", args=[self.event.event_id]))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Event.objects.filter(event_id=self.event.event_id).exists())
        self.assertEqual(response.json()["message"], "Event deleted successfully")

    def test_delete_event_not_found(self):
        response = self.client.delete(reverse("delete_event", args=[999]))
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"], "Event not found")
