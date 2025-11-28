import { useEffect, useRef, useCallback } from "react";

export default function MessageList({
  messages,
  loadMoreMessages,
  hasMore,
  loadingMore,
}) {
  const endRef = useRef(null);
  const containerRef = useRef(null);
  const previousScrollHeightRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      {loadingMore && hasMore && (
        <div className="text-center py-2 text-slate-400 text-sm">
          Ładowanie starszych wiadomości...
        </div>
      )}
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
              "group relative px-4 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words " +
              (m.mine
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md"
                : "bg-slate-800 text-slate-100 border border-slate-700")
            }
            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
          >
            {m.text}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
