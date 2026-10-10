import { SoundConfig } from '../types';

class SoundController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private currentlyPlayingAnswerNode: AudioBufferSourceNode | null = null;
  private preloadPromise: Promise<void> | null = null;

  // Sound flags
  public soundEnabled: boolean = true;
  public audioUnlocked: boolean = false;

  public fileLoadStatus: Record<string, boolean> = {
    'sounds/open.mp3': false,
    'sounds/correct.mp3': false,
    'sounds/wrong.mp3': false,
    'sounds/hint.mp3': false,
    'sounds/wrong-streak.mp3': false,
  };

  public soundsConfig: SoundConfig = {
    open: '',
    correct: '',
    wrong: '',
    hint: '',
    click: '',
    milestone: '',
  };

  private volume: number = 0.7;

  constructor() {
    const RESET_KEY = 'manga_quiz_sound_reset_v3';
    const SOUND_SETTING_KEY = 'manga_quiz_sound_enabled';

    try {
      if (!localStorage.getItem(RESET_KEY)) {
        localStorage.removeItem('manga_quiz_muted');
        localStorage.removeItem(SOUND_SETTING_KEY);
        localStorage.setItem(RESET_KEY, 'true');
      }

      const saved = localStorage.getItem(SOUND_SETTING_KEY);
      if (saved !== null) {
        this.soundEnabled = saved === 'true';
      } else {
        this.soundEnabled = true;
      }

      const savedVolume = localStorage.getItem('manga_quiz_volume');
      if (savedVolume !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(savedVolume) || 0.7));
      }
    } catch {
      this.soundEnabled = true;
    }
  }

  // 1. FIX THE PATH: BASE_URL already contains the repo prefix and leading slash
  public getSoundPath(filename: string): string {
    return `${import.meta.env.BASE_URL}sounds/${filename}`;
  }

  // 2. PRELOAD EARLY AND WAIT FOR IT
  public init(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(
          this.soundEnabled ? this.volume : 0,
          this.ctx.currentTime
        );
        this.masterGain.connect(this.ctx.destination);
      }
    }

    if (!this.preloadPromise && this.ctx) {
      this.preloadPromise = this.preloadAudioFiles();
    }

    return this.ctx;
  }

  public preload(): Promise<void> {
    this.init();
    return this.preloadPromise ?? Promise.resolve();
  }

  // Rewrite preloadAudioFiles to load all five files in parallel
  private async preloadAudioFiles(): Promise<void> {
    if (!this.ctx) return;

    const targets: { key: string; file: string; fallbacks: string[] }[] = [
      { key: 'open', file: 'open.mp3', fallbacks: [] },
      { key: 'correct', file: 'correct.mp3', fallbacks: [] },
      { key: 'wrong', file: 'wrong.mp3', fallbacks: [] },
      { key: 'hint', file: 'hint.mp3', fallbacks: [] },
      {
        key: 'wrong-streak',
        file: 'wrong-streak.mp3',
        fallbacks: ['wrong%20streak.mp3', 'wrong streak.mp3'],
      },
    ];

    await Promise.all(
      targets.map(async (target) => {
        const paths = [target.file, ...target.fallbacks].map((f) => this.getSoundPath(f));
        for (const p of paths) {
          try {
            const resp = await fetch(p);
            if (!resp.ok) continue;
            const buf = await this.ctx!.decodeAudioData(await resp.arrayBuffer());
            this.audioBuffers.set(target.key, buf);
            this.fileLoadStatus[`sounds/${target.file}`] = true;
            return;
          } catch {}
        }
        this.fileLoadStatus[`sounds/${target.file}`] = false;
      })
    );

    // log only AFTER loading finishes
    this.logStatus();
  }

  // 3. In unlockAudio(): after ctx.resume(), wait for preload before setting audioUnlocked = true
  public async unlockAudio(): Promise<boolean> {
    const ctx = this.init();
    if (!ctx) {
      this.logStatus();
      return false;
    }

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch (err) {
      console.warn('AudioContext resume error:', err);
    }

    // Wait for preload or max 1500ms timeout
    await Promise.race([this.preload(), new Promise((r) => setTimeout(r, 1500))]);

    this.audioUnlocked = true;
    return true;
  }

  // 4. In logStatus, label each file as LOADED or FAILED with the exact URL tried
  public logStatus(): void {
    console.log(
      '%c[Manga Audio Engine Status]',
      'color: #e8412c; font-weight: bold; font-size: 13px;'
    );
    console.log('  Files in sounds/:');
    const targets = ['open.mp3', 'correct.mp3', 'wrong.mp3', 'hint.mp3', 'wrong-streak.mp3'];
    for (const file of targets) {
      const isLoaded = this.fileLoadStatus[`sounds/${file}`];
      const url = this.getSoundPath(file);
      console.log(
        `    • ${file}:`,
        isLoaded ? 'LOADED' : 'FAILED',
        `(${url})`
      );
    }
    console.log('  Audio Flags:');
    console.log('    • sound-enabled: ', this.soundEnabled);
    console.log('    • audio-unlocked:', this.audioUnlocked);
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    try {
      localStorage.setItem('manga_quiz_volume', this.volume.toString());
    } catch {}
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.soundEnabled ? this.volume : 0,
        this.ctx.currentTime
      );
    }
  }

  public getIsMuted(): boolean {
    return !this.soundEnabled;
  }

  public toggleMute(): boolean {
    return !this.toggleSound();
  }

  public toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    try {
      if (!this.soundEnabled) {
        localStorage.setItem('manga_quiz_sound_enabled', 'false');
      } else {
        localStorage.setItem('manga_quiz_sound_enabled', 'true');
      }
    } catch {}

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.soundEnabled ? this.volume : 0,
        this.ctx.currentTime
      );
    }
    return this.soundEnabled;
  }

  private stopCurrentAnswerSound(): void {
    if (this.currentlyPlayingAnswerNode) {
      try {
        this.currentlyPlayingAnswerNode.stop();
        this.currentlyPlayingAnswerNode.disconnect();
      } catch {}
      this.currentlyPlayingAnswerNode = null;
    }
  }

  private playBuffer(key: string, isAnswerSound: boolean): boolean {
    if (!this.soundEnabled || !this.audioUnlocked) return false;
    const ctx = this.init();
    if (!ctx || !this.masterGain) return false;

    const buffer = this.audioBuffers.get(key);
    if (!buffer) return false;

    if (isAnswerSound) {
      this.stopCurrentAnswerSound();
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain);

      if (isAnswerSound) {
        this.currentlyPlayingAnswerNode = source;
        source.onended = () => {
          if (this.currentlyPlayingAnswerNode === source) {
            this.currentlyPlayingAnswerNode = null;
          }
        };
      }

      source.start(0);
      return true;
    } catch {
      return false;
    }
  }

  public playClick(): void {
    if (!this.soundEnabled || !this.audioUnlocked) return;
    const ctx = this.init();
    if (!ctx || !this.masterGain) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {}
  }

  public playOpen(): void {
    if (!this.soundEnabled || !this.audioUnlocked) return;
    if (this.playBuffer('open', false)) return;

    // Fallback: synthesized low sine swell + filtered-noise whoosh
    const ctx = this.init();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.7);

      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.linearRampToValueAtTime(0.4, now + 0.35);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.85);

      const bufferSize = ctx.sampleRate * 0.8;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3.0, now);
      filter.frequency.setValueAtTime(250, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.5);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.8);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.3);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.82);
    } catch {}
  }

  public playCorrect(): void {
    if (!this.soundEnabled || !this.audioUnlocked) return;
    this.stopCurrentAnswerSound();

    if (this.playBuffer('correct', true)) return;

    // Fallback: rising triangle chime C5 -> E5 -> G5
    const ctx = this.init();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.11;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch {}
  }

  public playWrong(streakCount = 0): void {
    if (!this.soundEnabled || !this.audioUnlocked) return;
    this.stopCurrentAnswerSound();

    // If broken streak of 3 or more, try wrong-streak.mp3 first!
    if (streakCount >= 3) {
      if (this.playBuffer('wrong-streak', true)) return;
    }

    if (this.playBuffer('wrong', true)) return;

    // Fallback: descending sawtooth buzz 220 -> 110 Hz
    const ctx = this.init();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.28);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.28);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch {}
  }

  public playHint(): void {
    if (!this.soundEnabled || !this.audioUnlocked) return;
    if (this.playBuffer('hint', false)) return;

    // Fallback: two soft high sine sparkle pings
    const ctx = this.init();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const pings = [1046.5, 1318.51];
      pings.forEach((freq, idx) => {
        const startTime = now + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch {}
  }

  public playMilestone(): void {
    if (!this.soundEnabled || !this.audioUnlocked) return;
    const ctx = this.init();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const arpeggio = [523.25, 659.25, 783.99, 1046.5];
      arpeggio.forEach((freq, idx) => {
        const startTime = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + 0.48);
      });
    } catch {}
  }
}

export const soundManager = new SoundController();
