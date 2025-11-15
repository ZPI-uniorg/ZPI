import React, { useMemo, useState } from "react";
import useAuth from "../../../auth/useAuth.js";
import { TAGS, CHATS, PROJECTS } from "../../../api/fakeData.js";
import { KANBAN_BOARDS } from "../../../api/fakeData.js";
import TagList from "../components/TagList.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import MiniCalendar from "../components/MiniCalendar.jsx";
import KanbanPreview from "../components/KanbanPreview.jsx";
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
  const [kanbanIndex, setKanbanIndex] = useState(0);

  const toggleTag = (t) =>
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = chats;

    // Filtruj po zapytaniu tekstowym
    if (q) {
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }

    // Filtruj po wybranych tagach
    if (selectedTags.length > 0) {
      result = result.filter((c) => {
        if (logic === "AND") {
          // Czat musi mieć wszystkie wybrane tagi i żadnych innych
          const chatTags = c.tags || [];
          return (
            selectedTags.every((tag) => chatTags.includes(tag)) &&
            chatTags.every((tag) => selectedTags.includes(tag))
          );
        } else {
          // Przynajmniej jeden wybrany tag musi być w czacie
          return selectedTags.some((tag) => c.tags?.includes(tag));
        }
      });
    }

    return result;
  }, [chats, query, selectedTags, logic]);

  const addChat = () => navigate("/chat/new");

  const addTag = () => navigate("/organization/tag/new");

  const addProject = () => navigate("/organization/project/new");

  const allTagsAndProjects = [...tags, ...projects.map((p) => p.name)];
  const projectList = projects; // tylko projekty (nie tagi)
  const currentProject = projectList[kanbanIndex] || null;
  const currentBoard = currentProject ? KANBAN_BOARDS[currentProject.id] : null;

  const prevKanban = () => {
    setKanbanIndex((i) =>
      projectList.length === 0
        ? 0
        : (i - 1 + projectList.length) % projectList.length
    );
  };
  const nextKanban = () => {
    setKanbanIndex((i) => (projectList.length === 0 ? 0 : (i + 1) % projectList.length));
  };

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

      <div className="flex flex-1 gap-6 max-w-[90vw] mx-auto w-full overflow-hidden min-h-0">
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
          <div className="flex flex-col basis-[45%] grow gap-6 h-full min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-[clamp(24px,3vw,40px)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex items-start justify-center text-slate-300 border border-[rgba(148,163,184,0.35)] overflow-hidden">
              <MiniCalendar selectedTags={selectedTags} logic={logic} />
            </div>
            <div className="flex-1 min-h-0 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-[clamp(24px,3vw,40px)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex flex-col text-slate-300 border border-[rgba(148,163,184,0.35)] overflow-hidden">
              <KanbanPreview
                project={currentProject}
                board={currentBoard}
                onPrev={prevKanban}
                onNext={nextKanban}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
