import { fetchSheetTsv } from "$lib/fetch_sheet";
import { describe, it, expect } from "vitest";

describe("fetch tsv", () => {
	it("errors on invalid URL", async () => {
		await expect(fetchSheetTsv("https://example.com")).rejects.toThrow("could not parse URL");
	});
	it("gives more precise error when gid missing", async () => {
		await expect(
			fetchSheetTsv(
				"https://docs.google.com/spreadsheets/d/14c61ad_YXSYwN_uufoCh5BgiM2k5lG2Uz9KdNOjg-ZU/edit",
			),
		).rejects.toThrow("missing #gid");
	});
	it("fetches a valid sheet", { timeout: 10000 }, async () => {
		const tsv = await fetchSheetTsv(
			"https://docs.google.com/spreadsheets/d/14c61ad_YXSYwN_uufoCh5BgiM2k5lG2Uz9KdNOjg-ZU/edit#gid=1117371261",
		);
		expect(tsv.length).toBeGreaterThan(10);
	});
	it("fetches a valid sheet with a ?gid", { timeout: 10000 }, async () => {
		const tsv = await fetchSheetTsv(
			"https://docs.google.com/spreadsheets/d/14c61ad_YXSYwN_uufoCh5BgiM2k5lG2Uz9KdNOjg-ZU/edit?gid=1117371261#gid=1117371261",
		);
		expect(tsv.length).toBeGreaterThan(10);
	});
	it("fetches a valid sheet by name rather than gid", { timeout: 10000 }, async () => {
		const tsv = await fetchSheetTsv(
			"https://docs.google.com/spreadsheets/d/14c61ad_YXSYwN_uufoCh5BgiM2k5lG2Uz9KdNOjg-ZU/edit",
			"Schedule",
		);
		expect(tsv.length).toBeGreaterThan(10);
	});
});
