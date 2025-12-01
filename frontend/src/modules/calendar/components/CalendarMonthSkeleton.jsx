import React from "react";

export default function CalendarMonthSkeleton() {
  const rows = 6;
  const cols = 7;
  return (
    <div className="flex-1 bg-slate-900/95 rounded-2xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] border border-slate-700 p-4 overflow-hidden flex flex-col">
      <div className="grid grid-cols-7 gap-px bg-slate-700/30 mb-px">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="bg-slate-900/95 py-3">
            <div className="mx-auto h-3 w-12 rounded bg-slate-700 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-rows-6 gap-px bg-slate-700/30 overflow-hidden">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid grid-cols-7 gap-px">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="bg-slate-900/95 p-2">
                <div className="h-4 w-6 rounded bg-slate-700 animate-pulse mb-2" />
                <div className="space-y-1">
                  <div className="h-3 w-24 rounded bg-slate-700/80 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-slate-700/70 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-slate-700/60 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
