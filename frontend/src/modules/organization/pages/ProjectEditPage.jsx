import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { createProject, updateProject } from "../../../api/projects.js";

export default function ProjectEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organization } = useAuth();
  const editingProject = location.state?.project || null;

  const [form, setForm] = useState({
    name: editingProject?.name ?? "",
    description: editingProject?.description ?? "",
    start_dte: editingProject?.start_dte ?? "",
    end_dte: editingProject?.end_dte ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = Boolean(editingProject?.id);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateDates = () => {
    if (!form.start_dte || !form.end_dte) {
      return true;
    }
    return new Date(form.start_dte) <= new Date(form.end_dte);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!organization?.id || !user?.username) {
      setError("Brakuje informacji o organizacji lub użytkowniku.");
      return;
    }

    if (!validateDates()) {
      setError("Data zakończenia musi być późniejsza lub równa dacie rozpoczęcia.");
      return;
    }

    if (!form.name.trim() || !form.start_dte || !form.end_dte) {
      setError("Uzupełnij wymagane pola.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      start_dte: form.start_dte,
      end_dte: form.end_dte,
    };

    const request = isEditing
      ? updateProject(organization.id, editingProject.id, user.username, payload)
      : createProject(organization.id, user.username, payload);

    request
      .then((project) => {
        const fallbackProject = isEditing && editingProject
          ? {
              ...editingProject,
              ...payload,
              id: editingProject.id,
            }
          : { ...payload };
        const resolvedProject = project && project.id ? project : fallbackProject;
        const redirectState = isEditing
          ? { projectJustUpdated: resolvedProject }
          : { projectJustCreated: resolvedProject };
        navigate("/dashboard", { state: redirectState });
      })
      .catch((err) => {
        const message =
          err.response?.data?.error ||
          err.response?.data?.detail ||
          "Nie udało się zapisać projektu.";
        setError(message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const handleDelete = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] flex items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/95 rounded-3xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] p-12 w-full max-w-4xl flex flex-col gap-8 border border-slate-700"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <span className="text-indigo-400 text-base font-semibold">Nazwa organizacji</span>
          <button
            type="button"
            className="border border-slate-500 px-4 py-2 rounded-lg text-slate-200 bg-transparent hover:bg-slate-700/40 transition"
            onClick={() => navigate("/dashboard")}
          >
            Powrót do panelu
          </button>
        </div>
        {error && (
          <p className="text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-4 py-3 text-sm">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-slate-200 font-medium">Nazwa projektu</span>
            <input
              name="name"
              value={form.name}
              onChange={handleInputChange}
              placeholder="Np. Rejestracja nowych członków"
              required
              className="border border-slate-600 w-full rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-slate-200 font-medium">Informacja o koordynatorze</span>
            <p className="text-slate-400 text-sm leading-relaxed">
              Nie musisz wybierać koordynatora. Jeśli tworzysz projekt jako
              koordynator, backend przypisze Cię automatycznie. Administratorzy
              tworzą projekty bez przypisanego koordynatora.
            </p>
          </div>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-slate-200 font-medium">Opis (opcjonalnie)</span>
          <textarea
            name="description"
            value={form.description}
            onChange={handleInputChange}
            placeholder="Krótki opis projektu..."
            className="border border-slate-600 w-full rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 min-h-[120px] resize-y"
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-slate-200 font-medium">Data rozpoczęcia</span>
            <input
              type="date"
              name="start_dte"
              value={form.start_dte}
              onChange={handleInputChange}
              required
              className="border border-slate-600 w-full rounded-lg px-3 py-2 bg-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-slate-200 font-medium">Data zakończenia</span>
            <input
              type="date"
              name="end_dte"
              value={form.end_dte}
              onChange={handleInputChange}
              required
              className="border border-slate-600 w-full rounded-lg px-3 py-2 bg-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </label>
        </div>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center pt-4">
          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-10 py-3 rounded-xl text-lg font-semibold shadow hover:brightness-110 transition w-full md:w-auto disabled:opacity-50"
            disabled={submitting || !organization?.id || !form.name.trim() || !form.start_dte || !form.end_dte}
          >
            {submitting
              ? "Zapisywanie..."
              : isEditing
              ? "Zapisz zmiany"
              : "Stwórz projekt"}
          </button>
          {isEditing && (
            <button
              type="button"
              className="border border-slate-500 px-8 py-3 rounded-xl text-lg text-slate-200 bg-transparent hover:bg-slate-700/40 transition w-full md:w-auto"
              onClick={handleDelete}
            >
              Anuluj
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
