export default function ChannelSidebar({
  channels,
  active,
  onSelect,
  users,
  loading = false,
}) {
  const normalized = (channels || []).map((c) => {
    if (typeof c === "string") {
      return { key: c, label: c, value: c };
    }
    return {
      key:
        c.chat_id ||
        c.id ||
        c.name ||
        c.title ||
        Math.random().toString(36).slice(2),
      label: c.name || c.title || c.chat_id || "bez-nazwy",
      value: c.name || c.title || c.chat_id || c.id,
    };
  });
  return (
    <aside className="flex w-56 flex-col gap-6 pr-4 border-r border-slate-700/60 shrink-0 min-w-[11rem]">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
          Chaty
        </p>
        <div className="flex flex-col gap-2">
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
          ) : normalized.length === 0 ? (
            <p className="text-slate-400 text-sm px-3 py-2">Brak czatów</p>
          ) : (
            normalized.map((c) => (
              <div
                key={c.key}
                onClick={() => onSelect(c.value)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                  c.value === active
                    ? "border-slate-400/50 bg-slate-800/50"
                    : "border-slate-600/30 hover:border-slate-400/50 hover:bg-slate-800/30"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-700/60 flex items-center justify-center text-[10px] font-medium">
                  {(c.label || "??").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {c.label || "Unnamed Chat"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
