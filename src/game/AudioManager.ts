import type { SignType, WeatherType } from './types';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterVolume = 0.6;
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;

  public setSettings(enabled: boolean, volume: number): void {
    this.enabled = enabled;
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(
        this.enabled ? this.masterVolume * 0.08 : 0,
        this.ctx.currentTime,
        0.2
      );
    }
  }

  public setWeatherAtmosphere(weather: WeatherType): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.ambientFilter && this.ambientOsc) {
      const targetFreq = weather === 'rain' ? 230 : weather === 'fog' ? 120 : 165;
      const targetNote = weather === 'rain' ? 49 : weather === 'fog' ? 52 : 55;
      this.ambientFilter.frequency.setTargetAtTime(targetFreq, now, 0.8);
      this.ambientOsc.frequency.setTargetAtTime(targetNote, now, 0.8);
    }
    if (weather === 'rain') {
      // Subtle low thunder rumble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(68, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.65);
      gain.gain.setValueAtTime(this.masterVolume * 0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.72);
    }
  }

  public setBiomeAtmosphere(biomeId: string): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.ambientFilter && this.ambientOsc) {
      let targetNote = 55;
      let targetFreq = 150;
      if (biomeId === 'gallows_swamp') {
        targetNote = 46.25; // Deep murky F#1 swamp drone
        targetFreq = 115;
      } else if (biomeId === 'silver_pass') {
        targetNote = 61.74; // Cold icy B1 mountain wind
        targetFreq = 260;
      } else if (biomeId === 'ash_bastion') {
        targetNote = 51.91; // Solemn G#1 fortress echo
        targetFreq = 175;
      } else if (biomeId === 'eclipse_crater') {
        targetNote = 41.2; // Abyssal E1 Void throne resonance
        targetFreq = 210;
      }
      this.ambientOsc.frequency.setTargetAtTime(targetNote, now, 1.2);
      this.ambientFilter.frequency.setTargetAtTime(targetFreq, now, 1.2);
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public startAmbient(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.ambientOsc) return;

    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = 55; // Low dark fantasy drone A1
      filter.type = 'lowpass';
      filter.frequency.value = 140;

      gain.gain.value = this.enabled ? this.masterVolume * 0.06 : 0;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.ambientOsc = osc;
      this.ambientGain = gain;
      this.ambientFilter = filter;
    } catch {
      // Ignore audio autoplay blocks until user gesture
    }
  }

  public playSwordSwing(isHeavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHeavy ? 220 : 340, now);
    osc.frequency.exponentialRampToValueAtTime(isHeavy ? 65 : 95, now + (isHeavy ? 0.26 : 0.16));

    gain.gain.setValueAtTime(this.masterVolume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.28 : 0.18));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isHeavy ? 0.28 : 0.18));
  }

  public playHitImpact(parried = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (parried) {
      // Metallic clang
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.22);
      gain.gain.setValueAtTime(this.masterVolume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    } else {
      // Meaty strike
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.15);
      gain.gain.setValueAtTime(this.masterVolume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playDodge(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
    gain.gain.setValueAtTime(this.masterVolume * 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playSignCast(sign: SignType): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freqMap: Record<SignType, [number, number]> = {
      flame: [180, 460],
      barrier: [320, 640],
      impulse: [420, 90],
      illusion: [520, 390],
      frost: [680, 280],
    };

    const [startF, endF] = freqMap[sign];
    osc.type = sign === 'flame' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(endF, now + 0.35);

    gain.gain.setValueAtTime(this.masterVolume * 0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playQuestChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [293.66, 369.99, 440.0]; // D major/minor mysterious chord
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(this.masterVolume * 0.2, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.72);
    });
  }

  public playPotionDrink(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.22);
    gain.gain.setValueAtTime(this.masterVolume * 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public dispose(): void {
    if (this.ambientOsc) {
      try {
        this.ambientOsc.stop();
      } catch {
        // ignore
      }
      this.ambientOsc = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
