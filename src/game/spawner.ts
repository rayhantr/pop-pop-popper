import { CONFIG } from '../config'
import { clamp, lerp, randBetween } from '../types'
import { Balloon, Bomb, GoldenBalloon, type Entity } from './entities'

/**
 * Decides what floats up next and when. Difficulty ramps two ways over a
 * round: balloons spawn faster, and bombs go from "never" to "occasionally".
 */
export class Spawner {
  private elapsed = 0
  private nextSpawnIn = 0.6 // give the player a beat before the first balloon

  reset(): void {
    this.elapsed = 0
    this.nextSpawnIn = 0.6
  }

  /** Returns newly spawned entities for this frame (usually none or one). */
  update(dt: number, width: number, height: number): Entity[] {
    const { spawn } = CONFIG
    this.elapsed += dt
    this.nextSpawnIn -= dt
    if (this.nextSpawnIn > 0) return []

    const ramp = clamp(this.elapsed / spawn.rampSeconds, 0, 1)
    const interval = lerp(spawn.firstIntervalMs, spawn.minIntervalMs, ramp) / 1000
    this.nextSpawnIn = interval * randBetween(0.75, 1.25)

    const x = randBetween(width * 0.08, width * 0.92)
    const y = height + 80

    const bombChance = spawn.bombChanceMax * clamp(this.elapsed / spawn.bombRampSeconds, 0, 1)
    const roll = Math.random()
    if (roll < bombChance) return [new Bomb(x, y)]
    if (roll < bombChance + spawn.goldenChance) return [new GoldenBalloon(x, y)]
    return [new Balloon(x, y)]
  }
}
