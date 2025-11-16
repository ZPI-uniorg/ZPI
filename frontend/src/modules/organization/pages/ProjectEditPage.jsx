import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { createProject, updateProject } from "../../../api/projects.js";
import { getOrganizationMembers } from "../../../api/organizations.js";

export default function ProjectEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organization } = useAuth();
  const editingProject = location.state?.project || null;

  const ROLE_LABELS = {
    admin: "Administrator",
    coordinator: "Koordynator",
    member: "Członek",
  };

  const extractMemberUsernames = (inputMembers) => {
    if (!Array.isArray(inputMembers)) {
      return [];
    }
    const usernames = [];
    inputMembers.forEach((item) => {
      const username = typeof item === "string" ? item : item?.username;
      if (!username) {
        return;
      }
      if (!usernames.includes(username)) {
        usernames.push(username);
      }
    });
    return usernames;
  };

  const [form, setForm] = useState({
    name: editingProject?.name ?? "",
    description: editingProject?.description ?? "",
    start_dte: editingProject?.start_dte ?? "",
    end_dte: editingProject?.end_dte ?? "",
    members: (() => {
      const extracted = extractMemberUsernames(editingProject?.members);
      if (extracted.length > 0) {
        return extracted;
      }
      if (organization?.role === "coordinator" && user?.username) {
        return [user.username];
      }
      return [];
    })(),
    coordinator_username: (() => {
      if (editingProject?.coordinator_username) {
        return editingProject.coordinator_username;
      }
      if (organization?.role === "coordinator" && user?.username) {
        return user.username;
      }
      return "";
    })(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);

  const isEditing = Boolean(editingProject?.id);

  useEffect(() => {
    const extractedMembers = extractMemberUsernames(editingProject?.members);
    const initialMembers = extractedMembers.length > 0
      ? extractedMembers
      : (organization?.role === "coordinator" && user?.username
          ? [user.username]
          : []);

    const initialCoordinator = editingProject?.coordinator_username
      ? editingProject.coordinator_username
      : (organization?.role === "coordinator" && user?.username ? user.username : "");

    setForm({
      name: editingProject?.name ?? "",
      description: editingProject?.description ?? "",
      start_dte: editingProject?.start_dte ?? "",
      end_dte: editingProject?.end_dte ?? "",
      members: Array.from(new Set(initialMembers.filter(Boolean))),
      coordinator_username: initialCoordinator,
    });
  }, [editingProject, organization?.role, user?.username]);

  useEffect(() => {
    if (!organization?.id || !user?.username) {
      setAvailableMembers([]);
      return;
    }

    let ignore = false;
    setMembersLoading(true);
    setMembersError(null);

    getOrganizationMembers(organization.id, user.username)
      .then((data) => {
        if (ignore) {
          return;
        }

        const normalized = data
          .map((member) => ({
            id: member.user_id ?? member.id ?? member.username,
            username: member.username,
            first_name: member.first_name ?? "",
            last_name: member.last_name ?? "",
            role: member.role,
          }))
          .sort((a, b) => {
            const nameA = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.username;
            const nameB = [b.first_name, b.last_name].filter(Boolean).join(" ") || b.username;
            return nameA.localeCompare(nameB, "pl", { sensitivity: "base" });
          });

        setAvailableMembers(normalized);

        const allowedUsernames = new Set(normalized.map((member) => member.username));
        const coordinatorAllowedUsernames = new Set(
          normalized
            .filter((member) => member.role === "coordinator")
            .map((member) => member.username)
        );
        setForm((prev) => {
          const coordinatorValid = prev.coordinator_username && coordinatorAllowedUsernames.has(prev.coordinator_username)
            ? prev.coordinator_username
            : "";
          const filteredMembers = prev.members.filter((username) => allowedUsernames.has(username));
          const mergedMembers = coordinatorValid
            ? Array.from(new Set([...filteredMembers, coordinatorValid]))
            : filteredMembers;
          if (
            filteredMembers.length === prev.members.length &&
            coordinatorValid === prev.coordinator_username
          ) {
            return prev;
          }
          return {
            ...prev,
            members: mergedMembers,
            coordinator_username: coordinatorValid,
          };
        });
      })
      .catch((err) => {
        if (ignore) {
          return;
        }
        setMembersError(
          err.response?.data?.error ??
            err.response?.data?.detail ??
            "Nie udało się pobrać członków organizacji."
        );
        setAvailableMembers([]);
      })
      .finally(() => {
        if (!ignore) {
          setMembersLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [organization?.id, user?.username]);

  const selectedMembers = useMemo(() => new Set(form.members), [form.members]);

  const lockedUsernames = useMemo(() => {
    const locked = new Set();
    if (form.coordinator_username) {
      locked.add(form.coordinator_username);
    }
    if (!form.coordinator_username && organization?.role === "coordinator" && user?.username) {
      locked.add(user.username);
    }
    return locked;
  }, [form.coordinator_username, organization?.role, user?.username]);

  const selectedMembersCount = useMemo(() => (
    new Set([
      ...form.members.filter((member) => typeof member === "string" && member.trim()),
      ...Array.from(lockedUsernames),
    ]).size
  ), [form.members, lockedUsernames]);

  const toggleMember = (username) => {
    const normalizedUsername = typeof username === "string" ? username.trim() : "";
    if (!normalizedUsername || lockedUsernames.has(normalizedUsername)) {
      return;
    }
    setForm((prev) => {
      const exists = prev.members.includes(normalizedUsername);
      const updatedMembers = exists
        ? prev.members.filter((member) => member !== normalizedUsername)
        : [...prev.members, normalizedUsername];
      return { ...prev, members: updatedMembers };
    });
  };

  const handleCoordinatorChange = (event) => {
    const { value } = event.target;
    const normalizedValue = value.trim();
    setForm((prev) => {
      const coordinatorValue = normalizedValue;
      const updatedMembers = coordinatorValue
        ? Array.from(new Set([...prev.members, coordinatorValue]))
        : prev.members.filter((member) => member !== prev.coordinator_username);
      return {
        ...prev,
        coordinator_username: coordinatorValue,
        members: updatedMembers,
      };
    });
  };

  const coordinatorOptions = useMemo(() => {
    if (!availableMembers.length) {
      return [];
    }
    return availableMembers
      .filter((member) => member.role === "coordinator")
      .map((member) => ({
        value: member.username,
        label: [member.first_name, member.last_name].filter(Boolean).join(" ") || member.username,
        role: member.role,
      }));
  }, [availableMembers]);

  const coordinatorDisplay = useMemo(() => {
    if (!form.coordinator_username) {
      return "Brak koordynatora";
    }
    const match = availableMembers.find((member) => member.username === form.coordinator_username);
    if (!match) {
      return form.coordinator_username;
    }
    const name = [match.first_name, match.last_name].filter(Boolean).join(" ") || match.username;
    return `${name}${name ? " • " : ""}${match.username}`;
  }, [form.coordinator_username, availableMembers]);

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

    const normalizedMembers = Array.from(
      new Set([
        ...form.members
          .map((member) => (typeof member === "string" ? member.trim() : ""))
          .filter(Boolean),
        ...Array.from(lockedUsernames),
      ])
    );

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      start_dte: form.start_dte,
      end_dte: form.end_dte,
      members: normalizedMembers,
      coordinator_username: form.coordinator_username || null,
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
              mogą przypisać koordynatora już podczas tworzenia projektu lub zrobić to później przy edycji.
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-medium">Koordynator</span>
            </div>
            {organization?.role === "admin" ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-slate-400">Wybierz osobę odpowiedzialną za projekt</span>
                  <select
                    value={form.coordinator_username}
                    onChange={handleCoordinatorChange}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Brak przypisanego koordynatora</option>
                    {coordinatorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} — {ROLE_LABELS[option.role] ?? option.role}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-slate-500">
                  Koordynator zawsze ma dostęp do projektu i nie może zostać odznaczony z listy członków.
                </p>
                {coordinatorOptions.length === 0 && (
                  <p className="text-xs text-amber-400">
                    Lista zawiera tylko użytkowników z rolą "Koordynator". Zmień rolę w sekcji "Członkowie", aby umożliwić wybór.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
                {coordinatorDisplay}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-medium">Członkowie projektu</span>
              <span className="text-xs text-slate-400">{selectedMembersCount} wybranych</span>
            </div>
            {membersError && (
              <p className="text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2 text-xs">
                {membersError}
              </p>
            )}
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 max-h-56 overflow-y-auto">
              {membersLoading ? (
                <p className="px-3 py-2 text-sm text-slate-400">Ładowanie członków…</p>
              ) : availableMembers.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">Brak dostępnych członków organizacji.</p>
              ) : (
                <ul className="divide-y divide-slate-800/60">
                  {availableMembers.map((member) => {
                    const isSelected = selectedMembers.has(member.username);
                    const isLocked = lockedUsernames.has(member.username);
                    const fullName = [member.first_name, member.last_name].filter(Boolean).join(" ");
                    return (
                      <li key={member.id || member.username} className="px-3 py-2">
                        <label className={`flex items-center justify-between gap-4 ${isLocked ? "opacity-80" : ""}`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 disabled:opacity-60"
                              checked={isSelected}
                              disabled={isLocked}
                              onChange={() => toggleMember(member.username)}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-100">
                                {fullName || member.username}
                              </span>
                              <span className="text-xs text-slate-400">
                                {ROLE_LABELS[member.role] ?? member.role}
                                {fullName ? ` • ${member.username}` : ''}
                              </span>
                            </div>
                          </div>
                          {isLocked && (
                            <span className="text-[11px] uppercase tracking-wider text-slate-500">
                              stały
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
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
