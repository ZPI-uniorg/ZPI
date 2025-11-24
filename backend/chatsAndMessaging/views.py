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
from organizations.models import Membership, Organization, Tag
from .serializers import MessageSerializer, ChatSerializer


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
def get_messages(request):
    try:
        chat_id = request.GET.get("chat_id")
        channel_name = request.GET.get("channel")
        limit = int(request.GET.get("limit", 10))
        offset = int(request.GET.get("offset", 0))

        if not chat_id and not channel_name:
            return JsonResponse({"error": "chat_id or channel required"}, status=400)

        # Try to find by chat_id first (preferred), then by channel name
        if chat_id:
            try:
                chat = Chat.objects.get(chat_it=chat_id)
                total_count = Message.objects.filter(chat=chat).count()
                messages = Message.objects.filter(chat=chat).order_by("-timestamp")[offset:offset+limit]
                # Reverse to get chronological order (oldest first in result)
                messages = list(reversed(messages))
            except Chat.DoesNotExist:
                return JsonResponse({"error": "Chat not found"}, status=404)
        else:
            # Fallback: lookup by channel name
            total_count = Message.objects.filter(channel=channel_name).count()
            messages = Message.objects.filter(channel=channel_name).order_by("-timestamp")[offset:offset+limit]
            messages = list(reversed(messages))

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
def save_message(request):
    try:
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
                chat_obj = Chat.objects.get(chat_it=chat_id)
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
                if not author_username:
                    author_username = "Guest"

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
def list_chats(request, organization_id=None):
    try:
        org_id = organization_id or request.GET.get("organization")

        if not org_id:
            return JsonResponse(
                {"error": "organization id required (path or ?organization=)"},
                status=400,
            )

        chats = Chat.objects.filter(organization_id=org_id).order_by("name")
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

        # Create the chat
        chat = Chat.objects.create(
            name=name,
            organization=organization,
        )

        # Handle permissions (tags) if provided
        if permissions_raw:
            # permissions_raw can be list of IDs or names
            numeric_ids = []
            name_values = []

            if isinstance(permissions_raw, str):
                permissions_raw = [permissions_raw]

            for val in permissions_raw:
                sval = str(val).strip()
                if sval.isdigit():
                    numeric_ids.append(int(sval))
                elif sval:
                    name_values.append(sval)

            # Find existing tags
            existing_tags = list(
                Tag.objects.filter(
                    Q(id__in=numeric_ids) | Q(name__in=name_values),
                    organization_id=organization_id,
                )
            )

            existing_names = {t.name for t in existing_tags}

            # Create new tags for names that don't exist
            new_tags = [
                Tag.objects.create(name=nm, organization_id=organization_id)
                for nm in name_values
                if nm not in existing_names
            ]

            all_tags = existing_tags + new_tags

            if all_tags:
                chat.permissions.set(all_tags)

        # Response payload
        serializer = ChatSerializer(chat)
        return JsonResponse(serializer.data, status=201)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

