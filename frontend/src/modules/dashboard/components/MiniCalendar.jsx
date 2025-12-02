import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Maximize2 } from "lucide-react";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
const MONTHS = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // poniedziałek = 0
  const daysInMonth = lastDay.getDate();

  const matrix = [];
  let day = 1 - firstWeekDay;
  while (true) {
    const week = [];
    for (let j = 0; j < 7; j++, day++) {
      if (day > 0 && day <= daysInMonth) {
        week.push(day);
      } else {
        week.push(null);
      }
    }
    matrix.push(week);
    if (week.includes(daysInMonth)) break;
    if (matrix.length > 6) break;
  }
  return matrix;
}

function getEventsForDay(events, year, month, day) {
  const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
  return events.filter((ev) => ev.date === dayStr);
}

export default function MiniCalendar() {
  const navigate = useNavigate();
  const {
    eventsByProject,
    eventsLoading,
    loadEventsForDateRange,
    projects,
    userMember,
  } = useProjects();
  const today = new Date();
  const [date, setDate] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const lastFetchRef = React.useRef({ startDate: null, endDate: null });
  const loadEventsRef = React.useRef(loadEventsForDateRange);
  loadEventsRef.current = loadEventsForDateRange;

  useEffect(() => {
    const { year, month } = date;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      lastDay.getDate()
    ).padStart(2, "0")}`;

    // Fetch if date range changed or if it's the first load (both are null)
    if (
      lastFetchRef.current.startDate !== startDate ||
      lastFetchRef.current.endDate !== endDate
    ) {
      lastFetchRef.current = { startDate, endDate };
      if (loadEventsRef.current) {
        loadEventsRef.current(startDate, endDate);
      }
    }
  }, [date, projects.length, userMember, loadEventsForDateRange]);

  // Ensure initial fetch when context becomes ready
  useEffect(() => {
    if (!loadEventsForDateRange || !userMember || projects.length === 0) return;
    const { year, month } = date;
    const lastDay = new Date(year, month + 1, 0);
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      lastDay.getDate()
    ).padStart(2, "0")}`;
    if (
      lastFetchRef.current.startDate === startDate &&
      lastFetchRef.current.endDate === endDate
    )
      return;
    lastFetchRef.current = { startDate, endDate };
    loadEventsForDateRange(startDate, endDate);
  }, [loadEventsForDateRange, userMember, projects.length]);

  const events = React.useMemo(() => {
    const allProjectEvents = Object.values(eventsByProject || {}).flat();
    const seenIds = new Set();
    const uniqueEvents = [];

    allProjectEvents.forEach((ev) => {
      if (!seenIds.has(ev.event_id)) {
        seenIds.add(ev.event_id);
        const rawStart = ev.start_time ? String(ev.start_time) : "";
        const splitStart = rawStart.includes("T")
          ? rawStart.replace("T", " ").split(" ")
          : rawStart.split(" ");
        const datePart = splitStart[0] || "";
        const startTimePart = (splitStart[1] || "")
          .replace("+00:00", "")
          .slice(0, 5);

        uniqueEvents.push({
          id: ev.event_id,
          event_id: ev.event_id,
          title: ev.name,
          date: datePart,
          start_time: startTimePart,
        });
      }
    });

    return uniqueEvents;
  }, [eventsByProject]);
  const handlePrev = () => {
    setDate(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 };
      return { year, month: month - 1 };
    });
  };
  const handleNext = () => {
    setDate(({ year, month }) => {
      if (month === 11) return { year: year + 1, month: 0 };
      return { year, month: month + 1 };
    });
  };
  const { year, month } = date;
  const matrix = getMonthMatrix(year, month);

  const isToday = (day) => {
    if (!day) return false;
    const todayDate = new Date();
    return (
      day === todayDate.getDate() &&
      month === todayDate.getMonth() &&
      year === todayDate.getFullYear()
    );
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    navigate("/calendar/event/new", { state: { date: dateStr } });
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    navigate("/calendar/event/edit", { state: { event } });
  };

  return (
    <div className="w-full h-full flex flex-col min-w-[280px]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="px-2 py-0.5 rounded hover:bg-slate-700/40 text-slate-300 text-sm"
            aria-label="Poprzedni miesiąc"
          >
            &lt;
          </button>
          <h3 className="text-base font-semibold text-slate-200 min-w-[160px] text-center">
            {MONTHS[month]} {year}
          </h3>
          <button
            onClick={handleNext}
            className="px-2 py-0.5 rounded hover:bg-slate-700/40 text-slate-300 text-sm"
            aria-label="Następny miesiąc"
          >
            &gt;
          </button>
        </div>
        <button
          onClick={() => navigate("/calendar")}
          className="p-1 rounded hover:bg-slate-700/40 text-slate-300"
          aria-label="Pełny ekran"
          title="Pełny ekran"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-1 flex-1 min-h-0">
        <div className="grid grid-cols-7 text-[10px] text-slate-400 font-semibold mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>
        {eventsLoading ? (
          <div
            className={`grid grid-cols-7 grid-rows-${matrix.length} gap-0.5 flex-1`}
          >
            {Array.from({ length: matrix.length * 7 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-slate-800/40 p-0.5 flex flex-col overflow-hidden"
              >
                <div className="h-3 w-4 rounded bg-slate-700 animate-pulse mb-1" />
                <div className="space-y-0.5 mt-1">
                  <div className="h-2 rounded bg-slate-700/80 animate-pulse" />
                  <div className="h-2 rounded bg-slate-700/70 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`grid grid-cols-7 grid-rows-${matrix.length} gap-0.5 flex-1`}
          >
            {matrix.flat().map((day, idx) => {
              const dayEvents = day
                ? getEventsForDay(events, year, month, day)
                : [];
              const isTodayDay = isToday(day);
              return (
                <div
                  key={idx}
                  className={`rounded-lg px-0.5 py-0.5 flex flex-col items-start transition-colors overflow-hidden relative ${
                    isTodayDay
                      ? "bg-indigo-600/30 border border-indigo-500/50 text-slate-100 hover:bg-indigo-600/40 cursor-pointer"
                      : day
                      ? "bg-slate-800/40 text-slate-100 hover:bg-slate-700/50 cursor-pointer"
                      : "bg-slate-800/40 text-slate-500/40"
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  <span
                    className={`text-[10px] font-bold leading-tight ${
                      isTodayDay ? "text-indigo-300" : ""
                    }`}
                  >
                    {day || ""}
                  </span>
                  <div className="absolute top-[14px] left-0.5 right-0.5 bottom-0.5 flex flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="w-full truncate text-[9px] bg-indigo-600/80 text-white px-0.5 rounded leading-tight h-[12px] flex-shrink-0 hover:bg-indigo-700 transition"
                        title={ev.title}
                        onClick={(e) => handleEventClick(e, ev)}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[8px] text-slate-400 px-0.5 h-[10px] flex-shrink-0">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
