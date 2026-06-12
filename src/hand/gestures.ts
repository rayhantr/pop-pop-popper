import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { CONFIG } from '../config'
import type { Vec2 } from '../types'

/**
 * Gesture recognition from raw MediaPipe hand landmarks.
 *
 * All distances are normalised by the hand's own size (wrist → middle
 * knuckle), so gestures behave identically whether the hand is close to the
 * camera or far away. Pinch and grab use on/off hysteresis thresholds so a
 * hand hovering right at the limit doesn't rapid-fire pops.
 */

// MediaPipe hand landmark indices (see HandLandmarker docs).
const WRIST = 0
const THUMB_TIP = 4
const INDEX_TIP = 8
const MIDDLE_TIP = 12
const RING_TIP = 16
const PINKY_TIP = 20
const MIDDLE_MCP = 9
const PALM_POINTS = [0, 5, 9, 13, 17]

export interface GestureSnapshot {
  /**
   * Centre of the palm — the on-screen cursor and grab-smash anchor.
   * Normalised [0,1], mirrored. Averaging wrist + finger bases is far more
   * stable than any fingertip, which moves while the hand opens and closes.
   */
  palm: Vec2
  /** Midpoint between thumb and index tips — anchor point for pinches. */
  pinchPoint: Vec2
  pinch: boolean
  grab: boolean
}

const dist = (a: NormalizedLandmark, b: NormalizedLandmark): number =>
  Math.hypot(a.x - b.x, a.y - b.y)

/** Mirror x so coordinates match the mirrored (selfie) view the player sees. */
const mirrored = (p: { x: number; y: number }): Vec2 => ({ x: 1 - p.x, y: p.y })

const midpoint = (a: NormalizedLandmark, b: NormalizedLandmark): Vec2 =>
  mirrored({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** Centre of the palm (wrist + finger bases), mirrored. Used both for the
 *  cursor and to match hands across frames by proximity. */
export function palmCenter(lm: NormalizedLandmark[]): Vec2 {
  const sum = PALM_POINTS.reduce(
    (acc, i) => ({ x: acc.x + lm[i].x, y: acc.y + lm[i].y }),
    { x: 0, y: 0 },
  )
  return mirrored({ x: sum.x / PALM_POINTS.length, y: sum.y / PALM_POINTS.length })
}

export function readGestures(
  lm: NormalizedLandmark[],
  prev: GestureSnapshot | undefined,
): GestureSnapshot {
  const { hand } = CONFIG
  const scale = Math.max(dist(lm[WRIST], lm[MIDDLE_MCP]), 1e-4)
  const reach = (tip: number) => dist(lm[tip], lm[WRIST]) / scale

  const pinchRatio = dist(lm[THUMB_TIP], lm[INDEX_TIP]) / scale
  const fistRatio =
    (reach(INDEX_TIP) + reach(MIDDLE_TIP) + reach(RING_TIP) + reach(PINKY_TIP)) / 4

  const pinchClosed = prev?.pinch ? pinchRatio < hand.pinchOff : pinchRatio < hand.pinchOn
  const fistClosed = prev?.grab ? fistRatio < hand.grabOff : fistRatio < hand.grabOn

  // Grab wins over pinch: a closing fist passes through a pinch-like shape,
  // so pinch is suppressed while grabbing. A held grab only releases once
  // the hand is FULLY open — fist AND pinch — which stops tracking jitter
  // from ending it early or leaking a phantom pinch on release.
  const grab = prev?.grab ? fistClosed || pinchClosed : fistClosed
  const pinch = !grab && pinchClosed

  return {
    palm: palmCenter(lm),
    pinchPoint: midpoint(lm[THUMB_TIP], lm[INDEX_TIP]),
    pinch,
    grab,
  }
}
