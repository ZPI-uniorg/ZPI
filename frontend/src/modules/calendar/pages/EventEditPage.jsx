import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../auth/useAuth.js";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";
import { getTags } from "../../../api/organizations.js";
import { Edit2, Eye } from "lucide-react";
import TagCombinationsPicker from "../../shared/components/TagCombinationsPicker.jsx";
import { createEvent, updateEvent, deleteEvent } from "../../../api/events.js";

// Generuj listę godzin co 15 minut
const generateTimeOptions = () => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = String(h).padStart(2, "0");
      const minute = String(m).padStart(2, "0");
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
    const targetTime = value && TIME_OPTIONS.includes(value) ? value : "06:00";
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
            className={`w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/60 text-left ${
              value === "" ? "bg-slate-700/40" : ""
            }`}
          >
            -- Brak --
          </button>
          {TIME_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              data-time={t} // <--- NEW
              onClick={() => select(t)}
              className={`w-full px-3 py-2 text-sm text-slate-100 hover:bg-slate-700/60 text-left ${
                value === t ? "bg-indigo-600/40" : ""
              }`}
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
  const {
    event: editingEvent,
    date: presetDate,
    time: presetTime,
    view: savedView,
    isAllDay: presetIsAllDay,
  } = location.state || {};
  const { user, organization } = useAuth();
  const { projects } = useProjects();

  const TITLE_MAX_LENGTH = 100;
  const DESCRIPTION_MAX_LENGTH = 500;

  const [title, setTitle] = useState(
    editingEvent?.name || editingEvent?.title || ""
  ); // CHANGED
  const [description, setDescription] = useState(
    editingEvent?.description || ""
  );
  const [date, setDate] = useState(editingEvent?.date || presetDate || "");
  const [endDate, setEndDate] = useState(
    editingEvent?.endDate || editingEvent?.date || presetDate || ""
  );
  const [startTime, setStartTime] = useState(
    editingEvent?.start_time || presetTime || ""
  );
  const [endTime, setEndTime] = useState(editingEvent?.end_time || "");
  // All day: true if both times are empty or if explicitly set
  // If presetTime exists (clicked on hour), disable all-day mode
  const [isAllDay, setIsAllDay] = useState(
    editingEvent?.isAllDay !== undefined
      ? editingEvent.isAllDay
      : presetTime
      ? false
      : presetIsAllDay !== undefined
      ? presetIsAllDay
      : !editingEvent?.start_time && !editingEvent?.end_time
  );
  const [isEditing, setIsEditing] = useState(!editingEvent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [allTagsFromOrg, setAllTagsFromOrg] = useState([]);

  // Fetch organization tags
  useEffect(() => {
    if (!organization?.id || !user?.username) return;

    getTags(organization.id, user.username)
      .then((data) => {
        const tagNames = (data || []).map((t) => t.name).filter(Boolean);
        setAllTagsFromOrg(tagNames);
      })
      .catch((err) => {
        console.error("Failed to load organization tags:", err);
        setAllTagsFromOrg([]);
      });
  }, [organization?.id, user?.username]);

  const [combinations, setCombinations] = useState(() => {
    if (editingEvent?.tagCombinations?.length)
      return editingEvent.tagCombinations;
    if (editingEvent?.tags?.length) return editingEvent.tags.map((t) => [t]);
    if (editingEvent?.permissions?.length) {
      // Backend zwraca permissions jako płaską listę, konwertujemy na kombinacje
      return editingEvent.permissions
        .filter(Boolean)
        .map((p) => (p.includes("+") ? p.split("+").filter(Boolean) : [p]));
    }
    return [];
  });

  const allSuggestions = Array.from(
    new Set([...projects.map((p) => p.name).filter(Boolean), ...allTagsFromOrg])
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !title.trim() ||
      !date ||
      !endDate ||
      !organization?.id ||
      !user?.username
    )
      return;

    // Walidacja: data zakończenia nie może być wcześniejsza niż rozpoczęcia
    if (endDate < date) {
      setError(
        "Data zakończenia nie może być wcześniejsza niż data rozpoczęcia."
      );
      return;
    }

    let submitStartTime = startTime;
    let submitEndTime = endTime;
    let submitEndDate = endDate;
    if (isAllDay) {
      // All-day event: 00:00 start to 00:00 end on the selected end date
      submitStartTime = "00:00";
      submitEndDate = endDate;
      submitEndTime = "00:00";
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editingEvent?.event_id || editingEvent?.id) {
        await updateEvent(
          organization.id,
          editingEvent.event_id || editingEvent.id,
          user.username,
          {
            name: title.trim(),
            description: description.trim(),
            date,
            endDate: submitEndDate,
            start_time: submitStartTime,
            end_time: submitEndTime,
            combinations,
            isAllDay,
          }
        );
      } else {
        await createEvent(organization.id, user.username, {
          name: title.trim(),
          description: description.trim(),
          date,
          endDate: submitEndDate,
          start_time: submitStartTime,
          end_time: submitEndTime,
          combinations,
          isAllDay,
        });
      }
      navigate("/calendar", { state: { view: savedView } });
    } catch (err) {
      setError(
        err.response?.data?.error ??
          err.response?.data?.detail ??
          "Nie udało się zapisać wydarzenia."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent?.event_id && !editingEvent?.id) return;
    if (!organization?.id || !user?.username) return;
    if (!window.confirm("Czy na pewno usunąć to wydarzenie?")) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteEvent(
        organization.id,
        editingEvent.event_id || editingEvent.id,
        user.username
      );
      navigate("/calendar", { state: { view: savedView } });
    } catch (err) {
      setError(
        err.response?.data?.error ??
          err.response?.data?.detail ??
          "Nie udało się usunąć wydarzenia."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto flex justify-center bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-8">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/95 rounded-3xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] p-12 w-full max-w-4xl flex flex-col gap-8 border border-slate-700 my-auto"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">
            {editingEvent
              ? isEditing
                ? "Edytuj wydarzenie"
                : "Szczegóły wydarzenia"
              : "Nowe wydarzenie"}
          </h1>
          <div className="flex gap-2">
            {editingEvent && (
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
              onClick={() =>
                navigate("/calendar", { state: { view: savedView } })
              }
            >
              Powrót
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {!isEditing && editingEvent ? (
          <div className="flex flex-col gap-6">
            <div className="pb-4 border-b border-slate-700">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-sm text-slate-400 block mb-1">
                  Termin
                </span>
                <span className="text-slate-200 font-medium">
                  {new Date(date).toLocaleDateString("pl-PL", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                  {endDate && endDate !== date && (
                    <>
                      {" - "}
                      {new Date(endDate).toLocaleDateString("pl-PL", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </>
                  )}
                </span>
              </div>

              <div>
                <span className="text-sm text-slate-400 block mb-1">
                  Godziny
                </span>
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
              <span className="text-sm text-slate-400 block mb-2">
                Tagi (kombinacje)
              </span>
              {combinations?.length ? (
                <div className="flex flex-wrap gap-2">
                  {combinations.map((combo, idx) => (
                    <span
                      key={idx}
                      className="bg-violet-600/80 text-white px-3 py-1 rounded-full text-sm"
                    >
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
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm font-medium">
                  Tytuł wydarzenia
                </span>
                <span
                  className={`text-xs ${
                    title.length > TITLE_MAX_LENGTH
                      ? "text-red-400 font-semibold"
                      : title.length > TITLE_MAX_LENGTH * 0.9
                      ? "text-yellow-400"
                      : "text-slate-500"
                  }`}
                >
                  {title.length}/{TITLE_MAX_LENGTH}
                </span>
              </div>
              <input
                className={`border rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none ${
                  title.length > TITLE_MAX_LENGTH
                    ? "border-red-500 focus:border-red-500"
                    : "border-slate-600 focus:border-indigo-500"
                }`}
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))
                }
                placeholder="Np. Spotkanie zespołu"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm font-medium">Opis</span>
                <span
                  className={`text-xs ${
                    description.length > DESCRIPTION_MAX_LENGTH
                      ? "text-red-400 font-semibold"
                      : description.length > DESCRIPTION_MAX_LENGTH * 0.9
                      ? "text-yellow-400"
                      : "text-slate-500"
                  }`}
                >
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
              <textarea
                className={`border rounded-lg px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 focus:outline-none min-h-[120px] resize-y ${
                  description.length > DESCRIPTION_MAX_LENGTH
                    ? "border-red-500 focus:border-red-500"
                    : "border-slate-600 focus:border-indigo-500"
                }`}
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value.slice(0, DESCRIPTION_MAX_LENGTH)
                  )
                }
                placeholder="Szczegółowy opis wydarzenia..."
              />
            </label>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-slate-300 text-sm font-medium">
                    Data rozpoczęcia
                  </span>
                  <input
                    type="date"
                    className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-slate-300 text-sm font-medium">
                    Data zakończenia
                  </span>
                  <input
                    type="date"
                    className="border border-slate-600 rounded-lg px-3 py-2 bg-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="flex items-center gap-4 mb-2">
                <label className="flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    className="accent-indigo-600 w-5 h-5"
                    checked={isAllDay}
                    onChange={(e) => {
                      setIsAllDay(e.target.checked);
                      if (e.target.checked) {
                        setStartTime("");
                        setEndTime("");
                      }
                    }}
                  />
                  <span className="text-slate-200 text-sm">Cały dzień</span>
                </label>
              </div>
              {!isAllDay && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="flex flex-col gap-2">
                    <span className="text-slate-300 text-sm font-medium">
                      Godzina rozpoczęcia
                    </span>
                    <TimeSelect
                      value={startTime}
                      onChange={setStartTime}
                      placeholder="-- Wybierz --"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-slate-300 text-sm font-medium">
                      Godzina zakończenia
                    </span>
                    <TimeSelect
                      value={endTime}
                      onChange={setEndTime}
                      placeholder="-- Wybierz --"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* REPLACED: simple tags -> combinations picker */}
            <TagCombinationsPicker
              value={combinations}
              onChange={setCombinations}
              suggestions={allSuggestions}
              label="Tagi / Projekty"
            />
          </div>
        )}

        {isEditing && (
          <div className="flex flex-col sm:flex-row gap-4 justify-between mt-4">
            <button
              type="submit"
              disabled={!title.trim() || !date || submitting}
              className="flex-1 sm:flex-none bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-semibold shadow hover:bg-indigo-700 transition"
            >
              {submitting
                ? "Zapisywanie..."
                : editingEvent
                ? "Zapisz zmiany"
                : "Utwórz wydarzenie"}
            </button>
            {editingEvent && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 sm:flex-none border border-red-500 px-8 py-3 rounded-xl text-sm text-red-400 bg-transparent hover:bg-red-500/10 transition font-semibold disabled:opacity-40"
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
