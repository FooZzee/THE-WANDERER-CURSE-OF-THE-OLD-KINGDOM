import * as THREE from 'three';
import type { AudioManager } from './AudioManager';
import type { CombatSystem } from './CombatSystem';
import type { EnemyAI } from './EnemyAI';
import type { PlayerController } from './PlayerController';
import { getGroundHeight, isTargetInAttackCone, MAGIC_SIGNS } from './rules';
import type { CollisionCylinder } from './SceneManager';
import type { EnemyData, SignType } from './types';

interface FrostTrap {
  group: THREE.Group;
  x: number;
  z: number;
  radius: number;
  timer: number;
}

interface GhostDecoy {
  mesh: THREE.Group;
  x: number;
  z: number;
  timer: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  timer: number;
  maxTimer: number;
  maxScale: number;
}

export class MagicSystem {
  public cooldowns: Record<SignType, number> = {
    flame: 0,
    barrier: 0,
    impulse: 0,
    illusion: 0,
    frost: 0,
  };

  public activeFrostSeals: FrostTrap[] = [];
  public activeDecoy: GhostDecoy | null = null;
  private activeShockwaves: ShockwaveRing[] = [];
  private burnParticleTick = 0;

  private scene: THREE.Scene;
  private audio: AudioManager;

  constructor(scene: THREE.Scene, audio: AudioManager) {
    this.scene = scene;
    this.audio = audio;
  }

