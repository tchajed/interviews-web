function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;

	// Click handler that releases the object URL after the element has been clicked
	const clickHandler = () => {
		setTimeout(() => {
			URL.revokeObjectURL(url);
			removeEventListener("click", clickHandler);
		}, 150);
	};
	a.addEventListener("click", clickHandler, false);
	a.click();
	// note that a is never added to the DOM
}

export function downloadFile(data: string, mimeType: string, filename: string) {
	const blob = new Blob([data], { type: mimeType });
	downloadBlob(blob, filename);
}
