<script lang="ts">
	import { fetchSheet } from '$lib/fetch_sheet';
	import { icsFromSheetData } from '$lib/schedule';
	import { Heading, Input, Label, Button, Helper } from 'flowbite-svelte';
	let url: string = '';
	let ics: string | null = null;
	let validColor: 'green' | 'red' | undefined = undefined;
	$: {
		if (ics != null) {
			validColor = 'green';
		} else {
			validColor = undefined;
		}
	}

	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;

		// Click handler that releases the object URL after the element has been clicked
		const clickHandler = () => {
			setTimeout(() => {
				URL.revokeObjectURL(url);
				removeEventListener('click', clickHandler);
			}, 150);
		};

		a.click();
		// note that a is never added to the DOM
	}

	function handleDownload() {
		if (!ics) return;
		const blob = new Blob([ics], { type: 'text/calendar' });
		downloadBlob(blob, 'schedule.ics');
	}

	// TODO: doesn't handle debouncing
	$: if (url != '') {
		// TODO: handle and report errors
		fetchSheet(url).then((data) => {
			ics = icsFromSheetData(data);
		});
	}
</script>

<Heading tag="h2" class="mb-12">Interview to calendar export</Heading>

<form>
	<div class="mb-4">
		<Label class="mb-2" color={validColor} for="url">Sheet URL</Label>
		<Input
			type="text"
			bind:value={url}
			id="url"
			name="url"
			color={validColor}
			placeholder="https://docs.google.com/..."
			required
		/>
		{#if ics != null}
			<Helper class="mt-2" color="green">
				<span class="font-medium">Schedule generated</span>
			</Helper>
		{/if}
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