  public castSign(
    sign: SignType,
    player: PlayerController,
    effectiveSignIntensity: number,
    enemyAI: EnemyAI,
    combat: CombatSystem,
    obstacles: CollisionCylinder[],
    onEnemyKilled: (enemy: EnemyData) => void,
    onCombatLog: (msg: string, type: 'info' | 'damage' | 'quest' | 'loot') => void
  ): boolean {
    const signInfo = MAGIC_SIGNS[sign];
    if (this.cooldowns[sign] > 0) {
      onCombatLog(
        `Знак «${signInfo.name}» перезаряжается (${this.cooldowns[sign].toFixed(1)}с)`,
        'info'
      );
      return false;
    }

    if (player.stats.stamina < signInfo.staminaCost) {
      onCombatLog(
        `Недостаточно выносливости для знака «${signInfo.name}» (нужно ${signInfo.staminaCost})`,
        'info'
      );
      return false;
    }

    player.stats.stamina -= signInfo.staminaCost;
    this.cooldowns[sign] = signInfo.cooldown;
    player.startSignCast();
    this.audio.playSignCast(sign);

    const intensityMult = effectiveSignIntensity / 100;
    const px = player.stats.x;
    const py = player.stats.y;
    const pz = player.stats.z;
    const rotY = player.stats.rotationY;

    if (sign === 'flame') {
      // 1. ПЛАМЯ (IGNIS): Cone of fire particles in front of the hero + burn DoT for 3 seconds
      combat.spawnDirectionalConeParticles(
        px,
        py + 1.15,
        pz,
        rotY,
        0xf97316,
        64,
        Math.PI * 0.36,
        6.0,
        12.5
      );
      combat.spawnDirectionalConeParticles(
        px,
        py + 1.1,
        pz,
        rotY,
        0xfbbf24,
        32,
        Math.PI * 0.28,
        5.0,
        10.0
      );

      let hitCount = 0;
      for (const activeEnemy of enemyAI.enemies) {
        const ed = activeEnemy.data;
        if (ed.state === 'DEAD') continue;

        if (isTargetInAttackCone(px, pz, rotY, ed.x, ed.z, 6.2, Math.PI * 0.44)) {
          const dmg = Math.round(30 * intensityMult);
          ed.hp = Math.max(0, ed.hp - dmg);
          ed.burnTimer = 3.0; // Periodic burn damage for 3 seconds
          enemyAI.triggerHitFlash(activeEnemy);
          combat.spawnHitParticles(ed.x, ed.y + 1.1, ed.z, 0xf97316, 18);
          hitCount++;

          if (ed.hp <= 0) {
            ed.state = 'DEAD';
            onCombatLog(`Сожжён знаком «Пламя»: ${ed.name}!`, 'quest');
            onEnemyKilled(ed);
          }
        }
      }

      onCombatLog(
        hitCount > 0
          ? `Знак «Пламя» поджёг врагов (${hitCount}) на 3 сек!`
          : 'Выпущен поток пламени «Игнис».',
        'damage'
      );
    } else if (sign === 'barrier') {
      // 2. БАРЬЕР (AEGIS): Semi-transparent energy sphere around the hero that absorbs the next strike and explodes on break
      const shieldAmount = Math.round(65 * intensityMult);
      player.stats.barrierShield = shieldAmount;
      combat.spawnHitParticles(px, py + 1.1, pz, 0xeab308, 28);
      onCombatLog(
        `Знак «Барьер» активен (Поглотит следующий удар и взорвётся, прочность ${shieldAmount})`,
        'info'
      );
    } else if (sign === 'impulse') {
      // 3. ИМПУЛЬС (AARD): Air distortion wave in front of the hero, knocks enemies back and stuns for 2 seconds
      const waveX = px + Math.sin(rotY) * 1.4;
      const waveZ = pz + Math.cos(rotY) * 1.4;
      this.spawnDistortionWave(waveX, py + 0.9, waveZ, 0x38bdf8, 5.8);
      combat.spawnDirectionalConeParticles(
        px,
        py + 1.05,
        pz,
        rotY,
        0x7dd3fc,
        42,
        Math.PI * 0.42,
        7.5,
        14.0
      );

      let pushed = 0;
      for (const activeEnemy of enemyAI.enemies) {
        const ed = activeEnemy.data;
        if (ed.state === 'DEAD') continue;

        if (isTargetInAttackCone(px, pz, rotY, ed.x, ed.z, 6.8, Math.PI * 0.5)) {
          const dx = ed.x - px;
          const dz = ed.z - pz;
          const dist = Math.max(0.01, Math.hypot(dx, dz));
          const pushDist = 3.8 * intensityMult;
          let nx = ed.x + (dx / dist) * pushDist;
          let nz = ed.z + (dz / dist) * pushDist;

          for (const obs of obstacles) {
            const ox = nx - obs.x;
            const oz = nz - obs.z;
            const od = Math.hypot(ox, oz);
            const minD = 0.55 + obs.radius;
            if (od < minD && od > 0.001) {
              nx = obs.x + (ox / od) * minD;
              nz = obs.z + (oz / od) * minD;
            }
          }

          ed.x = nx;
          ed.z = nz;
          ed.y = getGroundHeight(ed.x, ed.z);
          activeEnemy.rig.root.position.set(ed.x, ed.y, ed.z);

          ed.stunTimer = 2.0; // Stun for 2 seconds
          ed.state = 'STUNNED';
          const dmg = Math.round(12 * intensityMult);
          ed.hp = Math.max(0, ed.hp - dmg);
          enemyAI.triggerHitFlash(activeEnemy);
          pushed++;

          if (ed.hp <= 0) {
            ed.state = 'DEAD';
            onEnemyKilled(ed);
          }
        }
      }

      onCombatLog(
        pushed > 0
          ? `Знак «Импульс» отбросил и оглушил врагов (${pushed}) на 2 сек!`
          : 'Волна «Импульса» рассекла воздух.',
        'info'
      );
    } else if (sign === 'illusion') {
      // 4. ИЛЛЮЗИЯ (MOROK): Spawns a ghostly copy 3.2m in front of the hero for 6 seconds that taunts nearby enemies
      if (this.activeDecoy) {
        this.scene.remove(this.activeDecoy.mesh);
        this.activeDecoy = null;
      }

      const decoyX = px + Math.sin(rotY) * 3.2;
      const decoyZ = pz + Math.cos(rotY) * 3.2;
      const decoyY = getGroundHeight(decoyX, decoyZ);

      const decoyGroup = this.createGhostDecoyMesh();
      decoyGroup.position.set(decoyX, decoyY, decoyZ);
      decoyGroup.rotation.y = rotY;
      this.scene.add(decoyGroup);

      this.activeDecoy = {
        mesh: decoyGroup,
        x: decoyX,
        z: decoyZ,
        timer: 6.0,
      };

      combat.spawnHitParticles(decoyX, decoyY + 1.2, decoyZ, 0xa855f7, 34);
      onCombatLog(
        'Знак «Иллюзия»: создана призрачная копия на 6 сек (отвлекает врагов)',
        'info'
      );
    } else if (sign === 'frost') {
      // 5. ЛЕДЯНАЯ ПЕЧАТЬ (GLACIES): Magic runic circle on the ground slowing enemies in radius by 60%
      const sealGroup = this.createFrostSealMesh(4.6);
      sealGroup.position.set(px, py + 0.06, pz);
      this.scene.add(sealGroup);

      this.activeFrostSeals.push({
        group: sealGroup,
        x: px,
        z: pz,
        radius: 4.6,
        timer: 8.0,
      });

      combat.spawnHitParticles(px, py + 0.3, pz, 0x2dd4bf, 30);
      onCombatLog(
        'Знак «Ледяная печать»: магический круг замедляет врагов на 60%',
        'info'
      );
    }

    return true;
  }

