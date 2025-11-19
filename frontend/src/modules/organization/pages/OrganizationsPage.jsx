import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addOrganizationMember,
  getOrganizationMembers,
  listOrganizations,
  removeOrganizationMember,
  updateOrganizationMember,
  updateOrganizationMemberProfile,
} from "../../../api/organizations.js";
import useAuth from "../../../auth/useAuth.js";

const emptyMemberForm = {
  first_name: "",
  last_name: "",
  email: "",
  username: "",
  password: "",
  role: "member",
};

const ROLE_LABELS = {
  admin: "Administrator",
  coordinator: "Koordynator",
  member: "Członek",
};

function generatePassword(length = 12) {
  const charset =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789@$!%*#?&";
  let password = "";
  const cryptoObj = window.crypto || window.msCrypto;
  if (cryptoObj?.getRandomValues) {
    const randomValues = new Uint32Array(length);
    cryptoObj.getRandomValues(randomValues);
    for (let i = 0; i < length; i += 1) {
      password += charset[randomValues[i] % charset.length];
    }
  } else {
    for (let i = 0; i < length; i += 1) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
  }
  return password;
}

function generateUsername(prefix = "member") {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${suffix}`;
}

function OrganizationsPage() {
  const { user, organization: activeOrganization } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [organizationsError, setOrganizationsError] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberError, setMemberError] = useState(null);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [lastCreatedCredentials, setLastCreatedCredentials] = useState(null);
  const [memberSuccess, setMemberSuccess] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [memberEditForm, setMemberEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });
  const [memberEditSubmitting, setMemberEditSubmitting] = useState(false);
  const [memberEditError, setMemberEditError] = useState(null);

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedOrgId) ?? null,
    [organizations, selectedOrgId]
  );

  const isAdmin = selectedOrganization?.role === "admin";

  const loadOrganizations = useCallback(async () => {
    if (!user?.username) {
      setOrganizations([]);
      return;
    }
    setOrganizationsLoading(true);
    setOrganizationsError(null);
    try {
      const data = await listOrganizations(user.username);
      setOrganizations(data);
      const preferredOrg =
        activeOrganization &&
        data.find(
          (org) =>
            org.id === activeOrganization.id ||
            org.slug === activeOrganization.slug
        );
      if (preferredOrg) {
        setSelectedOrgId(preferredOrg.id);
      } else if (!selectedOrgId && data.length > 0) {
        setSelectedOrgId(data[0].id);
      } else if (
        selectedOrgId &&
        !data.some((org) => org.id === selectedOrgId)
      ) {
        setSelectedOrgId(data[0]?.id ?? null);
      }
    } catch (error) {
      setOrganizationsError(
        error.response?.data?.error ??
          error.response?.data?.detail ??
          "Nie udało się pobrać organizacji."
      );
    } finally {
      setOrganizationsLoading(false);
    }
  }, [selectedOrgId, activeOrganization, user?.username]);

  useEffect(() => {
    if (!activeOrganization) {
      return;
    }
    setSelectedOrgId((current) => {
      if (current) {
        return current;
      }
      return activeOrganization.id ?? current;
    });
  }, [activeOrganization]);

  const loadMembers = useCallback(async (organizationId) => {
    if (!organizationId) {
      setMembers([]);
      return;
    }
    if (!user?.username) {
      setMembers([]);
      return;
    }
    setMembersLoading(true);
    setMemberError(null);
    try {
      const data = await getOrganizationMembers(organizationId, user.username);
      const normalized = data.map((member) => ({
        id: member.user_id,
        user: member.user_id,
        username: member.username,
        first_name: member.first_name ?? "",
        last_name: member.last_name ?? "",
        email: member.email ?? "",
        role: member.role,
        permissions: member.permissions ?? [],
      }));
      setMembers(normalized);
    } catch (error) {
      setMemberError(
        error.response?.data?.error ??
          error.response?.data?.detail ??
          "Nie udało się pobrać członków organizacji."
      );
    } finally {
      setMembersLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (selectedOrgId) {
      loadMembers(selectedOrgId);
    }
  }, [selectedOrgId, loadMembers]);

  useEffect(() => {
    setEditingMember(null);
    setMemberEditForm({
      first_name: "",
      last_name: "",
      email: "",
    });
    setMemberEditError(null);
  }, [selectedOrgId]);

  const handleMemberFormChange = (event) => {
    const { name, value } = event.target;
    setMemberForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateCredentials = () => {
    setMemberForm((prev) => ({
      ...prev,
      username:
        prev.username ||
        generateUsername(selectedOrganization?.slug ?? "member"),
      password: generatePassword(),
    }));
  };

  const startEditMember = (member) => {
    setEditingMember(member);
    setMemberEditForm({
      first_name: member.first_name ?? "",
      last_name: member.last_name ?? "",
      email: member.email ?? "",
    });
    setMemberEditError(null);
    setMemberSuccess(null);
    setMemberError(null);
  };

  const handleEditMemberFormChange = (event) => {
    const { name, value } = event.target;
    setMemberEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    if (!selectedOrgId || !user?.username) return;
    const submission = {
      username: memberForm.username.trim(),
      password: memberForm.password,
      email: memberForm.email.trim(),
      first_name: memberForm.first_name.trim(),
      last_name: memberForm.last_name.trim(),
      role: memberForm.role,
    };
    setMemberSubmitting(true);
    setMemberError(null);
    setMemberSuccess(null);
    setLastCreatedCredentials(null);

    try {
      const response = await addOrganizationMember(
        selectedOrgId,
        user.username,
        submission
      );
      await loadMembers(selectedOrgId);
      setMemberSuccess(
        response?.message ?? "Nowy użytkownik został dodany do organizacji."
      );
      setLastCreatedCredentials({
        username: response?.member?.username ?? submission.username,
        email: response?.member?.email ?? submission.email,
        password: response?.password ?? null,
        passwordRetained: response?.password_retained ?? false,
      });
      setMemberForm((prev) => ({
        ...emptyMemberForm,
        role: prev.role,
      }));
    } catch (error) {
      setMemberError(
        error.response?.data?.error ??
          error.response?.data?.detail ??
          "Nie udało się dodać członka."
      );
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (!selectedOrgId || !user?.username) return;
    try {
      await updateOrganizationMember(selectedOrgId, memberId, user.username, {
        role: newRole,
      });
      await loadMembers(selectedOrgId);
    } catch (error) {
      setMemberError(
        error.response?.data?.error ??
          error.response?.data?.detail ??
          "Nie udało się zaktualizować roli."
      );
    }
  };

  const handleUpdateMember = async (event) => {
    event.preventDefault();
    if (!selectedOrgId || !user?.username || !editingMember?.username) {
      return;
    }

    const payload = {
      first_name: memberEditForm.first_name.trim(),
      last_name: memberEditForm.last_name.trim(),
      email: memberEditForm.email.trim(),
    };

    setMemberEditSubmitting(true);
    setMemberEditError(null);
    setMemberError(null);
    setMemberSuccess(null);

    try {
      await updateOrganizationMemberProfile(
        selectedOrgId,
        editingMember.username,
        user.username,
        payload
      );
      await loadMembers(selectedOrgId);
      setMemberSuccess("Dane użytkownika zostały zaktualizowane.");
      setEditingMember(null);
      setMemberEditForm({ first_name: "", last_name: "", email: "" });
    } catch (error) {
      const message =
        error.response?.data?.error ??
        error.response?.data?.detail ??
        "Nie udało się zaktualizować danych użytkownika.";
      setMemberEditError(message);
      setMemberError(message);
    } finally {
      setMemberEditSubmitting(false);
    }
  };

  const handleCancelEditMember = () => {
    setEditingMember(null);
    setMemberEditForm({ first_name: "", last_name: "", email: "" });
    setMemberEditError(null);
    setMemberError(null);
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedOrgId || !user?.username) return;
    if (!window.confirm("Czy na pewno chcesz usunąć tego członka?")) return;
    try {
      await removeOrganizationMember(selectedOrgId, memberId, user.username);
      await loadMembers(selectedOrgId);
      if (editingMember?.username === memberId) {
        setEditingMember(null);
        setMemberEditForm({ first_name: "", last_name: "", email: "" });
      }
    } catch (error) {
      setMemberError(
        error.response?.data?.error ??
          error.response?.data?.detail ??
          "Nie udało się usunąć członka."
      );
    }
  };

  if (organizationsLoading && !selectedOrganization) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4">
        <div className="bg-slate-800 rounded-xl p-6 shadow">
          <p className="text-slate-200">Ładujemy dane organizacji…</p>
        </div>
      </div>
    );
  }

  if (!selectedOrganization) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4">
        <div className="bg-slate-800 rounded-xl p-6 shadow">
          <h2 className="text-xl font-semibold text-slate-100 mb-2">
            Brak powiązanej organizacji
          </h2>
          {organizationsError ? (
            <p className="text-slate-200">{organizationsError}</p>
          ) : (
            <p className="text-slate-300">
              Twoje konto nie jest jeszcze przypisane do żadnej organizacji.
              Skontaktuj się z administratorem.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Sekcja organizacji (bez sticky) */}
      <section className="bg-slate-800 rounded-xl p-6 shadow flex flex-col lg:flex-row items-start justify-between gap-6">
        <div>
          <p className="text-slate-400 text-sm uppercase tracking-wide">
            Organizacja
          </p>
          <h1 className="text-2xl font-bold text-slate-100">
            {selectedOrganization.name}
          </h1>
          <p className="text-slate-300 mt-1">
            {selectedOrganization.description || "Brak opisu organizacji."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-700 text-slate-200 text-xs font-medium">
            {ROLE_LABELS[selectedOrganization.role] ??
              selectedOrganization.role}
          </span>
          <span className="text-slate-300 text-sm">
            {members.length} członków
          </span>
          <span className="text-slate-300 text-sm">
            Administrator: {user?.first_name || user?.username}
          </span>
        </div>
      </section>

      {organizationsError && (
        <p className="mb-0 text-red-400 bg-red-500/10 border border-red-400/30 rounded px-4 py-3">
          {organizationsError}
        </p>
      )}
      {memberError && (
        <p className="mb-0 text-red-400 bg-red-500/10 border border-red-400/30 rounded px-4 py-3">
          {memberError}
        </p>
      )}
      {memberSuccess && (
        <p className="mb-0 text-green-400 bg-green-500/10 border border-green-400/30 rounded px-4 py-3">
          {memberSuccess}
        </p>
      )}

      {lastCreatedCredentials && (
        <div className="bg-slate-800 rounded-xl p-6 shadow">
          <h2 className="text-lg font-semibold text-slate-100">
            Dane nowego użytkownika
          </h2>
          <p className="text-slate-300 mb-3">
            Zapisz te dane i przekaż użytkownikowi. Hasło nie będzie widoczne
            ponownie.
          </p>
          <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-3 items-center">
            <span className="text-slate-300">Login:</span>
            <input
              readOnly
              value={lastCreatedCredentials.username}
              className="rounded px-2 py-1 border border-slate-700 bg-slate-900 text-slate-100"
            />
            <span className="text-slate-300">Email:</span>
            <input
              readOnly
              value={lastCreatedCredentials.email || ""}
              className="rounded px-2 py-1 border border-slate-700 bg-slate-900 text-slate-100"
            />
            {lastCreatedCredentials.password ? (
              <>
                <span className="text-slate-300">Hasło:</span>
                <input
                  readOnly
                  value={lastCreatedCredentials.password}
                  className="rounded px-2 py-1 border border-slate-700 bg-slate-900 text-slate-100"
                />
              </>
            ) : (
              <span className="col-span-2 text-slate-400 text-sm">
                {lastCreatedCredentials.passwordRetained
                  ? "Hasło pozostało bez zmian dla istniejącego użytkownika."
                  : "Podczas dodawania nie ustawiono nowego hasła."}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sekcja członków (naprawiona) */}
      <section className="bg-slate-800 rounded-xl shadow p-6 mb-6">
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Członkowie</h2>
          <span className="text-slate-300">{members.length} osób</span>
        </header>

        {membersLoading ? (
          <p className="text-slate-300">Ładowanie członków…</p>
        ) : members.length === 0 ? (
          <p className="text-slate-300">Brak członków w tej organizacji.</p>
        ) : (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto rounded border border-slate-700/50">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="text-slate-300">
                  <th className="py-2 px-4">Użytkownik</th>
                  <th className="py-2 px-4">Kontakt</th>
                  <th className="py-2 px-4">Rola</th>
                  <th className="py-2 px-4">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-t border-slate-700 align-top">
                    <td className="py-2 px-4">
                      <strong className="text-slate-100">{member.username}</strong><br />
                      <small className="text-slate-300">{member.first_name} {member.last_name}</small>
                    </td>
                    <td className="py-2 px-4">
                      <small className="text-slate-300">{member.email || "—"}</small>
                    </td>
                    <td className="py-2 px-4">
                      {isAdmin ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.username, e.target.value)}
                          disabled={member.user === user?.id}
                          className="rounded px-2 py-1 border border-slate-600 bg-slate-900 text-slate-100"
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-200">
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {isAdmin ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-indigo-300 hover:underline"
                            onClick={() => startEditMember(member)}
                          >
                            Edytuj
                          </button>
                          {member.user !== user?.id && (
                            <button
                              type="button"
                              className="text-red-400 hover:underline"
                              onClick={() => handleRemoveMember(member.username)}
                            >
                              Usuń
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin && editingMember && (
          <div className="mt-8 border-t border-slate-700 pt-6">
            <h3 className="text-base font-semibold text-slate-100 mb-2">
              Edytuj użytkownika: {editingMember.username}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Wprowadź aktualne dane kontaktowe członka projektu.
            </p>
            {memberEditError && (
              <p className="mb-4 text-red-400 bg-red-500/10 border border-red-400/30 rounded px-4 py-3 text-sm">
                {memberEditError}
              </p>
            )}
            <form onSubmit={handleUpdateMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-slate-200 font-medium">Imię</span>
                <input
                  name="first_name"
                  value={memberEditForm.first_name}
                  onChange={handleEditMemberFormChange}
                  className="rounded px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-slate-200 font-medium">Nazwisko</span>
                <input
                  name="last_name"
                  value={memberEditForm.last_name}
                  onChange={handleEditMemberFormChange}
                  className="rounded px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </label>
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-slate-200 font-medium">Adres email</span>
                <input
                  name="email"
                  type="email"
                  value={memberEditForm.email}
                  onChange={handleEditMemberFormChange}
                  className="rounded px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </label>
              <div className="flex items-center gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={memberEditSubmitting}
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-5 py-2 rounded font-semibold disabled:opacity-60"
                >
                  {memberEditSubmitting ? "Zapisywanie…" : "Zapisz zmiany"}
                </button>
                <button
                  type="button"
                  className="text-slate-300 hover:underline"
                  onClick={handleCancelEditMember}
                >
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {isAdmin ? (
        <section className="bg-slate-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-100">
            Dodaj nowego członka
          </h2>
          <p className="text-slate-300 mb-4">
            Wygeneruj dane logowania, a następnie przekaż je nowemu
            użytkownikowi.
          </p>
          <form onSubmit={handleAddMember} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-slate-200 font-medium">Imię</span>
                <input
                  name="first_name"
                  value={memberForm.first_name}
                  onChange={handleMemberFormChange}
                  className="rounded px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-slate-200 font-medium">Nazwisko</span>
                <input
                  name="last_name"
                  value={memberForm.last_name}
                  onChange={handleMemberFormChange}
                  className="rounded px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-slate-200 font-medium">Email nowego członka</span>
              <input
                name="email"
                type="email"
                value={memberForm.email}
                onChange={handleMemberFormChange}
                className="rounded px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-slate-200 font-medium">Login nowego członka</span>
                <input
                  name="username"
                  value={memberForm.username}
                  onChange={handleMemberFormChange}
                  placeholder="np. member-abc123"
                  required
                  className="rounded px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-slate-200 font-medium">Hasło</span>
                <input
                  name="password"
                  type="text"
                  value={memberForm.password}
                  onChange={handleMemberFormChange}
                  placeholder="Wygeneruj bezpieczne hasło"
                  required
                  className="rounded px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] items-end gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-slate-200 font-medium">Rola</span>
                <select
                  name="role"
                  value={memberForm.role}
                  onChange={handleMemberFormChange}
                  className="rounded px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded px-4 py-2 font-semibold border border-indigo-500/30 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/25 transition"
                onClick={handleGenerateCredentials}
              >
                Wygeneruj dane logowania
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={memberSubmitting}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-5 py-2 rounded font-semibold disabled:opacity-60"
              >
                {memberSubmitting ? "Dodawanie…" : "Dodaj członka"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <p className="text-slate-400">
          Tylko administratorzy mogą dodawać nowych członków.
        </p>
      )}
    </div>
  );
}

export default OrganizationsPage;
