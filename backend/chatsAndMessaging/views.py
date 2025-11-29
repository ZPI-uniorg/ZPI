# views.py (REFORMATTED TO MATCH KANBAN STYLE)

import os
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import IntegrityError
from django.db.models import Q

from azure.messaging.webpubsubservice import WebPubSubServiceClient

from .models import Message, Chat
from organizations.models import Membership, Organization, Tag, CombinedTag
from .serializers import MessageSerializer, ChatSerializer
from core.permissions_checker import permission_to_access, permission_to_add


# -----------------------------
# WebPubSub Setup
# -----------------------------
CONNECTION_STRING = os.getenv(
    "AZURE_WEBPUBSUB_CONNECTION_STRING",
    "Endpoint=https://zpi-chat-service.webpubsub.azure.com;"
    "AccessKey=6KQLGq3K7rtj8xsinjsploTwJCqxGuvW8OeIOqyMke2ZotlUdg8fJQQJ99BKACE1PydXJ3w3AAAAAWPS6IY9;"
    "Version=1.0;",
)
HUB = "chat"

service = WebPubSubServiceClient.from_connection_string(CONNECTION_STRING, hub=HUB)


# -----------------------------
# NEGOTIATE (WebPubSub/Socket.IO)
# -----------------------------
@require_http_methods(["GET"])
@csrf_exempt
def negotiate(request):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        user_id = request.GET.get("userId", "anon")

        roles = [
            "webpubsub.connect",
            "webpubsub.joinLeaveGroup",
            "webpubsub.sendToGroup",
        ]

        token = service.get_client_access_token(user_id=user_id, roles=roles)

        return JsonResponse(
            {
                "url": token["url"],
                "token": token["token"],
                "userId": user_id,
                "roles": roles,
                "hub": HUB,
            },
            status=200,
        )

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# -----------------------------
# GET MESSAGES
# -----------------------------
@require_http_methods(["GET"])
@csrf_exempt
def get_messages(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        chat_id = request.GET.get("chat_id")
        channel_name = request.GET.get("channel")
        limit = int(request.GET.get("limit", 10))
        offset = int(request.GET.get("offset", 0))

        if not chat_id and not channel_name:
            return JsonResponse({"error": "chat_id or channel required"}, status=400)

        # Try to find by chat_id first (preferred), then by channel name
        if not chat_id:
           return JsonResponse({"error": "chat_id required"}, status=400)

        try:
            chat = Chat.objects.get(chat_it=chat_id, organization_id=organization_id)
            chat_permissions = chat.permissions.all()
            user_membership = Membership.objects.get(user=request.user, organization_id=organization_id)
            user_permissions = user_membership.permissions

            if chat_permissions and not permission_to_access(user_permissions, chat_permissions):
                return JsonResponse({"error": "Access denied to this chat"}, status=403)

            total_count = Message.objects.filter(chat=chat).count()
            messages = Message.objects.filter(chat=chat).order_by("-timestamp")[offset:offset+limit]
            # Reverse to get chronological order (oldest first in result)
            messages = list(reversed(messages))
        except Chat.DoesNotExist:
            return JsonResponse({"error": "Chat not found"}, status=404)

        serializer = MessageSerializer(messages, many=True)
        return JsonResponse({
            "messages": serializer.data,
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total_count
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# -----------------------------
# SAVE MESSAGE
# -----------------------------
@require_http_methods(["POST"])
@csrf_exempt
def save_message(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        # Parse JSON body if content-type is application/json
        if request.content_type and 'application/json' in request.content_type:
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({"error": "Invalid JSON"}, status=400)
        else:
            data = request.POST

        chat_id = data.get("chat_id")
        message_uuid = data.get("message_uuid")
        author_username = data.get("author_username")  # optional if sender_id provided
        sender_id = data.get("sender_id")
        content = data.get("content")

        if not all([message_uuid, content]) or (not author_username and not sender_id):
            return JsonResponse({"error": "Missing required fields"}, status=400)

        # Try to link to Chat if chat_id provided
        chat_obj = None
        channel_name = None
        if chat_id:
            try:
                chat_obj = Chat.objects.get(chat_it=chat_id, organization_id=organization_id)
                channel_name = chat_obj.name  # Use chat name as channel
            except Chat.DoesNotExist:
                return JsonResponse({"error": "Chat not found"}, status=404)

        # Resolve sender user & username if sender_id sent
        sender_obj = None
        if sender_id:
            from core.models import User  # local import to avoid circular
            try:
                sender_obj = User.objects.get(id=sender_id)
                if not author_username:
                    author_username = sender_obj.username
            except User.DoesNotExist:
                return JsonResponse({"error": "Sender user not found"}, status=404)

        if not channel_name:
            channel_name = "general"

        try:
            message = Message.objects.create(
                message_uuid=message_uuid,
                chat=chat_obj,
                sender=sender_obj,
                channel=channel_name,
                author_username=author_username,
                content=content,
            )
        except IntegrityError:
            return JsonResponse({"status": "duplicate"}, status=200)

        serializer = MessageSerializer(message)
        return JsonResponse(serializer.data, status=201)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# -----------------------------
# CHAT LIST
# -----------------------------
@require_http_methods(["GET"])
@csrf_exempt
def list_chats(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        org_id = organization_id or request.GET.get("organization")

        if not org_id:
            return JsonResponse(
                {"error": "organization id required (path or ?organization=)"},
                status=400,
            )

        chats = Chat.objects.filter(organization_id=org_id).order_by("name")

        for chat in chats:
            chat_permissions = chat.permissions.all()
            user_membership = Membership.objects.get(user=request.user, organization_id=org_id)
            user_permissions = user_membership.permissions

            if chat_permissions and not permission_to_access(user_permissions, chat_permissions):
                chats = chats.exclude(chat_id=chat.chat_id)

        serializer = ChatSerializer(chats, many=True)

        return JsonResponse({"chats": serializer.data}, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def list_chats_all(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        org_id = organization_id or request.GET.get("organization")
        membership = Membership.objects.get(user=request.user, organization_id=org_id)

        if membership.role != 'admin':
            return JsonResponse({"error": "Only admins can access all chats"}, status=403)

        chats = Chat.objects.filter(organization_id=org_id).order_by("name")

        serializer = ChatSerializer(chats, many=True)

        return JsonResponse({"chats": serializer.data}, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def list_chats_by_tag(request, organization_id, tag_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        membership = Membership.objects.get(user=request.user, organization_id=organization_id)

        if membership.role != 'admin':
            if tag_id not in membership.permissions.values_list('id', flat=True):
                return JsonResponse({"error": "Insufficient permissions to access chats with this tag"}, status=403)

        organization = Organization.objects.get(id=organization_id)

        chats = []

        for chat in Chat.objects.filter(organization_id=organization.id):
            if chat.permissions.filter(id=tag_id).exists():
                chats.append(chat)
            else:
                combined_tags = chat.permissions.filter(combined=True)
                for combined_tag in combined_tags:
                    basic_tags = CombinedTag.objects.filter(combined_tag_id=combined_tag)
                    basic_tag_ids = [bt.basic_tag_id.id for bt in basic_tags]
                    if tag_id in basic_tag_ids:
                        if permission_to_access(membership.permissions, chat.permissions.all()):
                            chats.append(chat)
                            break

        serializer = ChatSerializer(chats, many=True)

        return JsonResponse({"chats": serializer.data}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

# -----------------------------
# CREATE CHAT
# -----------------------------
@require_http_methods(["POST"])
@csrf_exempt
def create_chat(request, organization_id=None):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        # Parse JSON body if content-type is application/json
        if request.content_type and 'application/json' in request.content_type:
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({"error": "Invalid JSON"}, status=400)
        else:
            data = request.POST

        # Extract request data
        name = data.get("name")
        body_org_id = data.get("organization")
        organization_id = organization_id or body_org_id
        permissions_raw = data.get("permissions", [])

        # Required fields check
        if not name or not organization_id:
            return JsonResponse({"error": "name and organization required"}, status=400)

        try:
            organization = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return JsonResponse({"error": "Organization not found"}, status=404)

        if len(permissions_raw) > 0:
            permissions_str_list = permissions_raw.split(",")
            permissions_names = []
            permissions_ids = []

            for permission in permissions_str_list:
                temp = permission.split("+")

                if len(temp) == 1:
                    permissions_names.append(temp[0])
                    permissions_ids.append(Tag.objects.get(name=temp[0], organization__id=organization_id).id)
                else:
                    for perm in temp:
                        permissions_names.append(perm)

                    combinedTag = Tag.objects.get(name=permission, organization__id=organization_id, combined=True)

                    if combinedTag:
                        permissions_ids.append(combinedTag.id)
                    else:
                        combinedTag = Tag.objects.create(
                            name=permission,
                            organization=organization,
                            combined=True
                        )

                        for perm in temp:
                            basicTag = Tag.objects.filter(name=perm, organization__id=organization_id).first()
                            if basicTag:
                                CombinedTag.objects.create(
                                    combined_tag_id=combinedTag,
                                    basic_tag_id=basicTag
                                )

                        permissions_ids.append(combinedTag.id)

            permissions = Tag.objects.filter(name__in=permissions_names)

        chat = Chat.objects.create(
            name=name,
            organization=organization,
        )

        membership = Membership.objects.get(user=request.user, organization_id=organization_id)

        if membership.role != 'admin':
            allowed_permissions = membership.permissions.all()
        else:
            allowed_permissions = Tag.objects.filter(organization_id=organization_id)

        for permission in permissions:
            if permission not in allowed_permissions:
                return JsonResponse({"error": "Insufficient permissions to assign the requested tags"}, status=403)

        chat.permissions.set(Tag.objects.filter(id__in=permissions_ids))
        chat.save()

        # Response payload
        serializer = ChatSerializer(chat)
        return JsonResponse(serializer.data, status=201)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


