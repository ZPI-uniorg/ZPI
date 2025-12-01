import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { registerOrganization } from "../../../api/organizations.js";

const initialOrganization = { name: "", description: "", slug: "" };
// Slugify with Polish/European char mapping
function slugify(text) {
  const map = {
    ą: "a",
    ć: "c",
    ę: "e",
    ł: "l",
    ń: "n",
    ó: "o",
    ś: "s",
    ź: "z",
    ż: "z",
    Ą: "A",
    Ć: "C",
    Ę: "E",
    Ł: "L",
    Ń: "N",
    Ó: "O",
    Ś: "S",
    Ź: "Z",
    Ż: "Z",
    ü: "u",
    ö: "o",
    ä: "a",
    ß: "ss",
    é: "e",
    è: "e",
    ê: "e",
    ë: "e",
    á: "a",
    à: "a",
    â: "a",
    ã: "a",
    å: "a",
    ç: "c",
    í: "i",
    ì: "i",
    î: "i",
    ï: "i",
    ú: "u",
    ù: "u",
    û: "u",
    ü: "u",
    ñ: "n",
    ý: "y",
    ÿ: "y",
  };
  return text
    .toString()
    .split("")
    .map((c) => map[c] || c)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
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
  // No longer needed: slug is always auto-generated
  const [admin, setAdmin] = useState(initialAdmin);
  const [status, setStatus] = useState({ type: null, message: "" });
  const [submitting, setSubmitting] = useState(false);

  const isSubmitDisabled = useMemo(
    () =>
      submitting ||
      !organization.name.trim() ||
      !admin.email.trim() ||
      !admin.username.trim() ||
      !admin.password.trim() ||
      admin.password.length < 8 ||
      admin.password !== admin.confirmPassword,
    [
      admin.confirmPassword,
      admin.email,
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
    setOrganization((prev) => {
      if (name === "name") {
        return { ...prev, name: value, slug: slugify(value) };
      }
      return { ...prev, [name]: value };
    });
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
            slug: organization.slug.trim(),
          },
          admin: {
            username: admin.username.trim(),
            password: admin.password,
            email: admin.email.trim(),
            first_name: admin.first_name.trim(),
            last_name: admin.last_name.trim(),
            confirmPassword: admin.confirmPassword,
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
            <div className="relative">
              <input
                name="name"
                value={organization.name}
                onChange={(e) => {
                  let val = e.target.value;
                  // Only allow alphanumeric and spaces (no special chars)
                  val = val.replace(/[^\p{L}\p{N} ]+/gu, "");
                  if (val.length <= 100) {
                    handleOrganizationChange({
                      target: { name: "name", value: val },
                    });
                  }
                }}
                placeholder="Koło Naukowe AI"
                maxLength={100}
                required
                className="w-full border border-slate-600 rounded-[12px] p-3 pr-16 text-[16px] bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
              <div
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none ${
                  organization.name.length >= 100
                    ? "text-red-400"
                    : organization.name.length >= 80
                    ? "text-yellow-400"
                    : "text-slate-400"
                }`}
              >
                {organization.name.length}/100
              </div>
            </div>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">
              Slug (adres URL)
            </span>
            <div className="relative flex items-center gap-2">
              <input
                name="slug"
                value={organization.slug}
                readOnly
                tabIndex={-1}
                maxLength={100}
                className="w-full border border-slate-600 rounded-[12px] p-3 pr-16 text-[16px] bg-slate-900 text-slate-400 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 opacity-70 cursor-not-allowed"
                placeholder="adres-url"
              />
              <span className="text-xs text-slate-400">
                {window.location.origin}/org/
                <b>{organization.slug || "adres-url"}</b>
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Adres URL organizacji jest generowany automatycznie na podstawie
              nazwy.
            </span>
          </label>
          <label className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                Opis (opcjonalny)
              </span>
              <span
                className={`text-xs font-medium ${
                  organization.description.length >= 500
                    ? "text-red-400"
                    : organization.description.length >= 400
                    ? "text-yellow-400"
                    : "text-slate-400"
                }`}
              >
                {organization.description.length}/500
              </span>
            </div>
            <textarea
              name="description"
              value={organization.description}
              onChange={(e) => {
                const val = e.target.value;
                if (val.length <= 500) {
                  handleOrganizationChange(e);
                }
              }}
              rows={3}
              placeholder="Czym zajmuje się organizacja?"
              maxLength={500}
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
              <div className="relative">
                <input
                  name="first_name"
                  value={admin.first_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 50) {
                      handleAdminChange(e);
                    }
                  }}
                  maxLength={50}
                  className="w-full border border-slate-600 rounded-[12px] p-3 pr-14 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
                <div
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none ${
                    admin.first_name.length >= 50
                      ? "text-red-400"
                      : admin.first_name.length >= 40
                      ? "text-yellow-400"
                      : "text-slate-400"
                  }`}
                >
                  {admin.first_name.length}/50
                </div>
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">Nazwisko</span>
              <div className="relative">
                <input
                  name="last_name"
                  value={admin.last_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 50) {
                      handleAdminChange(e);
                    }
                  }}
                  maxLength={50}
                  className="w-full border border-slate-600 rounded-[12px] p-3 pr-14 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
                <div
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none ${
                    admin.last_name.length >= 50
                      ? "text-red-400"
                      : admin.last_name.length >= 40
                      ? "text-yellow-400"
                      : "text-slate-400"
                  }`}
                >
                  {admin.last_name.length}/50
                </div>
              </div>
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">Email</span>
            <div className="relative">
              <input
                name="email"
                type="email"
                value={admin.email}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= 100) {
                    handleAdminChange(e);
                  }
                }}
                maxLength={100}
                required
                className="w-full border border-slate-600 rounded-[12px] p-3 pr-16 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
              <div
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none ${
                  admin.email.length >= 100
                    ? "text-red-400"
                    : admin.email.length >= 80
                    ? "text-yellow-400"
                    : "text-slate-400"
                }`}
              >
                {admin.email.length}/100
              </div>
            </div>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">Login</span>
            <div className="relative">
              <input
                name="username"
                value={admin.username}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= 50) {
                    handleAdminChange(e);
                  }
                }}
                maxLength={50}
                required
                className="w-full border border-slate-600 rounded-[12px] p-3 pr-16 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
              <div
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none ${
                  admin.username.length >= 50
                    ? "text-red-400"
                    : admin.username.length >= 40
                    ? "text-yellow-400"
                    : "text-slate-400"
                }`}
              >
                {admin.username.length}/50
              </div>
            </div>
          </label>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">Hasło</span>
              <div className="relative">
                <input
                  name="password"
                  type="password"
                  value={admin.password}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 128) {
                      handleAdminChange(e);
                    }
                  }}
                  maxLength={128}
                  required
                  className="w-full border border-slate-600 rounded-[12px] p-3 pr-16 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
                <div
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none ${
                    admin.password.length >= 128
                      ? "text-red-400"
                      : admin.password.length >= 100
                      ? "text-yellow-400"
                      : "text-slate-400"
                  }`}
                >
                  {admin.password.length}/128
                </div>
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">
                Powtórz hasło
              </span>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type="password"
                  value={admin.confirmPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 128) {
                      handleAdminChange(e);
                    }
                  }}
                  maxLength={128}
                  required
                  className="w-full border border-slate-600 rounded-[12px] p-3 pr-16 text-[16px] bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
                <div
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none ${
                    admin.confirmPassword.length >= 128
                      ? "text-red-400"
                      : admin.confirmPassword.length >= 100
                      ? "text-yellow-400"
                      : "text-slate-400"
                  }`}
                >
                  {admin.confirmPassword.length}/128
                </div>
              </div>
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
