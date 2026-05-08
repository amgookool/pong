<script lang="ts">
	/**
	 * SetupScreen – collects player names and match settings before the game starts.
	 */
	import { startGame } from '$lib/game/store.svelte';

	let p1Name = $state('Player 1');
	let p2Name = $state('Player 2');
	let winningScore = $state(5);
	let winningRounds = $state(3);

	function handleStart(e: Event) {
		e.preventDefault();
		startGame(
			p1Name.trim() || 'Player 1',
			p2Name.trim() || 'Player 2',
			winningScore,
			winningRounds
		);
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-950 px-4">
	<div
		class="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 p-10 shadow-2xl shadow-black/60"
	>
		<!-- Title -->
		<div class="mb-10 text-center">
			<h1 class="text-5xl font-black tracking-widest text-white">PONG</h1>
			<p class="mt-2 text-sm tracking-widest text-gray-400 uppercase">Two Player Edition</p>
		</div>

		<form onsubmit={handleStart} class="space-y-8">
			<!-- Player names -->
			<div class="grid grid-cols-2 gap-4">
				<!-- Player 1 -->
				<div class="space-y-2">
					<label for="p1name" class="block text-xs font-semibold tracking-widest text-cyan-400 uppercase">
						Player 1
					</label>
					<input
						id="p1name"
						type="text"
						bind:value={p1Name}
						maxlength="16"
						placeholder="Player 1"
						class="w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none ring-0 transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
					/>
					<p class="text-xs text-gray-500">Controls: <kbd class="rounded bg-gray-700 px-1">W</kbd> / <kbd class="rounded bg-gray-700 px-1">S</kbd></p>
				</div>

				<!-- Player 2 -->
				<div class="space-y-2">
					<label for="p2name" class="block text-xs font-semibold tracking-widest text-violet-400 uppercase">
						Player 2
					</label>
					<input
						id="p2name"
						type="text"
						bind:value={p2Name}
						maxlength="16"
						placeholder="Player 2"
						class="w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none ring-0 transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
					/>
					<p class="text-xs text-gray-500">Controls: <kbd class="rounded bg-gray-700 px-1">↑</kbd> / <kbd class="rounded bg-gray-700 px-1">↓</kbd></p>
				</div>
			</div>

			<!-- Match settings -->
			<div class="space-y-4">
				<h2 class="text-xs font-semibold tracking-widest text-gray-400 uppercase">Match Settings</h2>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<label for="winning-score" class="block text-xs text-gray-400">
							Goals to win a round
						</label>
						<input
							id="winning-score"
							type="number"
							bind:value={winningScore}
							min="1"
							max="21"
							class="w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
						/>
					</div>
					<div class="space-y-2">
						<label for="winning-rounds" class="block text-xs text-gray-400">
							Rounds to win the match
						</label>
						<input
							id="winning-rounds"
							type="number"
							bind:value={winningRounds}
							min="1"
							max="9"
							class="w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
						/>
					</div>
				</div>
			</div>

			<!-- Power-up legend -->
			<div class="rounded-xl border border-white/5 bg-gray-800/50 p-4 space-y-2">
				<p class="text-xs font-semibold tracking-widest text-gray-400 uppercase">Power-ups</p>
				<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
					<span><span class="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1"></span>Speed Boost – ball faster</span>
					<span><span class="inline-block h-2 w-2 rounded-full bg-indigo-400 mr-1"></span>Slow Ball – ball slower</span>
					<span><span class="inline-block h-2 w-2 rounded-full bg-green-400 mr-1"></span>Big Paddle – bigger paddle</span>
					<span><span class="inline-block h-2 w-2 rounded-full bg-red-400 mr-1"></span>Tiny Paddle – smaller paddle</span>
				</div>
				<p class="text-xs text-gray-500 pt-1">Effects apply to the last player who hit the ball.</p>
			</div>

			<button
				type="submit"
				class="w-full rounded-xl bg-white py-3 text-sm font-bold tracking-widest text-gray-950 uppercase transition hover:bg-gray-200 active:scale-95"
			>
				Start Game
			</button>
		</form>
	</div>
</div>
