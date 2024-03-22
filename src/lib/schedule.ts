function pad(n: number, width: number) {
	return String(n).padStart(width, '0');
}

function dateToIcal(date: string | Date) {
	const d = new Date(date);
	return pad(d.getFullYear(), 4) + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2);
}

function parseTime(time: string): { h: number; m: number } {
	let h = parseInt(time.split(':')[0]);
	const m = parseInt(time.split(':')[1]);
	// heuristic for am/pm
	if (h <= 7) {
		h = h + 12;
	}
	return { h, m };
}

function timeToIcal(time: string | { h: number; m: number }) {
	if (typeof time == 'string') {
		time = parseTime(time);
	}
	const s = 0;
	return pad(time.h, 2) + pad(time.m, 2) + pad(s, 2);
}

function startEndToIcal(
	eventDate: Date,
	startTime: { h: number; m: number },
	endTime: { h: number; m: number }
): { start: string; end: string } {
	const startDateTime = dateToIcal(eventDate) + 'T' + timeToIcal(startTime); // local time, not UTC
	const endDateTime = dateToIcal(eventDate) + 'T' + timeToIcal(endTime);
	return { start: startDateTime, end: endDateTime };
}

function timeRangeToIcal(eventDate: Date, timeRange: string): { start: string; end: string } {
	const startTime = timeRange.split('-')[0];
	const endTime = timeRange.split('-')[1];
	return startEndToIcal(eventDate, parseTime(startTime), parseTime(endTime));
}

function parseRow(data: string[]): {
	timeRange: string;
	person: string;
	room: string;
	notes: string;
} {
	return {
		timeRange: data[0],
		person: data[1],
		room: data[2],
		notes: data[3]
	};
}

export function icsFromSheetData(data: string[][]): string {
	// cell C1
	const eventDate = new Date(data[0][2]);
	let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//UW-Madison//EN\n';

	const now = new Date();
	const dtstamp =
		dateToIcal(now) + 'T' + pad(now.getHours(), 2) + pad(now.getMinutes(), 2) + pad(0, 2);

	// Find header row
	let startRow = -1;
	for (let i = 1; i < data.length; i++) {
		if (data[i][0] == 'Time') {
			startRow = i;
			break;
		}
	}
	if (startRow < 0) {
		throw new Error(`could not find "Time" header`);
	}

	// startRow+1 to skip header row
	for (let i = startRow + 1; i < data.length; i++) {
		const parsed = parseRow(data[i]);
		let { timeRange } = parsed;
		const { person, room, notes } = parsed;

		let title = person;
		if (title == '' || title == 'BREAK') {
			continue;
		}
		if (timeRange.includes('LUNCH')) {
			title = `Lunch: ${title}`;
		}
		if (timeRange.includes('DINNER')) {
			title = `Dinner: ${title}`;
		}

		if (timeRange == 'Pickup/Breakfast') {
			timeRange = '8:00-9:00';
		}
		let startEnd: { start: string; end: string };
		if (timeRange == 'DINNER') {
			// try to get a time from the notes
			let m = /[0-9]+:[0-9]+/.exec(notes);
			if (m) {
				const time = parseTime(m[0]);
				startEnd = startEndToIcal(eventDate, time, {
					h: time.h + 2,
					m: time.m
				});
			} else {
				m = /[0-9]+(pm|PM)/.exec(notes);
				if (m) {
					const time = { h: parseInt(m[0]) + 12, m: 0 };
					startEnd = startEndToIcal(eventDate, time, {
						h: time.h + 2,
						m: time.m
					});
				} else {
					Logger.log(`Warning: could not find time for dinner`);
					continue;
				}
			}
		} else {
			if (!timeRange.includes('-')) {
				continue;
			}
			startEnd = timeRangeToIcal(eventDate, timeRange);
		}

		// Convert time to a suitable format for ICS

		// Append event details to ICS content
		icsContent += 'BEGIN:VEVENT\n';
		icsContent += `SUMMARY:${title}\n`;
		icsContent += `DTSTART:${startEnd.start}\n`;
		icsContent += `DTEND:${startEnd.end}\n`;
		icsContent += `DTSTAMP:${dtstamp}\n`;
		if (notes != '') {
			icsContent += `DESCRIPTION:${notes}\n`;
		}
		icsContent += `LOCATION:${room}\n`;
		icsContent += `UID:${crypto.randomUUID()}\n`;
		icsContent += 'END:VEVENT\n';
	}

	// Close the ICS file format
	icsContent += 'END:VCALENDAR';

	return icsContent;
}
