import { Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import './DashboardPage.css'

function DashboardPage() {
  const { user, organization, logout } = useAuth()

  return (
    <div className="dashboard">
      <header>
        <div>
          <h1>Panel organizacji</h1>
          <p>
            Witaj, {user?.first_name || user?.username}!{' '}
            {organization?.name ? `(${organization.name})` : null}
          </p>
        </div>
        <button type="button" onClick={logout}>
          Wyloguj
        </button>
      </header>
      <main>
        <section>
          <h2>Konto</h2>
          <p>Zarządzaj hasłem i dostępem.</p>
          <Link to="/account/password">Zmień hasło</Link>
        </section>
        <section>
          <h2>Organizacje</h2>
          <p>Zarządzaj organizacjami, członkami i danymi logowania.</p>
          <Link to="/organizations">Przejdź do organizacji</Link>
        </section>
      </main>
    </div>
  )
}

export default DashboardPage
