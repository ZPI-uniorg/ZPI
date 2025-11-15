import React, { useState } from "react";
import Autocomplete from "./Autocomplete.jsx";
import { Plus, X } from "lucide-react";

export default function TagCombinationsPicker({
  value,
  onChange,
  suggestions,
  label = "Tagi / Projekty",
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [query, setQuery] = useState("");
  const [mainQuery, setMainQuery] = useState("");

  const combinations = value || [];
  const allSuggestions = suggestions || [];
  const currentCombination = editingIndex !== null ? combinations[editingIndex] : [];

  const filtered = allSuggestions
    .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    .filter((s) => !currentCombination.includes(s))
    .slice(0, 50);

  const mainFiltered = allSuggestions
    .filter((s) => s.toLowerCase().includes(mainQuery.toLowerCase()))
    .slice(0, 50);

  const handleMainSelect = (val) => {
    onChange([...(combinations || []), [val]]);
    setMainQuery("");
  };

  const handleSelect = (val) => {
    if (editingIndex === null) return;
    const next = combinations.map((c, i) =>
      i === editingIndex ? [...c, val] : c
    );
    onChange(next);
    setQuery("");
    setEditingIndex(null);
  };

  const handleRemoveCombo = (idx) => {
    const next = combinations.filter((_, i) => i !== idx);
    onChange(next);
    if (editingIndex === idx) setEditingIndex(null);
  };

  return (
    <div className="flex flex-col gap-3 relative">
      <span className="text-slate-300 text-sm font-medium">{label}</span>

      <Autocomplete
        value={mainQuery}
        onChange={setMainQuery}
        options={mainFiltered.map((s) => ({ id: s, label: s }))}
        onSelect={(opt) => handleMainSelect(opt.label)}
        placeholder="Dodaj tag lub projekt (tworzy nową kombinację)..."
        inputClassName="border border-slate-600 rounded-lg px-3 py-2 w-full bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
        getOptionLabel={(o) => o.label}
      />

      {combinations?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {combinations.map((combo, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex items-center bg-violet-600/80 text-white rounded-full px-3 py-1.5 text-sm select-none">
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
          ))}
        </div>
      )}

      {editingIndex !== null && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 p-4 bg-indigo-900/30 border border-indigo-700 rounded-xl shadow-lg backdrop-blur-sm">
          <p className="text-indigo-300 text-xs mb-3">Dodaj tag lub projekt do kombinacji:</p>
          <Autocomplete
            value={query}
            onChange={setQuery}
            options={filtered.map((s) => ({ id: s, label: s }))}
            onSelect={(opt) => handleSelect(opt.label)}
            placeholder="Wybierz tag/projekt..."
            inputClassName="border border-slate-600 rounded-lg px-3 py-2 w-full bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            getOptionLabel={(o) => o.label}
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
  );
}
