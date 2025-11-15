import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuth from '../../../auth/useAuth.js'

const NAV_LINKS = [{ to: '/dashboard', label: 'Pulpit organizacji' }]

function AppLayout() {
  const { user, organization, logout } = useAuth()
  const navigate = useNavigate()

  const getLinkClassName = ({ isActive }) => {
    const base =
      'px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150'
    if (isActive) {
      return `${base} bg-sky-500/20 text-sky-200 border border-sky-500/40`
    }
    return `${base} text-slate-300 hover:text-white hover:bg-slate-700/40`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-white">UniOrg</span>
            {organization?.name ? (
              <span className="text-sm text-slate-400">
                {organization.name}
              </span>
            ) : null}
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
              {user?.first_name || user?.username}
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
      <main className="min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
