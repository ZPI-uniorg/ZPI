import React from "react";

export default function ChatPanel({ chats, query, setQuery, addChat }) {
  return (
    <section className="basis-[30%] grow h-full bg-[rgba(15,23,42,0.92)] rounded-[24px] p-5 shadow-[0_25px_50px_rgba(15,23,42,0.45)] text-slate-300 border border-[rgba(148,163,184,0.35)] flex flex-col min-h-0 overflow-hidden">
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj czatu..."
          className="w-full px-4 py-2.5 rounded-lg bg-slate-900/70 border border-slate-600/40 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 overscroll-contain">
        {chats.length === 0 ? (
          <p className="text-slate-400 text-sm">Brak wyników.</p>
        ) : (
          chats.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-600/30 hover:border-slate-400/50 hover:bg-slate-800/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-slate-700/60 flex items-center justify-center text-[11px] font-medium">
                {c.title.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-[15px] md:text-base">{c.title}</p>
                {c.tags?.length ? (
                  <p className="text-xs text-slate-400">{c.tags.join(", ")}</p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="pt-4">
        <button
          onClick={addChat}
          className="w-full py-3 rounded-[14px] text-sm font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 hover:brightness-110 transition"
        >
          nowy chat
        </button>
      </div>
    </section>
  );
}
