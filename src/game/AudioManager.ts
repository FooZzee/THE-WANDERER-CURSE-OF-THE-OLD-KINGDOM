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

  public playAnvilStrike(distanceRatio = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = Math.max(0.02, this.masterVolume * 0.18 * distanceRatio);

    // High metallic ring
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.22);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playBardBallad(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Medieval lute arpeggio (D Dorian: D4, F4, A4, C5, D5, A4)
    const notes = [293.66, 349.23, 440.0, 523.25, 587.33, 440.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.16;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this.masterVolume * 0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  public playCompanionHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.25);
    gain.gain.setValueAtTime(this.masterVolume * 0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playSwordDraw(swordType: 'steel' | 'silver'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = swordType === 'silver' ? 'sine' : 'triangle';
    const startFreq = swordType === 'silver' ? 620 : 440;
    const endFreq = swordType === 'silver' ? 1480 : 980;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.24);
    gain.gain.setValueAtTime(this.masterVolume * 0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.34);

    if (swordType === 'silver') {
      const runeOsc = ctx.createOscillator();
      const runeGain = ctx.createGain();
      runeOsc.type = 'triangle';
      runeOsc.frequency.setValueAtTime(1174.66, now + 0.06);
      runeOsc.frequency.exponentialRampToValueAtTime(1760, now + 0.36);
      runeGain.gain.setValueAtTime(this.masterVolume * 0.18, now + 0.06);
      runeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      runeOsc.connect(runeGain);
      runeGain.connect(ctx.destination);
      runeOsc.start(now + 0.06);
      runeOsc.stop(now + 0.4);
    }
  }

  public playChestOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const creak = ctx.createOscillator();
    const creakGain = ctx.createGain();
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(145, now);
    creak.frequency.linearRampToValueAtTime(92, now + 0.18);
    creak.frequency.linearRampToValueAtTime(168, now + 0.34);
    creakGain.gain.setValueAtTime(this.masterVolume * 0.16, now);
    creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    creak.connect(creakGain);
    creakGain.connect(ctx.destination);
    creak.start(now);
    creak.stop(now + 0.4);

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + 0.15 + idx * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this.masterVolume * 0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
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
