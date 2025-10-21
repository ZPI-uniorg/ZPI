from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from organizations.views import (
    OrganizationMemberDetailView,
    OrganizationMembersView,
    OrganizationRegistrationView,
    OrganizationViewSet,
)

from .views import LoginView, LogoutView, PasswordChangeView

router = DefaultRouter()
router.register("organizations", OrganizationViewSet, basename="organization")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/change-password/", PasswordChangeView.as_view(), name="change-password"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path(
        "organizations/register/",
        OrganizationRegistrationView.as_view(),
        name="organization-register",
    ),
]

urlpatterns += router.urls

urlpatterns += [
    path(
        "organizations/<int:organization_id>/members/",
        OrganizationMembersView.as_view(),
        name="organization-members",
    ),
    path(
        "organizations/<int:organization_id>/members/<int:member_id>/",
        OrganizationMemberDetailView.as_view(),
        name="organization-member-detail",
    ),
]
