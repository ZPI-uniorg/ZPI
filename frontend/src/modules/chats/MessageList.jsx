import { useEffect, useRef } from "react";

// Supports legacy local message shape ({text, author, mine, time}) and backend shape ({content, sender, created_at}).
export default function MessageList({ messages, currentUser }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4 pr-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      {messages.map((m) => {
        const mine =
          typeof m.mine === "boolean"
            ? m.mine
            : m.sender?.username === currentUser;
        const author = m.author || m.sender?.username || "Anon";
        const time =
          m.time ||
          (m.created_at
            ? new Date(m.created_at).toLocaleTimeString("pl-PL", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "");
        const text = m.text || m.content || "";
        return (
          <div
            key={m.id}
            className={
              "flex flex-col gap-1 max-w-[70%] " +
              (mine ? "self-end items-end" : "self-start items-start")
            }
          >
            <div className="flex items-center gap-2">
              {!mine && (
                <span className="text-[11px] text-slate-400 font-medium">
                  {author}
                </span>
              )}
              <span className="text-[10px] text-slate-500">{time}</span>
            </div>
            <div
              className={
                "group relative px-4 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap " +
                (mine
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md"
                  : "bg-slate-800 text-slate-100 border border-slate-700")
              }
            >
              {text}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
