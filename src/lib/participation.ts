import { fetchSheetTsv } from "./fetch_sheet";
import { sheetDataToSchedule, type Schedule, type ScheduleRow } from "./schedule";
import pLimit from "p-limit";

export function getScheduleSheets(masterHtml: string): string[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(masterHtml, "text/html");
	const urls: string[] = [];
	const re = new RegExp("^https://docs.google.com/spreadsheets/d/.*");
	doc.querySelectorAll("tr td a").forEach((a) => {
		const href = a.attributes.getNamedItem("href")?.value;
		if (!href) {
			return;
		}
		if (re.test(href)) {
			urls.push(href);
		}
	});
	return urls;
}

async function getSchedules(urls: string[], progressCb: () => void): Promise<Schedule[]> {
	const limit = pLimit(10);
	const parScheds: (Schedule | null)[] = await Promise.all(
		urls.map((url) =>
			limit(async () => {
				const tsv = await fetchSheetTsv(url, "Schedule").catch(() => null);
				progressCb();
				if (!tsv) {
					return null;
				}
				return sheetDataToSchedule(tsv);
			}),
		),
	);
	return parScheds.flatMap((sched) => (sched ? [sched] : []));
}

type PartType = "breakfast" | "lunch" | "1:1" | "dinner";

export type ParticipationEvent = {
	name: string;
	type: PartType;
	candidate: string;
};

function classifyEvent(row: ScheduleRow): PartType {
	if (row.timeRange.includes("LUNCH")) {
		return "lunch";
	}
	if (row.timeRange.includes("Breakfast")) {
		return "breakfast";
	}
	if (row.timeRange.includes("DINNER")) {
		return "dinner";
	}
	return "1:1";
}

const IgnoredNames = new RegExp(
	`(?:BREAK|TALK|TALK PREP|LUNCH|DINNER)|(?:^$)|(grad(?:uate)? student.*)`,
	"i",
);

function getParticipationEvents(schedules: Schedule[]): ParticipationEvent[] {
	const events: ParticipationEvent[] = [];
	const re = new RegExp("\\s*(?:[,+;&])|(?:\\band\\b)\\s*");
	for (const sched of schedules) {
		for (const event of sched.events) {
			const type = classifyEvent(event);
			event.person.split(re).forEach((name) => {
				name = name.trim();
				if (IgnoredNames.test(name)) {
					return;
				}
				events.push({ name, type, candidate: sched.title.trim() });
			});
		}
	}
	return events;
}

export function totalCount(counts: ParticipationCount): number {
	let total = 0;
	for (const kv of counts.counts) {
		const count = kv[1];
		total += count;
	}
	return total;
}

export async function getParticipation(
	urls: string[],
	progressCb?: () => void,
): Promise<ParticipationCount[]> {
	const schedules = await getSchedules(urls, progressCb || (() => {}));
	const events = getParticipationEvents(schedules);
	normalizeNames(events);
	const aggregate = aggregateParticipation(events);
	aggregate.sort((a, b) => totalCount(b) - totalCount(a));
	return aggregate;
}

type NameInfo = {
	remapNames: { [key: string]: string };
	allNames: Set<string>;
};

function inferNames(events: ParticipationEvent[]): NameInfo {
	const remapNames: { [key: string]: string } = {};
	const allNames = new Set<string>();
	const firstLast = new RegExp(`^([A-Z][A-Za-z\\-]+) ([A-Z][a-z\\-]+)$`);
	const seen: Set<string> = new Set();
	for (const event of events) {
		const m = firstLast.exec(event.name);
		if (m) {
			allNames.add(m[0]);
			// map first name to full name
			for (const namePart of [m[1], m[2]]) {
				if (seen.has(namePart)) {
					console.log(`${namePart} is ambiguous`);
					delete remapNames[namePart];
				} else {
					remapNames[namePart] = event.name;
				}
			}
		}
	}
	return { remapNames, allNames };
}

function normalizeName(nameInfo: NameInfo, name: string): string {
	if (nameInfo.allNames.has(name)) {
		return name;
	}
	for (const namePart of Object.keys(nameInfo.remapNames)) {
		if (name.includes(namePart)) {
			return nameInfo.remapNames[namePart];
		}
	}
	return name;
}

function normalizeNames(events: ParticipationEvent[]) {
	const nameInfo = inferNames(events);
	for (let i = 0; i < events.length; i++) {
		events[i].name = normalizeName(nameInfo, events[i].name);
	}
}

export type ParticipationCount = {
	name: string;
	counts: Map<PartType, number>;
	candidates: string[];
};

function aggregateParticipation(events: ParticipationEvent[]): ParticipationCount[] {
	const counts: Map<string, { types: Map<PartType, number>; candidates: string[] }> = new Map();
	for (const event of events) {
		const { name, type, candidate } = event;
		if (!counts.has(name)) {
			const m = new Map();
			for (const type of ["breakfast", "lunch", "1:1", "dinner"]) {
				m.set(type, 0);
			}
			counts.set(name, { types: new Map(), candidates: [] });
		}
		const thisCount = counts.get(name);
		if (!thisCount) {
			throw new Error("assertion failed: did not initialize counts");
		}
		const thisTypes = thisCount.types;
		thisTypes.set(type, (thisTypes.get(type) || 0) + 1);
		if (!thisCount.candidates.includes(candidate)) {
			thisCount.candidates.push(candidate);
		}
	}
	const countList: ParticipationCount[] = [];
	for (const [name, count] of counts) {
		countList.push({ name, counts: count.types, candidates: count.candidates });
	}
	return countList;
}
