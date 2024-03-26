<script lang="ts">
	import { downloadFile } from "$lib/download";

	// @hmr:keep-all
	import { fetchSheetHtml } from "$lib/fetch_sheet";
	import {
		getParticipation,
		totalCount,
		type ParticipationCount,
		getScheduleSheets,
		countsToTsv,
	} from "$lib/participation";
	import { Button, Heading, Helper, Input, Label, Li, List, Progressbar } from "flowbite-svelte";
	let url: string = "";
	let fetchError: string | null = null;
	let fetchProgress: { sheets: number; total: number } | null = null;
	let counts: ParticipationCount[] | null = null;

	let validColor: "green" | "red" | undefined = undefined;

	$: {
		if (fetchProgress || counts != null) {
			validColor = "green";
		} else {
			if (fetchError != null) {
				validColor = "red";
			} else {
				validColor = undefined;
			}
		}
	}

	$: {
		if (url == "") {
			fetchError = null;
			counts = null;
		} else {
			fetchError = null;
			fetchSheetHtml(url, "Schedule")
				.then((html) => {
					fetchParticipation(html).then((c) => {
						counts = c;
					});
				})
				.catch((err) => {
					fetchError = err.message;
					counts = null;
				});
		}
	}

	async function fetchParticipation(html: string): Promise<ParticipationCount[]> {
		const urls = getScheduleSheets(html);
		if (urls.length == 0) {
			fetchError = "no schedule sheets found in master schedule";
			return [];
		}
		fetchProgress = { sheets: 0, total: urls.length };
		const counts = await getParticipation(urls, () => {
			if (fetchProgress) {
				fetchProgress.sheets++;
			}
		});
		fetchProgress = null;
		return counts;
	}

	function handleDownload() {
		if (!counts) {
			return;
		}
		const now = new Date();
		const m = (now.getMonth() + 1).toString().padStart(2, "0");
		const d = now.getDate().toString().padStart(2, "0");
		const date = `${now.getFullYear()}-${m}-${d}`;
		downloadFile(countsToTsv(counts), "text/plain", `interview-participation-${date}.tsv`);
	}
</script>

<Heading tag="h2" class="mb-12">Interview participation</Heading>

<div>
	<Label class="mb-2" color={validColor} for="url">Master schedule URL</Label>
	<Input
		type="text"
		color={validColor}
		bind:value={url}
		id="url"
		name="url"
		size="sm"
		class="mb-4"
		placeholder="https://docs.google.com/..."
		required
	/>
	{#if fetchError}
		<Helper color="red"><span class="font-medium">Error:</span> {fetchError}</Helper>
	{/if}
	{#if fetchProgress}
		{@const remaining = fetchProgress.total - fetchProgress.sheets}
		<span class="text-gray-500">Fetching {remaining} sheets...</span>
		<Progressbar progress={Math.round((fetchProgress.sheets / fetchProgress.total) * 100)} />
	{:else if counts}
		<Button size="sm" on:click={handleDownload} class="mb-4">Download TSV</Button>
		<List tag="ul">
			{#each counts as count}
				<Li
					>{count.name} &mdash; {totalCount(count)}
					<span class="text-gray-500">
						[{#each count.candidates as c, idx}
							{c}{#if idx < count.candidates.length - 1},
							{/if}{/each}]
					</span>
				</Li>
			{/each}
		</List>
	{/if}
</div>
