/** Canvas dimensions */
export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 600;

/** Paddle dimensions */
export const PADDLE_WIDTH = 14;
export const PADDLE_HEIGHT = 90;
/** Distance from the canvas edge to the paddle */
export const PADDLE_MARGIN = 24;

/** Ball */
export const BALL_RADIUS = 9;
export const BALL_BASE_SPEED = 5;
export const BALL_MAX_SPEED = 14;
/** Speed increase on each paddle hit */
export const BALL_SPEED_INCREMENT = 0.25;

/** Power-up / power-down */
export const POWERUP_RADIUS = 14;
/** Milliseconds a power-up stays visible before disappearing */
export const POWERUP_LIFETIME_MS = 7000;
/** Milliseconds between new power-up spawns */
export const POWERUP_SPAWN_INTERVAL_MS = 5000;
/** Factor applied to ball speed for SPEED_UP / SPEED_DOWN */
export const POWERUP_SPEED_FACTOR = 1.4;
/** Factor applied to paddle height for SIZE_UP / SIZE_DOWN */
export const POWERUP_SIZE_FACTOR = 1.5;
/** Duration (ms) a power-up effect lasts on the player */
export const POWERUP_EFFECT_DURATION_MS = 5000;

/** Target frame time for the physics loop (60 fps) */
export const FRAME_MS = 1000 / 60;

/** Duration (ms) of the goal flash animation */
export const GOAL_FLASH_DURATION_MS = 700;

/** Keyboard bindings */
export const KEYS = {
	/** Player 1 – left paddle */
	P1_UP: 'KeyW',
	P1_DOWN: 'KeyS',
	/** Player 2 – right paddle */
	P2_UP: 'ArrowUp',
	P2_DOWN: 'ArrowDown',
	/** Launch the ball */
	LAUNCH: 'Space'
} as const;
