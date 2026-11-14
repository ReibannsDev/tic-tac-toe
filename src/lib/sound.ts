/**
 * Tactile notebook audio using real pen-on-paper samples extracted from the
 * project's reference recording, paired with gentle Web Audio UI accents.
 */

const SAMPLE_URLS = {
  x1: '/sounds/pen-x1.wav',
  x2: '/sounds/pen-x2.wav',
  o: '/sounds/pen-o.wav',
  strike: '/sounds/pen-strike.wav',
} as const;

type SampleKey = keyof typeof SAMPLE_URLS;

let audioCtx: AudioContext | null = null;
const decodedSamples = new Map<SampleKey, AudioBuffer>();
const pendingDecodes = new Map<SampleKey, Promise<AudioBuffer | null>>();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const AudioCtx =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  try {
    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

async function loadSample(key: SampleKey): Promise<AudioBuffer | null> {
  const existing = decodedSamples.get(key);
  if (existing) return existing;

  const inflight = pendingDecodes.get(key);
  if (inflight) return inflight;

  const ctx = getAudioContext();
  if (!ctx) return null;

  const promise = (async () => {
    try {
      const res = await fetch(SAMPLE_URLS[key]);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arr);
      decodedSamples.set(key, buffer);
      return buffer;
    } catch {
      return null;
    } finally {
      pendingDecodes.delete(key);
    }
  })();

  pendingDecodes.set(key, promise);
  return promise;
}

/** Preloads and decodes the real pen stroke clips into memory for instant playback. */
export function preloadPenSounds(): void {
  if (typeof window === 'undefined') return;
  for (const key of Object.keys(SAMPLE_URLS) as SampleKey[]) {
    void loadSample(key);
  }
}

function scheduleSampleBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  {
    startAt,
    gain = 0.85,
    playbackRate = 1,
    panFrom = 0,
    panTo = 0,
  }: {
    startAt: number;
    gain?: number;
    playbackRate?: number;
    panFrom?: number;
    panTo?: number;
  }
) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.setValueAtTime(playbackRate, startAt);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, startAt);
  src.connect(gainNode);

  if (typeof ctx.createStereoPanner === 'function' && (panFrom !== 0 || panTo !== 0)) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(panFrom, startAt);
    panner.pan.linearRampToValueAtTime(panTo, startAt + buffer.duration / playbackRate);
    gainNode.connect(panner);
    panner.connect(ctx.destination);
  } else {
    gainNode.connect(ctx.destination);
  }

  src.start(startAt);
}

function withRunningAudio(ctx: AudioContext, fn: () => void): void {
  if (ctx.state === 'running') {
    fn();
    return;
  }
  void ctx.resume().then(fn).catch(() => {});
}

function playSample(
  ctx: AudioContext,
  key: SampleKey,
  {
    startOffset = 0,
    gain = 0.85,
    playbackRate = 1,
    panFrom = 0,
    panTo = 0,
  }: {
    startOffset?: number;
    gain?: number;
    playbackRate?: number;
    panFrom?: number;
    panTo?: number;
  } = {}
) {
  withRunningAudio(ctx, () => {
    const targetTime = ctx.currentTime + startOffset;
    const cached = decodedSamples.get(key);
    if (cached) {
      scheduleSampleBuffer(ctx, cached, { startAt: targetTime, gain, playbackRate, panFrom, panTo });
      return;
    }

    void loadSample(key).then((buffer) => {
      if (!buffer) return;
      const playAt = Math.max(ctx.currentTime, targetTime);
      scheduleSampleBuffer(ctx, buffer, { startAt: playAt, gain, playbackRate, panFrom, panTo });
    });
  });
}

/**
 * Short, tactile paper-pad tap (audible across laptop/mobile speakers).
 */
