import './style.css'
import { SoundManager } from './audio/SoundManager'
import { CONFIG } from './config'
import { Game } from './game/Game'
import { HandTracker, openCamera } from './hand/HandTracker'
import { HandGuide } from './ui/handGuide'
import {
  els,
  hideToast,
  setCombo,
  setHudVisible,
  setLives,
  setScore,
  showScreen,
  showToast,
} from './ui/hud'

const BEST_SCORE_KEY = 'ppp-best-score'

const sound = new SoundManager()
const tracker = new HandTracker()
const handGuide = new HandGuide(els.handGuide, els.video)
let cameraReady = false

const game = new Game(document.querySelector<HTMLCanvasElement>('#game-canvas')!, sound, {
  onScore: setScore,
  onCombo: setCombo,
  onLives: (lives) => setLives(lives, CONFIG.game.lives),
  onGameOver: handleGameOver,
  onHandsSeen: (seen) => (seen ? hideToast() : showToast('🖐️ Show your hand to the camera!', true)),
  onHands: (hands) => handGuide.draw(hands),
})

/* ------------------------------ flow ------------------------------ */

async function startWithCamera(): Promise<void> {
  sound.unlock()
  sound.click()
  const btn = els.buttons.startCamera
  btn.disabled = true
  btn.querySelector<HTMLElement>('.btn__label')!.hidden = true
  btn.querySelector<HTMLElement>('.btn__loading')!.hidden = false

  try {
    if (!cameraReady) {
      try {
        await openCamera(els.video)
      } catch (err) {
        console.error('Camera failed:', err)
        showToast('📷 Camera is blocked or busy — check browser permission, close other camera apps, or play with touch!')
        return
      }
      try {
        await tracker.init(els.video)
      } catch (err) {
        console.error('Hand tracker failed:', err)
        showToast("📡 Couldn't load the hand-tracking model — check your internet connection and try again.")
        return
      }
      game.attachTracker(tracker)
      cameraReady = true
    }
    els.pip.classList.remove('pip--hidden')
    beginRound()
  } finally {
    btn.disabled = false
    btn.querySelector<HTMLElement>('.btn__label')!.hidden = false
    btn.querySelector<HTMLElement>('.btn__loading')!.hidden = true
  }
}

function beginRound(): void {
  showScreen('none')
  setHudVisible(true)
  hideToast()
  runCountdown(CONFIG.game.countdownSeconds, () => game.start())
}

function runCountdown(seconds: number, done: () => void): void {
  els.countdown.classList.remove('countdown--hidden')
  let remaining = seconds

  const tick = (): void => {
    if (remaining > 0) {
      els.countdownNumber.textContent = String(remaining)
      sound.countdownBeep(false)
    } else {
      els.countdownNumber.textContent = 'GO!'
      sound.countdownBeep(true)
      setTimeout(() => els.countdown.classList.add('countdown--hidden'), 700)
      done()
      return
    }
    // Retrigger the zoom animation for each number.
    els.countdownNumber.classList.remove('countdown__number--zoom')
    void els.countdownNumber.offsetWidth
    els.countdownNumber.classList.add('countdown__number--zoom')
    remaining -= 1
    setTimeout(tick, 1000)
  }
  tick()
}

function handleGameOver(score: number): void {
  const best = Math.max(score, Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0))
  localStorage.setItem(BEST_SCORE_KEY, String(best))

  els.finalScore.textContent = String(score)
  els.bestScore.textContent = `Best: ${best}`
  els.overCheer.textContent =
    score >= best && score > 0
      ? '🏆 New best score — incredible!'
      : score >= 300
        ? 'Amazing popping! 🎉'
        : 'Great try — those bombs are sneaky! 💪'

  setHudVisible(false)
  hideToast()
  showScreen('over')
}

function quitToMenu(): void {
  game.quitToMenu()
  setHudVisible(false)
  hideToast()
  showScreen('start')
}

/* ----------------------------- wiring ----------------------------- */

els.buttons.startCamera.addEventListener('click', () => void startWithCamera())

els.buttons.startTouch.addEventListener('click', () => {
  sound.unlock()
  sound.click()
  showToast('👆 Tap the balloons to pop them!')
  beginRound()
})

els.buttons.pause.addEventListener('click', () => {
  if (game.state !== 'playing') return // ignore during the countdown
  sound.click()
  game.pause()
  showScreen('pause')
})

els.buttons.resume.addEventListener('click', () => {
  sound.click()
  showScreen('none')
  game.resume()
})

els.buttons.quit.addEventListener('click', quitToMenu)
els.buttons.home.addEventListener('click', quitToMenu)

els.buttons.again.addEventListener('click', () => {
  sound.click()
  beginRound()
})

els.buttons.sound.addEventListener('click', () => {
  sound.unlock()
  const muted = sound.toggleMute()
  els.buttons.sound.textContent = muted ? '🔇' : '🔊'
  if (!muted) sound.click()
})
els.buttons.sound.textContent = sound.muted ? '🔇' : '🔊'

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (game.state === 'playing') {
    game.pause()
    showScreen('pause')
  } else if (game.state === 'paused') {
    showScreen('none')
    game.resume()
  }
})

// Auto-pause when the tab is hidden so nothing pops behind the player's back.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') {
    game.pause()
    showScreen('pause')
  }
})

setLives(CONFIG.game.lives, CONFIG.game.lives)
