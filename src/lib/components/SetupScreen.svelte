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
	let bumpersEnabled = $state(false);
	let bumperMaxCount = $state<2 | 4 | 6>(4);

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
			aiDifficulty,
			bumpersEnabled,
			bumperMaxCount
		);
	}
</script>

<!-- Outer scroll wrapper – lets the card grow taller than the viewport -->
<div class="min-h-screen overflow-y-auto bg-gray-950 px-4 py-8">
	<div class="mx-auto w-full max-w-lg">

		<!-- Header -->
		<div class="mb-6 text-center">
			<h1 class="text-5xl font-black tracking-widest text-white">PONG</h1>
			<p class="mt-1 text-xs tracking-widest text-gray-600 uppercase">Configure your match</p>
		</div>

		<!-- Mode toggle -->
		<div class="mb-6 flex rounded-xl border border-white/10 bg-gray-900 p-1">
			<button
				type="button"
				onclick={() => (mode = 'single')}
				class="flex-1 rounded-lg py-2 text-xs font-bold tracking-widest uppercase transition
					{mode === 'single' ? 'bg-white text-gray-950 shadow' : 'text-gray-400 hover:text-white'}"
			>Single Player</button>
			<button
				type="button"
				onclick={() => (mode = 'two')}
				class="flex-1 rounded-lg py-2 text-xs font-bold tracking-widest uppercase transition
					{mode === 'two' ? 'bg-white text-gray-950 shadow' : 'text-gray-400 hover:text-white'}"
			>Two Players</button>
		</div>

		<form onsubmit={handleStart} class="space-y-5">

			<!-- ── Players ──────────────────────────────────────────── -->
			<section class="rounded-xl border border-white/8 bg-gray-900 p-4 space-y-4">
				<h2 class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Players</h2>

				{#if mode === 'single'}
					<div class="space-y-1.5">
						<label for="p1name-sp" class="block text-xs font-semibold text-cyan-400">Your Name</label>
						<input
							id="p1name-sp"
							type="text"
							bind:value={p1Name}
							maxlength="16"
							placeholder="Player 1"
							class="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
						/>
						<p class="text-[11px] text-gray-600">
							Controls: <kbd class="rounded bg-gray-800 px-1 text-gray-400">W</kbd> / <kbd class="rounded bg-gray-800 px-1 text-gray-400">S</kbd>
						</p>
					</div>

					<div class="space-y-2">
						<p class="text-xs font-semibold text-gray-400">AI Difficulty</p>
						<div class="grid grid-cols-3 gap-2">
							{#each difficulties as d (d.value)}
								<button
									type="button"
									onclick={() => (aiDifficulty = d.value)}
									class="flex flex-col items-center gap-0.5 rounded-xl border py-2.5 px-2 text-xs font-semibold tracking-widest uppercase transition
										{aiDifficulty === d.value
											? 'border-white/25 bg-white/10 text-white'
											: 'border-white/5 text-gray-500 hover:border-white/12 hover:text-gray-300'}"
								>
									{d.label}
									<span class="text-[9px] font-normal normal-case tracking-normal text-gray-500 text-center leading-tight">{d.desc}</span>
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-1.5">
							<label for="p1name" class="block text-xs font-semibold text-cyan-400">Player 1</label>
							<input
								id="p1name"
								type="text"
								bind:value={p1Name}
								maxlength="16"
								placeholder="Player 1"
								class="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
							/>
							<p class="text-[11px] text-gray-600">
								<kbd class="rounded bg-gray-800 px-1 text-gray-400">W</kbd> / <kbd class="rounded bg-gray-800 px-1 text-gray-400">S</kbd>
							</p>
						</div>
						<div class="space-y-1.5">
							<label for="p2name" class="block text-xs font-semibold text-violet-400">Player 2</label>
							<input
								id="p2name"
								type="text"
								bind:value={p2Name}
								maxlength="16"
								placeholder="Player 2"
								class="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
							/>
							<p class="text-[11px] text-gray-600">
								<kbd class="rounded bg-gray-800 px-1 text-gray-400">O</kbd> / <kbd class="rounded bg-gray-800 px-1 text-gray-400">L</kbd>
							</p>
						</div>
					</div>
				{/if}
			</section>

			<!-- ── Match Settings ───────────────────────────────────── -->
			<section class="rounded-xl border border-white/8 bg-gray-900 p-4 space-y-3">
				<h2 class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Match Settings</h2>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<label for="winning-score" class="block text-[11px] text-gray-400">Goals per round</label>
						<input
							id="winning-score"
							type="number"
							bind:value={winningScore}
							min="1"
							max="21"
							class="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25 focus:ring-1 focus:ring-white/15"
						/>
					</div>
					<div class="space-y-1.5">
						<label for="winning-rounds" class="block text-[11px] text-gray-400">Rounds to win</label>
						<input
							id="winning-rounds"
							type="number"
							bind:value={winningRounds}
							min="1"
							max="9"
							class="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25 focus:ring-1 focus:ring-white/15"
						/>
					</div>
				</div>
			</section>

			<!-- ── Arena Bumpers ────────────────────────────────────── -->
			<section class="rounded-xl border border-white/8 bg-gray-900 p-4 space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Arena Bumpers</h2>
						<p class="mt-0.5 text-[11px] text-gray-500">Obstacles that randomly spawn &amp; despawn mid-game</p>
					</div>
					<button
						type="button"
						onclick={() => (bumpersEnabled = !bumpersEnabled)}
						aria-label={bumpersEnabled ? 'Disable bumpers' : 'Enable bumpers'}
						aria-pressed={bumpersEnabled}
						class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition
							{bumpersEnabled ? 'border-amber-500/50 bg-amber-500/20' : 'border-white/10 bg-gray-800'}"
					>
						<span class="inline-block h-4 w-4 rounded-full transition-transform
							{bumpersEnabled ? 'translate-x-6 bg-amber-400' : 'translate-x-1 bg-gray-600'}">
						</span>
					</button>
				</div>

				{#if bumpersEnabled}
					<!-- Count picker -->
					<div class="space-y-1.5">
						<p class="text-[10px] text-gray-500">Max bumpers on the arena at once</p>
						<div class="flex gap-2">
							{#each ([2, 4, 6] as (2 | 4 | 6)[]) as n}
								<button
									type="button"
									onclick={() => (bumperMaxCount = n)}
									class="flex-1 rounded-lg border py-2 text-xs font-semibold tracking-widest uppercase transition
										{bumperMaxCount === n
											? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
											: 'border-white/5 text-gray-600 hover:border-white/12 hover:text-gray-300'}"
								>{n}</button>
							{/each}
						</div>
						<p class="text-[10px] text-gray-500 leading-relaxed">
							{#if bumperMaxCount === 2}
								Relaxed — a couple of obstacles, easy to track and avoid.
							{:else if bumperMaxCount === 4}
								Balanced — enough bumpers to mix up play without chaos.
							{:else}
								Chaotic — the arena fills with obstacles for unpredictable rallies.
							{/if}
						</p>
					</div>

					<!-- Phase legend -->
					<div class="grid grid-cols-3 gap-2 pt-1">
						<!-- Incoming -->
						<div class="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-2 text-center">
							<div class="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-amber-400/60 bg-amber-400/15 text-[9px] font-black text-amber-300">✕</div>
							<p class="text-[10px] font-semibold text-amber-300 leading-tight">Incoming</p>
							<p class="text-[9px] text-gray-500 leading-tight">Ghost — passes through</p>
						</div>
						<!-- Active -->
						<div class="rounded-lg border border-amber-500/30 bg-amber-500/8 px-2 py-2 text-center">
							<div class="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-400 bg-amber-900/70 text-[9px] font-black text-amber-400">✕</div>
							<p class="text-[10px] font-semibold text-amber-400 leading-tight">Active</p>
							<p class="text-[9px] text-gray-500 leading-tight">Solid — deflects &amp; speeds ball</p>
						</div>
						<!-- Expiring -->
						<div class="rounded-lg border border-red-500/30 bg-red-500/5 px-2 py-2 text-center">
							<div class="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-red-400 bg-red-900/60 text-[9px] font-black text-red-400">✕</div>
							<p class="text-[10px] font-semibold text-red-400 leading-tight">Expiring</p>
							<p class="text-[9px] text-gray-500 leading-tight">Flashes red before vanishing</p>
						</div>
					</div>
				{/if}
			</section>

			<!-- ── Power-ups ─────────────────────────────────────────── -->
			<section class="rounded-xl border border-white/8 bg-gray-900 p-4 space-y-3">
				<h2 class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Power-ups</h2>
				<p class="text-[11px] text-gray-500 leading-relaxed">
					Collected items apply to the last player who touched the ball.
				</p>
				<div class="grid grid-cols-2 gap-x-4 gap-y-2.5">
					{#each [
						{ icon: '↑', color: 'bg-amber-400',  name: 'Speed Boost',  desc: 'Ball faster for the hitter' },
						{ icon: '↓', color: 'bg-indigo-400', name: 'Slow Ball',     desc: 'Ball slower for the hitter' },
						{ icon: '+', color: 'bg-green-400',  name: 'Big Paddle',    desc: 'Hitter\'s paddle grows' },
						{ icon: '−', color: 'bg-red-400',    name: 'Tiny Paddle',   desc: 'Hitter\'s paddle shrinks' },
						{ icon: '⊕', color: 'bg-orange-400', name: 'Split Ball',    desc: 'Spawns a second scoring ball' },
						{ icon: '?', color: 'bg-pink-400',   name: 'Decoy Ball',    desc: 'Fake ball — doesn\'t score' },
					] as p}
						<div class="flex items-start gap-2">
							<span class="mt-0.5 shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-full {p.color} text-[9px] font-black text-black">{p.icon}</span>
							<div>
								<p class="text-[11px] font-semibold text-white leading-tight">{p.name}</p>
								<p class="text-[10px] text-gray-500">{p.desc}</p>
							</div>
						</div>
					{/each}
				</div>
				<p class="text-[10px] text-gray-600 border-t border-white/5 pt-2">
					Opposite effects cancel · Same effect extends duration
				</p>
			</section>

			<button
				type="submit"
				class="w-full rounded-xl bg-white py-3 text-sm font-bold tracking-widest text-gray-950 uppercase shadow-lg transition hover:bg-gray-100 active:scale-[0.98]"
			>
				Start Game
			</button>
		</form>
	</div>
</div>
