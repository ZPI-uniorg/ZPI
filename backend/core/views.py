from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .permissions import IsAuthenticatedAndActive
from .serializers import LoginSerializer, UserSerializer
from organizations.serializers import OrganizationSerializer

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        organization = serializer.validated_data["organization"]
        token = get_tokens_for_user(user)
        organization_data = OrganizationSerializer(organization, context={"request": request, "actor": user}).data
        return Response(
            {
                "token": token,
                "user": UserSerializer(user).data,
                "organization": organization_data,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticatedAndActive]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:  # pylint: disable=broad-exception-caught
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticatedAndActive]

    def post(self, request):
        user = request.user
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not user.check_password(current_password):
            return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


@require_http_methods(["POST"])
@csrf_exempt
def register_user(request):
    try:
        username = request.POST.get('username')
        password = request.POST.get('password')
        email = request.POST.get('email')

        if not username or not password or not email:
            return JsonResponse({"error": "Username, password, and email are required."}, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Username already exists."}, status=400)

        user = User.objects.create_user(username=username, password=password, email=email)
        user.save()

        return JsonResponse({"message": "User registered successfully."}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)