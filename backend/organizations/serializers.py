from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import Membership, Organization

User = get_user_model()


class MembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id",
            "organization",
            "user",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organization", "user", "created_at", "updated_at"]


class MembershipCreateSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False
    )
    username = serializers.CharField(required=False)
    password = serializers.CharField(required=False, write_only=True)
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=Membership.Role.choices, default=Membership.Role.MEMBER
    )

    def validate(self, attrs):
        user = attrs.get("user_id")
        username = attrs.get("username")
        password = attrs.get("password")

        if not user and not username:
            raise serializers.ValidationError(
                "Provide either an existing user_id or username to create a new user."
            )

        if user and username:
            raise serializers.ValidationError(
                "Use either user_id or username, not both."
            )

        if username and not password:
            raise serializers.ValidationError(
                "Password is required when creating a new user."
            )

        return attrs


class MembershipUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membership
        fields = ["role"]


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "password", "email", "first_name", "last_name"]


class OrganizationSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "created_by",
            "created_at",
            "updated_at",
            "role",
            "member_count",
        ]

    read_only_fields = [
        "id",
        "slug",
        "created_by",
        "created_at",
        "updated_at",
        "role",
        "member_count",
    ]

    def get_role(self, obj):
        actor = self.context.get("actor")
        if actor is None:
            request = self.context.get("request")
            actor = getattr(request, "user", None) if request else None
        if not actor or getattr(actor, "is_anonymous", False):
            return None
        membership = obj.memberships.filter(user=actor).first()
        return membership.role if membership else None

    def get_member_count(self, obj):
        return getattr(obj, "member_count", None) or obj.memberships.count()


class OrganizationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["name", "description"]

    def validate_name(self, value):
        if Organization.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError(
                _("An organization with this name already exists.")
            )
        return value


class OrganizationRegistrationSerializer(serializers.Serializer):
    organization = OrganizationCreateSerializer()
    admin = AdminUserCreateSerializer()

    def validate(self, attrs):
        if "organization" not in attrs or "admin" not in attrs:
            raise serializers.ValidationError(
                "Organization and admin details are required."
            )
        return attrs
