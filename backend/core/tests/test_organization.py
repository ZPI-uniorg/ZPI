import json
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from organizations.models import Organization, Membership, Tag, Project

User = get_user_model()


class OrganizationAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='user1', password='password')
        self.organization = Organization.objects.create(name='Test Org', created_by=self.user)

    def test_get_organizations(self):
        response = self.client.get(reverse('get_organizations'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['name'], 'Test Org')

    def test_get_organization(self):
        response = self.client.get(reverse('get_organization', args=[self.organization.id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'Test Org')

    def test_get_organization_not_found(self):
        response = self.client.get(reverse('get_organization', args=[999]))
        self.assertEqual(response.status_code, 404)

    def test_create_organization(self):
        data = {
            'name': 'New Org',
            'description': 'A new test org',
            'created_by_username': self.user.username
        }
        response = self.client.post(reverse('create_organization'), data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['name'], 'New Org')
        self.assertTrue(Organization.objects.filter(name='New Org').exists())

    def test_create_organization_missing_fields(self):
        data = {'name': 'Incomplete Org'}
        response = self.client.post(reverse('create_organization'), data)
        self.assertEqual(response.status_code, 400)

    def test_update_organization(self):
        data = {'name': 'Updated Org Name'}
        response = self.client.put(
            reverse('update_organization', args=[self.organization.id]),
            data=data,
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.name, 'Updated Org Name')

    def test_delete_organization(self):
        response = self.client.delete(reverse('delete_organization', args=[self.organization.id]))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Organization.objects.filter(id=self.organization.id).exists())


class MembershipAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user1 = User.objects.create_user(username='user1', password='password')
        self.user2 = User.objects.create_user(username='user2', password='password')
        self.organization = Organization.objects.create(name='Test Org', created_by=self.user1)
        self.membership = Membership.objects.create(
            organization=self.organization,
            user=self.user1,
            role='Admin'
        )

    def test_get_all_organization_memberships(self):
        response = self.client.get(reverse('get_all_organization_memberships', args=[self.organization.id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['user_id'], self.user1.id)

    def test_get_membership(self):
        response = self.client.get(reverse('get_membership', args=[self.organization.id, self.user1.id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['role'], 'Admin')

    def test_get_membership_not_found(self):
        response = self.client.get(reverse('get_membership', args=[self.organization.id, 999]))
        self.assertEqual(response.status_code, 404)

    def test_create_membership(self):
        data = {
            'organization_id': self.organization.id,
            'user_id': self.user2.id,
            'role': 'Member',
            'invited_by_id': self.user1.id
        }
        response = self.client.post(reverse('create_membership'), data)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Membership.objects.filter(organization=self.organization, user=self.user2).exists())

    def test_create_membership_duplicate(self):
        data = {
            'organization_id': self.organization.id,
            'user_id': self.user1.id,
            'role': 'Member'
        }
        response = self.client.post(reverse('create_membership'), data)
        self.assertEqual(response.status_code, 400)

    def test_update_membership(self):
        url = reverse('update_membership', args=[self.organization.id, self.user1.id])
        data = {'role': 'Member'}
        response = self.client.put(url, data=data, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.membership.refresh_from_db()
        self.assertEqual(self.membership.role, 'Member')

    def test_delete_membership(self):
        url = reverse('delete_membership', args=[self.organization.id, self.user1.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Membership.objects.filter(id=self.membership.id).exists())


class TagAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='user1', password='password')
        self.organization = Organization.objects.create(name='Test Org', created_by=self.user)
        self.tag = Tag.objects.create(name='Test Tag', organization=self.organization)

    def test_get_all_tags(self):
        response = self.client.get(reverse('get_all_tags'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['name'], 'Test Tag')

    def test_get_tag(self):
        response = self.client.get(reverse('get_tag', args=[self.tag.id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'Test Tag')

    def test_get_tag_not_found(self):
        response = self.client.get(reverse('get_tag', args=[999]))
        self.assertEqual(response.status_code, 404)

    def test_create_tag(self):
        data = {
            'name': 'New Tag',
            'organization_id': self.organization.id
        }
        response = self.client.post(reverse('create_tag'), data)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Tag.objects.filter(name='New Tag').exists())

    def test_delete_tag(self):
        response = self.client.delete(reverse('delete_tag', args=[self.tag.id]))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Tag.objects.filter(id=self.tag.id).exists())


class ProjectAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='user1', password='password')
        self.organization = Organization.objects.create(name='Test Org', created_by=self.user)
        self.tag = Tag.objects.create(name='Project Tag', organization=self.organization)
        self.project = Project.objects.create(
            name='Test Project',
            start_dte='2023-01-01',
            end_dte='2023-12-31',
            organization=self.organization,
            tag=self.tag,
            coordinator=self.user
        )

    def test_get_all_projects(self):
        response = self.client.get(reverse('get_all_projects'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['name'], 'Test Project')

    def test_get_project(self):
        response = self.client.get(reverse('get_project', args=[self.project.id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'Test Project')

    def test_get_project_not_found(self):
        response = self.client.get(reverse('get_project', args=[999]))
        self.assertEqual(response.status_code, 404)

    def test_create_project(self):
        data = {
            'name': 'New Project',
            'description': 'A new test project',
            'start_dte': '2024-01-01',
            'end_dte': '2024-12-31',
            'organization_id': self.organization.id,
            'coordinator_username': self.user.username
        }
        response = self.client.post(reverse('create_project'), data)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Project.objects.filter(name='New Project').exists())
        self.assertTrue(Tag.objects.filter(name='New Project').exists())

    def test_update_project(self):
        data = {'name': 'Updated Project Name'}
        response = self.client.put(
            reverse('update_project', args=[self.project.id]),
            data=data,
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, 'Updated Project Name')

    def test_delete_project(self):
        response = self.client.delete(reverse('delete_project', args=[self.project.id]))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Project.objects.filter(id=self.project.id).exists())
