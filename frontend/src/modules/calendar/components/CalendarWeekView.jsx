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

    // Pomiń wydarzenia wielodniowe - będą pokazane osobno
    if (endDate !== startDate) return false;

    // Sprawdź czy wydarzenie jest w tym dniu
    if (dateStr !== startDate) return false;

    // Sprawdź godzinę rozpoczęcia
    if (!ev.start_time) return false;
    const [startHour] = ev.start_time.split(":").map(Number);
    return startHour === hourStart;
  });
}

function getAllDayEvents(events, dateStr) {
  return events.filter((ev) => {
    const startDate = ev.date;
    const endDate = ev.endDate || ev.date;

    // Tylko wydarzenia wielodniowe
    if (endDate === startDate) return false;

    // Sprawdź czy wydarzenie obejmuje ten dzień
    return dateStr >= startDate && dateStr <= endDate;
  });
}

function calculateEventHeight(event, dateStr) {
  const [startHour, startMin] = event.start_time.split(":").map(Number);
  const [endHour, endMin] = event.end_time.split(":").map(Number);

  // Dla wydarzeń jednodniowych
  const eventStart = startHour + startMin / 60;
  let eventEnd = endHour + endMin / 60;

  // Jeśli wydarzenie przechodzi przez północ
  if (eventEnd < eventStart) {
    eventEnd += 24;
  }

  const maxEnd = 24;
  const displayEnd = Math.min(eventEnd, maxEnd);
  const durationHours = displayEnd - eventStart;

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

                let roundedClass = "rounded";
                let arrow = "";
                let titleSuffix = "";

                if (isMultiDay) {
                  if (isStart && !isEnd) {
                    roundedClass = "rounded-l";
                    arrow = " →";
                    titleSuffix = " (początek)";
                  } else if (!isStart && isEnd) {
                    roundedClass = "rounded-r";
                    arrow = "← ";
                    titleSuffix = " (koniec)";
                  } else if (!isStart && !isEnd) {
                    roundedClass = "rounded-sm";
                    arrow = "← → ";
                    titleSuffix = " (trwa)";
                  }
                }

                return (
                  <div
                    key={ev.id}
                    className={`text-[9px] bg-violet-600/90 text-white px-2 py-1 ${roundedClass} cursor-pointer hover:bg-violet-500 transition truncate border-l-2 border-violet-400`}
                    title={`${ev.title}${titleSuffix} - ${ev.start_time} - ${ev.end_time}`}
                    onClick={(e) => handleEventClick(e, ev)}
                  >
                    {arrow}
                    {ev.title}
                  </div>
                );
              })}
            </div>
          );
        })}
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
                          className="absolute text-[10px] bg-violet-600/95 text-white px-1 py-1 rounded cursor-pointer hover:bg-violet-500 hover:z-50 hover:shadow-2xl transition-all overflow-hidden border-l-2 border-violet-300 shadow-lg"
                          style={{
                            top: position.top,
                            height: position.height,
                            minHeight: "20px",
                            left: leftOffset,
                            width: actualWidth,
                            zIndex: zIndex,
                          }}
                          title={`${ev.title} - ${ev.start_time} - ${ev.end_time}`}
                          onClick={(e) => handleEventClick(e, ev)}
                        >
                          <div className="font-semibold truncate text-[9px]">
                            {ev.start_time} {ev.title}
                          </div>
                          {columnInfo.totalColumns === 1 && (
                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                              {ev.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="bg-fuchsia-700/80 px-1 rounded text-[7px]"
                                >
                                  {tag}
                                </span>
                              ))}
                              {(ev.tagCombinations || []).map((combo, idx) => (
                                <span
                                  key={`combo-${idx}`}
                                  className="bg-fuchsia-700/80 px-1 rounded text-[7px]"
                                >
                                  {combo.join(" + ")}
                                </span>
                              ))}
                            </div>
                          )}
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
