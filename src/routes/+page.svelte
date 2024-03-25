<script lang="ts">
	import { fetchSheetTsv } from '$lib/fetch_sheet';
	import { type Calendar, eventsToIcs, sheetDataToCalendar } from '$lib/schedule';
	import { Heading, Input, Label, Button, Helper, Li, List } from 'flowbite-svelte';
	import { CalendarMonthSolid } from 'flowbite-svelte-icons';
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

	function formatTime(d: Date): string {
		let h = d.getHours();
		if (h > 12) {
			h -= 12;
		}
		return `${h}:${d.getMinutes().toString().padStart(2, '0')}`;
	}

	function formatDate(d: Date): string {
		// TODO: want nicer format (day of week, short month)
		const y = d.getFullYear();
		const m = (d.getMonth() + 1).toString().padStart(2, '0');
		const day = d.getDate().toString().padStart(2, '0');
		return `${y}-${m}-${day}`;
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
		fetchSheetTsv(url)
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

<div class="mb-4">
	<Label class="mb-2" color={validColor} for="url">Schedule sheet URL</Label>
	<Input
		type="text"
		bind:value={url}
		id="url"
		name="url"
		color={validColor}
		size="sm"
		placeholder="https://docs.google.com/..."
		required
	/>
	{#if cal != null}
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
	<Button disabled={cal == null} on:click={handleDownload}>
		<CalendarMonthSolid class="me-2 h-4 w-4" />
		Download ICS
	</Button>
</div>
{#if cal != null}
	<Heading tag="h4" class="mb-4">{cal.title} &mdash; {formatDate(cal.events[0].startTime)}</Heading>
	<List tag="ul" class="space-y-1 text-gray-500">
		{#each cal.events as event}
			<Li>
				{formatTime(event.startTime)}-{formatTime(event.endTime)} &mdash;
				<span class="font-medium">{event.title}</span>
				{#if event.location != ''}
					&mdash; {event.location}
				{/if}
			</Li>
		{/each}
	</List>
{/if}
