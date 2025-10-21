from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Membership


class IsOrganizationMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.memberships.filter(user=request.user).exists()


class IsOrganizationAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        membership = obj.memberships.filter(user=request.user).first()
        return bool(membership and membership.role == Membership.Role.ADMIN)

    def has_permission(self, request, view):
        if view.action in ("list", "retrieve", "create"):
            return True
        return True
