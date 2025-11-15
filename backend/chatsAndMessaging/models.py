from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Chat(models.Model):
	title = models.CharField(max_length=120)
	participants = models.ManyToManyField(User, related_name="chats")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self):
		return self.title


class Message(models.Model):
	chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
	sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
	content = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["created_at"]
		indexes = [
			models.Index(fields=["chat", "created_at"]),
		]

	def __str__(self):
		return f"{self.sender}: {self.content[:30]}"
