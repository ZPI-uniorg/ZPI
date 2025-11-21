import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";
import { KANBAN_BOARDS } from "../../../api/fakeData.js";
import { ChevronLeft, ChevronRight, X, Plus, Edit2, Trash2, Check } from "lucide-react";

export default function KanbanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialProjectId = location.state?.projectId;
  const scrollRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const { user, organization } = useAuth();
  const { projects, projectsLoading: loading, projectsError: error } = useProjects();

  const [index, setIndex] = useState(0);
  const [updateCounter, setUpdateCounter] = useState(0);

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
  const safeIndex = totalProjects === 0 ? 0 : Math.min(index, totalProjects - 1);
  const project = totalProjects === 0 ? null : projects[safeIndex] || null;
  const board = project ? KANBAN_BOARDS[project.id] : null;
  const columns = Array.isArray(board?.columns) ? board.columns : [];

  // Ensure a board exists for the selected project so user can add first column
  useEffect(() => {
    if (project && !KANBAN_BOARDS[project.id]) {
      KANBAN_BOARDS[project.id] = { columns: [] };
      setUpdateCounter((c) => c + 1);
    }
  }, [project?.id]);

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

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isMouseOver]);

  const handleDragStart = (e, item, columnId) => {
    setDraggedItem(item);
    setDraggedFrom(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

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

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedItem || !draggedFrom || !board) return;

    if (draggedFrom === targetColumnId) {
      setDraggedItem(null);
      setDraggedFrom(null);
      return;
    }

    const fromColumn = board.columns.find(col => col.id === draggedFrom);
    const toColumn = board.columns.find(col => col.id === targetColumnId);

    if (!fromColumn || !toColumn) return;

    // Usuń z kolumny źródłowej
    fromColumn.items = fromColumn.items.filter(item => item.id !== draggedItem.id);
    // Dodaj do kolumny docelowej
    toColumn.items.push(draggedItem);

    setDraggedItem(null);
    setDraggedFrom(null);
  };

  const handleDragEnd = () => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
    setDraggedItem(null);
    setDraggedFrom(null);
  };

  const handleAddColumn = () => {
    if (!project) return;
    const b = KANBAN_BOARDS[project.id] || (KANBAN_BOARDS[project.id] = { columns: [] });
    if (!Array.isArray(b.columns)) b.columns = [];
    b.columns.push({
      id: `col-${Date.now()}`,
      name: "Nowa kolumna",
      items: [],
    });
    setUpdateCounter((c) => c + 1);
  };

  // Column rename/delete handlers
  const handleStartRename = (col) => {
    setEditingColumnId(col.id);
    setEditingColumnName(col.name || "");
  };

  const handleRenameSave = () => {
    if (!project || !editingColumnId) return;
    const b = KANBAN_BOARDS[project.id];
    if (!b || !Array.isArray(b.columns)) return;
    const name = editingColumnName.trim();
    if (!name) {
      // empty -> cancel, keep old name
      setEditingColumnId(null);
      setEditingColumnName("");
      return;
    }
    const col = b.columns.find((c) => c.id === editingColumnId);
    if (!col) return;
    if (col.name !== name) {
      col.name = name;
      setUpdateCounter((c) => c + 1);
    }
    setEditingColumnId(null);
    setEditingColumnName("");
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

  const handleDeleteColumn = (colId) => {
    if (!project) return;
    const b = KANBAN_BOARDS[project.id];
    if (!b || !Array.isArray(b.columns)) return;
    const col = b.columns.find((c) => c.id === colId);
    if (!col) return;
    const hasItems = (col.items?.length ?? 0) > 0;
    if (!hasItems || window.confirm("Usunąć kolumnę? Zadania w niej zostaną utracone.")) {
      b.columns = b.columns.filter((c) => c.id !== colId);
      if (draggedFrom === colId) {
        setDraggedFrom(null);
        setDraggedItem(null);
      }
      if (editingColumnId === colId) {
        handleRenameCancel();
      }
      setUpdateCounter((c) => c + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-8 flex items-center justify-center text-slate-400">
        Ładowanie projektów…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-8 flex items-center justify-center text-red-400">
        {error}
      </div>
    );
  }

  // Only block when there is no project; allow rendering even if board was missing
  if (!project) {
    return (
      <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-8 flex items-center justify-center text-slate-400">
        {totalProjects === 0 ? "Brak projektów w organizacji." : "Brak danych kanbana"}
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-100 transition"
            aria-label="Dodaj kolumnę"
            title="Dodaj kolumnę"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-semibold">Dodaj kolumnę</span>
          </button>
          <button
            onClick={() => navigate("/kanban/task/new", { state: { projectId: project.id, columnId: columns[0]?.id } })}
            disabled={columns.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition ${columns.length === 0 ? 'bg-indigo-600/40 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
            aria-label="Nowe zadanie"
            title={columns.length === 0 ? "Najpierw dodaj kolumnę" : "Dodaj nowe zadanie"}
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

      <div className="flex-1 min-h-0 overflow-hidden">
        {columns.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-300">
            <div className="text-slate-400 text-sm">Brak kolumn w tym kanbanie.</div>
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
            {columns.map(col => (
              <div
                key={col.id}
                className="flex flex-col min-h-0 w-[calc(25%-12px)] min-w-[340px] max-w-[420px] rounded-lg bg-slate-800/60 border border-slate-700 shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="px-4 py-3 border-b border-slate-700 text-sm font-semibold text-slate-200 flex items-center justify-between gap-2">
                  {editingColumnId === col.id ? (
                    <input
                      className="flex-1 bg-slate-900/40 border border-slate-600 rounded px-2 py-1 text-slate-100 outline-none focus:border-indigo-500"
                      value={editingColumnName}
                      onChange={(e) => setEditingColumnName(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={handleRenameSave}
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{col.name}</span>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => (editingColumnId === col.id ? handleRenameSave() : handleStartRename(col))}
                      className="p-1.5 rounded hover:bg-slate-700/50 text-slate-300"
                      title={editingColumnId === col.id ? "Zapisz nazwę" : "Zmień nazwę"}
                    >
                      {editingColumnId === col.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Edit2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteColumn(col.id)}
                      className="p-1.5 rounded hover:bg-red-600/20 text-red-300"
                      title="Usuń kolumnę"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div
                  className="flex-1 min-h-0 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                >
                  {((col.items?.length ?? 0) === 0) && (
                    <div className="text-xs text-slate-500 italic">Pusto</div>
                  )}
                  {(col.items ?? []).map(item => (
                    <div
                      key={item.id}
                      className={`rounded-lg bg-violet-600/90 hover:bg-violet-500 text-white px-3 py-3 text-sm cursor-pointer transition flex flex-col gap-2 shadow-sm min-h-[90px] ${
                        draggedItem?.id === item.id ? 'opacity-50' : ''
                      }`}
                      title={item.title}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item, col.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate('/kanban/task/edit', {
                        state: {
                          task: item,
                          projectId: project.id,
                          columnId: col.id,
                          returnTo: 'kanban'
                        }
                      })}
                    >
                      <div className="flex items-center justify-between gap-2 shrink-0">
                        <span className="text-xs font-mono text-white/95 font-semibold">{item.taskId}</span>
                      </div>
                      <div
                        className="font-medium text-sm leading-tight flex-1 overflow-hidden"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {item.title}
                      </div>
                      {item.assignee ? (
                        <div className="flex items-center gap-2 mt-auto">
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                            {item.assignee.first_name[0]}{item.assignee.last_name[0]}
                          </div>
                          <span className="text-xs text-white/90 truncate">
                            {item.assignee.first_name} {item.assignee.last_name}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-white/60 italic mt-auto">Nieprzypisane</div>
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
