import React, { useMemo, useState } from "react";
import useAuth from "../../../auth/useAuth.js";
import { TAGS, CHATS, PROJECTS } from "../../../api/fakeData.js";
import { KANBAN_BOARDS } from "../../../api/fakeData.js";
import TagList from "../components/TagList.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import MiniCalendar from "../components/MiniCalendar.jsx";
import KanbanPreview from "../components/KanbanPreview.jsx";
import { useNavigate } from "react-router-dom";

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
    <div className="flex h-full flex-col min-h-0 overflow-hidden bg-[linear-gradient(145deg,#0f172a,#1e293b)] px-[clamp(24px,5vw,48px)] py-4 text-slate-100">
      <div className="flex flex-1 min-h-0 gap-6 max-w-[90vw] mx-auto w-full overflow-hidden">
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
  );
}
