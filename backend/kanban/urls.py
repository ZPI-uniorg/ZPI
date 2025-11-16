from django.urls import path
from .views import (
    get_kanban_board_test,
    create_kanban_board_test,
    get_kanban_boards_test,
    update_kanban_board_test,
    delete_kanban_board_test,
    get_column_test,
    get_board_columns_test,
    create_column_test,
    update_column_test,
    delete_column_test,
    get_task_test,
    get_column_tasks_test,
    create_task_test,
    update_task_test,
    delete_task_test, get_board, get_board_with_content, add_column, update_column_position, delete_column, get_column,
    add_task, update_task, delete_task, get_task,
)

urlpatterns = [
    path('kanban/board/basic/<int:organization_id>/<int:project_id>/', get_board, name='get_kanban_board'),
    path('kanban/board/full/<int:organization_id>/<int:project_id>/', get_board_with_content, name='get_kanban_boards_with_content'),
    path('kanban/column/create/<int:organization_id>/<int:board_id>/', add_column, name='create_column'),
    path('kanban/column/move/<int:organization_id>/<int:board_id>/<int:column_id>/', update_column_position, name='update_column'),
    path('kanban/column/delete/<int:organization_id>/<int:board_id>/<int:column_id>/', delete_column, name='delete_column'),
    path('kanban/column/<int:organization_id>/<int:board_id>/<int:column_id>/', get_column, name='get_column'),
    path('kanban/task/create/<int:organization_id>/<int:board_id>/<int:column_id>/', add_task, name='create_task'),
    path('kanban/task/update/<int:organization_id>/<int:board_id>/<int:column_id>/<int:task_id>/', update_task, name='update_task'),
    path('kanban/task/delete/<int:organization_id>/<int:board_id>/<int:column_id>/<int:task_id>/', delete_task, name='delete_task'),
    path('kanban/task/<int:organization_id>/<int:board_id>/<int:column_id>/<int:task_id>/', get_task, name='get_task'),
]
