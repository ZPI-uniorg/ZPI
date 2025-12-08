import { useEffect, useRef, useCallback, useState } from "react";
import { Trash2 } from "lucide-react";

// Helper to format date headers
function formatDateHeader(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time parts for comparison
  const resetTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dateOnly = resetTime(date);
  const todayOnly = resetTime(today);
  const yesterdayOnly = resetTime(yesterday);

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "Dzisiaj";
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return "Wczoraj";
  } else {
    return date.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  }
}

// Helper to group messages by date and time
function groupMessages(messages) {
  const groups = [];
  let currentDate = null;
  let currentTimeGroup = null;

  messages.forEach((msg, idx) => {
    // Extract date from message (assuming msg has a timestamp or time field)
    const msgDate = msg.timestamp
      ? new Date(msg.timestamp).toDateString()
      : new Date().toDateString();
    const msgTime = msg.time || "";

    // Check if we need a new date header
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ type: "date", date: msgDate });
      currentTimeGroup = null;
    }

    // Check if we should group by time (same time and consecutive message from same author)
    const shouldShowTime =
      !currentTimeGroup ||
      currentTimeGroup.time !== msgTime ||
      currentTimeGroup.author !== msg.author ||
      currentTimeGroup.mine !== msg.mine;

    if (shouldShowTime) {
      currentTimeGroup = { time: msgTime, author: msg.author, mine: msg.mine };
      groups.push({ type: "message", msg, showTime: true });
    } else {
      groups.push({ type: "message", msg, showTime: false });
    }
  });

  return groups;
}

export default function MessageList({
  messages,
  loadMoreMessages,
  hasMore,
  loadingMore,
  loading = false,
  onDeleteMessage,
}) {
  const endRef = useRef(null);
  const containerRef = useRef(null);
  const previousScrollHeightRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  // Auto-scroll to bottom on new messages or initial load
  useEffect(() => {
    if (messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is rendered before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isInitialLoadRef.current) {
            // For initial load, scroll immediately to bottom
            if (containerRef.current) {
              containerRef.current.scrollTop =
                containerRef.current.scrollHeight;
            }
            isInitialLoadRef.current = false;
          } else {
            // For new messages, scroll smoothly
            endRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        });
      });
    }
  }, [messages]);

  // Check if we need to load more messages when container isn't scrollable
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    // Wait for DOM to render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // If content doesn't fill the container (no scrollbar), load more
        if (
          container.scrollHeight <= container.clientHeight &&
          hasMore &&
          !loadingMore
        ) {
          console.log("Container not scrollable, loading more messages...");
          loadMoreMessages();
        }
      });
    });
  }, [messages, loading, loadingMore, hasMore, loadMoreMessages]);

  // Reset initial load flag when loading state changes (new chat selected)
  useEffect(() => {
    if (loading) {
      isInitialLoadRef.current = true;
    }
  }, [loading]);

  // Handle scroll event to detect when user scrolls near top
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !loadMoreMessages || !hasMore || loadingMore) return;

    // If scrolled within 100px of the top, load more
    if (container.scrollTop < 100) {
      // Store current scroll height before loading
      previousScrollHeightRef.current = container.scrollHeight;
      loadMoreMessages();
    }
  }, [loadMoreMessages, hasMore, loadingMore]);

  // Restore scroll position after prepending messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container || previousScrollHeightRef.current === 0) return;

    // Calculate the difference in scroll height
    const newScrollHeight = container.scrollHeight;
    const scrollDelta = newScrollHeight - previousScrollHeightRef.current;

    // Adjust scroll position to maintain visual position
    if (scrollDelta > 0) {
      container.scrollTop += scrollDelta;
      previousScrollHeightRef.current = 0;
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pb-4 px-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
    >
      {loading ? (
        <>
          {Array.from({ length: 8 }).map((_, i) => {
            const isMine = i % 3 === 0;
            return (
              <div
                key={i}
                className={
                  "flex flex-col gap-1 max-w-[70%] " +
                  (isMine ? "self-end items-end" : "self-start items-start")
                }
              >
                <div className="flex items-center gap-2">
                  {!isMine && (
                    <div className="h-3 w-16 bg-slate-700 rounded animate-pulse" />
                  )}
                  <div className="h-2 w-12 bg-slate-700 rounded animate-pulse" />
                </div>
                <div
                  className={
                    "px-4 py-2 rounded-xl " +
                    (isMine
                      ? "bg-slate-700 animate-pulse h-12 w-48"
                      : "bg-slate-700 animate-pulse h-16 w-64")
                  }
                />
              </div>
            );
          })}
        </>
      ) : (
        <>
          {loadingMore && hasMore && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          )}
          {groupMessages(messages).map((item, idx) => {
            if (item.type === "date") {
              return (
                <div
                  key={`date-${idx}`}
                  className="flex items-center justify-center py-4"
                >
                  <div className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400 font-medium border border-slate-700">
                    {formatDateHeader(item.date)}
                  </div>
                </div>
              );
            }

            const m = item.msg;
            return (
              <div
                key={m.id}
                className={
                  "flex flex-col max-w-[70%] " +
                  (item.showTime ? "gap-1 " : "gap-0 ") +
                  (item.showTime ? "" : "-mt-3 ") +
                  (m.mine ? "self-end items-end" : "self-start items-start")
                }
                onMouseEnter={() => m.mine && setHoveredMessageId(m.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                {item.showTime && (
                  <div className="flex items-center gap-2">
                    {!m.mine && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {m.author}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">{m.time}</span>
                  </div>
                )}
                <div className="relative flex items-center gap-2">
                  {m.mine && hoveredMessageId === m.id && onDeleteMessage && (
                    <button
                      onClick={() => onDeleteMessage(m.id)}
                      className="p-1.5 rounded-full bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white transition-all"
                      title="Usuń wiadomość"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div
                    className={
                      "rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words " +
                      (item.showTime ? "px-4 py-2 " : "px-4 py-1.5 ") +
                      (m.mine
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-slate-800 text-slate-100 border border-slate-700")
                    }
                    style={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </>
      )}
    </div>
  );
}
