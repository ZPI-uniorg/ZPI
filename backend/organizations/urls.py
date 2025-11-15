from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import OrganizationRegistrationView, OrganizationViewSet

router = DefaultRouter()
router.register(r"organizations", OrganizationViewSet, basename="organization")

urlpatterns = [
    path("organizations/register/", OrganizationRegistrationView.as_view(), name="organization-register"),
]

urlpatterns += router.urls
