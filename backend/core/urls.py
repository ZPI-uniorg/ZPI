from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from organizations.views import (
    OrganizationMemberDetailView,
    OrganizationMembersView,
    OrganizationRegistrationView,
    OrganizationViewSet,
    get_tag, get_all_tags, create_tag, delete_tag,
    get_project, get_all_projects, create_project, delete_project, update_project,
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

urlpatterns += [
    path('projects/', get_all_projects, name='get_all_projects'),
    path('projects/<int:project_id>/', get_project, name='get_project'),
    path('projects/create/', create_project, name='create_project'),
    path('projects/update/<int:project_id>/', update_project, name='update_project'),
    path('projects/delete/<int:project_id>/', delete_project, name='delete_project'),
    path('tags/', get_all_tags, name='get_all_tags'),
    path('tags/<int:tag_id>/', get_tag, name='get_tag'),
    path('tags/create/', create_tag, name='create_tag'),
    path('tags/delete/<int:tag_id>/', delete_tag, name='delete_tag'),
]