  /**
   * Triggered when the player's Barrier Sign absorbs an enemy attack and shatters in an AoE explosion.
   */
  public triggerBarrierExplosion(
    player: PlayerController,
    enemyAI: EnemyAI,
    combat: CombatSystem,
    obstacles: CollisionCylinder[],
    onEnemyKilled: (enemy: EnemyData) => void,
    onCombatLog: (msg: string, type: 'info' | 'damage' | 'quest' | 'loot') => void
  ): void {
    const px = player.stats.x;
    const py = player.stats.y;
    const pz = player.stats.z;

    this.spawnDistortionWave(px, py + 1.0, pz, 0xeab308, 5.2);
    combat.spawnHitParticles(px, py + 1.1, pz, 0xfbbf24, 42);

    let hitCount = 0;
    for (const activeEnemy of enemyAI.enemies) {
      const ed = activeEnemy.data;
      if (ed.state === 'DEAD') continue;

      const dx = ed.x - px;
      const dz = ed.z - pz;
      const dist = Math.hypot(dx, dz);
      if (dist <= 4.6) {
        const dmg = 24;
        ed.hp = Math.max(0, ed.hp - dmg);
        ed.stunTimer = Math.max(ed.stunTimer, 1.2);

        const safeDist = Math.max(0.01, dist);
        let nx = ed.x + (dx / safeDist) * 2.4;
        let nz = ed.z + (dz / safeDist) * 2.4;

        for (const obs of obstacles) {
          const ox = nx - obs.x;
          const oz = nz - obs.z;
          const od = Math.hypot(ox, oz);
          const minD = 0.55 + obs.radius;
          if (od < minD && od > 0.001) {
            nx = obs.x + (ox / od) * minD;
            nz = obs.z + (oz / od) * minD;
          }
        }

        ed.x = nx;
        ed.z = nz;
        ed.y = getGroundHeight(ed.x, ed.z);
        activeEnemy.rig.root.position.set(ed.x, ed.y, ed.z);
        enemyAI.triggerHitFlash(activeEnemy);
        hitCount++;

        if (ed.hp <= 0) {
          ed.state = 'DEAD';
          onEnemyKilled(ed);
        }
      }
    }

    onCombatLog(
      hitCount > 0
        ? `«Барьер» поглотил удар и взорвался, поразив врагов (${hitCount})!`
        : '«Барьер» поглотил удар и взорвался рунической волной!',
      'info'
    );
  }

  private spawnDistortionWave(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    maxScale: number
  ): void {
    const geo = new THREE.RingGeometry(0.35, 0.85, 28);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.activeShockwaves.push({
      mesh,
      timer: 0.36,
      maxTimer: 0.36,
      maxScale,
    });
  }

