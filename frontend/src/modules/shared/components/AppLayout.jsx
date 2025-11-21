import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../../auth/useAuth.js';
import { Settings, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProjectsProvider } from '../components/ProjectsContext.jsx';
import FiltersPanel from './FiltersPanel.jsx';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Pulpit organizacji' },
  { to: '/calendar', label: 'Kalendarz' },
  { to: '/kanban', label: 'Kanban' },
  { to: '/chat', label: 'Chaty' },
]

function AppLayout() {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const projectJustCreated = location.state?.projectJustCreated;
  const projectJustUpdated = location.state?.projectJustUpdated;
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [logic, setLogic] = useState('AND');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFiltersOpen(params.has('filters'));
  }, [location.search]);

  const openFilters = () => {
    const params = new URLSearchParams(location.search);
    if (!params.has('filters')) {
      params.set('filters', '1');
      navigate({ search: `?${params.toString()}` }, { replace: true });
    }
  };
  const closeFilters = () => {
    const params = new URLSearchParams(location.search);
    if (params.has('filters')) {
      params.delete('filters');
      navigate({ search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
    }
  };
  const toggleTag = (t) =>
    setSelectedTags(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));

  const getLinkClassName = ({ isActive }) => {
    const base =
      'px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150'
    return isActive
      ? `${base} bg-sky-500/20 text-sky-200 border border-sky-500/40`
      : `${base} text-slate-300 hover:text-white hover:bg-slate-700/40`
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-white">UniOrg</span>
            {organization?.name ? (
              <span className="text-sm text-slate-400">
                {organization.name}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/organizations')}
              className="p-2 rounded-lg hover:bg-slate-700/40 transition text-slate-300"
              title="Ustawienia organizacji"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={openFilters}
              className="p-2 rounded-lg hover:bg-slate-700/40 transition text-slate-300"
              title="Filtry"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={getLinkClassName} end={link.to === '/'}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-lg border border-transparent px-3 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              {fullName}
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
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">
        <ProjectsProvider
          projectJustCreated={projectJustCreated}
          projectJustUpdated={projectJustUpdated}
        >
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
        </ProjectsProvider>
      </main>
      <footer className="border-t border-slate-800 bg-slate-950/90 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            @2025 UniOrg made with hate to C. P. P
          </p>
        </div>
      </footer>
    </div>
  )
}

export default AppLayout
