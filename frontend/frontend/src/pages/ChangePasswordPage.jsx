import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import './ChangePasswordPage.css'

function ChangePasswordPage() {
  const { changePassword } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [status, setStatus] = useState({ type: null, message: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'Nowe hasła muszą być identyczne.' })
      return
    }
    setLoading(true)
    setStatus({ type: null, message: '' })
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      setStatus({ type: 'success', message: 'Hasło zostało zmienione.' })
      setTimeout(() => {
        navigate('/')
      }, 1200)
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.detail ?? 'Błąd podczas zmiany hasła.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="change-password">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Zmień hasło</h1>
        <label className="field">
          <span>Aktualne hasło</span>
          <input
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="field">
          <span>Nowe hasło</span>
          <input name="newPassword" type="password" value={form.newPassword} onChange={handleChange} required />
        </label>
        <label className="field">
          <span>Powtórz nowe hasło</span>
          <input
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </label>
        {status.type && <p className={`status ${status.type}`}>{status.message}</p>}
        <div className="actions">
          <button type="button" onClick={() => navigate(-1)} className="secondary">
            Anuluj
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Zapisywanie…' : 'Zapisz nowe hasło'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChangePasswordPage
