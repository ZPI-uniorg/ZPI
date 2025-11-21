import React, { useEffect, useMemo, useState } from "react";
import useAuth from "../../../auth/useAuth.js";
import { KANBAN_BOARDS } from "../../../api/fakeData.js";
import ChatPanel from "../components/ChatPanel.jsx";
import MiniCalendar from "../components/MiniCalendar.jsx";
import KanbanPreview from "../components/KanbanPreview.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { getAllProjects, getUserProjects } from "../../../api/projects.js";

export default function OrganizationDashboardPage() {
  const { user, organization: activeOrganization } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const projectJustCreated = location.state?.projectJustCreated;
  const projectJustUpdated = location.state?.projectJustUpdated;

  const [projects, setProjects] = useState([]);
  const [localProjects, setLocalProjects] = useState([]);
  const [chats] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [logic, setLogic] = useState("AND");
  const [kanbanIndex, setKanbanIndex] = useState(0);
  const [projectsError, setProjectsError] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const mergeProjectData = (baseList, extras) => {
    const merged = Array.isArray(baseList) ? [...baseList] : [];
    extras
      .filter(Boolean)
      .forEach((extra) => {
        if (!extra || typeof extra !== "object") {
          return;
        }
        const extraId = Number(extra.id);
        if (Number.isNaN(extraId)) {
          merged.push(extra);
          return;
        }
        const existingIndex = merged.findIndex((project) => Number(project.id) === extraId);
        if (existingIndex >= 0) {
          merged[existingIndex] = {
            ...merged[existingIndex],
            ...extra,
          };
        } else {
          merged.push(extra);
        }
      });
    return merged;
  };

  useEffect(() => {
    if (!activeOrganization?.id || !user?.username) {
      setProjects([]);
      setProjectsLoading(false);
      setProjectsError(null);
      return;
    }

    let ignore = false;

    async function loadProjects() {
      if (ignore) {
        return;
      }

      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const fetcher = activeOrganization.role === "admin" ? getAllProjects : getUserProjects;
        const data = await fetcher(activeOrganization.id, user.username);
        if (ignore) {
          return;
        }
        const fetchedProjects = Array.isArray(data) ? data : [];
        const merged = mergeProjectData(fetchedProjects, localProjects);
        setProjects(merged);
        setKanbanIndex((currentIndex) =>
          merged.length === 0 ? 0 : Math.min(currentIndex, merged.length - 1)
        );
        setLocalProjects((currentLocal) => {
          if (currentLocal.length === 0) {
            return currentLocal;
          }
          const backendIds = new Set(
            fetchedProjects
              .map((project) => Number(project.id))
              .filter((id) => Number.isFinite(id))
          );
          const filtered = currentLocal.filter(
            (project) => !backendIds.has(Number(project?.id))
          );
          return filtered.length === currentLocal.length ? currentLocal : filtered;
        });
      } catch (err) {
        if (ignore) {
          return;
        }
        setProjectsError(
          err.response?.data?.error ??
            err.response?.data?.detail ??
            "Nie udało się pobrać projektów."
        );
        setProjects([]);
        setKanbanIndex(0);
      } finally {
        if (!ignore) {
          setProjectsLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      ignore = true;
    };
  }, [
    activeOrganization?.id,
    activeOrganization?.role,
    user?.username,
    location.key,
    localProjects,
  ]);

  useEffect(() => {
    if (!projectJustCreated && !projectJustUpdated) {
      return;
    }

    const extras = [projectJustCreated, projectJustUpdated];
    setLocalProjects((current) => mergeProjectData(current, extras));
    setProjects((current) => mergeProjectData(current, extras));
  }, [projectJustCreated, projectJustUpdated]);

  useEffect(() => {
    if (!projectJustCreated) {
      return;
    }

    const createdId = Number(projectJustCreated.id);
    if (Number.isNaN(createdId)) {
      return;
    }

    const index = projects.findIndex((project) => Number(project.id) === createdId);
    if (index >= 0) {
      setKanbanIndex(index);
    }
  }, [projectJustCreated, projects]);

  useEffect(() => {
    if (!projectJustCreated && !projectJustUpdated) {
      return;
    }

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
    setLocalProjects([]);
    setProjects([]);
    setKanbanIndex(0);
  }, [activeOrganization?.id]);

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
