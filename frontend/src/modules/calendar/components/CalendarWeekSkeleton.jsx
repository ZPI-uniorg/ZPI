import React from "react";

export default function CalendarWeekSkeleton() {
  const cols = 7;
  const hours = 24;
  return (
    <div className="flex-1 bg-slate-900/95 rounded-2xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] border border-slate-700 p-4 overflow-hidden flex flex-col">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-slate-700/30 mb-px">
        <div className="bg-slate-900/95" />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="bg-slate-900/95 py-3">
            <div className="mx-auto h-3 w-24 rounded bg-slate-700 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-slate-700/30 min-h-[40px] mb-1">
        <div className="bg-slate-900/95" />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="bg-slate-900/95 p-1">
            <div className="h-4 w-full rounded bg-slate-700 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {Array.from({ length: hours }).map((_, h) => (
          <div
            key={h}
            className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-slate-700/30 h-[60px] relative"
          >
            <div className="bg-slate-900/95 p-2">
              <div className="ml-auto h-3 w-10 rounded bg-slate-700 animate-pulse" />
            </div>
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} className="bg-slate-900/95 relative">
                <div className="absolute top-2 left-2 h-4 w-24 rounded bg-slate-700/80 animate-pulse" />
                <div className="absolute top-8 left-2 h-3 w-16 rounded bg-slate-700/70 animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
