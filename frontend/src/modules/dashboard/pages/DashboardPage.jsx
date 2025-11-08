import { Link } from 'react-router-dom'
import useAuth from '../../../auth/useAuth.js'

function DashboardPage() {
  const { user, organization, logout } = useAuth()

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#111827,#1f2937)] text-slate-100 p-10 md:p-[clamp(24px,5vw,64px)] flex flex-col gap-8">
      <header className="flex justify-between items-center gap-4">
        <div>
          <h1 className="m-0 text-[clamp(2rem,3vw,2.8rem)]">Panel organizacji</h1>
          <p className="m-0 mt-2 text-slate-300">
            Witaj, {user?.first_name || user?.username}!{' '}
            {organization?.name ? `(${organization.name})` : null}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="px-6 py-3 rounded-full border border-slate-400/30 bg-transparent hover:bg-slate-400/15 hover:border-slate-400/60 transition"
        >
          Wyloguj
        </button>
      </header>

      <main className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        <section className="bg-slate-900/70 rounded-2xl p-6 flex flex-col gap-3 shadow-[0_20px_45px_rgba(15,23,42,0.45)]">
          <h2 className="m-0 text-[1.5rem]">Konto</h2>
          <p className="m-0 text-slate-300">Zarządzaj hasłem i dostępem.</p>
          <Link
            to="/account/password"
            className="self-start px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold"
          >
            Zmień hasło
          </Link>
        </section>
        <section className="bg-slate-900/70 rounded-2xl p-6 flex flex-col gap-3 shadow-[0_20px_45px_rgba(15,23,42,0.45)]">
          <h2 className="m-0 text-[1.5rem]">Organizacje</h2>
          <p className="m-0 text-slate-300">Zarządzaj organizacjami, członkami i danymi logowania.</p>
          <Link
            to="/organizations"
            className="self-start px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold"
          >
            Przejdź do organizacji
          </Link>
        </section>
      </main>
    </div>
  )
}

export default DashboardPage
