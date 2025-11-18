import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CHATS } from "../../../api/fakeData.js";
import { getAllProjects, getUserProjects } from "../../../api/projects.js";
import useAuth from "../../../auth/useAuth.js";
import TagCombinationsPicker from "../../shared/components/TagCombinationsPicker.jsx";

export default function ChatCreatePage() {
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const [title, setTitle] = useState("");
  const [combinations, setCombinations] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!organization?.id || !user?.username) {
      setProjects([]);
      return;
    }
    async function loadProjects() {
      try {
        const fetcher =
          organization.role === "admin" ? getAllProjects : getUserProjects;
        const data = await fetcher(organization.id, user.username);
        setProjects(Array.isArray(data) ? data : []);
      } catch {
        setProjects([]);
      }
    }
    loadProjects();
  }, [organization?.id, organization?.role, user?.username]);

  const allSuggestions = projects.map((p) => p.name).filter(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const flatTags = Array.from(new Set((combinations || []).flat()));
    CHATS.push({
      id: `c${Date.now()}`,
      title: title.trim(),
      tags: flatTags,
      tagCombinations: combinations,
    });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] flex items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/95 rounded-3xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] p-10 w-full max-w-3xl flex flex-col gap-8 border border-slate-700"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-100">Nowy chat</h1>
          <button
            type="button"
            className="border border-slate-600 px-4 py-2 rounded-lg text-slate-200 hover:bg-slate-700/40 transition"
            onClick={() => navigate("/dashboard")}
          >
            Powrót
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-slate-300 text-sm font-medium">
              Nazwa chatu
            </span>
            <input
              className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Np. Planowanie sprintu"
              required
            />
          </label>

          <TagCombinationsPicker
            value={combinations}
            onChange={setCombinations}
            suggestions={allSuggestions}
            label="Tagi / Projekty"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-end mt-4">
          <button
            type="submit"
            disabled={!title.trim()}
            className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-500 to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-semibold shadow hover:brightness-110 transition"
          >
            Stwórz chat
          </button>
        </div>
      </form>
    </div>
  );
}
