from django.urls import path
from .views import negotiate

urlpatterns = [
    path("negotiate/", negotiate, name="negotiate"),
]
