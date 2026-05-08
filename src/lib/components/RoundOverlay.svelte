<script lang="ts">
	/**
	 * RoundOverlay – shown between rounds and at match end.
	 * Displays the result and provides a Continue / Play Again button.
	 */
	import { gameState, continueToNextRound, resetToSetup } from '$lib/game/store.svelte';

	const isRoundOver = $derived(gameState.phase === 'roundOver');
	const isGameOver = $derived(gameState.phase === 'gameOver');

	/** The player who just won the round (last score pushed over the threshold) */
	const roundWinner = $derived(
		gameState.players.find((p) => p.score >= gameState.winningScore) ?? null
	);

	const matchWinner = $derived(
		gameState.matchWinnerId !== null ? gameState.players[gameState.matchWinnerId] : null
	);
</script>

{#if isRoundOver || isGameOver}
	<div
		class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
	>
		{#if isGameOver && matchWinner}
			<p class="text-xs font-semibold tracking-[0.3em] text-gray-400 uppercase mb-2">Match Over</p>
			<h2 class="text-5xl font-black text-white mb-1">{matchWinner.name}</h2>
			<p class="text-lg text-gray-300 mb-8">wins the match!</p>

			<div class="flex gap-3">
				<button
					onclick={resetToSetup}
					class="rounded-xl bg-white px-8 py-3 text-sm font-bold tracking-widest text-gray-950 uppercase transition hover:bg-gray-200 active:scale-95"
				>
					Play Again
				</button>
			</div>
		{:else if isRoundOver && roundWinner}
			<p class="text-xs font-semibold tracking-[0.3em] text-gray-400 uppercase mb-2">
				Round {gameState.currentRound} Complete
			</p>
			<h2 class="text-5xl font-black text-white mb-1">{roundWinner.name}</h2>
			<p class="text-lg text-gray-300 mb-8">wins the round!</p>

			<!-- Round win counts -->
			<div class="flex gap-8 mb-8">
				{#each gameState.players as player, i (i)}
					<div class="flex flex-col items-center gap-1">
						<span class="text-xs tracking-widest text-gray-400 uppercase">{player.name}</span>
						<span class="text-3xl font-black text-white">{player.wins}</span>
						<span class="text-xs text-gray-500">round{player.wins !== 1 ? 's' : ''} won</span>
					</div>
				{/each}
			</div>

			<button
				onclick={continueToNextRound}
				class="rounded-xl bg-white px-8 py-3 text-sm font-bold tracking-widest text-gray-950 uppercase transition hover:bg-gray-200 active:scale-95"
			>
				Next Round
			</button>
		{/if}
	</div>
{/if}
