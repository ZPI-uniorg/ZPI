from django.contrib.auth import get_user_model, authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from organizations.models import Organization, Membership

User = get_user_model()


@require_http_methods(["POST"])
@csrf_exempt
def login_view(request, organization_name):
    try:
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        organization = Organization.objects.get(slug=organization_name)
        membership = Membership.objects.get(user=user, organization=organization)

        if membership is None:
            return JsonResponse({"status": "error", "message": "User is not a member of the organization"}, status=403)

        if user is not None:
            login(request, user)
            session_key = request.session.session_key
            refresh = RefreshToken.for_user(user)
            return JsonResponse({
                "status": "success",
                "sessionKey": session_key,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "organization": {
                    "id": organization.id,
                    "name": organization.name,
                    "description": organization.description,
                }
            }, status=200)
        else:
            return JsonResponse({"status": "error", "message": "Invalid credentials"}, status=401)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def logout_view(request, organization_name):
    try:
        if request.user.is_authenticated:
            logout(request)
            return JsonResponse({"status": "success", "message": f"User {request.user.username} logged out"}, status=200)
        else:
            return JsonResponse({"status": "error", "message": "User is not authenticated"}, status=401)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def change_password_view(request):
    try:
        if request.user.is_authenticated:
            old_password = request.POST.get("old_password")
            new_password = request.POST.get("new_password")

            if not request.user.check_password(old_password):
                return JsonResponse({"status": "error", "message": "Old password is incorrect"}, status=400)

            request.user.set_password(new_password)
            request.user.save()
            return JsonResponse({"status": "success", "message": "Password changed successfully"}, status=200)
        else:
            return JsonResponse({"status": "error", "message": "User is not authenticated"}, status=401)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@require_http_methods(["GET"])
@csrf_exempt
def login_status_view(request):
    try:
        if request.user.is_authenticated:
            return JsonResponse({"status": "success", "message": "User is authenticated", "username": request.user.username}, status=200)
        else:
            return JsonResponse({"status": "error", "message": "User is not authenticated"}, status=401)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)