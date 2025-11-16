from django.urls import path
from .views import(
    get_all_events, get_user_events, get_events_by_tag, create_event, delete_event, get_event, update_event
)

urlpatterns = [
    path('events/all/<int:organization_id>/', get_all_events, name='get_all_events'),
    path('events/my/<int:organization_id>/<str:username>/', get_user_events, name='get_my_events'),
    path('events/tag/<int:organization_id>/<int:tag_id>/', get_events_by_tag, name='get_events_by_tag'),
    path('events/<int:organization_id>/<int:event_id>/', get_event, name='get_event_details'),
    path('events/create/<int:organization_id>/', create_event, name='create_event'),
    path('events/delete/<int:event_id>/', delete_event, name='delete_event'),
    path('events/update/<int:event_id>/', update_event, name='update_event'),
]
