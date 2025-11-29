from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from organizations.views import (
    register_organization, get_user_organization, edit_organization, invite_member, get_organization_users,
    remove_organization_member, change_member_role, update_member_profile, edit_permissions, get_all_tags, get_tags,
    create_tag, delete_tag,
    create_project, update_project, get_projects, get_user_projects, get_user_membership,
)

from .views import login_view, logout_view, change_password_view, login_status_view

router = DefaultRouter()

urlpatterns = [
    path("auth/login/<str:organization_name>/", login_view, name="login"),
    path("auth/logout/<str:organization_name>/", logout_view, name="logout"),
    path("auth/change-password/", change_password_view, name="change-password"),
    path('auth/check-auth/', login_status_view, name='check-auth'),
]

urlpatterns += router.urls


urlpatterns += [
    path('register-organization/', register_organization, name='register_organization'),
    path('organization/<str:username>/', get_user_organization, name='get_user_organization'),
    path('membership/<int:organization_id>/',  get_user_membership, name='get_organization_membership'),
    path('organization/update/<int:organization_id>/', edit_organization, name='edit_organization'),
    path('invite-member/<int:organization_id>/', invite_member, name='invite_member'),
    path('members/<int:organization_id>/', get_organization_users, name='get_organization_users'),
    path('members/delete/<int:organization_id>/<str:username>/', remove_organization_member, name='remove_organization_member'),
    path('members/change-role/<int:organization_id>/<str:username>/', change_member_role, name='change_member_role'),
    path('members/update-profile/<int:organization_id>/<str:username>/', update_member_profile, name='update_member_profile'),
    path('members/update-permissions/<int:organization_id>/<str:username>/', edit_permissions, name='edit_permissions'),
    path('tags/all/<int:organization_id>/', get_all_tags, name='get_all_tags'),
    path('tags/my/<int:organization_id>/', get_tags, name='get_tags'),
    path('tags/create/<int:organization_id>/', create_tag, name='create_tag'),
    path('tags/delete/<int:tag_id>/', delete_tag, name='delete_tag'),
    path('project/create/<int:organization_id>/', create_project, name='create_project'),
    path('project/update/<int:organization_id>/<int:project_id>/', update_project, name='update_project'),
    path('projects/all/<int:organization_id>/', get_projects, name='get_all_projects'),
    path('projects/my/<int:organization_id>/', get_user_projects, name='get_my_projects'),
]
