import type { SoundManager } from '../audio/SoundManager'
import { CONFIG } from '../config'
import type { HandTracker, TrackedHand } from '../hand/HandTracker'
import { clamp, dist2, randBetween, type GameState, type PopCause, type Vec2 } from '../types'
import { Background } from './background'
import { Bomb, type Entity } from './entities'
import { ParticleSystem } from './particles'
import { Spawner } from './spawner'

export interface GameEvents {
  onScore(score: number): void
  onCombo(chain: number): void
  onLives(lives: number): void
  onGameOver(score: number): void
  onHandsSeen(seen: boolean): void
  /** Fired every frame with the freshest tracked hands (camera mode only). */
  onHands(hands: TrackedHand[]): void
}

/** Cursor colours per hand slot. */
const HAND_COLORS = ['#ff5d73', '#9b5de5'] as const

/**
 * Owns the canvas, the game loop and all gameplay rules. Input arrives two
 * ways: tracked hands (queried from the HandTracker every frame) and raw
 * pointer events (touch/mouse fallback). Both funnel into `popAt()`.
 */
export class Game {
  state: GameState = 'menu'

  private readonly ctx: CanvasRenderingContext2D
  private width = 0
  private height = 0
  private dpr = 1

  private readonly background: Background
  private readonly particles = new ParticleSystem()
  private readonly spawner = new Spawner()
  private entities: Entity[] = []

  private tracker: HandTracker | null = null
  private hands: TrackedHand[] = []
  private lastHandSeenAt = 0
  private handsHintShown = false

