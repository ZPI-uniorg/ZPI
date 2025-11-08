import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../../../auth/useAuth.js'

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
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#1e293b,#0f172a)] p-6">
      <form
        className="bg-[rgba(15,23,42,0.9)] rounded-[24px] p-10 w-[min(420px,100%)] shadow-[0_30px_60px_rgba(15,23,42,0.45)] text-[#f8fafc] flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <h1 className="m-0 text-[2.2rem] font-bold">UniOrg</h1>
        <p className="m-0 -mt-2 mb-2 text-[#94a3b8]">Zaloguj się do panelu organizacji</p>

        <label className="flex flex-col gap-2">
          <span className="text-[0.9rem] text-[#cbd5f5] font-medium">Login</span>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
            required
            className="py-[12px] px-[16px] rounded-[12px] border border-[rgba(148,163,184,0.3)] bg-[#f8fafc] text-[#0f172a] text-[1rem] transition-[border-color,box-shadow] duration-200 focus:outline-none focus:border-[#38bdf8] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.25)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[0.9rem] text-[#cbd5f5] font-medium">Identyfikator organizacji</span>
          <input
            name="organization"
            value={form.organization}
            onChange={handleChange}
            placeholder="np. kolo-robotyki"
            required
            className="py-[12px] px-[16px] rounded-[12px] border border-[rgba(148,163,184,0.3)] bg-[#f8fafc] text-[#0f172a] text-[1rem] transition-[border-color,box-shadow] duration-200 focus:outline-none focus:border-[#38bdf8] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.25)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[0.9rem] text-[#cbd5f5] font-medium">Hasło</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
            className="py-[12px] px-[16px] rounded-[12px] border border-[rgba(148,163,184,0.3)] bg-[#f8fafc] text-[#0f172a] text-[1rem] transition-[border-color,box-shadow] duration-200 focus:outline-none focus:border-[#38bdf8] focus:shadow-[0_0_0_3px_rgba(56,189,248,0.25)]"
          />
        </label>

        {error && (
          <p className="text-[#fca5a5] bg-[rgba(239,68,68,0.1)] border border-[rgba(248,113,113,0.4)] rounded-[12px] px-4 py-3 text-[0.95rem]">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="border-none rounded-[12px] py-[14px] px-[16px] text-[1rem] font-semibold bg-[linear-gradient(135deg,#38bdf8,#0ea5e9)] text-[#0f172a] cursor-pointer transition-[transform,box-shadow] duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_24px_rgba(14,165,233,0.35)] disabled:opacity-65 disabled:cursor-wait"
          disabled={loading}
        >
          {loading ? 'Logowanie…' : 'Zaloguj się'}
        </button>

        <p className="m-0 text-center text-[#94a3b8] text-[0.95rem]">
          Zakładasz nową organizację?{' '}
          <Link to="/register-organization" className="text-[#38bdf8] font-semibold">
            Utwórz konto administracyjne
          </Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage