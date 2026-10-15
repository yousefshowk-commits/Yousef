/**
 * Tiny WebAudio synthesizer — no audio files needed, works offline.
 */
export type SoundName = 'points' | 'badge' | 'reward' | 'levelup' | 'wheelTick' | 'wheelWin' | 'celebrate' | 'undo' | 'click';

let ctx: AudioContext | null = null;
let enabled = true;

export const setSoundEnabled = (v: boolean) => {
  enabled = v;
};

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const seq = (notes: number[], step: number, dur: number, type: OscillatorType = 'triangle', vol = 0.16) =>
  notes.forEach((f, i) => tone(f, i * step, dur, type, vol));

export function play(name: SoundName) {
  if (!enabled) return;
  switch (name) {
    case 'points':
      seq([880, 1318.5], 0.08, 0.18, 'triangle');
      break;
    case 'badge':
      seq([659.3, 830.6, 987.8, 1318.5], 0.09, 0.25, 'triangle');
      break;
    case 'reward':
      seq([523.3, 659.3, 784, 1046.5], 0.07, 0.22, 'square', 0.07);
      break;
    case 'levelup':
      seq([523.3, 659.3, 784, 1046.5, 784, 1046.5, 1318.5], 0.1, 0.3, 'triangle', 0.18);
      break;
    case 'wheelTick':
      tone(1500, 0, 0.03, 'square', 0.04);
      break;
    case 'wheelWin':
      seq([784, 987.8, 1174.7, 1568], 0.08, 0.3, 'triangle');
      break;
    case 'celebrate':
      seq([523.3, 523.3, 784, 784, 880, 880, 784, 1046.5, 1318.5, 1568], 0.12, 0.3, 'triangle', 0.16);
      break;
    case 'undo':
      seq([660, 440], 0.08, 0.15, 'sine', 0.12);
      break;
    case 'click':
      tone(900, 0, 0.05, 'sine', 0.06);
      break;
  }
}
