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
    delete_task_test,
)

urlpatterns = [
    path("boards/", get_kanban_boards_test, name="get_kanban_boards"),
    path("boards/<int:board_id>/", get_kanban_board_test, name="get_kanban_board"),
    path("boards/create/", create_kanban_board_test, name="create_kanban_board"),
    path(
        "boards/update/<int:board_id>/", update_kanban_board_test, name="update_kanban_board"
    ),
    path(
        "boards/delete/<int:board_id>/", delete_kanban_board_test, name="delete_kanban_board"
    ),
    path("boards/<int:board_id>/columns/", get_board_columns_test, name="get_board_columns"),
    path("columns/<int:column_id>/", get_column_test, name="get_column"),
    path("columns/create/", create_column_test, name="create_column"),
    path("columns/update/<int:column_id>/", update_column_test, name="update_column"),
    path("columns/delete/<int:column_id>/", delete_column_test, name="delete_column"),
    path("columns/<int:column_id>/tasks/", get_column_tasks_test, name="get_column_tasks"),
    path("tasks/<int:task_id>/", get_task_test, name="get_task"),
    path("tasks/create/", create_task_test, name="create_task"),
    path("tasks/update/<int:task_id>/", update_task_test, name="update_task"),
    path("tasks/delete/<int:task_id>/", delete_task_test, name="delete_task"),
]
