import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TAGS, PROJECTS, CHATS } from "../../../api/fakeData.js";
import Autocomplete from "../../shared/components/Autocomplete.jsx";
import { Plus, X } from "lucide-react";

export default function ChatCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [combinations, setCombinations] = useState([]); // Każdy element to tablica tagów (kombinacja)
  const [editingIndex, setEditingIndex] = useState(null);
  const [query, setQuery] = useState("");
  const [mainQuery, setMainQuery] = useState("");

  const allSuggestions = [...PROJECTS.map(p => p.name), ...TAGS];

  const currentCombination = editingIndex !== null ? combinations[editingIndex] : [];
  
  const filtered = allSuggestions
    .filter(s => s.toLowerCase().includes(query.toLowerCase()))
    .filter(s => !currentCombination.includes(s))
    .slice(0, 50);

  const mainFiltered = allSuggestions
    .filter(s => s.toLowerCase().includes(mainQuery.toLowerCase()))
    .slice(0, 50);

  const handleSelect = (val) => {
    if (editingIndex !== null) {
      setCombinations(prev => {
        const updated = [...prev];
        updated[editingIndex] = [...updated[editingIndex], val];
        return updated;
      });
    }
    setQuery("");
    setEditingIndex(null);
  };

  const handleMainSelect = (val) => {
    // Dodaj nowy faucet z tym tagiem
    setCombinations(prev => [...prev, [val]]);
    setMainQuery("");
  };

  const handleRemoveCombo = (comboIdx) => {
    setCombinations(prev => prev.filter((_, i) => i !== comboIdx));
    if (editingIndex === comboIdx) {
      setEditingIndex(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const flatTags = combinations.flat();
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
            <span className="text-slate-300 text-sm font-medium">Nazwa chatu</span>
            <input
              className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Np. Planowanie sprintu"
              required
            />
          </label>

          <div className="flex flex-col gap-3 relative">
            <span className="text-slate-300 text-sm font-medium">Tagi / Projekty</span>
            
            <Autocomplete
              value={mainQuery}
              onChange={setMainQuery}
              options={mainFiltered.map(s => ({ id: s, label: s }))}
              onSelect={opt => handleMainSelect(opt.label)}
              placeholder="Dodaj tag lub projekt (tworzy nową kombinację)..."
              inputClassName="border border-slate-600 rounded-lg px-3 py-2 w-full bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              getOptionLabel={o => o.label}
              dropdownClassName=""
            />

            {combinations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {combinations.map((combo, idx) => {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="flex items-center bg-violet-600/80 text-white rounded-full px-3 py-1.5 text-sm select-none"
                    >
                      <div className="flex items-center">
                        {combo.map((tag, i) => (
                          <span key={i} className="flex items-center">
                            <span className="whitespace-nowrap">{tag}</span>
                            {i < combo.length - 1 && (
                              <span className="px-1 text-slate-200/70">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                      <span className="mx-2 h-4 w-px bg-white/35 rounded-sm" />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(idx)}
                          className="p-1 rounded hover:bg-violet-500/40 transition"
                          title="Dodaj tag"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCombo(idx)}
                          className="p-1 rounded hover:bg-red-500/30 transition"
                          title="Usuń kombinację"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {editingIndex !== null && (
             <div className="absolute left-0 right-0 top-full z-50 mt-2 p-4 bg-indigo-900/30 border border-indigo-700 rounded-xl shadow-lg backdrop-blur-sm">
               <p className="text-indigo-300 text-xs mb-3">Dodaj tag lub projekt do kombinacji:</p>
                <Autocomplete
                  value={query}
                  onChange={setQuery}
                  options={filtered.map(s => ({ id: s, label: s }))}
                  onSelect={opt => handleSelect(opt.label)}
                  placeholder="Wybierz tag/projekt..."
                  inputClassName="border border-slate-600 rounded-lg px-3 py-2 w-full bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  getOptionLabel={o => o.label}
                  dropdownClassName=""
                />
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="mt-3 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zakończ edycję
                </button>
              </div>
            )}
          </div>
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
