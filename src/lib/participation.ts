export function getScheduleSheets(masterHtml: string): string[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(masterHtml, "text/html");
	const urls: string[] = [];
	const re = new RegExp("^https://docs.google.com/spreadsheets/d/.*");
	doc.querySelectorAll("a").forEach((a) => {
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
