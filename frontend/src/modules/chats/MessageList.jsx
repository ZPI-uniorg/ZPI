import { useEffect, useRef } from "react";

export default function MessageList({ messages }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      {messages.map((m) => (
        <div
          key={m.id}
          className={
            "flex flex-col gap-1 max-w-[70%] " +
            (m.mine ? "self-end items-end" : "self-start items-start")
          }
        >
          <div className="flex items-center gap-2">
            {!m.mine && (
              <span className="text-[11px] text-slate-400 font-medium">
                {m.author}
              </span>
            )}
            <span className="text-[10px] text-slate-500">{m.time}</span>
          </div>
          <div
            className={
              "group relative px-4 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap " +
              (m.mine
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md"
                : "bg-slate-800 text-slate-100 border border-slate-700")
            }
          >
            {m.text}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
