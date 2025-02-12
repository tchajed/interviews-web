<script lang="ts">
	// @hmr:keep-all
	import { downloadFile } from "$lib/download";
	import { fetchSheetTsv } from "$lib/fetch_sheet";
	import {
		type Calendar,
		eventsToIcs,
		scheduleToCalendar,
		sheetDataToSchedule,
	} from "$lib/schedule";
	import { Heading, Input, Label, Button, Helper, Li, List, P } from "flowbite-svelte";
	import { CalendarMonthSolid } from "flowbite-svelte-icons";
	let url: string = "";
	let cal: Calendar | null = null;
	let fetchError: string | null = null;
	let validColor: "green" | "red" | undefined = undefined;
	$: {
		if (cal) {
			validColor = "green";
		} else {
			if (fetchError) {
				validColor = "red";
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
		return `${h}:${d.getMinutes().toString().padStart(2, "0")}`;
	}

	function formatDate(d: Date): string {
		// TODO: want nicer format (day of week, short month)
		const y = d.getFullYear();
		const m = (d.getMonth() + 1).toString().padStart(2, "0");
		const day = d.getDate().toString().padStart(2, "0");
		return `${y}-${m}-${day}`;
	}

	function handleDownload() {
		if (!cal) return;
		downloadFile(eventsToIcs(cal.events), "text/calendar", `${cal.title} - UW-Madison.ics`);
	}

	// TODO: doesn't handle debouncing
	$: if (url != "") {
		fetchError = null;
		// TODO: handle and report errors
		fetchSheetTsv(url)
			.then((data) => {
				cal = scheduleToCalendar(sheetDataToSchedule(data));
			})
			.catch((err) => {
				cal = null;
				if (err instanceof Error) {
					fetchError = err.message;
				} else {
					fetchError = "Unknown error";
				}
			});
	}
</script>

<Heading tag="h2" class="mb-4">Interview to calendar export</Heading>
<P class="mb-2">
	Enter a URL to a Google Sheets faculty candidate interview schedule, download a calendar file in
	iCalendar format with the meetings from the schedule.
</P>
<P class="mb-8">
	<span class="font-medium">Note:</span> double-check the results (especially times), since the parsing
	isn't perfect, and some information might only be in the notes column. You can edit the file by hand
	if needed.
</P>

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
	{#if cal}
		{#each cal.warnings as warning}
			<Helper class="mt-2" color="red">
				<span class="font-medium">Warning:</span>
				{warning}
			</Helper>
		{/each}
	{/if}
	{#if fetchError}
		<Helper class="mt-2" color="red">
			<span class="font-medium">Error:</span>
			{fetchError}
		</Helper>
	{/if}
</div>
<Button disabled={cal == null} on:click={handleDownload} class="mb-6">
	<CalendarMonthSolid class="me-2 h-4 w-4" />
	Download ICS
</Button>
{#if cal}
	<Heading tag="h4" class="mb-2">{cal.title} &mdash; {formatDate(cal.events[0].startTime)}</Heading>
	<List tag="ul" list="none" class="space-y-1">
		{#each cal.events as event}
			<Li>
				<P>
					{formatTime(event.startTime)}-{formatTime(event.endTime)}
					&mdash;
					<span class="font-medium">{event.title}</span>
				</P>
				{#if event.location}
					<P class="text-gray-500">{event.location}</P>
				{/if}
				{#if event.description}
					<P class="text-gray-500">{event.description}</P>
				{/if}
			</Li>
		{/each}
	</List>
{/if}