  private createGhostDecoyMesh(): THREE.Group {
    const group = new THREE.Group();
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.58,
      roughness: 0.2,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.78, 0.3), ghostMat);
    torso.position.y = 1.05;

    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 1), ghostMat);
    head.position.y = 1.65;

    const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 6), ghostMat);
    cloak.position.y = 0.72;

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.08), ghostMat);
    blade.position.set(0.38, 1.15, 0.35);
    blade.rotation.x = Math.PI / 4;

    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.8, 20),
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      })
    );
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = 0.05;

    group.add(torso, head, cloak, blade, baseRing);
    return group;
  }

  private createFrostSealMesh(radius: number): THREE.Group {
    const group = new THREE.Group();

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.3, radius, 36),
      new THREE.MeshBasicMaterial({
        color: 0x2dd4bf,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      })
    );
    outerRing.rotation.x = -Math.PI / 2;

    const innerCircle = new THREE.Mesh(
      new THREE.RingGeometry(0.5, radius - 0.45, 24),
      new THREE.MeshBasicMaterial({
        color: 0x0d9488,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      })
    );
    innerCircle.rotation.x = -Math.PI / 2;

    // Runic inner square/star
    const runeSquare = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.48, radius * 0.55, 4),
      new THREE.MeshBasicMaterial({
        color: 0x99f6e4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      })
    );
    runeSquare.rotation.x = -Math.PI / 2;

    group.add(outerRing, innerCircle, runeSquare);
    return group;
  }

  public update(dt: number, enemyAI: EnemyAI, combat?: CombatSystem): void {
    // Update sign cooldowns
    const keys: SignType[] = ['flame', 'barrier', 'impulse', 'illusion', 'frost'];
    for (const k of keys) {
      if (this.cooldowns[k] > 0) {
        this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
      }
    }

    // Emit periodic fire particles on burning enemies
    if (combat) {
      this.burnParticleTick += dt;
      if (this.burnParticleTick >= 0.25) {
        this.burnParticleTick = 0;
        for (const ae of enemyAI.enemies) {
          if (ae.data.state !== 'DEAD' && ae.data.burnTimer > 0) {
            combat.spawnHitParticles(
              ae.data.x,
              ae.data.y + 1.0,
              ae.data.z,
              0xf97316,
              5
            );
          }
        }
      }
    }

    // Update expanding air distortion / barrier explosion waves
    for (let i = this.activeShockwaves.length - 1; i >= 0; i--) {
      const wave = this.activeShockwaves[i];
      wave.timer -= dt;
      if (wave.timer <= 0) {
        this.scene.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        (wave.mesh.material as THREE.Material).dispose();
        this.activeShockwaves.splice(i, 1);
        continue;
      }
      const progress = 1 - wave.timer / wave.maxTimer;
      const scale = 1 + progress * wave.maxScale;
      wave.mesh.scale.set(scale, 1, scale);
      (wave.mesh.material as THREE.MeshBasicMaterial).opacity =
        (1 - progress) * 0.85;
    }

    // Update Illusion Ghost Decoy (6s duration)
    if (this.activeDecoy) {
      this.activeDecoy.timer -= dt;
      this.activeDecoy.mesh.rotation.y += dt * 1.8;
      this.activeDecoy.mesh.position.y =
        getGroundHeight(this.activeDecoy.x, this.activeDecoy.z) +
        Math.sin(this.activeDecoy.timer * 4) * 0.08;

      if (this.activeDecoy.timer <= 0) {
        this.scene.remove(this.activeDecoy.mesh);
        this.activeDecoy = null;
      }
    }

    // Update Frost Seals (slows enemies in radius by 60%)
    for (let i = this.activeFrostSeals.length - 1; i >= 0; i--) {
      const seal = this.activeFrostSeals[i];
      seal.timer -= dt;
      seal.group.rotation.y += dt * 0.65;

      if (seal.timer <= 0) {
        this.scene.remove(seal.group);
        this.activeFrostSeals.splice(i, 1);
        continue;
      }

      for (const ae of enemyAI.enemies) {
        if (ae.data.state === 'DEAD') continue;
        const d = Math.hypot(ae.data.x - seal.x, ae.data.z - seal.z);
        if (d <= seal.radius) {
          ae.data.slowTimer = Math.max(ae.data.slowTimer, 0.35);
        }
      }
    }
  }
}
