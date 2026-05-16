type ChimeType = 'done' | 'alert' | 'info'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function note(freq: number, startTime: number, duration: number, gainVal: number, ac: AudioContext) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02) // soft attack
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function playChime(type: ChimeType) {
  try {
    const ac = getCtx()
    const t = ac.currentTime

    if (type === 'done') {
      // Ascending C→E→G major chord arpeggio — satisfying resolution
      note(523.25, t,        0.4, 0.06, ac) // C5
      note(659.25, t + 0.1,  0.4, 0.06, ac) // E5
      note(783.99, t + 0.2,  0.5, 0.05, ac) // G5
    } else if (type === 'alert') {
      // Gentle two-tone descending — soft nudge
      note(440, t,       0.35, 0.05, ac) // A4
      note(349, t + 0.2, 0.4,  0.04, ac) // F4
    } else if (type === 'info') {
      // Single soft bell
      note(880, t, 0.5, 0.04, ac) // A5 — bright but gentle
    }
  } catch {
    // Audio not available — silently skip
  }
}
