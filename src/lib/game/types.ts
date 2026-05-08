/** Side of the court for a player */
export type PlayerSide = 'left' | 'right';

/** A player in the game */
export type Player = {
	id: 0 | 1;
	name: string;
	/** Goals scored in the current round */
	score: number;
	/** Rounds won */
	wins: number;
	/** Y position of the top of the paddle (canvas coordinates) */
	paddleY: number;
	/** Current paddle height (may be modified by power-ups) */
	paddleHeight: number;
	/** Current ball-speed multiplier (may be modified by power-ups) */
	speedMultiplier: number;
	/** Active power-up effects (stacked; at most one per category: SIZE and SPEED) */
	activeEffects: ActiveEffect[];
	side: PlayerSide;
};

/** A transient effect applied to a player from a power-up */
export type ActiveEffect = {
	type: PowerUpType;
	/** Timestamp (ms) when the effect expires */
	expiresAt: number;
};

/** The game ball */
export type Ball = {
	/** Unique identifier – primary ball uses 'primary' */
	id: string;
	/** True for decoy balls spawned by FAKE_BALL; they don't score */
	isDecoy: boolean;
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	/** Whether the ball is attached to the serving player's paddle */
	isServing: boolean;
	/** ID of the player currently serving (0 or 1) */
	servingPlayerId: 0 | 1;
};

export type PowerUpType = 'SPEED_UP' | 'SPEED_DOWN' | 'SIZE_UP' | 'SIZE_DOWN' | 'SPLIT_BALL' | 'FAKE_BALL';

/** A collectible item on the canvas */
export type PowerUp = {
	id: string;
	x: number;
	y: number;
	type: PowerUpType;
	radius: number;
	active: boolean;
	/** Timestamp (ms) when this power-up was spawned */
	spawnedAt: number;
};

/** A dynamic obstacle in the arena that deflects balls */
export type Bumper = {
	id: string;
	x: number;
	y: number;
	radius: number;
	/** Timestamp when the bumper was created (incoming / ghost phase starts) */
	spawnedAt: number;
	/** Timestamp when the bumper becomes solid and can deflect balls */
	activatesAt: number;
	/** Timestamp when the bumper disappears */
	expiresAt: number;
};

export type GamePhase =
	| 'setup'      // player name entry + config
	| 'playing'    // round in progress
	| 'roundOver'  // a round just ended, showing results
	| 'gameOver';  // one player has won enough rounds

export type AiDifficulty = 'easy' | 'medium' | 'hard';

/** Visual flash shown on the side of the canvas where a goal was scored */
export type GoalFlash = {
	/** Which wall the ball crossed */
	side: PlayerSide;
	/** performance.now() timestamp when the flash started */
	startedAt: number;
};

/** Full game state – treated as a plain reactive object */
export type GameState = {
	players: [Player, Player];
	ball: Ball;
	powerUps: PowerUp[];
	/** Goals required to win a single round */
	winningScore: number;
	/** Rounds required to win the match */
	winningRounds: number;
	currentRound: number;
	phase: GamePhase;
	/** Whether player 2 is controlled by the AI */
	isSinglePlayer: boolean;
	aiDifficulty: AiDifficulty;
	/** ID (0 or 1) of the player who won the match, or null */
	matchWinnerId: 0 | 1 | null;
	/** ID (0 or 1) of the last player to touch the ball */
	lastHitterId: 0 | 1 | null;
	/** Timestamp of the last physics update */
	lastFrameTime: number;
	/** Active goal flash animation, or null */
	goalFlash: GoalFlash | null;
	/** Additional balls in play (split balls and decoys) */
	extraBalls: Ball[];
	/** Whether bumper obstacles are enabled for this match */
	bumpersEnabled: boolean;
	/** Maximum number of bumpers alive at once (incoming + active) */
	bumperMaxCount: 2 | 4 | 6;
	/** Bumper obstacles currently in the arena */
	bumpers: Bumper[];
};
