import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { getOrganizationMembers } from "../../../api/organizations.js";
import { TAGS, setTagMembers, renameTag, deleteTag } from "../../../api/fakeData.js";
import Autocomplete from "../../shared/components/Autocomplete.jsx";

export default function TagEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organization } = useAuth();
  const editingTag = location.state?.tag || null;

  const [name, setName] = useState(editingTag?.name || "");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState([]);

  const [availableMembers, setAvailableMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState(null);

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
        }));
        setAvailableMembers(normalized);
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
  }, [organization?.id, user?.username]);

  const filteredMembers = availableMembers
    .filter((m) => !members.some((mem) => mem.id === m.id))
    .filter((m) =>
      (m.first_name + " " + m.last_name + " " + m.username + " " + m.email)
        .toLowerCase()
        .includes(memberInput.toLowerCase())
    );

  const handleMemberSelect = (m) => {
    setMembers((prev) => [...prev, m]);
    setMemberInput("");
  };

  const handleRemoveMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    if (editingTag) {
      // Zmień nazwę tagu jeśli się zmieniła
      if (name !== editingTag.name) {
        renameTag(editingTag.name, name);
      }
      // Zaktualizuj członków tagu
      setTagMembers(name, members.map(m => m.id));
    } else {
      // Dodaj nowy tag
      TAGS.push(name);
      setTagMembers(name, members.map(m => m.id));
    }
    
    navigate("/dashboard");
  };

  const handleDelete = () => {
    if (!editingTag) return;
    deleteTag(editingTag.name);
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
            {editingTag ? "Edytuj tag" : "Nowy tag"}
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
              <label className="block mb-1 font-medium text-slate-200">Nazwa tagu</label>
              <input
                className="border border-slate-600 w-full rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nazwa tagu"
                required
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
                  options={filteredMembers}
                  onSelect={handleMemberSelect}
                  placeholder="Dodaj członka (autocomplete)"
                  inputClassName="border border-slate-600 rounded-lg px-3 py-2 w-full bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  getOptionLabel={(m) => `${m.first_name} ${m.last_name} (${m.username})`}
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
                      </span>
                      <button
                        className="ml-auto border border-red-500 px-2 py-0.5 rounded text-xs text-red-400 bg-transparent hover:bg-red-500/10 transition"
                        onClick={() => handleRemoveMember(m.id)}
                        type="button"
                      >
                        usuń
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 italic">Brak członków w tagu</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mt-8">
          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-10 py-3 rounded-xl text-lg font-semibold shadow hover:brightness-110 transition w-full md:w-auto"
            disabled={!name.trim()}
          >
            {editingTag ? "Zaktualizuj tag" : "Stwórz tag"}
          </button>
         {editingTag && (
            <button
              type="button"
              className="border border-red-500 px-8 py-3 rounded-xl text-lg text-red-400 bg-transparent hover:bg-red-500/10 transition w-full md:w-auto"
              onClick={handleDelete}
            >
              Usuń tag
            </button>
         )}
        </div>
      </form>
    </div>
  );
}
