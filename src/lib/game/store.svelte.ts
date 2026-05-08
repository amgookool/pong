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
	POWERUP_SPAWN_INTERVAL_MS
} from './constants';
import type { GameState, Player, Ball, AiDifficulty } from './types';
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
	expirePlayerEffect
} from './powerups';

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
		activeEffect: null,
		side: id === 0 ? 'left' : 'right'
	};
}

function makeInitialBall(servingPlayerId: 0 | 1): Ball {
	return {
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
	lastFrameTime: 0
});

// ---------------------------------------------------------------------------
// Key state tracker (held keys)
// ---------------------------------------------------------------------------

const keysHeld = new Set<string>();

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
	resetAiState();
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
function handleGoal(scoredById: 0 | 1): void {
	const loser: 0 | 1 = scoredById === 0 ? 1 : 0;
	gameState.players[scoredById].score += 1;

	if (gameState.players[scoredById].score >= gameState.winningScore) {
		// Round won
		gameState.players[scoredById].wins += 1;

		if (gameState.players[scoredById].wins >= gameState.winningRounds) {
			// Match over
			gameState.phase = 'gameOver';
			gameState.matchWinnerId = scoredById;
			return;
		}

		// Show the round-over screen; scores/effects are reset when the player continues
		gameState.phase = 'roundOver';
	}

	// Reset ball to the loser's paddle
	resetBallToPlayer(loser);
}

function resetBallToPlayer(playerId: 0 | 1): void {
	const player = gameState.players[playerId];
	const pos = getServingBallState(player);
	gameState.ball = {
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
	gameState.players[0].activeEffect = null;
	gameState.players[1].activeEffect = null;

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
		// AI controls player 2 – only move when ball is in play
		if (!gameState.ball.isServing) {
			gameState.players[1].paddleY = tickAi(
				gameState.players[1],
				gameState.ball,
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
	gameState.players[0] = expirePlayerEffect(gameState.players[0], now);
	gameState.players[1] = expirePlayerEffect(gameState.players[1], now);

	// --- ball physics (skip if still serving) ---
	if (gameState.ball.isServing) {
		// Pause power-up effect timers while waiting for the serve by pushing
		// expiresAt forward by the elapsed frame time.
		for (const player of gameState.players) {
			if (player.activeEffect) {
				player.activeEffect.expiresAt += delta;
			}
		}
		// Keep ball glued to serving paddle
		const pos = getServingBallState(gameState.players[gameState.ball.servingPlayerId]);
		gameState.ball.x = pos.x;
		gameState.ball.y = pos.y;
		return;
	}

	// Move ball
	let ball = moveBall(gameState.ball);

	// Paddle collisions
	const { ball: afterPaddle, hitterId } = resolvePaddleCollisions(ball, gameState.players);
	ball = afterPaddle;
	if (hitterId !== null) {
		gameState.lastHitterId = hitterId;
	}

	// Power-up collisions
	const hitPowerUp = detectPowerUpCollision(ball, gameState.powerUps);
	if (hitPowerUp && gameState.lastHitterId !== null) {
		const targetId = gameState.lastHitterId;
		gameState.players[targetId] = applyEffect(gameState.players[targetId], hitPowerUp.type, now);
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

	// Check for goal
	const goal = checkGoal(ball);
	if (goal) {
		handleGoal(goal.scoredById);
	} else {
		gameState.ball = ball;
	}
}
