import JSZip from "jszip";

function parseSheetId(url: string): { id: string } | { error: string } {
	const re = new RegExp("^https://docs.google.com/spreadsheets/d/([^/]+)/?.*");
	const m = re.exec(url);
	if (!m) {
		return { error: "could not parse URL" };
	}
	return { id: m[1] };
}

function parseSheetUrl(url: string): { id: string; gid: string } | { error: string } {
	const re = new RegExp("^https://docs.google.com/spreadsheets/d/([^/]+)/edit(?:\\?gid=[0-9]+)?#gid=([0-9]+)");
	const m = re.exec(url);
	if (!m) {
		const parsed = parseSheetId(url);
		if ("id" in parsed) {
			return { error: "could not parse sheet URL (missing #gid=)" };
		}
		return { error: "could not parse URL" };
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

/** Fetch a Google Docs sheet in TSV format, as a string. The sheet can be
 * specified by its gid (which appears in the #gid= part of the URL), or by
 * specifying a sheet name. */
function fetchRawTsv(
	params: { id: string } & ({ gid: string } | { sheet: string }),
): Promise<string> {
	const { id } = params;
	let url: string;
	if ("gid" in params) {
		url = `https://docs.google.com/spreadsheets/d/${id}/export?gid=${params.gid}&format=tsv`;
	} else if ("sheet" in params) {
		url = `https://docs.google.com/spreadsheets/d/${id}/export?sheet=${params.sheet}&format=tsv`;
	} else {
		throw new Error("no sheet specified (need gid or sheet)");
	}
	return fetch(url).then((resp) => {
		if (!resp.ok) {
			throw new Error(`could not fetch URL: ${resp.status}`);
		}
		return resp.text();
	});
}

/** Fetch a sheet from a URL. If sheet is provided, fetch that sheet by name
 * rather than using the #gid in the url. */
export async function fetchSheetTsv(url: string, sheet?: string): Promise<string[][]> {
	let tsv: string;
	if (sheet) {
		const parsed = parseSheetId(url);
		if ("error" in parsed) {
			throw new Error(parsed.error);
		}
		tsv = await fetchRawTsv({ id: parsed.id, sheet });
	} else {
		const parsed = parseSheetUrl(url);
		if ("error" in parsed) {
			throw new Error(parsed.error);
		}
		tsv = await fetchRawTsv({ id: parsed.id, gid: parsed.gid });
	}
	return parseTsvString(tsv);
}

/** Fetch a Google Docs spreadsheet sheet as an HTML string. This requires
 * getting the entire spreadsheet as a zip file, then finding the individual
 * sheet by name in the zip file. */
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
		console.warn("files:", files);
		throw new Error(`could not find sheet ${sheetName}`);
	}
	return entry.async("text");
}
