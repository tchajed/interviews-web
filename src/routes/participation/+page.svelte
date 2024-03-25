<script lang="ts">
	import { fetchSheetHtml } from "$lib/fetch_sheet";
	import { Heading, Helper, Input, Label } from "flowbite-svelte";
	let url: string = "";
	let sheetHtml: string | null = null;
	let fetchError: string | null = null;

	let validColor: "green" | "red" | undefined = undefined;

	$: {
		if (sheetHtml != null) {
			validColor = "green";
		} else {
			if (fetchError != null) {
				validColor = "red";
			} else {
				validColor = undefined;
			}
		}
	}

	$: if (url != "") {
		fetchError = null;
		fetchSheetHtml(url, "Schedule")
			.then((html) => {
				sheetHtml = html;
			})
			.catch((err) => {
				fetchError = err.message;
				sheetHtml = null;
			});
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
		placeholder="https://docs.google.com/..."
		required
	/>
	{#if fetchError}
		<Helper color="red"><span class="font-medium">Error:</span> {fetchError}</Helper>
	{/if}
</div>
