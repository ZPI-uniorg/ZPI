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
    delete_task_test, get_board, get_board_with_content,
)

urlpatterns = [
    path('kanban/board/basic/<int:organization_id>/<int:project_id>/', get_board, name='get_kanban_board_test'),
    path('kanban/board/full/<int:organization_id>/<int:project_id>/', get_board_with_content, name='get_kanban_boards_test'),


]
