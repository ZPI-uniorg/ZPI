import React from "react";
import { useNavigate } from "react-router-dom";
import { Maximize2 } from "lucide-react";

export default function ChatPanel({
  chats,
  query,
  setQuery,
  addChat,
  loading = false,
  isAdmin = false,
}) {
  const navigate = useNavigate();
  console.log("totototo", chats);
  return (
    <section className="basis-[30%] grow h-full bg-[rgba(15,23,42,0.92)] rounded-[24px] p-5 shadow-[0_25px_50px_rgba(15,23,42,0.45)] text-slate-300 border border-[rgba(148,163,184,0.35)] flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-base font-semibold text-slate-200">Chaty</h3>
        <button
          onClick={() => navigate("/chat")}
          className="p-1 rounded hover:bg-slate-700/40 text-slate-300"
          aria-label="Pełny ekran"
          title="Pełny ekran"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
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
        {loading ? (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-600/30"
              >
                <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-700 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </>
        ) : chats.length === 0 ? (
          <p className="text-slate-400 text-sm">Brak wyników.</p>
        ) : (
          chats.map((c) => (
            <div
              key={c.chat_id}
              onClick={() =>
                navigate(
                  `/chat?channel=${encodeURIComponent(
                    c.title || c.name || c.chat_id
                  )}`
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(
                    `/chat?channel=${encodeURIComponent(
                      c.title || c.name || c.chat_id
                    )}`
                  );
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Otwórz czat ${c.title || "bez nazwy"}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-600/30 hover:border-slate-400/50 hover:bg-slate-800/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/60"
            >
              <div className="w-10 h-10 rounded-full bg-slate-700/60 flex items-center justify-center text-[10px] font-medium">
                {(c.title || "??").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {c.title || "Unnamed Chat"}
                </p>
                {c.tags?.length ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.tags.map((tag, idx) => {
                      // If tag contains +, it's a combination - display with spaces
                      const displayTag = tag.includes("+")
                        ? tag.split("+").join(" + ")
                        : tag;
                      return (
                        <span
                          key={idx}
                          className="bg-fuchsia-700/80 text-white px-1.5 py-0.5 rounded text-[10px] truncate max-w-[120px]"
                          title={displayTag}
                        >
                          {displayTag}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="pt-4">
        <button
          onClick={() => isAdmin && addChat()}
          disabled={!isAdmin}
          className="w-full py-3 rounded-[14px] text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          title={
            isAdmin
              ? "Stwórz nowy chat"
              : "Tylko administratorzy mogą tworzyć czaty"
          }
        >
          nowy chat
        </button>
      </div>
    </section>
  );
}
