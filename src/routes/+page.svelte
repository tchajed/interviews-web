<script lang="ts">
	import { fetchSheet } from '$lib/fetch_sheet';
	import { icsFromSheetData } from '$lib/schedule';
	import { Heading, Input, Label, Button } from 'flowbite-svelte';
	let url: string = '';
	let ics: string | null = null;

	function downloadBlob(blob: Blob, filename: string) {
		// Create an object URL for the blob object
		const url = URL.createObjectURL(blob);

		// Create a new anchor element
		const a = document.createElement('a');

		// Set the href and download attributes for the anchor element
		// You can optionally set other attributes like `title`, etc
		// Especially, if the anchor element will be attached to the DOM
		a.href = url;
		a.download = filename;

		// Click handler that releases the object URL after the element has been clicked
		// This is required for one-off downloads of the blob content
		const clickHandler = () => {
			setTimeout(() => {
				URL.revokeObjectURL(url);
				removeEventListener('click', clickHandler);
			}, 150);
		};

		a.click();
	}

	function handleDownload() {
		if (!ics) return;
		const blob = new Blob([ics], { type: 'text/calendar' });
		downloadBlob(blob, 'schedule.ics');
	}

	// TODO: doesn't handle debouncing
	$: if (url != '') {
		fetchSheet(url).then((data) => {
			ics = icsFromSheetData(data);
		});
	}
</script>

<Heading tag="h2" class="mb-12">Interview to calendar export</Heading>

<form>
	<div class="mb-4">
		<Label class="mb-2" for="url">Sheet URL</Label>
		<Input
			type="text"
			bind:value={url}
			id="url"
			name="url"
			placeholder="https://docs.google.com/..."
			required
		/>
	</div>
	<div class="mb-6">
		<Button on:click={handleDownload}>Download ICS</Button>
	</div>
</form>

<style>
	:global(body) {
		max-width: 800px;
		padding: 5px;
		margin: 1em auto;
	}
</style>
