# python
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from organizations.models import Membership, Organization, Project, Tag
from kanban.models import KanbanBoard, KanbanColumn, Task


class ComprehensiveKanbanAPITests(APITestCase):
    def _login(self, username, password, organization_name):
        url = reverse("login", args=[organization_name])
        response = self.client.post(url, {"username": username, "password": password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def setUp(self):
        # Users / Organization / Project
        self.admin_user = User.objects.create_user(
            username="admin",
            password="password123",
            identifier="admin_TestOrg",
        )
        self.org = Organization.objects.create(
            name="TestOrg", created_by=self.admin_user, slug="TestOrg"
        )
        Membership.objects.create(organization=self.org, user=self.admin_user, role="admin")

        self.coordinator_user = User.objects.create_user(
            username="coordinator", password="password123", identifier="coordinator_TestOrg"
        )
        Membership.objects.create(organization=self.org, user=self.coordinator_user, role="coordinator")

        self.member_user = User.objects.create_user(
            username="member", password="password123", identifier="member_TestOrg"
        )
        self.member_membership = Membership.objects.create(
            organization=self.org, user=self.member_user, role="member"
        )
        self.other_user = User.objects.create_user(
            username="other", password="password123", identifier="other_TestOrg"
        )
        Membership.objects.create(organization=self.org, user=self.other_user, role="member")

        # Tag / Projects
        self.tag = Tag.objects.create(name="ProjTag", organization=self.org)
        self.project = Project.objects.create(
            title="Project 1",
            organization=self.org,
            tag=self.tag,
            coordinator=self.coordinator_user,
            start_dte="2023-01-01",
            end_dte="2023-12-31",
        )

        # Kanban board, column, task
        self.board = KanbanBoard.objects.create(title="Board 1", organization=self.org, project=self.project)
        self.column = KanbanColumn.objects.create(title="To Do", board=self.board, position=0)
        self.other_column = KanbanColumn.objects.create(title="Done", board=self.board, position=1)
        self.task = Task.objects.create(
            title="Task 1",
            description="Desc",
            column=self.column,
            position=0,
            status=Task.Status.TODO,
        )

        # Login as admin by default
        self._login("admin", "password123", self.org.slug)

    def test_get_board_basic(self):
        url = reverse("get_kanban_board", args=[self.org.pk, self.project.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("board_id", data)
        self.assertEqual(data["project_id"], self.project.id)

    def test_get_board_with_content(self):
        url = reverse("get_kanban_boards_with_content", args=[self.org.pk, self.project.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("columns", data)
        self.assertTrue(any(col["column_id"] == self.column.column_id for col in data["columns"]))
        # check that task is present
        found = False
        for col in data["columns"]:
            for t in col["tasks"]:
                if t["task_id"] == self.task.task_id:
                    found = True
        self.assertTrue(found)

    def test_create_column_by_admin(self):
        url = reverse("create_column", args=[self.org.pk, self.board.board_id])
        payload = {"title": "New Column", "position": 2}
        resp = self.client.post(url, payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(KanbanColumn.objects.filter(title="New Column", board=self.board).exists())

    def test_member_without_coordination_cannot_create_column(self):
        # login as plain member (not coordinator)
        self._login("member", "password123", self.org.slug)
        url = reverse("create_column", args=[self.org.pk, self.board.board_id])
        payload = {"title": "Forbidden Column"}
        resp = self.client.post(url, payload)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_column_position_by_coordinator(self):
        # login as coordinator
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("update_column", args=[self.org.pk, self.board.board_id, self.column.column_id])
        payload = {"position": 5, "title": "Renamed"}
        resp = self.client.put(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.column.refresh_from_db()
        self.assertEqual(self.column.position, 5)
        self.assertEqual(self.column.title, "Renamed")

    def test_add_task_with_permission(self):
        # give member permission to project tag and login as member
        self.member_membership.permissions.add(self.tag)
        self._login("member", "password123", self.org.slug)

        url = reverse("create_task", args=[self.org.pk, self.board.board_id, self.column.column_id])
        payload = {"title": "Member Task", "description": "x", "position": 0}
        resp = self.client.post(url, payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Task.objects.filter(title="Member Task", column=self.column).exists())

    def test_move_task_to_other_column(self):
        # login as admin
        url = reverse("update_task", args=[self.org.pk, self.board.board_id, self.column.column_id, self.task.task_id])
        payload = {"new_column_id": self.other_column.column_id}
        resp = self.client.put(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.column.column_id, self.other_column.column_id)

    def test_delete_task_by_coordinator(self):
        # login as coordinator (coordinator of project)
        self._login("coordinator", "password123", self.org.slug)
        url = reverse("delete_task", args=[self.org.pk, self.board.board_id, self.task.column.column_id, self.task.task_id])
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(Task.objects.filter(pk=self.task.pk).exists())

    def test_get_task_forbidden_without_permission(self):
        self._login("other", "password123", self.org.slug)
        url = reverse("get_task", args=[self.org.pk, self.board.board_id, self.column.column_id, self.task.task_id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
