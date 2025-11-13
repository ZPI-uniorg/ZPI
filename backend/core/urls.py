from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from organizations.views import (
    get_organizations_test, get_organization_test, create_organization_test, delete_organization_test, update_organization_test,
    get_membership_test, get_all_organization_memberships_test, create_membership_test, delete_membership_test, update_membership_test,
    get_all_organization_members_test,
    get_tag_test, get_all_tags_test, create_tag_test, delete_tag_test,
    get_project_test, get_all_projects_test, create_project_test, delete_project_test, update_project_test,
)

from .views import LoginView, LogoutView, PasswordChangeView, register_user

router = DefaultRouter()

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/change-password/", PasswordChangeView.as_view(), name="change-password"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/register/", register_user, name="register"),

]

urlpatterns += router.urls


urlpatterns += [
    path('organizations/', get_organizations_test, name='get_organizations'),
    path('organizations/<int:org_id>/', get_organization_test, name='get_organization'),
    path('organizations/create/', create_organization_test, name='create_organization'),
    path('organizations/update/<int:organization_id>/', update_organization_test, name='update_organization'),
    path('organizations/delete/<int:organization_id>/', delete_organization_test, name='delete_organization'),
    path('memberships/<int:org_id>/', get_all_organization_memberships_test, name='get_all_organization_memberships'),
    path('memberships/<int:org_id>/<int:user_id>/', get_membership_test, name='get_membership'),
    path('memberships/create/', create_membership_test, name='create_membership'),
    path('memberships/delete/<int:org_id>/<int:user_id>/', delete_membership_test, name='delete_membership'),
    path('memberships/update/<int:org_id>/<int:user_id>/', update_membership_test, name='update_membership'),
    path('organizations/<int:org_id>/members/', get_all_organization_members_test, name='get_all_organization_members'),
    path('projects/', get_all_projects_test, name='get_all_projects'),
    path('projects/<int:project_id>/', get_project_test, name='get_project'),
    path('projects/create/', create_project_test, name='create_project'),
    path('projects/update/<int:project_id>/', update_project_test, name='update_project'),
    path('projects/delete/<int:project_id>/', delete_project_test, name='delete_project'),
    path('tags/', get_all_tags_test, name='get_all_tags'),
    path('tags/<int:tag_id>/', get_tag_test, name='get_tag'),
    path('tags/create/', create_tag_test, name='create_tag'),
    path('tags/delete/<int:tag_id>/', delete_tag_test, name='delete_tag'),
]
