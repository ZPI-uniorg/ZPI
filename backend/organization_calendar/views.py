from django.http import JsonResponse, QueryDict
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Event
from organizations.models import Organization
import json


# Create your views here.
@require_http_methods(["GET"])
@csrf_exempt
def get_event(request, event_id):
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
def get_all_events(request):
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
def create_event(request):
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
def delete_event(request, event_id):
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
def update_event(request, event_id):
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