from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import KanbanBoard, KanbanColumn, Task
from organizations.models import Organization, Membership, Project
import json


@require_http_methods(["GET"])
@csrf_exempt
def get_board(request, organization_id, project_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse(
                {"error": "Użytkownik nie jest uwierzytelniony"}, status=401
            )

        username = request.user.username
        membership = Membership.objects.get(
            user__username=username, organization__id=organization_id
        )

        project = Project.objects.get(id=project_id)

        if (
            membership.role != "admin"
            and project.tag not in membership.permissions.all()
        ):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        organization = Organization.objects.get(id=organization_id)
        kanban_board = KanbanBoard.objects.get(
            organization=organization, project=project
        )
        board_data = {
            "board_id": kanban_board.board_id,
            "title": kanban_board.title,
            "organization_id": kanban_board.organization.id,
            "project_id": kanban_board.project.id,
        }

        return JsonResponse(board_data, status=200)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except Project.DoesNotExist:
        return JsonResponse({"error": "Projekt nie znaleziony"}, status=404)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Tablica Kanban nie znaleziona"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_board_with_content(request, organization_id, project_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse(
                {"error": "Użytkownik nie jest uwierzytelniony"}, status=401
            )

        username = request.user.username
        membership = Membership.objects.get(
            user__username=username, organization__id=organization_id
        )

        project = Project.objects.get(id=project_id)

        if (
            membership.role != "admin"
            and project.tag not in membership.permissions.all()
        ):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        organization = Organization.objects.get(id=organization_id)
        kanban_board = KanbanBoard.objects.get(
            organization=organization, project=project
        )

        columns = KanbanColumn.objects.filter(board=kanban_board)
        columns_data = []
        for column in columns:
            tasks = Task.objects.filter(column=column)
            tasks_data = []
            for task in tasks:
                assigned_payload = None
                if task.assigned_to:
                    assigned_payload = {
                        "id": task.assigned_to.id,
                        "username": task.assigned_to.username,
                        "first_name": task.assigned_to.first_name,
                        "last_name": task.assigned_to.last_name,
                        "email": task.assigned_to.email,
                    }
                tasks_data.append(
                    {
                        "task_id": task.task_id,
                        "title": task.title,
                        "description": task.description,
                        "position": task.position,
                        "due_date": task.due_date,
                        "assigned_to_id": task.assigned_to.id
                        if task.assigned_to
                        else None,
                        "assigned_to": assigned_payload,
                        "status": task.status,
                    }
                )
            columns_data.append(
                {
                    "column_id": column.column_id,
                    "title": column.title,
                    "position": column.position,
                    "tasks": tasks_data,
                }
            )

        board_data = {
            "board_id": kanban_board.board_id,
            "title": kanban_board.title,
            "organization_id": kanban_board.organization.id,
            "project_id": kanban_board.project.id,
            "columns": columns_data,
        }

        return JsonResponse(board_data, status=200)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except Project.DoesNotExist:
        return JsonResponse({"error": "Projekt nie znaleziony"}, status=404)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Tablica Kanban nie znaleziona"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def add_column(request, organization_id, board_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse(
                {"error": "Użytkownik nie jest uwierzytelniony"}, status=401
            )

        username = request.user.username
        membership = Membership.objects.get(
            user__username=username, organization__id=organization_id
        )
        organization = Organization.objects.get(id=organization_id)
        board = KanbanBoard.objects.get(board_id=board_id, organization=organization)

        is_admin = membership.role == "admin"
        is_coordinator = (
            board.project.coordinator and board.project.coordinator.username == username
        )

        if not (is_admin or is_coordinator):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        title = request.POST.get("title")
        position = request.POST.get("position")

        if not title:
            return JsonResponse({"error": "Tytuł nie znaleziony"}, status=404)
        if not position:
            position = 0

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
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Tablica Kanban nie znaleziona"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_column_position(request, organization_id, board_id, column_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse(
                {"error": "Użytkownik nie jest uwierzytelniony"}, status=401
            )

        data = json.loads(request.body)
        position = data.get("position")
        title = data.get("title")
        username = request.user.username

        membership = Membership.objects.get(
            user__username=username, organization__id=organization_id
        )
        organization = Organization.objects.get(id=organization_id)
        board = KanbanBoard.objects.get(board_id=board_id, organization=organization)

        is_admin = membership.role == "admin"
        is_coordinator = (
            board.project.coordinator and board.project.coordinator.username == username
        )

        if not (is_admin or is_coordinator):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        column = KanbanColumn.objects.get(column_id=column_id, board=board)

        # Allow updating title without requiring position.
        if position is None and title is None:
            return JsonResponse({"error": "Brak pól do aktualizacji"}, status=400)

        if position is not None:
            column.position = position
        if title:
            column.title = title
        column.save()

        column_data = {
            "column_id": column.column_id,
            "title": column.title,
            "board_id": column.board.board_id,
            "position": column.position,
        }

        return JsonResponse(column_data, status=200)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Tablica Kanban nie znaleziona"}, status=404)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kolumna Kanban nie znaleziona"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_column(request, organization_id, board_id, column_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse(
                {"error": "Użytkownik nie jest uwierzytelniony"}, status=401
            )

        username = request.user.username
        membership = Membership.objects.get(
            user__username=username, organization__id=organization_id
        )
        organization = Organization.objects.get(id=organization_id)
        board = KanbanBoard.objects.get(board_id=board_id, organization=organization)

        is_admin = membership.role == "admin"
        is_coordinator = (
            board.project.coordinator and board.project.coordinator.username == username
        )

        if not (is_admin or is_coordinator):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        column = KanbanColumn.objects.get(column_id=column_id, board=board)

        column.delete()

        return JsonResponse(
            {"message": "Kolumna Kanban została pomyślnie usunięta"}, status=200
        )
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Tablica Kanban nie znaleziona"}, status=404)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kolumna Kanban nie znaleziona"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_column(request, organization_id, board_id, column_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse(
                {"error": "Użytkownik nie jest uwierzytelniony"}, status=401
            )

        username = request.user.username
        membership = Membership.objects.get(
            user__username=username, organization__id=organization_id
        )
        organization = Organization.objects.get(id=organization_id)
        board = KanbanBoard.objects.get(board_id=board_id, organization=organization)

        if (
            membership.role != "admin"
            and board.project.tag not in membership.permissions
        ):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        column = KanbanColumn.objects.get(column_id=column_id, board=board)

        column_data = {
            "column_id": column.column_id,
            "title": column.title,
            "board_id": column.board.board_id,
            "position": column.position,
        }

        return JsonResponse(column_data, status=200)
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Tablica Kanban nie znaleziona"}, status=404)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kolumna Kanban nie znaleziona"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def add_task(request, organization_id, board_id, column_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse(
                {"error": "Użytkownik nie jest uwierzytelniony"}, status=401
            )

        username = request.user.username
        membership = Membership.objects.get(
            user__username=username, organization__id=organization_id
        )
        organization = Organization.objects.get(id=organization_id)
        board = KanbanBoard.objects.get(board_id=board_id, organization=organization)

        is_admin = membership.role == "admin"
        is_coordinator = (
            board.project.coordinator and board.project.coordinator.username == username
        )
        has_project_permission = board.project.tag in membership.permissions.all()

        if not (is_admin or is_coordinator or has_project_permission):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        column = KanbanColumn.objects.get(column_id=column_id, board=board)

        title = request.POST.get("title")
        description = request.POST.get("description")
        position = request.POST.get("position")
        due_date = request.POST.get("due_date")
        assigned_to_id = request.POST.get("assigned_to_id")
        status = request.POST.get("status")

        if not title:
            return JsonResponse({"error": "Tytuł nie znaleziony"}, status=404)
        if not position:
            position = 0
        if not status:
            status = Task.Status.TODO

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
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Tablica Kanban nie znaleziona"}, status=404)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kolumna Kanban nie znaleziona"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
@csrf_exempt
def update_task(request, organization_id, board_id, column_id, task_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse(
                {"error": "Użytkownik nie jest uwierzytelniony"}, status=401
            )

        data = json.loads(request.body)
        username = request.user.username

        membership = Membership.objects.get(
            user__username=username, organization__id=organization_id
        )
        organization = Organization.objects.get(id=organization_id)
        board = KanbanBoard.objects.get(board_id=board_id, organization=organization)

        if (
            membership.role != "admin"
            and board.project.tag not in membership.permissions
        ):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        column = KanbanColumn.objects.get(column_id=column_id, board=board)
        task = Task.objects.get(task_id=task_id, column=column)

        title = data.get("title")
        description = data.get("description")
        position = data.get("position")
        due_date = data.get("due_date")
        assigned_to_id = data.get("assigned_to_id")
        status = data.get("status")
        # Support moving task to a different column: prefer "new_column_id" but allow "column_id" in body.
        new_column_id = data.get("new_column_id") or data.get("column_id")

        if new_column_id and str(new_column_id) != str(column.column_id):
            # Validate target column belongs to same board.
            new_column = KanbanColumn.objects.get(column_id=new_column_id, board=board)
            # If no explicit position provided, append to end of target column.
            if position is None:
                position = Task.objects.filter(column=new_column).count()
            task.column = new_column

        if title:
            task.title = title
        if description:
            task.description = description
        if position is not None:  # Allow position == 0
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
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Tablica Kanban nie znaleziona"}, status=404)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kolumna Kanban nie znaleziona"}, status=404)
    except Task.DoesNotExist:
        return JsonResponse({"error": "Zadanie nie znalezione"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_task(request, organization_id, board_id, column_id, task_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse(
                {"error": "Użytkownik nie jest uwierzytelniony"}, status=401
            )

        username = request.user.username
        membership = Membership.objects.get(
            user__username=username, organization__id=organization_id
        )
        organization = Organization.objects.get(id=organization_id)
        board = KanbanBoard.objects.get(board_id=board_id, organization=organization)

        # Check if user is admin or coordinator of this project
        is_admin = membership.role == "admin"
        is_coordinator = (
            board.project.coordinator and board.project.coordinator.username == username
        )

        if not (is_admin or is_coordinator):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        column = KanbanColumn.objects.get(column_id=column_id, board=board)
        task = Task.objects.get(task_id=task_id, column=column)

        task.delete()

        return JsonResponse(
            {"message": "Zadanie zostało pomyślnie usunięte"}, status=200
        )
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Tablica Kanban nie znaleziona"}, status=404)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kolumna Kanban nie znaleziona"}, status=404)
    except Task.DoesNotExist:
        return JsonResponse({"error": "Zadanie nie znalezione"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
@csrf_exempt
def get_task(request, organization_id, board_id, column_id, task_id):
    try:
        if not request.user.is_authenticated:
            return JsonResponse(
                {"error": "Użytkownik nie jest uwierzytelniony"}, status=401
            )

        username = request.user.username
        membership = Membership.objects.get(
            user__username=username, organization__id=organization_id
        )
        organization = Organization.objects.get(id=organization_id)
        board = KanbanBoard.objects.get(board_id=board_id, organization=organization)

        if (
            membership.role != "admin"
            and board.project.tag not in membership.permissions
        ):
            return JsonResponse({"error": "Brak uprawnień"}, status=403)

        column = KanbanColumn.objects.get(column_id=column_id, board=board)
        task = Task.objects.get(task_id=task_id, column=column)

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
    except Organization.DoesNotExist:
        return JsonResponse({"error": "Organizacja nie znaleziona"}, status=404)
    except KanbanBoard.DoesNotExist:
        return JsonResponse({"error": "Tablica Kanban nie znaleziona"}, status=404)
    except KanbanColumn.DoesNotExist:
        return JsonResponse({"error": "Kolumna Kanban nie znaleziona"}, status=404)
    except Task.DoesNotExist:
        return JsonResponse({"error": "Zadanie nie znalezione"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
