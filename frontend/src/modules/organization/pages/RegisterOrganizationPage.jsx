import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { registerOrganization } from "../../../api/organizations.js";

const initialOrganization = { name: "", description: "" };
const initialAdmin = {
  first_name: "",
  last_name: "",
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
};
function generatePassword(len = 12) {
  const cs =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789@$!%*#?&";
  let out = "";
  const rand = (window.crypto || window.msCrypto)?.getRandomValues;
  if (rand) {
    const arr = new Uint32Array(len);
    rand(arr);
    for (let i = 0; i < len; i++) out += cs[arr[i] % cs.length];
  } else {
    for (let i = 0; i < len; i++)
      out += cs[Math.floor(Math.random() * cs.length)];
  }
  return out;
}

function RegisterOrganizationPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [organization, setOrganization] = useState(initialOrganization);
  const [admin, setAdmin] = useState(initialAdmin);
  const [status, setStatus] = useState({ type: null, message: "" });
  const [submitting, setSubmitting] = useState(false);

  const isSubmitDisabled = useMemo(
    () =>
      submitting ||
      !organization.name.trim() ||
      !admin.username.trim() ||
      !admin.password.trim() ||
      admin.password.length < 8 ||
      admin.password !== admin.confirmPassword,
    [
      admin.confirmPassword,
      admin.password,
      admin.username,
      organization.name,
      submitting,
    ]
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleOrganizationChange = useCallback((event) => {
    const { name, value } = event.target;
    setOrganization((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleAdminChange = useCallback((event) => {
    const { name, value } = event.target;
    setAdmin((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleGeneratePassword = useCallback(() => {
    const password = generatePassword();
    setAdmin((prev) => ({ ...prev, password, confirmPassword: password }));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (isSubmitDisabled) return;
      setSubmitting(true);
      setStatus({ type: null, message: "" });
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
        };

        const response = await registerOrganization(payload);
        setStatus({
          type: "success",
          message:
            response?.message ??
            `Organizacja ${payload.organization.name} została utworzona.`,
        });
        setTimeout(() => navigate("/login"), 800);
      } catch (error) {
        const detail =
          error.response?.data?.error ??
          error.response?.data?.detail ??
          error.response?.data?.admin?.username?.[0] ??
          error.response?.data?.admin?.email?.[0] ??
          error.response?.data?.organization?.name?.[0];
        setStatus({
          type: "error",
          message: detail ?? "Nie udało się zarejestrować organizacji.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [admin, isSubmitDisabled, navigate, organization]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-8">
      <form
        className="w-[min(720px,100%)] bg-slate-800 rounded-xl p-8 shadow text-slate-100 flex flex-col gap-6"
        onSubmit={handleSubmit}
      >
        <h1 className="m-0 text-[28px] font-bold text-slate-100">
          Załóż organizację
        </h1>
        <p className="m-0 text-slate-300">
          Utwórz konto administratora głównego i skonfiguruj pierwszą
          organizację w jednym kroku.
        </p>

        <section className="flex flex-col gap-4">
          <h2 className="m-0 text-[18px] text-slate-200">Dane organizacji</h2>
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">Nazwa</span>
            <input
              name="name"
              value={organization.name}
              onChange={handleOrganizationChange}
              placeholder="Koło Naukowe AI"
              required
              className="border border-slate-600 rounded-[12px] p-3 text-[16px] bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">
              Opis (opcjonalny)
            </span>
            <textarea
              name="description"
              value={organization.description}
              onChange={handleOrganizationChange}
              rows={3}
              placeholder="Czym zajmuje się organizacja?"
              className="border border-slate-600 rounded-[12px] p-3 text-[16px] bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </label>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="m-0 text-[18px] text-slate-200">
            Konto administratora
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">Imię</span>
              <input
                name="first_name"
                value={admin.first_name}
                onChange={handleAdminChange}
                className="border border-slate-600 rounded-[12px] p-3 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">Nazwisko</span>
              <input
                name="last_name"
                value={admin.last_name}
                onChange={handleAdminChange}
                className="border border-slate-600 rounded-[12px] p-3 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">Email</span>
            <input
              name="email"
              type="email"
              value={admin.email}
              onChange={handleAdminChange}
              className="border border-slate-600 rounded-[12px] p-3 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">Login</span>
            <input
              name="username"
              value={admin.username}
              onChange={handleAdminChange}
              required
              className="border border-slate-600 rounded-[12px] p-3 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </label>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">Hasło</span>
              <input
                name="password"
                type="password"
                value={admin.password}
                onChange={handleAdminChange}
                required
                className="border border-slate-600 rounded-[12px] p-3 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">
                Powtórz hasło
              </span>
              <input
                name="confirmPassword"
                type="password"
                value={admin.confirmPassword}
                onChange={handleAdminChange}
                required
                className="border border-slate-600 rounded-[12px] p-3 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>
          </div>
          <button
            type="button"
            className="rounded-[12px] py-3 px-5 font-semibold border border-indigo-500/30 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/25 transition"
            onClick={handleGeneratePassword}
          >
            Wygeneruj bezpieczne hasło
          </button>
        </section>

        {status.type && (
          <p
            className={`m-0 rounded-[12px] px-4 py-3 font-medium ${
              status.type === "error"
                ? "text-red-400 bg-red-500/10 border border-red-400/30"
                : "text-green-400 bg-green-500/10 border border-green-400/30"
            }`}
          >
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="rounded-[12px] py-3 px-5 font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white transition disabled:opacity-60 hover:brightness-110"
        >
          {submitting ? "Zakładanie…" : "Załóż organizację"}
        </button>
        <p className="text-center text-slate-300">
          Masz już konto?{" "}
          <Link
            to="/login"
            className="text-indigo-400 font-semibold hover:underline"
          >
            Zaloguj się
          </Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterOrganizationPage;
