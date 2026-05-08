/**
 * AI opponent module.
 *
 * Computes the desired paddle movement for the CPU-controlled player each frame.
 * The AI tracks the ball with intentional imperfection based on difficulty,
 * creating a believable and beatable opponent at lower settings.
 *
 * All functions are pure: they take current state slices and return a new paddleY.
 */

import { CANVAS_HEIGHT } from './constants';
import { movePaddle, PADDLE_SPEED } from './physics';
import type { Ball, Player, AiDifficulty } from './types';

// ---------------------------------------------------------------------------
// Per-difficulty tuning parameters
// ---------------------------------------------------------------------------

type AiProfile = {
	/** Fraction of max paddle speed the AI uses (0–1) */
	speedFactor: number;
	/**
	 * How far the ball must be from the paddle centre before the AI reacts.
	 * Larger dead-zone = more sluggish / human-like.
	 */
	deadZone: number;
	/**
	 * Probability (0–1) that the AI reacts on any given frame.
	 * Values below 1 introduce deliberate missed frames.
	 */
	reactionRate: number;
	/**
	 * Pixels of random offset added to the AI's target each time it recalculates.
	 * Simulates imprecise aim.
	 */
	errorRange: number;
};

const PROFILES: Record<AiDifficulty, AiProfile> = {
	easy: {
		speedFactor: 0.55,
		deadZone: 40,
		reactionRate: 0.6,
		errorRange: 60
	},
	medium: {
		speedFactor: 0.78,
		deadZone: 18,
		reactionRate: 0.82,
		errorRange: 28
	},
	hard: {
		speedFactor: 1.0,
		deadZone: 6,
		reactionRate: 0.97,
		errorRange: 8
	}
};

// ---------------------------------------------------------------------------
// Per-session error offset (reset each time the ball changes direction)
// ---------------------------------------------------------------------------

/** Cached random aim error applied until the ball's Y velocity flips */
let _aimError = 0;
let _lastBallVy = 0;

function getAimError(ball: Ball, errorRange: number): number {
	// Refresh error when ball's vertical direction changes
	if (Math.sign(ball.vy) !== Math.sign(_lastBallVy)) {
		_aimError = (Math.random() * 2 - 1) * errorRange;
		_lastBallVy = ball.vy;
	}
	return _aimError;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute and return an updated paddleY for the AI player.
 *
 * @param aiPlayer   - The AI-controlled player (player 1, right side)
 * @param ball       - Current ball state
 * @param difficulty - Selected difficulty level
 * @returns New paddleY (clamped to canvas bounds)
 */
export function tickAi(aiPlayer: Player, ball: Ball, difficulty: AiDifficulty): number {
	const profile = PROFILES[difficulty];

	// Probabilistic reaction – skip some frames on lower difficulties
	if (Math.random() > profile.reactionRate) {
		return aiPlayer.paddleY;
	}

	const aimError = getAimError(ball, profile.errorRange);
	const targetY = ball.y + aimError;
	const paddleCenterY = aiPlayer.paddleY + aiPlayer.paddleHeight / 2;
	const diff = targetY - paddleCenterY;

	// Dead-zone: don't micro-adjust within this band
	if (Math.abs(diff) < profile.deadZone) {
		return aiPlayer.paddleY;
	}

	const direction = diff > 0 ? 1 : -1;
	const step = PADDLE_SPEED * profile.speedFactor;

	return movePaddle(aiPlayer.paddleY, direction * step, aiPlayer.paddleHeight);
}

/** Reset internal AI state (call when a new game/round starts) */
export function resetAiState(): void {
	_aimError = 0;
	_lastBallVy = 0;
}
