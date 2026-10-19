/**
 * Procedural Web Audio API sound generator for NEON SNAKE
 * Zero external audio assets required; entirely synthesized at runtime.
 */
import type { GameAudioEvent } from './types.ts';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled: boolean = true;
  private volume: number = 0.8;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          this.ctx = null;
        }
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public play(event: GameAudioEvent): void {
    if (!this.sfxEnabled || this.volume <= 0) return;

    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, now);
      masterGain.connect(ctx.destination);

      switch (event) {
        case 'click': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(250, now + 0.04);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.045);
          break;
        }

        case 'turn': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.exponentialRampToValueAtTime(320, now + 0.025);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.025);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.03);
          break;
        }

        case 'eat': {
          // Bright dual chime (C6 -> G6)
          [1046.5, 1567.98].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.04;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.22, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(start);
            osc.stop(start + 0.13);
          });
          break;
        }

        case 'bonus': {
          // Shimmering chord (E6 + B6 + E7)
          [1318.51, 1975.53, 2637.02].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.035;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.25, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(start);
            osc.stop(start + 0.23);
          });
          break;
        }

        case 'powerup': {
          // Sci-fi rising laser chirp
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(350, now);
          osc.frequency.exponentialRampToValueAtTime(1400, now + 0.18);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.23);
          break;
        }

        case 'shield_absorb': {
          // Heavy resonant bass pulse + dissipating noise
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }

        case 'level_up': {
          // Major fanfare arpeggio (C5, E5, G5, C6)
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.06;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.24, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(start);
            osc.stop(start + 0.2);
          });
          break;
        }

        case 'game_over': {
          // Descending cyber crash
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        }

        case 'new_record': {
          // High celebratory victory flourish
          [659.25, 830.61, 987.77, 1318.51, 1661.22].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.08;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.26, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(start);
            osc.stop(start + 0.35);
          });
          break;
        }
      }
    } catch {
      // Audio playback failsafe
    }
  }
}

export const soundEngine = new SoundEngine();
