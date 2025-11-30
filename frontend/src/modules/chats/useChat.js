import { useEffect, useRef, useState, useCallback } from "react";
import useAuth from "../../auth/useAuth.js";
import apiClient from "../../api/client.js";

const BACKEND_BASE =
  typeof window !== "undefined"
    ? import.meta.env?.VITE_BACKEND_URL ||
      `${window.location.protocol}//localhost:8000`
    : "http://localhost:8000";

export function useChat(
  initialChannel = null,
  username = "Guest",
  organizationId = null
) {
  const [channel, setChannel] = useState(initialChannel);
  const [channels, setChannels] = useState([]); // array of chat objects {chat_id, name}
  const [chatMap, setChatMap] = useState({}); // name -> chat_id
  const [messages, setMessages] = useState([]);
  const [onlineUsers, _setOnlineUsers] = useState([]);
  const [status, setStatus] = useState("connecting");
  const { user, tokens } = useAuth() || {};

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const socketRef = useRef(null);
  const currentChannelRef = useRef(channel);
  // StrictMode double-effect handling: we'll allow multiple runs and always teardown any existing socket first.

  // Update channel ref when channel changes
  useEffect(() => {
    currentChannelRef.current = channel;
  }, [channel]);

  // Fetch organization chats when organizationId changes
  useEffect(() => {
    if (!organizationId) return; // keep default
    const abort = new AbortController();
    (async () => {
      try {
        const headers = { Accept: "application/json" };
        if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;
        const res = await fetch(
          `${BACKEND_BASE}/api/chats/my/${organizationId}/`,
          {
            signal: abort.signal,
            credentials: "include",
            headers,
          }
        );
        if (!res.ok) throw new Error(`Failed chats load: ${res.status}`);
        const data = await res.json();
        const chats = data.chats || [];
        const filtered = chats.filter((c) => !!c.name);
        setChannels(filtered);
        const mapping = Object.fromEntries(
          filtered.map((c) => [c.name, c.chat_id])
        );
        setChatMap(mapping);
      } catch (e) {
        console.error("❌ Chats fetch error", e);
      }
    })();
    return () => abort.abort();
  }, [organizationId, tokens?.access]);

  // Auto-connect on mount and reconnect on channel/username/organization change
  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      if (!mounted) return;

      // Don't connect if no channel is selected
      if (!channel) {
        setStatus("offline");
        setMessages([]);
        return;
      }

      setStatus("connecting");
      setMessages([]);

      // Disconnect previous WebSocket
      if (socketRef.current?.socket) {
        socketRef.current.socket.close();
        socketRef.current = null;
      }

      try {
        console.log("🔌 Getting access token...");
        // Load message history for the selected channel (initial load with pagination)
        try {
          const queryParam = chatMap[channel]
            ? `chat_id=${chatMap[channel]}`
            : `channel=${encodeURIComponent(channel)}`;
          const headers = { Accept: "application/json" };
          if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;
          const historyRes = await fetch(
            `${BACKEND_BASE}/api/messages/${organizationId}/?${queryParam}&limit=10&offset=0`,
            { credentials: "include", headers }
          );
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            const loadedMessages = historyData.messages.map((msg) => ({
              message_uuid: msg.message_uuid,
              chat_id: msg.chat_id,
              sender_id: msg.sender_id,
              author_username: msg.author_username,
              content: msg.content,
              timestamp: msg.timestamp,
              time: new Date(msg.timestamp).toLocaleTimeString("pl-PL", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              id: msg.message_uuid || msg.message_id,
              author: msg.author_username,
              text: msg.content,
              mine:
                (msg.sender_id && user?.id && msg.sender_id === user.id) ||
                msg.author_username === (user?.username || username),
            }));
            setMessages(loadedMessages);
            setOffset(10);
            setHasMore(historyData.has_more || false);
            console.log(
              `📜 Loaded ${loadedMessages.length} messages from history for ${channel}, hasMore: ${historyData.has_more}`
            );
          }
        } catch (historyErr) {
          console.error("❌ Failed to load history:", historyErr);
        }

        // Get negotiate token from Django backend
        const negotiateUrl = `${BACKEND_BASE}/api/negotiate/?userId=${encodeURIComponent(
          username
        )}`;
        const negotiateHeaders = { Accept: "application/json" };
        if (tokens?.access)
          negotiateHeaders.Authorization = `Bearer ${tokens.access}`;
        const res = await fetch(negotiateUrl, {
          credentials: "include",
          headers: negotiateHeaders,
        });

        if (!res.ok) {
          throw new Error(`Failed to negotiate: ${res.status}`);
        }

        const data = await res.json();
        console.log("✅ Got token");

        if (!mounted) return;

        // Connect to Azure Web PubSub using native WebSocket
        const wsUrl = data.url;
        console.log("🔌 Connecting to Azure Web PubSub...");
        const ws = new WebSocket(wsUrl, "json.webpubsub.azure.v1");
        socketRef.current = { socket: ws, connected: false };

        ws.onopen = () => {
          if (!mounted) return;
          socketRef.current.connected = true;
          setStatus("online");
          console.log("✅ Connected to Azure Web PubSub");

          // Join the channel group
          ws.send(JSON.stringify({ type: "joinGroup", group: channel }));
          console.log("📤 Joined group:", channel);
        };

        ws.onmessage = (event) => {
          if (!mounted) return;

          try {
            const data = JSON.parse(event.data);
            console.log("📨 Raw message:", data);

            // Handle system/ack messages
            if (data.type === "system" || data.type === "ack") {
              return;
            }

            // Handle incoming chat messages
            if (data.type === "message" && data.from) {
              const payload = data.data;
              // Determine textual content
              let contentStr = "";
              if (payload && typeof payload === "object") {
                contentStr = payload.content || payload.text || "";
              } else if (typeof payload === "string") {
                contentStr = payload;
              }

              const messageAuthor =
                (payload && (payload.author_username || payload.author)) ||
                data.from;
              const messageId =
                (payload && (payload.message_uuid || payload.id)) ||
                crypto.randomUUID();

              const msg = {
                id: messageId,
                message_uuid: messageId,
                chat_id: payload?.chat_id || chatMap[channel] || null,
                sender_id: payload?.sender_id || null,
                channel,
                author_username: messageAuthor,
                author: messageAuthor,
                content: contentStr,
                text: contentStr,
                timestamp: payload?.timestamp || Date.now(),
                time: new Date().toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                mine:
                  (payload?.sender_id &&
                    user?.id &&
                    payload.sender_id === user.id) ||
                  messageAuthor === (user?.username || username),
              };

              setMessages((prev) => {
                const isDuplicate = prev.some(
                  (m) => m.id === msg.id || m.message_uuid === msg.message_uuid
                );
                if (isDuplicate) return prev;
                return [...prev, msg];
              });
            }
          } catch (err) {
            console.error("❌ Parse error:", err);
          }
        };

        ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          if (mounted) setStatus("offline");
        };

        ws.onclose = () => {
          console.log("🔌 WebSocket closed");
          if (mounted) {
            setStatus("offline");
            if (socketRef.current) {
              socketRef.current.connected = false;
            }
          }
        };
      } catch (err) {
        console.error("❌ Connect error:", err);
        if (mounted) setStatus("offline");
      }
    };

    connect();

    return () => {
      mounted = false;
      if (socketRef.current?.socket) {
        socketRef.current.socket.close();
        socketRef.current = null;
      }
    };
  }, [channel, username, organizationId, chatMap, user?.id, user?.username]);

  // Switch to a different channel
  const switchChannel = useCallback(
    (newChannel) => {
      if (newChannel === channel) return;

      // Leave old group and join new one
      if (
        socketRef.current?.connected &&
        socketRef.current?.socket?.readyState === WebSocket.OPEN
      ) {
        socketRef.current.socket.send(
          JSON.stringify({ type: "leaveGroup", group: channel })
        );
        socketRef.current.socket.send(
          JSON.stringify({ type: "joinGroup", group: newChannel })
        );
      }

      currentChannelRef.current = newChannel;
      setChannel(newChannel);
      setMessages([]);
      // Reset pagination state
      setOffset(0);
      setHasMore(true);
    },
    [channel]
  );

  // Load more (older) messages
  const loadMoreMessages = useCallback(async () => {
    if (!channel || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const queryParam = chatMap[channel]
        ? `chat_id=${chatMap[channel]}`
        : `channel=${encodeURIComponent(channel)}`;
      const headers = { Accept: "application/json" };
      if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;
      const historyRes = await fetch(
        `${BACKEND_BASE}/api/messages/${organizationId}/?${queryParam}&limit=10&offset=${offset}`,
        { credentials: "include", headers }
      );

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const olderMessages = historyData.messages.map((msg) => ({
          message_uuid: msg.message_uuid,
          chat_id: msg.chat_id,
          sender_id: msg.sender_id,
          author_username: msg.author_username,
          content: msg.content,
          timestamp: msg.timestamp,
          time: new Date(msg.timestamp).toLocaleTimeString("pl-PL", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          id: msg.message_uuid || msg.message_id,
          author: msg.author_username,
          text: msg.content,
          mine:
            (msg.sender_id && user?.id && msg.sender_id === user.id) ||
            msg.author_username === (user?.username || username),
        }));

        if (olderMessages.length > 0) {
          setMessages((prev) => [...olderMessages, ...prev]);
          setOffset((prev) => prev + olderMessages.length);
        }
        setHasMore(historyData.has_more || false);
        console.log(
          `📜 Loaded ${olderMessages.length} older messages, hasMore: ${historyData.has_more}`
        );
      }
    } catch (err) {
      console.error("❌ Failed to load more messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [
    channel,
    loadingMore,
    hasMore,
    offset,
    chatMap,
    user?.id,
    user?.username,
    username,
    tokens?.access,
    organizationId,
  ]);

  // Send message
  const sendMessage = useCallback(
    (text) => {
      if (
        !socketRef.current?.socket ||
        socketRef.current.socket.readyState !== WebSocket.OPEN ||
        !text.trim()
      ) {
        console.warn("⚠️ Cannot send: not connected or empty");
        return;
      }

      const messageId = crypto.randomUUID();
      const timestamp = Date.now();
      const chat_id = chatMap[currentChannelRef.current] || null;
      const sender_id = user?.id || null;

      const outbound = {
        message_uuid: messageId,
        chat_id,
        sender_id,
        content: text.trim(),
        text: text.trim(), // backward compatibility for any consumer expecting 'text'
        timestamp,
        author_username: user?.username || username,
        author: user?.username || username,
      };

      const payload = {
        type: "sendToGroup",
        group: currentChannelRef.current,
        data: outbound,
        dataType: "json",
      };

      console.log("📤 Sending message:", outbound);
      socketRef.current.socket.send(JSON.stringify(payload));

      // Persist
      const saveHeaders = { "Content-Type": "application/json" };
      if (tokens?.access) saveHeaders.Authorization = `Bearer ${tokens.access}`;
      fetch(`${BACKEND_BASE}/api/messages/save/${organizationId}/`, {
        method: "POST",
        credentials: "include",
        headers: saveHeaders,
        body: JSON.stringify(outbound),
      }).catch((err) => console.error("❌ Failed to save message:", err));

      // Don't add optimistic UI update - wait for broadcast from server
      // This prevents duplicate messages
    },
    [
      username,
      user?.id,
      user?.username,
      chatMap,
      tokens?.access,
      organizationId,
    ]
  );

  return {
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
  };
}
