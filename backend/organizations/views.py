from datetime import datetime
import json
import secrets

from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


from kanban.models import KanbanBoard
from core.email_utils import send_new_user_credentials_email

from .models import Membership, Organization, Tag, Project

User = get_user_model()


def _project_to_dict(project):
    return {
        "id": project.id,
        "name": project.title,
        "description": project.description,
        "start_dte": project.start_dte,
        "end_dte": project.end_dte,
        "organization_id": project.organization.id,
        "tag_id": project.tag.id,
        "coordinator_id": project.coordinator.id if project.coordinator else None,
        "coordinator_username": project.coordinator.username
        if project.coordinator
        else None,
    }


def custom_slugify(text):
    map = {
        "ą": "a",
        "ć": "c",
        "ę": "e",
        "ł": "l",
        "ń": "n",
        "ó": "o",
        "ś": "s",
        "ź": "z",
        "ż": "z",
        "Ą": "A",
        "Ć": "C",
        "Ę": "E",
        "Ł": "L",
        "Ń": "N",
        "Ó": "O",
        "Ś": "S",
        "Ź": "Z",
        "Ż": "Z",
        "ü": "u",
        "ö": "o",
        "ä": "a",
        "ß": "ss",
        "é": "e",
        "è": "e",
        "ê": "e",
        "ë": "e",
        "á": "a",
        "à": "a",
        "â": "a",
        "ã": "a",
        "å": "a",
        "ç": "c",
        "í": "i",
        "ì": "i",
        "î": "i",
        "ï": "i",
        "ú": "u",
        "ù": "u",
        "û": "u",
        "ñ": "n",
        "ý": "y",
        "ÿ": "y",
    }
    import re

    text = "".join(map.get(c, c) for c in text)
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    text = text.strip("-")
    return text or "organization"


