from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Chat, Message

User = get_user_model()


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "chat", "sender", "content", "created_at"]
        read_only_fields = ["id", "chat", "sender", "created_at"]


class ChatSerializer(serializers.ModelSerializer):
    participants = UserMiniSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ["id", "title", "participants", "created_at", "last_message"]
        read_only_fields = ["id", "created_at", "participants", "last_message"]

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return MessageSerializer(msg).data


class ChatCreateSerializer(serializers.ModelSerializer):
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = Chat
        fields = ["id", "title", "participant_ids"]

    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
        request = self.context.get("request")
        chat = Chat.objects.create(**validated_data)
        if request and request.user.is_authenticated:
            chat.participants.add(request.user)
        if participant_ids:
            User.objects.filter(id__in=participant_ids).exclude(
                id=request.user.id
            ).update()  # no-op to ensure existence
            for uid in participant_ids:
                try:
                    user = User.objects.get(id=uid)
                    chat.participants.add(user)
                except User.DoesNotExist:
                    pass
        return chat


class ChatDetailSerializer(ChatSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ChatSerializer.Meta):
        fields = ChatSerializer.Meta.fields + ["messages"]
