import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { X, Plus } from "lucide-react";
import ChannelSidebar from "../../chats/ChannelSidebar.jsx";
import MessageList from "../../chats/MessageList.jsx";
import { useChat } from "../../chats/useChat.js";
import useAuth from "../../../auth/useAuth.js";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";
import { sanitizeChatMessage } from "../../shared/utils/sanitize.js";
import apiClient from "../../../api/client.js";

export default function ChatPage() {
  const { user, organization: activeOrganization } = useAuth() || {};
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = user?.username || "Me";
  const initialChannel = searchParams.get("channel") || null;

  // Redirect if no organization
  useEffect(() => {
    if (!activeOrganization?.id) {
      navigate("/organizations");
    }
  }, [activeOrganization, navigate]);

  const {
    channel,
    channels,
    messages,
    onlineUsers,
    sendMessage,
    switchChannel,
    status,
    loadMoreMessages,
    hasMore,
    loadingMore,
    deleteMessageFromState,
  } = useChat(initialChannel, currentUser, activeOrganization?.id);
  // Use filtered chats from global context; no local fetching here
  const { chats: contextChats, chatsLoading } = useProjects();
  const sidebarChannels = useMemo(
    () =>
      (contextChats || []).map((c) => ({
        chat_id: c.chat_id,
        name: c.title || c.name || String(c.chat_id),
      })),
    [contextChats]
  );
  const [draft, setDraft] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled && draft.trim()) {
      sendMessage(draft);
      setDraft("");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeOrganization?.id) return;

    if (!window.confirm("Czy na pewno chcesz usunąć tę wiadomość?")) return;

    try {
      await apiClient.delete(
        `messages/delete/${activeOrganization.id}/${messageId}/`
      );
      // Remove message from local state
      deleteMessageFromState(messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
      alert("Nie udało się usunąć wiadomości");
    }
  };

  const disabled = status === "connecting";
  const isAdmin = activeOrganization?.role === "admin";
  const canCreateChat = isAdmin;

  // Don't render if no organization
  if (!activeOrganization?.id) {
    return null;
  }

  // Using context-filtered channels for the sidebar
  return (
    <div className="h-full overflow-hidden bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto h-full flex flex-col gap-4">
        <header className="flex items-center justify-between px-2">
          <h1 className="text-2xl font-semibold text-slate-100">{channel}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => isAdmin && navigate("/chat/new")}
              disabled={!canCreateChat}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
              aria-label="Nowy chat"
              title={
                canCreateChat
                  ? "Stwórz nowy chat"
                  : "Tylko administratorzy mogą tworzyć czaty"
              }
            >
              <Plus className="w-4 h-4" />
              <span>Nowy chat</span>
            </button>
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
            channels={sidebarChannels}
            active={channel}
            onSelect={switchChannel}
            users={onlineUsers}
            loading={chatsLoading}
          />
          {channel ? (
            <section className="flex-1 min-h-0 flex flex-col">
              <MessageList
                messages={messages}
                loadMoreMessages={loadMoreMessages}
                hasMore={hasMore}
                loadingMore={loadingMore}
                loading={status === "connecting"}
                onDeleteMessage={handleDeleteMessage}
              />
              <form
                onSubmit={handleSubmit}
                className="border-t border-slate-700 pt-4 flex flex-col gap-3 mx-3 "
              >
                <div className="flex gap-3 items-end">
                  <textarea
                    rows={2}
                    placeholder={`Napisz wiadomość`}
                    value={draft}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const cleaned = sanitizeChatMessage(raw, 1000);
                      setDraft(cleaned);
                    }}
                    maxLength="1000"
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
                    className="h-[46px] px-6 rounded-xl font-semibold bg-indigo-600 text-white shadow disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
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
          ) : (
            <section className="flex-1 flex items-center justify-center text-slate-400">
              <p className="text-center">
                Wybierz czat z listy, aby rozpocząć konwersację
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