@require_http_methods(["POST"])
@csrf_exempt
def register_organization(request):
    try:
        name = request.POST.get("name")
        description = request.POST.get("description")
        username = request.POST.get("username")
        email = request.POST.get("email")
        firstname = request.POST.get("firstname")
        lastname = request.POST.get("lastname")
        password = request.POST.get("password")
        password_confirm = request.POST.get("password_confirm")
        identifier = username + "_" + name

        if password != password_confirm:
            return JsonResponse({"error": "Hasła nie są zgodne"}, status=400)
        if not all([name, username, email, password]):
            return JsonResponse({"error": "Brakujące pola"}, status=400)
        if User.objects.filter(identifier=identifier).exists():
            return JsonResponse({"error": "Nazwa użytkownika już istnieje"}, status=400)

        base_slug = custom_slugify(name)
        if Organization.objects.filter(slug=base_slug).exists():
            return JsonResponse(
                {"error": "Organizacja o podanym adresie URL już istnieje"}, status=400
            )

        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=firstname,
                last_name=lastname,
                identifier=identifier,
            )
            organization = Organization.objects.create(
                name=name, description=description, created_by=user, slug=base_slug
            )
            Membership.objects.create(
                organization=organization, user=user, role="admin"
            )

        return JsonResponse(
            {"message": "Organizacja została pomyślnie zarejestrowana"}, status=201
        )
    except KeyError as e:
        return JsonResponse({"error": f"Brakujące pole: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Nieprawidłowa wartość: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Błąd typu: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_user_organization(request, username):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
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
                "role": membership.role,
            }
            for membership in memberships
        ]

        return JsonResponse(organizations, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_user_membership(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        membership_data = {
            "organization_id": membership.organization.id,
            "user_id": membership.user.id,
            "role": membership.role,
            "permissions": list(membership.permissions.values_list("name", flat=True)),
        }
        return JsonResponse(membership_data, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono członkostwa"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def edit_organization(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        data = json.loads(request.body)
        name = data.get("name")
        description = data.get("description")
        username = request.user.username

        membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        if membership.role != "admin":
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        org = Organization.objects.get(id=organization_id)

        if name:
            org.name = name
        if description:
            org.description = description

        org.save()

        return JsonResponse(
            {"message": "Organizacja została pomyślnie zaktualizowana"}, status=200
        )
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono członkostwa"}, status=404)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono organizacji"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Brakujące pole: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Nieprawidłowa wartość: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Błąd typu: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def invite_member(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        if request.content_type == "application/json":
            data = json.loads(request.body or "{}")
        else:
            data = request.POST

        username = request.user.username

        if not username:
            return JsonResponse({"error": "Brakujące pole: username"}, status=400)

        membership = Membership.objects.get(
            organization__id=organization_id,
            user__username=username,
        )

        if membership.role != "admin":
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        invitee_username = data.get("invitee_username")
        invitee_email = data.get("invitee_email", "")
        first_name = data.get("first_name", "")
        last_name = data.get("last_name", "")
        role = data.get("role", "member")
        raw_password = data.get("password")

        if not invitee_username:
            return JsonResponse(
                {"error": "Missing field: invitee_username"}, status=400
            )

        invited_by = User.objects.get(username=username)
        organization = Organization.objects.get(id=organization_id)

        generated_password = raw_password or secrets.token_urlsafe(12)
        identifier = invitee_username + "_" + organization.name

        if User.objects.filter(identifier=identifier).exists():
            return JsonResponse({"error": "Użytkownik już istnieje"}, status=400)

        with transaction.atomic():
            invitee = User.objects.create_user(
                username=invitee_username,
                email=invitee_email,
                password=generated_password,
                first_name=first_name,
                last_name=last_name,
                identifier=identifier,
            )

            Membership.objects.create(
                organization=organization, user=invitee, role=role, invited_by=invited_by
            )

        send_new_user_credentials_email(
            recipient_email=invitee_email,
            username=invitee_username,
            password=generated_password,
            organization_name=organization.name,
        )

        response_payload = {
            "message": "Członek został pomyślnie zaproszony",
            "invitee_username": invitee_username,
            "invitee_email": invitee_email,
            "role": role,
            "generated_password": generated_password
            if not raw_password
            else "Provided by inviter",
        }

        return JsonResponse(response_payload, status=201)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono członkostwa"}, status=404)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono organizacji"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Brakujące pole: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Nieprawidłowa wartość: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Błąd typu: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_organization_users(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        requester_membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        # Get all memberships in organization
        all_memberships = Membership.objects.filter(organization__id=organization_id)
        
        # If admin, show all users. Otherwise filter by shared tags
        if requester_membership.role == "admin":
            memberships = all_memberships
        else:
            # Get requester's permissions (tags)
            requester_perms = set(requester_membership.permissions.values_list("name", flat=True))
            
            # Filter memberships that share at least one tag with requester
            memberships = []
            for m in all_memberships:
                member_perms = set(m.permissions.values_list("name", flat=True))
                if requester_perms & member_perms or m.user.username == username:  # Show if shared tags or self
                    memberships.append(m)
        users = [
            {
                "user_id": membership.user.id,
                "username": membership.user.username,
                "first_name": membership.user.first_name,
                "last_name": membership.user.last_name,
                "email": membership.user.email,
                "role": membership.role,
                "permissions": list(
                    membership.permissions.values_list("name", flat=True)
                ),
            }
            for membership in memberships
        ]

        return JsonResponse(users, safe=False, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono członkostwa"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_project_members(request, organization_id, project_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        requester_membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        project = Project.objects.get(id=project_id, organization__id=organization_id)
        project_tag = project.tag

        if (
            requester_membership.role != "admin"
            and not requester_membership.permissions.filter(id=project_tag.id).exists()
        ):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        memberships = Membership.objects.filter(
            organization__id=organization_id, permissions__id=project_tag.id
        )

        users = [
            {
                "user_id": m.user.id,
                "username": m.user.username,
                "first_name": m.user.first_name,
                "last_name": m.user.last_name,
                "email": m.user.email,
                "role": m.role,
                "permissions": list(m.permissions.values_list("name", flat=True)),
            }
            for m in memberships
        ]

        return JsonResponse(users, safe=False, status=200)
    except Project.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono projektu"}, status=404)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono członkostwa"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def remove_organization_member(request, organization_id, username):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        admin_username = request.user.username

        membership = Membership.objects.get(
            organization__id=organization_id, user__username=admin_username
        )

        if membership.role != "admin":
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        member_membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )
        member_membership.delete()

        return JsonResponse({"message": "Członek został pomyślnie usunięty"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono członkostwa"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def change_member_role(request, organization_id, username):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        data = json.loads(request.body)
        admin_username = request.user.username
        new_role = data.get("new_role")

        membership = Membership.objects.get(
            organization__id=organization_id, user__username=admin_username
        )

        if membership.role != "admin":
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        if not new_role:
            return JsonResponse({"error": "Brak pola roli"}, status=400)

        member_membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )
        member_membership.role = new_role
        member_membership.save()

        return JsonResponse({"message": "Rola członka została pomyślnie zaktualizowana"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono członkostwa"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Brak pola: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Nieprawidłowa wartość: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Błąd typu: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_member_profile(request, organization_id, username):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Nieprawidłowy format JSON"}, status=400)

        admin_username = request.user.username

        admin_membership = Membership.objects.get(
            organization__id=organization_id,
            user__username=admin_username,
        )

        if admin_membership.role != "admin":
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        member_membership = Membership.objects.get(
            organization__id=organization_id,
            user__username=username,
        )

        user = member_membership.user

        first_name = data.get("first_name")
        last_name = data.get("last_name")
        email = data.get("email")

        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        if email:
            user.email = email

        user.save()

        member_payload = {
            "user_id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": member_membership.role,
            "permissions": list(
                member_membership.permissions.values_list("name", flat=True)
            ),
        }

        return JsonResponse(
            {
                "message": "Członek został pomyślnie zaktualizowany",
                "member": member_payload,
            },
            status=200,
        )
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono członkostwa"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def edit_permissions(request, organization_id, username):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        data = json.loads(request.body)
        admin_username = request.user.username
        tags_names = data.get("tags", [])

        membership = Membership.objects.get(
            organization__id=organization_id, user__username=admin_username
        )

        if membership.role == "member":
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        if membership.role == "coordinator":
            allowed_tags = list(membership.permissions.values_list("name", flat=True))

            for tag in tags_names:
                if tag not in allowed_tags:
                    return JsonResponse(
                        {"error": "Brak uprawnień do niektórych tagów"}, status=403
                    )

        for tag in tags_names:
            if not Tag.objects.filter(
                name=tag, organization__id=organization_id
            ).exists():
                return JsonResponse(
                    {"error": f"Tag '{tag}' nie istnieje"}, status=404
                )

            if Tag.objects.get(name=tag, organization__id=organization_id).combined:
                return JsonResponse(
                    {
                        "error": f"Tag '{tag}' jest tagiem złożonym i nie może być przypisany bezpośrednio"
                    },
                    status=400,
                )

        member_membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )
        member_membership.permissions.set(
            Tag.objects.filter(name__in=tags_names, organization__id=organization_id)
        )
        member_membership.save()

        return JsonResponse(
            {"message": "Uprawnienia członka zostały pomyślnie zaktualizowane"}, status=200
        )
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono członkostwa"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Brakujące pole: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Nieprawidłowa wartość: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Błąd typu: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_all_tags(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        # Get user's permissions (tags)
        user_permissions = list(membership.permissions.values_list("name", flat=True))
        
        # If admin, show all tags. Otherwise show only user's tags
        if membership.role == "admin":
            tags = Tag.objects.filter(organization__id=organization_id)
        else:
            tags = Tag.objects.filter(
                organization__id=organization_id,
                name__in=user_permissions
            )
        
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
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        tags = membership.permissions.all()

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
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        if membership.role != "admin":
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        name = request.POST.get("name")

        if "+" in name:
            return JsonResponse(
                {"error": "Tagi złożone nie mogą być tworzone bezpośrednio"}, status=400
            )

        if not name:
            return JsonResponse({"error": "Brak pola nazwy"}, status=400)
        organization = Organization.objects.get(id=organization_id)

        if Tag.objects.filter(name=name, organization=organization).exists():
            return JsonResponse(
                {"error": "Tag o takiej nazwie już istnieje w organizacji"},
                status=400,
            )

        tag = Tag.objects.create(name=name, organization=organization)

        tag_data = {
            "id": tag.id,
            "name": tag.name,
            "organization_id": tag.organization.id,
        }

        return JsonResponse(tag_data, status=201)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Brakujące pole: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Nieprawidłowa wartość: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Błąd typu: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_tag(request, organization_id, tag_name):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        if membership.role != "admin":
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        tag = Tag.objects.get(name=tag_name, organization__id=organization_id)
        tag.delete()

        return JsonResponse({"message": "Tag usunięty pomyślnie"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Członkostwo nie znalezione"}, status=404)
    except Tag.DoesNotExist:
        return JsonResponse({"error": "Tag nie znaleziony"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_project(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        if membership.role not in ["admin", "coordinator"]:
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        name = request.POST.get("name")
        description = request.POST.get("description", "")
        start_dte_raw = request.POST.get("start_dte")
        end_dte_raw = request.POST.get("end_dte")
        tag_name = name
        requested_coordinator_username = (
            request.POST.get("coordinator_username") or None
        )

        try:

            def parse_to_date(s):
                if "T" in s:
                    return datetime.fromisoformat(s).date()
                return datetime.strptime(s, "%Y-%m-%d").date()

            start_dte = parse_to_date(start_dte_raw)
            end_dte = parse_to_date(end_dte_raw)
        except Exception:
            return JsonResponse(
                {"error": "Nieprawidłowy format daty, oczekiwano RRRR-MM-DD lub ISO"}, status=400
            )

        if start_dte > end_dte:
            return JsonResponse(
                {"error": "start_dte musi być wcześniejsza lub równa end_dte"}, status=400
            )

        if not all([name, start_dte, end_dte, tag_name]):
            return JsonResponse({"error": "Brakujące pola"}, status=400)
        organization = Organization.objects.get(id=organization_id)

        if Tag.objects.filter(name=tag_name, organization=organization).exists():
            return JsonResponse(
                {"error": "Tag o takiej nazwie już istnieje w organizacji"},
                status=400,
            )

        tag = Tag.objects.create(name=tag_name, organization=organization)

        coordinator_membership = None

        if membership.role == "coordinator":
            coordinator_membership = membership
        elif requested_coordinator_username:
            coordinator_membership = Membership.objects.get(
                organization__id=organization_id,
                user__username=requested_coordinator_username,
            )

            if not coordinator_membership:
                return JsonResponse(
                    {"error": "Koordynator nie znaleziony w organizacji"}, status=404
                )

        if coordinator_membership and coordinator_membership.role == "member":
            return JsonResponse(
                {"error": "Wybrany użytkownik musi mieć rolę koordynatora"}, status=400
            )

        with transaction.atomic():
            project = Project.objects.create(
                title=name,
                description=description,
                start_dte=start_dte,
                end_dte=end_dte,
                organization=organization,
                tag=tag,
                coordinator=coordinator_membership.user if coordinator_membership else None,
            )

            KanbanBoard.objects.create(
                project=project,
                title=f"{project.title} Kanban Board",
                organization=organization,
            )

        if coordinator_membership:
            coordinator_membership.permissions.add(tag)

        project_data = _project_to_dict(project)

        return JsonResponse(project_data, status=201)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Członkostwo nie znalezione"}, status=404)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Brakujące pole: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Nieprawidłowa wartość: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Błąd typu: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_project(request, organization_id, project_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        if membership.role not in ["admin", "coordinator"]:
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        data = json.loads(request.body)
        name = data.get("name")
        description = data.get("description")
        start_dte_raw = data.get("start_dte")
        end_dte_raw = data.get("end_dte")
        coordinator_username = data.get("coordinator_username")

        project = Project.objects.get(id=project_id)

        if membership.role == "coordinator" and project.coordinator != membership.user:
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        try:

            def parse_to_date(s):
                if "T" in s:
                    return datetime.fromisoformat(s).date()
                return datetime.strptime(s, "%Y-%m-%d").date()

            start_dte = parse_to_date(start_dte_raw)
            end_dte = parse_to_date(end_dte_raw)
        except Exception:
            return JsonResponse(
                {"error": "Nieprawidłowy format daty, oczekiwano YYYY-MM-DD lub ISO"}, status=400
            )

        if start_dte > end_dte:
            return JsonResponse(
                {"error": "start_dte musi być wcześniejsza lub równa end_dte"}, status=400
            )

        if name:
            project.title = name

            tag = project.tag
            tag.name = name
            tag.save()

        if description:
            project.description = description
        if start_dte:
            project.start_dte = start_dte
        if end_dte:
            project.end_dte = end_dte

        if coordinator_username is not None:
            if not coordinator_username:
                project.coordinator = None
            else:
                coordinator_membership = Membership.objects.get(
                    organization__id=organization_id,
                    user__username=coordinator_username,
                )

                if not coordinator_membership:
                    return JsonResponse(
                        {"error": "Koordynator nie znaleziony w organizacji"}, status=404
                    )
                if coordinator_membership.role == "member":
                    return JsonResponse(
                        {"error": "Wybrany użytkownik musi mieć rolę koordynatora"},
                        status=400,
                    )

                project.coordinator = coordinator_membership.user
                coordinator_membership.permissions.add(project.tag)

        project.save()

        project_data = _project_to_dict(project)

        return JsonResponse(project_data, status=200)
    except Project.DoesNotExist:
        return JsonResponse({"error": "Projekt nie znaleziony"}, status=404)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Członkostwo nie znalezione"}, status=404)
    except User.DoesNotExist:
        return JsonResponse({"error": "Użytkownik koordynatora nie znaleziony"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Brakujące pole: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Nieprawidłowa wartość: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Błąd typu: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_projects(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username

        membership = Membership.objects.get(
            organization__id=organization_id,
            user__username=username,
        )

        if membership.role != "admin":
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        projects = Project.objects.filter(organization__id=organization_id)
        project_list = [_project_to_dict(project) for project in projects]

        return JsonResponse(project_list, safe=False, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Członkostwo nie znalezione"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_user_projects(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        tags = membership.permissions.all()

        projects = Project.objects.filter(
            organization__id=organization_id, tag__in=tags
        )

        project_list = [_project_to_dict(project) for project in projects]

        return JsonResponse(project_list, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_project(request, organization_id, project_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        username = request.user.username
        membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )

        project = Project.objects.get(id=project_id, organization__id=organization_id)
        
        if membership.role != "admin" and (
            membership.role != "coordinator" or project.coordinator != membership.user
        ):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        project_tag = project.tag
        project.delete()
        project_tag.delete()

        return JsonResponse({"message": "Projekt został pomyślnie usunięty"}, status=200)
    except Project.DoesNotExist:
        return JsonResponse({"error": "Projekt nie znaleziony"}, status=404)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Członkostwo nie znalezione"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def add_tag_to_user(request, organization_id, username):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        data = json.loads(request.body)
        admin_username = request.user.username
        tag_name = data.get("tag_name")

        membership = Membership.objects.get(
            organization__id=organization_id, user__username=admin_username
        )

        if membership.role == "member" or (
            membership.role == "coordinator"
            and tag_name not in membership.permissions.values_list("name", flat=True)
        ):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        member_membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )
        tag = Tag.objects.get(name=tag_name, organization__id=organization_id)
        member_membership.permissions.add(tag)
        member_membership.save()

        return JsonResponse({"message": "Tag został pomyślnie dodany do członka"}, status=200)
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Członkostwo nie znalezione"}, status=404)
    except Tag.DoesNotExist:
        return JsonResponse({"error": "Tag nie znaleziony"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Brakujące pole: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Błąd wartości: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Błąd typu: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def remove_tag_from_user(request, organization_id, username):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Użytkownik nie jest uwierzytelniony"}, status=401)

        data = json.loads(request.body)
        admin_username = request.user.username
        tag_name = data.get("tag_name")

        membership = Membership.objects.get(
            organization__id=organization_id, user__username=admin_username
        )

        if membership.role == "member" or (
            membership.role == "coordinator"
            and tag_name not in membership.permissions.values_list("name", flat=True)
        ):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        member_membership = Membership.objects.get(
            organization__id=organization_id, user__username=username
        )
        tag = Tag.objects.get(name=tag_name, organization__id=organization_id)
        member_membership.permissions.remove(tag)
        member_membership.save()

        return JsonResponse(
            {"message": "Poprawnie usunięto tag"}, status=200
        )
    except Membership.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono członkostwa"}, status=404)
    except Tag.DoesNotExist:
        return JsonResponse({"error": "Nie znaleziono taga"}, status=404)
    except KeyError as e:
        return JsonResponse({"error": f"Brakujące pole: {str(e)}"}, status=400)
    except ValueError as e:
        return JsonResponse({"error": f"Błąd wartości: {str(e)}"}, status=400)
    except TypeError as e:
        return JsonResponse({"error": f"Błąd typu: {str(e)}"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
