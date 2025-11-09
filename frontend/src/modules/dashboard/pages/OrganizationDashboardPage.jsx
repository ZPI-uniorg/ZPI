import React, { useMemo, useState } from "react";
import useAuth from "../../../auth/useAuth.js";
import { TAGS, CHATS, PROJECTS } from "../../../api/fakeData.js";
import TagList from "../components/TagList.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import MiniCalendar from "../components/MiniCalendar.jsx";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";

export default function OrganizationDashboardPage() {
  const { user, organization: activeOrganization } = useAuth();
  const navigate = useNavigate();

  const [tags, setTags] = useState(TAGS);
  const [projects, setProjects] = useState(PROJECTS);
  const [chats, setChats] = useState(CHATS);
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

  const addChat = () =>
    setChats((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, title: `Chat${prev.length + 1}`, tags: [] },
    ]);

  const addTag = () => navigate("/organization/tag/new");

  const addProject = () => navigate("/organization/project/new");

  const allTagsAndProjects = [...tags, ...projects.map((p) => p.name)];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-[clamp(24px,5vw,48px)] text-slate-100">
      <header className="mb-6">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-[clamp(1.6rem,2.2vw,2.2rem)] font-semibold text-center m-0">
            {activeOrganization?.name || "Organizacja"}
          </h1>
          <button
            type="button"
            onClick={() => navigate("/organization")}
            className="ml-2 p-2 rounded-full hover:bg-slate-700/40 transition flex items-center"
            title="Edytuj członków i tagi organizacji"
          >
            <Pencil className="w-6 h-6 text-slate-300" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-6 max-w-[90vw] mx-auto w-full overflow-hidden">
        <aside className="w-[450px] h-full bg-[rgba(15,23,42,0.92)] rounded-2xl border border-[rgba(148,163,184,0.35)] p-5 shrink-0 flex flex-col overflow-hidden min-h-0">
          <div className="mb-4">
            <p className="text-[13px] text-slate-400">Imię i nazwisko</p>
            <p className="font-medium text-sm md:text-base">
              {`${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
                user?.username ||
                "Użytkownik"}
            </p>
          </div>

          <TagList
            tags={allTagsAndProjects}
            projects={projects}
            selectedTags={selectedTags}
            logic={logic}
            setLogic={setLogic}
            toggleTag={toggleTag}
          />

          <div className="mt-4 flex gap-2">
            <button
              onClick={addProject}
              className="flex-1 py-3 rounded-[14px] text-sm font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30 hover:brightness-110 transition"
            >
              nowy projekt
            </button>
            <button
              onClick={addTag}
              className="flex-1 py-3 rounded-[14px] text-sm font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30 hover:brightness-110 transition"
            >
              nowy tag
            </button>
          </div>
        </aside>

        <div className="w-px bg-slate-600/30 rounded-full" />

        <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
          <ChatPanel
            chats={filteredChats}
            query={query}
            setQuery={setQuery}
            addChat={addChat}
          />
          <div className="flex flex-col basis-[45%] grow gap-6 h-full min-h-0">
            <div className="flex-1 min-h-0 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-[clamp(24px,3vw,40px)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex items-start justify-center text-slate-300 border border-[rgba(148,163,184,0.35)] overflow-hidden">
              <MiniCalendar selectedTags={selectedTags} />
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