  private score = 0
  private lives = CONFIG.game.lives
  private comboChain = 0
  private comboExpiresAt = 0
  private shakeUntil = 0
  private hurtFlashUntil = 0
  private lastFrameAt = 0

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly sound: SoundManager,
    private readonly events: GameEvents,
  ) {
    this.ctx = canvas.getContext('2d')!
    this.background = new Background(window.innerWidth, window.innerHeight)
    this.resize()
    window.addEventListener('resize', () => this.resize())

    canvas.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return
      this.popAt({ x: e.clientX, y: e.clientY }, CONFIG.pop.tapRadius, 'tap')
    })

    requestAnimationFrame((t) => this.frame(t))
  }

  attachTracker(tracker: HandTracker): void {
    this.tracker = tracker
  }

  start(): void {
    this.entities = []
    this.particles.clear()
    this.spawner.reset()
    this.score = 0
    this.lives = CONFIG.game.lives
    this.comboChain = 0
    this.handsHintShown = false
    this.lastHandSeenAt = performance.now()
    this.state = 'playing'
    this.events.onScore(0)
    this.events.onLives(this.lives)
    this.events.onCombo(0)
  }

  pause(): void {
    if (this.state === 'playing') this.state = 'paused'
  }

  resume(): void {
    if (this.state === 'paused') {
      this.lastFrameAt = performance.now()
      this.state = 'playing'
    }
  }

  quitToMenu(): void {
    this.state = 'menu'
    this.entities = []
    this.particles.clear()
  }

  /* ---------------------------------------------------------------- */

  private resize(): void {
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.background.resize(this.width, this.height)
  }

  private frame(now: number): void {
    const dt = clamp((now - this.lastFrameAt) / 1000, 0, 1 / 20)
    this.lastFrameAt = now

    this.readHands(now)
    this.background.update(dt)
    if (this.state === 'playing') this.updatePlaying(dt, now)
    this.particles.update(dt)
    this.render(now)

    requestAnimationFrame((t) => this.frame(t))
  }

  private readHands(now: number): void {
    if (!this.tracker?.ready) return
    this.hands = this.tracker.update(now)
    this.events.onHands(this.hands)

    if (this.hands.length > 0) {
      this.lastHandSeenAt = now
      if (this.handsHintShown) {
        this.handsHintShown = false
        this.events.onHandsSeen(true)
      }
    } else if (
      this.state === 'playing' &&
      !this.handsHintShown &&
      now - this.lastHandSeenAt > CONFIG.game.noHandsHintAfterMs
    ) {
      this.handsHintShown = true
      this.events.onHandsSeen(false)
    }

    if (this.state !== 'playing') return
    for (const hand of this.hands) {
      if (hand.pinchStarted) this.popAt(this.toCanvas(hand.pinchPoint), CONFIG.pop.pinchRadius, 'pinch')
      if (hand.grabStarted) this.popAt(this.toCanvas(hand.palm), CONFIG.pop.grabRadius, 'grab')
    }
  }

  private toCanvas(p: Vec2): Vec2 {
    return { x: p.x * this.width, y: p.y * this.height }
  }

  private updatePlaying(dt: number, now: number): void {
    this.entities.push(...this.spawner.update(dt, this.width, this.height))

    for (const entity of this.entities) {
      entity.update(dt)
      if (entity.isOffscreen()) entity.dead = true
    }
    this.entities = this.entities.filter((e) => !e.dead)

    if (this.comboChain > 0 && now > this.comboExpiresAt) {
      this.comboChain = 0
      this.events.onCombo(0)
    }
  }

  /** Pop every entity whose body overlaps the given circle. */
  private popAt(point: Vec2, radius: number, cause: PopCause): void {
    let popped = false
    for (const entity of this.entities) {
      if (entity.dead) continue
      const reach = radius + entity.radius
      if (dist2(point, entity.pos) > reach * reach) continue
      entity.dead = true
      popped = true

      if (entity instanceof Bomb) this.detonate(entity)
      else this.scorePop(entity, cause)
    }
    if (popped) this.entities = this.entities.filter((e) => !e.dead)
  }

  private scorePop(entity: Entity, cause: PopCause): void {
    const now = performance.now()
    const golden = entity.kind === 'golden'
    const basePoints = 'points' in entity ? (entity as { points: number }).points : 10
    const color = 'color' in entity ? (entity as { color: string }).color : '#ffffff'

    let comboBonus = 0
    if (cause !== 'blast') {
      this.comboChain += 1
      this.comboExpiresAt = now + CONFIG.game.comboWindowMs
      if (this.comboChain >= CONFIG.game.comboStartsAt) {
        comboBonus = this.comboChain * 2
        this.events.onCombo(this.comboChain)
      }
    }

    const points = cause === 'blast' ? 0 : basePoints + comboBonus
    this.score += points
    this.events.onScore(this.score)

    this.particles.balloonPop(entity.pos, entity.radius, color)
    if (golden) {
      this.particles.confettiBurst(entity.pos)
      this.sound.golden()
    } else {
      this.sound.pop(entity.radius)
    }
    if (points > 0) {
      this.particles.scoreText(
        { x: entity.pos.x, y: entity.pos.y - entity.radius },
        `+${points}`,
        golden ? '#ffd84d' : '#ffffff',
      )
    }
  }

  private detonate(bomb: Bomb): void {
    const now = performance.now()
    this.particles.explosion(bomb.pos)
    this.sound.explosion()
    this.sound.loseHeart()
    this.shakeUntil = now + CONFIG.game.shakeMs
    this.hurtFlashUntil = now + 500

    // The blast takes nearby balloons with it — dramatic, but scoreless.
    this.popAt(bomb.pos, CONFIG.pop.blastRadius, 'blast')

    this.comboChain = 0
    this.events.onCombo(0)
    this.lives -= 1
    this.events.onLives(this.lives)

    if (this.lives <= 0) {
      this.state = 'over'
      this.sound.gameOver()
      const finalScore = this.score
      setTimeout(() => this.events.onGameOver(finalScore), CONFIG.game.gameOverDelayMs)
    }
  }

  /* ----------------------------- render ---------------------------- */

  private render(now: number): void {
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    if (now < this.shakeUntil) {
      const intensity = ((this.shakeUntil - now) / CONFIG.game.shakeMs) * 14
      ctx.translate(randBetween(-intensity, intensity), randBetween(-intensity, intensity))
    }

    this.background.draw(ctx)
    for (const entity of this.entities) entity.draw(ctx)
    this.particles.draw(ctx)
    this.drawHandCursors(now)

    if (now < this.hurtFlashUntil) {
      const t = (this.hurtFlashUntil - now) / 500
      const vignette = ctx.createRadialGradient(
        this.width / 2, this.height / 2, this.height * 0.3,
        this.width / 2, this.height / 2, this.height * 0.85,
      )
      vignette.addColorStop(0, 'rgba(255, 60, 80, 0)')
      vignette.addColorStop(1, `rgba(255, 60, 80, ${0.45 * t})`)
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, this.width, this.height)
    }
  }

  private drawHandCursors(now: number): void {
    const ctx = this.ctx
    for (const hand of this.hands) {
      const color = HAND_COLORS[hand.id % HAND_COLORS.length]
      const pulse = 1 + Math.sin(now / 150) * 0.08

      if (hand.grab) {
        // Fist → big smash ring around the palm.
        const palm = this.toCanvas(hand.palm)
        ctx.strokeStyle = color
        ctx.lineWidth = 5
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.arc(palm.x, palm.y, 44 * pulse, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
        continue
      }

      // Idle cursor rides the palm — the steadiest point on the hand.
      const anchor = this.toCanvas(hand.pinch ? hand.pinchPoint : hand.palm)
      const ringRadius = (hand.pinch ? 14 : 24) * pulse

      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(anchor.x, anchor.y, ringRadius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(anchor.x, anchor.y, 7, 0, Math.PI * 2)
      ctx.fill()

      // Soft white glow so the cursor stays visible over any balloon colour.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(anchor.x, anchor.y, ringRadius + 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
}
