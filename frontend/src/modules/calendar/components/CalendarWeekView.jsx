import React from "react";
import { useNavigate } from "react-router-dom";

const WEEKDAYS_FULL = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String((i + 6) % 24).padStart(2, '0')}:00`);

function getEventsStartingInHour(events, dateStr, hourStart) {
  return events.filter((ev) => {
    if (ev.date !== dateStr) return false;
    if (!ev.start_time) return false;
    const [startHour] = ev.start_time.split(':').map(Number);
    return startHour === hourStart;
  });
}

function calculateEventHeight(event) {
  const [startHour, startMin] = event.start_time.split(':').map(Number);
  const [endHour, endMin] = event.end_time.split(':').map(Number);
  
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
    navigate("/calendar/event/new", { state: { date: dateStr, time: timeStr } });
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    navigate("/calendar/event/edit", { state: { event } });
  };

  return (
    <div className="flex-1 bg-slate-900/95 rounded-2xl shadow-[0_30px_60px_rgba(15,23,42,0.45)] border border-slate-700 p-4 overflow-hidden flex flex-col">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-slate-700/30 mb-px">
        <div className="bg-slate-900/95" />
        {weekDays.map((d, i) => (
          <div key={i} className="bg-slate-900/95 text-center py-3">
            <div className="text-xs text-slate-400">{WEEKDAYS_FULL[i]}</div>
            <div className={`text-sm font-semibold ${
              d.getDate() === today.getDate() && 
              d.getMonth() === today.getMonth() &&
              d.getFullYear() === today.getFullYear()
                ? "text-indigo-400"
                : "text-slate-200"
            }`}>
              {d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {HOURS.map((hour, hourIdx) => {
          const actualHour = (hourIdx + 6) % 24;
          return (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-slate-700/30 h-[60px] relative">
              <div className="bg-slate-900/95 text-slate-400 text-xs p-2 text-right border-r border-slate-700/50">
                {hour}
              </div>
              {weekDays.map((d, dayIdx) => {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const dayEvents = getEventsStartingInHour(events, dateStr, actualHour);
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
                    {dayEvents.map((ev) => {
                      const position = calculateEventHeight(ev);
                      return (
                        <div
                          key={ev.id}
                          className="absolute left-1 right-1 text-[10px] bg-violet-600/90 text-white px-2 py-1 rounded cursor-pointer hover:bg-violet-500 transition overflow-hidden z-10"
                          style={{ top: position.top, height: position.height, minHeight: '20px' }}
                          title={`${ev.title} - ${ev.start_time} - ${ev.end_time}`}
                          onClick={(e) => handleEventClick(e, ev)}
                        >
                          <div className="font-semibold truncate">{ev.start_time} {ev.title}</div>
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {ev.tags.map((tag) => (
                              <span
                                key={tag}
                                className="bg-fuchsia-700/80 px-1 rounded text-[8px]"
                              >
                                {tag}
                              </span>
                            ))}
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
