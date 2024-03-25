import { eventToIcal, type IcsEvent } from "./ical";

export type ScheduleRow = {
	timeRange: string;
	person: string;
	room: string;
	notes: string;
};

function parseRow(data: string[]): ScheduleRow {
	return {
		timeRange: data[0],
		person: data[1],
		room: data[2],
		notes: data[3],
	};
}

function parseTime(time: string): { h: number; m: number } {
	let h = parseInt(time.split(":")[0]);
	const m = parseInt(time.split(":")[1]);
	// heuristic for am/pm
	if (h <= 7) {
		h = h + 12;
	}
	return { h, m };
}

function dateWithTime(date: Date, time: { h: number; m: number }): Date {
	const d = new Date(date);
	d.setHours(time.h);
	d.setMinutes(time.m);
	return d;
}

function timeRangeToIcal(eventDate: Date, timeRange: string): { start: Date; end: Date } {
	const startTime = parseTime(timeRange.split("-")[0]);
	const start = dateWithTime(eventDate, startTime);

	const endTime = parseTime(timeRange.split("-")[1]);
	const end = dateWithTime(eventDate, endTime);

	return { start, end };
}

export type Schedule = {
	title: string;
	date: Date;
	events: ScheduleRow[];
	warnings: string[];
};

export function sheetDataToSchedule(data: string[][]): Schedule {
	// cell A1
	const title = data[0][0];

	// cell C1
	if (data[0][2] == "") {
		return { title, date: new Date(), events: [], warnings: ["could not find date"] };
	}
	const date = new Date(data[0][2]);
	date.setFullYear(new Date().getFullYear());

	// Find header row
	let startRow = -1;
	for (let i = 1; i < data.length; i++) {
		if (data[i][0] == "Time") {
			startRow = i;
			break;
		}
	}
	if (startRow < 0) {
		return { title, date, events: [], warnings: ["could not find header row"] };
	}

	const rows: ScheduleRow[] = [];
	const warnings: string[] = [];
	// startRow+1 to skip header row
	for (let i = startRow + 1; i < data.length; i++) {
		const row = parseRow(data[i]);
		rows.push(row);
	}
	return { title, date, events: rows, warnings };
}

export type Calendar = {
	title: string;
	events: IcsEvent[];
	warnings: string[];
};

export function sheetDataToCalendar(data: string[][]): Calendar {
	const schedule = sheetDataToSchedule(data);
	const sheetTitle = schedule.title;
	const eventDate = schedule.date;

	// event creation time stamp
	const stamp = new Date();

	// Find header row
	const events: IcsEvent[] = [];
	const warnings: string[] = [];
	// startRow+1 to skip header row
	for (const row of schedule.events) {
		let { timeRange } = row;
		const { person, notes } = row;
		const location = row.room;

		let title = person;
		if (title == "" || title == "BREAK") {
			continue;
		}
		if (timeRange.includes("LUNCH")) {
			title = `Lunch: ${title}`;
		}
		if (timeRange.includes("DINNER")) {
			title = `Dinner: ${title}`;
		}

		if (timeRange == "Pickup/Breakfast") {
			timeRange = "8:00-9:00";
		}
		let startEnd: { start: Date; end: Date };
		if (timeRange == "DINNER") {
			// try to get a time from the notes
			let m = /[0-9]+:[0-9]+/.exec(notes);
			if (m) {
				const time = parseTime(m[0]);
				startEnd = {
					start: dateWithTime(eventDate, time),
					end: dateWithTime(eventDate, { h: time.h + 2, m: time.m }),
				};
			} else {
				m = /[0-9]+(pm|PM)/.exec(notes);
				if (m) {
					const time = { h: parseInt(m[0]) + 12, m: 0 };
					startEnd = {
						start: dateWithTime(eventDate, time),
						end: dateWithTime(eventDate, { h: time.h + 2, m: time.m }),
					};
				} else {
					warnings.push("could not find time for dinner");
					continue;
				}
			}
		} else {
			if (!timeRange.includes("-")) {
				continue;
			}
			startEnd = timeRangeToIcal(eventDate, timeRange);
		}

		events.push({
			title,
			stamp,
			startTime: startEnd.start,
			endTime: startEnd.end,
			location,
			description: notes,
		});
	}
	return { title: sheetTitle, events, warnings };
}

export function eventsToIcs(events: IcsEvent[]): string {
	let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//UW-Madison//EN\n";
	for (const event of events) {
		icsContent += eventToIcal(event);
	}
	icsContent += "END:VCALENDAR";
	return icsContent;
}
