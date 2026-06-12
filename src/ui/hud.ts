/**
 * Thin DOM layer: screen switching, HUD counters and toasts. No game logic —
 * the Game pushes state here through callbacks wired up in main.ts.
 */

const $ = <T extends HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector)
  if (!el) throw new Error(`Missing element: ${selector}`)
  return el
}

export const els = {
  hud: $('#hud'),
  score: $('#score-value'),
  comboBubble: $('#combo-bubble'),
  comboValue: $('#combo-value'),
  lives: $('#lives'),
  pip: $('#pip'),
  toast: $('#toast'),
  countdown: $('#countdown'),
  countdownNumber: $('#countdown-number'),
  screens: {
    start: $('#screen-start'),
    pause: $('#screen-pause'),
    over: $('#screen-over'),
  },
  buttons: {
    startCamera: $<HTMLButtonElement>('#btn-start-camera'),
    startTouch: $<HTMLButtonElement>('#btn-start-touch'),
    pause: $<HTMLButtonElement>('#btn-pause'),
    sound: $<HTMLButtonElement>('#btn-sound'),
    resume: $<HTMLButtonElement>('#btn-resume'),
    quit: $<HTMLButtonElement>('#btn-quit'),
    again: $<HTMLButtonElement>('#btn-again'),
    home: $<HTMLButtonElement>('#btn-home'),
  },
  finalScore: $('#final-score'),
  bestScore: $('#best-score'),
  overCheer: $('#over-cheer'),
  video: $<HTMLVideoElement>('#camera'),
  handGuide: $<HTMLCanvasElement>('#hand-guide'),
}

export type ScreenName = keyof typeof els.screens | 'none'

export function showScreen(name: ScreenName): void {
  for (const [key, screen] of Object.entries(els.screens)) {
    screen.classList.toggle('screen--hidden', key !== name)
  }
}

export function setHudVisible(visible: boolean): void {
  els.hud.classList.toggle('hud--hidden', !visible)
}

export function setScore(score: number): void {
  els.score.textContent = String(score)
  // Retrigger the bump animation.
  const chip = els.score.parentElement!
  chip.classList.remove('hud__score--bump')
  void chip.offsetWidth
  chip.classList.add('hud__score--bump')
}

export function setCombo(chain: number): void {
  const show = chain >= 2
  els.comboBubble.classList.toggle('combo--hidden', !show)
  if (show) {
    els.comboValue.textContent = `x${chain}`
    els.comboBubble.classList.remove('combo--pop')
    void els.comboBubble.offsetWidth
    els.comboBubble.classList.add('combo--pop')
  }
}

export function setLives(lives: number, total: number): void {
  els.lives.replaceChildren(
    ...Array.from({ length: total }, (_, i) => {
      const heart = document.createElement('span')
      heart.className = 'lives__heart'
      heart.textContent = i < lives ? '❤️' : '🤍'
      if (i === lives) heart.classList.add('lives__heart--lost')
      return heart
    }),
  )
}

let toastTimer = 0

export function showToast(message: string, sticky = false): void {
  els.toast.textContent = message
  els.toast.classList.remove('toast--hidden')
  window.clearTimeout(toastTimer)
  if (!sticky) {
    toastTimer = window.setTimeout(() => hideToast(), 2600)
  }
}

export function hideToast(): void {
  els.toast.classList.add('toast--hidden')
}
