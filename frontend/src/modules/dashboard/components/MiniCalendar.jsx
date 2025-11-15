import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EVENTS } from "../../../api/fakeData.js";
import { Maximize2 } from "lucide-react";

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
	let week = [];
	let day = 1 - firstWeekDay;
	for (let i = 0; i < 6; i++) {
		week = [];
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

function getEventsForDay(events, year, month, day, selectedTags) {
	const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	return events.filter(
		(ev) =>
			ev.date === dayStr &&
			(selectedTags.length === 0 || ev.tags.some((tag) => selectedTags.includes(tag)))
	);
}

export default function MiniCalendar({ selectedTags, logic = "AND" }) {
	const navigate = useNavigate();
	const today = new Date();
	const [date, setDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
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

	// Filtrowanie zdarzeń po tagach
	const filteredEvents =
		selectedTags.length === 0
			? EVENTS
			: EVENTS.filter((ev) => {
					if (logic === "AND") {
						// Wszystkie wybrane tagi muszą być w wydarzeniu
						return selectedTags.every((tag) => ev.tags?.includes(tag));
					} else {
						// Przynajmniej jeden wybrany tag musi być w wydarzeniu
						return selectedTags.some((tag) => ev.tags?.includes(tag));
					}
			  });

	return (
		<div className="w-full h-full flex flex-col">
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
				<div className="grid grid-cols-7 grid-rows-6 gap-0.5 flex-1">
					{matrix.flat().map((day, idx) => {
						const events = day ? getEventsForDay(filteredEvents, year, month, day, selectedTags) : [];
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
							>
								<span className={`text-[10px] font-bold leading-tight ${isTodayDay ? "text-indigo-300" : ""}`}>
									{day || ""}
								</span>
								<div className="absolute top-[14px] left-0.5 right-0.5 bottom-0.5 flex flex-col gap-0.5 overflow-hidden">
									{events.slice(0, 2).map((ev) => (
										<div
											key={ev.id}
											className="w-full truncate text-[9px] bg-violet-600/80 text-white px-0.5 rounded leading-tight h-[12px] flex-shrink-0"
											title={ev.title}
										>
											{ev.title}
										</div>
									))}
									{events.length > 2 && (
										<div className="text-[8px] text-slate-400 px-0.5 h-[10px] flex-shrink-0">
											+{events.length - 2}
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
