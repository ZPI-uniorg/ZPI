import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import './LoginPage.css'

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', organization: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Nie udało się zalogować, spróbuj ponownie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>UniOrg</h1>
        <p className="subtitle">Zaloguj się do panelu organizacji</p>
        <label className="field">
          <span>Login</span>
          <input name="username" value={form.username} onChange={handleChange} autoComplete="username" required />
        </label>
        <label className="field">
          <span>Identyfikator organizacji</span>
          <input
            name="organization"
            value={form.organization}
            onChange={handleChange}
            placeholder="np. kolo-robotyki"
            required
          />
        </label>
        <label className="field">
          <span>Hasło</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="submit" disabled={loading}>
          {loading ? 'Logowanie…' : 'Zaloguj się'}
        </button>
        <p className="footer-link">
          Zakładasz nową organizację?{' '}
          <Link to="/register-organization">Utwórz konto administracyjne</Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
