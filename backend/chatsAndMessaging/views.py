from django.shortcuts import render

# Create your views here.

# views.py
import os
from django.http import JsonResponse
from azure.messaging.webpubsubservice import WebPubSubServiceClient

CONNECTION_STRING = os.getenv(
    "AZURE_WEBPUBSUB_CONNECTION_STRING",
    "Endpoint=https://zpi-chat-service.webpubsub.azure.com;AccessKey=6KQLGq3K7rtj8xsinjsploTwJCqxGuvW8OeIOqyMke2ZotlUdg8fJQQJ99BKACE1PydXJ3w3AAAAAWPS6IY9;Version=1.0;",
)
HUB = "chat"  # Azure hub name

service = WebPubSubServiceClient.from_connection_string(CONNECTION_STRING, hub=HUB)


def negotiate(request):
    user_id = request.GET.get("userId", "anon")
    # Grant permissions so client can join/leave and send to groups directly.
    roles = [
        "webpubsub.connect",
        "webpubsub.joinLeaveGroup",
        "webpubsub.sendToGroup",
    ]
    token = service.get_client_access_token(user_id=user_id, roles=roles)
    return JsonResponse(
        {
            "url": token["url"],  # WebSocket URL with access_token
            "token": token["token"],  # Raw JWT if needed
            "userId": user_id,
            "roles": roles,
            "hub": HUB,
        }
    )
