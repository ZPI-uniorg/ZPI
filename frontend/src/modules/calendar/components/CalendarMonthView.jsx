import React from "react";
import { useNavigate } from "react-router-dom";

const WEEKDAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];

function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();

  const matrix = [];
  let day = 1 - firstWeekDay;
  for (let i = 0; i < 5; i++) {
    const week = [];
    for (let j = 0; j < 7; j++, day++) {
      if (day > 0 && day <= daysInMonth) {
        week.push(day);
      } else {
        week.push(null);
      }
    }
    matrix.push(week);
  }
  return matrix;
}

function getEventsForDay(events, year, month, day) {
  const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
  return events.filter((ev) => {
    const startDate = ev.date;
    const endDate = ev.endDate || ev.date;
    // All-day event: only show on startDate
    if (
      ev.start_time === "00:00" &&
      ev.end_time === "00:00" &&
      new Date(endDate).getTime() - new Date(startDate).getTime() ===
        24 * 60 * 60 * 1000
    ) {
      return dayStr === startDate;
    }
    // Normal multi-day event: show on all days in range
    return dayStr >= startDate && dayStr <= endDate;
  });
}

export default function CalendarMonthView({
  year,
  month,
  events,
  loading = false,
}) {
  const navigate = useNavigate();
  const today = new Date();
  const matrix = getMonthMatrix(year, month);

  const isToday = (day) => {
    if (!day) return false;
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
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
    <div className="flex-1 h-full min-h-0 bg-slate-900/95 rounded-2xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] border border-slate-700 p-4 overflow-hidden flex flex-col">
      <div className="grid grid-cols-7 gap-px bg-slate-700/30 mb-px">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-slate-900/95 text-center font-semibold text-slate-300 py-3 text-sm"
          >
            {day}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 min-h-0 grid grid-rows-5 gap-px bg-slate-700/30 overflow-hidden">
          {Array.from({ length: 5 }).map((_, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-px min-h-0">
              {Array.from({ length: 7 }).map((_, dayIdx) => (
                <div
                  key={`${weekIdx}-${dayIdx}`}
                  className="bg-slate-900/95 p-2 flex flex-col overflow-hidden min-h-0"
                >
                  <div className="w-6 h-4 bg-slate-700 rounded animate-pulse mb-2" />
                  <div className="flex flex-col gap-1">
                    <div className="h-6 bg-slate-700/60 rounded animate-pulse" />
                    <div className="h-6 bg-slate-700/50 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-rows-5 gap-px bg-slate-700/30 overflow-hidden">
          {matrix.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-px min-h-0">
              {week.map((day, dayIdx) => {
                const dayEvents = day
                  ? getEventsForDay(events, year, month, day)
                  : [];
                const isTodayDay = isToday(day);
                return (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    className={`bg-slate-900/95 p-3 flex flex-col overflow-hidden min-h-0 transition-colors ${
                      isTodayDay ? "bg-indigo-900/20" : ""
                    } ${day ? "hover:bg-slate-800/70 cursor-pointer" : ""}`}
                    onClick={() => handleDayClick(day)}
                  >
                    <div
                      className={`text-sm font-semibold mb-2 ${
                        isTodayDay
                          ? "bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center"
                          : day
                          ? "text-slate-200"
                          : "text-slate-600"
                      }`}
                    >
                      {day || ""}
                    </div>
                    <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                      {dayEvents.slice(0, 4).map((ev) => {
                        const dayStr = `${year}-${String(month + 1).padStart(
                          2,
                          "0"
                        )}-${String(day).padStart(2, "0")}`;
                        const isStart = dayStr === ev.date;
                        const isEnd = dayStr === (ev.endDate || ev.date);
                        const isMultiDay = ev.endDate && ev.endDate !== ev.date;

                        return (
                          <div
                            key={ev.id}
                            className={`group text-xs text-white px-2 py-1 cursor-pointer hover:shadow-md transition ${
                              isMultiDay
                                ? isStart
                                  ? "rounded-l"
                                  : isEnd
                                  ? "rounded-r"
                                  : ""
                                : "rounded"
                            } bg-indigo-600 border-l-4 border-indigo-800`}
                            title={`${ev.title}${
                              isMultiDay
                                ? ` (${
                                    isStart
                                      ? "początek"
                                      : isEnd
                                      ? "koniec"
                                      : "trwa"
                                  })`
                                : ""
                            }`}
                            onClick={(e) => handleEventClick(e, ev)}
                          >
                            <div className="font-medium flex items-center gap-1 overflow-hidden">
                              <span className="truncate flex-shrink">
                                {ev.title}
                              </span>
                              {(() => {
                                const maxVisibleTags = 2;
                                const allTags = [
                                  ...ev.tags.map((tag) => ({
                                    type: "single",
                                    value: tag,
                                  })),
                                  ...(ev.tagCombinations || []).map(
                                    (combo) => ({ type: "combo", value: combo })
                                  ),
                                ];
                                const visibleTags = allTags.slice(
                                  0,
                                  maxVisibleTags
                                );
                                const hiddenCount =
                                  allTags.length - maxVisibleTags;

                                return (
                                  <>
                                    {visibleTags.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="bg-fuchsia-700/80 px-1 rounded text-[9px] truncate max-w-[60px] flex-shrink-0"
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
                                      <span className="bg-fuchsia-700/80 px-1 rounded text-[9px] flex-shrink-0">
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
                      {dayEvents.length > 4 && (
                        <div className="text-[10px] text-slate-400 px-2 py-1 italic">
                          +{dayEvents.length - 4} więcej
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
