import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { getAllProjects, getUserProjects } from "../../../api/projects.js";
import { KANBAN_BOARDS } from "../../../api/fakeData.js";
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react";

export default function KanbanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialProjectId = location.state?.projectId;
  const scrollRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const { user, organization } = useAuth();

  const [projects, setProjects] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);

  useEffect(() => {
    if (!organization?.id || !user?.username) {
      setProjects([]);
      return;
    }

    async function loadProjects() {
      setLoading(true);
      setError(null);
      try {
        const fetcher = organization.role === "admin" ? getAllProjects : getUserProjects;
        const data = await fetcher(organization.id, user.username);
        setProjects(data ?? []);
      } catch (err) {
        setError(
          err.response?.data?.error ??
            err.response?.data?.detail ??
            "Nie udało się pobrać projektów."
        );
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [organization?.id, organization?.role, user?.username]);

  useEffect(() => {
    if (!initialProjectId) {
      setIndex(0);
      return;
    }
    const idx = projects.findIndex(
      (p) => String(p.id) === String(initialProjectId)
    );
    setIndex(idx >= 0 ? idx : 0);
  }, [initialProjectId, projects]);

  const totalProjects = projects.length;
  const safeIndex = totalProjects === 0 ? 0 : Math.min(index, totalProjects - 1);
  const project = totalProjects === 0 ? null : projects[safeIndex] || null;
  const board = project ? KANBAN_BOARDS[project.id] : null;

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
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollContainer.scrollLeft += e.deltaY;
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    return () => scrollContainer.removeEventListener('wheel', handleWheel);
  }, []);

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

  if (!project || !board) {
    return (
      <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-8 flex items-center justify-center text-slate-400">
        {totalProjects === 0 ? "Brak projektów w organizacji." : "Brak danych kanbana"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-4">
      <div className="max-w-[98vw] mx-auto h-[calc(100vh-2rem)] flex flex-col">
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
              onClick={() => navigate("/kanban/task/new", { state: { projectId: project.id, columnId: board.columns[0]?.id } })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
              aria-label="Nowe zadanie"
              title="Dodaj nowe zadanie"
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

        <div className="flex-1 bg-slate-900/95 rounded-2xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] border border-slate-700 p-6 overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex h-full min-h-0 gap-4 overflow-x-auto overflow-y-hidden overscroll-contain scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
          >
            {board.columns.map(col => (
              <div
                key={col.id}
                className="flex flex-col min-h-0 min-w-[400px] flex-1 rounded-lg bg-slate-800/60 border border-slate-700"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="px-4 py-3 border-b border-slate-700 text-sm font-semibold text-slate-200">
                  {col.name}
                </div>
                <div 
                  className="flex-1 min-h-0 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                >
                  {col.items.length === 0 && (
                    <div className="text-xs text-slate-500 italic">Pusto</div>
                  )}
                  {col.items.map(item => (
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
        </div>
      </div>
    </div>
  );
}
