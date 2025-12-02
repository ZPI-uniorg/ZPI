import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { CHATS } from "../../../api/fakeData.js"; // retained for compatibility
import apiClient from "../../../api/client.js";
import useAuth from "../../../auth/useAuth.js";
import TagCombinationsPicker from "../../shared/components/TagCombinationsPicker.jsx";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";

export default function ChatCreatePage() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get("org") || null;
  const { projects, refreshChats } = useProjects();
  const [title, setTitle] = useState("");
  const [combinations, setCombinations] = useState([]);

  const allSuggestions = projects.map((p) => p.name).filter(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    // Convert combinations to backend format: "tag1+tag2,tag3"
    const permissionsStr = (combinations || [])
      .map((combo) => combo.join("+"))
      .join(",");
    // Persist via backend API
    const BACKEND_BASE =
      typeof window !== "undefined"
        ? import.meta.env?.VITE_BACKEND_URL ||
          `${window.location.protocol}//localhost:8000`
        : "http://localhost:8000";
    const finalOrgId = organizationId || organization?.id;
    if (!finalOrgId) {
      console.error(
        "No organization id available (query param 'org' or auth context)"
      );
      return;
    }
    const payload = {
      name: title.trim(),
      organization: finalOrgId,
      permissions: permissionsStr,
    };
    apiClient
      .post(`chats/${finalOrgId}/create/`, payload)
      .then(async () => {
        await refreshChats();
        navigate("/dashboard");
      })
      .catch((e) => {
        if (e.response) {
          console.error(
            "Chat create failed",
            e.response.status,
            e.response.data
          );
        } else {
          console.error("Chat create error", e.message);
        }
      });
  };

  return (
    <div className="h-full flex items-center justify-center bg-[linear-gradient(145deg,#0f172a,#1e293b)] px-6 py-8 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/95 rounded-3xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] w-full max-w-3xl p-8 md:p-10 flex flex-col gap-8 border border-slate-700 my-8"
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
