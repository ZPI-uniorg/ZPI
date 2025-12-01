import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, Calendar, CalendarClock } from "lucide-react";
import CalendarMonthView from "../components/CalendarMonthView.jsx";
import CalendarWeekView from "../components/CalendarWeekView.jsx";
import { useProjects } from "../../shared/components/ProjectsContext.jsx";

const MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function getWeekDays(year, month, day) {
  const current = new Date(year, month, day);
  const dayOfWeek = current.getDay() === 0 ? 6 : current.getDay() - 1;
  const monday = new Date(current);
  monday.setDate(current.getDate() - dayOfWeek);
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(d);
  }
  return week;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { eventsByProject, eventsLoading, loadEventsForDateRange, projects, userMember } = useProjects();
  const today = new Date();
  const [date, setDate] = useState({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
  const [view, setView] = useState("month");
  const lastFetchRef = React.useRef({ startDate: null, endDate: null, months: [] });
  const loadEventsRef = React.useRef(loadEventsForDateRange);
  loadEventsRef.current = loadEventsForDateRange;

  useEffect(() => {
    if (!loadEventsForDateRange || !userMember || projects.length === 0) return;
    const { year, month, day } = date;

    if (view === "month") {
      // Month view: fetch entire month
      const lastDay = new Date(year, month + 1, 0);
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      
      const monthKey = `${year}-${month}`;
      if (!lastFetchRef.current.months.includes(monthKey)) {
        loadEventsForDateRange(startDate, endDate);
        lastFetchRef.current.months.push(monthKey);
      }
    } else {
      // Week view: fetch months that the week touches
      const weekDays = getWeekDays(year, month, day);
      const firstDay = weekDays[0];
      const lastDay = weekDays[6];
      
      const firstMonth = firstDay.getMonth();
      const lastMonth = lastDay.getMonth();
      const firstYear = firstDay.getFullYear();
      const lastYear = lastDay.getFullYear();
      
      // Fetch first month
      const firstMonthStart = `${firstYear}-${String(firstMonth + 1).padStart(2, '0')}-01`;
      const firstMonthLastDay = new Date(firstYear, firstMonth + 1, 0);
      const firstMonthEnd = `${firstYear}-${String(firstMonth + 1).padStart(2, '0')}-${String(firstMonthLastDay.getDate()).padStart(2, '0')}`;
      
      // Check if we already fetched this month
      const monthKey1 = `${firstYear}-${firstMonth}`;
      if (!lastFetchRef.current.months.includes(monthKey1)) {
        loadEventsForDateRange(firstMonthStart, firstMonthEnd);
        lastFetchRef.current.months.push(monthKey1);
      }
      
      // If week spans two months, fetch the second month too
      if (firstMonth !== lastMonth || firstYear !== lastYear) {
        const secondMonthStart = `${lastYear}-${String(lastMonth + 1).padStart(2, '0')}-01`;
        const secondMonthLastDay = new Date(lastYear, lastMonth + 1, 0);
        const secondMonthEnd = `${lastYear}-${String(lastMonth + 1).padStart(2, '0')}-${String(secondMonthLastDay.getDate()).padStart(2, '0')}`;
        
        const monthKey2 = `${lastYear}-${lastMonth}`;
        if (!lastFetchRef.current.months.includes(monthKey2)) {
          loadEventsForDateRange(secondMonthStart, secondMonthEnd);
          lastFetchRef.current.months.push(monthKey2);
        }
      }
    }
  }, [date, view, loadEventsForDateRange, userMember, projects.length]);

  const events = useMemo(() => {
    const parseEventRow = (ev) => {
      const rawStart = ev.start_time ? String(ev.start_time) : "";
      const rawEnd = ev.end_time ? String(ev.end_time) : "";
      const splitStart = rawStart.includes("T")
        ? rawStart.replace("T", " ").split(" ")
        : rawStart.split(" ");
      const splitEnd = rawEnd.includes("T")
        ? rawEnd.replace("T", " ").split(" ")
        : rawEnd.split(" ");
      const datePart = splitStart[0] || "";
      const startTimePart = (splitStart[1] || "")
        .replace("+00:00", "")
        .slice(0, 5);
      const endTimePart = (splitEnd[1] || "").replace("+00:00", "").slice(0, 5);

      const perms = ev.permissions || ev.tags || [];
      const tagCombinations = perms
        .filter((p) => p.includes("+"))
        .map((p) => p.split("+").filter(Boolean));
      const plainTags = perms.filter((p) => !p.includes("+"));

      return {
        id: ev.event_id,
        event_id: ev.event_id,
        title: ev.name,
        name: ev.name,
        description: ev.description || "",
        start_time: startTimePart || "",
        end_time: endTimePart || "",
        date: datePart,
        tags: plainTags,
        tagCombinations,
      };
    };

    const allProjectEvents = Object.values(eventsByProject || {}).flat();
    return allProjectEvents.map(parseEventRow);
  }, [eventsByProject]);

  const handlePrev = () => {
    if (view === "month") {
      setDate(({ year, month, day }) => {
        if (month === 0) return { year: year - 1, month: 11, day };
        return { year, month: month - 1, day };
      });
    } else {
      setDate(({ year, month, day }) => {
        const current = new Date(year, month, day);
        current.setDate(current.getDate() - 7);
        return { year: current.getFullYear(), month: current.getMonth(), day: current.getDate() };
      });
    }
  };

  const handleNext = () => {
    if (view === "month") {
      setDate(({ year, month, day }) => {
        if (month === 11) return { year: year + 1, month: 0, day };
        return { year, month: month + 1, day };
      });
    } else {
      setDate(({ year, month, day }) => {
        const current = new Date(year, month, day);
        current.setDate(current.getDate() + 7);
        return { year: current.getFullYear(), month: current.getMonth(), day: current.getDate() };
      });
    }
  };

  const { year, month, day } = date;
  const weekDays = getWeekDays(year, month, day);

  const getWeekTitle = () => {
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];
    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${MONTHS[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
    }
    return `${MONTHS[firstDay.getMonth()]} - ${MONTHS[lastDay.getMonth()]} ${lastDay.getFullYear()}`;
  };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-4 flex flex-col">
      <div className="flex-1 min-h-0 w-full flex flex-col">
        <div className="flex items-center justify-between mb-4 px-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 transition"
              aria-label={view === "month" ? "Poprzedni miesiąc" : "Poprzedni tydzień"}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-semibold text-slate-100 min-w-[200px] text-center">
              {view === "month" ? `${MONTHS[month]} ${year}` : getWeekTitle()}
            </h1>
            <button
              onClick={handleNext}
              className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 transition"
              aria-label={view === "month" ? "Następny miesiąc" : "Następny tydzień"}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setView("month")}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition ${
                  view === "month"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Widok miesięczny"
              >
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Miesiąc</span>
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition ${
                  view === "week"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Widok tygodniowy"
              >
                <CalendarClock className="w-4 h-4" />
                <span className="text-sm">Tydzień</span>
              </button>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 transition"
              aria-label="Zamknij"
              title="Powrót do dashboardu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {view === "month" ? (
          <CalendarMonthView year={year} month={month} events={events} loading={eventsLoading} />
        ) : (
          <CalendarWeekView weekDays={weekDays} events={events} />
        )}
      </div>
    </div>
  );
}
