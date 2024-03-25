import { describe, it, expect } from "vitest";
import fs from "fs";
import { parseTsvString } from "$lib/fetch_sheet";
import { sheetDataToCalendar, type Calendar } from "$lib/schedule";

describe("test schedule", () => {
	it("parses as a TSV", () => {
		const scheduleContents = fs.readFileSync("src/test/example_schedule.tsv", "utf8");
		const schedule = parseTsvString(scheduleContents);
		expect(schedule.length).toBe(32);
		// rows should be padded
		expect(schedule[0].length).toBe(4);
		expect(schedule[1].length).toBe(4);
	});
});

describe("schedule parsing", () => {
	function getTestCalendar(): Calendar {
		const scheduleContents = fs.readFileSync("src/test/example_schedule.tsv", "utf8");
		const schedule = parseTsvString(scheduleContents);
		return sheetDataToCalendar(schedule);
	}

	it("parses the test schedule", () => {
		const cal = getTestCalendar();
		expect(cal.title).toBe("Alan Turing");
		expect(cal.warnings).toHaveLength(0);
		expect(cal.events).toHaveLength(16);
	});

	it("parses the test schedule", () => {
		const cal = getTestCalendar();
		expect(cal.events).toHaveLength(16);
		expect(cal.events[0].title).toBe("Alonzo Church");
		expect(cal.events[0].location).toBe("pick up from hotel at 7:45am");
		expect(cal.events[0].startTime.getHours()).toBe(8);
		expect(cal.events[0].startTime.getMonth()).toBe(3); // zero-indexed
		expect(cal.events[0].startTime.getDate()).toBe(1);

		expect(cal.events[7].title).toBe("TALK");
		expect(cal.events[7].endTime.getHours()).toBe(13);

		expect(cal.events[15].title).toBe("Dinner: Alonzo Church, Stephen Kleene, Grace Hopper");
		expect(cal.events[15].startTime.getHours()).toBe(6 + 12);
		expect(cal.events[15].startTime.getMinutes()).toBe(30);
	});
});
