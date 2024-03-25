import { fetchSheetTsv } from "./fetch_sheet";
import { sheetDataToSchedule, type Schedule, type ScheduleRow } from "./schedule";

function getScheduleSheets(masterHtml: string): string[] {
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

async function getSchedules(urls: string[]): Promise<Schedule[]> {
	const scheds = [];
	for (const url of urls) {
		const tsv = await fetchSheetTsv(url, "Schedule").catch(() => null);
		if (!tsv) {
			continue;
		}
		scheds.push(sheetDataToSchedule(tsv));
		// TODO: remove, only for debugging
		if (scheds.length >= 5) {
			break;
		}
	}
	return scheds;
}

type PartType = "breakfast" | "lunch" | "1:1" | "dinner";

export type ParticipationEvent = {
	name: string;
	type: PartType;
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

const IgnoredNames = new RegExp(`(BREAK|TALK|TALK PREP)|(^$)`, "i");

export async function getParticipationEvents(masterHtml: string): Promise<ParticipationEvent[]> {
	const urls = getScheduleSheets(masterHtml);
	const schedules = await getSchedules(urls);
	const events: ParticipationEvent[] = [];
	const re = new RegExp("\\s*[,+;]\\s*");
	for (const sched of schedules) {
		for (const event of sched.events) {
			const type = classifyEvent(event);
			if (IgnoredNames.test(event.person)) {
				continue;
			}
			event.person.split(re).forEach((name) => {
				if (name == "") {
					return;
				}
				events.push({ name, type });
			});
		}
	}
	return events;
}
