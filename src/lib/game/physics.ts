/**
 * Physics engine module.
 *
 * All functions are pure: they receive state slices and return updated copies.
 * No direct mutation of the game store happens here, making this layer easy to
 * test and extend independently.
 */

import {
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	PADDLE_WIDTH,
	PADDLE_MARGIN,
	BALL_RADIUS,
	BALL_BASE_SPEED,
	BALL_MAX_SPEED,
	BALL_SPEED_INCREMENT
} from './constants';
import type { Ball, Player, Bumper } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/** Return the magnitude of a 2-D vector */
export function magnitude(vx: number, vy: number): number {
	return Math.sqrt(vx * vx + vy * vy);
}

/** Scale a velocity vector so its magnitude equals targetSpeed */
export function normalizeSpeed(vx: number, vy: number, targetSpeed: number): { vx: number; vy: number } {
	const mag = magnitude(vx, vy);
	if (mag === 0) return { vx: targetSpeed, vy: 0 };
	const scale = targetSpeed / mag;
	return { vx: vx * scale, vy: vy * scale };
}

// ---------------------------------------------------------------------------
// Paddle movement
// ---------------------------------------------------------------------------

/**
 * Move a paddle up or down by `delta` pixels, clamping to canvas bounds.
 *
 * @param paddleY   - Current Y position of the paddle top
 * @param delta     - Pixels to move (negative = up, positive = down)
 * @param paddleHeight - Current height of the paddle
 * @returns New clamped paddleY
 */
export function movePaddle(paddleY: number, delta: number, paddleHeight: number): number {
	return clamp(paddleY + delta, 0, CANVAS_HEIGHT - paddleHeight);
}

/** Pixels per frame the paddle moves when a key is held */
export const PADDLE_SPEED = 6;

// ---------------------------------------------------------------------------
// Serving position
// ---------------------------------------------------------------------------

/**
 * Return the ball position/velocity for a serve sitting on the given player's
 * paddle.  The ball is centred vertically on the paddle and offset just
 * outside its face.
 */
export function getServingBallState(
	player: Player
): Pick<Ball, 'x' | 'y' | 'vx' | 'vy'> {
	const paddleCenterY = player.paddleY + player.paddleHeight / 2;
	if (player.side === 'left') {
		return {
			x: PADDLE_MARGIN + PADDLE_WIDTH + BALL_RADIUS + 2,
			y: paddleCenterY,
			vx: 0,
			vy: 0
		};
	} else {
		return {
			x: CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH - BALL_RADIUS - 2,
			y: paddleCenterY,
			vx: 0,
			vy: 0
		};
	}
}

/**
 * Generate the initial velocity vector for a serve.
 * The ball launches towards the opponent side with a slight random vertical angle.
 */
export function getServingVelocity(servingPlayerId: 0 | 1, speedMultiplier = 1): { vx: number; vy: number } {
	// Towards opponent: player 0 (left) serves right, player 1 (right) serves left
	const dirX = servingPlayerId === 0 ? 1 : -1;
	// Slight random vertical angle between -30 and +30 degrees
	const angleRad = ((Math.random() * 60 - 30) * Math.PI) / 180;
	const speed = BALL_BASE_SPEED * speedMultiplier;
	return {
		vx: dirX * Math.cos(angleRad) * speed,
		vy: Math.sin(angleRad) * speed
	};
}

// ---------------------------------------------------------------------------
// Ball movement
// ---------------------------------------------------------------------------

/**
 * Advance the ball by one frame: update position and bounce off top/bottom walls.
 * Does NOT handle paddle collisions or scoring (see below).
 *
 * @returns Updated ball
 */
export function moveBall(ball: Ball): Ball {
	let { x, y, vx, vy, radius } = ball;

	x += vx;
	y += vy;

	// Top / bottom wall bounce
	if (y - radius < 0) {
		y = radius;
		vy = Math.abs(vy);
	} else if (y + radius > CANVAS_HEIGHT) {
		y = CANVAS_HEIGHT - radius;
		vy = -Math.abs(vy);
	}

	return { ...ball, x, y, vx, vy };
}

// ---------------------------------------------------------------------------
// Paddle collision
// ---------------------------------------------------------------------------

/**
 * Paddle X boundaries (left edge of each paddle face).
 * Returns { left: { x1, x2, y }, right: { x1, x2 } }
 */
function getPaddleBounds(player: Player): { x1: number; x2: number; y1: number; y2: number } {
	if (player.side === 'left') {
		return {
			x1: PADDLE_MARGIN,
			x2: PADDLE_MARGIN + PADDLE_WIDTH,
			y1: player.paddleY,
			y2: player.paddleY + player.paddleHeight
		};
	} else {
		return {
			x1: CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH,
			x2: CANVAS_WIDTH - PADDLE_MARGIN,
			y1: player.paddleY,
			y2: player.paddleY + player.paddleHeight
		};
	}
}

