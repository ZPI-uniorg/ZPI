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
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState(null);

  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);
  // Rename state
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState("");

  useEffect(() => {
    if (!initialProjectId) {
      setIndex(0);
      return;
    }
    const idx = projects.findIndex(
      (p) => String(p.id) === String(initialProjectId)
    );
    setIndex(idx >= 0 ? idx : 0);
  }, [initialProjectId, projects.length]); // tylko length, nie cała tablica

  const totalProjects = projects.length;
  const safeIndex =
    totalProjects === 0 ? 0 : Math.min(index, totalProjects - 1);
  const project = totalProjects === 0 ? null : projects[safeIndex] || null;
  const columns = Array.isArray(board?.columns) ? board.columns : [];

  // Fetch board data when project changes
  useEffect(() => {
    if (!project || !organization?.id || !user?.username) {
      setBoard(null);
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

    try {
      // Update locally for immediate feedback
      const taskToMove = { ...draggedItem };
      fromColumn.tasks = fromColumn.tasks.filter(
        (item) => item.task_id !== draggedItem.task_id
      );
      toColumn.tasks.push(taskToMove);
      setBoard({ ...board });

      setDraggedItem(null);
      setDraggedFrom(null);

      // Update task on backend - move to new column
      await updateTask(
        organization.id,
        board.board_id,
        draggedFrom, // original column
        draggedItem.task_id,
        user.username,
        { column_id: targetColumnId } // move to target column
      );

      // Refresh board to get updated state
      const data = await getBoardWithContent(
        organization.id,
        project.id,
        user.username
      );
      setBoard(data);
    } catch (err) {
      console.error("Failed to move task:", err);
      setBoardError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Nie udało się przenieść zadania"
      );
      // Refresh on error
      try {
        const data = await getBoardWithContent(
          organization.id,
          project.id,
          user.username
        );
        setBoard(data);
      } catch (refreshErr) {
        console.error("Failed to refresh board:", refreshErr);
      }
      setDraggedItem(null);
      setDraggedFrom(null);
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

    try {
      setBoardLoading(true);
      await createColumn(
        organization.id,
        board.board_id,
        user.username,
        "Nowa kolumna",
        columns.length
      );

      // Refresh board data
      const data = await getBoardWithContent(
        organization.id,
        project.id,
        user.username
      );
      setBoard(data);
    } catch (err) {
      setBoardError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Nie udało się dodać kolumny"
      );
    } finally {
      setBoardLoading(false);
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

    try {
      setBoardLoading(true);
      await updateColumn(
        organization.id,
        board.board_id,
        editingColumnId,
        user.username,
        { title: name }
      );

      // Refresh board data
      const data = await getBoardWithContent(
        organization.id,
        project.id,
        user.username
      );
      setBoard(data);

      setEditingColumnId(null);
      setEditingColumnName("");
    } catch (err) {
      setBoardError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Nie udało się zmienić nazwy kolumny"
      );
      // Reset editing state on error
      setEditingColumnId(null);
      setEditingColumnName("");
    } finally {
      setBoardLoading(false);
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

    try {
      setBoardLoading(true);
      await deleteColumn(organization.id, board.board_id, colId);

      // Refresh board data
      const data = await getBoardWithContent(
        organization.id,
        project.id,
        user.username
      );
      setBoard(data);

      if (draggedFrom === colId) {
        setDraggedFrom(null);
        setDraggedItem(null);
      }
      if (editingColumnId === colId) {
        handleRenameCancel();
      }
    } catch (err) {
      console.error("Delete column error:", err); // Debug
      setBoardError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Nie udało się usunąć kolumny"
      );
    } finally {
      setBoardLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-8 flex items-center justify-center text-slate-400">
        Ładowanie projektów…
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
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 transition"
            aria-label="Poprzedni projekt"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-slate-100 min-w-[200px] text-center">
            {project.name}
          </h1>
          <button
            onClick={next}
            className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 transition"
            aria-label="Następny projekt"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
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
        {boardLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            Ładowanie tablicy Kanban...
          </div>
        ) : !board ? (
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
