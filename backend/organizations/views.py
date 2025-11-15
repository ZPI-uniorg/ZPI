from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.serializers import UserSerializer
from core.views import get_tokens_for_user

from .models import Membership, Organization
from .serializers import (
    MembershipCreateSerializer,
    MembershipSerializer,
    MembershipUpdateSerializer,
    OrganizationCreateSerializer,
    OrganizationSerializer,
    OrganizationRegistrationSerializer,
)

User = get_user_model()


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Organization.objects.filter(memberships__user=user)
            .annotate(member_count=Count("memberships", distinct=True))
            .prefetch_related("memberships__user")
            .select_related("created_by")
            .distinct()
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["actor"] = self.request.user
        return context

    def create(self, request, *args, **kwargs):
        serializer = OrganizationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            organization = serializer.save(created_by=request.user)
            Membership.objects.create(
                organization=organization,
                user=request.user,
                role=Membership.Role.ADMIN,
            )
        output = OrganizationSerializer(
            organization,
            context=self.get_serializer_context(),
        )
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["get", "post"], url_path="members", url_name="members")
    def members(self, request, pk=None):
        organization = self.get_object()
        requester_membership = self._get_membership(organization, request.user)
        if requester_membership is None:
            raise PermissionDenied("You are not a member of this organization.")

        if request.method.lower() == "get":
            memberships = organization.memberships.select_related("user").order_by("user__username")
            serializer = MembershipSerializer(memberships, many=True)
            return Response(serializer.data)

        if requester_membership.role != Membership.Role.ADMIN:
            raise PermissionDenied("Only organization administrators can add members.")

        create_serializer = MembershipCreateSerializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        membership, created = self._create_membership(
            organization,
            request.user,
            create_serializer.validated_data,
        )
        response_serializer = MembershipSerializer(membership)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(response_serializer.data, status=status_code)

    @action(
        detail=True,
        methods=["get", "patch", "delete"],
        url_path=r"members/(?P<membership_pk>[^/.]+)",
        url_name="member-detail",
    )
    def member_detail(self, request, pk=None, membership_pk=None):
        organization = self.get_object()
        membership = get_object_or_404(
            Membership.objects.select_related("user"),
            pk=membership_pk,
            organization=organization,
        )
        requester_membership = self._get_membership(organization, request.user)
        if requester_membership is None:
            raise PermissionDenied("You are not a member of this organization.")

        if request.method.lower() == "get":
            serializer = MembershipSerializer(membership)
            return Response(serializer.data)

        if request.method.lower() == "patch":
            if requester_membership.role != Membership.Role.ADMIN:
                raise PermissionDenied("Only administrators can update member roles.")
            update_serializer = MembershipUpdateSerializer(
                membership,
                data=request.data,
                partial=True,
            )
            update_serializer.is_valid(raise_exception=True)
            new_role = update_serializer.validated_data.get("role")
            if new_role and membership.role != new_role:
                self._validate_role_change(organization, membership, new_role)
                membership.role = new_role
                membership.save(update_fields=["role", "updated_at"])
            refreshed = MembershipSerializer(membership)
            return Response(refreshed.data, status=status.HTTP_200_OK)

        if request.method.lower() == "delete":
            if requester_membership.pk != membership.pk and requester_membership.role != Membership.Role.ADMIN:
                raise PermissionDenied("Only administrators can remove other members.")
            self._validate_removal(organization, membership)
            membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        raise ValidationError({"detail": "Unsupported method."})

    def _get_membership(self, organization, user):
        return (
            organization.memberships.select_related("user")
            .filter(user=user)
            .first()
        )

    def _create_membership(self, organization, inviter, validated_data):
        existing_user = validated_data.get("user_id")
        username = validated_data.get("username")
        role = validated_data.get("role", Membership.Role.MEMBER)

        if existing_user:
            user = existing_user
            if organization.memberships.filter(user=user).exists():
                raise ValidationError({"detail": "User is already a member of this organization."})
            created = False
        else:
            if organization.memberships.filter(user__username__iexact=username).exists():
                raise ValidationError({"detail": "Username is already used by a member of this organization."})
            user = User.objects.create_user(
                username=username,
                password=validated_data["password"],
                email=validated_data.get("email"),
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
            )
            created = True

        membership = Membership.objects.create(
            organization=organization,
            user=user,
            role=role,
            invited_by=inviter,
        )
        return membership, created

    def _validate_role_change(self, organization, membership, new_role):
        if membership.role == Membership.Role.ADMIN and new_role != Membership.Role.ADMIN:
            if not organization.memberships.exclude(pk=membership.pk).filter(role=Membership.Role.ADMIN).exists():
                raise ValidationError({"detail": "Cannot remove the last administrator from the organization."})

    def _validate_removal(self, organization, membership):
        if membership.role == Membership.Role.ADMIN:
            has_other_admin = organization.memberships.exclude(pk=membership.pk).filter(
                role=Membership.Role.ADMIN
            ).exists()
            if not has_other_admin:
                raise ValidationError({"detail": "Cannot remove the last administrator from the organization."})


class OrganizationRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OrganizationRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        org_data = serializer.validated_data["organization"]
        admin_data = serializer.validated_data["admin"]

        with transaction.atomic():
            admin_user = User.objects.create_user(
                username=admin_data["username"],
                password=admin_data["password"],
                email=admin_data.get("email"),
                first_name=admin_data.get("first_name", ""),
                last_name=admin_data.get("last_name", ""),
            )
            organization = Organization.objects.create(
                name=org_data["name"],
                description=org_data.get("description", ""),
                created_by=admin_user,
            )
            Membership.objects.create(
                organization=organization,
                user=admin_user,
                role=Membership.Role.ADMIN,
            )

        token = get_tokens_for_user(admin_user)
        organization_payload = OrganizationSerializer(
            organization,
            context={"request": request, "actor": admin_user},
        ).data
        user_payload = UserSerializer(admin_user).data

        return Response(
            {
                "token": token,
                "organization": organization_payload,
                "user": user_payload,
            },
            status=status.HTTP_201_CREATED,
        )