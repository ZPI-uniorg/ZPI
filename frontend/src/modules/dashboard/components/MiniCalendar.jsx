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
  return events.filter((ev) => {
    const startDate = ev.date;
    if (!startDate) return false;
    const endDate = ev.endDate || startDate;

    // Normalize times to support all-day and multi-day events
    const normalizedStart = ev.start_time || "00:00";
    const normalizedEnd = ev.end_time || "00:00";
    const isAllDay =
      (normalizedStart === "00:00" || normalizedStart === "") &&
      (normalizedEnd === "00:00" ||
        normalizedEnd === "23:59" ||
        normalizedEnd === "");

    // If it is a single-day all-day event, only show on the start date
    if (
      isAllDay &&
      new Date(endDate).getTime() - new Date(startDate).getTime() ===
        24 * 60 * 60 * 1000
    ) {
      return dayStr === startDate;
    }

    // Otherwise show event on every day it spans
    return dayStr >= startDate && dayStr <= endDate;
  });
}

export default function MiniCalendar() {
  const navigate = useNavigate();
  const {
    allEvents,
    eventsLoading,
    loadEventsForDateRange,
    allProjects,
    userMember,
    selectedTags,
    logic,
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
    if (!loadEventsForDateRange || !userMember) return;

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
      loadEventsForDateRange(startDate, endDate);
    }
  }, [date, userMember, loadEventsForDateRange]);

  const events = React.useMemo(() => {
    const allEventsList = Array.isArray(allEvents) ? allEvents : [];
    const seenIds = new Set();
    const uniqueEvents = [];

    allEventsList.forEach((ev) => {
      if (!seenIds.has(ev.event_id)) {
        seenIds.add(ev.event_id);
        const rawStart = ev.start_time ? String(ev.start_time) : "";
        const rawEnd = ev.end_time ? String(ev.end_time) : "";

        const splitStart = rawStart.includes("T")
          ? rawStart.replace("T", " ").split(" ")
          : rawStart.split(" ");
        const splitEnd = rawEnd.includes("T")
          ? rawEnd.replace("T", " ").split(" ")
          : rawEnd.split(" ");

        const startDatePart = splitStart[0] || "";
        const endDatePart = splitEnd[0] || startDatePart;

        const startTimePart = (splitStart[1] || "")
          .replace("+00:00", "")
          .slice(0, 5);
        const endTimePart = (splitEnd[1] || "")
          .replace("+00:00", "")
          .slice(0, 5);

        const isAllDay =
          (startTimePart === "00:00" || startTimePart === "") &&
          (endTimePart === "23:59" ||
            endTimePart === "00:00" ||
            endTimePart === "");

        uniqueEvents.push({
          id: ev.event_id,
          event_id: ev.event_id,
          title: ev.name,
          date: startDatePart,
          endDate: endDatePart,
          start_time: isAllDay ? "" : startTimePart,
          end_time: isAllDay ? "" : endTimePart,
          permissions: ev.permissions || ev.tags || [],
        });
      }
    });

    // Apply client-side filtering based on selectedTags
    const sel = Array.isArray(selectedTags) ? selectedTags : [];
    let filtered = uniqueEvents;
    
    if (sel.length > 0) {
      const splitTags = (arr) =>
        arr.flatMap((t) => t.split(/[+,]/).map((s) => s.trim())).filter(Boolean);
      
      filtered = uniqueEvents.filter((ev) => {
        const eventTags = splitTags(ev.permissions || []);
        if (logic === "AND") {
          return sel.every((tag) => eventTags.includes(tag));
        } else {
          return sel.some((tag) => eventTags.includes(tag));
        }
      });
    }

    return filtered;
  }, [allEvents, selectedTags, logic]);
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
          <div className="relative flex-1">
            <div
              className={`grid grid-cols-7 grid-rows-${matrix.length} gap-0.5`}
              style={{ height: '100%' }}
            >
              {matrix.flat().map((day, idx) => {
                const isTodayDay = isToday(day);
                return (
                  <div
                    key={idx}
                    className={`rounded-lg px-0.5 py-0.5 flex flex-col items-start transition-colors overflow-hidden ${
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
                  </div>
                );
              })}
            </div>
            
            {/* Render multi-day events as spanning bars */}
            {(() => {
              const allEvents = [];
              const seenIds = new Set();
              
              matrix.forEach((week, weekIdx) => {
                week.forEach((day, dayIdx) => {
                  if (!day) return;
                  const dayEvents = getEventsForDay(events, year, month, day);
                  dayEvents.forEach((ev) => {
                    if (!seenIds.has(ev.id)) {
                      seenIds.add(ev.id);
                      
                      // Find start and end positions
                      let startRow = -1, startCol = -1, endRow = -1, endCol = -1;
                      
                      matrix.forEach((wk, wkIdx) => {
                        wk.forEach((d, dIdx) => {
                          if (!d) return;
                          const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          if (dStr === ev.date) {
                            startRow = wkIdx;
                            startCol = dIdx;
                          }
                          if (dStr === (ev.endDate || ev.date)) {
                            endRow = wkIdx;
                            endCol = dIdx;
                          }
                        });
                      });
                      
                      if (startRow !== -1 && endRow !== -1) {
                        allEvents.push({ ...ev, startRow, startCol, endRow, endCol });
                      }
                    }
                  });
                });
              });
              
              const cellHeight = 100 / matrix.length;
              const cellWidth = 100 / 7;
              
              // Sort events by start position, then by duration (longer first)
              const sortedEvents = [...allEvents].sort((a, b) => {
                if (a.startRow !== b.startRow) return a.startRow - b.startRow;
                if (a.startCol !== b.startCol) return a.startCol - b.startCol;
                const aDuration = (a.endRow - a.startRow) * 7 + (a.endCol - a.startCol);
                const bDuration = (b.endRow - b.startRow) * 7 + (b.endCol - b.startCol);
                return bDuration - aDuration;
              });
              
              // Check if two events visually overlap in the same row
              const eventsOverlap = (ev1, ev2) => {
                // Must be in the same row to overlap
                if (ev1.startRow !== ev2.startRow) return false;
                // Check if their column ranges overlap
                return ev1.startCol <= ev2.endCol && ev2.startCol <= ev1.endCol;
              };
              
              // Assign stack levels with max 3 per row
              const eventLevels = new Map();
              const rowLevelCounts = {};
              
              sortedEvents.forEach((ev) => {
                const rowKey = ev.startRow;
                if (!rowLevelCounts[rowKey]) {
                  rowLevelCounts[rowKey] = [0, 0, 0]; // count for each level
                }
                
                let level = 0;
                // Find the first level (0, 1, or 2) where this event doesn't overlap
                while (level < 3) {
                  const overlaps = sortedEvents.some((other) => {
                    if (other.id === ev.id) return false;
                    if (eventLevels.get(other.id) !== level) return false;
                    return eventsOverlap(ev, other);
                  });
                  if (!overlaps) break;
                  level++;
                }
                
                if (level < 3) {
                  eventLevels.set(ev.id, level);
                  rowLevelCounts[rowKey][level]++;
                }
              });
              
              // Filter to only events that got assigned a level
              const visibleEvents = allEvents.filter(ev => eventLevels.has(ev.id));
              
              return visibleEvents.map((ev) => {
                const stackLevel = eventLevels.get(ev.id) || 0;
                const stackOffset = stackLevel * 11;
                // For simplicity in mini calendar, show events as bars within each row
                if (ev.startRow === ev.endRow) {
                  // Single row event
                  return (
                    <div
                      key={ev.id}
                      className="absolute text-[9px] bg-indigo-600/80 text-white px-0.5 rounded leading-tight truncate hover:bg-indigo-700 transition cursor-pointer"
                      style={{
                        top: `calc(${ev.startRow * cellHeight}% + 12px + ${stackOffset}px)`,
                        left: `calc(${ev.startCol * cellWidth}% + 2px)`,
                        width: `calc(${(ev.endCol - ev.startCol + 1) * cellWidth}% - 4px)`,
                        height: '10px',
                      }}
                      title={ev.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(e, ev);
                      }}
                    >
                      {ev.title}
                    </div>
                  );
                } else {
                  // Multi-row event - show in start row to end of week
                  return (
                    <div
                      key={ev.id}
                      className="absolute text-[9px] bg-indigo-600/80 text-white px-0.5 rounded-l leading-tight truncate hover:bg-indigo-700 transition cursor-pointer"
                      style={{
                        top: `calc(${ev.startRow * cellHeight}% + 12px + ${stackOffset}px)`,
                        left: `calc(${ev.startCol * cellWidth}% + 2px)`,
                        width: `calc(${(6 - ev.startCol + 1) * cellWidth}% - 4px)`,
                        height: '10px',
                      }}
                      title={ev.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(e, ev);
                      }}
                    >
                      {ev.title}
                    </div>
                  );
                }
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
