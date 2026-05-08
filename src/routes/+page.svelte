<script lang="ts">
	import { gameState } from '$lib/game/store.svelte';
	import SetupScreen from '$lib/components/SetupScreen.svelte';
	import GameCanvas from '$lib/components/GameCanvas.svelte';
	import ScoreBoard from '$lib/components/ScoreBoard.svelte';
	import RoundOverlay from '$lib/components/RoundOverlay.svelte';

	const isSetup = $derived(gameState.phase === 'setup');
</script>

{#if isSetup}
	<SetupScreen />
{:else}
	<!-- Game view -->
	<div class="flex h-screen flex-col bg-gray-950 overflow-hidden">
		<!-- Score bar – fixed height, never shifts -->
		<div class="shrink-0 w-full">
			<ScoreBoard />
		</div>

		<!-- Canvas area – grows to fill remaining space -->
		<div class="relative flex-1 min-h-0 flex items-center justify-center px-4 py-2">
			<div class="relative flex h-full w-full items-center justify-center">
				<GameCanvas />
				<RoundOverlay />
			</div>
		</div>

		<!-- Controls hint -->
		<p class="shrink-0 pb-3 text-center text-xs tracking-widest text-gray-600 uppercase select-none">
			P1: W / S &nbsp;·&nbsp; P2: ↑ / ↓ &nbsp;·&nbsp; Serve: Space
		</p>
	</div>
{/if}
