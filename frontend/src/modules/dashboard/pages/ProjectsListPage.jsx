import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";
import useAuth from "../../../auth/useAuth.js";
import { Settings, FolderOpen, Calendar, Users } from "lucide-react";

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const { allProjects, projectsLoading, projectsInitialized, projectsError } =
    useProjects();
  const isAdmin = organization?.role === "admin";
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = allProjects.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      p.name?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.coordinator_username?.toLowerCase().includes(query)
    );
  });

  const handleProjectClick = (project) => {
    navigate("/kanban", { state: { projectId: project.id } });
  };

  const handleEditProject = (project, e) => {
    e.stopPropagation();
    navigate("/organization/project/new", { state: { project } });
  };

  return (
    <div className="h-full overflow-auto bg-[linear-gradient(145deg,#0f172a,#1e293b)] px-6 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Projekty</h1>
            <p className="text-slate-400">
              Przeglądaj i zarządzaj wszystkimi projektami w organizacji
            </p>
          </div>
          <button
            onClick={() => isAdmin && navigate("/organization/project/new")}
            disabled={!isAdmin}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
            title={
              isAdmin
                ? "Utwórz nowy projekt"
                : "Tylko administratorzy mogą tworzyć projekty"
            }
          >
            + Nowy projekt
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Szukaj projektu po nazwie, opisie lub koordynatorze..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
          />
        </div>

        {/* Loading State */}
        {!projectsInitialized || projectsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-400">Ładowanie projektów...</p>
          </div>
        ) : projectsError ? (
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-6 py-4 text-red-300">
            {projectsError}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto h-16 w-16 text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">
              {searchQuery
                ? "Nie znaleziono projektów pasujących do wyszukiwania"
                : "Brak projektów. Utwórz pierwszy projekt!"}
            </p>
          </div>
        ) : (
          /* Projects Grid */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const isCoordinator =
                project.coordinator_username === user?.username;
              const canEdit = isAdmin || isCoordinator;

              return (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="group relative bg-slate-900/95 rounded-2xl p-6 border border-slate-700/50 shadow-lg hover:shadow-xl hover:border-indigo-500/40 transition-all cursor-pointer"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-slate-100 truncate group-hover:text-indigo-300 transition">
                          {project.name}
                        </h3>
                      </div>
                    </div>
                    <button
                      onClick={(e) => canEdit && handleEditProject(project, e)}
                      disabled={!canEdit}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-800/60 transition opacity-0 group-hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      title={
                        canEdit
                          ? "Edytuj projekt"
                          : "Tylko koordynator i administrator mogą edytować projekt"
                      }
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Meta Information */}
                  {project.coordinator_username && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-400">Koordynator:</span>
                      <span
                        className={`font-medium truncate ${
                          isCoordinator ? "text-indigo-400" : "text-slate-300"
                        }`}
                      >
                        {project.coordinator_username}
                        {isCoordinator && " (Ty)"}
                      </span>
                    </div>
                  )}

                  {/* Tags/Labels and Coordinator Badge */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {isCoordinator && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Twój projekt
                      </span>
                    )}
                    {project.tags &&
                      project.tags.length > 0 &&
                      project.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
