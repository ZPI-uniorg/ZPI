from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Event
from organizations.models import Organization, Membership, Tag, CombinedTag
import json
from core.permissions_checker import permission_to_access


# Create your views here.
@require_http_methods(["GET"])
@csrf_exempt
def get_event_test(request, event_id):
    try:
        event = Event.objects.get(event_id=event_id)

        event_data = {
            "event_id": event.event_id,
            "name": event.name,
            "description": event.description,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "organization_id": event.organization.id,
        }

        return JsonResponse(event_data, status=200)
    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_all_events_test(request):
    try:
        events = Event.objects.all()
        events_data = []

        for event in events:
            events_data.append(
                {
                    "event_id": event.event_id,
                    "name": event.name,
                    "description": event.description,
                    "start_time": event.start_time,
                    "end_time": event.end_time,
                    "organization_id": event.organization.id,
                }
            )

        return JsonResponse(events_data, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_event_test(request):
    try:
        name = request.POST.get("name")
        description = request.POST.get("description")
        start_time = request.POST.get("start_time")
        end_time = request.POST.get("end_time")
        organization_id = request.POST.get("organization_id")

        if not all([name, description, start_time, end_time, organization_id]):
            return JsonResponse({"error": "Missing required fields"}, status=400)

        organization = Organization.objects.get(id=organization_id)

        event = Event.objects.create(
            name=name,
            description=description,
            start_time=start_time,
            end_time=end_time,
            organization=organization,
        )

        event_data = {
            "event_id": event.event_id,
            "name": event.name,
            "description": event.description,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "organization_id": event.organization.id,
        }

        return JsonResponse(event_data, status=201)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_event_test(request, event_id):
    try:
        event = Event.objects.get(event_id=event_id)
        event.delete()
        return JsonResponse({"message": "Event deleted successfully"}, status=200)
    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_event_test(request, event_id):
    try:
        event = Event.objects.get(event_id=event_id)

        data = json.loads(request.body)

        name = data.get("name")
        description = data.get("description")
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        if name:
            event.name = name
        if description:
            event.description = description
        if start_time:
            event.start_time = start_time
        if end_time:
            event.end_time = end_time

        event.save()

        event_data = {
            "event_id": event.event_id,
            "name": event.name,
            "description": event.description,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "organization_id": event.organization.id,
        }

        return JsonResponse(event_data, status=200)
    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_all_events(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        username = request.GET.get("username")
        membership = Membership.objects.get(user__username=username, organization__id=organization_id)

        if membership.role != 'admin':
            return JsonResponse({"error": "Unauthorized access"}, status=403)

        organization = Organization.objects.get(id=organization_id)
        events = Event.objects.filter(organization=organization)
        events_data = []

        for event in events:
            events_data.append(
                {
                    "event_id": event.event_id,
                    "name": event.name,
                    "description": event.description,
                    "start_time": event.start_time,
                    "end_time": event.end_time,
                    "organization_id": event.organization.id,
                    "permissions": list(event.permissions.values_list('name', flat=True))
                }
            )

        return JsonResponse(events_data, safe=False, status=200)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_user_events(request, organization_id, username):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        membership = Membership.objects.get(user__username=username, organization__id=organization_id)

        if not membership:
            return JsonResponse({"error": "Unauthorized access"}, status=403)

        organization = Organization.objects.get(id=organization_id)
        permissions = list(membership.permissions.all())

        events = []

        for event in Event.objects.filter(organization=organization):
            event_permissions = event.permissions.all()

            if permission_to_access(permissions, event_permissions):
                events.append(event)

        events_data = []
        for event in events:
            events_data.append(
                {
                    "event_id": event.event_id,
                    "name": event.name,
                    "description": event.description,
                    "start_time": event.start_time,
                    "end_time": event.end_time,
                    "organization_id": event.organization.id,
                }
            )


        return JsonResponse(events_data, safe=False, status=200)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_events_by_tag(request, organization_id, tag_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        username = request.GET.get("username")
        membership = Membership.objects.get(user__username=username, organization__id=organization_id)

        if membership.role != 'admin':
            if tag_id not in membership.permissions.values_list('id', flat=True):
                return JsonResponse({"error": "Unauthorized access"}, status=403)

        organization = Organization.objects.get(id=organization_id)
        events = []

        for event in Event.objects.filter(organization=organization):
            if event.permissions.filter(id=tag_id).exists():
                events.append(event)
            else:
                combined_tags = event.permissions.filter(combined=True)
                for combined_tag in combined_tags:
                    basic_tags = CombinedTag.objects.filter(combined_tag_id=combined_tag)
                    basic_tag_ids = [basic_tag.basic_tag_id.id for basic_tag in basic_tags]
                    if tag_id in basic_tag_ids:
                        events.append(event)
                        break

        events_data = []

        for event in events:
            events_data.append(
                {
                    "event_id": event.event_id,
                    "name": event.name,
                    "description": event.description,
                    "start_time": event.start_time,
                    "end_time": event.end_time,
                    "organization_id": event.organization.id,
                }
            )

        return JsonResponse(events_data, safe=False, status=200)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_event(request, organization_id, event_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        username = request.GET.get("username")
        membership = Membership.objects.get(user__username=username, organization__id=organization_id)

        event = Event.objects.get(event_id=event_id, organization__id=organization_id)

        if membership.role != 'admin':
            user_permissions = membership.permissions.all()
            event_permissions = event.permissions.all()

            if not permission_to_access(user_permissions, event_permissions):
                return JsonResponse({"error": "Unauthorized access"}, status=403)

        event_data = {
            "event_id": event.event_id,
            "name": event.name,
            "description": event.description,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "organization_id": event.organization.id,
            "permissions": list(event.permissions.values_list('name', flat=True))
        }

        return JsonResponse(event_data, status=200)
    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_event(request, organization_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        username = request.POST.get("username")
        membership = Membership.objects.get(user__username=username, organization__id=organization_id)

        if membership.role != 'admin':
            allowed_permissions = membership.permissions.all()
        else:
            allowed_permissions = Tag.objects.filter(organization__id=organization_id)

        name = request.POST.get("name")
        description = request.POST.get("description")
        start_time = request.POST.get("start_time")
        end_time = request.POST.get("end_time")
        organization = Organization.objects.get(id=organization_id)
        permissions_str = request.POST.get("permissions")

        permissions_str_list = permissions_str.split(',')
        permissions_names = []
        permissions_ids = []

        for permission in permissions_str_list:
            temp = permission.split('+')

            if len(temp) == 1:
                permissions_names.append(temp[0])
                permissions_ids.append(Tag.objects.filter(name=temp[0], organization__id=organization_id).first().id)
            else:
                for perm in temp:
                    permissions_names.append(perm)

                combinedTag = Tag.objects.filter(name=permission, organization__id=organization_id, combined=True).first()

                if combinedTag:
                    permissions_ids.append(combinedTag.id)
                else:
                    combinedTag = Tag.objects.create(
                        name=permission,
                        organization=organization,
                        combined=True
                    )

                    for perm in temp:
                        basicTag = Tag.objects.filter(name=perm, organization__id=organization_id).first()
                        if basicTag:
                            CombinedTag.objects.create(
                                combined_tag_id=combinedTag,
                                basic_tag_id=basicTag
                            )

                    permissions_ids.append(combinedTag.id)


        permissions = Tag.objects.filter(name__in=permissions_names)

        if not all([name, start_time, end_time]):
            return JsonResponse({"error": "Missing required fields"}, status=400)

        if start_time >= end_time:
            return JsonResponse({"error": "Invalid time range"}, status=400)

        for perm in permissions:
            if perm not in allowed_permissions:
                return JsonResponse({"error": "Unauthorized permission assignment"}, status=403)

        event = Event.objects.create(
            name=name,
            description=description,
            start_time=start_time,
            end_time=end_time,
            organization=organization,
        )

        event.permissions.set(Tag.objects.filter(id__in=permissions_ids))
        event.save()

        event_data = {
            "event_id": event.event_id,
            "name": event.name,
            "description": event.description,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "organization_id": event.organization.id,
            "permissions": list(event.permissions.values_list('name', flat=True))
        }

        return JsonResponse(event_data, status=201)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_event(request, organization_id, event_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        data = json.loads(request.body)
        username = data.get("username")
        membership = Membership.objects.get(user__username=username, organization__id=organization_id)

        event = Event.objects.get(event_id=event_id, organization__id=organization_id)

        if membership.role != 'admin':
            user_permissions = membership.permissions.all()
            event_permissions = event.permissions.all()

            if not permission_to_access(user_permissions, event_permissions):
                return JsonResponse({"error": "Unauthorized access"}, status=403)

        event.delete()
        return JsonResponse({"message": "Event deleted successfully"}, status=200)
    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_event(request, organization_id, event_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "User not authenticated"}, status=401)

        data = json.loads(request.body)
        username = data.get("username")
        membership = Membership.objects.get(user__username=username, organization__id=organization_id)
        event = Event.objects.get(event_id=event_id, organization__id=organization_id)

        if membership.role != 'admin':
            user_permissions = membership.permissions.all()
            event_permissions = event.permissions.all()

            if not permission_to_access(user_permissions, event_permissions):
                return JsonResponse({"error": "Unauthorized access"}, status=403)

        name = data.get("name")
        description = data.get("description")
        start_time = data.get("start_time")
        end_time = data.get("end_time")
        permissions_str = data.get("permissions")

        if permissions_str:
            if membership.role != 'admin':
                allowed_permissions = membership.permissions.all()
            else:
                allowed_permissions = Tag.objects.filter(organization__id=organization_id)

            permissions_str_list = permissions_str.split(',')
            permissions_names = []
            permissions_ids = []

            for permission in permissions_str_list:
                temp = permission.split('+')

                if len(temp) == 1:
                    permissions_names.append(temp[0])
                    permissions_ids.append(Tag.objects.filter(name=temp[0], organization__id=organization_id).first().id)
                else:
                    for perm in temp:
                        permissions_names.append(perm)

                    combinedTag = Tag.objects.filter(name=permission, organization__id=organization_id, combined=True).first()

                    if combinedTag:
                        permissions_ids.append(combinedTag.id)
                    else:
                        combinedTag = Tag.objects.create(
                            name=permission,
                            organization=Organization.objects.get(id=organization_id),
                            combined=True
                        )

                        for perm in temp:
                            basicTag = Tag.objects.filter(name=perm, organization__id=organization_id).first()
                            if basicTag:
                                CombinedTag.objects.create(
                                    combined_tag_id=combinedTag,
                                    basic_tag_id=basicTag
                                )

                        permissions_ids.append(combinedTag.id)

            permissions = Tag.objects.filter(name__in=permissions_names)

            for perm in permissions:
                if perm not in allowed_permissions:
                    return JsonResponse({"error": "Unauthorized permission assignment"}, status=403)

            event.permissions.set(Tag.objects.filter(id__in=permissions_ids))
        if name:
            event.name = name
        if description:
            event.description = description
        if start_time:
            event.start_time = start_time
        if end_time:
            event.end_time = end_time

        event.save()

        event_data = {
            "event_id": event.event_id,
            "name": event.name,
            "description": event.description,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "organization_id": event.organization.id,
            "permissions": list(event.permissions.values_list('name', flat=True))
        }

        return JsonResponse(event_data, status=200)
    except Event.DoesNotExist:
        return JsonResponse({"error": "Event not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)