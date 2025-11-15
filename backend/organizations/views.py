from datetime import datetime
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

from kanban.models import KanbanBoard
from .models import Membership, Organization, Tag, Project, CombinedTag
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
def get_organizations_test(request):
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
def get_organization_test(request, org_id):
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
def create_organization_test(request):
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
def delete_organization_test(request, organization_id):
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
def update_organization_test(request, organization_id):
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
def get_all_organization_memberships_test(request, org_id):
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
def get_membership_test(request, org_id, user_id):
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
def create_membership_test(request):
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
def delete_membership_test(request, org_id, user_id):
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
def update_membership_test(request, org_id, user_id):
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
def get_all_organization_members_test(request, org_id):
    try:
        memberships = Membership.objects.filter(organization__id=org_id)
        members = [
            {
                "user_id": membership.user.id,
                "organization_id": membership.organization.id,
                "role": membership.role,
                "username": membership.user.username,
                "first_name": membership.user.first_name,
                "last_name": membership.user.last_name,
                "email": membership.user.email
            }
            for membership in memberships
        ]

        return JsonResponse(members, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

@require_http_methods(["GET"])
@csrf_exempt
def get_tag_test(request, tag_id):
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
def get_all_tags_test(request):
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
def create_tag_test(request):
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
def delete_tag_test(request, tag_id):
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
def get_project_test(request, project_id):
    try:
        project = Project.objects.get(id=project_id)
        project_data = {
            "id": project.id,
            "name": project.title,
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
def get_all_projects_test(request):
    try:
        projects = Project.objects.all()
        project_list = [
            {
                "id": project.id,
                "name": project.title,
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
def create_project_test(request):
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
            "name": project.title,
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
def delete_project_test(request, project_id):
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
def update_project_test(request, project_id):
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



@require_http_methods(["POST"])
@csrf_exempt
def register_organization(request):
    try:
        name = request.POST.get('name')
        description = request.POST.get('description')

        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        password_confirm = request.POST.get('password_confirm')

        if password != password_confirm:
            return JsonResponse({"error": "Passwords do not match"}, status=400)
        if not all([name, username, email, password]):
            return JsonResponse({"error": "Missing fields"}, status=400)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        organization = Organization.objects.create(
            name=name,
            description=description,
            created_by=user
        )

        membership = Membership.objects.create(
            organization=organization,
            user=user,
            role='admin'
        )

        return JsonResponse({"message": "Organization registered successfully"}, status=201)
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
def get_user_organization(request, username):
    try:
        memberships = Membership.objects.filter(user__username=username)
        organizations = [
            {
                "id": membership.organization.id,
                "name": membership.organization.name,
                "slug": membership.organization.slug,
                "description": membership.organization.description,
                "created_by_id": membership.organization.created_by.id,
                "created_at": membership.organization.created_at,
                "updated_at": membership.organization.updated_at,
                "role": membership.role
            }
            for membership in memberships
        ]

        return JsonResponse(organizations, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def edit_organization(request, organization_id):
    try:
        data = json.loads(request.body)
        name = data.get('name')
        description = data.get('description')
        username = data.get('username')

        membership = Membership.objects.get(organization__id=organization_id, user__username=username)

        if membership.role != 'admin':
            return JsonResponse({"error": "Permission denied"}, status=403)

        org = Organization.objects.get(id=organization_id)

        if name:
            org.name = name
        if description:
            org.description = description

        org.save()

        return JsonResponse({"message": "Organization updated successfully"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
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


@require_http_methods(["POST"])
@csrf_exempt
def invite_member(request, organization_id):
    try:
        username = request.POST.get('username')
        membership = Membership.objects.get(organization__id=organization_id, user__username=username)

        if membership.role != 'admin':
            return JsonResponse({"error": "Permission denied"}, status=403)

        invitee_username = request.POST.get('invitee_username')
        invitee_email = request.POST.get('invitee_email')
        role = request.POST.get('role', 'member')
        invited_by = User.objects.get(username=username)
        organization = Organization.objects.get(id=organization_id)
        password = "NoweHasloKiedysToZmienie"

        invitee = User.objects.create_user(
            username=invitee_username,
            email=invitee_email,
            password=password
        )

        membership = Membership.objects.create(
            organization=organization,
            user=invitee,
            role=role,
            invited_by=invited_by
        )

        return JsonResponse({"message": "Member invited successfully", "password": password}, status=201)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
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
def get_organization_users(request, organization_id):
    try:
        username = request.GET.get('username')
        membership = Membership.objects.get(organization__id=organization_id, user__username=username)

        if membership.role not in ['admin', 'coordinator']:
            return JsonResponse({"error": "Permission denied"}, status=403)

        memberships = Membership.objects.filter(organization__id=organization_id)
        users = [
            {
                "user_id": membership.user.id,
                "username": membership.user.username,
                "first_name": membership.user.first_name,
                "last_name": membership.user.last_name,
                "email": membership.user.email,
                "role": membership.role,
                "permissions": list(membership.permissions.values_list('name', flat=True))
            }
            for membership in memberships
        ]

        return JsonResponse(users, safe=False, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def remove_organization_member(request, organization_id, username):
    try:
        data = json.loads(request.body)
        admin_username = data.get('admin_username')

        membership = Membership.objects.get(organization__id=organization_id, user__username=admin_username)

        if membership.role != 'admin':
            return JsonResponse({"error": "Permission denied"}, status=403)

        member_membership = Membership.objects.get(organization__id=organization_id, user__username=username)
        member_membership.delete()

        return JsonResponse({"message": "Member removed successfully"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def change_member_role(request, organization_id, username):
    try:
        data = json.loads(request.body)
        admin_username = data.get('admin_username')
        new_role = data.get('new_role')

        membership = Membership.objects.get(organization__id=organization_id, user__username=admin_username)

        if membership.role != 'admin':
            return JsonResponse({"error": "Permission denied"}, status=403)


        if not new_role:
            return JsonResponse({"error": "Missing role field"}, status=400)

        member_membership = Membership.objects.get(organization__id=organization_id, user__username=username)
        member_membership.role = new_role
        member_membership.save()

        return JsonResponse({"message": "Member role updated successfully"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Missing field: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Invalid value: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Type error: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def edit_permissions(request, organization_id, username):
    try:
        data = json.loads(request.body)
        admin_username = data.get('admin_username')
        tags_names = data.get('tags', [])

        membership = Membership.objects.get(organization__id=organization_id, user__username=admin_username)

        if membership.role == 'member':
            return JsonResponse({"error": "Permission denied"}, status=403)

        if membership.role == 'coordinator':
            allowed_tags = list(membership.permissions.values_list('name', flat=True))
            for tag in tags_names:
                if tag not in allowed_tags:
                    return JsonResponse({"error": "Permission denied for some tags"}, status=403)

        for tag in tags_names:

            tag_id = Tag.objects.filter(name=tag, organization__id=organization_id).first().id
            if CombinedTag.objects.filter(combined_tag_id=tag_id).exists():
                return JsonResponse({"error": "Cannot assign combined tag to user"}, status=403)

        member_membership = Membership.objects.get(organization__id=organization_id, user__username=username)
        member_membership.permissions.set(Tag.objects.filter(name__in=tags_names, organization__id=organization_id))
        member_membership.save()

        return JsonResponse({"message": "Member permissions updated successfully"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
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
def get_all_tags(request, organization_id):
    try:
        username = request.GET.get('username')
        membership = Membership.objects.get(organization__id=organization_id, user__username=username)

        if membership.role != 'admin':
            return JsonResponse({"error": "Permission denied"}, status=403)

        tags = Tag.objects.filter(organization__id=organization_id)
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


@require_http_methods(["GET"])
@csrf_exempt
def get_tags(request, organization_id):
    try:
        username = request.GET.get('username')
        membership = Membership.objects.get(organization__id=organization_id, user__username=username)

        tags_names = list(membership.permissions.values_list('name', flat=True))

        tags = Tag.objects.filter(name__in=tags_names, organization__id=organization_id)

        tags = [
            {
                "id": tag.id,
                "name": tag.name,
                "organization_id": tag.organization.id,
            }
            for tag in tags
        ]

        return JsonResponse(tags, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)



@require_http_methods(["POST"])
@csrf_exempt
def create_tag(request, organization_id):
    try:
        username = request.POST.get('username')
        membership = Membership.objects.get(organization__id=organization_id, user__username=username)

        if membership.role != 'admin':
            return JsonResponse({"error": "Permission denied"}, status=403)

        name = request.POST.get('name')

        if not name:
            return JsonResponse({"error": "Missing name field"}, status=400)

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
def delete_tag(request, organization_id, tag_name):
    try:
        username = request.POST.get('username')
        membership = Membership.objects.get(organization__id=organization_id, user__id=username)

        if membership.role != 'admin':
            return JsonResponse({"error": "Permission denied"}, status=403)

        tag = Tag.objects.get(name=tag_name, organization__id=organization_id)
        tag.delete()

        return JsonResponse({"message": "Tag deleted successfully"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
    except Tag.DoesNotExist:
        return JsonResponse({"error": "Tag not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_project(request, organization_id):
    try:
        username = request.POST.get('username')
        membership = Membership.objects.get(organization__id=organization_id, user__username=username)

        if membership.role not in ['admin', 'coordinator']:
            return JsonResponse({"error": "Permission denied"}, status=403)

        name = request.POST.get('name')
        description = request.POST.get('description', '')
        start_dte_raw = request.POST.get('start_dte')
        end_dte_raw = request.POST.get('end_dte')
        tag_name = name

        try:
            def parse_to_date(s):
                if 'T' in s:
                    return datetime.fromisoformat(s).date()
                return datetime.strptime(s, "%Y-%m-%d").date()

            start_dte = parse_to_date(start_dte_raw)
            end_dte = parse_to_date(end_dte_raw)
        except Exception:
            return JsonResponse({"error": "Invalid date format, expected YYYY-MM-DD or ISO"}, status=400)

        if start_dte > end_dte:
            return JsonResponse({"error": "start_dte must be before or equal to end_dte"}, status=400)

        if not all([name, start_dte, end_dte, tag_name]):
            return JsonResponse({"error": "Missing fields"}, status=400)

        organization = Organization.objects.get(id=organization_id)
        tag = Tag.objects.create(
            name=tag_name,
            organization=organization
        )

        project = Project.objects.create(
            title=name,
            description=description,
            start_dte=start_dte,
            end_dte=end_dte,
            organization=organization,
            tag=tag,
            coordinator=membership.user if membership.role == 'coordinator' else None
        )

        kanbanBoard = KanbanBoard.objects.create(
            project=project,
            title=f"{project.title} Kanban Board",
            organization = organization
        )

        project_data = {
            "id": project.id,
            "name": project.title,
            "description": project.description,
            "start_dte": project.start_dte,
            "end_dte": project.end_dte,
            "organization_id": project.organization.id,
            "tag_id": project.tag.id,
            "coordinator_id": project.coordinator.id if project.coordinator else None,
        }

        return JsonResponse(project_data, status=201)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
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


@require_http_methods(["PUT"])
@csrf_exempt
def update_project(request, organization_id, project_id):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        name = data.get('name')
        description = data.get('description')
        start_dte_raw = data.get('start_dte')
        end_dte_raw = data.get('end_dte')
        coordinator_username = data.get('coordinator_username')

        project = Project.objects.get(id=project_id)
        membership = Membership.objects.get(organization__id=organization_id, user__username=username)

        if membership.role not in ['admin', 'coordinator']:
            return JsonResponse({"error": "Permission denied"}, status=403)

        if membership.role == 'coordinator' and project.coordinator != membership.user:
            return JsonResponse({"error": "Permission denied"}, status=403)

        try:
            def parse_to_date(s):
                if 'T' in s:
                    return datetime.fromisoformat(s).date()
                return datetime.strptime(s, "%Y-%m-%d").date()

            start_dte = parse_to_date(start_dte_raw)
            end_dte = parse_to_date(end_dte_raw)
        except Exception:
            return JsonResponse({"error": "Invalid date format, expected YYYY-MM-DD or ISO"}, status=400)

        if start_dte > end_dte:
            return JsonResponse({"error": "start_dte must be before or equal to end_dte"}, status=400)


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
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Membership not found"}, status=404)
    except User.DoesNotExist:
        return JsonResponse({"error": "Coordinator user not found"}, status=404)
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
def get_projects(request, organization_id):
    try:
        user_id = request.POST.get('user_id')
        membership = Membership.objects.get(organization__id=organization_id, user__id=user_id)

        if membership.role != 'admin':
            return JsonResponse({"error": "Permission denied"}, status=403)

        projects = Project.objects.filter(organization__id=organization_id)
        project_list = [
            {
                "id": project.id,
                "name": project.title,
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


@require_http_methods(["GET"])
@csrf_exempt
def get_user_projects(request, organization_id):
    try:
        username=request.GET.get('username')
        membership = Membership.objects.get(organization__id=organization_id, user__username=username)

        tags = list(membership.permissions.values_list('name', flat=True))

        projects = Project.objects.filter(organization__id=organization_id, tag__name__in=tags)

        project_list = [
            {
                "id": project.id,
                "name": project.title,
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