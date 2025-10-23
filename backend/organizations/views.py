from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Membership, Organization, Tag, Project
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


@require_http_methods(["GET"])
@csrf_exempt
def get_tag(request, tag_id):
    try:
        tag = Tag.objects.get(id=tag_id)
        tag_data = {
            "id": tag.id,
            "name": tag.name,
            "organization_id": tag.organization.id,
        }
        return JsonResponse(tag_data, status=200)
    except Tag.DoesNotExist:
        return JsonResponse({"error": "Tag not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_all_tags(request):
    try:
        tags = Tag.objects.all()
        tag_list = [
            {
                "id": tag.id,
                "name": tag.name,
                "organization_id": tag.organization.id,
            }
            for tag in tags
        ]
        return JsonResponse(tag_list, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_tag(request):
    try:
        name = request.POST.get('name')
        organization_id = request.POST.get('organization_id')

        if not name or not organization_id:
            return JsonResponse({"error": "Missing fields"}, status=400)

        organization = Organization.objects.get(id=organization_id)

        tag = Tag.objects.create(
            name=name,
            organization=organization
        )

        tag_data = {
            "id": tag.id,
            "name": tag.name,
            "organization_id": tag.organization.id,
        }

        return JsonResponse(tag_data, status=201)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Missing field: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Invalid value: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Type error: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_tag(request, tag_id):
    try:
        tag = Tag.objects.get(id=tag_id)
        tag.delete()

        return JsonResponse({"message": "Tag deleted successfully"}, status=200)
    except Tag.DoesNotExist:
        return JsonResponse({"error": "Tag not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_project(request, project_id):
    try:
        project = Project.objects.get(id=project_id)
        project_data = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "start_dte": project.start_dte,
            "end_dte": project.end_dte,
            "organization_id": project.organization.id,
            "tag_id": project.tag.id,
            "coordinator_id": project.coordinator.id if project.coordinator else None,
        }
        return JsonResponse(project_data, status=200)
    except Project.DoesNotExist:
        return JsonResponse({"error": "Project not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_all_projects(request):
    try:
        projects = Project.objects.all()
        project_list = [
            {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "start_dte": project.start_dte,
                "end_dte": project.end_dte,
                "organization_id": project.organization.id,
                "tag_id": project.tag.id,
                "coordinator_id": project.coordinator.id if project.coordinator else None,
            }
            for project in projects
        ]
        return JsonResponse(project_list, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_project(request):
    try:
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        start_dte = request.POST.get('start_dte')
        end_dte = request.POST.get('end_dte')
        organization_id = request.POST.get('organization_id')
        coordinator_username = request.POST.get('coordinator_username')

        if not all([name, start_dte, end_dte, organization_id, coordinator_username]):
            return JsonResponse({"error": "Missing fields"}, status=400)

        organization = Organization.objects.get(id=organization_id)
        tag = Tag.objects.create(
            name=name,
            organization=organization
        )
        coordinator = User.objects.get(username=coordinator_username)

        project = Project.objects.create(
            name=name,
            description=description,
            start_dte=start_dte,
            end_dte=end_dte,
            organization=organization,
            tag=tag,
            coordinator=coordinator
        )

        project_data = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "start_dte": project.start_dte,
            "end_dte": project.end_dte,
            "organization_id": project.organization.id,
            "tag_id": project.tag.id,
            "coordinator": project.coordinator.get_username() if project.coordinator else None,
        }

        return JsonResponse(project_data, status=201)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Tag.DoesNotExist:
        return JsonResponse({"error": "Tag not found"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Missing field: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Invalid value: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Type error: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_project(request, project_id):
    try:
        project = Project.objects.get(id=project_id)
        project.delete()

        return JsonResponse({"message": "Project deleted successfully"}, status=200)
    except Project.DoesNotExist:
        return JsonResponse({"error": "Project not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_project(request, project_id):
    try:
        project = Project.objects.get(id=project_id)

        name = request.PUT.get('name')
        description = request.PUT.get('description')
        start_dte = request.PUT.get('start_dte')
        end_dte = request.PUT.get('end_dte')
        coordinator_username = request.PUT.get('coordinator_username')

        if name:
            project.name = name
        if description:
            project.description = description
        if start_dte:
            project.start_dte = start_dte
        if end_dte:
            project.end_dte = end_dte
        if coordinator_username:
            coordinator = User.objects.get(username=coordinator_username)
            project.coordinator = coordinator

        project.save()

        return JsonResponse({"message": "Project updated successfully"}, status=200)
    except Project.DoesNotExist:
        return JsonResponse({"error": "Project not found"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Missing field: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Invalid value: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Type error: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)