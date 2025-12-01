import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  CalendarClock,
  Download,
} from "lucide-react";
import CalendarMonthView from "../components/CalendarMonthView.jsx";
import CalendarWeekView from "../components/CalendarWeekView.jsx";
import CalendarMonthSkeleton from "../components/CalendarMonthSkeleton.jsx";
import CalendarWeekSkeleton from "../components/CalendarWeekSkeleton.jsx";
import useAuth from "../../../auth/useAuth.js";
import { getUserEvents, getAllEvents } from "../../../api/events.js";

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
  const [date, setDate] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  });
  const [view, setView] = useState("month");
  const { user, organization } = useAuth();
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!organization?.id || !user?.username) return;
    let ignore = false;
    setEventsLoading(true);
    setEventsError(null);

    const parseEventRow = (ev) => {
      const rawStart = ev.start_time ? String(ev.start_time) : "";
      const rawEnd = ev.end_time ? String(ev.end_time) : "";
      // Akceptuj formaty: "YYYY-MM-DD HH:MM:SS", "YYYY-MM-DD HH:MM:SS+00:00", ISO
      const splitStart = rawStart.includes("T")
        ? rawStart.replace("T", " ").split(" ")
        : rawStart.split(" ");
      const splitEnd = rawEnd.includes("T")
        ? rawEnd.replace("T", " ").split(" ")
        : rawEnd.split(" ");
      const datePart = splitStart[0] || "";
      const endDatePart = splitEnd[0] || datePart; // Data zakończenia z end_time
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
        endDate: endDatePart, // Dodajemy endDate
        tags: plainTags,
        tagCombinations,
      };
    };

    const fetch = async () => {
      try {
        let data;
        if (organization.role === "admin") {
          data = await getAllEvents(organization.id, user.username);
        } else {
          data = await getUserEvents(organization.id, user.username);
          // Fallback diagnostyczny: jeśli nic nie przyszło spróbuj pobrać pełną listę (może brak permissions)
          if (Array.isArray(data) && data.length === 0) {
            try {
              const adminData = await getAllEvents(
                organization.id,
                user.username
              );
              // Nie nadpisuj gdy brak uprawnień – tylko jeśli coś przyszło
              if (adminData?.length) data = adminData;
            } catch (_) {
              /* ignoruj */
            }
          }
        }
        if (ignore) return;
        const mapped = (data || []).map(parseEventRow);
        setEvents(mapped);
      } catch (err) {
        if (ignore) return;
        setEventsError(
          err?.response?.data?.error ??
            err?.response?.data?.detail ??
            "Nie udało się pobrać wydarzeń."
        );
      } finally {
        if (!ignore) setEventsLoading(false);
      }
    };

    fetch();
    return () => {
      ignore = true;
    };
  }, [organization?.id, organization?.role, user?.username]);

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
        return {
          year: current.getFullYear(),
          month: current.getMonth(),
          day: current.getDate(),
        };
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
        return {
          year: current.getFullYear(),
          month: current.getMonth(),
          day: current.getDate(),
        };
      });
    }
  };

  const { year, month, day } = date;
  const weekDays = getWeekDays(year, month, day);

  const exportToICS = () => {
    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ZPI Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    events.forEach((ev) => {
      const startDateTime = `${ev.date.replace(
        /-/g,
        ""
      )}T${ev.start_time.replace(/:/g, "")}00`;
      const endDateTime = `${(ev.endDate || ev.date).replace(
        /-/g,
        ""
      )}T${ev.end_time.replace(/:/g, "")}00`;
      const now =
        new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:${ev.id}@zpi-calendar`);
      icsContent.push(`DTSTAMP:${now}`);
      icsContent.push(`DTSTART:${startDateTime}`);
      icsContent.push(`DTEND:${endDateTime}`);
      icsContent.push(`SUMMARY:${ev.title}`);
      if (ev.description) {
        icsContent.push(`DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}`);
      }
      if (ev.tags && ev.tags.length > 0) {
        icsContent.push(`CATEGORIES:${ev.tags.join(",")}`);
      }
      icsContent.push("END:VEVENT");
    });

    icsContent.push("END:VCALENDAR");

    const blob = new Blob([icsContent.join("\r\n")], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `kalendarz_${organization?.name || "zpi"}_${year}-${
      month + 1
    }.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToCSV = () => {
    const csvRows = [
      [
        "Tytuł",
        "Data rozpoczęcia",
        "Godzina rozpoczęcia",
        "Data zakończenia",
        "Godzina zakończenia",
        "Opis",
        "Tagi",
      ].join(","),
    ];

    events.forEach((ev) => {
      const row = [
        `"${ev.title.replace(/"/g, '""')}"`,
        ev.date,
        ev.start_time,
        ev.endDate || ev.date,
        ev.end_time,
        `"${(ev.description || "").replace(/"/g, '""')}"`,
        `"${(ev.tags || []).join(", ")}"`,
      ].join(",");
      csvRows.push(row);
    });

    const blob = new Blob(["\ufeff" + csvRows.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `kalendarz_${organization?.name || "zpi"}_${year}-${
      month + 1
    }.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getWeekTitle = () => {
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];
    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${MONTHS[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
    }
    return `${MONTHS[firstDay.getMonth()]} - ${
      MONTHS[lastDay.getMonth()]
    } ${lastDay.getFullYear()}`;
  };

  return (
    <div className="h-full overflow-auto bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-4">
      <div className="max-w-[98vw] mx-auto min-h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 transition"
              aria-label={
                view === "month" ? "Poprzedni miesiąc" : "Poprzedni tydzień"
              }
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-semibold text-slate-100 min-w-[200px] text-center">
              {view === "month" ? `${MONTHS[month]} ${year}` : getWeekTitle()}
            </h1>
            <button
              onClick={handleNext}
              className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-300 transition"
              aria-label={
                view === "month" ? "Następny miesiąc" : "Następny tydzień"
              }
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={exportToICS}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-2 text-sm"
                title="Eksportuj do formatu ICS (kalendarz)"
              >
                <Download className="w-4 h-4" />
                <span>ICS</span>
              </button>
              <button
                onClick={exportToCSV}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-2 text-sm"
                title="Eksportuj do formatu CSV"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
            </div>
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

        {eventsError && (
          <div className="text-xs text-red-400 px-2 mb-2">{eventsError}</div>
        )}
        <div className="flex-1 min-h-0">
          {eventsLoading ? (
            view === "month" ? (
              <CalendarMonthSkeleton />
            ) : (
              <CalendarWeekSkeleton />
            )
          ) : view === "month" ? (
            <CalendarMonthView year={year} month={month} events={events} />
          ) : (
            <CalendarWeekView weekDays={weekDays} events={events} />
          )}
        </div>
      </div>
    </div>
  );
}
