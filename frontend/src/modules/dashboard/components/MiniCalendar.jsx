import { useState } from "react";
import { EVENTS } from "../../../api/fakeData.js";

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

export default function MiniCalendar({ selectedTags }) {
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

	return (
		<div className="w-full">
			<div className="flex items-center justify-between mb-2">
				<button
					onClick={handlePrev}
					className="px-2 py-1 rounded hover:bg-slate-700/40 text-slate-300"
					aria-label="Poprzedni miesiąc"
				>
					&lt;
				</button>
				<h3 className="text-lg font-semibold text-slate-200">
					{MONTHS[month]} {year}
				</h3>
				<button
					onClick={handleNext}
					className="px-2 py-1 rounded hover:bg-slate-700/40 text-slate-300"
					aria-label="Następny miesiąc"
				>
					&gt;
				</button>
			</div>
			<div className="flex flex-col gap-2">
				<div className="grid grid-cols-7 mb-1 text-xs text-slate-400 font-semibold">
					{WEEKDAYS.map((d) => (
						<div key={d} className="text-center">
							{d}
						</div>
					))}
				</div>
				<div className="grid grid-cols-7 gap-1">
					{matrix.flat().map((day, idx) => {
						const events = day ? getEventsForDay(EVENTS, year, month, day, selectedTags) : [];
						return (
							<div
								key={idx}
								className={`min-h-[56px] rounded-lg px-1 py-1 flex flex-col items-start bg-slate-800/40 ${
									day ? "text-slate-100" : "text-slate-500/40"
								}`}
							>
								<span className="text-xs font-bold">{day || ""}</span>
								<div className="flex flex-col gap-0.5 w-full">
									{events.map((ev) => (
										<div
											key={ev.id}
											className="w-full truncate text-xs bg-violet-600/80 text-white px-1 rounded mb-0.5"
											title={ev.title}
										>
											{ev.title}
											<span className="ml-1 text-[10px]">
												{ev.tags.map((tag) => (
													<span key={tag} className="ml-1 bg-fuchsia-700/70 px-1 rounded text-white">
														{tag}
													</span>
												))}
											</span>
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
