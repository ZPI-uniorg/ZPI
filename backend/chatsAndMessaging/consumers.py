from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Chat, Message
from .serializers import MessageSerializer


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.chat_id = self.scope['url_route']['kwargs'].get('chat_id')
        self.group_name = f"chat_{self.chat_id}"
        # Accept all for dev; add checks if needed
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Optionally handle client-sent messages over WS (not required if REST used)
        if content.get('type') == 'chat.message':
            text = content.get('content') or content.get('text')
            user = self.scope.get('user')
            message = await self._create_message(self.chat_id, user, text)
            data = MessageSerializer(message).data
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "chat.message", "message": data}
            )

    async def chat_message(self, event):
        await self.send_json({"type": "chat.message", "payload": event["message"]})

    @database_sync_to_async
    def _create_message(self, chat_id, user, text):
        # Dev: allow anonymous fallback to first user
        User = get_user_model()
        if not getattr(user, 'is_authenticated', False):
            user = User.objects.order_by('id').first()
        chat = Chat.objects.get(pk=chat_id)
        if not chat.participants.filter(id=user.id).exists():
            chat.participants.add(user)
        return Message.objects.create(chat=chat, sender=user, content=text or "")
