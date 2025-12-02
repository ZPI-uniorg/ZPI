import React, { useEffect, useMemo, useState } from "react";
import useAuth from "../../../auth/useAuth.js";
import ChatPanel from "../components/ChatPanel.jsx";
import MiniCalendar from "../components/MiniCalendar.jsx";
import KanbanPreview from "../components/KanbanPreview.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";
import { getBoardWithContent } from "../../../api/kanban.js";

export default function OrganizationDashboardPage() {
  const { organization: activeOrganization, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const projectJustCreated = location.state?.projectJustCreated;
  const projectJustUpdated = location.state?.projectJustUpdated;

  const {
    projects,
    projectsLoading,
    projectsInitialized,
    projectsError,
    chats,
    chatsLoading,
    userMemberLoading,
  } = useProjects();

  const projectList = projects;
  const [kanbanIndex, setKanbanIndex] = useState(0);
  const currentProject = projectList[kanbanIndex] || null;

  // Fetch current project's board on demand
  const [kanbanBoard, setKanbanBoard] = useState(null);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [kanbanError, setKanbanError] = useState(null);

  useEffect(() => {
    if (!currentProject || !activeOrganization?.id || !user?.username) {
      setKanbanBoard(null);
      return;
    }
    let ignore = false;
    setKanbanLoading(true);
    setKanbanError(null);
    getBoardWithContent(activeOrganization.id, currentProject.id, user.username)
      .then((data) => {
        if (!ignore) setKanbanBoard(data);
      })
      .catch((err) => {
        if (!ignore)
          setKanbanError(
            err?.response?.data?.error ||
              err?.response?.data?.detail ||
              "Nie udało się pobrać tablicy Kanban"
          );
        setKanbanBoard(null);
      })
      .finally(() => {
        if (!ignore) setKanbanLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [currentProject?.id, activeOrganization?.id, user?.username]);

  const [query, setQuery] = useState("");
  const currentBoard = kanbanBoard;

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
    return result;
  }, [chats, query]);
  console.log("Chaty (po filtrach z kontekstu):", filteredChats);

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

  // Decide when to show the Kanban skeleton
  // Keep skeleton until projects are initialized; then rely on board loading
  const previewLoading =
    !projectsInitialized ||
    userMemberLoading ||
    projectsLoading ||
    (currentProject ? kanbanLoading : false);

  return (
    <div className="flex h-full flex-col min-h-0 overflow-x-auto overflow-y-auto bg-[linear-gradient(145deg,#0f172a,#1e293b)] px-4 md:px-[clamp(24px,5vw,48px)] py-4 text-slate-100">
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4 md:gap-6 w-full max-w-full">
        <div className="lg:basis-[30%] min-h-[300px] lg:min-h-0 flex-shrink-0 max-w-full">
          <ChatPanel
            chats={filteredChats}
            loading={chatsLoading}
            query={query}
            setQuery={setQuery}
            addChat={() => navigate("/chat/new")}
            isAdmin={activeOrganization?.role === "admin"}
          />
        </div>
        <div className="flex flex-col lg:basis-[45%] grow gap-4 md:gap-6 min-h-0 max-w-full min-w-0">
          <div className="flex-1 min-h-[300px] lg:min-h-0 bg-[rgba(15,23,42,0.92)] rounded-[20px] md:rounded-[24px] p-3 md:p-4 shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex items-start justify-center text-slate-300 border border-[rgba(148,163,184,0.35)] overflow-auto">
            <MiniCalendar />
          </div>
          <div className="flex-1 min-h-[300px] lg:min-h-0 bg-[rgba(15,23,42,0.92)] rounded-[20px] md:rounded-[24px] p-3 md:p-4 shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex flex-col text-slate-300 border border-[rgba(148,163,184,0.35)] overflow-auto">
            <KanbanPreview
              project={currentProject}
              board={currentBoard}
              onPrev={prevKanban}
              onNext={nextKanban}
              loading={previewLoading}
              projectsLoading={
                !projectsInitialized || userMemberLoading || projectsLoading
              }
              projectsInitialized={projectsInitialized}
              error={kanbanError || projectsError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
