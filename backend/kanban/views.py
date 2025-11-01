from django.http import JsonResponse, QueryDict
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import KanbanBoard, KanbanColumn, Task
from organizations.models import Organization


# Create your views here.
@require_http_methods(["GET"])
@csrf_exempt
def get_kanban_board(request, board_id):
    try:
        board = KanbanBoard.objects.get(board_id=board_id)

        board_data = {
            "board_id": board.board_id,
            "title": board.title,
            "organization_id": board.organization.id,
        }

        return JsonResponse(board_data, status=200)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Kanban Board not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_kanban_board(request):
    try:
        title = request.POST.get("title")
        organization_id = request.POST.get("organization_id")

        if not all([title, organization_id]):
            return JsonResponse({"error": "Missing required fields"}, status=400)

        organization = Organization.objects.get(id=organization_id)

        kanban_board = KanbanBoard.objects.create(
            title=title,
            organization=organization,
        )

        kanban_board_data = {
            "board_id": kanban_board.board_id,
            "title": kanban_board.title,
            "organization_id": kanban_board.organization.id,
        }

        return JsonResponse(kanban_board_data, status=201)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)



@require_http_methods(["DELETE"])
@csrf_exempt
def delete_kanban_board(request, board_id):
    try:
        board = KanbanBoard.objects.get(board_id=board_id)
        board.delete()
        return JsonResponse({"message": "Kanban Board deleted successfully"}, status=200)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Kanban Board not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_kanban_board(request, board_id):
    try:
        board = KanbanBoard.objects.get(board_id=board_id)

        data = QueryDict(request.body)

        title = data.get("title")


        if title:
            board.title = title
            board.save()

        board_data = {
            "board_id": board.board_id,
            "title": board.title,
            "organization_id": board.organization.id,
        }

        return JsonResponse(board_data, status=200)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Kanban Board not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_column(request, column_id):
    try:
        column = KanbanColumn.objects.get(column_id=column_id)

        column_data = {
            "column_id": column.column_id,
            "title": column.title,
            "board_id": column.board.board_id,
            "position": column.position,
        }

        return JsonResponse(column_data, status=200)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kanban Column not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_board_columns(request, board_id):
    try:
        board = KanbanBoard.objects.get(board_id=board_id)
        columns = columns = KanbanColumn.objects.filter(board_id=board.board_id)

        columns_data = [
            {
                "column_id": column.column_id,
                "title": column.title,
                "board_id": column.board.board_id,
                "position": column.position,
            }
            for column in columns
        ]

        return JsonResponse({"columns": columns_data}, status=200)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Kanban Board not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_column(request):
    try:
        title = request.POST.get("title")
        board_id = request.POST.get("board_id")
        position = request.POST.get("position")

        if not all([title, board_id, position]):
            return JsonResponse({"error": "Missing required fields"}, status=400)

        board = KanbanBoard.objects.get(board_id=board_id)

        kanban_column = KanbanColumn.objects.create(
            title=title,
            board=board,
            position=position,
        )

        kanban_column_data = {
            "column_id": kanban_column.column_id,
            "title": kanban_column.title,
            "board_id": kanban_column.board.board_id,
            "position": kanban_column.position,
        }

        return JsonResponse(kanban_column_data, status=201)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Kanban Board not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_column(request, column_id):
    try:
        column = KanbanColumn.objects.get(column_id=column_id)
        column.delete()
        return JsonResponse({"message": "Kanban Column deleted successfully"}, status=200)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kanban Column not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_column(request, column_id):
    try:
        column = KanbanColumn.objects.get(column_id=column_id)

        data = QueryDict(request.body)

        title = data.get("title")
        position = data.get("position")


        if title:
            column.title = title
        if position:
            column.position = position
        column.save()

        column_data = {
            "column_id": column.column_id,
            "title": column.title,
            "board_id": column.board.board_id,
            "position": column.position,
        }

        return JsonResponse(column_data, status=200)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kanban Column not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_task(request, task_id):
    try:
        task = Task.objects.get(task_id=task_id)

        task_data = {
            "task_id": task.task_id,
            "title": task.title,
            "description": task.description,
            "column_id": task.column.column_id,
            "position": task.position,
            "due_date": task.due_date,
            "assigned_to_id": task.assigned_to.id if task.assigned_to else None,
            "status": task.status,
        }

        return JsonResponse(task_data, status=200)
    except Task.DoesNotExist:
        return JsonResponse({"error": "Task not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_column_tasks(request, column_id):
    try:
        column = KanbanColumn.objects.get(column_id=column_id)
        tasks = Task.objects.filter(column_id=column.column_id)

        tasks_data = [
            {
                "task_id": task.task_id,
                "title": task.title,
                "description": task.description,
                "column_id": task.column.column_id,
                "position": task.position,
                "due_date": task.due_date,
                "assigned_to_id": task.assigned_to.id if task.assigned_to else None,
                "status": task.status,
            }
            for task in tasks
        ]

        return JsonResponse({"tasks": tasks_data}, status=200)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kanban Column not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def create_task(request):
    try:
        title = request.POST.get("title")
        description = request.POST.get("description")
        column_id = request.POST.get("column_id")
        position = request.POST.get("position")
        due_date = request.POST.get("due_date")
        assigned_to_id = request.POST.get("assigned_to_id")
        status = request.POST.get("status")

        if not all([title, column_id, position, status]):
            return JsonResponse({"error": "Missing required fields"}, status=400)

        column = KanbanColumn.objects.get(column_id=column_id)

        task = Task.objects.create(
            title=title,
            description=description or "",
            column=column,
            position=position,
            due_date=due_date,
            assigned_to_id=assigned_to_id,
            status=status,
        )

        task_data = {
            "task_id": task.task_id,
            "title": task.title,
            "description": task.description,
            "column_id": task.column.column_id,
            "position": task.position,
            "due_date": task.due_date,
            "assigned_to_id": task.assigned_to.id if task.assigned_to else None,
            "status": task.status,
        }

        return JsonResponse(task_data, status=201)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kanban Column not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_task(request, task_id):
    try:
        task = Task.objects.get(task_id=task_id)
        task.delete()
        return JsonResponse({"message": "Task deleted successfully"}, status=200)
    except Task.DoesNotExist:
        return JsonResponse({"error": "Task not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_task(request, task_id):
    try:
        task = Task.objects.get(task_id=task_id)

        data = QueryDict(request.body)

        title = data.get("title")
        description = data.get("description")
        position = data.get("position")
        due_date = data.get("due_date")
        assigned_to_id = data.get("assigned_to_id")
        status = data.get("status")

        if title:
            task.title = title
        if description:
            task.description = description
        if position:
            task.position = position
        if due_date:
            task.due_date = due_date
        if assigned_to_id:
            task.assigned_to_id = assigned_to_id
        if status:
            task.status = status
        task.save()

        task_data = {
            "task_id": task.task_id,
            "title": task.title,
            "description": task.description,
            "column_id": task.column.column_id,
            "position": task.position,
            "due_date": task.due_date,
            "assigned_to_id": task.assigned_to.id if task.assigned_to else None,
            "status": task.status,
        }

        return JsonResponse(task_data, status=200)
    except Task.DoesNotExist:
        return JsonResponse({"error": "Task not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)