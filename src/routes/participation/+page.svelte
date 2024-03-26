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
	import {
		Button,
		Heading,
		Helper,
		Input,
		Label,
		Progressbar,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
	} from "flowbite-svelte";
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
		downloadFile(
			countsToTsv(counts),
			"text/tab-separated-values",
			`interview-participation-${date}.tsv`,
		);
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
		<Table>
			<TableHead>
				<TableHeadCell>Name</TableHeadCell>
				<TableHeadCell>Total</TableHeadCell>
				<TableHeadCell>1:1</TableHeadCell>
				<TableHeadCell>Breakfast</TableHeadCell>
				<TableHeadCell>Lunch</TableHeadCell>
				<TableHeadCell>Dinner</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each counts as count}
					<TableBodyRow>
						<TableBodyCell>{count.name}</TableBodyCell>
						<TableBodyCell>{totalCount(count)}</TableBodyCell>
						<TableBodyCell>{count.counts.get("1:1") || 0}</TableBodyCell>
						<TableBodyCell>{count.counts.get("breakfast") || 0}</TableBodyCell>
						<TableBodyCell>{count.counts.get("lunch") || 0}</TableBodyCell>
						<TableBodyCell>{count.counts.get("dinner") || 0}</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</div>
