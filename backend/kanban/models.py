from django.db import models

# Create your models here.
class KanbanBoard(models.Model):
    board_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    organization = models.ForeignKey(
        "organizations.Organization",
        related_name="kanban_boards",
        on_delete=models.CASCADE,
    )

    def __str__(self):
        return self.title


class KanbanColumn(models.Model):
    column_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    board = models.ForeignKey(
        KanbanBoard,
        related_name="columns",
        on_delete=models.CASCADE,
    )
    position = models.IntegerField()

    def __str__(self):
        return self.title


class Task(models.Model):
    class Status(models.IntegerChoices):
        TODO = 1, "To Do"
        IN_PROGRESS = 2, "In Progress"
        DONE = 3, "Done"

    task_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    column = models.ForeignKey(
        KanbanColumn,
        related_name="tasks",
        on_delete=models.CASCADE,
    )
    position = models.IntegerField()
    due_date = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        "core.User",
        related_name="tasks",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    status = models.IntegerField(choices=Status.choices, default=Status.TODO)

    def __str__(self):
        return self.title