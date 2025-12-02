import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { Settings, Filter, Plus, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ProjectsProvider,
  useProjects,
} from "../components/ProjectsContext.jsx";
import FiltersPanel from "./FiltersPanel.jsx";

const NAV_LINKS = [
  { to: "/dashboard", label: "Pulpit organizacji" },
  { to: "/projects", label: "Projekty" },
  { to: "/calendar", label: "Kalendarz" },
  { to: "/kanban", label: "Kanban" },
  { to: "/chat", label: "Chaty" },
];

function AppLayoutContent() {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Only allow admins to see the settings button
  // (already declared above)
  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.username;
  const { selectedTags, setSelectedTags, logic, setLogic } = useProjects();
  const isAdmin = organization?.role === "admin";

  // Redirect non-admins away from /organizations (settings) page
  useEffect(() => {
    if (!isAdmin && location.pathname.startsWith("/organizations")) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, location.pathname, navigate]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFiltersOpen(params.has("filters"));
  }, [location.search]);

  const openFilters = () => {
    const params = new URLSearchParams(location.search);
    if (!params.has("filters")) {
      params.set("filters", "1");
      navigate({ search: `?${params.toString()}` }, { replace: true });
    }
  };
  const closeFilters = () => {
    const params = new URLSearchParams(location.search);
    if (params.has("filters")) {
      params.delete("filters");
      navigate(
        { search: params.toString() ? `?${params.toString()}` : "" },
        { replace: true }
      );
    }
  };
  const toggleTag = (t) => {
    const newTags = selectedTags.includes(t)
      ? selectedTags.filter((x) => x !== t)
      : [...selectedTags, t];
    setSelectedTags(newTags);
  };

  const getLinkClassName = ({ isActive }) => {
    const base =
      "px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150";
    return isActive
      ? `${base} bg-sky-500/20 text-sky-200 border border-sky-500/40`
      : `${base} text-slate-300 hover:text-white hover:bg-slate-700/40`;
  };

  // Only allow admins to see the settings button
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur border-b border-slate-800">
        <div className="mx-auto max-w-full px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-lg font-semibold text-white whitespace-nowrap">
                UniOrg
              </span>
              {organization?.name && (
                <span className="text-sm text-slate-400 truncate max-w-[160px]">
                  {organization.name}
                </span>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate("/organizations")}
                  className="p-2 rounded-lg hover:bg-slate-700/40 transition text-slate-300"
                  title="Ustawienia organizacji"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={openFilters}
                className="p-2 rounded-lg hover:bg-slate-700/40 transition text-slate-300"
                title="Filtry"
              >
                <Filter className="w-5 h-5" />
              </button>
              <nav className="flex items-center gap-2 ml-6">
                {NAV_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={getLinkClassName}
                    end={link.to === "/"}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
              >
                <User className="w-4 h-4" />
                <span>{fullName}</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-auto">
        <Outlet />
        <FiltersPanel
          filtersOpen={filtersOpen}
          openFilters={openFilters}
          closeFilters={closeFilters}
          selectedTags={selectedTags}
          logic={logic}
          setLogic={setLogic}
          toggleTag={toggleTag}
        />
      </main>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const projectJustCreated = location.state?.projectJustCreated;
  const projectJustUpdated = location.state?.projectJustUpdated;

  return (
    <ProjectsProvider
      projectJustCreated={projectJustCreated}
      projectJustUpdated={projectJustUpdated}
    >
      <AppLayoutContent />
    </ProjectsProvider>
  );
}

export default AppLayout;
