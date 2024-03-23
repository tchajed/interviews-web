export function pad(n: number, width: number) {
	return String(n).padStart(width, '0');
}

export function dateToIcal(date: string | Date) {
	const d = new Date(date);
	return pad(d.getFullYear(), 4) + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2);
}

export function timeToIcal(time: { h: number; m: number }): string {
	const s = 0;
	return pad(time.h, 2) + pad(time.m, 2) + pad(s, 2);
}

function datetimeToIcal(date: Date): string {
	return dateToIcal(date) + 'T' + timeToIcal({ h: date.getHours(), m: date.getMinutes() });
}

export type IcsEvent = {
	title: string;
	stamp: Date; // DTSTAMP (when the event was created)
	startTime: Date;
	endTime: Date;
	description?: string;
	location: string;
};

export function eventToIcal(event: IcsEvent): string {
	let icsContent = 'BEGIN:VEVENT\n';
	icsContent += `SUMMARY:${event.title}\n`;
	icsContent += `DTSTART;TZID=America/Chicago:${datetimeToIcal(event.startTime)}\n`;
	icsContent += `DTEND;TZID=America/Chicago:${datetimeToIcal(event.endTime)}\n`;
	icsContent += `DTSTAMP:${datetimeToIcal(event.stamp)}\n`;
	icsContent += `LOCATION:${event.location}\n`;
	if (event.description) {
		icsContent += `DESCRIPTION:${event.description}\n`;
	}
	icsContent += `UID:${crypto.randomUUID()}\n`;
	icsContent += 'END:VEVENT\n';
	return icsContent;
}
