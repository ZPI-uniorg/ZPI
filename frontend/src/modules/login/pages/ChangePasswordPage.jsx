import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../../auth/useAuth.js'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-[clamp(24px,5vw,48px)]">
      <form
        className="bg-slate-900/90 rounded-2xl p-[clamp(32px,5vw,56px)] w-[min(520px,100%)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex flex-col gap-4 text-slate-50"
        onSubmit={handleSubmit}
      >
        <h1 className="m-0 text-[clamp(1.8rem,2.5vw,2.4rem)]">Zmień hasło</h1>

        <label className="flex flex-col gap-2">
          <span className="text-slate-200/90 font-medium">Aktualne hasło</span>
          <input
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
            required
            className="px-4 py-3 rounded-xl border border-slate-400/35 bg-[#f8fafc] text-[#0f172a] focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/25"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-slate-200/90 font-medium">Nowe hasło</span>
          <input
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            required
            className="px-4 py-3 rounded-xl border border-slate-400/35 bg-[#f8fafc] text-[#0f172a] focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/25"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-slate-200/90 font-medium">Powtórz nowe hasło</span>
          <input
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            className="px-4 py-3 rounded-xl border border-slate-400/35 bg-[#f8fafc] text-[#0f172a] focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/25"
          />
        </label>

        {status.type && (
          <p
            className={`px-4 py-3 rounded-xl text-[0.95rem] ${
              status.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/40'
                : 'bg-rose-500/20 text-rose-100 border border-rose-400/40'
            }`}
          >
            {status.message}
          </p>
        )}

        <div className="flex gap-3 justify-end mt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl font-semibold bg-slate-400/20 text-slate-100 hover:bg-slate-400/30 transition"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:brightness-110 transition disabled:opacity-65 disabled:cursor-wait"
          >
            {loading ? 'Zapisywanie…' : 'Zapisz nowe hasło'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChangePasswordPage