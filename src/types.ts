export interface Vec2 {
  x: number
  y: number
}

/** What triggered a pop — used to size the burst, score popups and sounds. */
export type PopCause = 'pinch' | 'grab' | 'tap' | 'blast'

export type GameState = 'menu' | 'countdown' | 'playing' | 'paused' | 'over'

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v))

export const dist2 = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export const randBetween = (min: number, max: number): number =>
  min + Math.random() * (max - min)

export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
