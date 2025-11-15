export default function ChannelSidebar({ channels, active, onSelect, users }) {
  return (
    <aside className="hidden md:flex w-64 flex-col gap-6 pr-4 border-r border-slate-700/60">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
          Chaty
        </p>
        <ul className="flex flex-col gap-1">
          {channels.map((c) => (
            <li key={c}>
              <button
                onClick={() => onSelect(c)}
                className={
                  "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition " +
                  (c === active
                    ? "bg-slate-700/60 text-slate-100"
                    : "text-slate-300 hover:bg-slate-700/40")
                }
              >
                {c}
              </button>
            </li>
          ))}
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
