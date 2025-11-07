import React, { useMemo, useState } from "react";
import useAuth from "../hooks/useAuth.js";

export default function OrganizationDashboardPage() {
  const { user, organization: activeOrganization } = useAuth();

  const SAMPLE = {
    tags: ["Projekt1", "Projekt2", "Tag1"],
    chats: [
      { id: "c1", title: "Chat1", tags: ["Projekt1"] },
      { id: "c2", title: "Chat2", tags: ["Projekt2"] },
      { id: "c3", title: "Chat3", tags: ["Tag1", "Projekt1"] },
    ],
  };

  const [tags, setTags] = useState(SAMPLE.tags);
  const [chats, setChats] = useState(SAMPLE.chats);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [logic, setLogic] = useState("AND");

  const toggleTag = (t) =>
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats.filter((c) => !q || c.title.toLowerCase().includes(q));
  }, [chats, query]);

  const addChat = () => {
    const n = chats.length + 1;
    setChats((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, title: `Chat${n}`, tags: [] },
    ]);
  };
  const addTag = () => {
    const n = tags.length + 1;
    setTags((prev) => [...prev, `Tag${n}`]);
  };
  const addProject = () => {
    console.log("new project");
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-[clamp(24px,5vw,48px)] text-slate-100">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-[clamp(1.6rem,2.2vw,2.2rem)] font-semibold text-center">
          {activeOrganization?.name || "Organizacja"}
        </h1>
      </header>

      {/* Layout */}
      <div className="flex flex-1 gap-6 max-w-[90vw] mx-auto w-full overflow-hidden">
        {/* Left column (tags) */}
        <aside
          className="w-[450px] h-full bg-[rgba(15,23,42,0.92)] rounded-2xl border border-[rgba(148,163,184,0.35)] p-5 shrink-0 flex flex-col overflow-hidden min-h-0"
        >
          <div className="mb-4">
            <p className="text-[13px] text-slate-400">Imię i nazwisko</p>
            <p className="font-medium text-sm md:text-base">
              {`${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
                user?.username ||
                "Użytkownik"}
            </p>
          </div>

          <div className="border-t border-slate-600/30 pt-4 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm md:text-base text-slate-300">Tagi</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLogic("AND")}
                  className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-200
                    ${logic === "AND"
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-105"
                      : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 opacity-80"}`}
                >
                  AND
                </button>

                <button
                  onClick={() => setLogic("OR")}
                  className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-200
                    ${logic === "OR"
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-105"
                      : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 opacity-80"}`}
                >
                  OR
                </button>
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto pr-2 space-y-1.5 overscroll-contain">
              {tags.map((t) => (
                <li key={t}>
                  <label
                    htmlFor={`tag-${t}`}
                    className="group flex items-center gap-3 w-full cursor-pointer rounded-lg px-2 py-2 hover:bg-slate-800/30"
                  >
                    <input
                      id={`tag-${t}`}
                      type="checkbox"
                      checked={selectedTags.includes(t)}
                      onChange={() => toggleTag(t)}
                      className="peer sr-only"
                    />
                    <span
                      className="grid place-items-center h-5 w-5 rounded-md border border-slate-500/50 bg-slate-900/40
                                peer-checked:bg-sky-500 peer-checked:border-sky-500 transition-colors"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        className="h-3.5 w-3.5 text-sky-300 opacity-0 peer-checked:opacity-100 transition-opacity"
                      >
                        <path
                          d="M7.5 13.2 4.8 10.5l-1.3 1.3 4 4 9-9-1.3-1.3-7.7 7.7z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span className="text-sm md:text-[15px] text-slate-200 leading-none">
                      {t}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addProject}
              className="px-4 py-2 rounded-lg text-sm border border-slate-500/50 bg-slate-800/50 hover:bg-slate-700/60 hover:border-slate-400/70 transition w-max"
            >
              nowy projekt
            </button>
            <button
              onClick={addTag}
              className="px-4 py-2 rounded-lg text-sm border border-slate-500/50 bg-slate-800/50 hover:bg-slate-700/60 hover:border-slate-400/70 transition w-max"
            >
              nowy tag
            </button>
          </div>
        </aside>

        <div className="w-px bg-slate-600/30 rounded-full" />

        {/* Three-box area */}
        <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
          {/* Left big box: Chats */}
          <section className="basis-[30%] grow h-full bg-[rgba(15,23,42,0.92)] rounded-[24px] p-[clamp(24px,3vw,40px)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] text-slate-300 border border-[rgba(148,163,184,0.35)] flex flex-col min-h-0 overflow-hidden">
            <div className="mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj czatu..."
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900/70 border border-slate-600/40 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 overscroll-contain">
              {filteredChats.length === 0 ? (
                <p className="text-slate-400 text-sm">Brak wyników.</p>
              ) : (
                filteredChats.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-600/30 hover:border-slate-400/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-700/60 flex items-center justify-center text-[11px] font-medium">
                      {c.title.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[15px] md:text-base">
                        {c.title}
                      </p>
                      {c.tags?.length ? (
                        <p className="text-xs text-slate-400">
                          {c.tags.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="pt-4">
              <button
                onClick={addChat}
                className="px-4 py-2 rounded-lg text-sm border border-slate-500/50 bg-slate-800/50 hover:bg-slate-700/60 hover:border-slate-400/70 transition w-max"
              >
                nowy chat
              </button>
            </div>
          </section>

          {/* Right column: Calendar + Kanban */}
          <div className="flex flex-col basis-[45%] grow gap-6 h-full min-h-0">
            <div className="flex-1 min-h-0 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-[clamp(24px,3vw,40px)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex items-center justify-center text-slate-300 border border-[rgba(148,163,184,0.35)] overflow-hidden">
              Calendar
            </div>
            <div className="flex-1 min-h-0 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-[clamp(24px,3vw,40px)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex items-center justify-center text-slate-300 border border-[rgba(148,163,184,0.35)] overflow-hidden">
              Kanban
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
