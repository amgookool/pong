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
		PADDLE_MARGIN
	} from '$lib/game/constants';
	import { POWERUP_COLORS } from '$lib/game/powerups';
	import type { PowerUpType } from '$lib/game/types';

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
			SIZE_DOWN: '−'
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

	// ---------------------------------------------------------------------------
	// Main render function
	// ---------------------------------------------------------------------------

	function render(now: number) {
		const state = gameState;
		const [p0, p1] = state.players;
		const ball = state.ball;

		clearCanvas();
		drawMidLine();

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

		// Ball
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
	class="block rounded-xl max-w-full max-h-full"
	style="aspect-ratio: {CANVAS_WIDTH} / {CANVAS_HEIGHT}; box-shadow: 0 0 60px 0 #000a, 0 0 0 1px #ffffff0a;"
></canvas>
