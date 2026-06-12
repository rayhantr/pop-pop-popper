import { randBetween } from '../types'

/**
 * The candy sky: gradient, a beaming sun, parallax clouds and soft hills.
 * Clouds are pre-rendered to offscreen canvases once, then cheaply blitted
 * and wrapped around the screen each frame.
 */

interface Cloud {
  sprite: HTMLCanvasElement
  x: number
  y: number
  speed: number
  scale: number
}

function makeCloudSprite(): HTMLCanvasElement {
  const w = 220
  const h = 110
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  const puffs = 5 + Math.floor(Math.random() * 3)
  for (let i = 0; i < puffs; i++) {
    const px = randBetween(w * 0.2, w * 0.8)
    const py = randBetween(h * 0.45, h * 0.7)
    const pr = randBetween(20, 38)
    ctx.beginPath()
    ctx.arc(px, py, pr, 0, Math.PI * 2)
    ctx.fill()
  }
  // Flat-ish base makes them read as cartoon clouds.
  ctx.fillRect(w * 0.18, h * 0.6, w * 0.64, h * 0.25)
  return canvas
}

export class Background {
  private clouds: Cloud[] = []
  private time = 0

  constructor(private width: number, private height: number) {
    this.resize(width, height)
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    if (this.clouds.length === 0) {
      for (let i = 0; i < 6; i++) {
        this.clouds.push({
          sprite: makeCloudSprite(),
          x: randBetween(0, width),
          y: randBetween(height * 0.05, height * 0.55),
          speed: randBetween(8, 30),
          scale: randBetween(0.5, 1.2),
        })
      }
    }
  }

  update(dt: number): void {
    this.time += dt
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt
      const w = cloud.sprite.width * cloud.scale
      if (cloud.x - w > this.width) cloud.x = -w
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h } = this

    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#5ec1ff')
    sky.addColorStop(0.55, '#a5e3ff')
    sky.addColorStop(1, '#fff3cf')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    // Sun with slowly rotating rays.
    const sx = w * 0.85
    const sy = h * 0.14
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(this.time * 0.1)
    ctx.fillStyle = 'rgba(255, 214, 88, 0.35)'
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6)
      ctx.beginPath()
      ctx.moveTo(0, -46)
      ctx.lineTo(12, -86)
      ctx.lineTo(-12, -86)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
    const sun = ctx.createRadialGradient(sx, sy, 5, sx, sy, 48)
    sun.addColorStop(0, '#fff6b8')
    sun.addColorStop(1, '#ffd658')
    ctx.fillStyle = sun
    ctx.beginPath()
    ctx.arc(sx, sy, 44, 0, Math.PI * 2)
    ctx.fill()

    for (const cloud of this.clouds) {
      ctx.globalAlpha = 0.55 + cloud.scale * 0.3
      ctx.drawImage(
        cloud.sprite,
        cloud.x,
        cloud.y,
        cloud.sprite.width * cloud.scale,
        cloud.sprite.height * cloud.scale,
      )
    }
    ctx.globalAlpha = 1

    // Soft hills along the bottom.
    ctx.fillStyle = 'rgba(110, 220, 170, 0.55)'
    ctx.beginPath()
    ctx.ellipse(w * 0.22, h + 40, w * 0.45, 130, 0, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = 'rgba(80, 200, 150, 0.65)'
    ctx.beginPath()
    ctx.ellipse(w * 0.85, h + 50, w * 0.5, 110, 0, Math.PI, 0)
    ctx.fill()
  }
}
