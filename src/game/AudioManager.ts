import type { MagicSignType } from './types';

/**
 * Procedural Web Audio API sound & medieval music synthesizer.
 * Supports independent Master, SFX, and Music/Ambient volumes + mute toggles,
 * biome/weather atmosphere shifts, combat/Sign SFX, and dialogue typewriter ticks.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private melodyTimer: number | null = null;
  private isAmbientRunning = false;
  private ambientRequested = false;
  private userGestureUnlocked = false;
  private unlockBound: (() => void) | null = null;

  public audioEnabled = true;
  public musicEnabled = true;
  public masterVolume = 0.45;
  public sfxVolume = 0.85;
  public musicVolume = 0.65;

  constructor() {
    if (typeof window !== 'undefined') {
      this.unlockBound = () => {
        if (this.userGestureUnlocked) return;
        this.userGestureUnlocked = true;
        if (this.ambientRequested && this.audioEnabled && this.musicEnabled && !this.isAmbientRunning) {
          this.startAmbient();
        } else if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };
      window.addEventListener('pointerdown', this.unlockBound, { passive: true });
      window.addEventListener('keydown', this.unlockBound, { passive: true });
      window.addEventListener('touchstart', this.unlockBound, { passive: true });
    }
  }

  private initContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.userGestureUnlocked) return false;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain.connect(this.ctx.destination);
        this.musicGain.connect(this.ctx.destination);
        this.syncGainNodes();
      } catch {
        return false;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  private syncGainNodes(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const effectiveSfx = this.audioEnabled ? this.masterVolume * this.sfxVolume : 0;
    const effectiveMusic =
      this.audioEnabled && this.musicEnabled ? this.masterVolume * this.musicVolume : 0;

    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(1, effectiveSfx)), now, 0.04);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(Math.max(0, Math.min(1, effectiveMusic)), now, 0.08);
    }
  }

  public setSettings(audioEnabled: boolean, masterVolume: number): void {
    this.audioEnabled = audioEnabled;
    this.masterVolume = masterVolume;
    this.syncGainNodes();
    if (this.audioEnabled && this.musicEnabled && !this.isAmbientRunning) {
      this.startAmbient();
    }
  }

  public applyAudioSettings(settings: {
    audioEnabled: boolean;
    musicEnabled: boolean;
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
  }): void {
    this.audioEnabled = settings.audioEnabled;
    this.musicEnabled = settings.musicEnabled;
    this.masterVolume = settings.masterVolume;
    this.sfxVolume = settings.sfxVolume;
    this.musicVolume = settings.musicVolume;
    this.syncGainNodes();
    if (this.audioEnabled && this.musicEnabled && !this.isAmbientRunning) {
      this.startAmbient();
    }
  }

  public startAmbient(): void {
    this.ambientRequested = true;
    if (this.isAmbientRunning) return;
    if (!this.initContext() || !this.ctx || !this.musicGain) return;
    this.isAmbientRunning = true;

    try {
      // 1. Dark atmospheric wind & cavern resonance noise
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 210;
      this.windFilter = filter;

      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.035;

      whiteNoise.connect(filter);
      filter.connect(windGain);
      windGain.connect(this.musicGain);
      whiteNoise.start();

      // 2. Deep dark-fantasy bowed cello + sub-contrabass drone (D1 = 36.71Hz, D2 = 73.42Hz, A2 = 110Hz)
      const subDrone = this.ctx.createOscillator();
      const drone = this.ctx.createOscillator();
      const droneFifth = this.ctx.createOscillator();
      const droneFilter = this.ctx.createBiquadFilter();
      const droneGain = this.ctx.createGain();

      subDrone.type = 'sine';
      subDrone.frequency.value = 36.71; // D1 deep sub-bass
      drone.type = 'sawtooth';
      drone.frequency.value = 73.42; // D2 dark cello root
      droneFifth.type = 'triangle';
      droneFifth.frequency.value = 110.0; // A2 hollow fifth

      // Slow LFO modulating the cello lowpass filter for organic bow breathing
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.14;
      lfoGain.gain.value = 55;
      lfo.connect(lfoGain);

      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 165;
      lfoGain.connect(droneFilter.frequency);
      droneGain.gain.value = 0.068;

      subDrone.connect(droneFilter);
      drone.connect(droneFilter);
      droneFifth.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(this.musicGain);

      subDrone.start();
      drone.start();
      droneFifth.start();
      lfo.start();
      this.droneOsc = drone;

      // 3. Dark Gothic Phrygian / Harmonic Minor score sequencer (D3, Eb3, F3, G3, A3, Bb3, C#4, D4)
      const scaleNotes = [146.83, 155.56, 174.61, 196.0, 220.0, 233.08, 277.18, 293.66];
      const darkChords: [number, number, number][] = [
        [73.42, 110.0, 174.61], // D minor (D2, A2, F3)
        [58.27, 116.54, 174.61], // Bb major / Phrygian VI (Bb1, Bb2, F3)
        [98.0, 146.83, 233.08], // G minor (G2, D3, Bb3)
        [55.0, 110.0, 164.81], // A dark dominant / Phrygian V (A1, A2, E3)
      ];
      let stepIndex = 0;
      const pattern = [0, 2, 4, 5, 4, 1, 3, 0, 7, 6, 4, 2, 1, 0];

      // Trigger initial dark chord & ritual drum immediately so the player hears the dark score right away
      this.playDarkChoirPad(darkChords[0]);
      this.playDarkRitualDrum();

      this.melodyTimer = window.setInterval(() => {
        if (!this.audioEnabled || !this.musicEnabled || !this.ctx || !this.musicGain) return;
        if (this.ctx.state !== 'running') return;
        const noteFreq = scaleNotes[pattern[stepIndex % pattern.length]];
        this.playLutePluck(noteFreq);

        if (stepIndex % 2 === 0) {
          this.playDarkRitualDrum();
        }
        if (stepIndex % 3 === 0) {
          const chord = darkChords[Math.floor(stepIndex / 3) % darkChords.length];
          this.playDarkChoirPad(chord);
        }
        stepIndex++;
      }, 2200);
    } catch {
      // Ignore Web Audio restriction errors before user gesture
    }
  }

  public setWeatherAtmosphere(weather: string): void {
    if (!this.ctx || !this.windFilter) return;
    const now = this.ctx.currentTime;
    const targetFreq = weather === 'rain' ? 460 : weather === 'fog' ? 165 : 210;
    this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.5);
  }

  public setBiomeAtmosphere(biomeId: string): void {
    if (!this.ctx || !this.droneOsc) return;
    const now = this.ctx.currentTime;
    const rootByBiome: Record<string, number> = {
      village: 73.42, // D2
      swamp: 65.41, // C2
      gallows_swamp: 61.74, // B1
      ruined_fortress: 69.3, // C#2
      ash_wastes: 58.27, // Bb1
      silver_pass: 82.41, // E2
      ash_bastion: 65.41, // C2
      eclipse_crater: 55.0, // A1
      emerald_weald: 65.41, // C2
      aether_sanctum: 73.42, // D2
      titan_cauldron: 51.91, // Ab1
    };
    const freq = rootByBiome[biomeId] ?? 73.42;
    this.droneOsc.frequency.setTargetAtTime(freq, now, 0.8);
  }

  private playDarkChoirPad(chordFreqs: [number, number, number]): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    for (const freq of chordFreqs) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, now);
      filter.frequency.linearRampToValueAtTime(380, now + 2.4);
      filter.frequency.exponentialRampToValueAtTime(160, now + 5.8);

      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(0.026, now + 1.8);
      gain.gain.exponentialRampToValueAtTime(0.0006, now + 6.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 6.1);
    }
  }

  private playDarkRitualDrum(): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(76, now);
    osc.frequency.exponentialRampToValueAtTime(31, now + 0.55);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.085, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.75);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  private playLutePluck(freq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(780, now);
    filter.frequency.exponentialRampToValueAtTime(190, now + 2.4);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.062, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.6);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 2.65);
    subOsc.stop(now + 2.65);
  }

  public playSwordSwing(heavy = false): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(heavy ? 185 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 52 : 85, now + (heavy ? 0.26 : 0.16));

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.26 : 0.16));

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (heavy ? 0.27 : 0.17));
  }

  public playHitImpact(crit = false): void {
    this.playHit(crit);
  }

  public playHit(crit = false): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = crit ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(crit ? 165 : 115, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + (crit ? 0.22 : 0.14));

    gain.gain.setValueAtTime(crit ? 0.34 : 0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (crit ? 0.22 : 0.14));

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (crit ? 0.23 : 0.15));
  }

  public playDodge(): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.14);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playSignCast(sign: MagicSignType): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq: Record<MagicSignType, number> = {
      flame: 220,
      barrier: 440,
      impulse: 150,
      illusion: 520,
      frost: 660,
    };

    osc.type = sign === 'flame' ? 'sawtooth' : sign === 'frost' ? 'sine' : 'triangle';
    subOsc.type = 'sine';

    const startF = baseFreq[sign] ?? 320;
    osc.frequency.setValueAtTime(startF, now);
    subOsc.frequency.setValueAtTime(startF * 0.5, now);

    if (sign === 'flame') {
      osc.frequency.exponentialRampToValueAtTime(88, now + 0.42);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.42);
    } else if (sign === 'frost') {
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.35);
      subOsc.frequency.exponentialRampToValueAtTime(590, now + 0.35);
    } else {
      osc.frequency.exponentialRampToValueAtTime(startF * 1.45, now + 0.32);
      subOsc.frequency.exponentialRampToValueAtTime(startF * 0.75, now + 0.32);
    }

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 0.43);
    subOsc.stop(now + 0.43);
  }

  public playPotionDrink(): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(690, now + 0.24);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playSwordDraw(type: 'steel' | 'silver' = 'steel'): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const startFreq = type === 'silver' ? 620 : 440;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.85, now + 0.22);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playQuestChime(): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [293.66, 369.99, 440.0]; // D major/medieval fifth chime
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.15, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.55);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.56);
    });
  }

  public playChestOpen(): void {
    this.playQuestChime();
  }

  public playCompanionHorn(): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(196.0, now); // G3 horn
    osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.38); // D4

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  public playAnvilStrike(distRatio = 0.5): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(310, now + 0.14);

    const vol = Math.max(0.02, 0.14 * (1 - Math.min(1, distRatio)));
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Subtle parchment/quill tick sound for the NPC dialogue typewriter effect.
   */
  public playTypewriterTick(): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const pitch = 520 + (Math.random() - 0.5) * 90;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.022);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.026);
  }

  public playBardBallad(): void {
    if (!this.audioEnabled || !this.initContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [293.66, 349.23, 440.0, 523.25, 493.88, 440.0, 587.33];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + idx * 0.14;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.16, t0 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + 0.48);
    });
  }

  public dispose(): void {
    if (typeof window !== 'undefined' && this.unlockBound) {
      window.removeEventListener('pointerdown', this.unlockBound);
      window.removeEventListener('keydown', this.unlockBound);
      window.removeEventListener('touchstart', this.unlockBound);
      this.unlockBound = null;
    }
    if (this.melodyTimer !== null) {
      clearInterval(this.melodyTimer);
      this.melodyTimer = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
