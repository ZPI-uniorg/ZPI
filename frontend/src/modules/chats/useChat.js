import { useState, useEffect, useRef } from "react";
import apiClient from "../../api/client";

// Backend-integrated chat hook: fetch chats, select a chat, list + send messages.
export function useChat() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch chats on mount.
  useEffect(() => {
    let ignore = false;
    async function fetchChats() {
      setLoadingChats(true);
      setError(null);
      try {
        const res = await apiClient.get("/chats/");
        if (!ignore) {
          setChats(res.data);
          if (!activeChatId && res.data.length > 0)
            setActiveChatId(res.data[0].id);
          // Auto-create a default chat if none exist so user can start sending messages.
          if (!activeChatId && res.data.length === 0) {
            try {
              const createRes = await apiClient.post("/chats/", {
                title: "General",
                participant_ids: [],
              });
              const created = createRes.data;
              setChats([created]);
              setActiveChatId(created.id);
            } catch (createErr) {
              // Surface creation error but do not block UI.
              setError(
                (prev) =>
                  prev || createErr.message || "Failed to create default chat"
              );
            }
          }
        }
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load chats");
      } finally {
        if (!ignore) setLoadingChats(false);
      }
    }
    fetchChats();
    return () => {
      ignore = true;
    };
  }, []);

  // Fetch messages when active chat changes.
  useEffect(() => {
    if (!activeChatId) return;
    let ignore = false;
    async function fetchChatDetail() {
      setLoadingMessages(true);
      setError(null);
      try {
        // Append auto_join=1 during dev so user is added as participant automatically.
        const res = await apiClient.get(`/chats/${activeChatId}/?auto_join=1`);
        if (!ignore) {
          setMessages(res.data.messages || []);
          setChats((prev) =>
            prev.map((c) => (c.id === res.data.id ? { ...c, ...res.data } : c))
          );
        }
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load messages");
      } finally {
        if (!ignore) setLoadingMessages(false);
      }
    }
    fetchChatDetail();
    return () => {
      ignore = true;
    };
  }, [activeChatId]);

  // Lightweight realtime: poll active chat messages every 1s while tab visible.
  useEffect(() => {
    if (!activeChatId) return;
    let stopped = false;
    let intervalId = null;

    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await apiClient.get(`/chats/${activeChatId}/?auto_join=1`);
        const next = res.data.messages || [];
        // Update only when changed to avoid re-renders.
        setMessages((prev) => {
          const prevLast = prev.length ? prev[prev.length - 1].id : null;
          const nextLast = next.length ? next[next.length - 1].id : null;
          if (prev.length !== next.length || prevLast !== nextLast) {
            return next;
          }
          return prev;
        });
        setChats((prev) =>
          prev.map((c) => (c.id === res.data.id ? { ...c, ...res.data } : c))
        );
      } catch (_) {
        // Ignore polling errors
      }
    };

    // Poll only if WS is not connected
    if (!wsConnected) {
      intervalId = setInterval(poll, 1000);
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeChatId, wsConnected]);

  // WebSocket connection for active chat
  useEffect(() => {
    if (!activeChatId) return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}/ws/chats/${activeChatId}/`;
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "chat.message" && data.payload) {
            setMessages((prev) => {
              // Avoid duplicate append if same id already present
              if (prev.some((m) => m.id === data.payload.id)) return prev;
              return [...prev, data.payload];
            });
          }
        } catch {}
      };
      return () => {
        ws.close();
      };
    } catch (e) {
      setWsConnected(false);
    }
  }, [activeChatId]);

  const setActiveChat = (id) => {
    if (id === activeChatId) return;
    setActiveChatId(id);
  };

  const sendMessage = async (content) => {
    if (!activeChatId || !content.trim()) return;
    setSending(true);
    setError(null);
    const optimistic = {
      id: `temp-${Date.now()}`,
      sender: { id: "me", username: "You" },
      content,
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await apiClient.post(`/chats/${activeChatId}/messages/`, {
        content,
      });
      const saved = res.data;
      setMessages((prev) => prev.map((m) => (m === optimistic ? saved : m)));
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId ? { ...c, last_message: saved } : c
        )
      );
      // Re-fetch chat detail to ensure server ordering & any additional fields.
      try {
        const detail = await apiClient.get(
          `/chats/${activeChatId}/?auto_join=1`
        );
        setMessages(detail.data.messages || []);
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId ? { ...c, ...detail.data } : c
          )
        );
      } catch (detailErr) {
        // Non-fatal if detail fetch fails; keep optimistic merge.
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m !== optimistic));
      setError(e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return {
    chats,
    activeChatId,
    setActiveChat,
    messages,
    sendMessage,
    loadingChats,
    loadingMessages,
    sending,
    error,
  };
}

export default useChat;
