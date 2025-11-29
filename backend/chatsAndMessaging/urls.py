from django.urls import path
from .views import (
    negotiate,
    get_messages,
    save_message,
    list_chats,
    create_chat, list_chats_all, list_chats_by_tag,
)

urlpatterns = [
    path("negotiate/", negotiate, name="negotiate"),
    path("messages/<int:organization_id>/", get_messages, name="get_messages"),
    path("messages/save/<int:organization_id>/", save_message, name="save_message"),
    path("chats/my/<int:organization_id>/", list_chats, name="list_chats_by_org"),
    path("chats/all/<int:organization_id>/", list_chats_all, name="list_all_chats_by_org"),
    path("chats/tag/<int:organization_id>/<int:tag_id>/", list_chats_by_tag, name="list_chats_by_tag"),
    path(
        "chats/<int:organization_id>/create/",
        create_chat,
        name="create_chat_for_org",
    ),
]
