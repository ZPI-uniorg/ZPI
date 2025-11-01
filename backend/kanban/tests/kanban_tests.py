import json
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from organizations.models import Organization
from ..models import KanbanBoard, KanbanColumn, Task

User = get_user_model()


class KanbanBoardAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='user1', password='password')

        # Założenie, że model Organization ma pole created_by
        self.organization = Organization.objects.create(name='Test Organization', created_by=self.user)
        self.board = KanbanBoard.objects.create(
            title='Test Board',
            organization=self.organization
        )

    def test_create_kanban_board(self):
        url = reverse('create_kanban_board')
        data = {'title': 'New Board', 'organization_id': self.organization.id}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(KanbanBoard.objects.count(), 2)
        self.assertEqual(response.json()['title'], 'New Board')

    def test_get_kanban_board(self):
        url = reverse('get_kanban_board', kwargs={'board_id': self.board.board_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['title'], self.board.title)

    def test_update_kanban_board(self):
        url = reverse('update_kanban_board', kwargs={'board_id': self.board.board_id})
        data = {'title': 'Updated Board Title'}
        response = self.client.put(url, data=data, content_type='application/json')
        print(response.content)
        self.assertEqual(response.status_code, 200)
        self.board.refresh_from_db()
        self.assertEqual(self.board.title, 'Updated Board Title')

    def test_delete_kanban_board(self):
        url = reverse('delete_kanban_board', kwargs={'board_id': self.board.board_id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(KanbanBoard.objects.filter(pk=self.board.board_id).exists())


class KanbanColumnAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='user1', password='password')


        self.organization = Organization.objects.create(name='Test Organization', created_by=self.user)
        self.board = KanbanBoard.objects.create(
            title='Test Board',
            organization=self.organization
        )
        self.column = KanbanColumn.objects.create(
            title='To Do',
            board=self.board,
            position=1
        )

    def test_create_column(self):
        url = reverse('create_column')
        data = {'title': 'In Progress', 'board_id': self.board.board_id, 'position': 2}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(KanbanColumn.objects.count(), 2)
        self.assertEqual(response.json()['title'], 'In Progress')

    def test_get_board_columns(self):
        url = reverse('get_board_columns', kwargs={'board_id': self.board.board_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()['columns'][0]['title'], self.column.title)

    def test_get_column(self):
        url = reverse('get_column', kwargs={'column_id': self.column.column_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['title'], self.column.title)

    def test_update_column(self):
        url = reverse('update_column', kwargs={'column_id': self.column.column_id})
        data = {'title': 'Updated Column Title'}
        response = self.client.put(url, data=data, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.column.refresh_from_db()
        self.assertEqual(self.column.title, 'Updated Column Title')

    def test_delete_column(self):
        url = reverse('delete_column', kwargs={'column_id': self.column.column_id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(KanbanColumn.objects.filter(pk=self.column.column_id).exists())


class TaskAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='user1', password='password')


        self.organization = Organization.objects.create(name='Test Organization', created_by=self.user)
        self.board = KanbanBoard.objects.create(
            title='Test Board',
            organization=self.organization
        )
        self.column = KanbanColumn.objects.create(
            title='To Do',
            board=self.board,
            position=1
        )
        self.task = Task.objects.create(
            title='Test Task',
            description='A test task description.',
            column=self.column,
            position=1,
            assigned_to=self.user,
            status=Task.Status.TODO
        )

    def test_create_task(self):
        url = reverse('create_task')
        data = {
            'title': 'New Task',
            'column_id': self.column.column_id,
            'position': 2,
            'status': Task.Status.TODO
        }
        response = self.client.post(url, data=data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Task.objects.count(), 2)
        self.assertEqual(response.json()['title'], 'New Task')

    def test_get_column_tasks(self):
        url = reverse('get_column_tasks', kwargs={'column_id': self.column.column_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()['tasks'][0]['title'], self.task.title)

    def test_get_task(self):
        url = reverse('get_task', kwargs={'task_id': self.task.task_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['title'], self.task.title)

    def test_update_task(self):
        url = reverse('update_task', kwargs={'task_id': self.task.task_id})
        data = {'title': 'Updated Task Title', 'status': Task.Status.IN_PROGRESS}
        response = self.client.put(url, data=data, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.task.refresh_from_db()
        self.assertEqual(self.task.title, 'Updated Task Title')
        self.assertEqual(self.task.status, Task.Status.IN_PROGRESS)

    def test_delete_task(self):
        url = reverse('delete_task', kwargs={'task_id': self.task.task_id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Task.objects.filter(pk=self.task.task_id).exists())
