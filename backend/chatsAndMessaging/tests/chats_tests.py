# python
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User
from organizations.models import Membership, Organization, Tag
from chatsAndMessaging.models import Chat, Message


class ChatsAndMessagingAPITests(APITestCase):
    def _login(self, username, password, organization_name):
        url = reverse("login", args=[organization_name])
        response = self.client.post(url, {"username": username, "password": password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def setUp(self):
        # Users and organization
        self.admin_user = User.objects.create_user(
            username="admin", password="password123", identifier="admin_ChatOrg"
        )
        self.org = Organization.objects.create(
            name="ChatOrg", created_by=self.admin_user, slug="ChatOrg"
        )
        self.admin_membership = Membership.objects.create(
            organization=self.org, user=self.admin_user, role="admin"
        )

        self.member_user = User.objects.create_user(
            username="member", password="password123", identifier="member_ChatOrg"
        )
        self.member_membership = Membership.objects.create(
            organization=self.org, user=self.member_user, role="member"
        )

        # Tags and chats
        self.tag = Tag.objects.create(name="TagA", organization=self.org)
        self.other_tag = Tag.objects.create(name="TagB", organization=self.org)

        # Member has permission to tag
        self.member_membership.permissions.add(self.tag)

        # Public chat (no permissions)
        self.public_chat = Chat.objects.create(name="Public", organization=self.org)
        self.public_chat.chat_id = "1"
        self.public_chat.save()

        # Restricted chat (tag permission)
        self.restricted_chat = Chat.objects.create(name="Restricted", organization=self.org)
        self.restricted_chat.chat_id = "1"
        self.restricted_chat.permissions.set([self.tag])
        self.restricted_chat.save()

        # Messages in restricted chat
        self.msg1 = Message.objects.create(
            message_uuid="uuid-1",
            chat=self.restricted_chat,
            sender=self.member_user,
            channel="Restricted",
            author_username=self.member_user.username,
            content="Hello"
        )

        # login as admin by default
        self._login("admin", "password123", self.org.slug)

    @patch("chatsAndMessaging.views.service.get_client_access_token")
    def test_negotiate_requires_auth_and_returns_token(self, mock_get_token):
        mock_get_token.return_value = {"url": "wss://example", "token": "tok"}
        # Unauthenticated
        self.client.logout()
        url = reverse("negotiate")
        r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated
        self._login("admin", "password123", self.org.slug)
        r = self.client.get(url, {"userId": "admin"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.json()
        self.assertIn("url", data)
        self.assertIn("token", data)
        self.assertEqual(data["userId"], "admin")

    def test_get_messages_requires_chat_id_and_permission(self):
        url = reverse("get_messages", args=[self.org.pk])

        # missing chat_id param
        r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

        # chat not found
        r = self.client.get(url, {"chat_id": "12345"})
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

        # access denied for random user without permission
        # create a user without membership permission
        other = User.objects.create_user(username="other", password="pwd", identifier="other_ChatOrg")
        Membership.objects.create(organization=self.org, user=other, role="member")
        self._login("other", "pwd", self.org.slug)
        r = self.client.get(url, {"chat_id": self.restricted_chat.chat_id})
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

        # member with permission can fetch
        self._login("member", "password123", self.org.slug)
        r = self.client.get(url, {"chat_id": self.restricted_chat.chat_id})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.json()
        self.assertIn("messages", data)
        self.assertEqual(data["total"], 1)

    def test_save_message_validation_and_create(self):
        url = reverse("save_message", args=[self.org.pk])

        # unauthenticated
        self.client.logout()
        payload = {"message_uuid": "m1", "content": "hello", "author_username": "admin", "chat_id": self.public_chat.chat_id}
        r = self.client.post(url, payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

        # authenticated but missing fields
        self._login("admin", "password123", self.org.slug)
        payload = {"message_uuid":"m2", "author_username": "admin", "chat_id": self.public_chat.chat_id}
        r = self.client.post(url, payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

        # create by author_username
        payload = {"message_uuid": "m3", "content": "hey", "author_username": "admin", "chat_id": self.public_chat.chat_id}
        r = self.client.post(url, payload, format="json")
        data = r.json()
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(data["author_username"], "admin")
        self.assertEqual(data["content"], "hey")

        # create by sender_id
        payload = {"message_uuid": "m4", "content": "by id", "sender_id": self.member_user.id, "chat_id": self.public_chat.chat_id}
        r = self.client.post(url, payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        data = r.json()
        self.assertEqual(data["author_username"], self.member_user.username)

    def test_list_chats_returns_only_accessible_and_all_for_admin(self):
        url_my = reverse("list_chats_by_org", args=[self.org.pk])
        # admin sees both chats (admin has membership with no tags => code treats as allowed_permissions empty -> appends all)
        r = self.client.get(url_my)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.json()
        self.assertIn("chats", data)
        # admin membership exists and should see chats
        self.assertGreaterEqual(len(data["chats"]), 2)

        # non-admin member sees only allowed chats
        self._login("member", "password123", self.org.slug)
        r = self.client.get(url_my)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.json()
        names = [c["name"] for c in data["chats"]]
        self.assertIn("Public", names)
        self.assertIn("Restricted", names)

        # list all chats - admin allowed, non-admin forbidden
        self._login("admin", "password123", self.org.slug)
        url_all = reverse("list_all_chats_by_org", args=[self.org.pk])
        r = self.client.get(url_all)
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        self._login("member", "password123", self.org.slug)
        r = self.client.get(url_all)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_chats_by_tag_behaviour(self):
        # admin can list by tag
        self._login("admin", "password123", self.org.slug)
        url_tag = reverse("list_chats_by_tag", args=[self.org.pk, self.tag.id])
        r = self.client.get(url_tag)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.json()
        names = [c["name"] for c in data["chats"]]
        self.assertIn("Restricted", names)

        # member with tag can list
        self._login("member", "password123", self.org.slug)
        r = self.client.get(url_tag)
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        # member without tag cannot list other tag
        self._login("member", "password123", self.org.slug)
        url_other_tag = reverse("list_chats_by_tag", args=[self.org.pk, self.other_tag.id])
        r = self.client.get(url_other_tag)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
