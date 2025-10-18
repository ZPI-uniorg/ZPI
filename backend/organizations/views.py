from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

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
    permission_classes = [IsAuthenticated]
    queryset = Organization.objects.all()

    def get_queryset(self):
        qs = (
            Organization.objects.filter(memberships__user=self.request.user)
            .distinct()
            .annotate(member_count=Count("memberships"))
        )
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return OrganizationCreateSerializer
        return OrganizationSerializer

    def perform_create(self, serializer):
        organization = serializer.save(created_by=self.request.user)
        if not organization.slug:
            organization.generate_unique_slug()
            organization.save(update_fields=["slug"])
        Membership.objects.create(
            organization=organization,
            user=self.request.user,
            role=Membership.Role.ADMIN,
        )
        return organization

    def perform_update(self, serializer):
        organization = serializer.save()
        if not organization.slug:
            organization.generate_unique_slug()
            organization.save(update_fields=["slug"])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = self.perform_create(serializer)
        output_serializer = OrganizationSerializer(organization, context={"request": request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    # Organization member operations handled by dedicated API views below


def _is_member(organization, user):
    return organization.memberships.filter(user=user).exists()


def _is_admin(organization, user):
    return organization.memberships.filter(user=user, role=Membership.Role.ADMIN).exists()


def _has_another_admin(organization, exclude_members=None):
    qs = organization.memberships.filter(role=Membership.Role.ADMIN)
    if exclude_members:
        qs = qs.exclude(pk__in=[m.pk for m in exclude_members])
    return qs.exists()


class OrganizationMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, organization_id):
        organization = get_object_or_404(Organization, pk=organization_id)
        if not _is_member(organization, request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = MembershipSerializer(organization.memberships.select_related("user"), many=True)
        return Response(serializer.data)

    def post(self, request, organization_id):
        organization = get_object_or_404(Organization, pk=organization_id)
        if not _is_admin(organization, request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = MembershipCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = data.get("user_id")
        created_new_user = False

        if not user:
            username = data["username"]
            password = data["password"]

            if organization.memberships.filter(user__username__iexact=username).exists():
                return Response(
                    {"detail": "Użytkownik o tym loginie już jest członkiem tej organizacji."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User.objects.create_user(
                username=username,
                password=password,
                email=data.get("email", ""),
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
            )
            created_new_user = True

        try:
            membership = Membership.objects.create(
                organization=organization,
                user=user,
                role=data.get("role", Membership.Role.MEMBER),
                invited_by=request.user,
            )
        except IntegrityError:
            return Response(
                {"detail": "This user is already a member of the organization."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_serializer = MembershipSerializer(membership)
        status_code = status.HTTP_201_CREATED if created_new_user else status.HTTP_200_OK
        return Response(response_serializer.data, status=status_code)


class OrganizationMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, organization_id, member_id):
        organization = get_object_or_404(Organization, pk=organization_id)
        if not _is_admin(organization, request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        membership = get_object_or_404(Membership, pk=member_id, organization=organization)
        serializer = MembershipUpdateSerializer(membership, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if (
            membership.role == Membership.Role.ADMIN
            and serializer.validated_data.get("role") != Membership.Role.ADMIN
            and not _has_another_admin(organization, exclude_members=[membership])
        ):
            return Response({"detail": "Organization must have at least one administrator."}, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(MembershipSerializer(membership).data)

    def delete(self, request, organization_id, member_id):
        organization = get_object_or_404(Organization, pk=organization_id)
        membership = get_object_or_404(Membership, pk=member_id, organization=organization)

        if request.user == membership.user and not _has_another_admin(organization, exclude_members=[membership]):
            return Response({"detail": "Organization must have at least one administrator."}, status=status.HTTP_400_BAD_REQUEST)

        if not _is_admin(organization, request.user) and request.user != membership.user:
            return Response(status=status.HTTP_403_FORBIDDEN)

        if membership.role == Membership.Role.ADMIN and not _has_another_admin(organization, exclude_members=[membership]):
            return Response({"detail": "Organization must have at least one administrator."}, status=status.HTTP_400_BAD_REQUEST)

        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrganizationRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OrganizationRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        org_data = data["organization"].copy()
        admin_data = data["admin"].copy()

        with transaction.atomic():
            password = admin_data.pop("password")
            user = User.objects.create_user(password=password, **admin_data)
            organization = Organization.objects.create(
                name=org_data["name"],
                description=org_data.get("description", ""),
                created_by=user,
            )
            if not organization.slug:
                organization.generate_unique_slug()
                organization.save(update_fields=["slug"])
            Membership.objects.create(
                organization=organization,
                user=user,
                role=Membership.Role.ADMIN,
            )

        refresh = RefreshToken.for_user(user)
        token = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

        org_serializer = OrganizationSerializer(
            organization,
            context={"request": request, "actor": user},
        )

        return Response(
            {
                "organization": org_serializer.data,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                },
                "token": token,
            },
            status=status.HTTP_201_CREATED,
        )