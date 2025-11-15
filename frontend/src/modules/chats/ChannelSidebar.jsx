export default function ChannelSidebar({ chats, activeChatId, onSelect }) {
  return (
    <aside className="hidden md:flex w-64 flex-col gap-6 pr-4 border-r border-slate-700/60">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
          Chaty
        </p>
        <ul className="flex flex-col gap-1">
          {chats.map((chat) => (
            <li key={chat.id}>
              <button
                onClick={() => onSelect(chat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  chat.id === activeChatId
                    ? "bg-slate-700/60 text-slate-100 shadow-md border border-indigo-500/40"
                    : "text-slate-300 hover:bg-slate-700/40 hover:text-slate-100"
                }`}
                aria-current={chat.id === activeChatId ? "page" : undefined}
              >
                {chat.title || chat.name || `Chat ${chat.id}`}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
