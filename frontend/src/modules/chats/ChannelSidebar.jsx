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
        c.chat_it ||
        c.id ||
        c.name ||
        c.title ||
        Math.random().toString(36).slice(2),
      label: c.name || c.title || c.chat_it || "bez-nazwy",
      value: c.name || c.title || c.chat_it || c.id,
    };
  });
  return (
    <aside className="hidden md:flex w-64 flex-col gap-6 pr-4 border-r border-slate-700/60">
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
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
          Użytkownicy
        </p>
        <ul className="flex flex-col gap-1">
          {users.map((u) => (
            <li
              key={u}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/40 transition"
            >
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">{u}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
