/**
 * Game store – the single source of truth for all game state.
 *
 * Uses Svelte 5 runes ($state / $derived) so that any component that reads
 * from this store automatically re-renders on change.
 *
 * The loop() function drives the game forward each animation frame.
 */

import {
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	PADDLE_WIDTH,
	PADDLE_HEIGHT,
	PADDLE_MARGIN,
	BALL_RADIUS,
	KEYS,
	POWERUP_SPAWN_INTERVAL_MS,
	GOAL_FLASH_DURATION_MS
} from './constants';
import type { GameState, Player, Ball, AiDifficulty, GoalFlash } from './types';
import { tickAi, resetAiState } from './ai';
import {
	moveBall,
	resolvePaddleCollisions,
	checkGoal,
	movePaddle,
	PADDLE_SPEED,
	getServingBallState,
	getServingVelocity
} from './physics';
import {
	spawnPowerUp,
	expirePowerUps,
	detectPowerUpCollision,
	applyEffect,
	spawnExtraBall,
	expirePlayerEffects
} from './powerups';
import { SvelteSet } from 'svelte/reactivity';
import { initAudio, playSound } from './audio';

// ---------------------------------------------------------------------------
// Initial state factories
// ---------------------------------------------------------------------------

function makePlayer(id: 0 | 1, name: string): Player {
	return {
		id,
		name,
		score: 0,
		wins: 0,
		paddleY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
		paddleHeight: PADDLE_HEIGHT,
		speedMultiplier: 1,
		activeEffects: [],
		side: id === 0 ? 'left' : 'right'
	};
}

function makeInitialBall(servingPlayerId: 0 | 1): Ball {
	return {
		id: 'primary',
		isDecoy: false,
		x: CANVAS_WIDTH / 2,
		y: CANVAS_HEIGHT / 2,
		vx: 0,
		vy: 0,
		radius: BALL_RADIUS,
		isServing: true,
		servingPlayerId
	};
}

