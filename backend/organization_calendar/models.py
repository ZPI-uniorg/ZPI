from django.db import models

# Create your models here.
class Event(models.Model):
    event_id = models.AutoField(primary_key=True)
    description = models.TextField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    organization = models.ForeignKey(
        "organizations.Organization",
        related_name="events",
        on_delete=models.CASCADE,
    )
