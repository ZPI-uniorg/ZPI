import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import { useProjects } from '../../shared/components/ProjectsContext.jsx';

export default function KanbanPreview({
  project,
  board,
  onPrev,
  onNext,
  loading,
  error,
}) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const { selectedTags } = useProjects();

  useEffect(() => {
    if (board) {
      const tasks = board.columns.flatMap(col => col.tasks || []);
      console.log('Kanban board for project', project?.name, ':', {
        board_id: board.board_id,
        columns: board.columns.map(c => ({ 
          column_id: c.column_id, 
          title: c.title, 
          task_count: c.tasks?.length || 0 
        })),
        all_tasks: tasks.map(t => ({
          task_id: t.task_id,
          title: t.title,
          assigned_to: t.assigned_to ? `${t.assigned_to.first_name} ${t.assigned_to.last_name}` : null
        }))
      });
    }
  }, [board, project]);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollContainer.scrollLeft += e.deltaY;
      }
    };

    scrollContainer.addEventListener("wheel", handleWheel, { passive: false });
    return () => scrollContainer.removeEventListener("wheel", handleWheel);
  }, []);

  const handleFullscreen = () => {
    if (!project) return;
    navigate("/kanban", { state: { projectId: project.id } });
  };

  if (!project) {
    const message = selectedTags && selectedTags.length > 0 
      ? 'Brak projektów pasujących do wybranych filtrów.'
      : 'Brak projektów.';
    return (
      <div className="flex w-full h-full items-center justify-center text-slate-400 text-sm">
        {message}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="px-2 py-0.5 rounded hover:bg-slate-700/40 text-slate-300 text-sm"
            aria-label="Poprzedni projekt"
          >
            &lt;
          </button>
          <h3 className="text-base font-semibold text-slate-200 min-w-[160px] text-center">
            {project.name}
          </h3>
          <button
            type="button"
            onClick={onNext}
            className="px-2 py-0.5 rounded hover:bg-slate-700/40 text-slate-300 text-sm"
            aria-label="Następny projekt"
          >
            &gt;
          </button>
        </div>
        <button
          type="button"
          onClick={handleFullscreen}
          className="p-1 rounded hover:bg-slate-700/40 text-slate-300"
          aria-label="Pełny ekran"
          title="Pełny ekran"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex h-full gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, col) => (
              <div
                key={col}
                className="flex flex-col min-h-0 min-w-[200px] flex-1 rounded-lg bg-slate-800/40 border border-slate-700"
              >
                <div className="px-3 py-2 border-b border-slate-700 shrink-0">
                  <div className="h-4 bg-slate-700 rounded animate-pulse w-20" />
                </div>
                <div className="flex-1 min-h-0 p-2 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-md bg-slate-700 px-2.5 py-2 h-[70px] animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex w-full h-full items-center justify-center">
            <p className="text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-4 py-3 text-sm max-w-md text-center">
              {error}
            </p>
          </div>
        ) : board ? (
          <div
            ref={scrollRef}
            className="flex h-full gap-3 overflow-x-auto overflow-y-hidden overscroll-contain scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
          >
            {board.columns.map((col) => (
              <div
                key={col.column_id}
                className="flex flex-col min-h-0 min-w-[200px] flex-1 rounded-lg bg-slate-800/40 border border-slate-700"
              >
                <div className="px-3 py-2 border-b border-slate-700 text-xs font-semibold text-slate-200 shrink-0">
                  {col.title}
                </div>
                <div className="flex-1 min-h-0 p-2 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {(col.tasks?.length ?? 0) === 0 && (
                    <div className="text-[11px] text-slate-500 italic">
                      Pusto
                    </div>
                  )}
                  {(col.tasks ?? []).map((item) => (
                    <div
                      key={item.task_id}
                      className="rounded-md bg-violet-600/80 hover:bg-violet-600 text-white px-2.5 py-2 text-xs cursor-pointer transition flex flex-col gap-1 min-h-[70px]"
                      title={item.title}
                      onClick={() =>
                        navigate("/kanban/task/edit", {
                          state: {
                            task: item,
                            projectId: project.id,
                            columnId: col.column_id,
                            returnTo: "dashboard",
                          },
                        })
                      }
                    >
                      <div className="flex items-center justify-between gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-white/90 font-semibold">
                          {item.task_id}
                        </span>
                      </div>
                      <div
                        className="font-medium text-xs leading-tight flex-1 overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {item.title}
                      </div>
                      {item.assigned_to && (
                        <div className="text-[10px] text-white/80 mt-auto truncate">
                          {item.assigned_to.first_name}{" "}
                          {item.assigned_to.last_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex w-full h-full items-center justify-center text-slate-400 text-sm text-center px-4">
            Brak danych kanban dla tego projektu. Dodaj zadania w module Kanban,
            aby zobaczyć podgląd.
          </div>
        )}
      </div>
    </div>
  );
}