function playSoftTick(
  ctx: AudioContext,
  {
    startOffset = 0,
    freqStart,
    freqEnd,
    duration = 0.055,
    gainPeak = 0.075,
  }: {
    startOffset?: number;
    freqStart: number;
    freqEnd: number;
    duration?: number;
    gainPeak?: number;
  }
) {
  withRunningAudio(ctx, () => {
    const start = ctx.currentTime + startOffset;
    const end = start + duration;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freqStart, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(80, freqEnd), end);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, start);
    lp.Q.setValueAtTime(0.6, start);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainPeak, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(end + 0.015);
  });
}

/**
 * Warm, muted percussive note (like a soft felt mallet) for round completion.
 */
function playWarmNote(
  ctx: AudioContext,
  {
    startOffset = 0,
    freq,
    duration = 0.14,
    gainPeak = 0.035,
  }: {
    startOffset?: number;
    freq: number;
    duration?: number;
    gainPeak?: number;
  }
) {
  withRunningAudio(ctx, () => {
    const start = ctx.currentTime + startOffset;
    const end = start + duration;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1100, start);
    lp.Q.setValueAtTime(0.5, start);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainPeak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(end + 0.015);
  });
}

/** Two real pen strokes (↘ then ↙) synced with the X draw animation. */
export function playDrawX(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const jitter = () => 0.96 + Math.random() * 0.08;

  playSample(ctx, 'x1', {
    startOffset: 0,
    gain: 0.78,
    playbackRate: jitter(),
    panFrom: -0.14,
    panTo: 0.14,
  });
  playSample(ctx, 'x2', {
    startOffset: 0.12,
    gain: 0.74,
    playbackRate: jitter(),
    panFrom: 0.14,
    panTo: -0.14,
  });
}

/** Continuous real pen loop synced with the O draw animation. */
export function playDrawO(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  playSample(ctx, 'o', {
    startOffset: 0,
    gain: 0.82,
    playbackRate: 0.96 + Math.random() * 0.08,
    panFrom: 0.08,
    panTo: -0.08,
  });
}

/** Real pen strike-through across the winning line, then a warm two-note felt accent. */
export function playWin(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Synced with animate-draw-strike (120ms delay)
  playSample(ctx, 'strike', {
    startOffset: 0.12,
    gain: 0.8,
    playbackRate: 0.97 + Math.random() * 0.06,
    panFrom: -0.12,
    panTo: 0.12,
  });
  playWarmNote(ctx, { startOffset: 0.32, freq: 523.25, duration: 0.15, gainPeak: 0.022 }); // C5
  playWarmNote(ctx, { startOffset: 0.4, freq: 659.25, duration: 0.22, gainPeak: 0.024 }); // E5
}

/** Gentle double muted tap for a tie round. */
export function playDraw(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  playSoftTick(ctx, { startOffset: 0.12, freqStart: 380, freqEnd: 230, duration: 0.05, gainPeak: 0.065 });
  playSoftTick(ctx, { startOffset: 0.21, freqStart: 320, freqEnd: 195, duration: 0.055, gainPeak: 0.055 });
}

/** Crisp upward paper-lift tap when zooming into a grid. */
export function playZoomIn(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  playSoftTick(ctx, { freqStart: 420, freqEnd: 640, duration: 0.055, gainPeak: 0.075 });
  playSample(ctx, 'x2', { gain: 0.28, playbackRate: 1.45 });
}

/** Soft downward paper-settle tap when returning to the sheet. */
export function playZoomOut(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  playSoftTick(ctx, { freqStart: 520, freqEnd: 310, duration: 0.06, gainPeak: 0.07 });
  playSample(ctx, 'x1', { gain: 0.22, playbackRate: 1.2 });
}

/** Soft low-mid cardstock turn when starting a fresh sheet. */
export function playPageFlip(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  playSample(ctx, 'strike', { startOffset: 0, gain: 0.35, playbackRate: 1.2 });
  playSoftTick(ctx, { startOffset: 0.07, freqStart: 360, freqEnd: 220, duration: 0.055, gainPeak: 0.055 });
}
