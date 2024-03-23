<script lang="ts">
	import { fetchSheet } from '$lib/fetch_sheet';
	import { type Calendar, eventsToIcs, sheetDataToCalendar } from '$lib/schedule';
	import { Heading, Input, Label, Button, Helper, Li, List } from 'flowbite-svelte';
	let url: string = '';
	let cal: Calendar | null = null;
	let fetchError: string | null = null;
	let validColor: 'green' | 'red' | undefined = undefined;
	$: {
		if (cal != null) {
			validColor = 'green';
		} else {
			if (fetchError != null) {
				validColor = 'red';
			} else {
				validColor = undefined;
			}
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
		a.addEventListener('click', clickHandler, false);
		a.click();
		// note that a is never added to the DOM
	}

	function handleDownload() {
		if (!cal) return;
		const blob = new Blob([eventsToIcs(cal.events)], { type: 'text/calendar' });
		downloadBlob(blob, `${cal.title} - UW-Madison.ics`);
	}

	// TODO: doesn't handle debouncing
	$: if (url != '') {
		fetchError = null;
		// TODO: handle and report errors
		fetchSheet(url)
			.then((data) => {
				cal = sheetDataToCalendar(data);
			})
			.catch((err) => {
				cal = null;
				if (err instanceof Error) {
					fetchError = err.message;
				} else {
					fetchError = 'Unknown error';
				}
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
		{#if cal != null}
			<Helper class="mt-2" color="green">
				<span class="font-medium">Schedule generated</span>
			</Helper>
			{#each cal.warnings as warning}
				<Helper class="mt-2" color="red">
					<span class="font-medium">Warning:</span>
					{warning}
				</Helper>
			{/each}
		{/if}
		{#if fetchError != null}
			<Helper class="mt-2" color="red">
				<span class="font-medium">Error:</span>
				{fetchError}
			</Helper>
		{/if}
	</div>
	<div class="mb-6">
		<Button disabled={cal == null} on:click={handleDownload}>Download ICS</Button>
	</div>
	{#if cal != null}
		<Heading tag="h4" class="mb-4">{cal.title}</Heading>
		<List tag="ul" class="space-y-1 text-gray-500">
			{#each cal.events as event}
				<Li>
					<span class="font-medium">{event.title}</span> &mdash; {event.location}
				</Li>
			{/each}
		</List>
	{/if}
</form>

<style>
	:global(body) {
		max-width: 800px;
		padding: 5px;
		margin: 1em auto;
	}
</style>
