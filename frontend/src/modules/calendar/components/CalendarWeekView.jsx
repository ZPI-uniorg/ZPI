import React from "react";
import { useNavigate } from "react-router-dom";

const WEEKDAYS_FULL = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];
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
const HOURS = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`
);

function getEventsForHour(events, dateStr, hourStart) {
  return events.filter((ev) => {
    const startDate = ev.date;
    const endDate = ev.endDate || ev.date;

    // Exclude true all-day events (00:00 → 00:00)
    if (ev.start_time === "00:00" && ev.end_time === "00:00") return false;

    // Render once on the start day at the start hour
    if (dateStr === startDate && ev.start_time) {
      const [startHour] = ev.start_time.split(":").map(Number);
      return startHour === hourStart;
    }

    // If event crosses midnight, render once on the end day at 00:00
    if (startDate !== endDate && dateStr === endDate && ev.end_time) {
      return hourStart === 0;
    }

    return false;
  });
}

function getAllDayEvents(events, dateStr) {
  return events.filter((ev) => {
    const startDate = ev.date;
    const endDate = ev.endDate || ev.date;

    // Only show true all-day events (00:00 to 00:00) on startDate
    if (ev.start_time === "00:00" && ev.end_time === "00:00") {
      return dateStr === startDate;
    }

    // All other multi-day events (with specific times) should not appear here
    return false;
  });
}

function calculateEventHeight(event, dateStr) {
  const [startHour, startMin] = event.start_time.split(":").map(Number);
  const [endHour, endMin] = event.end_time.split(":").map(Number);
  const startDate = event.date;
  const endDate = event.endDate || event.date;

  // If event spans multiple days
  if (startDate !== endDate) {
    // If we're displaying the start day (e.g., 23:00-00:00)
    if (dateStr === startDate) {
      const eventStart = startHour + startMin / 60;
      const eventEnd = 24; // Go until midnight
      const durationHours = eventEnd - eventStart;
      const heightPx = durationHours * 60;
      const topOffset = (startMin / 60) * 60;
      return { top: `${topOffset}px`, height: `${heightPx}px` };
    }
    // If we're displaying the end day (e.g., 00:00-01:00)
    if (dateStr === endDate) {
      const eventStart = 0; // Start from midnight
      const eventEnd = endHour + endMin / 60;
      const durationHours = eventEnd - eventStart;
      const heightPx = durationHours * 60;
      return { top: "0px", height: `${heightPx}px` };
    }
  }

  // Single-day event
  const eventStart = startHour + startMin / 60;
  const eventEnd = endHour + endMin / 60;
  const durationHours = eventEnd - eventStart;
  const heightPx = durationHours * 60;
  const topOffset = (startMin / 60) * 60;

  return { top: `${topOffset}px`, height: `${heightPx}px` };
}

export default function CalendarWeekView({ weekDays, events }) {
  const navigate = useNavigate();
  const today = new Date();

  const handleHourClick = (dateStr, hour) => {
    const timeStr = `${String(hour).padStart(2, "0")}:00`;
    navigate("/calendar/event/new", {
      state: { date: dateStr, time: timeStr },
    });
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    navigate("/calendar/event/edit", { state: { event } });
  };

  // Funkcja sprawdzająca czy wydarzenia się nakładają czasowo
  const eventsOverlap = (ev1, ev2, dateStr) => {
    const pos1 = calculateEventHeight(ev1, dateStr);
    const pos2 = calculateEventHeight(ev2, dateStr);

    const top1 = parseFloat(pos1.top);
    const height1 = parseFloat(pos1.height);
    const top2 = parseFloat(pos2.top);
    const height2 = parseFloat(pos2.height);

    const bottom1 = top1 + height1;
    const bottom2 = top2 + height2;

    return !(bottom1 <= top2 || bottom2 <= top1);
  };

  // Funkcja przypisująca kolumny dla nakładających się wydarzeń
  const assignColumns = (dayEvents, dateStr) => {
    if (dayEvents.length === 0) return [];

    const sortedEvents = [...dayEvents].sort((a, b) => {
      const posA = calculateEventHeight(a, dateStr);
      const posB = calculateEventHeight(b, dateStr);
      return parseFloat(posA.top) - parseFloat(posB.top);
    });

    const columns = [];

    sortedEvents.forEach((event) => {
      let placed = false;

      // Spróbuj umieścić w istniejącej kolumnie
      for (let i = 0; i < columns.length; i++) {
        const columnEvents = columns[i];
        const hasOverlap = columnEvents.some((ev) =>
          eventsOverlap(event, ev, dateStr)
        );

        if (!hasOverlap) {
          columnEvents.push(event);
          placed = true;
          break;
        }
      }

      // Jeśli nie pasuje do żadnej kolumny, stwórz nową
      if (!placed) {
        columns.push([event]);
      }
    });

    // Przypisz każdemu wydarzeniu jego kolumnę i całkowitą liczbę kolumn
    const eventColumns = new Map();
    const maxColumns = columns.length;

    columns.forEach((columnEvents, colIndex) => {
      columnEvents.forEach((event) => {
        // Znajdź wszystkie nakładające się z tym wydarzeniem
        const overlappingEvents = sortedEvents.filter(
          (ev) => ev.id !== event.id && eventsOverlap(event, ev, dateStr)
        );

        // Liczba realnie nakładających się = ile kolumn to wydarzenie powinno "widzieć"
        const relevantColumns = overlappingEvents.length + 1;

        eventColumns.set(event.id, {
          column: colIndex,
          totalColumns: maxColumns,
          visibleColumns: Math.max(relevantColumns, maxColumns),
        });
      });
    });

    return eventColumns;
  };

  return (
    <div className="flex-1 bg-slate-900/95 rounded-2xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] border border-slate-700 p-4 overflow-hidden flex flex-col">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-slate-700/30 mb-px">
        <div className="bg-slate-900/95" />
        {weekDays.map((d, i) => (
          <div key={i} className="bg-slate-900/95 text-center py-3">
            <div className="text-xs text-slate-400">{WEEKDAYS_FULL[i]}</div>
            <div
              className={`text-sm font-semibold ${
                d.getDate() === today.getDate() &&
                d.getMonth() === today.getMonth() &&
                d.getFullYear() === today.getFullYear()
                  ? "text-indigo-400"
                  : "text-slate-200"
              }`}
            >
              {d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)}
            </div>
          </div>
        ))}
      </div>

      {/* Sekcja wydarzeń wielodniowych */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-slate-700/30 min-h-[40px] mb-1">
        <div className="bg-slate-900/95 text-slate-400 text-xs p-2 border-r border-slate-700/50"></div>
        {weekDays.map((d, dayIdx) => {
          const dateStr = `${d.getFullYear()}-${String(
            d.getMonth() + 1
          ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const allDayEvents = getAllDayEvents(events, dateStr);

          return (
            <div
              key={dayIdx}
              className="bg-slate-900/95 p-1 flex flex-col gap-1"
            >
              {allDayEvents.map((ev) => {
                const isStart = dateStr === ev.date;
                const isEnd = dateStr === (ev.endDate || ev.date);
                const isMultiDay = ev.endDate && ev.endDate !== ev.date;

                // Remove arrows and extra suffixes for multi-day events
                let roundedClass = "rounded";
                if (isMultiDay) {
                  if (isStart && !isEnd) {
                    roundedClass = "rounded-l";
                  } else if (!isStart && isEnd) {
                    roundedClass = "rounded-r";
                  } else if (!isStart && !isEnd) {
                    roundedClass = "rounded-sm";
                  }
                }

                return (
                  <div
                    key={ev.id}
                    className={`text-[9px] px-2 py-1 ${roundedClass} cursor-pointer hover:shadow-lg transition flex items-center gap-1 overflow-hidden bg-indigo-600 text-white border border-white/15 border-l-4 border-indigo-800 shadow-md`}
                    title={`${ev.title} - ${ev.start_time} - ${ev.end_time}`}
                    onClick={(e) => handleEventClick(e, ev)}
                  >
                    <span className="truncate flex-shrink">
                      {ev.start_time === "00:00" && ev.end_time === "00:00"
                        ? ev.title
                        : `${ev.start_time}-${ev.end_time} ${ev.title}`}
                    </span>
                    {(() => {
                      const allTags = [
                        ...ev.tags,
                        ...(ev.tagCombinations || []).map((combo) =>
                          combo.join(" + ")
                        ),
                      ];
                      const maxVisible = 1;
                      const visible = allTags.slice(0, maxVisible);
                      const hiddenCount = allTags.length - maxVisible;

                      return (
                        <>
                          {visible.map((tag, idx) => (
                            <span
                              key={idx}
                              className="bg-fuchsia-700/80 px-1 rounded text-[7px] truncate max-w-[50px] flex-shrink-0"
                              title={tag}
                            >
                              {tag}
                            </span>
                          ))}
                          {hiddenCount > 0 && (
                            <span className="bg-fuchsia-700/80 px-1 rounded text-[7px] flex-shrink-0">
                              +{hiddenCount}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Separator directly under all-day events */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] mb-1">
        <div />
        <div className="col-span-7 border-t border-slate-600/30" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {HOURS.map((hour, hourIdx) => {
          const actualHour = hourIdx; // Teraz godziny idą od 0 do 23
          return (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-slate-700/30 h-[60px] relative"
            >
              <div className="bg-slate-900/95 text-slate-400 text-xs p-2 text-right border-r border-slate-700/50">
                {hour}
              </div>
              {weekDays.map((d, dayIdx) => {
                const dateStr = `${d.getFullYear()}-${String(
                  d.getMonth() + 1
                ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                const dayEvents = getEventsForHour(events, dateStr, actualHour);
                const eventColumns = assignColumns(dayEvents, dateStr);
                const isToday =
                  d.getDate() === today.getDate() &&
                  d.getMonth() === today.getMonth() &&
                  d.getFullYear() === today.getFullYear();

                return (
                  <div
                    key={dayIdx}
                    className={`bg-slate-900/95 relative transition-colors hover:bg-slate-800/70 cursor-pointer ${
                      isToday ? "bg-indigo-900/10" : ""
                    }`}
                    onClick={() => handleHourClick(dateStr, actualHour)}
                  >
                    {dayEvents.map((ev, evIdx) => {
                      const position = calculateEventHeight(ev, dateStr);
                      const columnInfo = eventColumns.get(ev.id) || {
                        column: 0,
                        totalColumns: 1,
                        visibleColumns: 1,
                      };

                      // Szerokość bazująca na liczbie kolumn
                      const columnWidth = 100 / columnInfo.totalColumns;
                      const width = `${columnWidth}%`;
                      const leftOffset = `${columnInfo.column * columnWidth}%`;

                      // Dodaj lekkie przesunięcie dla lepszej widoczności nakładających się wydarzeń
                      const zIndex = 10 + evIdx;

                      // Jeśli jest wiele kolumn, zmniejsz szerokość żeby pokazać nakładanie
                      const actualWidth =
                        columnInfo.totalColumns > 1
                          ? `calc(${width} - 4px)`
                          : `calc(${width} - 2px)`;

                      return (
                        <div
                          key={ev.id}
                          className="absolute text-[10px] text-white px-1 py-1 rounded cursor-pointer shadow-md hover:shadow-lg hover:z-50 transition-all overflow-hidden bg-indigo-600 border border-white/15 border-l-4 border-indigo-800"
                          style={{
                            top: position.top,
                            height: position.height,
                            minHeight: "24px",
                            left: leftOffset,
                            width: actualWidth,
                            zIndex: zIndex,
                          }}
                          title={`${ev.title} - ${ev.start_time} - ${ev.end_time}`}
                          onClick={(e) => handleEventClick(e, ev)}
                        >
                          <div className="font-semibold text-[9px] flex items-center gap-0.5 overflow-hidden">
                            <span className="truncate flex-shrink">
                              {ev.start_time}-{ev.end_time} {ev.title}
                            </span>
                            {columnInfo.totalColumns === 1 &&
                              (() => {
                                const allTags = [
                                  ...ev.tags.map((tag) => ({
                                    type: "single",
                                    value: tag,
                                  })),
                                  ...(ev.tagCombinations || []).map(
                                    (combo) => ({ type: "combo", value: combo })
                                  ),
                                ];
                                const maxVisible = 2;
                                const visible = allTags.slice(0, maxVisible);
                                const hiddenCount = allTags.length - maxVisible;

                                return (
                                  <>
                                    {visible.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="bg-fuchsia-700/80 px-1 rounded text-[7px] truncate max-w-[50px] flex-shrink-0"
                                        title={
                                          tag.type === "combo"
                                            ? tag.value.join(" + ")
                                            : tag.value
                                        }
                                      >
                                        {tag.type === "combo"
                                          ? tag.value.join(" + ")
                                          : tag.value}
                                      </span>
                                    ))}
                                    {hiddenCount > 0 && (
                                      <span className="bg-fuchsia-700/80 px-1 rounded text-[7px] flex-shrink-0">
                                        +{hiddenCount}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
