<script lang="ts">
	/**
	 * SetupScreen – collects player names, mode, difficulty, and match settings.
	 */
	import { startGame } from '$lib/game/store.svelte';
	import type { AiDifficulty } from '$lib/game/types';

	type Mode = 'single' | 'two';

	let mode = $state<Mode>('single');
	let p1Name = $state('Player 1');
	let p2Name = $state('Player 2');
	let aiDifficulty = $state<AiDifficulty>('medium');
	let winningScore = $state(5);
	let winningRounds = $state(3);

	const difficulties: { value: AiDifficulty; label: string; desc: string }[] = [
		{ value: 'easy',   label: 'Easy',   desc: 'Relaxed — great for beginners' },
		{ value: 'medium', label: 'Medium', desc: 'Competitive but beatable' },
		{ value: 'hard',   label: 'Hard',   desc: 'Relentless — good luck' }
	];

	function handleStart(e: Event) {
		e.preventDefault();
		startGame(
			p1Name.trim() || 'Player 1',
			mode === 'two' ? (p2Name.trim() || 'Player 2') : 'CPU',
			winningScore,
			winningRounds,
			mode === 'single',
			aiDifficulty
		);
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-950 px-4">
	<div
		class="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 p-10 shadow-2xl shadow-black/60"
	>
		<!-- Title -->
		<div class="mb-8 text-center">
			<h1 class="text-5xl font-black tracking-widest text-white">PONG</h1>
		</div>

		<!-- Mode toggle -->
		<div class="mb-8 flex rounded-xl border border-white/10 bg-gray-800/60 p-1">
			<button
				type="button"
				onclick={() => (mode = 'single')}
				class="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-widest uppercase transition
					{mode === 'single'
						? 'bg-white text-gray-950 shadow'
						: 'text-gray-400 hover:text-white'}"
			>
				Single Player
			</button>
			<button
				type="button"
				onclick={() => (mode = 'two')}
				class="flex-1 rounded-lg py-2.5 text-sm font-semibold tracking-widest uppercase transition
					{mode === 'two'
						? 'bg-white text-gray-950 shadow'
						: 'text-gray-400 hover:text-white'}"
			>
				Two Players
			</button>
		</div>

		<form onsubmit={handleStart} class="space-y-7">

			<!-- Player name(s) -->
			{#if mode === 'single'}
				<div class="space-y-2">
					<label for="p1name-sp" class="block text-xs font-semibold tracking-widest text-cyan-400 uppercase">
						Your Name
					</label>
					<input
						id="p1name-sp"
						type="text"
						bind:value={p1Name}
						maxlength="16"
						placeholder="Player 1"
						class="w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
					/>
					<p class="text-xs text-gray-500">Controls: <kbd class="rounded bg-gray-700 px-1">W</kbd> / <kbd class="rounded bg-gray-700 px-1">S</kbd></p>
				</div>

				<!-- Difficulty -->
				<div class="space-y-3">
					<p class="text-xs font-semibold tracking-widest text-gray-400 uppercase">AI Difficulty</p>
					<div class="grid grid-cols-3 gap-2">
						{#each difficulties as d, i (i)}
							<button
								type="button"
								onclick={() => (aiDifficulty = d.value)}
								class="flex flex-col items-center gap-1 rounded-xl border py-3 px-2 text-xs font-semibold tracking-widest uppercase transition
									{aiDifficulty === d.value
										? 'border-white/30 bg-white/10 text-white'
										: 'border-white/5 text-gray-500 hover:border-white/15 hover:text-gray-300'}"
							>
								{d.label}
								<span class="text-[9px] font-normal normal-case tracking-normal text-gray-500 text-center leading-tight">{d.desc}</span>
							</button>
						{/each}
					</div>
				</div>
			{:else}
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
							class="w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
							class="w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
						/>
						<p class="text-xs text-gray-500">Controls: <kbd class="rounded bg-gray-700 px-1">O</kbd> / <kbd class="rounded bg-gray-700 px-1">L</kbd></p>
					</div>
				</div>
			{/if}

			<!-- Match settings -->
			<div class="space-y-3">
				<h2 class="text-xs font-semibold tracking-widest text-gray-400 uppercase">Match Settings</h2>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<label for="winning-score" class="block text-xs text-gray-400">Goals to win a round</label>
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
						<label for="winning-rounds" class="block text-xs text-gray-400">Rounds to win the match</label>
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
			<div class="rounded-xl border border-white/5 bg-gray-800/50 p-4 space-y-3">
				<p class="text-xs font-semibold tracking-widest text-gray-400 uppercase">Power-ups &amp; Power-downs</p>
				<p class="text-[10px] text-gray-500 leading-relaxed">
					Items appear on the arena during play. The last player who touched the ball receives
					the effect when it's collected.
				</p>
				<div class="grid grid-cols-2 gap-2">
					<!-- Speed Boost -->
					<div class="flex items-start gap-2">
						<span class="mt-0.5 shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-black">↑</span>
						<div>
							<p class="text-[11px] font-semibold text-white leading-tight">Speed Boost</p>
							<p class="text-[10px] text-gray-500">Ball moves faster for the hitter</p>
						</div>
					</div>
					<!-- Slow Ball -->
					<div class="flex items-start gap-2">
						<span class="mt-0.5 shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-indigo-400 text-[9px] font-black text-black">↓</span>
						<div>
							<p class="text-[11px] font-semibold text-white leading-tight">Slow Ball</p>
							<p class="text-[10px] text-gray-500">Ball moves slower for the hitter</p>
						</div>
					</div>
					<!-- Big Paddle -->
					<div class="flex items-start gap-2">
						<span class="mt-0.5 shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-400 text-[9px] font-black text-black">+</span>
						<div>
							<p class="text-[11px] font-semibold text-white leading-tight">Big Paddle</p>
							<p class="text-[10px] text-gray-500">Hitter's paddle grows larger</p>
						</div>
					</div>
					<!-- Tiny Paddle -->
					<div class="flex items-start gap-2">
						<span class="mt-0.5 shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-400 text-[9px] font-black text-black">−</span>
						<div>
							<p class="text-[11px] font-semibold text-white leading-tight">Tiny Paddle</p>
							<p class="text-[10px] text-gray-500">Hitter's paddle shrinks</p>
						</div>
					</div>
					<!-- Split Ball -->
					<div class="flex items-start gap-2">
						<span class="mt-0.5 shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-400 text-[9px] font-black text-black">⊕</span>
						<div>
							<p class="text-[11px] font-semibold text-white leading-tight">Split Ball</p>
							<p class="text-[10px] text-gray-500">Spawns a second real ball — either can score</p>
						</div>
					</div>
					<!-- Fake Ball -->
					<div class="flex items-start gap-2">
						<span class="mt-0.5 shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-pink-400 text-[9px] font-black text-black">?</span>
						<div>
							<p class="text-[11px] font-semibold text-white leading-tight">Decoy Ball</p>
							<p class="text-[10px] text-gray-500">Spawns a fake ball — looks real, doesn't score</p>
						</div>
					</div>
				</div>
				<p class="text-[10px] text-gray-600 pt-1 border-t border-white/5">
					Opposite effects cancel each other out. Same effect stacks the duration.
				</p>
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
