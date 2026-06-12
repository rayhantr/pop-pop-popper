/**
 * All sound effects are synthesised with the Web Audio API — zero asset
 * files, instant load, and pops can be pitch-varied per balloon size.
 * The AudioContext is created lazily on the first user gesture (browser
 * autoplay policy).
 */
export class SoundManager {
  muted = false

  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null

  constructor() {
    this.muted = localStorage.getItem('ppp-muted') === '1'
  }

  /** Call from any click/touch handler before playing the first sound. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.5
    this.master.connect(this.ctx.destination)

    // Half a second of white noise, reused by every percussive sound.
    const length = this.ctx.sampleRate / 2
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  }

  toggleMute(): boolean {
    this.muted = !this.muted
    localStorage.setItem('ppp-muted', this.muted ? '1' : '0')
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5
    return this.muted
  }

  private tone(
    freqFrom: number,
    freqTo: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.5,
    delay = 0,
  ): void {
    if (!this.ctx || !this.master) return
    const t0 = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freqFrom, t0)
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 1), t0 + duration)
    gain.gain.setValueAtTime(volume, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
    osc.connect(gain).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + duration)
  }

  private noise(duration: number, filterFreq: number, volume = 0.5, delay = 0): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return
    const t0 = this.ctx.currentTime + delay
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterFreq
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
    src.connect(filter).connect(gain).connect(this.master)
    src.start(t0)
    src.stop(t0 + duration)
  }

  /** Balloon pop — bigger balloons get a deeper "thwock". */
  pop(radius: number): void {
    const pitch = 900 - radius * 8 + Math.random() * 120
    this.noise(0.06, 4000, 0.6)
    this.tone(pitch, pitch * 0.3, 0.12, 'triangle', 0.45)
  }

  golden(): void {
    // Quick major arpeggio with sparkle.
    const notes = [1046, 1318, 1568, 2093] // C6 E6 G6 C7
    notes.forEach((f, i) => this.tone(f, f, 0.18, 'sine', 0.35, i * 0.07))
    this.noise(0.35, 8000, 0.12)
  }

  explosion(): void {
    this.noise(0.6, 900, 0.9)
    this.tone(130, 35, 0.55, 'sine', 0.8)
  }

  loseHeart(): void {
    this.tone(420, 320, 0.16, 'square', 0.25)
    this.tone(320, 210, 0.22, 'square', 0.25, 0.16)
  }

  gameOver(): void {
    const notes = [523, 440, 349, 262]
    notes.forEach((f, i) => this.tone(f, f * 0.97, 0.28, 'triangle', 0.3, i * 0.22))
  }

  countdownBeep(final: boolean): void {
    this.tone(final ? 880 : 540, final ? 880 : 540, final ? 0.4 : 0.12, 'sine', 0.4)
  }

  click(): void {
    this.tone(700, 900, 0.07, 'sine', 0.25)
  }
}
