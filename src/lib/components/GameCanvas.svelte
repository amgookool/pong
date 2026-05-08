<script lang="ts">
	/**
	 * GameCanvas – the canvas element that renders every game object each frame.
	 *
	 * Rendering is intentionally separated from game logic (which lives in
	 * store.svelte.ts / physics.ts).  This component only reads from gameState
	 * and draws; it never mutates state.
	 */
	import { onMount } from 'svelte';
	import { gameState, loop, onKeyDown, onKeyUp } from '$lib/game/store.svelte';
	import {
		CANVAS_WIDTH,
		CANVAS_HEIGHT,
		PADDLE_WIDTH,
		PADDLE_MARGIN,
		GOAL_FLASH_DURATION_MS,
		BUMPER_INCOMING_MS,
		BUMPER_LIFETIME_MS,
		BUMPER_EXPIRING_MS
	} from '$lib/game/constants';
	import { POWERUP_COLORS } from '$lib/game/powerups';
	import type { PowerUpType, Bumper } from '$lib/game/types';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let rafId: number;

	// ---------------------------------------------------------------------------
	// Colour palette
	// ---------------------------------------------------------------------------
	const COLOR = {
		bg: '#030712',            // gray-950
		midLine: '#ffffff14',     // faint white
		p1Paddle: '#22d3ee',      // cyan-400
		p2Paddle: '#a78bfa',      // violet-400
		ball: '#ffffff',
		ballGlow: '#ffffff60',
		serving: '#ffffff30'
	} as const;

	// ---------------------------------------------------------------------------
	// Draw helpers
	// ---------------------------------------------------------------------------

	function clearCanvas() {
		ctx.fillStyle = COLOR.bg;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	}

	/** Draw the dashed centre line */
	function drawMidLine() {
		ctx.save();
		ctx.strokeStyle = COLOR.midLine;
		ctx.lineWidth = 2;
		ctx.setLineDash([12, 10]);
		ctx.beginPath();
		ctx.moveTo(CANVAS_WIDTH / 2, 0);
		ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
		ctx.stroke();
		ctx.restore();
	}

	/** Draw a paddle with a subtle glow matching the player colour */
	function drawPaddle(x: number, y: number, height: number, color: string) {
		ctx.save();

		// Glow
		ctx.shadowColor = color;
		ctx.shadowBlur = 18;

		// Rounded rect
		const radius = 5;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.roundRect(x, y, PADDLE_WIDTH, height, radius);
		ctx.fill();

		ctx.restore();
	}

	/** Draw the ball with a glow */
	function drawBall(x: number, y: number, radius: number, isServing: boolean) {
		ctx.save();

		if (isServing) {
			// Pulsing serving indicator
			ctx.shadowColor = COLOR.serving;
			ctx.shadowBlur = 20;
			ctx.fillStyle = COLOR.serving;
		} else {
			ctx.shadowColor = COLOR.ballGlow;
			ctx.shadowBlur = 24;
			ctx.fillStyle = COLOR.ball;
		}

		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();
	}

	/**
	 * Draw a bumper with three distinct phases:
	 *   incoming  – animated ghost with filling arc and "Xs" countdown label
	 *   active    – solid amber with depleting arc ring
	 *   expiring  – solid red, accelerating flash, "Xs" countdown label
	 */
	function drawBumper(bumper: Bumper, now: number) {
		const { x, y, radius, spawnedAt, activatesAt, expiresAt } = bumper;
		const isIncoming = now < activatesAt;
		const isExpiring = !isIncoming && now >= expiresAt - BUMPER_EXPIRING_MS;

		ctx.save();

		if (isIncoming) {
			const incomingDuration = activatesAt - spawnedAt;
			const progress = Math.min((now - spawnedAt) / incomingDuration, 1);
			const secsLeft  = Math.ceil((activatesAt - now) / 1000);
			// Pulsing ghost: oscillates between 40 % and 70 % opacity
			const ghostAlpha = 0.40 + 0.30 * (0.5 + 0.5 * Math.sin(now / 180));

			// Ghost fill
			ctx.globalAlpha = ghostAlpha;
			ctx.fillStyle = '#f59e0b';
			ctx.shadowColor = '#fbbf24';
			ctx.shadowBlur = 22;
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.fill();

			// Icon (semi-transparent)
			ctx.shadowBlur = 0;
			ctx.fillStyle = '#000000aa';
			ctx.font = `bold ${radius - 1}px system-ui`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('✕', x, y);

			// Dashed outer ring
			ctx.globalAlpha = 0.55;
			ctx.strokeStyle = '#fbbf24';
			ctx.lineWidth = 1.5;
			ctx.setLineDash([5, 4]);
			ctx.shadowBlur = 0;
			ctx.beginPath();
			ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);

			// Countdown fill arc (fills clockwise from top)
			ctx.globalAlpha = 0.95;
			ctx.strokeStyle = '#fbbf24';
			ctx.lineWidth = 4;
			ctx.lineCap = 'round';
			ctx.shadowColor = '#fbbf24';
			ctx.shadowBlur = 12;
			ctx.beginPath();
			ctx.arc(x, y, radius + 13, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
			ctx.stroke();

			// "Xs" label above the bumper
			ctx.globalAlpha = 0.9;
			ctx.shadowBlur = 0;
			ctx.fillStyle = '#fbbf24';
			ctx.font = 'bold 11px system-ui';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'bottom';
			ctx.fillText(`${secsLeft}s`, x, y - radius - 18);
		} else {
			const lifespan  = expiresAt - activatesAt;
			const remaining = Math.max(0, (expiresAt - now) / lifespan);

			// Flash alpha when expiring — frequency ramps 4 Hz → 12 Hz
			let alpha = 1;
			if (isExpiring) {
				const fracLeft = Math.max(0, (expiresAt - now) / BUMPER_EXPIRING_MS);
				const flashHz  = 4 + (1 - fracLeft) * 8;
				alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.001 * flashHz * Math.PI * 2));
			}

			const glowColor = isExpiring ? '#ef4444' : '#f59e0b';
			const coreColor = isExpiring ? '#7f1d1d' : '#78350f';
			const ringColor = isExpiring ? '#ef4444' : '#f59e0b';
			const iconColor = isExpiring ? '#fca5a5' : '#fbbf24';
			const glowRgba  = isExpiring ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)';

			ctx.globalAlpha = alpha;

			// Outer pulse glow ring
			const pulse = 1 + 0.07 * Math.sin((now / 1200) * Math.PI * 2);
			ctx.strokeStyle = glowRgba;
			ctx.lineWidth = 2;
			ctx.shadowColor = glowColor;
			ctx.shadowBlur = 24;
			ctx.beginPath();
			ctx.arc(x, y, radius * pulse + 8, 0, Math.PI * 2);
			ctx.stroke();

			// Core fill
			ctx.fillStyle = coreColor;
			ctx.shadowBlur = 12;
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.fill();

			// Inner ring
			ctx.strokeStyle = ringColor;
			ctx.lineWidth = 2;
			ctx.shadowBlur = 0;
			ctx.beginPath();
			ctx.arc(x, y, radius - 3, 0, Math.PI * 2);
			ctx.stroke();

			// Icon
			ctx.fillStyle = iconColor;
			ctx.font = `bold ${radius - 1}px system-ui`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('✕', x, y);

			// Lifespan depletion arc (starts full, drains clockwise to empty)
			if (remaining > 0.01) {
				ctx.globalAlpha = alpha * 0.95;
				ctx.strokeStyle = ringColor;
				ctx.lineWidth = 4;
				ctx.lineCap = 'round';
				ctx.shadowColor = ringColor;
				ctx.shadowBlur = 8;
				ctx.beginPath();
				ctx.arc(x, y, radius + 13, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
				ctx.stroke();
			}

			// Countdown label when expiring
			if (isExpiring) {
				const secsLeft = Math.ceil((expiresAt - now) / 1000);
				ctx.globalAlpha = alpha;
				ctx.shadowBlur = 0;
				ctx.fillStyle = '#fca5a5';
				ctx.font = 'bold 11px system-ui';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillText(`${secsLeft}s`, x, y - radius - 18);
			}
		}

		ctx.restore();
	}

	/** Draw a power-up with a pulsing outer ring */
	function drawPowerUp(
		x: number,
		y: number,
		radius: number,
		type: PowerUpType,
		now: number,
		spawnedAt: number
	) {
		const color = POWERUP_COLORS[type];
		const age = now - spawnedAt;
		// Pulsing scale: 1 → 1.2 → 1 over 800ms
		const pulse = 1 + 0.15 * Math.sin((age / 800) * Math.PI * 2);

		ctx.save();

		// Outer ring pulse
		ctx.strokeStyle = color + '80';
		ctx.lineWidth = 2;
		ctx.shadowColor = color;
		ctx.shadowBlur = 16;
		ctx.beginPath();
		ctx.arc(x, y, radius * pulse + 4, 0, Math.PI * 2);
		ctx.stroke();

		// Core
		ctx.fillStyle = color;
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();

		// Icon letter
		ctx.shadowBlur = 0;
		ctx.fillStyle = '#000000cc';
		ctx.font = `bold ${radius}px system-ui`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const icons: Record<PowerUpType, string> = {
			SPEED_UP: '↑',
			SPEED_DOWN: '↓',
			SIZE_UP: '+',
			SIZE_DOWN: '−',
			SPLIT_BALL: '⊕',
			FAKE_BALL: '?'
		};
		ctx.fillText(icons[type], x, y);

		ctx.restore();
	}

	/** Draw spacebar launch hint when ball is on a serving paddle */
	function drawServeHint(x: number, y: number) {
		ctx.save();
		ctx.fillStyle = '#ffffff50';
		ctx.font = '11px system-ui';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';
		ctx.fillText('SPACE to serve', x, y - 16);
		ctx.restore();
	}

	/**
	 * Draw a goal-scored flash on the side where the ball crossed the boundary.
	 * The effect is a gradient wash + expanding rings that fade over GOAL_FLASH_DURATION_MS.
	 */
	function drawGoalFlash(side: 'left' | 'right', startedAt: number, now: number) {
		// Clamp elapsed to >= 0 (startedAt is the rAF timestamp so this should always be >= 0,
		// but guard against any sub-millisecond skew)
		const elapsed = Math.max(0, now - startedAt);
		const t = Math.min(elapsed / GOAL_FLASH_DURATION_MS, 1); // 0 → 1
		// ease-out curve: fast bright burst that decays quickly
		const alpha = (1 - t) * (1 - t);

		const isLeft = side === 'left';
		const edgeX = isLeft ? 0 : CANVAS_WIDTH;

		// Colour matches the scoring player (left wall = P2 scored, right wall = P1 scored)
		const [r, g, b] = isLeft
			? [167, 139, 250] // violet-400 (P2)
			: [34, 211, 238]; // cyan-400 (P1)

		ctx.save();

		// --- bright edge flash at t=0, fades to nothing ---
		const washWidth = CANVAS_WIDTH * 0.55;
		const gradX0 = isLeft ? 0 : CANVAS_WIDTH;
		const gradX1 = isLeft ? washWidth : CANVAS_WIDTH - washWidth;
		const grad = ctx.createLinearGradient(gradX0, 0, gradX1, 0);
		grad.addColorStop(0, `rgba(${r},${g},${b},${(alpha * 0.75).toFixed(3)})`);
		grad.addColorStop(0.3, `rgba(${r},${g},${b},${(alpha * 0.4).toFixed(3)})`);
		grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// --- expanding rings ripple outward from the goal wall midpoint ---
		const ringCount = 3;
		const maxRadius = CANVAS_WIDTH * 0.8;
		for (let i = 0; i < ringCount; i++) {
			const ringPhase = (t + i / ringCount) % 1; // 0 → 1 staggered per ring
			const ringAlpha = (1 - ringPhase) * alpha * 0.9;
			const radius = Math.max(0, ringPhase * maxRadius);

			ctx.beginPath();
			ctx.arc(edgeX, CANVAS_HEIGHT / 2, radius, 0, Math.PI * 2);
			ctx.strokeStyle = `rgba(${r},${g},${b},${ringAlpha.toFixed(3)})`;
			ctx.lineWidth = 3;
			ctx.stroke();
		}

		ctx.restore();
	}

	// ---------------------------------------------------------------------------
	// Main render function
	// ---------------------------------------------------------------------------

	function render(now: number) {
		const state = gameState;
		const [p0, p1] = state.players;
		const ball = state.ball;

		clearCanvas();
		drawMidLine();

		// Goal flash (drawn early so paddles/ball render on top)
		if (state.goalFlash) {
			drawGoalFlash(state.goalFlash.side, state.goalFlash.startedAt, now);
		}

		// Bumpers (drawn before paddles so they appear behind foreground objects)
		for (const bumper of state.bumpers) {
			drawBumper(bumper, now);
		}

		// Paddles
		drawPaddle(PADDLE_MARGIN, p0.paddleY, p0.paddleHeight, COLOR.p1Paddle);
		drawPaddle(
			CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH,
			p1.paddleY,
			p1.paddleHeight,
			COLOR.p2Paddle
		);

		// Power-ups
		for (const pu of state.powerUps) {
			drawPowerUp(pu.x, pu.y, pu.radius, pu.type, now, pu.spawnedAt);
		}

		// Extra balls (split balls and decoys – rendered identically to primary)
		for (const eb of state.extraBalls) {
			drawBall(eb.x, eb.y, eb.radius, false);
		}

		// Primary ball
		drawBall(ball.x, ball.y, ball.radius, ball.isServing);

		// Serve hint
		if (ball.isServing) {
			drawServeHint(ball.x, ball.y);
		}
	}

	// ---------------------------------------------------------------------------
	// Animation loop
	// ---------------------------------------------------------------------------

	function tick(now: number) {
		loop(now);
		render(now);
		rafId = requestAnimationFrame(tick);
	}

	onMount(() => {
		ctx = canvas.getContext('2d')!;
		rafId = requestAnimationFrame(tick);

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
		};
	});
</script>

<canvas
	bind:this={canvas}
	width={CANVAS_WIDTH}
	height={CANVAS_HEIGHT}
	class="block rounded-xl h-full w-auto max-w-full"
	style="aspect-ratio: {CANVAS_WIDTH} / {CANVAS_HEIGHT}; box-shadow: 0 0 60px 0 #000a, 0 0 0 1px #ffffff0a;"
></canvas>