/**
 * Resolve ball/paddle collisions for both players.
 *
 * When a collision is detected the ball deflects off the paddle face and its
 * speed is increased slightly (up to the cap).  The deflection angle depends
 * on where the ball hits the paddle relative to its centre – hitting the edge
 * produces a sharper angle.
 *
 * @returns Updated ball and the id of the player who was last hit (or null)
 */
export function resolvePaddleCollisions(
	ball: Ball,
	players: [Player, Player]
): { ball: Ball; hitterId: 0 | 1 | null } {
	let updatedBall = { ...ball };
	let hitterId: 0 | 1 | null = null;

	for (const player of players) {
		const b = getPaddleBounds(player);
		const { x, y, radius } = updatedBall;

		// Broad-phase: check if ball overlaps the paddle bounding box
		if (
			x + radius >= b.x1 &&
			x - radius <= b.x2 &&
			y + radius >= b.y1 &&
			y - radius <= b.y2
		) {
			// --- deflect ---
			const paddleCenterY = (b.y1 + b.y2) / 2;
			const relativeHit = (y - paddleCenterY) / (player.paddleHeight / 2); // -1 to +1
			const maxBounceAngle = (Math.PI / 180) * 70; // 70 degrees max
			const bounceAngle = relativeHit * maxBounceAngle;

			const currentSpeed = clamp(
				magnitude(updatedBall.vx, updatedBall.vy) * player.speedMultiplier + BALL_SPEED_INCREMENT,
				BALL_BASE_SPEED,
				BALL_MAX_SPEED
			);

			// Ball goes away from the paddle face
			const dirX = player.side === 'left' ? 1 : -1;
			updatedBall = {
				...updatedBall,
				vx: dirX * Math.cos(bounceAngle) * currentSpeed,
				vy: Math.sin(bounceAngle) * currentSpeed,
				// Push ball out of the paddle so it does not double-collide
				x:
					player.side === 'left'
						? b.x2 + radius + 1
						: b.x1 - radius - 1
			};

			hitterId = player.id;
			break; // only one paddle can be hit per frame
		}
	}

	return { ball: updatedBall, hitterId };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type ScoreEvent = { scoredById: 0 | 1 } | null;

/**
 * Check whether the ball has crossed either goal line (left or right edge).
 *
 * @returns ScoreEvent indicating which player scored, or null if no goal
 */
export function checkGoal(ball: Ball): ScoreEvent {
	if (ball.x - ball.radius < 0) {
		// Ball exited through left wall – player 1 (right side) scores
		return { scoredById: 1 };
	}
	if (ball.x + ball.radius > CANVAS_WIDTH) {
		// Ball exited through right wall – player 0 (left side) scores
		return { scoredById: 0 };
	}
	return null;
}

// ---------------------------------------------------------------------------
// Bumper collision
// ---------------------------------------------------------------------------

/**
 * Resolve ball collisions with all bumpers in one pass.
 *
 * Only bumpers that have fully materialised (past their `activatesAt` timestamp)
 * are solid.  Incoming ghost bumpers are skipped so the ball can pass through
 * them during the warning phase.
 *
 * On contact the ball reflects along the collision normal and receives a 10 %
 * speed nudge (capped at BALL_MAX_SPEED).
 *
 * @returns Updated ball and whether any bumper was hit this frame
 */
export function resolveBumperCollisions(
	ball: Ball,
	bumpers: Bumper[],
	now: number
): { ball: Ball; hit: boolean } {
	let updated = { ...ball };
	let hit = false;

	for (const bumper of bumpers) {
		// Incoming bumpers are not yet solid
		if (now < bumper.activatesAt) continue;

		const dx = updated.x - bumper.x;
		const dy = updated.y - bumper.y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		const minDist = updated.radius + bumper.radius;

		if (dist < minDist && dist > 0) {
			// Collision normal (from bumper centre toward ball centre)
			const nx = dx / dist;
			const ny = dy / dist;

			// Reflect velocity: v' = v - 2(v·n)n
			const dot = updated.vx * nx + updated.vy * ny;
			const rvx = updated.vx - 2 * dot * nx;
			const rvy = updated.vy - 2 * dot * ny;

			// Apply 10 % speed boost, capped at BALL_MAX_SPEED
			const currentSpeed = magnitude(rvx, rvy);
			const boosted = normalizeSpeed(rvx, rvy, Math.min(currentSpeed * 1.1, BALL_MAX_SPEED));

			updated = {
				...updated,
				vx: boosted.vx,
				vy: boosted.vy,
				// Push ball outside the bumper to prevent tunnelling
				x: bumper.x + nx * (minDist + 1),
				y: bumper.y + ny * (minDist + 1)
			};

			hit = true;
		}
	}

	return { ball: updated, hit };
}
