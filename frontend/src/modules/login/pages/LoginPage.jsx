import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    organization: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(form);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.detail ??
          "Nie udało się zalogować, spróbuj ponownie."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <form
        className="bg-slate-800 rounded-xl p-8 w-[min(420px,100%)] shadow text-slate-100 flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <h1 className="m-0 text-2xl font-bold text-slate-100">UniOrg</h1>
        <p className="m-0 -mt-1 mb-2 text-slate-400">
          Zaloguj się do panelu organizacji
        </p>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-200 font-medium">Login</span>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
            required
            className="py-3 px-4 rounded-lg border border-slate-600 bg-slate-900 text-slate-100 text-base placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-200 font-medium">
            Identyfikator organizacji
          </span>
          <input
            name="organization"
            value={form.organization}
            onChange={handleChange}
            placeholder="np. kolo-robotyki"
            required
            className="py-3 px-4 rounded-lg border border-slate-600 bg-slate-900 text-slate-100 text-base placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-200 font-medium">Hasło</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
            className="py-3 px-4 rounded-lg border border-slate-600 bg-slate-900 text-slate-100 text-base placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>

        {error && (
          <p className="text-red-400 bg-red-500/10 border border-red-400/30 rounded px-4 py-3 text-[0.95rem]">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="rounded-lg py-3 px-4 text-base font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white transition hover:brightness-110 disabled:opacity-65 disabled:cursor-wait"
          disabled={loading}
        >
          {loading ? "Logowanie…" : "Zaloguj się"}
        </button>

        <p className="m-0 text-center text-slate-400 text-[0.95rem]">
          Zakładasz nową organizację?{" "}
          <Link
            to="/register-organization"
            className="text-indigo-400 font-semibold hover:underline"
          >
            Utwórz konto administracyjne
          </Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
