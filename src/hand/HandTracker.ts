import { HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
// Vite turns these into served asset URLs, in dev and in the production
// build alike — the WASM runtime always matches the installed npm version.
// We pin the SIMD build directly: every browser new enough to run MediaPipe
// hand tracking at playable speed supports WASM SIMD.
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'
import { CONFIG } from '../config'
import { lerp } from '../types'
import { palmCenter, readGestures, type GestureSnapshot } from './gestures'

/**
 * Wraps MediaPipe's HandLandmarker behind a tiny game-friendly API:
 *
 *   await tracker.init(videoElement)   // load model (GPU, CPU fallback)
 *   tracker.update(now)                // → TrackedHand[] for this frame
 *
 * Positions are normalised [0,1], mirrored to match the selfie view, and
 * exponentially smoothed. `pinchStarted` / `grabStarted` fire exactly once
 * per gesture, on the frame the hand closes.
 */

/** The fileset normally produced by FilesetResolver.forVisionTasks(). */
const VISION_FILESET: Parameters<typeof HandLandmarker.createFromOptions>[0] = {
  wasmLoaderPath,
  wasmBinaryPath,
}

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export interface TrackedHand extends GestureSnapshot {
  /** Stable slot index (0, 1, …) kept across frames by palm proximity. */
  id: number
  pinchStarted: boolean
  grabStarted: boolean
  /** Raw 21 landmarks in video space (unmirrored) — for the camera overlay. */
  landmarks: NormalizedLandmark[]
}

export class HandTracker {
  ready = false

  private landmarker: HandLandmarker | null = null
  private video: HTMLVideoElement | null = null
  private lastVideoTime = -1
  private previous = new Map<number, GestureSnapshot>()
  private hands: TrackedHand[] = []

  async init(video: HTMLVideoElement): Promise<void> {
    this.video = video
    const options = (delegate: 'GPU' | 'CPU') =>
      ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: CONFIG.hand.maxHands,
      }) as const

    try {
      this.landmarker = await HandLandmarker.createFromOptions(VISION_FILESET,options('GPU'))
    } catch {
      // Some devices (older Android WebViews, GPU-less VMs) reject the GPU
      // delegate — CPU inference is slower but still playable.
      this.landmarker = await HandLandmarker.createFromOptions(VISION_FILESET,options('CPU'))
    }
    this.ready = true
  }

  /** Run detection if the camera has a new frame; otherwise reuse the last result. */
  update(now: number): TrackedHand[] {
    const { landmarker, video } = this
    if (!landmarker || !video || video.readyState < 2) return []

    if (video.currentTime === this.lastVideoTime) {
      // Same camera frame — keep positions but never re-fire one-shot events.
      return this.hands.map((h) => ({ ...h, pinchStarted: false, grabStarted: false }))
    }
    this.lastVideoTime = video.currentTime

    const result = landmarker.detectForVideo(video, now)
    const alpha = CONFIG.hand.smoothing

    // Match each detection to last frame's hands by palm proximity (greedy
    // nearest first). MediaPipe's handedness label is NOT used for identity:
    // it can flip frame-to-frame on the same physical hand, which would
    // reset smoothing and gesture hysteresis — cursor jumps, re-fired pops.
    const palms = result.landmarks.map(palmCenter)
    const pairs: Array<{ det: number; slot: number; d: number }> = []
    for (let det = 0; det < palms.length; det++) {
      for (const [slot, prevSnap] of this.previous) {
        const d = Math.hypot(palms[det].x - prevSnap.palm.x, palms[det].y - prevSnap.palm.y)
        if (d <= CONFIG.hand.matchDistance) pairs.push({ det, slot, d })
      }
    }
    pairs.sort((a, b) => a.d - b.d)

    const slotOf = new Map<number, number>()
    const taken = new Set<number>()
    for (const { det, slot } of pairs) {
      if (slotOf.has(det) || taken.has(slot)) continue
      slotOf.set(det, slot)
      taken.add(slot)
    }

    const next = new Map<number, GestureSnapshot>()
    this.hands = result.landmarks.map((landmarks, i) => {
      // Unmatched detections are new hands: fresh state, lowest free slot
      // (so a lone hand that briefly drops out keeps its colour).
      const matched = slotOf.has(i)
      let slot = slotOf.get(i) ?? 0
      if (!matched) {
        while (taken.has(slot)) slot++
        taken.add(slot)
      }
      const prev = matched ? this.previous.get(slot) : undefined
      const raw = readGestures(landmarks, prev)

      const smooth = (cur: keyof Pick<GestureSnapshot, 'palm' | 'pinchPoint'>) =>
        prev
          ? {
              x: lerp(prev[cur].x, raw[cur].x, alpha),
              y: lerp(prev[cur].y, raw[cur].y, alpha),
            }
          : raw[cur]

      const snapshot: GestureSnapshot = {
        ...raw,
        palm: smooth('palm'),
        pinchPoint: smooth('pinchPoint'),
      }
      next.set(slot, snapshot)

      return {
        ...snapshot,
        id: slot,
        pinchStarted: snapshot.pinch && !prev?.pinch,
        grabStarted: snapshot.grab && !prev?.grab,
        landmarks,
      }
    })

    this.previous = next
    return this.hands
  }

  dispose(): void {
    this.landmarker?.close()
    this.landmarker = null
    this.ready = false
  }
}

/** Open the user-facing camera and resolve once frames are flowing. */
export async function openCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 960 },
      height: { ideal: 540 },
    },
  })
  video.srcObject = stream
  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => resolve()
  })
  await video.play()
  return stream
}
