import json

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.http import JsonResponse, QueryDict
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


@require_http_methods(["GET"])
@csrf_exempt
def get_organizations(request):
    try:
        organizations = Organization.objects.all()
        org_list = [
            {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "description": org.description,
                "created_by_id": org.created_by.id,
                "created_at": org.created_at,
                "updated_at": org.updated_at,
            }
            for org in organizations
        ]
        return JsonResponse(org_list, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_organization(request, org_id):
    try:
        org = Organization.objects.get(id=org_id)
        org_data = {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "description": org.description,
            "created_by_id": org.created_by.id,
            "created_at": org.created_at,
            "updated_at": org.updated_at,
        }
        return JsonResponse(org_data, status=200)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_organization(request):
    try:
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        created_by_username = request.POST.get('created_by_username')

        if not name or not created_by_username:
            return JsonResponse({"error": "Missing fields"}, status=400)

        created_by = User.objects.get(username=created_by_username)

        organization = Organization.objects.create(
            name=name,
            description=description,
            created_by=created_by
        )

        org_data = {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "description": organization.description,
            "created_by_id": organization.created_by.id,
            "created_at": organization.created_at,
            "updated_at": organization.updated_at,
        }

        return JsonResponse(org_data, status=201)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
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
def delete_organization(request, organization_id):
    try:
        org = Organization.objects.get(id=organization_id)
        org.delete()

        return JsonResponse({"message": "Organization deleted successfully"}, status=200)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_organization(request, organization_id):
    try:
        org = Organization.objects.get(id=organization_id)

        data = json.loads(request.body)

        name = data.get('name')
        description = data.get('description')

        if name:
            org.name = name
        if description:
            org.description = description

        org.save()

        return JsonResponse({"message": "Organization updated successfully"}, status=200)
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


@require_http_methods(["GET"])
@csrf_exempt
def get_all_organization_memberships(request, org_id):
    try:
        memberships = Membership.objects.filter(organization__id=org_id)
        membership_list = [
            {
                "user_id": membership.user.id,
                "organization_id": membership.organization.id,
                "role": membership.role,
                "invited_by_id": membership.invited_by.id if membership.invited_by else None,
                "created_at": membership.created_at,
            }
            for membership in memberships
        ]
        return JsonResponse(membership_list, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_membership(request, org_id, user_id):
    try:
        membership = Membership.objects.get(organization__id=org_id, user__id=user_id)
        membership_data = {
            "user_id": membership.user.id,
            "organization_id": membership.organization.id,
            "role": membership.role,
            "invited_by_id": membership.invited_by.id if membership.invited_by else None,
            "created_at": membership.created_at,
        }
        return JsonResponse(membership_data, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_membership(request):
    try:
        organization_id = request.POST.get('organization_id')
        user_id = request.POST.get('user_id')
        role = request.POST.get('role')
        invited_by_id = request.POST.get('invited_by_id')

        if not all([organization_id, user_id, role]):
            return JsonResponse({"error": "Missing fields"}, status=400)

        organization = Organization.objects.get(id=organization_id)
        user = User.objects.get(id=user_id)
        invited_by = User.objects.get(id=invited_by_id) if invited_by_id else None

        membership = Membership.objects.create(
            organization=organization,
            user=user,
            role=role,
            invited_by=invited_by
        )

        membership_data = {
            "user_id": membership.user.id,
            "organization_id": membership.organization.id,
            "role": membership.role,
            "invited_by_id": membership.invited_by.id if membership.invited_by else None,
            "created_at": membership.created_at,
        }

        return JsonResponse(membership_data, status=201)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except IntegrityError:
        return JsonResponse({"error": "Membership already exists"}, status=400)
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
def delete_membership(request, org_id, user_id):
    try:
        membership = Membership.objects.get(organization__id=org_id, user__id=user_id)
        membership.delete()

        return JsonResponse({"message": "Membership deleted successfully"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_membership(request, org_id, user_id):
    try:
        membership = Membership.objects.get(organization__id=org_id, user__id=user_id)

        data = json.loads(request.body)

        role = data.get('role')
        invited_by_id = data.get('invited_by_id')

        if role:
            membership.role = role
        if invited_by_id:
            invited_by = User.objects.get(id=invited_by_id)
            membership.invited_by = invited_by

        membership.save()

        return JsonResponse({"message": "Membership updated successfully"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
    except User.DoesNotExist:
        return JsonResponse({"error": "Invited by user not found"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Missing field: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Invalid value: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Type error: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

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

        data = json.loads(request.body)

        name = data.get('name')
        description = data.get('description')
        start_dte = data.get('start_dte')
        end_dte = data.get('end_dte')
        coordinator_username = data.get('coordinator_username')

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