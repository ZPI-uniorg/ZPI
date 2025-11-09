import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FAKE_MEMBERS, PROJECTS } from "../../../api/fakeData.js";
import Autocomplete from "../../shared/components/Autocomplete.jsx";

export default function ProjectEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingProject = location.state?.project || null;

  const [name, setName] = useState(editingProject?.name || "");
  const [coordinator, setCoordinator] = useState(editingProject?.coordinator || null);
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState(editingProject?.members || (coordinator ? [coordinator] : []));
  const [search, setSearch] = useState("");

  const availableMembers = FAKE_MEMBERS.filter(
    (m) => !members.some((mem) => mem.id === m.id)
  );
  const filteredCoordinators = FAKE_MEMBERS.filter((m) =>
    (m.first_name + " " + m.last_name + " " + m.username + " " + m.email)
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const filteredMembers = availableMembers.filter((m) =>
    (m.first_name + " " + m.last_name + " " + m.username + " " + m.email)
      .toLowerCase()
      .includes(memberInput.toLowerCase())
  );

  const handleCoordinatorSelect = (m) => {
    setCoordinator(m);
    if (!members.some((mem) => mem.id === m.id)) {
      setMembers((prev) => [...prev, m]);
    }
    setSearch("");
  };

  const handleMemberSelect = (m) => {
    setMembers((prev) => [...prev, m]);
    setMemberInput("");
  };

  const handleRemoveMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (coordinator && coordinator.id === id) setCoordinator(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !coordinator || members.length === 0) return;
    
    if (editingProject) {
      const idx = PROJECTS.findIndex(p => p.id === editingProject.id);
      if (idx !== -1) {
        PROJECTS[idx] = { ...PROJECTS[idx], name, coordinator, members };
      }
    } else {
      const newProject = {
        id: `p${Date.now()}`,
        name,
        coordinator,
        members,
      };
      PROJECTS.push(newProject);
    }
    
    navigate("/dashboard");
  };

  const handleDelete = () => {
    if (!editingProject) return;
    const idx = PROJECTS.findIndex(p => p.id === editingProject.id);
    if (idx !== -1) {
      PROJECTS.splice(idx, 1);
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] flex items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/95 rounded-3xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] p-12 w-full max-w-6xl flex flex-col gap-10 border border-slate-700"
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
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 flex flex-col gap-6 min-w-[320px]">
            <div>
              <label className="block mb-1 font-medium text-slate-200">Nazwa projektu</label>
              <input
                className="border border-slate-600 w-full rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nazwa projektu"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-slate-200">Koordynator (członek organizacji)</label>
              <Autocomplete
                value={coordinator ? `${coordinator.first_name} ${coordinator.last_name}` : search}
                onChange={v => { setSearch(v); setCoordinator(null); }}
                options={filteredCoordinators}
                onSelect={handleCoordinatorSelect}
                placeholder="Wyszukaj koordynatora"
                inputClassName="border border-slate-600 w-full rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                getOptionLabel={m => `${m.first_name} ${m.last_name} (${m.username})`}
              />
            </div>
          </div>
          <div className="flex-[2] flex flex-col min-w-[400px]">
            <label className="block mb-1 font-medium text-slate-200">Lista członków</label>
            <div className="border border-slate-700 rounded-xl p-4 min-h-[320px] flex flex-col gap-2 bg-slate-800 h-[420px]">
              <div className="flex gap-2 mb-2 relative">
                <Autocomplete
                  value={memberInput}
                  onChange={v => setMemberInput(v)}
                  options={filteredMembers}
                  onSelect={handleMemberSelect}
                  placeholder="Dodaj członka (autocomplete)"
                  inputClassName="border border-slate-600 rounded-lg px-3 py-2 w-full bg-slate-900 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  getOptionLabel={m => `${m.first_name} ${m.last_name} (${m.username})`}
                />
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-1">
                {members.length > 0 ? (
                  members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 border-b border-slate-700 py-1">
                      <span className="text-slate-100">
                        {m.first_name} {m.last_name} ({m.username})
                        {coordinator && coordinator.id === m.id && (
                          <span className="ml-2 text-xs text-indigo-400 font-semibold">(koordynator)</span>
                        )}
                      </span>
                      <button
                        className="ml-auto border border-red-500 px-2 py-0.5 rounded text-xs text-red-400 bg-transparent hover:bg-red-500/10 transition"
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={coordinator && coordinator.id === m.id}
                        title={coordinator && coordinator.id === m.id ? "Koordynator nie może być usunięty" : "Usuń"}
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
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-10 py-3 rounded-xl text-lg font-semibold shadow hover:brightness-110 transition w-full md:w-auto"
            disabled={!name.trim() || !coordinator || members.length === 0}
          >
            {editingProject ? "Zaktualizuj projekt" : "Stwórz projekt"}
          </button>
          {editingProject && (
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