function randomServingPlayer(): 0 | 1 {
	return Math.random() < 0.5 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Reactive state (Svelte 5 runes – top-level $state is allowed in .svelte.ts)
// ---------------------------------------------------------------------------

export const gameState = $state<GameState>({
	players: [makePlayer(0, 'Player 1'), makePlayer(1, 'Player 2')],
	ball: makeInitialBall(randomServingPlayer()),
	powerUps: [],
	winningScore: 5,
	winningRounds: 3,
	currentRound: 1,
	phase: 'setup',
	isSinglePlayer: false,
	aiDifficulty: 'medium',
	matchWinnerId: null,
	lastHitterId: null,
	lastFrameTime: 0,
	goalFlash: null,
	extraBalls: []
});

// ---------------------------------------------------------------------------
// Key state tracker (held keys)
// ---------------------------------------------------------------------------

// const keysHeld = new Set<string>();
const keysHeld = new SvelteSet<string>();

export function onKeyDown(e: KeyboardEvent): void {
	keysHeld.add(e.code);
}

export function onKeyUp(e: KeyboardEvent): void {
	keysHeld.delete(e.code);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Initialise/reset and start a new match with the given config */
export function startGame(
	p1Name: string,
	p2Name: string,
	winningScore: number,
	winningRounds: number,
	isSinglePlayer = false,
	aiDifficulty: AiDifficulty = 'medium'
): void {
	const servingId = randomServingPlayer();
	const players: [Player, Player] = [makePlayer(0, p1Name), makePlayer(1, p2Name)];
	const ball = makeInitialBall(servingId);

	// Position ball on serving paddle immediately
	const serving = players[servingId];
	const pos = getServingBallState(serving);
	ball.x = pos.x;
	ball.y = pos.y;

	gameState.players = players;
	gameState.ball = ball;
	gameState.powerUps = [];
	gameState.winningScore = winningScore;
	gameState.winningRounds = winningRounds;
	gameState.currentRound = 1;
	gameState.phase = 'playing';
	gameState.isSinglePlayer = isSinglePlayer;
	gameState.aiDifficulty = aiDifficulty;
	gameState.matchWinnerId = null;
	gameState.lastHitterId = null;
	gameState.lastFrameTime = performance.now();
	gameState.goalFlash = null;
	gameState.extraBalls = [];
	resetAiState();
	initAudio(); // fire-and-forget – must be called from a user-gesture stack
}

/** Called when spacebar is pressed to launch the ball */
function launchBall(): void {
	if (!gameState.ball.isServing) return;
	const servingId = gameState.ball.servingPlayerId;
	const player = gameState.players[servingId];
	const vel = getServingVelocity(servingId, player.speedMultiplier);
	gameState.ball = {
		...gameState.ball,
		...vel,
		isServing: false
	};
}

/** Handle a goal: update scores, check for round/match end, reset for next serve */
function handleGoal(scoredById: 0 | 1, now: number): void {
	const loser: 0 | 1 = scoredById === 0 ? 1 : 0;
	gameState.players[scoredById].score += 1;

	// Trigger goal flash on the side the ball crossed.
	// Use the rAF `now` timestamp (not performance.now()) so render() sees elapsed >= 0.
	gameState.goalFlash = {
		side: scoredById === 0 ? 'right' : 'left',
		startedAt: now
	};

	// Clear all extra balls – gameplay returns to single-ball on any goal
	gameState.extraBalls = [];

	const roundWon = gameState.players[scoredById].score >= gameState.winningScore;
	if (roundWon) {
		// Round won
		gameState.players[scoredById].wins += 1;

		if (gameState.players[scoredById].wins >= gameState.winningRounds) {
			// Match over
			playSound('win');
			gameState.phase = 'gameOver';
			gameState.matchWinnerId = scoredById;
			return;
		}

		// Show the round-over screen; scores/effects are reset when the player continues
		playSound('win');
		gameState.phase = 'roundOver';
	} else {
		playSound('goal');
	}

	// Reset ball to the loser's paddle
	resetBallToPlayer(loser);
}

function resetBallToPlayer(playerId: 0 | 1): void {
	const player = gameState.players[playerId];
	const pos = getServingBallState(player);
	gameState.ball = {
		id: 'primary',
		isDecoy: false,
		x: pos.x,
		y: pos.y,
		vx: 0,
		vy: 0,
		radius: BALL_RADIUS,
		isServing: true,
		servingPlayerId: playerId
	};
	gameState.powerUps = [];
}

/** Resume play after a roundOver screen */
export function continueToNextRound(): void {
	if (gameState.phase !== 'roundOver') return;

	// Reset scores, effects, and advance round counter now that the overlay has been seen
	gameState.currentRound += 1;
	gameState.players[0].score = 0;
	gameState.players[1].score = 0;
	gameState.players[0].paddleHeight = PADDLE_HEIGHT;
	gameState.players[1].paddleHeight = PADDLE_HEIGHT;
	gameState.players[0].speedMultiplier = 1;
	gameState.players[1].speedMultiplier = 1;
	gameState.players[0].activeEffects = [];
	gameState.players[1].activeEffects = [];
	gameState.extraBalls = [];

	const servingId = gameState.ball.servingPlayerId;
	const player = gameState.players[servingId];
	const pos = getServingBallState(player);
	gameState.ball.x = pos.x;
	gameState.ball.y = pos.y;
	gameState.phase = 'playing';
	gameState.lastFrameTime = performance.now();
	resetAiState();
}

/** Reset everything back to setup screen */
export function resetToSetup(): void {
	const servingId = randomServingPlayer();
	gameState.players = [makePlayer(0, 'Player 1'), makePlayer(1, 'Player 2')];
	gameState.ball = makeInitialBall(servingId);
	gameState.powerUps = [];
	gameState.phase = 'setup';
	gameState.matchWinnerId = null;
	gameState.lastHitterId = null;
	gameState.currentRound = 1;
	gameState.goalFlash = null;
	gameState.extraBalls = [];
	resetAiState();
}

// ---------------------------------------------------------------------------
// Main game loop (called every animation frame)
// ---------------------------------------------------------------------------

let lastPowerUpSpawn = 0;

export function loop(now: number): void {
	if (gameState.phase !== 'playing') return;

	const delta = now - gameState.lastFrameTime;
	gameState.lastFrameTime = now;

	// Clear goal flash once its animation duration has elapsed
	if (gameState.goalFlash && now - gameState.goalFlash.startedAt >= GOAL_FLASH_DURATION_MS) {
		gameState.goalFlash = null;
	}

	// --- handle input ---
	if (keysHeld.has(KEYS.LAUNCH)) launchBall();

	const p0 = gameState.players[0];
	const p1 = gameState.players[1];

	if (keysHeld.has(KEYS.P1_UP)) {
		gameState.players[0].paddleY = movePaddle(p0.paddleY, -PADDLE_SPEED, p0.paddleHeight);
	}
	if (keysHeld.has(KEYS.P1_DOWN)) {
		gameState.players[0].paddleY = movePaddle(p0.paddleY, PADDLE_SPEED, p0.paddleHeight);
	}
	if (gameState.isSinglePlayer) {
		// AI controls player 2 – track the most threatening ball (furthest right)
		if (!gameState.ball.isServing) {
			let trackBall = gameState.ball;
			for (const eb of gameState.extraBalls) {
				if (eb.x > trackBall.x) trackBall = eb;
			}
			gameState.players[1].paddleY = tickAi(
				gameState.players[1],
				trackBall,
				gameState.aiDifficulty
			);
		}
	} else {
		if (keysHeld.has(KEYS.P2_UP)) {
			gameState.players[1].paddleY = movePaddle(p1.paddleY, -PADDLE_SPEED, p1.paddleHeight);
		}
		if (keysHeld.has(KEYS.P2_DOWN)) {
			gameState.players[1].paddleY = movePaddle(p1.paddleY, PADDLE_SPEED, p1.paddleHeight);
		}
	}

	// --- expire player effects ---
	gameState.players[0] = expirePlayerEffects(gameState.players[0], now);
	gameState.players[1] = expirePlayerEffects(gameState.players[1], now);

	// --- ball physics (skip if still serving) ---
	if (gameState.ball.isServing) {
		// Pause power-up effect timers while waiting for the serve by pushing
		// expiresAt forward by the elapsed frame time.
		for (const player of gameState.players) {
			for (const effect of player.activeEffects) {
				effect.expiresAt += delta;
			}
		}
		// Keep ball glued to serving paddle
		const pos = getServingBallState(gameState.players[gameState.ball.servingPlayerId]);
		gameState.ball.x = pos.x;
		gameState.ball.y = pos.y;
		return;
	}

	// Move ball
	const prevVy = gameState.ball.vy;
	let ball = moveBall(gameState.ball);

	// Wall bounce sound (vy sign flipped = top/bottom wall hit)
	if (Math.sign(prevVy) !== Math.sign(ball.vy)) playSound('wall');

	// Paddle collisions
	const { ball: afterPaddle, hitterId } = resolvePaddleCollisions(ball, gameState.players);
	ball = afterPaddle;
	if (hitterId !== null) {
		gameState.lastHitterId = hitterId;
		playSound('paddle');
	}

	// Power-up collisions (primary ball only)
	const hitPowerUp = detectPowerUpCollision(ball, gameState.powerUps);
	if (hitPowerUp) {
		playSound('powerup');
		if (hitPowerUp.type === 'SPLIT_BALL') {
			// Spawn a real extra ball – counts for scoring
			gameState.extraBalls = [...gameState.extraBalls, spawnExtraBall(ball, false, now)];
		} else if (hitPowerUp.type === 'FAKE_BALL') {
			// Spawn a decoy ball – bounces normally but does not score
			gameState.extraBalls = [...gameState.extraBalls, spawnExtraBall(ball, true, now)];
		} else if (gameState.lastHitterId !== null) {
			gameState.players[gameState.lastHitterId] = applyEffect(
				gameState.players[gameState.lastHitterId],
				hitPowerUp.type,
				now
			);
		}
		// Remove the collected power-up
		gameState.powerUps = gameState.powerUps.filter((p) => p.id !== hitPowerUp.id);
	}

	// Expire old power-ups
	gameState.powerUps = expirePowerUps(gameState.powerUps, now);

	// Spawn new power-up
	if (now - lastPowerUpSpawn > POWERUP_SPAWN_INTERVAL_MS && gameState.powerUps.length < 2) {
		gameState.powerUps = [...gameState.powerUps, spawnPowerUp(now)];
		lastPowerUpSpawn = now;
	}

	// Check for goal (primary ball)
	const goal = checkGoal(ball);
	if (goal) {
		handleGoal(goal.scoredById, now);
	} else {
		gameState.ball = ball;
	}

	// --- extra ball physics ---
	// Run only while the primary ball is in play and no goal was scored this frame.
	if (gameState.phase === 'playing' && gameState.extraBalls.length > 0) {
		const aliveExtras: Ball[] = [];
		let extraGoalScored = false;

		for (const eb of gameState.extraBalls) {
			if (extraGoalScored) break;

			let b = moveBall(eb);
			const { ball: afterPaddle, hitterId } = resolvePaddleCollisions(b, gameState.players);
			b = afterPaddle;
			if (hitterId !== null) gameState.lastHitterId = hitterId;

			const extraGoal = checkGoal(b);
			if (extraGoal) {
				if (!b.isDecoy) {
					// Real extra ball scored – treat exactly like a primary ball goal
					handleGoal(extraGoal.scoredById, now);
					extraGoalScored = true;
					// handleGoal already cleared extraBalls
				}
				// Decoy exited arena – silently discard (no score)
			} else {
				aliveExtras.push(b);
			}
		}

		if (!extraGoalScored) {
			gameState.extraBalls = aliveExtras;
		}
	}
}
