from django.db import models


class Chat(models.Model):
    chat_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    organization = models.ForeignKey(
        "organizations.Organization",
        related_name="chats",
        on_delete=models.CASCADE,
    )
    permissions = models.ManyToManyField(
        "organizations.Tag", related_name="chat_permissions"
    )

    def __str__(self):
        return self.name


class Message(models.Model):
    message_id = models.AutoField(primary_key=True)
    message_uuid = models.CharField(
        max_length=36, unique=True, db_index=True, null=True, blank=True
    )  # For deduplication
    chat = models.ForeignKey(
        Chat,
        related_name="messages",
        on_delete=models.CASCADE,
    )
    channel = models.CharField(
        max_length=100, default="general", db_index=True
    )  # Channel name
    sender = models.ForeignKey(
        "core.User",
        related_name="messages",
        on_delete=models.CASCADE,
        null=True,
        blank=True,  # Allow null for guest users
    )
    author_username = models.CharField(
        max_length=150, default="Guest"
    )  # Store username directly for guests
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["timestamp"]
        indexes = [
            models.Index(fields=["channel", "timestamp"]),
        ]

    def __str__(self):
        return f"Message from {self.author_username} at {self.timestamp}"
