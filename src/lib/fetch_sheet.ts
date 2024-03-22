function parseSheetUrl(url: string): { id: string; gid: string } | null {
	const re = new RegExp(
		'https://docs.google.com/spreadsheets/d/([a-zA-Z0-9-_]+)/edit#gid=([0-9]+)'
	);
	const m = re.exec(url);
	if (!m) {
		return null;
	}
	return {
		id: m[1],
		gid: m[2]
	};
}

function tsvToData(tsv: string): string[][] {
	const rows = tsv.split('\n').map((line) => line.split('\t'));
	const maxLength = Math.max(...rows.map((row) => row.length));
	for (let i = 0; i < rows.length; i++) {
		while (rows[i].length < maxLength) {
			rows[i].push('');
		}
	}
	return rows;
}

function fetchRawSheet(id: string, gid: string): Promise<string> {
	return fetch(`https://docs.google.com/spreadsheets/d/${id}/export?gid=${gid}&format=tsv`).then(
		(resp) => resp.text()
	);
}

export async function fetchSheet(url: string): Promise<string[][]> {
	const parsed = parseSheetUrl(url);
	if (!parsed) {
		throw new Error(`could not parse url: ${url}`);
	}
	const { id, gid } = parsed;
	return tsvToData(await fetchRawSheet(id, gid));
}
