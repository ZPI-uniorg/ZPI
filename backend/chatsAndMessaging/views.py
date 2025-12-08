import os
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import IntegrityError, transaction

from azure.messaging.webpubsubservice import WebPubSubServiceClient

from .models import Message, Chat
from organizations.models import Membership, Organization, Tag, CombinedTag
from .serializers import MessageSerializer, ChatSerializer
from core.permissions_checker import permission_to_access


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
        return JsonResponse({"error": f"Błąd: {str(e)}"}, status=400)


# -----------------------------
# GET MESSAGES
# -----------------------------
@require_http_methods(["GET"])
@csrf_exempt
def get_messages(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        chat_id = request.GET.get("chat_id")
        channel_name = request.GET.get("channel")
        limit = int(request.GET.get("limit", 10))
        offset = int(request.GET.get("offset", 0))

        if not chat_id and not channel_name:
            return JsonResponse({"error": "Wymagane chat_id lub channel"}, status=400)

        # Try to find by chat_id first (preferred), then by channel name
        if not chat_id:
           return JsonResponse({"error": "Wymagane chat_id"}, status=400)

        try:
            chat = Chat.objects.get(chat_id=chat_id, organization_id=organization_id)
            user_membership = Membership.objects.get(user=request.user, organization_id=organization_id)
            
            # Administrators have access to all chats
            # Chats without permissions/tags are visible to everyone
            if user_membership.role != 'admin':
                chat_permissions = chat.permissions.all()
                
                # If chat has permissions, check if user has access
                if chat_permissions.exists():
                    user_permissions = user_membership.permissions.all()
                    if not permission_to_access(user_permissions, chat_permissions):
                        return JsonResponse({"error": "Brak dostępu do tego czatu"}, status=403)

            total_count = Message.objects.filter(chat=chat).count()
            messages = Message.objects.filter(chat=chat).order_by("-timestamp")[offset:offset+limit]
            # Reverse to get chronological order (oldest first in result)
            messages = list(reversed(messages))
        except Chat.DoesNotExist:
            return JsonResponse({"error": "Nie znaleziono czatu"}, status=404)

        serializer = MessageSerializer(messages, many=True)
        return JsonResponse({
            "messages": serializer.data,
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total_count
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Błąd: {str(e)}"}, status=400)


# -----------------------------
# SAVE MESSAGE
# -----------------------------
@require_http_methods(["POST"])
@csrf_exempt
def save_message(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        # Parse JSON body if content-type is application/json
        if request.content_type and 'application/json' in request.content_type:
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({"error": "Nieprawidłowy JSON"}, status=400)
        else:
            data = request.POST

        chat_id = data.get("chat_id")
        message_uuid = data.get("message_uuid")
        author_username = data.get("author_username")  # optional if sender_id provided
        sender_id = data.get("sender_id")
        content = data.get("content")

        if not all([message_uuid, content]) or (not author_username and not sender_id):
            return JsonResponse({"error": "Brakujące wymagane pola"}, status=400)

        # Try to link to Chat if chat_id provided
        chat_obj = None
        channel_name = None
        if chat_id:
            try:
                chat_obj = Chat.objects.get(chat_id=chat_id, organization_id=organization_id)
                channel_name = chat_obj.name  # Use chat name as channel
            except Chat.DoesNotExist:
                return JsonResponse({"error": "Nie znaleziono czatu"}, status=404)

        # Resolve sender user & username if sender_id sent
        sender_obj = None
        if sender_id:
            from core.models import User  # local import to avoid circular
            try:
                sender_obj = User.objects.get(id=sender_id)
                if not author_username:
                    author_username = sender_obj.username
            except User.DoesNotExist:
                return JsonResponse({"error": "Nie znaleziono użytkownika nadawcy"}, status=404)

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
        except IntegrityError as e:
            # Check if message with this UUID already exists
            existing = Message.objects.filter(message_uuid=message_uuid).first()
            if existing:
                print(f"⚠️ Duplicate message_uuid: {message_uuid}")
                print(f"   Existing: chat={existing.chat_id}, sender={existing.sender_id}, content={existing.content[:50]}")
                print(f"   New attempt: chat={chat_id}, sender={sender_id}, content={content[:50]}")
                # Return the existing message instead of error
                serializer = MessageSerializer(existing)
                return JsonResponse(serializer.data, status=200)
            else:
                # Some other integrity error
                print(f"❌ IntegrityError but no existing message found: {str(e)}")
                return JsonResponse({"error": f"Błąd integralności bazy danych: {str(e)}"}, status=400)

        serializer = MessageSerializer(message)
        return JsonResponse(serializer.data, status=201)

    except Exception as e:
        return JsonResponse({"error": f"Błąd: {str(e)}"}, status=400)


# -----------------------------
# DELETE MESSAGE
# -----------------------------
@require_http_methods(["DELETE"])
@csrf_exempt
def delete_message(request, organization_id, message_uuid):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        # Find the message by UUID
        try:
            message = Message.objects.get(message_uuid=message_uuid)
        except Message.DoesNotExist:
            return JsonResponse({"error": "Nie znaleziono wiadomości"}, status=404)

        # Check if the user is the sender of the message (by ID or username)
        is_sender = (
            (message.sender_id and message.sender_id == request.user.id) or
            (message.author_username == request.user.username)
        )
        
        if not is_sender:
            return JsonResponse({"error": "Nie masz uprawnień do usunięcia tej wiadomości"}, status=403)

        # Check if message belongs to the organization
        if message.chat and message.chat.organization_id != organization_id:
            return JsonResponse({"error": "Wiadomość nie należy do tej organizacji"}, status=403)

        # Delete the message
        message.delete()

        return JsonResponse({"message": "Wiadomość została usunięta", "message_uuid": message_uuid}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Błąd: {str(e)}"}, status=400)


# -----------------------------
# CHAT LIST
# -----------------------------
@require_http_methods(["GET"])
@csrf_exempt
def list_chats(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        membership = Membership.objects.get(organization__id=organization_id, user__username=username)

        if not membership:
            return JsonResponse({"error": "Brak dostępu"}, status=403)

        organization = Organization.objects.get(id=organization_id)
        
        if membership.role == 'admin':
            chats = list(Chat.objects.filter(organization=organization))
        else:
            user_permissions = membership.permissions.all()
            chats = []

            for chat in Chat.objects.filter(organization=organization):
                chat_permissions = chat.permissions.all()

                if not chat_permissions.exists():
                    chats.append(chat)
                elif len(user_permissions) == 0:
                    continue
                elif permission_to_access(user_permissions, chat_permissions):
                    chats.append(chat)

        serializer = ChatSerializer(chats, many=True)

        return JsonResponse({"chats": serializer.data}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Błąd: {str(e)}"}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def list_chats_all(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        org_id = organization_id or request.GET.get("organization")
        membership = Membership.objects.get(user=request.user, organization_id=org_id)

        if membership.role != 'admin':
            return JsonResponse({"error": "Tylko administratorzy mogą uzyskać dostęp do wszystkich czatów"}, status=403)

        chats = Chat.objects.filter(organization_id=org_id).order_by("name")

        serializer = ChatSerializer(chats, many=True)

        return JsonResponse({"chats": serializer.data}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Błąd: {str(e)}"}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def list_chats_by_tag(request, organization_id, tag_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        membership = Membership.objects.get(user=request.user, organization_id=organization_id)

        if membership.role != 'admin':
            if tag_id not in membership.permissions.values_list('id', flat=True):
                return JsonResponse({"error": "Niewystarczające uprawnienia do dostępu do czatów z tym tagiem"}, status=403)

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
                        if permission_to_access(membership.permissions.all(), chat.permissions.all()):
                            chats.append(chat)
                            break

        serializer = ChatSerializer(chats, many=True)

        return JsonResponse({"chats": serializer.data}, status=200)
    except Exception as e:
        return JsonResponse({"error": f"Błąd: {str(e)}"}, status=400)

# -----------------------------
# CREATE CHAT
# -----------------------------
@require_http_methods(["POST"])
@csrf_exempt
def create_chat(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        membership = Membership.objects.get(user=request.user, organization_id=organization_id)

        if membership.role != 'admin':
            allowed_permissions = membership.permissions.all()
        else:
            allowed_permissions = Tag.objects.filter(organization__id=organization_id)

        # Parse JSON body if content-type is application/json
        if request.content_type and 'application/json' in request.content_type:
            data = json.loads(request.body)
        else:
            data = request.POST

        # Extract request data
        name = data.get("name")
        body_org_id = data.get("organization")
        organization_id = organization_id or body_org_id
        permissions_str = data.get("permissions")

        # Required fields check
        if not name or not organization_id:
            return JsonResponse({"error": "Wymagane pola: nazwa i organizacja"}, status=400)

        organization = Organization.objects.get(id=organization_id)

        permissions_ids = []

        if len(permissions_str) > 0:
            permissions_str_list = permissions_str.split(',')

            for permission in permissions_str_list:
                temp = permission.split("+")

                if len(temp) == 1:
                    tag = Tag.objects.get(name=temp[0], organization__id=organization_id)

                    if tag not in allowed_permissions:
                        return JsonResponse({"error": "Nieautoryzowane przypisanie uprawnień"}, status=403)

                    permissions_ids.append(tag.id)

                else:
                    for tag_name in temp:
                        if not allowed_permissions.filter(name=tag_name).exists():
                            return JsonResponse({"error": "Nieautoryzowane przypisanie uprawnień"}, status=403)

                    if not Tag.objects.filter(name=permission, organization__id=organization_id, combined=True).exists():
                        with transaction.atomic():
                            new_combined_tag = Tag.objects.create(
                                name=permission,
                                organization=organization,
                                combined=True
                            )

                            for tag_name in temp:
                                basic_tag = Tag.objects.get(name=tag_name, organization__id=organization_id)
                                CombinedTag.objects.create(
                                    combined_tag_id=new_combined_tag,
                                    basic_tag_id=basic_tag
                                )
                            permissions_ids.append(new_combined_tag.id)
                    else:
                        existing_combined_tag = Tag.objects.get(name=permission, organization__id=organization_id, combined=True)
                        permissions_ids.append(existing_combined_tag.id)

        chat = Chat.objects.create(
            name=name,
            organization=organization,
        )

        chat.permissions.set(Tag.objects.filter(id__in=permissions_ids))
        chat.save()

        serializer = ChatSerializer(chat)
        return JsonResponse(serializer.data, status=201)

    except Organization.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono organizacji"}, status=404)
    except Tag.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono tagu"}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"Błąd: {str(e)}"}, status=400)