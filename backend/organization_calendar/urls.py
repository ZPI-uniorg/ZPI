from django.urls import path
from .views import (
    get_event, get_all_events, create_event, update_event, delete_event
)

urlpatterns = [
    path('events/<int:event_id>/', get_event, name='get_event'),
    path('events/', get_all_events, name='get_all_events'),
    path('events/create/', create_event, name='create_event'),
    path('events/update/<int:event_id>/', update_event, name='update_event'),
    path('events/delete/<int:event_id>/', delete_event, name='delete_event'),
]