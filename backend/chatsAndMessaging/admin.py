from django.contrib import admin
from .models import Chat, Message

# Register your models here.
admin.site.register(Chat)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("chat", "sender", "timestamp", "content_preview")
    search_fields = ("chat__id", "sender__username", "content")
    list_filter = ("timestamp",)

    def content_preview(self, obj):
        return obj.content[:50] + ("..." if len(obj.content) > 50 else "")

    content_preview.short_description = "Content Preview"
