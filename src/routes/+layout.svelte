<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Pong</title>
</svelte:head>
{@render children()}


<style>
	:global(body) {
		background-color: #030712;
	}
</style>
