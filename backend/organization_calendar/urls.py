from django.urls import path
from .views import get_event_test, get_all_events_test, create_event_test, update_event_test, delete_event_test

urlpatterns = [
    path("events/<int:event_id>/", get_event_test, name="get_event"),
    path("events/", get_all_events_test, name="get_all_events"),
    path("events/create/", create_event_test, name="create_event"),
    path("events/update/<int:event_id>/", update_event_test, name="update_event"),
    path("events/delete/<int:event_id>/", delete_event_test, name="delete_event"),
]
