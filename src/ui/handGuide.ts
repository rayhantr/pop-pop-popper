import type { TrackedHand } from '../hand/HandTracker'
import type { Vec2 } from '../types'

/**
 * Live hand-tracking guide drawn over the camera preview (PiP): a glowing
 * skeleton of the 21 landmarks, so players can see exactly what the tracker
 * sees and learn how to hold their hand. Colours match the in-game cursors,
 * and the skeleton lights up while a pinch or grab is active.
 *
 * The canvas carries the same CSS `scaleX(-1)` selfie mirror as the video,
 * so landmarks are drawn in raw (unmirrored) video coordinates here.
 */

/** Landmark pairs forming the hand skeleton (MediaPipe hand topology). */
const BONES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm edge
]
const FINGERTIPS = [4, 8, 12, 16, 20]
const THUMB_TIP = 4
const INDEX_TIP = 8

/** Same per-slot colours as the in-game cursors. */
const HAND_COLORS = ['#ff5d73', '#9b5de5'] as const

export class HandGuide {
  private readonly ctx: CanvasRenderingContext2D

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly video: HTMLVideoElement,
  ) {
    this.ctx = canvas.getContext('2d')!
  }

  /** Redraw the overlay for this frame. Call with the latest tracked hands. */
  draw(hands: TrackedHand[]): void {
    const { canvas, video, ctx } = this
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    if (cw === 0 || ch === 0 || video.videoWidth === 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pw = Math.round(cw * dpr)
    const ph = Math.round(ch * dpr)
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw
      canvas.height = ph
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cw, ch)

    // The video uses object-fit: cover — reproduce that crop so the skeleton
    // lands exactly on the hand the player sees.
    const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight)
    const dw = video.videoWidth * scale
    const dh = video.videoHeight * scale
    const ox = (cw - dw) / 2
    const oy = (ch - dh) / 2
    const toPx = (l: { x: number; y: number }): Vec2 => ({
      x: ox + l.x * dw,
      y: oy + l.y * dh,
    })

    for (const hand of hands) {
      const color = HAND_COLORS[hand.id % HAND_COLORS.length]
      const active = hand.pinch || hand.grab
      const points = hand.landmarks.map(toPx)
      const lw = Math.max(1.5, cw * 0.012)

      // Bones — white normally, hand-coloured glow while a gesture is held.
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = active ? color : 'rgba(255, 255, 255, 0.85)'
      ctx.lineWidth = active ? lw * 1.6 : lw
      ctx.shadowColor = active ? color : 'rgba(45, 42, 74, 0.6)'
      ctx.shadowBlur = active ? 8 : 3
      ctx.beginPath()
      for (const [a, b] of BONES) {
        ctx.moveTo(points[a].x, points[a].y)
        ctx.lineTo(points[b].x, points[b].y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      // Joints, with bigger dots on the fingertips.
      ctx.fillStyle = color
      for (let i = 0; i < points.length; i++) {
        ctx.beginPath()
        ctx.arc(points[i].x, points[i].y, FINGERTIPS.includes(i) ? lw * 1.5 : lw * 0.9, 0, Math.PI * 2)
        ctx.fill()
      }

      // Pinch hint: link thumb and index tips so kids see the gesture forming.
      if (hand.pinch) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = lw
        ctx.beginPath()
        ctx.moveTo(points[THUMB_TIP].x, points[THUMB_TIP].y)
        ctx.lineTo(points[INDEX_TIP].x, points[INDEX_TIP].y)
        ctx.stroke()
      }
    }
  }
}
