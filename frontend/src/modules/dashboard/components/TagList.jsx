import React from "react";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TagList({
  tags,
  projects = [],
  selectedTags,
  logic,
  setLogic,
  toggleTag,
}) {
  const navigate = useNavigate();

  const handleEdit = (tag) => {
    const project = projects.find((p) => p.name === tag);
    if (project) {
      navigate("/organization/project/new", { state: { project } });
    } else {
      // Tag
      navigate("/organization/tag/new", { state: { tag: { name: tag } } });
    }
  };

  return (
    <div className="border-t border-slate-600/30 pt-2 flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm md:text-base text-slate-300">Tagi</span>
      </div>
      <ul className="flex-1 overflow-y-auto pr-2 space-y-1.5 overscroll-contain">
        {tags.map((t) => {
          const isProject = projects.some((p) => p.name === t);
          return (
            <li key={t}>
              <label
                htmlFor={`tag-${t}`}
                className={`group flex items-center gap-3 w-full cursor-pointer rounded-lg px-2 py-2 transition-colors ${
                  isProject
                    ? "hover:bg-violet-500/10 border border-violet-500/20"
                    : "hover:bg-slate-700/30 border border-transparent"
                }`}
              >
                <input
                  id={`tag-${t}`}
                  type="checkbox"
                  checked={selectedTags.includes(t)}
                  onChange={() => toggleTag(t)}
                  className="peer sr-only"
                />
                <span className="grid place-items-center h-5 w-5 rounded-md border border-slate-500/50 bg-slate-900/40 peer-checked:bg-sky-500 peer-checked:border-sky-500 transition-colors">
                  <svg
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5 text-sky-300 opacity-0 peer-checked:opacity-100 transition-opacity"
                  >
                    <path
                      d="M7.5 13.2 4.8 10.5l-1.3 1.3 4 4 9-9-1.3-1.3-7.7 7.7z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span className="text-xs opacity-60 mr-1">
                  {isProject ? "📁" : "🏷️"}
                </span>
                <span
                  className={`text-sm md:text-[15px] leading-none ${
                    isProject ? "text-violet-200 font-medium" : "text-slate-300"
                  }`}
                >
                  {t}
                </span>
                {isProject && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    projekt
                  </span>
                )}
                <button
                  type="button"
                  className="ml-auto p-1 rounded hover:bg-slate-700/40 transition"
                  title={isProject ? "Edytuj projekt" : "Edytuj tag"}
                  onClick={(e) => {
                    e.preventDefault();
                    handleEdit(t);
                  }}
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                </button>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
