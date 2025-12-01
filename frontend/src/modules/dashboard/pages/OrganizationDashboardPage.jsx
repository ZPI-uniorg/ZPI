import React, { useEffect, useMemo, useState } from "react";
import useAuth from "../../../auth/useAuth.js";
import { KANBAN_BOARDS } from "../../../api/fakeData.js";
import ChatPanel from "../components/ChatPanel.jsx";
import MiniCalendar from "../components/MiniCalendar.jsx";
import KanbanPreview from "../components/KanbanPreview.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";
import apiClient from "../../../api/client.js";
import { getUserEvents, getAllEvents } from "../../../api/events.js";
import { getBoardWithContent } from "../../../api/kanban.js";
import { Plus } from "lucide-react";

export default function OrganizationDashboardPage() {
  const { organization: activeOrganization, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const projectJustCreated = location.state?.projectJustCreated;
  const projectJustUpdated = location.state?.projectJustUpdated;

  const { projects, projectsLoading, projectsError } = useProjects();

  const projectList = projects;
  const [kanbanIndex, setKanbanIndex] = useState(0);
  const currentProject = projectList[kanbanIndex] || null;

  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [kanbanBoard, setKanbanBoard] = useState(null);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [kanbanError, setKanbanError] = useState(null);
  // Fetch chats from backend for active organization
  useEffect(() => {
    const orgId = activeOrganization?.id;
    if (!orgId) return;
    let cancelled = false;
    setChatsLoading(true);
    apiClient
      .get(`chats/my/${orgId}`)
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
  // Fetch events from backend
  useEffect(() => {
    if (!activeOrganization?.id || !user?.username) return;
    let ignore = false;
    setEventsLoading(true);

    const parseEventRow = (ev) => {
      const rawStart = ev.start_time ? String(ev.start_time) : "";
      const rawEnd = ev.end_time ? String(ev.end_time) : "";
      const splitStart = rawStart.includes("T")
        ? rawStart.replace("T", " ").split(" ")
        : rawStart.split(" ");
      const splitEnd = rawEnd.includes("T")
        ? rawEnd.replace("T", " ").split(" ")
        : rawEnd.split(" ");
      const datePart = splitStart[0] || "";
      const startTimePart = (splitStart[1] || "")
        .replace("+00:00", "")
        .slice(0, 5);
      const endTimePart = (splitEnd[1] || "").replace("+00:00", "").slice(0, 5);

      const perms = ev.permissions || ev.tags || [];
      const tagCombinations = perms
        .filter((p) => p.includes("+"))
        .map((p) => p.split("+").filter(Boolean));
      const plainTags = perms.filter((p) => !p.includes("+"));

      return {
        id: ev.event_id,
        event_id: ev.event_id,
        title: ev.name,
        name: ev.name,
        description: ev.description || "",
        start_time: startTimePart || "",
        end_time: endTimePart || "",
        date: datePart,
        tags: plainTags,
        tagCombinations,
      };
    };

    const fetch = async () => {
      try {
        let data;
        if (activeOrganization.role === "admin") {
          data = await getAllEvents(activeOrganization.id, user.username);
        } else {
          data = await getUserEvents(activeOrganization.id, user.username);
          if (Array.isArray(data) && data.length === 0) {
            try {
              const adminData = await getAllEvents(
                activeOrganization.id,
                user.username
              );
              if (adminData?.length) data = adminData;
            } catch (_) {
              /* ignore */
            }
          }
        }
        if (ignore) return;
        const mapped = (data || []).map(parseEventRow);
        setEvents(mapped);
      } catch (err) {
        if (ignore) return;
        console.error("Failed to load events:", err);
      } finally {
        if (!ignore) setEventsLoading(false);
      }
    };

    fetch();
    return () => {
      ignore = true;
    };
  }, [activeOrganization?.id, activeOrganization?.role, user?.username]);

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
  const [selectedTags, setSelectedTags] = useState([]);
  const [logic, setLogic] = useState("AND");
  // (removed duplicate declarations)
  const currentBoard = currentProject ? KANBAN_BOARDS[currentProject.id] : null;

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
            <MiniCalendar
              selectedTags={selectedTags}
              logic={logic}
              events={events}
              loading={eventsLoading}
            />
          </div>
          <div className="flex-1 min-h-0 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-4 shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex flex-col text-slate-300 border border-[rgba(148,163,184,0.35)] overflow-hidden">
            <KanbanPreview
              project={currentProject}
              board={kanbanBoard}
              onPrev={prevKanban}
              onNext={nextKanban}
              loading={kanbanLoading || projectsLoading}
              error={kanbanError || projectsError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
