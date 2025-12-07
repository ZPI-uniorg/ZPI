from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from organizations.models import Membership, Organization, Project, Tag


class ComprehensiveOrganizationAPITests(APITestCase):
    def _login(self, username, password, organization_name):
        url = reverse("login", args=[organization_name])
        response = self.client.post(
            url, {"username": username, "password": password}
        )
        # Sprawdź, czy logowanie się powiodło
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
        self.admin_user = User.objects.create_user(
            username="admin",
            password="password123",
            identifier="admin_Test Organization",
            first_name="Admin",
            last_name="User",
            email="admin@example.com",
        )
        self.org = Organization.objects.create(
            name="Test Organization",
            created_by=self.admin_user,
            slug="test-organization",
        )
        self.admin_membership = Membership.objects.create(
            organization=self.org, user=self.admin_user, role="admin"
        )

        self.coordinator_user = User.objects.create_user(
            username="coordinator",
            password="password123",
            identifier="coordinator_Test Organization",
        )
        self.coordinator_membership = Membership.objects.create(
            organization=self.org, user=self.coordinator_user, role="coordinator"
        )

        self.member_user = User.objects.create_user(
            username="member",
            password="password123",
            identifier="member_Test Organization",
        )
        self.member_membership = Membership.objects.create(
            organization=self.org, user=self.member_user, role="member"
        )

        self.other_org = Organization.objects.create(
            name="Other Organization",
            created_by=self.admin_user,
            slug="other-organization",
        )
        self.other_project_tag = Tag.objects.create(
            name="Other Project", organization=self.other_org
        )
        self.other_project = Project.objects.create(
            title="Other Project",
            organization=self.other_org,
            tag=self.other_project_tag,
            start_dte="2023-01-01",
            end_dte="2023-12-31",
        )

        self._login("admin", "password123", self.org.slug)

        self.tag1 = Tag.objects.create(name="Tag1", organization=self.org)
        self.tag2 = Tag.objects.create(name="Tag2", organization=self.org)
        self.tag_to_delete = Tag.objects.create(name="ToDelete", organization=self.org)
        self.coordinator_membership.permissions.add(self.tag1)
        self.member_membership.permissions.add(self.tag1)

        self.project1 = Project.objects.create(
            title="Project 1",
            organization=self.org,
            tag=self.tag1,
            coordinator=self.coordinator_user,
            start_dte="2023-01-01",
            end_dte="2023-12-31",
        )

        self.project2 = Project.objects.create(
            title="Project 2",
            organization=self.org,
            tag=self.tag2,
            coordinator=self.member_user,
            start_dte="2023-06-01",
            end_dte="2023-12-31",
        )

        self.other_user = User.objects.create_user(
            username="other",
            password="password123",
            identifier="other_Test Organization",
        )

        self.other_user_membership = Membership.objects.create(
            organization=self.org, user=self.other_user, role="member"
        )


    # --- Rejestracja ---
    def test_register_organization(self):
        self.client.logout()
        url = reverse("register_organization")
        payload = {
            "name": "New Org",
            "description": "A brand new organization.",
            "username": "newadmin",
            "email": "newadmin@example.com",
            "firstname": "New",
            "lastname": "Admin",
            "password": "newpassword123",
            "password_confirm": "newpassword123",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Organization.objects.filter(name="New Org").exists())
        self.assertTrue(User.objects.filter(username="newadmin").exists())

    # --- Organizacja i Członkostwo ---
    def test_get_user_organization(self):
        url = reverse("get_user_organization", args=[self.admin_user.username])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], self.org.name)

    def test_get_organization_membership(self):
        url = reverse("get_organization_membership", args=[self.org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["role"], "admin")

    def test_edit_organization(self):
        url = reverse("edit_organization", args=[self.org.pk])
        payload = {"name": "Updated TestOrg"}
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.org.refresh_from_db()
        self.assertEqual(self.org.name, "Updated TestOrg")

    def test_non_admin_cannot_edit_organization(self):
        self._login("member", "password123", self.org.slug)
        url = reverse("edit_organization", args=[self.org.pk])
        payload = {"name": "Updated TestOrg"}
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Zarządzanie Członkami ---
    def test_admin_can_invite_member(self):
        url = reverse("invite_member", args=[self.org.pk])
        payload = {"invitee_username": "newbie", "role": "member"}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newbie").exists())

    def test_non_admin_cannot_invite_member(self):
        self._login("member", "password123", self.org.slug)
        url = reverse("invite_member", args=[self.org.pk])
        payload = {"invitee_username": "newbie", "role": "member"}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_organization_users(self):
        url = reverse("get_organization_users", args=[self.org.pk])
        # Admin może listować
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 4)

        # Koordynator może listować
        self._login("coordinator", "password123", self.org.slug)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 4)

    def test_member_cannot_list_organization_users(self):
        self._login("member", "password123", self.org.slug)
        url = reverse("get_organization_users", args=[self.org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_remove_member(self):
        url = reverse(
            "remove_organization_member", args=[self.org.pk, self.member_user.username]
        )
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            Membership.objects.filter(pk=self.member_membership.pk).exists()
        )

    def test_admin_can_change_member_role(self):
        url = reverse(
            "change_member_role", args=[self.org.pk, self.member_user.username]
        )
        payload = {"new_role": "coordinator"}
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member_membership.refresh_from_db()
        self.assertEqual(self.member_membership.role, "coordinator")

    def test_admin_can_update_member_profile(self):
        url = reverse(
            "update_member_profile", args=[self.org.pk, self.member_user.username]
        )
        payload = {"first_name": "UpdatedName"}
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member_user.refresh_from_db()
        self.assertEqual(self.member_user.first_name, "UpdatedName")

    def test_admin_can_edit_permissions(self):
        url = reverse("edit_permissions", args=[self.org.pk, self.member_user.username])
        payload = {"tags": [self.tag1.name, self.tag2.name]}
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member_membership.refresh_from_db()
        self.assertEqual(self.member_membership.permissions.count(), 2)

    # --- Zarządzanie Tagami ---
    def test_get_all_tags(self):
        url = reverse("get_all_tags", args=[self.org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 3)

    def test_non_admin_cannot_get_all_tags(self):
        self._login("member", "password123", self.org.slug)
        url = reverse("get_all_tags", args=[self.org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_my_tags(self):
        self._login("member", "password123", self.org.slug)
        url = reverse("get_tags", args=[self.org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], self.tag1.name)

    def test_admin_can_create_tag(self):
        url = reverse("create_tag", args=[self.org.pk])
        payload = {"name": "NewTag"}
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Tag.objects.filter(name="NewTag", organization=self.org).exists()
        )

    def test_admin_can_delete_tag(self):
        url = reverse("delete_tag", args=[self.org.pk, self.tag_to_delete.name])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Tag.objects.filter(name="ToDelete").exists())

    # --- Zarządzanie Projektami ---
    def test_admin_can_create_project(self):
        url = reverse("create_project", args=[self.org.pk])
        payload = {
            "name": "New Project",
            "start_dte": "2024-01-01",
            "end_dte": "2024-12-31",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Project.objects.filter(title="New Project").exists())
        self.assertTrue(Tag.objects.filter(name="New Project").exists())

    def test_coordinator_can_create_project(self):
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("create_project", args=[self.org.pk])
        payload = {
            "name": "Coordinator Project",
            "start_dte": "2024-01-01",
            "end_dte": "2024-12-31",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Project.objects.filter(title="Coordinator Project").exists())

    def test_member_cannot_create_project(self):
        self._login("member", "password123", self.org.slug)
        url = reverse("create_project", args=[self.org.pk])
        payload = {
            "name": "Member Project",
            "start_dte": "2024-01-01",
            "end_dte": "2024-12-31",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_all_projects(self):
        url = reverse("get_all_projects", args=[self.org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)

    def test_non_admin_cannot_get_all_projects(self):
        self._login("member", "password123", self.org.slug)
        url = reverse("get_all_projects", args=[self.org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_my_projects(self):
        self._login("member", "password123", self.org.slug)
        url = reverse("get_my_projects", args=[self.org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], self.project1.title)

    def test_update_project(self):
        # Admin może zaktualizować dowolny projekt
        url = reverse("update_project", args=[self.org.pk, self.project1.pk])
        payload = {
            "name": "Updated WebApp",
            "start_dte": "2023-01-01",
            "end_dte": "2023-12-31",
        }
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.project1.refresh_from_db()
        self.assertEqual(self.project1.title, "Updated WebApp")

        # Koordynator może zaktualizować swój własny projekt
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("update_project", args=[self.org.pk, self.project1.pk])
        payload = {
            "name": "Coordinator Updated WebApp",
            "start_dte": "2023-01-01",
            "end_dte": "2023-12-31",
        }
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_coordinator_cannot_update_other_project(self):
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("update_project", args=[self.org.pk, self.project2.pk])
        payload = {
            "name": "Attempted Update",
            "start_dte": "2023-01-01",
            "end_dte": "2023-12-31",
        }
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_project(self):
        # Admin może usunąć
        url = reverse("delete_project", args=[self.org.pk, self.project2.pk])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Project.objects.filter(pk=self.project2.pk).exists())

        # Koordynator może usunąć swój własny projekt
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("delete_project", args=[self.org.pk, self.project1.pk])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Project.objects.filter(pk=self.project1.pk).exists())

    def test_get_project_members(self):
        self.member_membership.permissions.add(self.tag1)
        url = reverse("get_project_members", args=[self.org.pk, self.project1.pk])

        # Admin może pobrać członków
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)

        # Koordynator (który ma tag) może pobrać członków
        self._login("coordinator", "password123", self.org.slug)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)

    def test_user_without_permission_cannot_get_project_members(self):
        self._login("other", "password123", self.org.slug)
        url = reverse("get_project_members", args=[self.org.pk, self.project1.pk])
        response = self.client.get(url)
        # Użytkownik jest członkiem, ale nie ma uprawnień do projektu
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Zarządzanie Tagami Członków ---
    def test_admin_can_add_tag_to_member(self):
        url = reverse(
            "add_tag_to_member", args=[self.org.pk, self.member_user.username]
        )
        payload = {"tag_name": self.tag1.name}
        response = self.client.put(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member_membership.refresh_from_db()
        self.assertIn(self.tag1, self.member_membership.permissions.all())

    def test_coordinator_can_add_owned_tag_to_member(self):
        self._login("coordinator", "password123", self.org.slug)
        url = reverse(
            "add_tag_to_member", args=[self.org.pk, self.member_user.username]
        )
        payload = {"tag_name": self.tag1.name}
        response = self.client.put(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member_membership.refresh_from_db()
        self.assertIn(self.tag1, self.member_membership.permissions.all())

    def test_coordinator_cannot_add_unowned_tag_to_member(self):
        self._login("coordinator", "password123", self.org.slug)
        url = reverse(
            "add_tag_to_member", args=[self.org.pk, self.member_user.username]
        )
        payload = {"tag_name": self.tag2.name}
        response = self.client.put(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_cannot_add_tag_to_another_member(self):
        self._login("member", "password123", self.org.slug)
        url = reverse(
            "add_tag_to_member", args=[self.org.pk, self.coordinator_user.username]
        )
        payload = {"tag_name": self.tag2.name}
        response = self.client.put(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_remove_tag_from_member(self):
        url = reverse(
            "remove_tag_from_member", args=[self.org.pk, self.member_user.username]
        )
        payload = {"tag_name": self.tag2.name}
        response = self.client.put(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member_membership.refresh_from_db()
        self.assertNotIn(self.tag2, self.member_membership.permissions.all())

    def test_coordinator_can_remove_owned_tag_from_member(self):
        # Najpierw dodajmy tag1 do innego członka, aby było co usuwać
        self.member_membership.permissions.add(self.tag1)

        self._login("coordinator", "password123", self.org.slug)
        url = reverse(
            "remove_tag_from_member", args=[self.org.pk, self.member_user.username]
        )
        payload = {"tag_name": self.tag1.name}
        response = self.client.put(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member_membership.refresh_from_db()
        self.assertNotIn(self.tag1, self.member_membership.permissions.all())

    def test_coordinator_cannot_remove_unowned_tag_from_member(self):
        self._login("coordinator", "password123", self.org.slug)
        url = reverse(
            "remove_tag_from_member", args=[self.org.pk, self.member_user.username]
        )
        payload = {"tag_name": self.tag2.name}
        response = self.client.put(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
