from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Chat, Message
from .serializers import (
	ChatSerializer,
	ChatCreateSerializer,
	ChatDetailSerializer,
	MessageSerializer,
)


class ChatListCreateView(generics.ListCreateAPIView):
	# TEMP: disable auth for debugging; restore IsAuthenticated when finished.
	permission_classes = [permissions.AllowAny]
	queryset = Chat.objects.all()

	def get_queryset(self):
		user = self.request.user
		if getattr(user, 'is_authenticated', False):
			return Chat.objects.filter(participants=user).distinct()
		# Anonymous: return all chats (dev only). Consider limiting or empty.
		return Chat.objects.all().distinct()

	def get_serializer_class(self):
		if self.request.method == 'POST':
			return ChatCreateSerializer
		return ChatSerializer

	def perform_create(self, serializer):
		serializer.save()


class ChatDetailView(generics.RetrieveAPIView):
	permission_classes = [permissions.AllowAny]
	queryset = Chat.objects.all()
	serializer_class = ChatDetailSerializer

	def get_object(self):
		obj = super().get_object()
		user = self.request.user
		if getattr(user, 'is_authenticated', False):
			# DEV: allow auto-join when not participant if ?auto_join=1 present
			if not obj.participants.filter(id=user.id).exists():
				auto_join = self.request.query_params.get('auto_join') == '1'
				if auto_join:
					obj.participants.add(user)
					obj.save()
				else:
					raise PermissionDenied("Not a participant of this chat (append ?auto_join=1 to join in dev)")
		return obj


class MessageCreateView(generics.CreateAPIView):
	permission_classes = [permissions.AllowAny]
	serializer_class = MessageSerializer
	UserModel = get_user_model()

	def get_chat(self):
		try:
			chat = Chat.objects.get(pk=self.kwargs['pk'])
		except Chat.DoesNotExist:
			raise PermissionDenied("Chat does not exist")
		user = self.request.user
		if getattr(user, 'is_authenticated', False):
			if not chat.participants.filter(id=user.id).exists():
				# DEV: auto-join on message post if ?auto_join=1
				if self.request.query_params.get('auto_join') == '1':
					chat.participants.add(user)
					chat.save()
				else:
					raise PermissionDenied("Not a participant (append ?auto_join=1 to join and post in dev)")
		return chat

	def perform_create(self, serializer):
		chat = self.get_chat()
		user = self.request.user
		if not getattr(user, 'is_authenticated', False):
			# Fallback to first user for dev-only unauthenticated message posting.
			user = self.UserModel.objects.order_by('id').first()
			if user is None:
				raise PermissionDenied("No users available for sender fallback")
		message = serializer.save(chat=chat, sender=user)
		# Broadcast over WS group for this chat
		try:
			layer = get_channel_layer()
			data = MessageSerializer(message).data
			async_to_sync(layer.group_send)(
				f"chat_{chat.id}", {"type": "chat.message", "message": data}
			)
		except Exception:
			pass
