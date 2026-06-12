import { CONFIG } from '../config'
import { pick, randBetween, type Vec2 } from '../types'

/**
 * Everything that floats up the screen. Entities only know how to move and
 * draw themselves; popping, scoring and explosions are the Game's job.
 */

export type EntityKind = 'balloon' | 'golden' | 'bomb'

export abstract class Entity {
  abstract readonly kind: EntityKind
  pos: Vec2
  radius: number
  dead = false

  protected age = 0
  protected riseSpeed: number
  protected baseX: number
  protected swayAmp: number
  protected swayFreq: number
  protected swayPhase = Math.random() * Math.PI * 2

  constructor(x: number, y: number, radius: number, riseSpeed: number) {
    this.pos = { x, y }
    this.baseX = x
    this.radius = radius
    this.riseSpeed = riseSpeed
    this.swayAmp = randBetween(10, 26)
    this.swayFreq = randBetween(0.9, 1.6)
  }

  update(dt: number): void {
    this.age += dt
    this.pos.y -= this.riseSpeed * dt
    this.pos.x = this.baseX + Math.sin(this.age * this.swayFreq + this.swayPhase) * this.swayAmp
  }

  /** True once fully above the top edge. */
  isOffscreen(): boolean {
    return this.pos.y < -this.radius * 3
  }

  abstract draw(ctx: CanvasRenderingContext2D): void
}

/* ------------------------------------------------------------------ */

function drawBalloonBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  body: string,
  shadow: string,
  squish: number,
): void {
  const ry = r * 1.16 * (2 - squish)
  const rx = r * squish

  // String — a lazy S-curve that trails below the knot.
  ctx.strokeStyle = 'rgba(60, 50, 90, 0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y + ry)
  ctx.bezierCurveTo(x - r * 0.4, y + ry + r * 0.8, x + r * 0.4, y + ry + r * 1.4, x, y + ry + r * 2)
  ctx.stroke()

  // Knot.
  ctx.fillStyle = shadow
  ctx.beginPath()
  ctx.moveTo(x - r * 0.16, y + ry - 2)
  ctx.lineTo(x + r * 0.16, y + ry - 2)
  ctx.lineTo(x, y + ry + r * 0.22)
  ctx.closePath()
  ctx.fill()

  // Body with a soft top-left light source.
  const grad = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, r * 0.15, x, y, Math.max(rx, ry) * 1.15)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.18, body)
  grad.addColorStop(1, shadow)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()

  // Glossy highlight.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.beginPath()
  ctx.ellipse(x - rx * 0.38, y - ry * 0.42, rx * 0.22, ry * 0.3, -0.5, 0, Math.PI * 2)
  ctx.fill()
}

export class Balloon extends Entity {
  readonly kind = 'balloon'
  readonly points: number
  readonly color: string
  private readonly shadowColor: string

  constructor(x: number, y: number) {
    const tier = pick(CONFIG.balloons.tiers)
    super(x, y, randBetween(tier.rMin, tier.rMax), randBetween(tier.vMin, tier.vMax))
    this.points = tier.points
    const [body, shadow] = pick(CONFIG.balloons.colors)
    this.color = body
    this.shadowColor = shadow
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Gentle breathing squish keeps balloons feeling alive while they rise.
    const squish = 1 + Math.sin(this.age * 3 + this.swayPhase) * 0.03
    drawBalloonBody(ctx, this.pos.x, this.pos.y, this.radius, this.color, this.shadowColor, squish)
  }
}

export class GoldenBalloon extends Entity {
  readonly kind = 'golden'
  readonly points = CONFIG.balloons.golden.points
  readonly color = '#ffd84d'

  constructor(x: number, y: number) {
    super(x, y, CONFIG.balloons.golden.radius, CONFIG.balloons.golden.speed)
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.pos
    const twinkle = 0.6 + Math.sin(this.age * 6) * 0.4

    ctx.save()
    ctx.shadowColor = `rgba(255, 200, 40, ${0.5 + twinkle * 0.3})`
    ctx.shadowBlur = 24
    drawBalloonBody(ctx, x, y, this.radius, '#ffd84d', '#f2a51a', 1)
    ctx.restore()

    // Orbiting sparkles.
    ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`
    for (let i = 0; i < 3; i++) {
      const a = this.age * 2.2 + (i * Math.PI * 2) / 3
      const sx = x + Math.cos(a) * this.radius * 1.5
      const sy = y + Math.sin(a) * this.radius * 1.5
      drawStar(ctx, sx, sy, 4)
    }
  }
}

export class Bomb extends Entity {
  readonly kind = 'bomb'

  constructor(x: number, y: number) {
    const { radius, vMin, vMax } = CONFIG.balloons.bomb
    super(x, y, radius, randBetween(vMin, vMax))
    this.swayAmp *= 0.6 // bombs drift less — they should look heavy
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.pos
    const r = this.radius

    // The mini grey balloon carrying the bomb (a visual warning label).
    drawBalloonBody(ctx, x, y - r * 2.6, r * 0.62, '#b9c3d4', '#8d99af', 1)

    // Bomb body.
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.15, x, y, r * 1.2)
    grad.addColorStop(0, '#5d5878')
    grad.addColorStop(1, '#2c2841')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()

    // Fuse cap + fuse.
    ctx.fillStyle = '#1f1c30'
    ctx.fillRect(x - r * 0.22, y - r - r * 0.28, r * 0.44, r * 0.32)
    ctx.strokeStyle = '#c9a06b'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, y - r - r * 0.25)
    ctx.quadraticCurveTo(x + r * 0.5, y - r - r * 0.8, x + r * 0.75, y - r - r * 0.5)
    ctx.stroke()

    // Flickering spark at the fuse tip.
    const spark = 0.6 + Math.random() * 0.4
    ctx.fillStyle = `rgba(255, 196, 60, ${spark})`
    drawStar(ctx, x + r * 0.78, y - r - r * 0.52, 6 * spark)

    // Cartoon worried face so kids instantly read "danger".
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x - r * 0.3, y - r * 0.1, r * 0.16, 0, Math.PI * 2)
    ctx.arc(x + r * 0.3, y - r * 0.1, r * 0.16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1f1c30'
    ctx.beginPath()
    ctx.arc(x - r * 0.3, y - r * 0.08, r * 0.07, 0, Math.PI * 2)
    ctx.arc(x + r * 0.3, y - r * 0.08, r * 0.07, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1f1c30'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(x, y + r * 0.42, r * 0.2, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
  }
}

/** Tiny 4-point sparkle used by golden balloons and bomb fuses. */
export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath()
  ctx.moveTo(x, y - size)
  ctx.quadraticCurveTo(x, y, x + size, y)
  ctx.quadraticCurveTo(x, y, x, y + size)
  ctx.quadraticCurveTo(x, y, x - size, y)
  ctx.quadraticCurveTo(x, y, x, y - size)
  ctx.fill()
}
