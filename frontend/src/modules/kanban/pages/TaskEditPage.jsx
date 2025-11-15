import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FAKE_MEMBERS, KANBAN_BOARDS } from "../../../api/fakeData.js";
import Autocomplete from "../../shared/components/Autocomplete.jsx";
import { Edit2, Eye } from "lucide-react";

export default function TaskEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { task: editingTask, projectId, columnId, returnTo = 'kanban' } = location.state || {};

  const [title, setTitle] = useState(editingTask?.title || "");
  const [description, setDescription] = useState(editingTask?.description || "");
  const [deadline, setDeadline] = useState(editingTask?.deadline || "");
  const [assignee, setAssignee] = useState(editingTask?.assignee || null);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(!editingTask);

  const createdAt = editingTask?.createdAt || new Date().toISOString();

  const filteredMembers = FAKE_MEMBERS.filter((m) =>
    (m.first_name + " " + m.last_name + " " + m.username)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleAssigneeSelect = (m) => {
    setAssignee(m);
    setSearch("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !columnId) return;

    const board = KANBAN_BOARDS[projectId];
    if (!board) return;

    const column = board.columns.find((col) => col.id === columnId);
    if (!column) return;

    if (editingTask) {
      // Edycja
      const taskIndex = column.items.findIndex((t) => t.id === editingTask.id);
      if (taskIndex !== -1) {
        column.items[taskIndex] = {
          ...column.items[taskIndex],
          title: title.trim(),
          description: description.trim(),
          deadline,
          assignee,
        };
      }
    } else {
      // Tworzenie
      const newTask = {
        id: `t${Date.now()}`,
        taskId: `ORG-${Date.now().toString().slice(-4)}`,
        title: title.trim(),
        description: description.trim(),
        deadline,
        assignee,
        createdAt,
      };
      column.items.push(newTask);
    }

    if (returnTo === 'dashboard') {
      navigate("/dashboard");
    } else {
      navigate("/kanban", { state: { projectId } });
    }
  };

  const handleDelete = () => {
    if (!editingTask || !projectId || !columnId) return;
    const board = KANBAN_BOARDS[projectId];
    if (!board) return;

    const column = board.columns.find((col) => col.id === columnId);
    if (!column) return;

    column.items = column.items.filter((t) => t.id !== editingTask.id);
    if (returnTo === 'dashboard') {
      navigate("/dashboard");
    } else {
      navigate("/kanban", { state: { projectId } });
    }
  };

  const handleBack = () => {
    if (returnTo === 'dashboard') {
      navigate("/dashboard");
    } else {
      navigate("/kanban", { state: { projectId } });
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] flex items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/95 rounded-3xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] p-12 w-full max-w-4xl flex flex-col gap-8 border border-slate-700"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">
            {editingTask ? (isEditing ? "Edytuj zadanie" : "Szczegóły zadania") : "Nowe zadanie"}
          </h1>
          <div className="flex gap-2">
            {editingTask && (
              <button
                type="button"
                className="border border-slate-600 px-4 py-2 rounded-lg text-slate-200 hover:bg-slate-700/40 transition flex items-center gap-2"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                {isEditing ? "Podgląd" : "Edytuj"}
              </button>
            )}
            <button
              type="button"
              className="border border-slate-600 px-4 py-2 rounded-lg text-slate-200 hover:bg-slate-700/40 transition"
              onClick={handleBack}
            >
              Powrót
            </button>
          </div>
        </div>

        {!isEditing && editingTask ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
              <span className="text-sm font-mono text-indigo-400 font-semibold">{editingTask.taskId}</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">
                Utworzono: {new Date(createdAt).toLocaleDateString("pl-PL", { 
                  day: "2-digit", 
                  month: "long", 
                  year: "numeric" 
                })}
              </span>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-slate-100 mb-2">{title}</h2>
              {description ? (
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{description}</p>
              ) : (
                <p className="text-slate-500 italic">Brak opisu</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700">
              <div>
                <span className="text-sm text-slate-400 block mb-1">Termin</span>
                {deadline ? (
                  <span className="text-slate-200 font-medium">
                    {new Date(deadline).toLocaleDateString("pl-PL", { 
                      day: "2-digit", 
                      month: "long", 
                      year: "numeric" 
                    })}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Nie ustawiono</span>
                )}
              </div>
              
              <div>
                <span className="text-sm text-slate-400 block mb-1">Przypisana osoba</span>
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {assignee.first_name[0]}{assignee.last_name[0]}
                    </div>
                    <span className="text-slate-200 font-medium">
                      {assignee.first_name} {assignee.last_name}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">Nieprzypisane</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="text-slate-300 text-sm font-medium">Nazwa zadania</span>
              <input
                className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Np. Implementacja modułu logowania"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-slate-300 text-sm font-medium">Opis</span>
              <textarea
                className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 min-h-[120px] resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Szczegółowy opis zadania..."
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-slate-300 text-sm font-medium">Termin (deadline)</span>
                <input
                  type="date"
                  className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-slate-300 text-sm font-medium">Osoba przypisana</span>
                <Autocomplete
                  value={assignee ? `${assignee.first_name} ${assignee.last_name}` : search}
                  onChange={(v) => {
                    setSearch(v);
                    setAssignee(null);
                  }}
                  options={filteredMembers}
                  onSelect={handleAssigneeSelect}
                  placeholder="Wybierz osobę..."
                  inputClassName="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  getOptionLabel={(m) => `${m.first_name} ${m.last_name} (${m.username})`}
                />
                {assignee && (
                  <div className="text-xs text-slate-400 mt-1">
                    Przypisano: {assignee.first_name} {assignee.last_name}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="flex flex-col sm:flex-row gap-4 justify-between mt-4">
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-500 to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-semibold shadow hover:brightness-110 transition"
            >
              {editingTask ? "Zapisz zmiany" : "Utwórz zadanie"}
            </button>
            {editingTask && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 sm:flex-none border border-red-500 px-8 py-3 rounded-xl text-sm text-red-400 bg-transparent hover:bg-red-500/10 transition font-semibold"
              >
                Usuń zadanie
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
