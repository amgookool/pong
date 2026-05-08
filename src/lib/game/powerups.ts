/**
 * Power-up system module.
 *
 * Responsible for spawning, collision detection, applying effects,
 * and expiring effects.  All functions are pure and side-effect free.
 */

import {
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	POWERUP_RADIUS,
	POWERUP_LIFETIME_MS,
	POWERUP_SPEED_FACTOR,
	POWERUP_SIZE_FACTOR,
	POWERUP_EFFECT_DURATION_MS,
	PADDLE_HEIGHT,
	BALL_BASE_SPEED,
	BALL_RADIUS
} from './constants';
import type { Ball, Player, PowerUp, PowerUpType, ActiveEffect } from './types';

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------

const POWER_UP_TYPES: PowerUpType[] = ['SPEED_UP', 'SPEED_DOWN', 'SIZE_UP', 'SIZE_DOWN', 'SPLIT_BALL', 'FAKE_BALL'];

/**
 * Create a new randomly positioned power-up.
 * It is placed away from the walls and paddles in the middle 60 % of the canvas.
 */
export function spawnPowerUp(now: number): PowerUp {
	const margin = POWERUP_RADIUS * 3;
	const xMin = CANVAS_WIDTH * 0.2 + margin;
	const xMax = CANVAS_WIDTH * 0.8 - margin;
	const yMin = margin;
	const yMax = CANVAS_HEIGHT - margin;

	const x = xMin + Math.random() * (xMax - xMin);
	const y = yMin + Math.random() * (yMax - yMin);
	const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];

	return {
		id: `pu-${now}-${Math.random().toString(36).slice(2)}`,
		x,
		y,
		type,
		radius: POWERUP_RADIUS,
		active: true,
		spawnedAt: now
	};
}

// ---------------------------------------------------------------------------
// Expiry
// ---------------------------------------------------------------------------

/**
 * Filter out power-ups that have exceeded their on-screen lifetime.
 */
export function expirePowerUps(powerUps: PowerUp[], now: number): PowerUp[] {
	return powerUps.filter((p) => p.active && now - p.spawnedAt < POWERUP_LIFETIME_MS);
}

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------

/**
 * Check whether the ball overlaps any active power-up.
 * Returns the first colliding power-up or null.
 */
