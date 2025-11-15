import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import ChannelSidebar from "../../chats/ChannelSidebar.jsx";
import MessageList from "../../chats/MessageList.jsx";
import { useChat } from "../../chats/useChat.js";
import useAuth from "../../../auth/useAuth.js";

export default function ChatPage() {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const currentUser = user?.username || "Me";
  const {
    channel,
    channels,
    messages,
    onlineUsers,
    sendMessage,
    switchChannel,
    status,
  } = useChat(undefined, currentUser);
  const [draft, setDraft] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled && draft.trim()) {
      sendMessage(draft);
      setDraft("");
    }
  };

  const disabled = status === "connecting";
  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] flex flex-col gap-4">
        <header className="flex items-center justify-between px-2">
          <h1 className="text-2xl font-semibold text-slate-100">{channel}</h1>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-200">
              Online: {onlineUsers.length}
            </span>
            <span
              className={
                "px-3 py-1 rounded-lg text-xs font-medium border " +
                (status === "online"
                  ? "border-green-500/40 text-green-400 bg-green-500/10"
                  : status === "connecting"
                  ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
                  : "border-slate-600 text-slate-300")
              }
            >
              {status}
            </span>
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 transition"
              aria-label="Zamknij"
              title="Powrót do dashboardu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>
        <div className="flex-1 bg-slate-900/95 rounded-2xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] border border-slate-700 p-4 overflow-hidden flex">
          <ChannelSidebar
            channels={channels}
            active={channel}
            onSelect={switchChannel}
            users={onlineUsers}
          />
          <section className="flex-1 flex flex-col">
            <MessageList messages={messages} />
            <form
              onSubmit={handleSubmit}
              className="border-t border-slate-700 pt-4 flex flex-col gap-3 mx-3 "
            >
              <div className="flex gap-3 items-end">
                <textarea
                  rows={2}
                  placeholder={`Napisz wiadomość`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.ctrlKey &&
                      !e.metaKey &&
                      !e.shiftKey &&
                      !e.altKey
                    ) {
                      e.preventDefault();
                      if (!disabled && draft.trim()) {
                        sendMessage(draft);
                        setDraft("");
                      }
                    }
                    // Ctrl+Enter or Cmd+Enter: allow default to insert a newline
                  }}
                  className="flex-1 resize-none rounded-xl px-4 py-3 text-sm border border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
                  disabled={disabled}
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || disabled}
                  className="h-[46px] px-6 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
                >
                  Wyślij
                </button>
              </div>
              <p className="text-[11px] text-slate-500 px-1 flex items-center gap-2">
                <span>Status:</span>
                <span
                  className={
                    "px-2 py-0.5 rounded text-xs font-medium border " +
                    (status === "online"
                      ? "border-green-500/40 text-green-400 bg-green-500/10"
                      : status === "connecting"
                      ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
                      : "border-slate-600 text-slate-300")
                  }
                >
                  {status}
                </span>
                {status !== "online" && (
                  <span>Próba połączenia z serwerem…</span>
                )}
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
