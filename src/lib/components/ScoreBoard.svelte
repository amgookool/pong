<script lang="ts">
	/**
	 * ScoreBoard – displays current round scores, round wins, and active effects
	 * for both players.  Rendered as an overlay above the game canvas.
	 */
	import { gameState, resetToSetup } from '$lib/game/store.svelte';
	import { POWERUP_LABELS, POWERUP_COLORS } from '$lib/game/powerups';

	const p1 = $derived(gameState.players[0]);
	const p2 = $derived(gameState.players[1]);
</script>

<div class="pointer-events-none flex w-full items-center justify-between px-5 py-2 gap-4">
	<!-- Player 1 (left) -->
	<div class="flex items-center gap-3 min-w-0">
		<span class="text-4xl font-black tabular-nums text-white leading-none shrink-0">{p1.score}</span>
		<div class="flex flex-col gap-1 min-w-0">
			<span class="text-xs font-semibold tracking-widest text-cyan-400 uppercase truncate">{p1.name}</span>
			<!-- Round win pips -->
			<div class="flex gap-1">
				{#each Array(gameState.winningRounds) as _, i (i)}
					<span
						class="inline-block h-1.5 w-4 rounded-full transition-colors"
						style="background-color: {i < p1.wins ? '#22d3ee' : 'rgba(255,255,255,0.12)'}"
					></span>
				{/each}
			</div>
			<!-- Active effect badges (up to 2: one SIZE, one SPEED) -->
			<div class="flex gap-1 h-4 items-center">
				{#each p1.activeEffects as effect (effect.type)}
					<span
						class="rounded-full px-2 text-[9px] font-bold tracking-widest uppercase text-gray-950 leading-4"
						style="background-color: {POWERUP_COLORS[effect.type]}"
					>
						{POWERUP_LABELS[effect.type]}
					</span>
				{:else}
					<span class="invisible rounded-full px-2 text-[9px] leading-4">&nbsp;</span>
				{/each}
			</div>
		</div>
	</div>

	<!-- Centre info -->
	<div class="pointer-events-auto flex flex-col items-center gap-1 shrink-0">
		<span class="text-[10px] tracking-widest text-gray-500 uppercase">Round {gameState.currentRound} / {gameState.winningRounds}</span>
		<button
			onclick={resetToSetup}
			class="rounded-lg border border-white/10 px-3 py-0.5 text-[9px] font-semibold tracking-widest text-gray-500 uppercase transition hover:border-white/20 hover:text-gray-300 active:scale-95"
		>
			Quit
		</button>
	</div>

	<!-- Player 2 (right) -->
	<div class="flex items-center gap-3 min-w-0 justify-end">
		<div class="flex flex-col gap-1 items-end min-w-0">
			<span class="text-xs font-semibold tracking-widest text-violet-400 uppercase truncate">{p2.name}</span>
			<!-- Round win pips -->
			<div class="flex gap-1">
				{#each Array(gameState.winningRounds) as _, i (i)}
					<span
						class="inline-block h-1.5 w-4 rounded-full transition-colors"
						style="background-color: {i < p2.wins ? '#a78bfa' : 'rgba(255,255,255,0.12)'}"
					></span>
				{/each}
			</div>
			<!-- Active effect badges (up to 2: one SIZE, one SPEED) -->
			<div class="flex gap-1 h-4 items-center justify-end">
				{#each p2.activeEffects as effect (effect.type)}
					<span
						class="rounded-full px-2 text-[9px] font-bold tracking-widest uppercase text-gray-950 leading-4"
						style="background-color: {POWERUP_COLORS[effect.type]}"
					>
						{POWERUP_LABELS[effect.type]}
					</span>
				{:else}
					<span class="invisible rounded-full px-2 text-[9px] leading-4">&nbsp;</span>
				{/each}
			</div>
		</div>
		<span class="text-4xl font-black tabular-nums text-white leading-none shrink-0">{p2.score}</span>
	</div>
</div>

