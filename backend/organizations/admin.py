from django.contrib import admin

from .models import Membership, Organization, Tag, Project


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_by", "created_at")
    search_fields = ("name", "slug")
    ordering = ("name",)


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("organization", "user", "role", "created_at")
    search_fields = ("organization__name", "user__username")
    list_filter = ("role",)
    autocomplete_fields = ("organization", "user", "invited_by")


admin.site.register(Tag)
admin.site.register(Project)