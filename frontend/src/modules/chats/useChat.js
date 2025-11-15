import { useCallback, useEffect, useRef, useState } from "react";
import { CHATS } from "../../api/fakeData.js";

// Channels sourced from shared test data
const DEFAULT_CHANNELS =
  Array.isArray(CHATS) && CHATS.length
    ? CHATS.map((c) => c.title)
    : ["general"];

function loadStored(channel) {
  try {
    const raw = sessionStorage.getItem("chat:" + channel);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function store(channel, messages) {
  try {
    sessionStorage.setItem(
      "chat:" + channel,
      JSON.stringify(messages.slice(-200))
    );
  } catch {}
}

// Attempt WebSocket endpoint (adjust if backend provides a different URL).
const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${
        window.location.host
      }/ws/chat`
    : "";

export function useChat(
  initialChannel = DEFAULT_CHANNELS[0],
  currentUser = "Me"
) {
  const [channel, setChannel] = useState(initialChannel);
  const [messages, setMessages] = useState(() => loadStored(initialChannel));
  const [onlineUsers, setOnlineUsers] = useState([
    "Anna",
    "Bartek",
    "Kasia",
    "Piotr",
  ]);
  const [status, setStatus] = useState("connecting");
  const wsRef = useRef(null);

  // Load messages when channel changes.
  useEffect(() => {
    setMessages(loadStored(channel));
  }, [channel]);

  // Initialize WebSocket (best-effort). If it doesn't connect quickly, fall back to local-only mode.
  useEffect(() => {
    let active = true;
    try {
      const ws = new WebSocket(
        WS_URL + "?channel=" + encodeURIComponent(channel)
      );
      wsRef.current = ws;
      const fallback = setTimeout(() => {
        if (!active) return;
        if (ws.readyState !== WebSocket.OPEN) {
          // Local mode (no real backend); mark as online so UI is usable.
          setStatus("online");
        }
      }, 1000);
      ws.onopen = () => {
        if (!active) return;
        clearTimeout(fallback);
        setStatus("online");
      };
      ws.onerror = () => {
        if (!active) return;
        clearTimeout(fallback);
        // Treat error as local mode instead of permanent error.
        setStatus("online");
      };
      ws.onclose = () => {
        if (!active) return;
        clearTimeout(fallback);
        // Keep previously loaded messages; remain in local mode.
        if (status === "connecting") setStatus("online");
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "chat.message") {
            setMessages((prev) => {
              const next = [...prev, data.payload];
              store(channel, next);
              return next;
            });
          } else if (data.type === "chat.presence") {
            if (Array.isArray(data.payload?.users))
              setOnlineUsers(data.payload.users);
          }
        } catch {}
      };
      return () => {
        active = false;
        clearTimeout(fallback);
        ws.close();
      };
    } catch {
      // WebSocket construction failed outright; go straight to local mode.
      setStatus("online");
      return () => {};
    }
  }, [channel]);

  // Fallback simulated presence ping.
  useEffect(() => {
    if (status === "online") return; // local or remote online - no spoofed presence needed
    const id = setInterval(() => {
      setOnlineUsers((u) => u);
    }, 15000);
    return () => clearInterval(id);
  }, [status]);

  const sendMessage = useCallback(
    (text) => {
      if (!text.trim()) return;
      const msg = {
        id: Date.now(),
        author: currentUser,
        mine: true,
        time: new Date().toLocaleTimeString("pl-PL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: text.trim(),
      };
      // Optimistic append.
      setMessages((prev) => {
        const next = [...prev, msg];
        store(channel, next);
        return next;
      });
      // Try to send over socket.
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({ type: "chat.message", payload: msg })
          );
        }
      } catch {}
    },
    [channel, currentUser]
  );

  const switchChannel = useCallback(
    (newChannel) => {
      if (newChannel === channel) return;
      setChannel(newChannel);
    },
    [channel]
  );

  return {
    channel,
    messages,
    onlineUsers,
    status,
    sendMessage,
    switchChannel,
    channels: DEFAULT_CHANNELS,
  };
}

export default useChat;
