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

export type IcsEvent = {
	title: string;
	stamp: string; // DTSTAMP (when the event was created)
	startTime: string;
	endTime: string;
	description?: string;
	location: string;
};

export function eventToIcal(event: IcsEvent): string {
	let icsContent = 'BEGIN:VEVENT\n';
	icsContent += `SUMMARY:${event.title}\n`;
	icsContent += `DTSTART:${event.startTime}\n`;
	icsContent += `DTEND:${event.endTime}\n`;
	icsContent += `DTSTAMP:${event.stamp}\n`;
	icsContent += `LOCATION:${event.location}\n`;
	if (event.description) {
		icsContent += `DESCRIPTION:${event.description}\n`;
	}
	icsContent += `UID:${crypto.randomUUID()}\n`;
	icsContent += 'END:VEVENT\n';
	return icsContent;
}
