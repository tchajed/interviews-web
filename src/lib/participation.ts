import { fetchSheetTsv } from "./fetch_sheet";
import { sheetDataToSchedule, type Schedule, type ScheduleRow } from "./schedule";
import pLimit from "p-limit";

export type PartType = "breakfast" | "lunch" | "1:1" | "dinner";

/** A single event worth of participation. */
export type ParticipationEvent = {
	name: string; // of the faculty
	type: PartType;
	candidate: string;
};

/** Aggregate participation for one faculty member. */
export type ParticipationCount = {
	name: string; // of the faculty
	total: number; // redundant aggregation of counts
	counts: Map<PartType, number>;
	candidates: string[]; // redundant aggregation of events
	events: ParticipationEvent[];
};

/** Get the document id from a Google Docs URL (the component after /d/). Does not include gid, so identifies a document and not a particular sheet. */
export function getDocsId(url: string): string | null {
	const re = new RegExp("^https://docs.google.com/spreadsheets/d/([^/]+)");
	const m = re.exec(url);
	if (!m) {
		return null;
	}
	return m[1];
}

export function docsIdToUrl(id: string): string {
	return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}

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

function classifyEvent(row: ScheduleRow): PartType {
	if (/LUNCH/i.test(row.timeRange)) {
		return "lunch";
	}
	if (/(?:Pickup|Breakfast)/i.test(row.timeRange)) {
		return "breakfast";
	}
	if (/DINNER/i.test(row.timeRange)) {
		return "dinner";
	}
	return "1:1";
}

const IgnoredNamesRe = new RegExp(
	`(?:BREAK|TALK|TALK PREP|LUNCH|DINNER)|(?:^$)|(grad(?:uate)? student.*)|\\?|(\\.\\.\\.)`,
	"i",
);

const NameSepRe = new RegExp("\\s*(?:[,+;&])|(?:\\band\\b)\\s*");

export function getNames(person: string): string[] {
	const names: string[] = [];
	person.split(NameSepRe).forEach((name) => {
		name = name.trim();
		if (IgnoredNamesRe.test(name)) {
			return;
		}
		names.push(name);
	});
	return names;
}

function getParticipationForSchedule(sched: Schedule): ParticipationEvent[] {
	const events: ParticipationEvent[] = [];
	const candidate = sched.title.replace(/^Schedule for /i, "").trim();
	for (const event of sched.events) {
		const type = classifyEvent(event);
		getNames(event.person).forEach((name) => {
			events.push({ name, type, candidate });
		});
	}
	return events;
}

function getParticipationEvents(schedules: Schedule[]): ParticipationEvent[] {
	return schedules.flatMap(getParticipationForSchedule);
}

function totalCount<T>(counts: Map<T, number>): number {
	let total = 0;
	for (const count of counts.values()) {
		total += count;
	}
	return total;
}

/** Get aggregate participation for a set of URLs. Fetches the schedules and
 * calls `progressCb` once per element of url. */
export async function getParticipation(
	urls: string[],
	progressCb?: () => void,
): Promise<ParticipationCount[]> {
	const schedules = await getSchedules(urls, progressCb || (() => {}));
	const events = getParticipationEvents(schedules);
	normalizeNames(events);
	const aggregate = aggregateParticipation(events);
	aggregate.sort((a, b) => b.total - a.total);
	return aggregate;
}

type NameInfo = {
	remapNames: { [key: string]: string };
	allNames: Set<string>;
};

/** Heuristic to normalize first or last name only to full name. Finds strings
 * that look like full names (based on capitalization primarily), which will be
 * used to map first and last individually to full name. Tries to also track
 * when this is ambiguous, but that feature is poorly tested. */
function inferNames(events: ParticipationEvent[]): NameInfo {
	const remapNames: { [key: string]: string } = {};
	const allNames: Set<string> = new Set();
	const firstLast = new RegExp(`^([A-Z][A-Za-z\\-]+) ([A-Z][A-Za-z\\-]+)( [A-Za-z\\-]+)?$`);
	const seen: Set<string> = new Set();
	for (const event of events) {
		const m = firstLast.exec(event.name);
		if (!m) {
			continue;
		}
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
	return { remapNames, allNames };
}

/** Apply `nameInfo`'s normalization and remapping to `name`. */
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

/** Modify events in-place according to inferred names and normalization. */
function normalizeNames(events: ParticipationEvent[]) {
	const nameInfo = inferNames(events);
	for (let i = 0; i < events.length; i++) {
		events[i].name = normalizeName(nameInfo, events[i].name);
	}
}

function aggregateParticipation(events: ParticipationEvent[]): ParticipationCount[] {
	const counts: Map<string, { types: Map<PartType, number>; events: ParticipationEvent[] }> =
		new Map();
	for (const event of events) {
		const { name, type } = event;
		if (!counts.has(name)) {
			counts.set(name, { types: new Map(), events: [] });
		}
		const thisCount = counts.get(name);
		if (!thisCount) {
			throw new Error("assertion failed: did not initialize counts");
		}
		const { types } = thisCount;
		types.set(type, (types.get(type) || 0) + 1);
		thisCount.events.push(event);
	}
	const countList: ParticipationCount[] = [];
	for (const [name, count] of counts) {
		const candidates: string[] = [];
		for (const ev of count.events) {
			if (!candidates.includes(ev.candidate)) {
				candidates.push(ev.candidate);
			}
		}
		countList.push({
			name,
			total: totalCount(count.types),
			counts: count.types,
			candidates: candidates,
			events: count.events,
		});
	}
	return countList;
}

export function countsToTsv(counts: ParticipationCount[]): string {
	const lines: string[] = [];
	lines.push(["Name", "Total", "Breakfast", "Lunch", "1:1", "Dinner", "Candidates"].join("\t"));
	for (const count of counts) {
		const parts: string[] = [count.name.trim()];
		parts.push(count.total.toString());
		for (const type of ["breakfast", "lunch", "1:1", "dinner"]) {
			parts.push((count.counts.get(type as PartType) || 0).toString());
		}
		parts.push(count.candidates.map((c) => c.trim()).join(", "));
		lines.push(parts.join("\t"));
	}
	return lines.join("\n") + "\n";
}
