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
        <ul className="flex flex-col gap-1">
          {loading ? (
            <li className="text-slate-400 text-sm animate-pulse px-3 py-2">
              Wczytywanie czatów...
            </li>
          ) : normalized.length === 0 ? (
            <li className="text-slate-400 text-sm px-3 py-2">Brak czatów</li>
          ) : (
            normalized.map((c) => (
              <li key={c.key}>
                <button
                  onClick={() => onSelect(c.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    c.value === active
                      ? "bg-slate-700/60 text-slate-100 shadow-md"
                      : "text-slate-300 hover:bg-slate-700/40 hover:text-slate-100"
                  }`}
                  aria-current={c.value === active ? "page" : undefined}
                >
                  {c.label}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </aside>
  );
}
