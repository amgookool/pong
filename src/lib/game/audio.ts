/**
 * Audio module – loads the .wav assets and exposes a simple play() API.
 *
 * Uses the Web Audio API so sounds can be triggered and overlapped freely.
 * The AudioContext is created lazily on the first call to initAudio(), which
 * must be invoked from a user-gesture handler (e.g. the Start button) to
 * satisfy browser autoplay policies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SoundKey = 'paddle' | 'wall' | 'goal' | 'powerup' | 'win';

const SOUND_URLS: Record<SoundKey, string> = {
	paddle:  '/sounds/pop-sound.wav',
	wall:    '/sounds/pop-high-sound.wav',
	goal:    '/sounds/whoosh.wav',
	powerup: '/sounds/chime.wav',
	win:     '/sounds/fanfare.wav'
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
const buffers = new Map<SoundKey, AudioBuffer>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Resume the AudioContext if it is suspended. Safe to call at any time. */
function ensureRunning(): void {
	if (ctx && ctx.state === 'suspended') {
		ctx.resume().catch(() => {});
	}
}

// Browsers (especially Chrome/Safari) may suspend an AudioContext even when
// created inside a user-gesture handler.  Re-attaching on subsequent
// interactions guarantees sound works once the user first touches a key.
if (typeof document !== 'undefined') {
	for (const type of ['click', 'keydown', 'touchstart', 'pointerdown'] as const) {
		document.addEventListener(type, ensureRunning, { passive: true, capture: true });
	}
}

function getCtx(): AudioContext | null {
	if (typeof AudioContext === 'undefined') return null;
	if (!ctx) ctx = new AudioContext();
	return ctx;
}

async function loadBuffer(key: SoundKey, url: string, audioCtx: AudioContext): Promise<void> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	const arrayBuffer = await response.arrayBuffer();
	const decoded = await audioCtx.decodeAudioData(arrayBuffer);
	buffers.set(key, decoded);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Preload all sounds into AudioBuffers.
 * Call this once from a user-gesture handler (e.g. the Start Game button) so
 * the AudioContext is created while a user gesture is on the call stack.
 */
export async function initAudio(): Promise<void> {
	const audioCtx = getCtx();
	if (!audioCtx) return;

	// Resume in case the context was suspended (Chrome's autoplay policy)
	if (audioCtx.state === 'suspended') {
		await audioCtx.resume();
	}

	const results = await Promise.allSettled(
		(Object.entries(SOUND_URLS) as [SoundKey, string][]).map(([key, url]) =>
			loadBuffer(key, url, audioCtx)
		)
	);

	for (const [i, result] of results.entries()) {
		if (result.status === 'rejected') {
			const key = Object.keys(SOUND_URLS)[i];
			console.error(`[audio] Failed to load "${key}":`, result.reason);
		}
	}
}

/**
 * Play a preloaded sound. Safe to call before initAudio() completes –
 * it will silently no-op if the buffer isn't ready yet.
 *
 * @param key    - Which sound to play
 * @param volume - Optional gain (0–1, default 1)
 */
export function playSound(key: SoundKey, volume = 1): void {
	if (!ctx) return;
	ensureRunning();
	const buffer = buffers.get(key);
	if (!buffer) return;

	const source = ctx.createBufferSource();
	source.buffer = buffer;

	if (volume !== 1) {
		const gain = ctx.createGain();
		gain.gain.value = volume;
		source.connect(gain);
		gain.connect(ctx.destination);
	} else {
		source.connect(ctx.destination);
	}

	source.start();
}

