import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { EVENTS, TAGS, PROJECTS } from "../../../api/fakeData.js";
import { Edit2, Eye } from "lucide-react";
import TagCombinationsPicker from "../../shared/components/TagCombinationsPicker.jsx";

// Generuj listę godzin co 15 minut
const generateTimeOptions = () => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = String(h).padStart(2, '0');
      const minute = String(m).padStart(2, '0');
      times.push(`${hour}:${minute}`);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

// Lekki, kontrolowany dropdown na czas
function TimeSelect({ value, onChange, placeholder = "-- Wybierz --" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null); // <--- NEW

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Auto-scroll listy do wybranej godziny lub 06:00
  useEffect(() => {
    if (!open || !listRef.current) return;
    const targetTime = (value && TIME_OPTIONS.includes(value)) ? value : "06:00";
    const el = listRef.current.querySelector(`[data-time="${targetTime}"]`);
    if (el) {
      listRef.current.scrollTop = el.offsetTop - 8;
    } else {
      listRef.current.scrollTop = 0;
    }
  }, [open, value]);

  const select = (t) => {
    onChange(t);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 text-left hover:border-indigo-500 focus:outline-none focus:border-indigo-500"
      >
        {value || <span className="text-slate-400">{placeholder}</span>}
      </button>
      {open && (
        <div
          ref={listRef} // <--- NEW
          className="absolute left-0 bottom-full mb-1 z-50 w-full max-h-56 overflow-y-auto rounded-md border border-slate-700 bg-slate-800 shadow-xl"
        >
          <button
            type="button"
            onClick={() => select("")}
            className={`w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/60 text-left ${value === "" ? "bg-slate-700/40" : ""}`}
          >
            -- Brak --
          </button>
          {TIME_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              data-time={t} // <--- NEW
              onClick={() => select(t)}
              className={`w-full px-3 py-2 text-sm text-slate-100 hover:bg-slate-700/60 text-left ${value === t ? "bg-indigo-600/40" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { event: editingEvent, date: presetDate, time: presetTime } = location.state || {};

  const [title, setTitle] = useState(editingEvent?.title || "");
  const [description, setDescription] = useState(editingEvent?.description || "");
  const [date, setDate] = useState(editingEvent?.date || presetDate || "");
  const [startTime, setStartTime] = useState(editingEvent?.start_time || presetTime || "");
  const [endTime, setEndTime] = useState(editingEvent?.end_time || "");
  const [selectedTags, setSelectedTags] = useState(editingEvent?.tags || []);
  const [isEditing, setIsEditing] = useState(!editingEvent);

  // NEW: combinations state (init from event.tagCombinations or event.tags)
  const [combinations, setCombinations] = useState(() => {
    if (editingEvent?.tagCombinations?.length) return editingEvent.tagCombinations;
    if (editingEvent?.tags?.length) return [editingEvent.tags];
    return [];
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    // flatten unique tags from combinations
    const flatTags = Array.from(new Set((combinations || []).flat()));

    if (editingEvent) {
      const eventIndex = EVENTS.findIndex((ev) => ev.id === editingEvent.id);
      if (eventIndex !== -1) {
        EVENTS[eventIndex] = {
          ...EVENTS[eventIndex],
          title: title.trim(),
          description: description.trim(),
          date,
          start_time: startTime,
          end_time: endTime,
          tags: flatTags,
          tagCombinations: combinations, // keep combinations
        };
      }
    } else {
      const newEvent = {
        id: `e${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        date,
        start_time: startTime,
        end_time: endTime,
        tags: flatTags,
        tagCombinations: combinations,
      };
      EVENTS.push(newEvent);
    }

    navigate("/calendar");
  };

  const handleDelete = () => {
    if (!editingEvent) return;
    const eventIndex = EVENTS.findIndex((ev) => ev.id === editingEvent.id);
    if (eventIndex !== -1) {
      EVENTS.splice(eventIndex, 1);
    }
    navigate("/calendar");
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] flex items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/95 rounded-3xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] p-12 w-full max-w-4xl flex flex-col gap-8 border border-slate-700"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">
            {editingEvent ? (isEditing ? "Edytuj wydarzenie" : "Szczegóły wydarzenia") : "Nowe wydarzenie"}
          </h1>
          <div className="flex gap-2">
            {editingEvent && (
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
              onClick={() => navigate("/calendar")}
            >
              Powrót
            </button>
          </div>
        </div>

        {!isEditing && editingEvent ? (
          <div className="flex flex-col gap-6">
            <div className="pb-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-slate-100 mb-2">{title}</h2>
              {description ? (
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{description}</p>
              ) : (
                <p className="text-slate-500 italic">Brak opisu</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-sm text-slate-400 block mb-1">Data</span>
                <span className="text-slate-200 font-medium">
                  {new Date(date).toLocaleDateString("pl-PL", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div>
                <span className="text-sm text-slate-400 block mb-1">Godziny</span>
                {startTime || endTime ? (
                  <span className="text-slate-200 font-medium">
                    {startTime && `${startTime}`}
                    {startTime && endTime && " - "}
                    {endTime && `${endTime}`}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Cały dzień</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-sm text-slate-400 block mb-2">Tagi (kombinacje)</span>
              {combinations?.length ? (
                <div className="flex flex-wrap gap-2">
                  {combinations.map((combo, idx) => (
                    <span key={idx} className="bg-violet-600/80 text-white px-3 py-1 rounded-full text-sm">
                      {combo.join(" + ")}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 italic">Brak tagów</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="text-slate-300 text-sm font-medium">Tytuł wydarzenia</span>
              <input
                className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Np. Spotkanie zespołu"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-slate-300 text-sm font-medium">Opis</span>
              <textarea
                className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 min-h-[120px] resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Szczegółowy opis wydarzenia..."
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-slate-300 text-sm font-medium">Data</span>
                <input
                  type="date"
                  className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-slate-300 text-sm font-medium">Od (godz.)</span>
                <TimeSelect
                  value={startTime}
                  onChange={setStartTime}
                  placeholder="-- Wybierz --"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-slate-300 text-sm font-medium">Do (godz.)</span>
                <TimeSelect
                  value={endTime}
                  onChange={setEndTime}
                  placeholder="-- Wybierz --"
                />
              </label>
            </div>

            {/* REPLACED: simple tags -> combinations picker */}
            <TagCombinationsPicker
              value={combinations}
              onChange={setCombinations}
              suggestions={[...PROJECTS.map((p) => p.name), ...TAGS]}
              label="Tagi / Projekty"
            />
          </div>
        )}

        {isEditing && (
          <div className="flex flex-col sm:flex-row gap-4 justify-between mt-4">
            <button
              type="submit"
              disabled={!title.trim() || !date}
              className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-500 to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-semibold shadow hover:brightness-110 transition"
            >
              {editingEvent ? "Zapisz zmiany" : "Utwórz wydarzenie"}
            </button>
            {editingEvent && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 sm:flex-none border border-red-500 px-8 py-3 rounded-xl text-sm text-red-400 bg-transparent hover:bg-red-500/10 transition font-semibold"
              >
                Usuń wydarzenie
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
