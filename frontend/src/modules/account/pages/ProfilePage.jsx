import { Link } from 'react-router-dom'
import useAuth from '../../../auth/useAuth.js'

function ProfilePage() {
  const { user, organization } = useAuth()

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 text-slate-100">
      <header>
        <p className="text-sm uppercase tracking-wide text-slate-400">Konto</p>
        <h1 className="m-0 text-3xl font-semibold text-white">Profil użytkownika</h1>
        <p className="mt-2 text-slate-400">
          Podstawowe informacje o Twoim koncie w organizacji {organization?.name ?? 'UniOrg'}.
        </p>
      </header>

      <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.45)]">
        <div>
          <h2 className="text-lg font-semibold text-white">Dane logowania</h2>
          <p className="text-sm text-slate-400">Identyfikatory są tylko do odczytu. Zmień hasło w sekcji bezpieczeństwo.</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Login</dt>
            <dd className="text-base text-white">{user.username}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Adres e-mail</dt>
            <dd className="text-base text-white">{user.email || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.45)]">
        <div>
          <h2 className="text-lg font-semibold text-white">Dane osobowe</h2>
          <p className="text-sm text-slate-400">Kontaktuj się z administratorem, jeśli wymagane są zmiany.</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Imię</dt>
            <dd className="text-base text-white">{user.first_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Nazwisko</dt>
            <dd className="text-base text-white">{user.last_name || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.45)]">
        <div>
          <h2 className="text-lg font-semibold text-white">Bezpieczeństwo</h2>
          <p className="text-sm text-slate-400">Zmiana hasła odbywa się na osobnej stronie.</p>
        </div>
        <Link
          to="/account/password"
          className="inline-flex w-max items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30"
        >
          Zmień hasło
        </Link>
      </section>
    </div>
  )
}

export default ProfilePage
