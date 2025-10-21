import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { registerOrganization } from '../api/organizations.js'
import './RegisterOrganizationPage.css'

const initialOrganization = {
  name: '',
  description: '',
}

const initialAdmin = {
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
}

function generatePassword(length = 12) {
  const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789@$!%*#?&'
  let password = ''
  const cryptoObj = window.crypto || window.msCrypto
  if (cryptoObj?.getRandomValues) {
    const randomValues = new Uint32Array(length)
    cryptoObj.getRandomValues(randomValues)
    for (let i = 0; i < length; i += 1) {
      password += charset[randomValues[i] % charset.length]
    }
  } else {
    for (let i = 0; i < length; i += 1) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      password += charset[randomIndex]
    }
  }
  return password
}

function RegisterOrganizationPage() {
  const navigate = useNavigate()
  const { isAuthenticated, establishSession } = useAuth()

  const [organization, setOrganization] = useState(initialOrganization)
  const [admin, setAdmin] = useState(initialAdmin)
  const [status, setStatus] = useState({ type: null, message: '' })
  const [submitting, setSubmitting] = useState(false)

  const isSubmitDisabled = useMemo(
    () =>
      submitting ||
      !organization.name.trim() ||
      !admin.username.trim() ||
      !admin.password.trim() ||
      admin.password.length < 8 ||
      admin.password !== admin.confirmPassword,
    [admin.confirmPassword, admin.password, admin.username, organization.name, submitting],
  )

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleOrganizationChange = useCallback((event) => {
    const { name, value } = event.target
    setOrganization((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleAdminChange = useCallback((event) => {
    const { name, value } = event.target
    setAdmin((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleGeneratePassword = useCallback(() => {
    const password = generatePassword()
    setAdmin((prev) => ({ ...prev, password, confirmPassword: password }))
  }, [])

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      if (isSubmitDisabled) return
      setSubmitting(true)
      setStatus({ type: null, message: '' })
      try {
        const payload = {
          organization: {
            name: organization.name.trim(),
            description: organization.description.trim(),
          },
          admin: {
            username: admin.username.trim(),
            password: admin.password,
            email: admin.email.trim() || undefined,
            first_name: admin.first_name.trim(),
            last_name: admin.last_name.trim(),
          },
        }

        const response = await registerOrganization(payload)
        establishSession(response)
        setStatus({ type: 'success', message: `Organizacja ${response.organization.name} została utworzona.` })
        setTimeout(() => navigate('/organizations'), 600)
      } catch (error) {
        const detail =
          error.response?.data?.detail ??
          error.response?.data?.admin?.username?.[0] ??
          error.response?.data?.admin?.email?.[0] ??
          error.response?.data?.organization?.name?.[0]
        setStatus({ type: 'error', message: detail ?? 'Nie udało się zarejestrować organizacji.' })
      } finally {
        setSubmitting(false)
      }
    },
    [admin, establishSession, isSubmitDisabled, navigate, organization],
  )

  return (
    <div className="register-organization">
      <form className="register-card" onSubmit={handleSubmit}>
        <h1>Załóż organizację</h1>
        <p className="subtitle">
          Utwórz konto administratora głównego i skonfiguruj pierwszą organizację w jednym kroku.
        </p>

        <section>
          <h2>Dane organizacji</h2>
          <label className="field">
            <span>Nazwa</span>
            <input
              name="name"
              value={organization.name}
              onChange={handleOrganizationChange}
              placeholder="Koło Naukowe AI"
              required
            />
          </label>
          <label className="field">
            <span>Opis (opcjonalny)</span>
            <textarea
              name="description"
              value={organization.description}
              onChange={handleOrganizationChange}
              rows={3}
              placeholder="Czym zajmuje się organizacja?"
            />
          </label>
        </section>

        <section>
          <h2>Konto administratora</h2>
          <div className="grid">
            <label className="field">
              <span>Imię</span>
              <input name="first_name" value={admin.first_name} onChange={handleAdminChange} />
            </label>
            <label className="field">
              <span>Nazwisko</span>
              <input name="last_name" value={admin.last_name} onChange={handleAdminChange} />
            </label>
          </div>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" value={admin.email} onChange={handleAdminChange} />
          </label>
          <label className="field">
            <span>Login</span>
            <input name="username" value={admin.username} onChange={handleAdminChange} required />
          </label>
          <div className="grid">
            <label className="field">
              <span>Hasło</span>
              <input name="password" type="password" value={admin.password} onChange={handleAdminChange} required />
            </label>
            <label className="field">
              <span>Powtórz hasło</span>
              <input
                name="confirmPassword"
                type="password"
                value={admin.confirmPassword}
                onChange={handleAdminChange}
                required
              />
            </label>
          </div>
          <button type="button" className="secondary" onClick={handleGeneratePassword}>
            Wygeneruj bezpieczne hasło
          </button>
        </section>

        {status.type && <p className={`status ${status.type}`}>{status.message}</p>}

        <button type="submit" disabled={isSubmitDisabled}>
          {submitting ? 'Zakładanie…' : 'Załóż organizację'}
        </button>
        <p className="footer-link">
          Masz już konto? <Link to="/login">Zaloguj się</Link>
        </p>
      </form>
    </div>
  )
}

export default RegisterOrganizationPage
