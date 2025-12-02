import React, { useRef, useEffect, useMemo, useState } from "react";
import TagList from "../../dashboard/components/TagList.jsx";
import { useNavigate } from "react-router-dom";
import { useProjects } from "./ProjectsContext.jsx";
import useAuth from "../../../auth/useAuth.js";
import { getTags } from "../../../api/organizations.js";

export default function FiltersPanel({
  filtersOpen,
  openFilters,
  closeFilters,
  selectedTags,
  logic,
  setLogic,
  toggleTag,
}) {
  const tagListRootRef = useRef(null);
  const navigate = useNavigate();
  const { allProjects, projectsVersion } = useProjects();
  const { organization, user } = useAuth();
  const [allTags, setAllTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  useEffect(() => {
    if (!organization?.id || !user?.username) {
      setAllTags([]);
      return;
    }
    let ignore = false;
    setTagsLoading(true);
    getTags(organization.id, user.username)
      .then((data) => {
        if (ignore) return;
        setAllTags(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!ignore) setAllTags([]);
      })
      .finally(() => {
        if (!ignore) setTagsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [organization?.id, user?.username, projectsVersion]);

  // Funkcja rozbijająca złożone nazwy na składniki
  const splitNames = (namesArr) => {
    return namesArr
      .flatMap(name => name.split(/[+,]/).map(s => s.trim()))
      .filter(Boolean);
  };

  // Zbierz wszystkie nazwy projektów
  const projectNamesRaw = useMemo(() => allProjects.map((p) => p.name).filter(Boolean), [allProjects]);
  // Rozbij projekty na składniki
  const projectNames = useMemo(() => splitNames(projectNamesRaw), [projectNamesRaw]);

  // Zbierz wszystkie nazwy tagów
  const tagNamesRaw = useMemo(() => allTags.map((t) => t.name).filter(Boolean), [allTags]);
  // Rozbij tagi na składniki
  const tagNames = useMemo(() => splitNames(tagNamesRaw), [tagNamesRaw]);

  // Połącz projekty i tagi, usuń duplikaty
  const allFilterItems = useMemo(() => {
    return Array.from(new Set([...projectNames, ...tagNames])).sort();
  }, [projectNames, tagNames]);

  useEffect(() => {
    console.log('Lista filtrów (allFilterItems):', allFilterItems);
    console.log('Wybrane filtry (selectedTags):', selectedTags, '| Tryb logiczny:', logic);
  }, [allFilterItems, selectedTags, logic]);

  useEffect(() => {
    if (!filtersOpen) return;
    const root = tagListRootRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,div");
    nodes.forEach((el) => {
      const text = (el.textContent || "").trim().toLowerCase();
      if (text === "tagi") el.style.display = "none";
    });
    const btns = Array.from(root.querySelectorAll("button"));
    const group = btns.find((b) =>
      ["AND", "OR"].includes((b.textContent || "").trim().toUpperCase())
    )?.parentElement;
    if (group && root.contains(group)) group.style.display = "none";
  }, [filtersOpen]);

  return (
    <>
      {/* Trigger button can be placed outside; overlay */}
      <div
        onClick={closeFilters}
        className={`fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          filtersOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`fixed left-0 top-0 z-[70] h-full w-[420px] max-w-[90vw] transform rounded-r-2xl border-r border-[rgba(148,163,184,0.35)] bg-[rgba(15,23,42,0.98)] shadow-[0_25px_60px_rgba(15,23,42,0.6)] transition-transform duration-300 ${
          filtersOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="m-0 text-base font-semibold text-slate-200">
              Filtry
            </h2>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/60 p-1">
              <button
                type="button"
                onClick={() => setLogic("AND")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  logic === "AND"
                    ? "bg-violet-600 text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)]"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                }`}
              >
                AND
              </button>
              <button
                type="button"
                onClick={() => setLogic("OR")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  logic === "OR"
                    ? "bg-violet-600 text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)]"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                }`}
              >
                OR
              </button>
            </div>
          </div>
          <button
            onClick={closeFilters}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-700/40 transition"
            aria-label="Zamknij filtry"
          >
            <span className="block h-5 w-5 leading-5 text-center">×</span>
          </button>
        </div>

        <div
          ref={tagListRootRef}
          className="flex h-[calc(100%-64px-72px)] flex-col overflow-hidden px-5 py-4"
        >
          {tagsLoading ? (
            <p className="text-slate-400 text-sm">Ładowanie filtrów…</p>
          ) : (
            <TagList
              tags={allFilterItems}
              projects={allProjects}
              selectedTags={selectedTags}
              logic={logic}
              setLogic={setLogic}
              toggleTag={toggleTag}
            />
          )}
        </div>

        <div className="flex gap-2 border-t border-[rgba(148,163,184,0.2)] px-5 py-4">
          <button
            onClick={() => navigate("/organization/project/new")}
            className="flex-1 rounded-[14px] bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/30 hover:brightness-110 transition"
          >
            nowy projekt
          </button>
          <button
            onClick={() => navigate("/organization/tag/new")}
            className="flex-1 rounded-[14px] bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/30 hover:brightness-110 transition"
          >
            nowy tag
          </button>
        </div>
      </aside>
    </>
  );
}
