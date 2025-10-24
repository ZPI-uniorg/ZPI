from django.urls import path
from .views import (
    get_kanban_board, create_kanban_board, update_kanban_board, delete_kanban_board,
    get_column, get_board_columns, create_column, update_column, delete_column,
    get_task, get_column_tasks, create_task, update_task, delete_task,
)

urlpatterns = [
    path('boards/<int:board_id>/', get_kanban_board, name='get_kanban_board'),
    path('boards/create/', create_kanban_board, name='create_kanban_board'),
    path('boards/update/<int:board_id>/', update_kanban_board, name='update_kanban_board'),
    path('boards/delete/<int:board_id>/', delete_kanban_board, name='delete_kanban_board'),

    path('boards/<int:board_id>/columns/', get_board_columns, name='get_board_columns'),
    path('columns/<int:column_id>/', get_column, name='get_column'),
    path('columns/create/', create_column, name='create_column'),
    path('columns/update/<int:column_id>/', update_column, name='update_column'),
    path('columns/delete/<int:column_id>/', delete_column, name='delete_column'),

    path('columns/<int:column_id>/tasks/', get_column_tasks, name='get_column_tasks'),
    path('tasks/<int:task_id>/', get_task, name='get_task'),
    path('tasks/create/', create_task, name='create_task'),
    path('tasks/update/<int:task_id>/', update_task, name='update_task'),
    path('tasks/delete/<int:task_id>/', delete_task, name='delete_task'),
]