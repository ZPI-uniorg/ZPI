from django.contrib import admin
from .models import Chat, Message


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
	list_display = ("id", "title", "created_at")
	search_fields = ("title",)
	filter_horizontal = ("participants",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
	list_display = ("id", "chat", "sender", "short_content", "created_at")
	search_fields = ("content", "sender__username")
	list_select_related = ("chat", "sender")

	def short_content(self, obj):
		return (obj.content[:40] + "...") if len(obj.content) > 43 else obj.content
	short_content.short_description = "content"
