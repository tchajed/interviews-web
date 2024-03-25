function parseSheetUrl(url: string): { id: string; gid: string } | null {
	const re = new RegExp("^https://docs.google.com/spreadsheets/d/([^/]+)/edit#gid=([0-9]+)");
	const m = re.exec(url);
	if (!m) {
		return null;
	}
	return {
		id: m[1],
		gid: m[2],
	};
}

function tsvToData(tsv: string): string[][] {
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
	if (!parsed) {
		const looserRe = new RegExp("^https://docs.google.com/spreadsheets/d/([^/]+)/?.*");
		if (!looserRe.exec(url)) {
			throw new Error(`could not parse URL`);
		}
		throw new Error(`could not parse sheet URL (missing #gid=)`);
	}
	const { id, gid } = parsed;
	const tsv = await fetchRawTsv(id, gid);
	return tsvToData(tsv);
}
