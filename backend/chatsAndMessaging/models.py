from django.db import models

class Chat(models.Model):
    chat_it = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    organization = models.ForeignKey(
        "organizations.Organization",
        related_name="chats",
        on_delete=models.CASCADE,
    )
    permissions = models.ManyToManyField('organizations.Tag', related_name='chat_permissions')

    def __str__(self):
        return self.name


class Message(models.Model):
    message_id = models.AutoField(primary_key=True)
    chat = models.ForeignKey(
        Chat,
        related_name="messages",
        on_delete=models.CASCADE,
    )
    sender = models.ForeignKey(
        "core.User",
        related_name="messages",
        on_delete=models.CASCADE,
    )
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.sender} at {self.timestamp}"
