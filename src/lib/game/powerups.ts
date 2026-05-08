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
	PADDLE_HEIGHT
} from './constants';
import type { Ball, Player, PowerUp, PowerUpType } from './types';

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------

const POWER_UP_TYPES: PowerUpType[] = ['SPEED_UP', 'SPEED_DOWN', 'SIZE_UP', 'SIZE_DOWN'];

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
// Applying / expiring effects
// ---------------------------------------------------------------------------

/**
 * Apply the effect of a collected power-up to the appropriate player.
 * The LAST player who touched the ball receives the effect.
 *
 * @param player  - The player to modify (should be the last hitter)
 * @param type    - The power-up type collected
 * @param now     - Current timestamp (ms)
 * @returns Updated player with the new effect applied
 */
export function applyEffect(player: Player, type: PowerUpType, now: number): Player {
	const expiresAt = now + POWERUP_EFFECT_DURATION_MS;
	let speedMultiplier = player.speedMultiplier;
	let paddleHeight = player.paddleHeight;

	switch (type) {
		case 'SPEED_UP':
			speedMultiplier = POWERUP_SPEED_FACTOR;
			break;
		case 'SPEED_DOWN':
			speedMultiplier = 1 / POWERUP_SPEED_FACTOR;
			break;
		case 'SIZE_UP':
			paddleHeight = PADDLE_HEIGHT * POWERUP_SIZE_FACTOR;
			break;
		case 'SIZE_DOWN':
			paddleHeight = PADDLE_HEIGHT / POWERUP_SIZE_FACTOR;
			break;
	}

	return {
		...player,
		speedMultiplier,
		paddleHeight,
		activeEffect: { type, expiresAt }
	};
}

/**
 * Remove expired effects from a player, resetting stats to baseline.
 */
export function expirePlayerEffect(player: Player, now: number): Player {
	if (!player.activeEffect || now < player.activeEffect.expiresAt) {
		return player;
	}
	return {
		...player,
		speedMultiplier: 1,
		paddleHeight: PADDLE_HEIGHT,
		activeEffect: null
	};
}

// ---------------------------------------------------------------------------
// Descriptive helpers (for UI rendering)
// ---------------------------------------------------------------------------

/** Human-readable label for a power-up type */
export const POWERUP_LABELS: Record<PowerUpType, string> = {
	SPEED_UP: 'Speed Boost',
	SPEED_DOWN: 'Slow Ball',
	SIZE_UP: 'Big Paddle',
	SIZE_DOWN: 'Tiny Paddle'
};

/** Colour associated with each power-up type (Tailwind-compatible hex) */
export const POWERUP_COLORS: Record<PowerUpType, string> = {
	SPEED_UP: '#f59e0b',   // amber
	SPEED_DOWN: '#6366f1', // indigo
	SIZE_UP: '#22c55e',    // green
	SIZE_DOWN: '#ef4444'   // red
};
