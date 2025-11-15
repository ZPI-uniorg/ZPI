import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PROJECTS, KANBAN_BOARDS } from "../../../api/fakeData.js";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function KanbanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialProjectId = location.state?.projectId;
  const scrollRef = useRef(null);

  const [index, setIndex] = useState(() => {
    if (!initialProjectId) return 0;
    const i = PROJECTS.findIndex(p => p.id === initialProjectId);
    return i >= 0 ? i : 0;
  });

  const project = PROJECTS[index] || null;
  const board = project ? KANBAN_BOARDS[project.id] : null;

  const prev = () => setIndex(i => (i - 1 + PROJECTS.length) % PROJECTS.length);
  const next = () => setIndex(i => (i + 1) % PROJECTS.length);

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

  if (!project || !board) {
    return (
      <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-8 flex items-center justify-center text-slate-400">
        Brak danych kanbana
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
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 transition"
            aria-label="Zamknij"
            title="Powrót do dashboardu"
          >
            <X className="w-5 h-5" />
          </button>
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
              >
                <div className="px-4 py-3 border-b border-slate-700 text-sm font-semibold text-slate-200">
                  {col.name}
                </div>
                <div className="flex-1 min-h-0 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {col.items.length === 0 && (
                    <div className="text-xs text-slate-500 italic">Pusto</div>
                  )}
                  {col.items.map(item => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-violet-600/90 hover:bg-violet-500 text-white px-3 py-3 text-sm cursor-pointer transition flex flex-col gap-2 shadow-sm min-h-[90px]"
                      title={item.title}
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
