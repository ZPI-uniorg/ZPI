import React, { useState, useRef, useEffect } from "react";
import {
  EURO_ALNUM_PATTERN,
  sanitizeWithPolicy,
} from "../../shared/utils/sanitize.js";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";
import {
  getBoardWithContent,
  createColumn,
  deleteColumn,
  updateColumn,
  updateTask,
} from "../../../api/kanban.js";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  ChevronDown,
  Filter,
  Download,
  Search,
} from "lucide-react";

export default function KanbanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialProjectId = location.state?.projectId;
  const scrollRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const { user, organization } = useAuth();
  const {
    projects,
    projectsLoading: loading,
    projectsError: error,
    userRole,
  } = useProjects();

  const [index, setIndex] = useState(0);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(true); // Start as true
  const [boardError, setBoardError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);
  // Column drag state
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState(null);
  // Task reorder state
  const [draggedTaskPosition, setDraggedTaskPosition] = useState(null);
  const [dragOverTaskPosition, setDragOverTaskPosition] = useState(null);
  // Rename state
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  // Project dropdown state
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  // Assignee filter state
  const [assigneeFilterOpen, setAssigneeFilterOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState("all"); // "all", "unassigned", or user_id
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (projects.length === 0 || isInitialized) return;

    // Try to restore from localStorage first
    const savedProjectId = localStorage.getItem("kanban_selected_project_id");

    if (initialProjectId) {
      const idx = projects.findIndex(
        (p) => String(p.id) === String(initialProjectId)
      );
      const newIndex = idx >= 0 ? idx : 0;
      setIndex(newIndex);
      // Save to localStorage
      if (idx >= 0) {
        localStorage.setItem(
          "kanban_selected_project_id",
          String(initialProjectId)
        );
      }
    } else if (savedProjectId) {
      // Restore from localStorage on initial load
      const idx = projects.findIndex((p) => String(p.id) === savedProjectId);
      setIndex(idx >= 0 ? idx : 0);
    }

    setIsInitialized(true);
  }, [projects, initialProjectId, isInitialized]);

  const totalProjects = projects.length;
  const safeIndex =
    totalProjects === 0 ? 0 : Math.min(index, totalProjects - 1);
  const project = totalProjects === 0 ? null : projects[safeIndex] || null;
  const columns = Array.isArray(board?.columns) ? board.columns : [];

  // Check if the current user can create columns/tasks
  // Only admins and project coordinators can create
  const canCreate = React.useMemo(() => {
    if (!user || !project || !userRole) return false;

    // Admins can always create
    if (userRole === "admin") return true;

    // Project coordinator can create
    if (project.coordinator_username === user.username) return true;

    // Otherwise, cannot create (ordinary members)
    return false;
  }, [user, project, userRole]);

  // Extract unique assignees from all tasks
  const uniqueAssignees = React.useMemo(() => {
    const assignees = new Map();
    columns.forEach((col) => {
      (col.tasks ?? []).forEach((task) => {
        if (task.assigned_to && !assignees.has(task.assigned_to.id)) {
          assignees.set(task.assigned_to.id, task.assigned_to);
        }
      });
    });
    return Array.from(assignees.values());
  }, [columns]);

  // Filter columns based on selected assignee
  const filteredColumns = React.useMemo(() => {
    let result = columns;

    // Apply assignee filter
    if (selectedAssignee !== "all") {
      result = columns.map((col) => ({
        ...col,
        tasks: (col.tasks ?? []).filter((task) => {
          if (selectedAssignee === "unassigned") {
            return !task.assigned_to;
          }
          return task.assigned_to?.id === selectedAssignee;
        }),
      }));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.map((col) => ({
        ...col,
        tasks: (col.tasks ?? []).filter(
          (task) =>
            task.title?.toLowerCase().includes(query) ||
            task.description?.toLowerCase().includes(query) ||
            task.task_id?.toString().includes(query)
        ),
      }));
    }

    return result;
  }, [columns, selectedAssignee, searchQuery]);

  // Check if we need to refetch after task creation/edit
  useEffect(() => {
    if (location.state?.refetch) {
      setRefetchTrigger((prev) => prev + 1);
      // Clear the state to prevent refetch on subsequent renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.refetch, navigate, location.pathname]);

  // Fetch board data when project changes or refetch is triggered
  useEffect(() => {
    if (!project || !organization?.id || !user?.username) {
      setBoard(null);
      setBoardLoading(false);
      return;
    }

    let ignore = false;
    setBoardLoading(true);
    setBoardError(null);

    getBoardWithContent(organization.id, project.id, user.username)
      .then((data) => {
        if (ignore) return;
        setBoard(data);
      })
      .catch((err) => {
        if (ignore) return;
        setBoardError(
          err?.response?.data?.error ||
            err?.response?.data?.detail ||
            "Nie udało się pobrać tablicy Kanban"
        );
        setBoard(null);
      })
      .finally(() => {
        if (!ignore) setBoardLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [project?.id, organization?.id, user?.username, refetchTrigger]);

  const prev = () => {
    if (totalProjects === 0) return;
    setIndex((i) => (i - 1 + totalProjects) % totalProjects);
  };

  const next = () => {
    if (totalProjects === 0) return;
    setIndex((i) => (i + 1) % totalProjects);
  };

  const selectProject = (projectIndex) => {
    setIndex(projectIndex);
    setProjectDropdownOpen(false);
    // Save to localStorage
    if (projects[projectIndex]) {
      localStorage.setItem(
        "kanban_selected_project_id",
        String(projects[projectIndex].id)
      );
    }
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e) => {
      if (!isMouseOver) return;
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollContainer.scrollLeft += e.deltaY;
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [isMouseOver]);

  const handleDragStart = (e, item, columnId) => {
    setDraggedItem(item);
    setDraggedFrom(columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!draggedItem || !scrollRef.current) return;

    const container = scrollRef.current;
    const rect = container.getBoundingClientRect();
    const threshold = 150;
    const mouseX = e.clientX;

    // Anuluj poprzednią animację
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }

    const scroll = () => {
      if (!scrollRef.current) return;

      const distanceFromLeft = mouseX - rect.left;
      const distanceFromRight = rect.right - mouseX;

      if (distanceFromLeft < threshold && distanceFromLeft > 0) {
        scrollRef.current.scrollLeft -= 10;
        scrollAnimationRef.current = requestAnimationFrame(scroll);
      } else if (distanceFromRight < threshold && distanceFromRight > 0) {
        scrollRef.current.scrollLeft += 10;
        scrollAnimationRef.current = requestAnimationFrame(scroll);
      }
    };

    scroll();
  };

  const handleDragEnd = () => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
    setDraggedItem(null);
    setDraggedFrom(null);
    setDraggedColumn(null);
    setDraggedOverColumn(null);
    setDraggedTaskPosition(null);
    setDragOverTaskPosition(null);
  };

  // Column drag & drop handlers
  const handleColumnDragStart = (e, columnId) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedColumn && draggedColumn !== columnId) {
      setDraggedOverColumn(columnId);
    }
  };

  const handleColumnDrop = async (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId || !board) return;

    const draggedIdx = columns.findIndex(
      (col) => col.column_id === draggedColumn
    );
    const targetIdx = columns.findIndex(
      (col) => col.column_id === targetColumnId
    );

    if (draggedIdx === -1 || targetIdx === -1) return;

    // Reorder columns locally
    const prevBoard = { ...board };
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(draggedIdx, 1);
    newColumns.splice(targetIdx, 0, movedColumn);

    // Update positions for all affected columns
    newColumns.forEach((col, idx) => {
      col.position = idx;
    });

    setBoard({ ...board, columns: newColumns });
    handleDragEnd();

    // Update backend - send update for all columns that changed position
    try {
      const updatePromises = newColumns.map((col, idx) => {
        // Update ALL columns to ensure correct positions
        return updateColumn(
          organization.id,
          board.board_id,
          col.column_id,
          user.username,
          { position: idx }
        );
      });

      await Promise.all(updatePromises);
    } catch (err) {
      console.error("Failed to reorder column:", err);
      setBoard(prevBoard);
    }
  };

  // Task reordering within same column
  const handleTaskDragStart = (e, task, columnId, position) => {
    setDraggedItem(task);
    setDraggedFrom(columnId);
    setDraggedTaskPosition(position);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTaskDragOver = (e, columnId, position) => {
    e.preventDefault();
    if (draggedFrom === columnId && draggedTaskPosition !== position) {
      setDragOverTaskPosition(position);
    }
  };

  const handleTaskDrop = async (e, targetColumnId, targetPosition) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || !draggedFrom || !board) return;

    // Case 1: Moving to different column (existing logic)
    if (draggedFrom !== targetColumnId) {
      const fromColumn = columns.find((col) => col.column_id === draggedFrom);
      const toColumn = columns.find((col) => col.column_id === targetColumnId);

      if (!fromColumn || !toColumn) return;

      const prevBoard = board;
      const taskToMove = { ...draggedItem };
      fromColumn.tasks = fromColumn.tasks.filter(
        (item) => item.task_id !== draggedItem.task_id
      );
      toColumn.tasks.push(taskToMove);
      setBoard({ ...board });
      handleDragEnd();

      try {
        await updateTask(
          organization.id,
          board.board_id,
          draggedFrom,
          draggedItem.task_id,
          user.username,
          { new_column_id: targetColumnId }
        );
        // Don't refetch immediately - trust the optimistic update
      } catch (err) {
        console.error("Failed to move task:", err);
        setBoard(prevBoard);
      }
      return;
    }

    // Case 2: Reordering within same column
    if (draggedTaskPosition === targetPosition) {
      handleDragEnd();
      return;
    }

    const column = columns.find((col) => col.column_id === targetColumnId);
    if (!column) return;

    const prevBoard = board;
    const newTasks = [...column.tasks];
    const [movedTask] = newTasks.splice(draggedTaskPosition, 1);
    newTasks.splice(targetPosition, 0, movedTask);

    // Update positions
    newTasks.forEach((task, idx) => {
      task.position = idx;
    });

    column.tasks = newTasks;
    setBoard({ ...board });
    handleDragEnd();

    try {
      await updateTask(
        organization.id,
        board.board_id,
        targetColumnId,
        draggedItem.task_id,
        user.username,
        { position: targetPosition }
      );
      // Don't refetch immediately - trust the optimistic update
    } catch (err) {
      console.error("Failed to reorder task:", err);
      setBoard(prevBoard);
    }
  };

  // Deadline visualization helper
  const getDeadlineColor = (dueDate) => {
    if (!dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Overdue - indigo with subtle red tint
      return "from-indigo-500 to-indigo-700 border-l-4 border-red-400";
    } else if (diffDays === 0) {
      // Today - indigo with subtle orange tint
      return "from-indigo-500 to-indigo-700 border-l-4 border-orange-400";
    } else if (diffDays <= 3) {
      // 1-3 days - indigo with subtle yellow tint
      return "from-indigo-500 to-indigo-700 border-l-4 border-yellow-400";
    } else {
      // Future - default indigo gradient
      return "from-indigo-500 to-indigo-700";
    }
  };

  // Export board to CSV
  const handleExportBoard = () => {
    if (!board || !project) return;

    const rows = [
      [
        "Kolumna",
        "ID Zadania",
        "Tytuł",
        "Opis",
        "Termin",
        "Przypisany do",
        "Status",
      ],
    ];

    columns.forEach((col) => {
      (col.tasks ?? []).forEach((task) => {
        rows.push([
          col.title,
          task.task_id,
          task.title,
          task.description || "",
          task.due_date || "",
          task.assigned_to
            ? `${task.assigned_to.first_name} ${task.assigned_to.last_name}`
            : "Nieprzypisane",
          task.status === 1
            ? "To Do"
            : task.status === 2
            ? "In Progress"
            : "Done",
        ]);
      });
    });

    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${project.name}_kanban_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddColumn = async () => {
    if (!project || !board || !organization?.id || !user?.username) return;

    // Optimistic UI: add temp column immediately
    const prevBoard = board;
    const tempColumnId = `temp-${Date.now()}`;
    const newColumn = {
      column_id: tempColumnId,
      title: "Nowa kolumna",
      position: columns.length,
      tasks: [],
    };
    const nextColumns = [...columns, newColumn];
    setBoard({ ...board, columns: nextColumns });

    try {
      await createColumn(
        organization.id,
        board.board_id,
        user.username,
        "Nowa kolumna",
        columns.length
      );
      // Background refetch to get real column_id
      getBoardWithContent(organization.id, project.id, user.username)
        .then((data) => setBoard(data))
        .catch(() => {});
    } catch (err) {
      console.error("Failed to add column:", err);
      // Rollback
      setBoard(prevBoard);
    }
  };

  // Column rename/delete handlers
  const handleStartRename = (col) => {
    setEditingColumnId(col.column_id);
    setEditingColumnName(col.title || "");
  };

  const handleRenameSave = async () => {
    if (
      !project ||
      !editingColumnId ||
      !organization?.id ||
      !user?.username ||
      !board
    )
      return;
    const name = editingColumnName.trim();
    if (!name) {
      // empty -> cancel, keep old name
      setEditingColumnId(null);
      setEditingColumnName("");
      return;
    }

    const col = columns.find((c) => c.column_id === editingColumnId);
    if (!col || col.title === name) {
      setEditingColumnId(null);
      setEditingColumnName("");
      return;
    }

    // Optimistic UI: update local state immediately
    const prevBoard = board;
    const nextColumns = columns.map((c) =>
      c.column_id === editingColumnId ? { ...c, title: name } : c
    );
    setBoard({ ...board, columns: nextColumns });
    setEditingColumnId(null);
    setEditingColumnName("");

    try {
      // Fire server request in background
      await updateColumn(
        organization.id,
        board.board_id,
        editingColumnId,
        user.username,
        { title: name }
      );
      // Background refetch to reconcile
      getBoardWithContent(organization.id, project.id, user.username)
        .then((data) => setBoard(data))
        .catch(() => {});
    } catch (err) {
      console.error("Failed to rename column:", err);
      // Rollback on error
      setBoard(prevBoard);
    } finally {
      // no loading state for smooth animations
    }
  };

  const handleRenameCancel = () => {
    setEditingColumnId(null);
    setEditingColumnName("");
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  const handleDeleteColumn = async (colId) => {
    if (!project || !board || !organization?.id || !user?.username) return;

    const col = columns.find((c) => c.column_id === colId);
    if (!col) return;

    const hasItems = (col.tasks?.length ?? 0) > 0;
    if (
      hasItems &&
      !window.confirm("Usunąć kolumnę? Zadania w niej zostaną utracone.")
    ) {
      return;
    }

    if (!hasItems && !window.confirm("Usunąć tę kolumnę?")) {
      return;
    }

    console.log("User object:", user); // Debug
    console.log("User ID:", user?.id); // Debug

    // Optimistic UI: remove column locally
    const prevBoard = board;
    const nextColumns = columns.filter((c) => c.column_id !== colId);
    setBoard({ ...board, columns: nextColumns });
    if (draggedFrom === colId) {
      setDraggedFrom(null);
      setDraggedItem(null);
    }
    if (editingColumnId === colId) {
      handleRenameCancel();
    }

    try {
      await deleteColumn(organization.id, board.board_id, colId);
      // Background refetch
      getBoardWithContent(organization.id, project.id, user.username)
        .then((data) => setBoard(data))
        .catch(() => {});
    } catch (err) {
      console.error("Delete column error:", err);
      // Rollback
      setBoard(prevBoard);
    } finally {
      // no loading state for smooth animations
    }
  };

  if (loading || boardLoading) {
    return (
      <div className="h-full flex flex-col bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-4">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="h-11 w-64 rounded-lg bg-slate-700/40 animate-pulse"></div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-32 rounded-lg bg-slate-700/40 animate-pulse"></div>
            <div className="h-10 w-32 rounded-lg bg-slate-700/40 animate-pulse"></div>
            <div className="w-10 h-10 rounded-lg bg-slate-700/40 animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="flex h-full gap-4 p-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex flex-col min-h-0 w-[calc(25%-12px)] min-w-[340px] max-w-[420px] rounded-lg bg-slate-800/60 border border-slate-700 shrink-0"
              >
                <div className="px-4 py-3 border-b border-slate-700">
                  <div className="h-5 w-32 bg-slate-700/60 rounded animate-pulse"></div>
                </div>
                <div className="flex-1 p-3 space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className="h-24 rounded-lg bg-slate-700/40 animate-pulse"
                    ></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-8 flex items-center justify-center text-red-400">
        {error}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-8 flex items-center justify-center text-slate-400">
        {totalProjects === 0
          ? "Brak projektów w organizacji."
          : "Brak wybranego projektu"}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-4">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="relative">
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-100 transition border border-slate-700"
          >
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <ChevronDown
              className={`w-5 h-5 transition-transform ${
                projectDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {projectDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setProjectDropdownOpen(false)}
              ></div>
              <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
                {projects.map((proj, idx) => (
                  <button
                    key={proj.id}
                    onClick={() => selectProject(idx)}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-700/60 transition flex items-center justify-between ${
                      idx === safeIndex
                        ? "bg-slate-700/40 text-indigo-400"
                        : "text-slate-200"
                    } ${idx === 0 ? "rounded-t-lg" : ""} ${
                      idx === projects.length - 1
                        ? "rounded-b-lg"
                        : "border-b border-slate-700"
                    }`}
                  >
                    <span className="font-medium">{proj.name}</span>
                    {idx === safeIndex && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj zadań..."
              className="pl-9 pr-9 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 focus:bg-slate-700/60 text-slate-100 text-sm border border-slate-700 outline-none focus:border-indigo-500 transition w-64"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-600/50 rounded text-slate-400 hover:text-slate-200 transition"
                title="Wyczyść wyszukiwanie"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {/* Assignee Filter */}
          <div className="relative">
            <button
              onClick={() => setAssigneeFilterOpen(!assigneeFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-100 transition border border-slate-700"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">
                {selectedAssignee === "all"
                  ? "Wszystkie zadania"
                  : selectedAssignee === "unassigned"
                  ? "Nieprzypisane"
                  : uniqueAssignees.find((a) => a.id === selectedAssignee)
                  ? `${
                      uniqueAssignees.find((a) => a.id === selectedAssignee)
                        .first_name
                    } ${
                      uniqueAssignees.find((a) => a.id === selectedAssignee)
                        .last_name
                    }`
                  : "Filtruj"}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  assigneeFilterOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {assigneeFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setAssigneeFilterOpen(false)}
                ></div>
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedAssignee("all");
                      setAssigneeFilterOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-700/60 transition flex items-center justify-between rounded-t-lg ${
                      selectedAssignee === "all"
                        ? "bg-slate-700/40 text-indigo-400"
                        : "text-slate-200"
                    } border-b border-slate-700`}
                  >
                    <span className="font-medium">Wszystkie zadania</span>
                    {selectedAssignee === "all" && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAssignee("unassigned");
                      setAssigneeFilterOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-700/60 transition flex items-center justify-between ${
                      selectedAssignee === "unassigned"
                        ? "bg-slate-700/40 text-indigo-400"
                        : "text-slate-200"
                    } border-b border-slate-700`}
                  >
                    <span className="font-medium">Nieprzypisane</span>
                    {selectedAssignee === "unassigned" && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  {uniqueAssignees.map((assignee, idx) => (
                    <button
                      key={assignee.id}
                      onClick={() => {
                        setSelectedAssignee(assignee.id);
                        setAssigneeFilterOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-700/60 transition flex items-center justify-between ${
                        selectedAssignee === assignee.id
                          ? "bg-slate-700/40 text-indigo-400"
                          : "text-slate-200"
                      } ${
                        idx === uniqueAssignees.length - 1
                          ? "rounded-b-lg"
                          : "border-b border-slate-700"
                      }`}
                    >
                      <span className="font-medium">
                        {assignee.first_name} {assignee.last_name}
                      </span>
                      {selectedAssignee === assignee.id && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleExportBoard}
            disabled={boardLoading || !board}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-slate-100 transition ${
              boardLoading || !board
                ? "bg-slate-700/40 cursor-not-allowed"
                : "bg-green-700/60 hover:bg-green-700"
            }`}
            aria-label="Exportuj tablicę"
            title={!board ? "Ładowanie tablicy..." : "Exportuj do CSV"}
          >
            <Download className="w-5 h-5" />
            <span className="text-sm font-medium">Export</span>
          </button>
          <button
            onClick={handleAddColumn}
            disabled={boardLoading || !board || !canCreate}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-slate-100 transition ${
              boardLoading || !board || !canCreate
                ? "bg-slate-700/40 cursor-not-allowed opacity-50"
                : "bg-slate-700/60 hover:bg-slate-700"
            }`}
            aria-label="Dodaj kolumnę"
            title={
              !board
                ? "Ładowanie tablicy..."
                : !canCreate
                ? "Tylko admin i koordynator projektu mogą dodawać kolumny"
                : "Dodaj kolumnę"
            }
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-semibold">Dodaj kolumnę</span>
          </button>
          <button
            onClick={() =>
              navigate("/kanban/task/new", {
                state: {
                  projectId: project.id,
                  boardId: board?.board_id,
                  columnId: columns[0]?.column_id,
                },
              })
            }
            disabled={boardLoading || columns.length === 0 || !canCreate}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition ${
              boardLoading || columns.length === 0 || !canCreate
                ? "bg-indigo-600/40 cursor-not-allowed opacity-50"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
            aria-label="Nowe zadanie"
            title={
              columns.length === 0
                ? "Najpierw dodaj kolumnę"
                : !canCreate
                ? "Tylko admin i koordynator projektu mogą dodawać zadania"
                : "Dodaj nowe zadanie"
            }
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-semibold">Nowe zadanie</span>
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 transition"
            aria-label="Zamknij"
            title="Powrót do dashboardu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {boardError && (
        <div className="mx-2 mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-red-400 text-sm">
          {boardError}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {!board ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            Nie znaleziono tablicy Kanban dla tego projektu
          </div>
        ) : columns.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-300">
            <div className="text-slate-400 text-sm">
              Brak kolumn w tym kanbanie.
            </div>
            {canCreate ? (
              <button
                onClick={handleAddColumn}
                className="px-5 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-100 transition flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Dodaj kolumnę
              </button>
            ) : (
              <div className="text-slate-500 text-xs italic">
                Tylko admin i koordynator projektu mogą dodawać kolumny
              </div>
            )}
          </div>
        ) : (
          <div
            ref={scrollRef}
            onMouseEnter={() => setIsMouseOver(true)}
            onMouseLeave={() => setIsMouseOver(false)}
            className="flex h-full gap-4 overflow-x-auto overflow-y-hidden overscroll-contain scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent p-1"
          >
            {filteredColumns.map((col) => (
              <div
                key={col.column_id}
                draggable={!editingColumnId}
                onDragStart={(e) => handleColumnDragStart(e, col.column_id)}
                onDragOver={(e) => handleColumnDragOver(e, col.column_id)}
                onDrop={(e) => handleColumnDrop(e, col.column_id)}
                onDragEnd={handleDragEnd}
                className={`flex flex-col min-h-0 w-[calc(25%-12px)] min-w-[340px] max-w-[420px] rounded-lg bg-slate-800/60 border border-slate-700 shrink-0 transition-all ${
                  draggedColumn === col.column_id ? "opacity-50" : ""
                } ${
                  draggedOverColumn === col.column_id
                    ? "border-indigo-500 border-2"
                    : ""
                }`}
              >
                <div className="px-4 py-3 border-b border-slate-700 text-sm font-semibold text-slate-200 flex items-center justify-between gap-2 cursor-move">
                  {editingColumnId === col.column_id ? (
                    <div className="flex-1 relative">
                      <input
                        className="w-full bg-slate-900/40 border border-slate-600 rounded px-2 py-1 pr-12 text-slate-100 outline-none focus:border-indigo-500"
                        value={editingColumnName}
                        onChange={(e) => {
                          const cleaned = sanitizeWithPolicy(e.target.value, {
                            maxLength: 50,
                            pattern: EURO_ALNUM_PATTERN,
                          });
                          setEditingColumnName(cleaned);
                        }}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={handleRenameSave}
                        maxLength={50}
                        autoFocus
                      />
                      <div
                        className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none ${
                          editingColumnName.length >= 50
                            ? "text-red-400"
                            : editingColumnName.length >= 40
                            ? "text-yellow-400"
                            : "text-slate-400"
                        }`}
                      >
                        {editingColumnName.length}/50
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="truncate">{col.title}</span>
                      <span className="text-xs font-normal bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full">
                        {col.tasks?.length ?? 0}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        editingColumnId === col.column_id
                          ? handleRenameSave()
                          : handleStartRename(col)
                      }
                      className="p-1.5 rounded hover:bg-slate-700/50 text-slate-300"
                      title={
                        editingColumnId === col.column_id
                          ? "Zapisz nazwę"
                          : "Zmień nazwę"
                      }
                    >
                      {editingColumnId === col.column_id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Edit2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteColumn(col.column_id)}
                      className="p-1.5 rounded hover:bg-red-600/20 text-red-300"
                      title="Usuń kolumnę"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div
                  className="flex-1 min-h-0 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedItem && draggedFrom !== col.column_id) {
                      e.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    if (draggedItem && draggedFrom !== col.column_id) {
                      // Dropping task into empty space or between tasks
                      const tasksLength = col.tasks?.length ?? 0;
                      handleTaskDrop(e, col.column_id, tasksLength);
                    }
                  }}
                >
                  {(col.tasks?.length ?? 0) === 0 && (
                    <div className="w-full text-xs text-slate-500 italic py-8 rounded-lg border-2 border-dashed border-slate-700 transition-all flex flex-col items-center justify-center gap-2">
                      {canCreate ? (
                        <>
                          <button
                            onClick={() =>
                              navigate("/kanban/task/edit", {
                                state: {
                                  projectId: project.id,
                                  boardId: board.board_id,
                                  columnId: col.column_id,
                                  returnTo: "kanban",
                                },
                              })
                            }
                            className="flex items-center gap-2 hover:text-indigo-400"
                            title="Dodaj pierwsze zadanie do tej kolumny"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Dodaj zadanie</span>
                          </button>
                          <span className="text-[10px] text-slate-600">
                            lub przeciągnij tutaj
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-600">
                          Pusta kolumna
                        </span>
                      )}
                    </div>
                  )}
                  {(col.tasks ?? []).map((item, taskIndex) => {
                    const deadlineColor = getDeadlineColor(item.due_date);
                    return (
                      <div
                        key={item.task_id}
                        className={`rounded-lg bg-gradient-to-br ${
                          deadlineColor || "from-indigo-500 to-indigo-700"
                        } hover:brightness-110 text-white px-3 py-3 text-sm cursor-pointer transition-all duration-200 flex flex-col gap-2 shadow-md hover:shadow-lg min-h-[90px] ${
                          draggedItem?.task_id === item.task_id
                            ? "opacity-50"
                            : ""
                        } ${
                          dragOverTaskPosition === taskIndex &&
                          draggedFrom === col.column_id
                            ? "border-2 border-white"
                            : ""
                        }`}
                        title={item.title}
                        draggable
                        onDragStart={(e) =>
                          handleTaskDragStart(e, item, col.column_id, taskIndex)
                        }
                        onDragOver={(e) =>
                          handleTaskDragOver(e, col.column_id, taskIndex)
                        }
                        onDrop={(e) =>
                          handleTaskDrop(e, col.column_id, taskIndex)
                        }
                        onDragEnd={handleDragEnd}
                        onClick={() =>
                          navigate("/kanban/task/edit", {
                            state: {
                              task: item,
                              projectId: project.id,
                              boardId: board.board_id,
                              columnId: col.column_id,
                              returnTo: "kanban",
                            },
                          })
                        }
                      >
                        <div className="flex items-center justify-between gap-2 shrink-0">
                          <span className="text-xs font-mono text-white/95 font-semibold">
                            #{item.task_id}
                          </span>
                        </div>
                        <div
                          className="font-medium text-sm leading-tight flex-1 overflow-hidden"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {item.title}
                        </div>
                        {item.due_date && (
                          <div className="text-xs text-white/80 flex items-center gap-1">
                            <span>📅</span>
                            <span>
                              {new Date(item.due_date).toLocaleDateString(
                                "pl-PL",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        )}
                        {item.assigned_to ? (
                          <div className="flex items-center gap-2 mt-auto">
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                              {item.assigned_to.first_name?.[0] || "?"}
                              {item.assigned_to.last_name?.[0] || "?"}
                            </div>
                            <span className="text-xs text-white/90 truncate">
                              {item.assigned_to.first_name}{" "}
                              {item.assigned_to.last_name}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-white/60 italic mt-auto">
                            Nieprzypisane
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(col.tasks?.length ?? 0) > 0 && canCreate && (
                    <button
                      onClick={() =>
                        navigate("/kanban/task/edit", {
                          state: {
                            projectId: project.id,
                            boardId: board.board_id,
                            columnId: col.column_id,
                            returnTo: "kanban",
                          },
                        })
                      }
                      className="w-full text-xs text-slate-400 hover:text-indigo-300 py-3 rounded-lg border border-dashed border-slate-700 hover:border-indigo-600/50 hover:bg-indigo-600/5 transition-all flex items-center justify-center gap-2"
                      title="Dodaj kolejne zadanie"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Dodaj zadanie</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
