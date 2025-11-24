import React, { useEffect, useMemo, useState } from "react";
import useAuth from "../../../auth/useAuth.js";
import { KANBAN_BOARDS } from "../../../api/fakeData.js";
import ChatPanel from "../components/ChatPanel.jsx";
import MiniCalendar from "../components/MiniCalendar.jsx";
import KanbanPreview from "../components/KanbanPreview.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";
import apiClient from "../../../api/client.js";

export default function OrganizationDashboardPage() {
  const { organization: activeOrganization } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const projectJustCreated = location.state?.projectJustCreated;
  const projectJustUpdated = location.state?.projectJustUpdated;

  const { projects, projectsLoading, projectsError } = useProjects();

  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  // Fetch chats from backend for active organization
  useEffect(() => {
    const orgId = activeOrganization?.id;
    if (!orgId) return;
    let cancelled = false;
    setChatsLoading(true);
    apiClient
      .get("chats/", { params: { organization: orgId } })
      .then((res) => {
        if (cancelled) return;
        const serverChats = (res.data?.chats || []).map((c) => ({
          chat_it: c.chat_it,
          title: c.name,
          tags: [],
          tagCombinations: [],
        }));
        setChats(serverChats);
      })
      .catch((e) => {
        console.error(
          "Chat list fetch failed",
          e.response?.status,
          e.response?.data || e.message
        );
      })
      .finally(() => {
        if (!cancelled) setChatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrganization?.id]);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [logic, setLogic] = useState("AND");
  const [kanbanIndex, setKanbanIndex] = useState(0);

  useEffect(() => {
    if (!projectJustCreated) return;
    const createdId = Number(projectJustCreated.id);
    if (Number.isNaN(createdId)) return;
    const index = projects.findIndex((p) => Number(p.id) === createdId);
    if (index >= 0) setKanbanIndex(index);
  }, [projectJustCreated, projects]);

  useEffect(() => {
    if (!projectJustCreated && !projectJustUpdated) return;
    if (typeof window === "undefined") {
      navigate(location.pathname, { replace: true, state: undefined });
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      navigate(location.pathname, { replace: true, state: undefined });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [projectJustCreated, projectJustUpdated, navigate, location.pathname]);

  useEffect(() => {
    setKanbanIndex((i) =>
      projects.length === 0 ? 0 : Math.min(i, projects.length - 1)
    );
  }, [projects.length, activeOrganization?.id]);

  const filteredChats = useMemo(() => {
    let result = chats;
    const q = query.trim().toLowerCase();
    if (q) result = result.filter((c) => c.title.toLowerCase().includes(q));
    if (selectedTags.length > 0) {
      result = result.filter((c) =>
        logic === "AND"
          ? selectedTags.every((t) => c.tags?.includes(t)) &&
            (c.tags || []).every((t) => selectedTags.includes(t))
          : selectedTags.some((t) => c.tags?.includes(t))
      );
    }
    return result;
  }, [chats, query, selectedTags, logic]);

  const projectList = projects;
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
    setKanbanIndex((i) =>
      projectList.length === 0 ? 0 : (i + 1) % projectList.length
    );
  };

  return (
    <div className="flex h-full flex-col min-h-0 overflow-hidden bg-[linear-gradient(145deg,#0f172a,#1e293b)] px-[clamp(24px,5vw,48px)] py-4 text-slate-100">
      <div className="flex flex-1 min-h-0 gap-6 max-w-[90vw] mx-auto w-full overflow-hidden">
        <ChatPanel
          chats={filteredChats}
          loading={chatsLoading}
          query={query}
          setQuery={setQuery}
          addChat={() => navigate("/chat/new")}
        />
        <div className="flex flex-col basis-[45%] grow gap-6 h-full min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-4 shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex items-start justify-center text-slate-300 border border-[rgba(148,163,184,0.35)] overflow-hidden">
            <MiniCalendar selectedTags={selectedTags} logic={logic} />
          </div>
          <div className="flex-1 min-h-0 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-4 shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex flex-col text-slate-300 border border-[rgba(148,163,184,0.35)] overflow-hidden">
            <KanbanPreview
              project={currentProject}
              board={currentBoard}
              onPrev={prevKanban}
              onNext={nextKanban}
              loading={projectsLoading}
              error={projectsError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
