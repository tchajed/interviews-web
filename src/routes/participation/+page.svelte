<script lang="ts">
	// @hmr:keep-all
	import { downloadFile } from "$lib/download";

	import { fetchSheetHtml } from "$lib/fetch_sheet";
	import {
		getParticipation,
		type ParticipationCount,
		getScheduleSheets,
		countsToTsv,
		type PartType,
		getDocsId,
		docsIdToUrl,
	} from "$lib/participation";
	import {
		Button,
		Footer,
		Heading,
		Helper,
		Input,
		Label,
		P,
		Progressbar,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
	} from "flowbite-svelte";
	import { CaretUpSolid, CaretDownSolid } from "flowbite-svelte-icons";
	import { onMount } from "svelte";
	import { writable, type Writable } from "svelte/store";
	import { slide } from "svelte/transition";
	let url: string = "";
	let fetchError: string | null = null;
	let fetchProgress: { sheets: number; total: number } | null = null;
	let counts: ParticipationCount[] | null = null;

	// note: only uses hash on initial load, we're not listening for the hashchange event
	onMount(() => {
		if (document.location.hash != "") {
			url = docsIdToUrl(document.location.hash.slice(1));
		}
	});

	const sortKey: Writable<string> = writable("total");
	const sortItems: Writable<ParticipationCount[]> = writable((counts || []).slice());

	// Define a function to sort the items
	const sortTable = (key: string) => {
		sortKey.set(key);
	};

	function getSortedTable(counts: ParticipationCount[], key: string): ParticipationCount[] {
		if (key == "name") {
			return [...counts].sort((a: ParticipationCount, b: ParticipationCount) =>
				a.name.localeCompare(b.name),
			);
		}
		const getKey = (count: ParticipationCount): number => {
			if (key == "total") {
				return count.total;
			} else {
				return count.counts.get(key as PartType) || 0;
			}
		};
		return [...counts].sort((a, b) => {
			return getKey(b) - getKey(a);
		});
	}

	$: {
		sortItems.set(getSortedTable(counts || [], $sortKey));
	}

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
			const docId = getDocsId(url);
			if (docId && docId != document.location.hash) {
				document.location.hash = docId;
			}
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

	let openRow: number | null = null;
	const toggleRow = (i: number) => {
		openRow = openRow == i ? null : i;
	};
</script>

<Heading tag="h2" class="mb-4">Interview participation</Heading>
<P class="mb-12">
	Statistics on how much each faculty member has participated in interviews. Enter the URL for the
	master schedule, which is how you give permission to access the schedules. All data is fetched by
	the browser and the server is never involved.
</P>
<P class="mb-12">Click on a row to see the signups for that faculty member.</P>

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
		{@const percentDone = Math.round((fetchProgress.sheets / fetchProgress.total) * 100)}
		<span class="text-gray-500">
			Fetching {remaining} sheet{#if remaining != 1}s{/if}...
		</span>
		<Progressbar progress={percentDone} />
	{:else if counts}
		<Button size="sm" on:click={handleDownload} class="mb-4">Download TSV</Button>
		<Table striped={true}>
			<TableHead theadClass="divide-y">
				{#each ["name", "total", "1:1", "breakfast", "lunch", "dinner"] as key}
					<TableHeadCell class="cursor-pointer" on:click={() => sortTable(key)}>
						<span class="inline-flex items-center">
							{key.toUpperCase()}
							{#if $sortKey == key}
								{#if $sortKey == "name"}<CaretUpSolid />
								{:else}<CaretDownSolid />{/if}
							{/if}
						</span>
					</TableHeadCell>
				{/each}
			</TableHead>
			<TableBody>
				{#each $sortItems as count, idx}
					<TableBodyRow on:click={() => toggleRow(idx)}>
						<TableBodyCell>{count.name}</TableBodyCell>
						<TableBodyCell>{count.total}</TableBodyCell>
						<TableBodyCell>{count.counts.get("1:1") || 0}</TableBodyCell>
						<TableBodyCell>{count.counts.get("breakfast") || 0}</TableBodyCell>
						<TableBodyCell>{count.counts.get("lunch") || 0}</TableBodyCell>
						<TableBodyCell>{count.counts.get("dinner") || 0}</TableBodyCell>
					</TableBodyRow>
					{#if idx == openRow}
						<TableBodyRow>
							<TableBodyCell colspan={6} class="p-0">
								<div
									class="mx-6 text-sm font-normal text-gray-600"
									transition:slide={{ duration: 300, axis: "y" }}
								>
									{#each count.events as ev}
										{ev.candidate}
										{ev.type}
										<br />
									{/each}
								</div>
							</TableBodyCell>
						</TableBodyRow>
					{/if}
				{/each}
			</TableBody>
		</Table>
	{/if}
</div>

<Footer class="mt-12">
	<div class="flex justify-end">
		<a
			href="https://github.com/tchajed/interviews-web"
			class="text-gray-600 hover:underline dark:text-gray-500"
		>
			GitHub source
		</a>
	</div>
</Footer>
