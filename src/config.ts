/**
 * Every gameplay/tracking tunable lives here so the game can be balanced
 * without touching logic. Distances in the `hand` section are expressed as a
 * ratio of the detected hand size (wrist → middle knuckle), which makes the
 * gestures work at any distance from the camera.
 */
export const CONFIG = {
  hand: {
    maxHands: 2,
    /** Thumb–index distance ratio below which a pinch begins… */
    pinchOn: 0.42,
    /** …and above which it releases (hysteresis prevents flicker). */
    pinchOff: 0.6,
    /** Average fingertip–wrist ratio below which the hand counts as a fist. */
    grabOn: 1.3,
    grabOff: 1.55,
    /** Cursor smoothing: 0 = frozen, 1 = raw jittery input. */
    smoothing: 0.45,
    /**
     * Max palm travel (normalised screen units) between frames for a
     * detection to count as the same hand — identity is matched by
     * proximity, never by MediaPipe's flip-prone handedness label.
     */
    matchDistance: 0.3,
  },

  pop: {
    /** Hit radii in px around the gesture point (generous — kids play this). */
    pinchRadius: 70,
    grabRadius: 130,
    tapRadius: 55,
    /** Bombs wipe out balloons around them (no points — chaos only). */
    blastRadius: 170,
  },

  game: {
    lives: 3,
    comboWindowMs: 1700,
    comboStartsAt: 2,
    countdownSeconds: 3,
    shakeMs: 450,
    /** Delay before the game-over screen so the last explosion plays out. */
    gameOverDelayMs: 900,
    noHandsHintAfterMs: 2500,
  },

  spawn: {
    firstIntervalMs: 1050,
    minIntervalMs: 430,
    /** Seconds of play over which spawning ramps from first → min interval. */
    rampSeconds: 95,
    goldenChance: 0.07,
    /** Bomb chance ramps from 0 up to this over `bombRampSeconds`. */
    bombChanceMax: 0.16,
    bombRampSeconds: 40,
  },

  balloons: {
    /** [radius min, radius max, rise speed min/max px·s⁻¹, points] per tier. */
    tiers: [
      { rMin: 46, rMax: 56, vMin: 55, vMax: 80, points: 10 },
      { rMin: 36, rMax: 44, vMin: 80, vMax: 115, points: 15 },
      { rMin: 26, rMax: 32, vMin: 120, vMax: 165, points: 25 },
    ],
    /** Candy palette: [body, shadow] pairs. */
    colors: [
      ['#ff5d73', '#d63a59'],
      ['#ffc53d', '#f49d1d'],
      ['#2ee6a8', '#13bd85'],
      ['#9b5de5', '#7a3fc9'],
      ['#41b8ff', '#1f8fe0'],
      ['#ff8ac2', '#ee5fa7'],
    ],
    golden: { radius: 36, speed: 130, points: 50 },
    bomb: { radius: 28, vMin: 45, vMax: 65 },
  },
} as const
