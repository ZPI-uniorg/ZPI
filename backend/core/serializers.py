from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import User
from organizations.models import Membership, Organization


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    organization = serializers.CharField()

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")
        organization_slug = attrs.get("organization")

        if not (username and password and organization_slug):
            msg = _("Must include \"username\", \"password\" and \"organization\".")
            raise serializers.ValidationError(msg, code="authorization")

        try:
            organization = Organization.objects.get(slug=organization_slug)
        except Organization.DoesNotExist as exc:
            raise serializers.ValidationError({"organization": _("Organization not found.")}) from exc

        membership = (
            Membership.objects.select_related("user")
            .filter(organization=organization, user__username__iexact=username)
            .first()
        )

        if not membership:
            msg = _("Unable to log in with provided credentials.")
            raise serializers.ValidationError(msg, code="authorization")

        user: User = membership.user

        if not user.check_password(password):
            msg = _("Unable to log in with provided credentials.")
            raise serializers.ValidationError(msg, code="authorization")

        if not user.is_active:
            raise serializers.ValidationError(_("User account is disabled."), code="authorization")

        attrs["user"] = user
        attrs["organization"] = organization
        attrs["membership"] = membership
        return attrs


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "is_active"]
        read_only_fields = ["id", "is_active"]
