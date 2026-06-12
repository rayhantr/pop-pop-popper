import { randBetween, type Vec2 } from '../types'

/**
 * One lightweight system for every visual effect: balloon shards, confetti,
 * explosion smoke, shockwave rings and floating score text. Particles are
 * plain objects updated in-place — no per-frame allocation beyond spawning.
 */

type ParticleShape = 'shard' | 'confetti' | 'smoke' | 'ring' | 'text'

interface Particle {
  shape: ParticleShape
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  rotation: number
  spin: number
  gravity: number
  text?: string
}

const CONFETTI_COLORS = ['#ff5d73', '#ffc53d', '#2ee6a8', '#9b5de5', '#41b8ff', '#ff8ac2']

export class ParticleSystem {
  private particles: Particle[] = []

  private add(p: Omit<Particle, 'life'>): void {
    this.particles.push({ ...p, life: p.maxLife })
  }

  balloonPop(pos: Vec2, radius: number, color: string): void {
    // Rubber shards flying outward.
    const shards = 10
    for (let i = 0; i < shards; i++) {
      const angle = (i / shards) * Math.PI * 2 + randBetween(-0.3, 0.3)
      const speed = randBetween(180, 420)
      this.add({
        shape: 'shard',
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        maxLife: randBetween(0.35, 0.6),
        size: randBetween(radius * 0.12, radius * 0.25),
        color,
        rotation: angle,
        spin: randBetween(-12, 12),
        gravity: 600,
      })
    }
    this.add({
      shape: 'ring',
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      maxLife: 0.3,
      size: radius,
      color,
      rotation: 0,
      spin: 0,
      gravity: 0,
    })
  }

  confettiBurst(pos: Vec2, count = 26): void {
    for (let i = 0; i < count; i++) {
      const angle = randBetween(0, Math.PI * 2)
      const speed = randBetween(120, 520)
      this.add({
        shape: 'confetti',
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 150,
        maxLife: randBetween(0.8, 1.6),
        size: randBetween(5, 9),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotation: randBetween(0, Math.PI * 2),
        spin: randBetween(-14, 14),
        gravity: 420,
      })
    }
  }

  explosion(pos: Vec2): void {
    for (let i = 0; i < 14; i++) {
      const angle = randBetween(0, Math.PI * 2)
      const speed = randBetween(40, 220)
      this.add({
        shape: 'smoke',
        x: pos.x + randBetween(-10, 10),
        y: pos.y + randBetween(-10, 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        maxLife: randBetween(0.5, 1.1),
        size: randBetween(18, 42),
        color: i % 3 === 0 ? '#ffac4d' : '#5a5470',
        rotation: 0,
        spin: 0,
        gravity: -60, // smoke drifts up
      })
    }
    this.add({
      shape: 'ring',
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      maxLife: 0.45,
      size: 50,
      color: '#ffac4d',
      rotation: 0,
      spin: 0,
      gravity: 0,
    })
  }

  scoreText(pos: Vec2, text: string, color = '#ffffff'): void {
    this.add({
      shape: 'text',
      x: pos.x,
      y: pos.y,
      vx: randBetween(-20, 20),
      vy: -110,
      maxLife: 0.9,
      size: 30,
      color,
      rotation: 0,
      spin: 0,
      gravity: 0,
      text,
    })
  }

  update(dt: number): void {
    const alive: Particle[] = []
    for (const p of this.particles) {
      p.life -= dt
      if (p.life <= 0) continue
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rotation += p.spin * dt
      alive.push(p)
    }
    this.particles = alive
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const t = p.life / p.maxLife // 1 → 0
      ctx.save()
      ctx.globalAlpha = Math.min(1, t * 2)

      switch (p.shape) {
        case 'shard': {
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotation)
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2)
          ctx.fill()
          break
        }
        case 'confetti': {
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotation)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
          break
        }
        case 'smoke': {
          ctx.fillStyle = p.color
          ctx.globalAlpha = t * 0.5
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * (1.4 - t * 0.4), 0, Math.PI * 2)
          ctx.fill()
          break
        }
        case 'ring': {
          ctx.strokeStyle = p.color
          ctx.lineWidth = 5 * t
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * (2.2 - t * 1.2), 0, Math.PI * 2)
          ctx.stroke()
          break
        }
        case 'text': {
          ctx.font = `700 ${p.size}px Fredoka, sans-serif`
          ctx.textAlign = 'center'
          ctx.lineWidth = 6
          ctx.strokeStyle = 'rgba(45, 42, 74, 0.85)'
          ctx.fillStyle = p.color
          ctx.strokeText(p.text ?? '', p.x, p.y)
          ctx.fillText(p.text ?? '', p.x, p.y)
          break
        }
      }
      ctx.restore()
    }
  }

  clear(): void {
    this.particles = []
  }
}
