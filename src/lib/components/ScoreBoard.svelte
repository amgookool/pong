<script lang="ts">
	/**
	 * ScoreBoard – displays current round scores, round wins, and active effects
	 * for both players.  Rendered as an overlay above the game canvas.
	 */
	import { gameState } from '$lib/game/store.svelte';
	import { POWERUP_LABELS, POWERUP_COLORS } from '$lib/game/powerups';

	const p1 = $derived(gameState.players[0]);
	const p2 = $derived(gameState.players[1]);
</script>

<div class="pointer-events-none flex w-full items-start justify-between px-6 pt-4">
	<!-- Player 1 (left) -->
	<div class="flex flex-col items-start gap-1">
		<span class="text-xs font-semibold tracking-widest text-cyan-400 uppercase">{p1.name}</span>
		<span class="text-5xl font-black tabular-nums text-white leading-none">{p1.score}</span>

		<!-- Round wins -->
		<div class="flex gap-1 mt-1">
			{#each Array(gameState.winningRounds) as _, i (i)}
				<span
					class="inline-block h-2 w-2 rounded-full transition-colors"
					style="background-color: {i < p1.wins ? '#22d3ee' : 'rgba(255,255,255,0.12)'}"
				></span>
			{/each}
		</div>

		<!-- Active effect badge – always rendered to reserve space and prevent layout shift -->
		<span
			class="mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase text-gray-950 transition-opacity duration-200"
			style="background-color: {p1.activeEffect ? POWERUP_COLORS[p1.activeEffect.type] : 'transparent'}; visibility: {p1.activeEffect ? 'visible' : 'hidden'};"
		>
			{p1.activeEffect ? POWERUP_LABELS[p1.activeEffect.type] : '\u00a0'}
		</span>
	</div>

	<!-- Centre info -->
	<div class="flex flex-col items-center gap-0.5">
		<span class="text-xs tracking-widest text-gray-500 uppercase">Round {gameState.currentRound}</span>
		<span class="text-xs text-gray-600">of {gameState.winningRounds}</span>
	</div>

	<!-- Player 2 (right) -->
	<div class="flex flex-col items-end gap-1">
		<span class="text-xs font-semibold tracking-widest text-violet-400 uppercase">{p2.name}</span>
		<span class="text-5xl font-black tabular-nums text-white leading-none">{p2.score}</span>

		<!-- Round wins -->
		<div class="flex gap-1 mt-1">
			{#each Array(gameState.winningRounds) as _, i (i)}
				<span
					class="inline-block h-2 w-2 rounded-full transition-colors"
					style="background-color: {i < p2.wins ? '#a78bfa' : 'rgba(255,255,255,0.12)'}"
				></span>
			{/each}
		</div>

		<!-- Active effect badge – always rendered to reserve space and prevent layout shift -->
		<span
			class="mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase text-gray-950 transition-opacity duration-200"
			style="background-color: {p2.activeEffect ? POWERUP_COLORS[p2.activeEffect.type] : 'transparent'}; visibility: {p2.activeEffect ? 'visible' : 'hidden'};"
		>
			{p2.activeEffect ? POWERUP_LABELS[p2.activeEffect.type] : '\u00a0'}
		</span>
	</div>
</div>
