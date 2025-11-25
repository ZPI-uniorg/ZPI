from django.urls import path
from .views import (
    negotiate,
    get_messages,
    save_message,
    list_chats,
    create_chat,
)

urlpatterns = [
    path("negotiate/", negotiate, name="negotiate"),
    path("messages/", get_messages, name="get_messages"),
    path("messages/save/", save_message, name="save_message"),
    path("chats/", list_chats, name="list_chats"),
    path("chats/<int:organization_id>/", list_chats, name="list_chats_by_org"),
    path("chats/create/", create_chat, name="create_chat"),
    path(
        "chats/<int:organization_id>/create/",
        create_chat,
        name="create_chat_for_org",
    ),
]
