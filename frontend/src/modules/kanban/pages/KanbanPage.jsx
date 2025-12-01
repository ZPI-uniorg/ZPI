import React, { useState, useRef, useEffect } from "react";
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
  } = useProjects();

  const [index, setIndex] = useState(0);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(true); // Start as true
  const [boardError, setBoardError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);
  // Rename state
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  // Project dropdown state
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

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

  // Fetch board data when project changes
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
  }, [project?.id, organization?.id, user?.username]);

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

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    if (
      !draggedItem ||
      !draggedFrom ||
      !board ||
      !organization?.id ||
      !user?.username ||
      !project
    )
      return;

    if (draggedFrom === targetColumnId) {
      setDraggedItem(null);
      setDraggedFrom(null);
      return;
    }

    const fromColumn = columns.find((col) => col.column_id === draggedFrom);
    const toColumn = columns.find((col) => col.column_id === targetColumnId);

    if (!fromColumn || !toColumn) return;

    // Optimistic move snapshot for rollback
    const prevBoard = board;
    const taskToMove = { ...draggedItem };
    fromColumn.tasks = fromColumn.tasks.filter(
      (item) => item.task_id !== draggedItem.task_id
    );
    toColumn.tasks.push(taskToMove);
    setBoard({ ...board });
    setDraggedItem(null);
    setDraggedFrom(null);

    try {
      await updateTask(
        organization.id,
        board.board_id,
        draggedFrom,
        draggedItem.task_id,
        user.username,
        { new_column_id: targetColumnId }
      );
      // Background refetch (do not block UI)
      getBoardWithContent(organization.id, project.id, user.username)
        .then((data) => setBoard(data))
        .catch(() => {});
    } catch (err) {
      console.error("Failed to move task:", err);
      // Rollback
      setBoard(prevBoard);
    }
  };

  const handleDragEnd = () => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
    setDraggedItem(null);
    setDraggedFrom(null);
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
          <button
            onClick={handleAddColumn}
            disabled={boardLoading || !board}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-slate-100 transition ${
              boardLoading || !board
                ? "bg-slate-700/40 cursor-not-allowed"
                : "bg-slate-700/60 hover:bg-slate-700"
            }`}
            aria-label="Dodaj kolumnę"
            title={!board ? "Ładowanie tablicy..." : "Dodaj kolumnę"}
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
            disabled={boardLoading || columns.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition ${
              boardLoading || columns.length === 0
                ? "bg-indigo-600/40 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
            aria-label="Nowe zadanie"
            title={
              columns.length === 0
                ? "Najpierw dodaj kolumnę"
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
            <button
              onClick={handleAddColumn}
              className="px-5 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-100 transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Dodaj kolumnę
            </button>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onMouseEnter={() => setIsMouseOver(true)}
            onMouseLeave={() => setIsMouseOver(false)}
            className="flex h-full gap-4 overflow-x-auto overflow-y-hidden overscroll-contain scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent p-1"
          >
            {columns.map((col) => (
              <div
                key={col.column_id}
                className="flex flex-col min-h-0 w-[calc(25%-12px)] min-w-[340px] max-w-[420px] rounded-lg bg-slate-800/60 border border-slate-700 shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.column_id)}
              >
                <div className="px-4 py-3 border-b border-slate-700 text-sm font-semibold text-slate-200 flex items-center justify-between gap-2">
                  {editingColumnId === col.column_id ? (
                    <input
                      className="flex-1 bg-slate-900/40 border border-slate-600 rounded px-2 py-1 text-slate-100 outline-none focus:border-indigo-500"
                      value={editingColumnName}
                      onChange={(e) => setEditingColumnName(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={handleRenameSave}
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{col.title}</span>
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
                <div className="flex-1 min-h-0 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {(col.tasks?.length ?? 0) === 0 && (
                    <div className="text-xs text-slate-500 italic">Pusto</div>
                  )}
                  {(col.tasks ?? []).map((item) => (
                    <div
                      key={item.task_id}
                      className={`rounded-lg bg-violet-600/90 hover:bg-violet-500 text-white px-3 py-3 text-sm cursor-pointer transition flex flex-col gap-2 shadow-sm min-h-[90px] ${
                        draggedItem?.task_id === item.task_id
                          ? "opacity-50"
                          : ""
                      }`}
                      title={item.title}
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(e, item, col.column_id)
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
