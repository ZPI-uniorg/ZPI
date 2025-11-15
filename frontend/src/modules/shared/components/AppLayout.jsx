import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import useAuth from '../../../auth/useAuth.js'
import { Settings, Filter } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import TagList from '../../dashboard/components/TagList.jsx'
import { TAGS, PROJECTS } from '../../../api/fakeData.js'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Pulpit organizacji' },
  { to: '/calendar', label: 'Kalendarz' },
  { to: '/kanban', label: 'Kanban' },
  { to: '/chat', label: 'Chaty' },
]

function AppLayout() {
  const { user, organization, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username

  // globalny stan filtrów
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [tags, setTags] = useState(TAGS)
  const [projects, setProjects] = useState(PROJECTS)
  const [selectedTags, setSelectedTags] = useState([])
  const [logic, setLogic] = useState('AND')

  const tagListRootRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setFiltersOpen(params.has('filters'))
  }, [location.search])

  // ukryj nagłówek "Tagi" i wewnętrzny przełącznik AND/OR z TagList
  useEffect(() => {
    if (!filtersOpen) return
    const root = tagListRootRef.current
    if (!root) return
    const nodes = root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div')
    nodes.forEach((el) => {
      const text = (el.textContent || '').trim().toLowerCase()
      if (text === 'tagi') el.style.display = 'none'
    })
    // schowaj grupę z przyciskami AND/OR wewnątrz TagList
    const btns = Array.from(root.querySelectorAll('button'))
    const group = btns.find((b) => ['AND', 'OR'].includes((b.textContent || '').trim().toUpperCase()))?.parentElement
    if (group && root.contains(group)) group.style.display = 'none'
  }, [filtersOpen])

  const openFilters = () => {
    const params = new URLSearchParams(location.search)
    if (!params.has('filters')) {
      params.set('filters', '1')
      navigate({ search: `?${params.toString()}` }, { replace: true })
    }
  }
  const closeFilters = () => {
    const params = new URLSearchParams(location.search)
    if (params.has('filters')) {
      params.delete('filters')
      navigate({ search: params.toString() ? `?${params.toString()}` : '' }, { replace: true })
    }
  }
  const toggleTag = (t) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const getLinkClassName = ({ isActive }) => {
    const base =
      'px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150'
    if (isActive) {
      return `${base} bg-sky-500/20 text-sky-200 border border-sky-500/40`
    }
    return `${base} text-slate-300 hover:text-white hover:bg-slate-700/40`
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
        <div className="h-full flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>

      {/* overlay globalnych filtrów */}
      <div
        onClick={closeFilters}
        className={`fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${filtersOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* globalny, wysuwany panel filtrów */}
      <aside
        className={`fixed left-0 top-0 z-[70] h-full w-[420px] max-w-[90vw] transform rounded-r-2xl border-r border-[rgba(148,163,184,0.35)] bg-[rgba(15,23,42,0.98)] shadow-[0_25px_60px_rgba(15,23,42,0.6)] transition-transform duration-300 ${filtersOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* header: lewo + pionowe wyśrodkowanie */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="m-0 text-base font-semibold text-slate-200">Filtry</h2>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/60 p-1">
              <button
                type="button"
                onClick={() => setLogic('AND')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  logic === 'AND'
                    ? 'bg-violet-600 text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                AND
              </button>
              <button
                type="button"
                onClick={() => setLogic('OR')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  logic === 'OR'
                    ? 'bg-violet-600 text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                OR
              </button>
            </div>
          </div>
          <button
            onClick={closeFilters}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-700/40 transition"
            aria-label="Zamknij filtry"
          >
            <span className="block h-5 w-5 leading-5 text-center">×</span>
          </button>
        </div>

        <div ref={tagListRootRef} className="flex h-[calc(100%-64px-72px)] flex-col overflow-hidden px-5 py-4">
          <TagList
            tags={[...tags, ...projects.map((p) => p.name)]}
            projects={projects}
            selectedTags={selectedTags}
            logic={logic}
            setLogic={setLogic}
            toggleTag={setSelectedTags.length ? undefined : undefined /* ...existing code keeps props; UI ukryte przez efekt */}
          />
        </div>

        <div className="flex gap-2 border-t border-[rgba(148,163,184,0.2)] px-5 py-4">
          <button
            onClick={() => navigate('/organization/project/new')}
            className="flex-1 rounded-[14px] bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/30 hover:brightness-110 transition"
          >
            nowy projekt
          </button>
          <button
            onClick={() => navigate('/organization/tag/new')}
            className="flex-1 rounded-[14px] bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/30 hover:brightness-110 transition"
          >
            nowy tag
          </button>
        </div>
      </aside>

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
