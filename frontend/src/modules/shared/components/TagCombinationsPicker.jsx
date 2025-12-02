import React, { useState, useRef, useEffect } from "react";
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
  const [dropdownAbove, setDropdownAbove] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  const combinations = value || [];
  const allSuggestions = suggestions || [];
  const currentCombination =
    editingIndex !== null ? combinations[editingIndex] : [];

  // Check if dropdown should appear above (default: above, unless more space below)
  useEffect(() => {
    if (editingIndex === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 200; // Approximate height

    // Default to above, only go below if significantly more space below
    setDropdownAbove(
      !(spaceBelow > dropdownHeight && spaceBelow > spaceAbove + 50)
    );
  }, [editingIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (editingIndex === null) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setEditingIndex(null);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingIndex]);

  const filtered = allSuggestions
    .filter((s) => !s.includes("+")) // Only simple tags
    .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    .filter((s) => !currentCombination.includes(s))
    .slice(0, 75);

  const mainFiltered = allSuggestions
    .filter((s) => !s.includes("+")) // Only simple tags
    .filter((s) => s.toLowerCase().includes(mainQuery.toLowerCase()))
    .slice(0, 75);

  const handleMainSelect = (val) => {
    // Sprawdź czy kombinacja [val] już istnieje
    const exists = combinations.some(
      (combo) => combo.length === 1 && combo[0] === val
    );
    if (exists) return; // Nie dodawaj duplikatu

    onChange([...(combinations || []), [val]]);
    setMainQuery("");
  };

  const handleSelect = (val) => {
    if (editingIndex === null) return;
    const updatedCombo = [...combinations[editingIndex], val];

    // Sprawdź czy taka kombinacja już istnieje (ignorując kolejność)
    const sortedNew = [...updatedCombo].sort().join("+");
    const existingIndex = combinations.findIndex((combo, idx) => {
      if (idx === editingIndex) return false; // Pomijamy edytowaną kombinację
      const sortedExisting = [...combo].sort().join("+");
      return sortedExisting === sortedNew;
    });

    if (existingIndex !== -1) {
      // Jeśli kombinacja już istnieje, usuń edytowaną (zachowaj istniejącą) i zakończ edycję
      const next = combinations.filter((_, i) => i !== editingIndex);
      onChange(next);
      setQuery("");
      setEditingIndex(null);
      return;
    }

    const next = combinations.map((c, i) =>
      i === editingIndex ? updatedCombo : c
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

      {/* Pasek kombinacji – poziomy scroll bez zmiany wysokości całego formularza */}
      {combinations.length > 0 && (
        <div className="relative" ref={containerRef}>
          <div className="flex flex-wrap gap-2 mt-2">
            {combinations.map((combo, idx) => (
              <div
                key={idx}
                className="flex items-center bg-indigo-600 text-white rounded-full px-3 py-1.5 text-sm whitespace-nowrap"
              >
                <div className="flex items-center">
                  {combo.map((tag, i) => (
                    <span key={i} className="flex items-center">
                      <span>{tag}</span>
                      {i < combo.length - 1 && (
                        <span className="px-1 text-slate-200/70">+</span>
                      )}
                    </span>
                  ))}
                </div>
                <span className="mx-2 h-4 w-px bg-white/35" />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingIndex(idx)}
                    className="p-1 rounded hover:bg-indigo-700 transition"
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
            ))}
          </div>

          {editingIndex !== null && (
            <div
              ref={dropdownRef}
              className={`absolute left-0 right-0 z-50 rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-xl ${
                dropdownAbove ? "bottom-full mb-2" : "top-full mt-2"
              }`}
            >
              <p className="text-slate-300 text-xs mb-3">
                Dodaj tag lub projekt do kombinacji:
              </p>
              <Autocomplete
                value={query}
                onChange={setQuery}
                options={filtered.map((s) => ({ id: s, label: s }))}
                onSelect={(opt) => handleSelect(opt.label)}
                placeholder="Wybierz tag/projekt..."
                inputClassName="border border-slate-600 rounded-lg px-3 py-2 w-full bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                getOptionLabel={(o) => o.label}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  Zakończ edycję
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
