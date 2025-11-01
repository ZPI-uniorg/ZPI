from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from organizations.views import (
    get_organizations, get_organization, create_organization, delete_organization, update_organization,
    get_membership, get_all_organization_memberships, create_membership, delete_membership, update_membership,
    get_tag, get_all_tags, create_tag, delete_tag,
    get_project, get_all_projects, create_project, delete_project, update_project,
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
    path('organizations/', get_organizations, name='get_organizations'),
    path('organizations/<int:org_id>/', get_organization, name='get_organization'),
    path('organizations/create/', create_organization, name='create_organization'),
    path('organizations/update/<int:organization_id>/', update_organization, name='update_organization'),
    path('organizations/delete/<int:organization_id>/', delete_organization, name='delete_organization'),
    path('memberships/<int:org_id>/', get_all_organization_memberships, name='get_all_organization_memberships'),
    path('memberships/<int:org_id>/<int:user_id>/', get_membership, name='get_membership'),
    path('memberships/create/', create_membership, name='create_membership'),
    path('memberships/delete/<int:org_id>/<int:user_id>/', delete_membership, name='delete_membership'),
    path('memberships/update/<int:org_id>/<int:user_id>/', update_membership, name='update_membership'),
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