export function detectPowerUpCollision(ball: Ball, powerUps: PowerUp[]): PowerUp | null {
	for (const pu of powerUps) {
		if (!pu.active) continue;
		const dx = ball.x - pu.x;
		const dy = ball.y - pu.y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist <= ball.radius + pu.radius) {
			return pu;
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// Extra ball spawning (SPLIT_BALL / FAKE_BALL)
// ---------------------------------------------------------------------------

/**
 * Spawn an extra ball at the current ball's position.
 * Used by SPLIT_BALL (real, counts for scoring) and FAKE_BALL (decoy, does not score).
 * The extra ball launches in a random direction that avoids being purely horizontal.
 */
export function spawnExtraBall(from: Ball, isDecoy: boolean, now: number): Ball {
	// Random angle in 40–140° range avoids near-instant scoring from spawn position
	const angle = (Math.PI * 40) / 180 + Math.random() * (Math.PI * 100) / 180;
	const flipX = Math.random() < 0.5 ? 1 : -1;
	const flipY = Math.random() < 0.5 ? 1 : -1;
	return {
		id: `extra-${now}-${Math.random().toString(36).slice(2)}`,
		isDecoy,
		x: from.x,
		y: from.y,
		vx: Math.cos(angle) * BALL_BASE_SPEED * flipX,
		vy: Math.sin(angle) * BALL_BASE_SPEED * flipY,
		radius: BALL_RADIUS,
		isServing: false,
		servingPlayerId: from.servingPlayerId
	};
}

// ---------------------------------------------------------------------------
// Applying / expiring effects
// ---------------------------------------------------------------------------

/** Returns the opposing type that cancels this one out */
function getOppositeType(type: PowerUpType): PowerUpType {
	switch (type) {
		case 'SPEED_UP':   return 'SPEED_DOWN';
		case 'SPEED_DOWN': return 'SPEED_UP';
		case 'SIZE_UP':    return 'SIZE_DOWN';
		case 'SIZE_DOWN':  return 'SIZE_UP';
		// Ball-spawning types have no player-stat opposite
		case 'SPLIT_BALL': return 'FAKE_BALL';
		case 'FAKE_BALL':  return 'SPLIT_BALL';
	}
}

/** Recompute a player's stat values from the current effect stack */
function computePlayerStats(effects: ActiveEffect[]): { speedMultiplier: number; paddleHeight: number } {
	let speedMultiplier = 1;
	let paddleHeight = PADDLE_HEIGHT;
	for (const e of effects) {
		switch (e.type) {
			case 'SPEED_UP':   speedMultiplier = POWERUP_SPEED_FACTOR; break;
			case 'SPEED_DOWN': speedMultiplier = 1 / POWERUP_SPEED_FACTOR; break;
			case 'SIZE_UP':    paddleHeight = PADDLE_HEIGHT * POWERUP_SIZE_FACTOR; break;
			case 'SIZE_DOWN':  paddleHeight = PADDLE_HEIGHT / POWERUP_SIZE_FACTOR; break;
			case 'SPLIT_BALL':
			case 'FAKE_BALL':  break; // ball-spawning types don’t affect player stats
		}
	}
	return { speedMultiplier, paddleHeight };
}

/**
 * Apply the effect of a collected power-up to a player, with smart stacking:
 *
 * - **Opposite type** (e.g. SIZE_UP hits a player with SIZE_DOWN): both effects
 *   cancel and the paddle returns to normal.
 * - **Same type** (e.g. SIZE_UP hits a player already under SIZE_UP): the
 *   existing effect's duration is extended by POWERUP_EFFECT_DURATION_MS.
 * - **Different category** (e.g. SIZE_UP + SPEED_UP): both coexist independently.
 *
 * At most one SIZE effect and one SPEED effect can be active at the same time.
 */
export function applyEffect(player: Player, type: PowerUpType, now: number): Player {
	const opposite = getOppositeType(type);
	let effects = player.activeEffects;

	if (effects.some((e) => e.type === opposite)) {
		// Cancel: strip the opposing effect, new effect does not get applied
		effects = effects.filter((e) => e.type !== opposite);
	} else if (effects.some((e) => e.type === type)) {
		// Extend: push the expiry of the matching effect forward
		effects = effects.map((e) =>
			e.type === type ? { ...e, expiresAt: e.expiresAt + POWERUP_EFFECT_DURATION_MS } : e
		);
	} else {
		// New: add fresh effect to the stack
		effects = [...effects, { type, expiresAt: now + POWERUP_EFFECT_DURATION_MS }];
	}

	const { speedMultiplier, paddleHeight } = computePlayerStats(effects);
	return { ...player, activeEffects: effects, speedMultiplier, paddleHeight };
}

/**
 * Remove any effects whose expiry timestamp has passed, recomputing stats.
 */
export function expirePlayerEffects(player: Player, now: number): Player {
	const remaining = player.activeEffects.filter((e) => now < e.expiresAt);
	if (remaining.length === player.activeEffects.length) return player;
	const { speedMultiplier, paddleHeight } = computePlayerStats(remaining);
	return { ...player, activeEffects: remaining, speedMultiplier, paddleHeight };
}

// ---------------------------------------------------------------------------
// Descriptive helpers (for UI rendering)
// ---------------------------------------------------------------------------

/** Human-readable label for a power-up type */
export const POWERUP_LABELS: Record<PowerUpType, string> = {
	SPEED_UP: 'Speed Boost',
	SPEED_DOWN: 'Slow Ball',
	SIZE_UP: 'Big Paddle',
	SIZE_DOWN: 'Tiny Paddle',
	SPLIT_BALL: 'Split Ball',
	FAKE_BALL: 'Decoy Ball'
};

/** Colour associated with each power-up type (Tailwind-compatible hex) */
export const POWERUP_COLORS: Record<PowerUpType, string> = {
	SPEED_UP: '#f59e0b',   // amber
	SPEED_DOWN: '#6366f1', // indigo
	SIZE_UP: '#22c55e',    // green
	SIZE_DOWN: '#ef4444',  // red
	SPLIT_BALL: '#f97316', // orange
	FAKE_BALL: '#ec4899'   // pink
};
