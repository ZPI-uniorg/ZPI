import { createContext, useContext, useState, useEffect } from 'react';
import useAuth from '../../../auth/useAuth.js';
import { getAllProjects, getUserProjects } from '../../../api/projects.js';

const ProjectsContext = createContext(null);
export const useProjects = () => useContext(ProjectsContext);

export function ProjectsProvider({ children, projectJustCreated, projectJustUpdated }) {
  const { organization, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [localProjects, setLocalProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);

  const mergeProjectData = (baseList, extras) => {
    const merged = Array.isArray(baseList) ? [...baseList] : [];
    extras.filter(Boolean).forEach(extra => {
      if (!extra || typeof extra !== 'object') return;
      const idNum = Number(extra.id);
      if (Number.isFinite(idNum) && idNum > 0) {
        const idx = merged.findIndex(p => Number(p.id) === idNum);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...extra };
          return;
        }
      }
      if (extra.name && merged.some(p => p.name === extra.name)) return;
      merged.push(extra);
    });
    return merged;
  };

  const loadProjects = async () => {
    if (!organization?.id || !user?.username) {
      setProjects([]);
      setProjectsLoading(false);
      setProjectsError(null);
      return;
    }
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      let data = [];
      // Próba ALL (admin) nawet jeśli brak organization.role – backend sam zweryfikuje rolę
      try {
        data = await getAllProjects(organization.id, user.username);
      } catch (innerErr) {
        const status = innerErr?.response?.status;
        const msg = innerErr?.response?.data?.error || innerErr?.response?.data?.detail || '';
        if (status === 403 || status === 401 || /permission/i.test(msg)) {
          // fallback do projektów użytkownika
          data = await getUserProjects(organization.id, user.username);
        } else {
          throw innerErr;
        }
      }
      const fetched = Array.isArray(data) ? data : [];
      setProjects(mergeProjectData(fetched, localProjects));
      setLocalProjects(cur =>
        cur.filter(local =>
          !fetched.some(fp =>
            fp.name === local.name || Number(fp.id) === Number(local.id)
          )
        )
      );
    } catch (err) {
      setProjectsError(
        err.response?.data?.error ??
        err.response?.data?.detail ??
        'Nie udało się pobrać projektów.'
      );
      setProjects(mergeProjectData([], localProjects));
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, organization?.role, user?.username]);

  useEffect(() => {
    if (!projectJustCreated && !projectJustUpdated) return;
    const extras = [projectJustCreated, projectJustUpdated];
    setLocalProjects(current => mergeProjectData(current, extras));
    setProjects(current => mergeProjectData(current, extras));
  }, [projectJustCreated, projectJustUpdated]);

  useEffect(() => {
    setLocalProjects([]);
    setProjects([]);
  }, [organization?.id]);

  return (
    <ProjectsContext.Provider value={{
      projects,
      projectsLoading,
      projectsError,
      refreshProjects: loadProjects
    }}>
      {children}
    </ProjectsContext.Provider>
  );
}
