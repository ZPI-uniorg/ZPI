import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { createProject, updateProject } from "../../../api/projects.js";
import { getOrganizationMembers } from "../../../api/organizations.js";
import Autocomplete from "../../shared/components/Autocomplete.jsx";

export default function ProjectEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organization } = useAuth();
  const editingProject = location.state?.project || null;

  const [name, setName] = useState(editingProject?.name || "");
  const [coordinator, setCoordinator] = useState(null);
  const [members, setMembers] = useState([]);
  const [searchCoord, setSearchCoord] = useState("");
  const [memberInput, setMemberInput] = useState("");

  const [availableMembers, setAvailableMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(editingProject?.id);

  useEffect(() => {
    if (!organization?.id || !user?.username) {
      setAvailableMembers([]);
      return;
    }
    let ignore = false;
    setLoadingMembers(true);
    setError(null);
    getOrganizationMembers(organization.id, user.username)
      .then((data) => {
        if (ignore) return;
        const normalized = (data || []).map((m) => ({
          id: m.user_id ?? m.id ?? m.username,
          username: m.username,
          first_name: m.first_name ?? "",
          last_name: m.last_name ?? "",
          email: m.email ?? "",
          role: m.role,
          permissions: m.permissions || [],
        }));
        setAvailableMembers(normalized);
        if (editingProject?.id && members.length === 0) {
          const prefill = normalized.filter(m => (m.permissions || []).includes(editingProject.name));
          setMembers(prefill);
        }
        // USTAW KOORDYNATORA
        if (editingProject?.coordinator_username && !coordinator) {
          const coord = normalized.find(m => m.username === editingProject.coordinator_username);
          if (coord) {
            setCoordinator(coord);
            setMembers(prev =>
              prev.some(p => p.id === coord.id) ? prev : [...prev, coord]
            );
          }
        }
      })
      .catch((err) => {
        if (ignore) return;
        setError(
          err?.response?.data?.error ??
            err?.response?.data?.detail ??
            "Nie udało się pobrać członków organizacji."
        );
        setAvailableMembers([]);
      })
      .finally(() => {
        if (!ignore) setLoadingMembers(false);
      });
    return () => {
      ignore = true;
    };
  }, [organization?.id, user?.username, editingProject?.id, editingProject?.name]); // CHANGED deps

  const projectTagName = editingProject?.name || null;

  const filteredCoordinators = availableMembers.filter((m) =>
    (m.role === 'coordinator' || m.role === 'admin') &&
    (m.first_name + " " + m.last_name + " " + m.username + " " + m.email)
      .toLowerCase()
      .includes(searchCoord.toLowerCase())
  );

  const filteredMembers = availableMembers
    .filter((m) => !members.some((mm) => mm.id === m.id))
    .filter((m) =>
      (m.first_name + " " + m.last_name + " " + m.username + " " + m.email)
        .toLowerCase()
        .includes(memberInput.toLowerCase())
    )
    .filter(m => {
      if (!editingProject?.id || !projectTagName) return true;
      return (m.permissions || []).includes(projectTagName);
    });

  const memberOptions = (filteredMembers.length > 0 ? filteredMembers : availableMembers
    .filter((m) => !members.some((mm) => mm.id === m.id)))
    .map(m => ({
      ...m,
      label: `${m.first_name} ${m.last_name} (${m.username})`,
    }));

  const handleCoordinatorSelect = (m) => {
    setCoordinator(m);
    setSearchCoord("");
    setMembers((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  };
  const handleMemberSelect = (m) => {
    setMembers((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    setMemberInput("");
  };
  const handleRemoveMember = (id) => {
    if (coordinator && coordinator.id === id) return; // koordynatora nie usuwamy
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!organization?.id || !user?.username) return;
    if (!name.trim() || members.length === 0) return;
    setSubmitting(true);
    setError(null);
    // Domyślne daty – proste tworzenie bez dodatkowych pól
    const today = new Date();
    const plus30 = new Date(today);
    plus30.setDate(today.getDate() + 30);
    const toISODate = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    try {
      if (editingProject?.id) {
        await updateProject(organization.id, editingProject.id, user.username, {
          username: user.username,                 // DODANE
          name: name.trim(),
          description: "",
          start_dte: toISODate(today),
          end_dte: toISODate(plus30),
          coordinator_username: coordinator?.username || null, // DODANE (jawnie)
        });
        navigate("/dashboard", { state: { projectJustUpdated: { id: editingProject.id, name: name.trim() } } });
      } else {
        const created = await createProject(organization.id, user.username, {
          username: user.username,                 // DODANE
          name: name.trim(),
          description: "",
          start_dte: toISODate(today),
          end_dte: toISODate(plus30),
          coordinator_username: coordinator?.username || null, // DODANE
        });
        const createdProject = created?.id ? created : { id: created?.project_id || Date.now(), name: name.trim() };
        navigate("/dashboard", { state: { projectJustCreated: createdProject } });
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ??
          err?.response?.data?.detail ??
          "Nie udało się zapisać projektu."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => navigate("/dashboard");
  const handleDelete = () => {
    // TODO: wywołanie API usuwania projektu gdy będzie dostępne
    navigate("/dashboard");
  };

  return (
    <div className="h-full overflow-auto bg-[linear-gradient(145deg,#0f172a,#1e293b)] px-6 py-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto bg-slate-900/95 rounded-3xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] w-full max-w-6xl p-8 md:p-10 flex flex-col gap-10 border border-slate-700"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <h1 className="text-lg font-semibold text-slate-200">
            {isEditing ? "Edytuj projekt" : "Nowy projekt"}
          </h1>
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

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 flex flex-col gap-6 min-w-[320px]">
            <div>
              <label className="block mb-1 font-medium text-slate-200">Nazwa projektu</label>
              <input
                className="border border-slate-600 w-full rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nazwa projektu"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-slate-200">
                Koordynator (członek organizacji)
              </label>
              <Autocomplete
                value={coordinator ? `${coordinator.first_name} ${coordinator.last_name}` : searchCoord}
                onChange={(v) => {
                  setSearchCoord(v);
                  setCoordinator(null);
                }}
                options={filteredCoordinators}
                onSelect={handleCoordinatorSelect}
                placeholder="Wyszukaj koordynatora"
                inputClassName="border border-slate-600 w-full rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                getOptionLabel={(m) => `${m.first_name} ${m.last_name} (${m.username})`}
              />
            </div>
          </div>

          <div className="flex-[2] flex flex-col min-w-[400px]">
            <label className="block mb-1 font-medium text-slate-200">Lista członków</label>
            <div className="border border-slate-700 rounded-xl p-4 min-h-[320px] flex flex-col gap-2 bg-slate-800 h-[420px]">
              <div className="flex gap-2 mb-2 relative">
                <Autocomplete
                  value={memberInput}
                  onChange={(v) => setMemberInput(v)}
                  options={memberOptions}
                  onSelect={handleMemberSelect}
                  placeholder="Dodaj członka (autocomplete)"
                  inputClassName="border border-slate-600 rounded-lg px-3 py-2 w-full bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  getOptionLabel={(m) => m.label}
                />
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-1">
                {loadingMembers ? (
                  <span className="text-slate-400">Ładowanie członków…</span>
                ) : members.length > 0 ? (
                  members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 border-b border-slate-700 py-1">
                      <span className="text-slate-100">
                        {m.first_name} {m.last_name} ({m.username})
                        {coordinator && coordinator.id === m.id && (
                          <span className="ml-2 text-xs text-indigo-400 font-semibold">
                            (koordynator)
                          </span>
                        )}
                      </span>
                      <button
                        className="ml-auto border border-red-500 px-2 py-0.5 rounded text-xs text-red-400 bg-transparent hover:bg-red-500/10 transition disabled:opacity-40"
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={coordinator && coordinator.id === m.id}
                        title={
                          coordinator && coordinator.id === m.id
                            ? "Koordynator nie może być usunięty"
                            : "Usuń"
                        }
                        type="button"
                      >
                        usuń
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 italic">Brak członków w projekcie</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mt-8">
          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-10 py-3 rounded-xl text-lg font-semibold shadow hover:brightness-110 transition w-full md:w-auto disabled:opacity-50"
            disabled={!name.trim() || !coordinator || members.length === 0 || submitting}
          >
            {isEditing ? "Zapisz zmiany" : "Stwórz projekt"}
          </button>
          {isEditing && (
            <button
              type="button"
              className="border border-red-500 px-8 py-3 rounded-xl text-lg text-red-400 bg-transparent hover:bg-red-500/10 transition w-full md:w-auto"
              onClick={handleDelete}
            >
              Usuń projekt
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
