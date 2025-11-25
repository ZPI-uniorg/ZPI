from rest_framework import serializers
from .models import Message, Chat


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", allow_null=True, required=False)
    chat_id = serializers.IntegerField(source="chat.chat_it", allow_null=True, required=False)

    class Meta:
        model = Message
        fields = [
            "message_id",
            "message_uuid",
            "chat_id",
            "sender_id",
            "channel",
            "author_username",
            "content",
            "timestamp",
        ]
        read_only_fields = ["message_id", "timestamp"]


class ChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chat
        fields = ["chat_it", "name", "organization_id"]
        read_only_fields = ["chat_it"]
