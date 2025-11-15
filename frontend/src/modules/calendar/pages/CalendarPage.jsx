import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EVENTS } from "../../../api/fakeData.js";
import { ChevronLeft, ChevronRight, X, Calendar, CalendarClock } from "lucide-react";
import CalendarMonthView from "../components/CalendarMonthView.jsx";
import CalendarWeekView from "../components/CalendarWeekView.jsx";

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
  const today = new Date();
  const [date, setDate] = useState({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
  const [view, setView] = useState("month");

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
    <div className="min-h-screen bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-4">
      <div className="max-w-[98vw] mx-auto h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4 px-2">
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
          <CalendarMonthView year={year} month={month} events={EVENTS} />
        ) : (
          <CalendarWeekView weekDays={weekDays} events={EVENTS} />
        )}
      </div>
    </div>
  );
}
