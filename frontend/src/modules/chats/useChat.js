import { useEffect, useRef, useState, useCallback } from "react";

const BACKEND_BASE =
  typeof window !== "undefined"
    ? import.meta.env?.VITE_BACKEND_URL ||
      `${window.location.protocol}//localhost:8000`
    : "http://localhost:8000";

export function useChat(initialChannel = "general", username = "Guest") {
  const [channel, setChannel] = useState(initialChannel);
  const [channels] = useState(["general", "tech", "random"]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, _setOnlineUsers] = useState([]);
  const [status, setStatus] = useState("connecting");

  const socketRef = useRef(null);
  const currentChannelRef = useRef(channel);
  // StrictMode double-effect handling: we'll allow multiple runs and always teardown any existing socket first.

  // Update channel ref when channel changes
  useEffect(() => {
    currentChannelRef.current = channel;
  }, [channel]);

  // Auto-connect on mount and reconnect on channel/username change
  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      if (!mounted) return;

      setStatus("connecting");
      setMessages([]);

      // Disconnect previous WebSocket
      if (socketRef.current?.socket) {
        socketRef.current.socket.close();
        socketRef.current = null;
      }

      try {
        console.log("🔌 Getting access token...");

        // Get negotiate token from Django backend
        const negotiateUrl = `${BACKEND_BASE}/api/negotiate/?userId=${encodeURIComponent(
          username
        )}`;
        const res = await fetch(negotiateUrl, {
          headers: { Accept: "application/json" },
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
              // Use author from message data, not Azure's connection ID
              const messageAuthor = data.data?.author || data.from;
              const messageId = data.data?.id || crypto.randomUUID();
              console.log(
                `🔍 Comparing: messageAuthor="${messageAuthor}" vs username="${username}"`
              );
              const msg = {
                id: messageId,
                channel: channel,
                author: messageAuthor,
                text: data.data?.text || data.data,
                time: new Date().toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                mine: messageAuthor === username,
              };
              console.log(
                `📩 Message created: author="${msg.author}", mine=${msg.mine}`
              );

              setMessages((prev) => {
                // Deduplication by message ID to prevent same broadcast appearing twice
                const isDuplicate = prev.some((m) => m.id === msg.id);
                if (isDuplicate) {
                  return prev;
                }
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
  }, [channel, username]);

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
    },
    [channel]
  );

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
      const message = {
        id: messageId,
        channel: currentChannelRef.current,
        author: username,
        text: text.trim(),
        time: new Date().toLocaleTimeString("pl-PL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: timestamp,
      };

      const payload = {
        type: "sendToGroup",
        group: currentChannelRef.current,
        data: message,
        dataType: "json",
      };

      console.log("📤 Sending message:", message);
      socketRef.current.socket.send(JSON.stringify(payload));

      // Don't add optimistic UI update - wait for broadcast from server
      // This prevents duplicate messages
    },
    [username]
  );

  return {
    channel,
    channels,
    messages,
    onlineUsers,
    sendMessage,
    switchChannel,
    status,
  };
}
