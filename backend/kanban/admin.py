from django.contrib import admin

from .models import KanbanBoard, KanbanColumn, Task

# Register your models here.
admin.site.register(KanbanBoard)
admin.site.register(KanbanColumn)
admin.site.register(Task)