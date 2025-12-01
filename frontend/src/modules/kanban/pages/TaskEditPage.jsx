import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { createTask, updateTask, deleteTask } from "../../../api/kanban.js";
import { getProjectMembers } from "../../../api/organizations.js";
import Autocomplete from "../../shared/components/Autocomplete.jsx";
import { Edit2, Eye } from "lucide-react";

export default function TaskEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organization } = useAuth();
  const {
    task: editingTask,
    projectId,
    boardId,
    columnId,
    returnTo = "kanban",
  } = location.state || {};

  const [title, setTitle] = useState(editingTask?.title || "");
  const [description, setDescription] = useState(
    editingTask?.description || ""
  );
  const [deadline, setDeadline] = useState(editingTask?.due_date || "");
  const [assignee, setAssignee] = useState(null);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(!editingTask);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createdAt = editingTask?.created_at || new Date().toISOString();

  // Fetch project members only
  useEffect(() => {
    if (!organization?.id || !user?.username || !projectId) return;

    getProjectMembers(organization.id, projectId, user.username)
      .then((data) => {
        console.log("Fetched members:", data);
        const normalized = (data || []).map((m) => ({
          id: m.user_id ?? m.id ?? m.username,
          username: m.username,
          first_name: m.first_name ?? "",
          last_name: m.last_name ?? "",
          email: m.email ?? "",
          role: m.role,
        }));
        setMembers(normalized);

        // Set assignee if editing task
        if (editingTask?.assigned_to_id) {
          const assigned = normalized.find(
            (m) => m.id === editingTask.assigned_to_id
          );
          if (assigned) setAssignee(assigned);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch members:", err);
      });
  }, [
    organization?.id,
    user?.username,
    projectId,
    editingTask?.assigned_to_id,
  ]);

  const filteredMembers = members.filter((m) => {
    if (!search || search.trim() === "") return true; // Show all when empty
    return (m.first_name + " " + m.last_name + " " + m.username)
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const memberOptions = filteredMembers.map((m) => ({
    ...m,
    label: `${m.first_name} ${m.last_name} (${m.username})`,
  }));

  const handleAssigneeSelect = (m) => {
    setAssignee(m);
    setSearch("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !title.trim() ||
      !projectId ||
      !columnId ||
      !boardId ||
      !organization?.id ||
      !user?.username
    ) {
      setError("Brak wymaganych danych");
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      due_date: deadline || null,
      assigned_to_id: assignee?.id || null,
      status: editingTask?.status || 1, // 1 = TODO
    };

    // Optimistic: navigate immediately, let request finish in background
    if (returnTo === "dashboard") {
      navigate("/dashboard");
    } else {
      navigate("/kanban", { state: { projectId } });
    }

    try {
      if (editingTask) {
        // Update existing task
        await updateTask(
          organization.id,
          boardId,
          columnId,
          editingTask.task_id,
          user.username,
          taskData
        );
      } else {
        // Create new task
        const tasksInColumn = 0; // Could be passed from parent
        await createTask(organization.id, boardId, columnId, user.username, {
          ...taskData,
          position: tasksInColumn,
        });
      }
    } catch (err) {
      console.error("Failed to save task:", err);
      // Task will be missing on refetch; user can try again
    }
  };

  const handleDelete = async () => {
    if (
      !editingTask ||
      !projectId ||
      !columnId ||
      !boardId ||
      !organization?.id ||
      !user?.username
    )
      return;

    if (!window.confirm("Czy na pewno chcesz usunąć to zadanie?")) return;

    // Optimistic: navigate immediately, delete in background
    if (returnTo === "dashboard") {
      navigate("/dashboard");
    } else {
      navigate("/kanban", { state: { projectId } });
    }

    try {
      await deleteTask(
        organization.id,
        boardId,
        columnId,
        editingTask.task_id,
        user.username
      );
    } catch (err) {
      console.error("Failed to delete task:", err);
      // Task will reappear on refetch; user can retry
    }
  };

  const handleBack = () => {
    if (returnTo === "dashboard") {
      navigate("/dashboard");
    } else {
      navigate("/kanban", { state: { projectId } });
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-8">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/95 rounded-3xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] p-12 w-full max-w-4xl flex flex-col gap-8 border border-slate-700 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">
            {editingTask
              ? isEditing
                ? "Edytuj zadanie"
                : "Szczegóły zadania"
              : "Nowe zadanie"}
          </h1>
          <div className="flex gap-2">
            {editingTask && (
              <button
                type="button"
                className="border border-slate-600 px-4 py-2 rounded-lg text-slate-200 hover:bg-slate-700/40 transition flex items-center gap-2"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <Edit2 className="w-4 h-4" />
                )}
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

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {!isEditing && editingTask ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
              <span className="text-sm font-mono text-indigo-400 font-semibold">
                #{editingTask.task_id}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">
                Utworzono:{" "}
                {new Date(createdAt).toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-100 mb-2">
                {title}
              </h2>
              {description ? (
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              ) : (
                <p className="text-slate-500 italic">Brak opisu</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700">
              <div>
                <span className="text-sm text-slate-400 block mb-1">
                  Termin
                </span>
                {deadline ? (
                  <span className="text-slate-200 font-medium">
                    {new Date(deadline).toLocaleDateString("pl-PL", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Nie ustawiono</span>
                )}
              </div>

              <div>
                <span className="text-sm text-slate-400 block mb-1">
                  Przypisana osoba
                </span>
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {assignee.first_name?.[0]}
                      {assignee.last_name?.[0]}
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
              <span className="text-slate-300 text-sm font-medium">
                Nazwa zadania
              </span>
              <div className="relative">
                <input
                  className="border border-slate-600 w-full rounded-lg px-3 py-2 pr-16 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  value={title}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 50) {
                      setTitle(val);
                    }
                  }}
                  placeholder="Np. Implementacja modułu logowania"
                  maxLength={50}
                  required
                />
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none ${
                  title.length >= 50 ? 'text-red-400' : 
                  title.length >= 40 ? 'text-yellow-400' : 
                  'text-slate-400'
                }`}>
                  {title.length}/50
                </div>
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm font-medium">Opis</span>
                <span className={`text-xs font-medium ${
                  description.length >= 500 ? 'text-red-400' : 
                  description.length >= 400 ? 'text-yellow-400' : 
                  'text-slate-400'
                }`}>
                  {description.length}/500
                </span>
              </div>
              <textarea
                className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 min-h-[120px] resize-y"
                value={description}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= 500) {
                    setDescription(val);
                  }
                }}
                placeholder="Szczegółowy opis zadania..."
                maxLength={500}
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-slate-300 text-sm font-medium">
                  Termin (deadline)
                </span>
                <input
                  type="date"
                  className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-slate-300 text-sm font-medium">
                  Osoba przypisana
                </span>
                <Autocomplete
                  value={
                    assignee
                      ? `${assignee.first_name} ${assignee.last_name}`
                      : search
                  }
                  onChange={(v) => {
                    setSearch(v);
                    setAssignee(null);
                  }}
                  options={memberOptions}
                  onSelect={handleAssigneeSelect}
                  placeholder="Wybierz osobę..."
                  inputClassName="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  getOptionLabel={(m) => m.label}
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
              disabled={!title.trim() || loading}
              className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-500 to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-semibold shadow hover:brightness-110 transition"
            >
              {loading
                ? "Zapisywanie..."
                : editingTask
                ? "Zapisz zmiany"
                : "Utwórz zadanie"}
            </button>
            {editingTask && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 sm:flex-none border border-red-500 px-8 py-3 rounded-xl text-sm text-red-400 bg-transparent hover:bg-red-500/10 transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Usuwanie..." : "Usuń zadanie"}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
