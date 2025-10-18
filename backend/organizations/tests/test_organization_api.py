from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from organizations.models import Membership, Organization


class OrganizationAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="pass123", email="owner@example.com")
        self.other_user = User.objects.create_user(username="member", password="pass123", email="member@example.com")
        self.third_user = User.objects.create_user(username="third", password="pass123", email="third@example.com")
        self.client.force_authenticate(self.owner)

    def test_create_organization_assigns_admin_membership(self):
        response = self.client.post(reverse("organization-list"), {"name": "Koło Robotyki", "description": "Opis"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        organization = Organization.objects.get(name="Koło Robotyki")
        self.assertEqual(organization.created_by, self.owner)
        membership = Membership.objects.get(organization=organization, user=self.owner)
        self.assertEqual(membership.role, Membership.Role.ADMIN)

    def test_list_organizations_returns_only_user_memberships(self):
        org1 = Organization.objects.create(name="Org A", created_by=self.owner)
        Membership.objects.create(organization=org1, user=self.owner, role=Membership.Role.ADMIN)
        org2 = Organization.objects.create(name="Org B", created_by=self.other_user)
        Membership.objects.create(organization=org2, user=self.other_user, role=Membership.Role.ADMIN)

        response = self.client.get(reverse("organization-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Org A")

    def test_admin_can_add_existing_user_by_id(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        url = reverse("organization-members", args=[org.pk])
        response = self.client.post(url, {"user_id": self.other_user.pk, "role": Membership.Role.COORDINATOR})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        membership = Membership.objects.get(organization=org, user=self.other_user)
        self.assertEqual(membership.role, Membership.Role.COORDINATOR)

    def test_admin_can_create_new_user_member(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        url = reverse("organization-members", args=[org.pk])
        payload = {
            "username": "newuser",
            "password": "Temp1234",
            "email": "newuser@example.com",
            "first_name": "New",
            "last_name": "Member",
            "role": Membership.Role.MEMBER,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(username="newuser")
        membership = Membership.objects.get(organization=org, user=new_user)
        self.assertEqual(membership.role, Membership.Role.MEMBER)

    def test_admin_cannot_create_duplicate_username_in_same_org(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        existing_member = Membership.objects.create(organization=org, user=self.other_user, role=Membership.Role.MEMBER)
        url = reverse("organization-members", args=[org.pk])
        payload = {
            "username": existing_member.user.username,
            "password": "Temp1234",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_admin_can_create_same_username_in_another_org(self):
        org1 = Organization.objects.create(name="Org1", created_by=self.owner)
        Membership.objects.create(organization=org1, user=self.owner, role=Membership.Role.ADMIN)
        org2 = Organization.objects.create(name="Org2", created_by=self.owner)
        Membership.objects.create(organization=org2, user=self.owner, role=Membership.Role.ADMIN)

        url1 = reverse("organization-members", args=[org1.pk])
        payload = {
            "username": "duplicateuser",
            "password": "Temp1234",
        }
        response1 = self.client.post(url1, payload, format="json")
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        url2 = reverse("organization-members", args=[org2.pk])
        response2 = self.client.post(url2, payload, format="json")
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.filter(username="duplicateuser").count(), 2)

    def test_non_admin_cannot_add_member(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        Membership.objects.create(organization=org, user=self.other_user, role=Membership.Role.MEMBER)
        self.client.force_authenticate(self.other_user)
        url = reverse("organization-members", args=[org.pk])
        response = self.client.post(url, {"user_id": self.third_user.pk})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_member_role(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        membership = Membership.objects.create(organization=org, user=self.other_user, role=Membership.Role.MEMBER)
        url = reverse("organization-member-detail", args=[org.pk, membership.pk])
        response = self.client.patch(url, {"role": Membership.Role.COORDINATOR}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        membership.refresh_from_db()
        self.assertEqual(membership.role, Membership.Role.COORDINATOR)

    def test_cannot_remove_last_admin(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        admin_membership = Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        url = reverse("organization-member-detail", args=[org.pk, admin_membership.pk])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_remove_member(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        membership = Membership.objects.create(organization=org, user=self.other_user, role=Membership.Role.MEMBER)
        url = reverse("organization-member-detail", args=[org.pk, membership.pk])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Membership.objects.filter(pk=membership.pk).exists())

    def test_member_can_list_members(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        Membership.objects.create(organization=org, user=self.other_user, role=Membership.Role.MEMBER)
        self.client.force_authenticate(self.other_user)
        url = reverse("organization-members", args=[org.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_member_cannot_update_other_member_role(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        membership = Membership.objects.create(organization=org, user=self.other_user, role=Membership.Role.MEMBER)
        self.client.force_authenticate(self.other_user)
        url = reverse("organization-member-detail", args=[org.pk, membership.pk])
        response = self.client.patch(url, {"role": Membership.Role.ADMIN})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_downgrade_self_if_other_admin_exists(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        owner_membership = Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        Membership.objects.create(organization=org, user=self.other_user, role=Membership.Role.ADMIN)
        url = reverse("organization-member-detail", args=[org.pk, owner_membership.pk])
        response = self.client.patch(url, {"role": Membership.Role.MEMBER})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        owner_membership.refresh_from_db()
        self.assertEqual(owner_membership.role, Membership.Role.MEMBER)

    def test_member_can_remove_self(self):
        org = Organization.objects.create(name="Org", created_by=self.owner)
        Membership.objects.create(organization=org, user=self.owner, role=Membership.Role.ADMIN)
        membership = Membership.objects.create(organization=org, user=self.other_user, role=Membership.Role.MEMBER)
        self.client.force_authenticate(self.other_user)
        url = reverse("organization-member-detail", args=[org.pk, membership.pk])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Membership.objects.filter(pk=membership.pk).exists())


class OrganizationRegistrationTests(APITestCase):
    def test_can_register_organization_and_admin(self):
        payload = {
            "organization": {"name": "Nowa Organizacja", "description": "Opis"},
            "admin": {
                "username": "nowyadmin",
                "password": "StrongPass123!",
                "email": "admin@example.com",
                "first_name": "Anna",
                "last_name": "Admin",
            },
        }

        response = self.client.post(reverse("organization-register"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertIn("organization", response.data)
        self.assertIn("user", response.data)

        organization = Organization.objects.get(name="Nowa Organizacja")
        user = User.objects.get(username="nowyadmin")
        membership = Membership.objects.get(organization=organization, user=user)

        self.assertEqual(organization.created_by, user)
        self.assertEqual(membership.role, Membership.Role.ADMIN)
        self.assertTrue(response.data["token"].get("access"))
        self.assertTrue(response.data["token"].get("refresh"))

    def test_registration_allows_duplicate_username(self):
        User.objects.create_user(username="nowyadmin", password="StrongPass123!")
        payload = {
            "organization": {"name": "Druga Organizacja"},
            "admin": {
                "username": "nowyadmin",
                "password": "AnotherPass123!",
            },
        }

        response = self.client.post(reverse("organization-register"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("organization", response.data)
        self.assertEqual(Organization.objects.filter(name="Druga Organizacja").count(), 1)
        self.assertEqual(User.objects.filter(username="nowyadmin").count(), 2)

    def test_registration_rejects_duplicate_organization_name(self):
        owner = User.objects.create_user(username="existing", password="StrongPass123!")
        Organization.objects.create(name="Nowa Organizacja", created_by=owner)

        payload = {
            "organization": {"name": "Nowa Organizacja"},
            "admin": {
                "username": "innyadmin",
                "password": "StrongPass123!",
            },
        }

        response = self.client.post(reverse("organization-register"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organization", response.data)
        self.assertIn("name", response.data["organization"])  # type: ignore[index]
