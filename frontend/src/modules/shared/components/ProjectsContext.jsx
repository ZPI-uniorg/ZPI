import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import useAuth from "../../../auth/useAuth.js";
import { getAllProjects, getUserProjects } from "../../../api/projects.js";
import { getAllEvents, getUserEvents } from "../../../api/events.js";
import { getOrganizationMembers } from "../../../api/organizations.js";
import apiClient from "../../../api/client.js";

const ProjectsContext = createContext(null);
export const useProjects = () => useContext(ProjectsContext);

export function ProjectsProvider({
  children,
  projectJustCreated,
  projectJustUpdated,
}) {
  const { organization, user } = useAuth();

  const [state, setState] = useState({
    userMember: null,
    userMemberLoading: true,
    userMemberError: null,

    projects: [],
    localProjects: [],
    projectsLoading: true,
    projectsError: null,
    projectsInitialized: false,

    allEvents: [],
    eventsByProject: {},
    eventsLoading: true,
    eventsError: null,

    chats: [],
    chatsLoading: true,
    chatsError: null,

    selectedTags: [],
    logic: "OR",
  });

  const projectTags = useMemo(() => {
    const tags = {};
    state.projects.forEach((p) => {
      tags[p.id] = p.tags || p.permissions || [];
    });
    return tags;
  }, [state.projects]);

  const mergeProjects = useCallback((baseList, extras) => {
    const merged = [...(baseList || [])];
    extras.filter(Boolean).forEach((extra) => {
      const idx = merged.findIndex(
        (p) =>
          Number(p.id) === Number(extra.id) ||
          (extra.name && p.name === extra.name)
      );
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...extra };
      } else {
        merged.push(extra);
      }
    });
    return merged;
  }, []);

  const loadUserMember = useCallback(async () => {
    setState((s) => ({ ...s, userMemberLoading: true, userMemberError: null }));
    try {
      const data = await getOrganizationMembers(organization.id, user.username);
      const members = Array.isArray(data) ? data : [];
      const member = members.find((m) => m.username === user.username);
      if (member) {
        setState((s) => ({
          ...s,
          userMember: member,
          userMemberLoading: false,
        }));
      } else {
        console.error("User member not found in organization");
        setState((s) => ({
          ...s,
          userMemberError: "Nie znaleziono użytkownika w organizacji.",
          userMemberLoading: false,
        }));
      }
    } catch (err) {
      console.error("Failed to load user member:", err);
      setState((s) => ({
        ...s,
        userMemberError: "Nie udało się pobrać danych użytkownika.",
        userMemberLoading: false,
      }));
    }
  }, [organization.id, user.username]);

  const loadProjects = useCallback(
    async (userMember) => {
      if (!userMember) {
        console.warn("loadProjects: no userMember provided");
        return;
      }

      setState((s) => ({ ...s, projectsLoading: true, projectsError: null }));
      try {
        const isAdmin = userMember.role === "admin";
        const fetchFn = isAdmin ? getAllProjects : getUserProjects;
        const data = await fetchFn(organization.id, user.username);
        const fetched = Array.isArray(data) ? data : [];

        // Mapuj projekty - dodaj pole tags z nazwą projektu
        const projectsWithTags = fetched.map((p) => ({
          ...p,
          tags: p.name ? [p.name] : [],
        }));

        console.log(
          "Projects loaded:",
          projectsWithTags.map((p) => ({
            id: p.id,
            name: p.name,
            tags: p.tags,
          }))
        );

        setState((s) => ({
          ...s,
          projects: mergeProjects(projectsWithTags, s.localProjects),
          localProjects: s.localProjects.filter(
            (local) =>
              !fetched.some(
                (fp) =>
                  fp.name === local.name || Number(fp.id) === Number(local.id)
              )
          ),
          projectsLoading: false,
          projectsInitialized: true,
        }));
      } catch (err) {
        console.error("Failed to load projects:", err);
        setState((s) => ({
          ...s,
          projectsError:
            err.response?.data?.error ||
            err.response?.data?.detail ||
            "Nie udało się pobrać projektów.",
          projects: mergeProjects([], s.localProjects),
          projectsLoading: false,
          projectsInitialized: true,
        }));
      }
    },
    [organization.id, user.username, mergeProjects]
  );

  const loadEvents = useCallback(
    async (userMember, projects, startDate = null, endDate = null) => {
      if (!userMember || !projects || projects.length === 0) {
        return;
      }

      setState((s) => ({ ...s, eventsLoading: true, eventsError: null }));
      try {
        const isAdmin = userMember.role === "admin";
        const fetchFn = isAdmin ? getAllEvents : getUserEvents;
        const data = await fetchFn(
          organization.id,
          user.username,
          startDate,
          endDate
        );
        const events = Array.isArray(data) ? data : [];

        console.log(
          "Events loaded:",
          events.map((e) => ({
            id: e.event_id,
            name: e.name,
            tags: e.permissions || e.tags,
          }))
        );

        // Replace events with the newly fetched ones for the requested date range
        // The backend already filters by date, so we don't need to accumulate
        const grouped = {};
        events.forEach((ev) => {
          const perms = ev.permissions || ev.tags || [];

          // Extract all tags from permissions, including those in combined tags
          const allEventTags = new Set();
          perms.forEach((perm) => {
            if (perm.includes("+")) {
              // Split combined tag and add each component
              perm.split("+").forEach((tag) => allEventTags.add(tag.trim()));
            } else {
              allEventTags.add(perm);
            }
          });

          projects.forEach((p) => {
            const tags = p.tags || p.permissions || [];
            // Check if any project tag matches any event tag (including from combined tags)
            if (
              tags.some((t) => allEventTags.has(t)) ||
              (p.name && allEventTags.has(p.name))
            ) {
              grouped[p.id] = grouped[p.id] || [];
              grouped[p.id].push(ev);
            }
          });
        });

        setState((s) => ({
          ...s,
          allEvents: events,
          eventsByProject: grouped,
          eventsLoading: false,
        }));
      } catch (err) {
        console.error("Failed to load events:", err);
        setState((s) => ({
          ...s,
          eventsError: "Nie udało się pobrać wydarzeń.",
          eventsLoading: false,
        }));
      }
    },
    [organization.id, user.username]
  );

  const loadChats = useCallback(
    async (userMember) => {
      if (!userMember) return;

      setState((s) => ({ ...s, chatsLoading: true, chatsError: null }));
      try {
        const isAdmin = userMember.role === "admin";
        const endpoint = isAdmin
          ? `chats/all/${organization.id}/`
          : `chats/my/${organization.id}/`;
        const res = await apiClient.get(endpoint);
        const chats = (res.data?.chats || []).map((c) => ({
          chat_id: c.chat_id,
          title: c.name,
          tags: c.tags || [],
        }));

        console.log(
          "Chats loaded:",
          chats.map((c) => ({ id: c.chat_id, title: c.title, tags: c.tags }))
        );

        setState((s) => ({ ...s, chats, chatsLoading: false }));
      } catch (err) {
        console.error("Failed to load chats:", err);
        setState((s) => ({
          ...s,
          chatsError: "Nie udało się pobrać czatów.",
          chatsLoading: false,
        }));
      }
    },
    [organization.id]
  );

  useEffect(() => {
    loadUserMember();
  }, [loadUserMember]);

  useEffect(() => {
    if (state.userMember) {
      loadProjects(state.userMember);
      loadChats(state.userMember);
    }
  }, [state.userMember, loadProjects, loadChats]);

  // Events are loaded on-demand by calendar components via loadEventsForDateRange

  useEffect(() => {
    if (!projectJustCreated && !projectJustUpdated) return;
    const extras = [projectJustCreated, projectJustUpdated];
    setState((s) => ({
      ...s,
      localProjects: mergeProjects(s.localProjects, extras),
      projects: mergeProjects(s.projects, extras),
    }));
  }, [projectJustCreated, projectJustUpdated, mergeProjects]);

  // Baseline events fetch for the current month once user and projects are ready
  useEffect(() => {
    if (!state.userMember || state.projects.length === 0) return;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      lastDay.getDate()
    ).padStart(2, "0")}`;
    loadEvents(state.userMember, state.projects, startDate, endDate);
  }, [state.userMember, state.projects, loadEvents]);

  const filterByProjects = useCallback((items, selectedProjectIds) => {
    if (!Array.isArray(items)) return [];
    if (!selectedProjectIds?.length) return items;
    const idSet = new Set(selectedProjectIds.map(Number));
    return items.filter((it) =>
      idSet.has(Number(it.project_id || it.project?.id))
    );
  }, []);

  // Filtrowanie projektów - zawsze OR (pokaż wszystkie zaznaczone)
  const filteredProjects = useMemo(() => {
    const sel = Array.isArray(state.selectedTags) ? state.selectedTags : [];
    if (!sel.length) return state.projects;
    return state.projects.filter((p) => {
      const tags = p.tags || p.permissions || [];
      return sel.some((tag) => tags.includes(tag));
    });
  }, [state.projects, state.selectedTags]);

  // Filtrowanie chatów
  const filteredChats = useMemo(() => {
    const sel = Array.isArray(state.selectedTags) ? state.selectedTags : [];
    if (!sel.length) return state.chats;
    return state.chats.filter((c) => {
      if (state.logic === "AND") {
        return sel.every((tag) => c.tags?.includes(tag));
      } else {
        return sel.some((tag) => c.tags?.includes(tag));
      }
    });
  }, [state.chats, state.selectedTags, state.logic]);

  // Filtrowanie eventów
  const filteredEventsByProject = useMemo(() => {
    const result = {};
    const sel = Array.isArray(state.selectedTags) ? state.selectedTags : [];
    const entries =
      state.eventsByProject && typeof state.eventsByProject === "object"
        ? Object.entries(state.eventsByProject)
        : [];
    entries.forEach(([pid, events]) => {
      if (!Array.isArray(events)) return;
      result[pid] = !sel.length
        ? events
        : events.filter((ev) => {
            const tags = ev.permissions || ev.tags || [];
            if (state.logic === "AND") {
              return sel.every((tag) => tags.includes(tag));
            } else {
              return sel.some((tag) => tags.includes(tag));
            }
          });
    });
    return result;
  }, [state.eventsByProject, state.selectedTags, state.logic]);

  // Create stable callback that uses current state via closure
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadEventsForDateRange = useCallback(
    (startDate, endDate) => {
      const currentState = stateRef.current;
      if (currentState.userMember && currentState.projects.length > 0) {
        return loadEvents(
          currentState.userMember,
          currentState.projects,
          startDate,
          endDate
        );
      }
      return Promise.resolve();
    },
    [loadEvents]
  );

  const value = useMemo(
    () => ({
      userMember: state.userMember,
      userMemberLoading: state.userMemberLoading,
      userMemberError: state.userMemberError,
      userRole: state.userMember?.role || null,
      userTags: state.userMember?.permissions || state.userMember?.tags || [],

      projects: filteredProjects,
      projectsLoading: state.projectsLoading,
      projectsInitialized: state.projectsInitialized,
      projectsError: state.projectsError,
      refreshProjects: () => state.userMember && loadProjects(state.userMember),
      projectTags,

      allEvents: state.allEvents,
      eventsByProject: filteredEventsByProject,
      eventsLoading: state.eventsLoading,
      eventsError: state.eventsError,
      loadEventsForDateRange,

      chats: filteredChats,
      chatsLoading: state.chatsLoading,
      chatsError: state.chatsError,

      selectedTags: state.selectedTags,
      setSelectedTags: (tags) => {
        const next = Array.isArray(tags)
          ? tags
          : tags == null
          ? []
          : [String(tags)];
        setState((s) => ({ ...s, selectedTags: next }));
      },
      logic: state.logic,
      setLogic: (logic) => setState((s) => ({ ...s, logic })),

      filterByProjects,
    }),
    [
      state,
      projectTags,
      loadProjects,
      loadEvents,
      loadEventsForDateRange,
      filterByProjects,
      filteredProjects,
      filteredChats,
      filteredEventsByProject,
    ]
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}
