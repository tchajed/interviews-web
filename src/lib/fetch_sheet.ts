import JSZip from "jszip";

function parseSheetUrl(url: string): { id: string; gid: string } | { error: string } {
	const re = new RegExp("^https://docs.google.com/spreadsheets/d/([^/]+)/edit#gid=([0-9]+)");
	const m = re.exec(url);
	if (!m) {
		const looserRe = new RegExp("^https://docs.google.com/spreadsheets/d/([^/]+)/?.*");
		if (!looserRe.exec(url)) {
			return { error: "could not parse URL" };
		}
		return { error: "could not parse sheet URL (missing #gid=)" };
	}
	return {
		id: m[1],
		gid: m[2],
	};
}

export function parseTsvString(tsv: string): string[][] {
	const rows = tsv.split("\n").map((line) => line.trim().split("\t"));
	const maxLength = Math.max(...rows.map((row) => row.length));
	for (let i = 0; i < rows.length; i++) {
		while (rows[i].length < maxLength) {
			rows[i].push("");
		}
	}
	return rows;
}

function fetchRawTsv(id: string, gid: string): Promise<string> {
	return fetch(`https://docs.google.com/spreadsheets/d/${id}/export?gid=${gid}&format=tsv`).then(
		(resp) => {
			if (!resp.ok) {
				throw new Error(`could not fetch URL: ${resp.status}`);
			}
			return resp.text();
		},
	);
}

export async function fetchSheetTsv(url: string): Promise<string[][]> {
	const parsed = parseSheetUrl(url);
	if ("error" in parsed) {
		throw new Error(parsed.error);
	}
	const { id, gid } = parsed;
	const tsv = await fetchRawTsv(id, gid);
	return parseTsvString(tsv);
}

function parseSheetId(url: string): { id: string } | { error: string } {
	const re = new RegExp("^https://docs.google.com/spreadsheets/d/([^/]+)/.*");
	const m = re.exec(url);
	if (!m) {
		return { error: "could not parse URL" };
	}
	return { id: m[1] };
}

export async function fetchSheetHtml(url: string, sheetName: string): Promise<string> {
	const parsed = parseSheetId(url);
	if ("error" in parsed) {
		throw new Error(parsed.error);
	}
	const { id } = parsed;
	const zip = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=zip`)
		.then((resp) => {
			if (!resp.ok) {
				throw new Error(`could not fetch URL: ${resp.status}`);
			}
			return resp.arrayBuffer();
		})
		.then((buf) => {
			return JSZip.loadAsync(buf);
		});
	const entry = zip.file(`${sheetName}.html`);
	if (!entry) {
		const files = [];
		for (const file in Object.keys(zip.files)) {
			files.push(zip.files[file].name);
		}
		files.sort();
		console.log("files:", files);
		throw new Error(`could not find sheet ${sheetName}`);
	}
	return entry.async("text");
}
