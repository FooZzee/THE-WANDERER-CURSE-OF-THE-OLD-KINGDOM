import * as THREE from 'three';
import type { AudioManager } from './AudioManager';
import type { EnemyAI } from './EnemyAI';
import type { PlayerController } from './PlayerController';
import {
  calculateIncomingPlayerDamage,
  calculatePlayerAttackDamage,
  getGroundHeight,
  isTargetInAttackCone,
} from './rules';
import type { CollisionCylinder } from './SceneManager';
import type { EnemyData } from './types';

interface HitParticleBurst {
  mesh: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
  gravity: number;
}

export class CombatSystem {
  private scene: THREE.Scene;
  private audio: AudioManager;
  private bursts: HitParticleBurst[] = [];

  constructor(scene: THREE.Scene, audio: AudioManager) {
    this.scene = scene;
    this.audio = audio;
  }

  public spawnHitParticles(
    x: number,
    y: number,
    z: number,
    colorHex = 0xf59e0b,
    count = 24
  ): void {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x + (Math.random() - 0.5) * 0.25;
      positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.25;
      positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.25;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * 5.2;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = 1.8 + Math.random() * 4.2;
      velocities[i * 3 + 2] = Math.sin(angle) * speed;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.16,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const mesh = new THREE.Points(geo, mat);
    this.scene.add(mesh);

    this.bursts.push({
      mesh,
      velocities,
      life: 0.44,
      maxLife: 0.44,
      gravity: 9.8,
    });
  }

  /**
   * Spawns a directional cone of particles in front of the caster (used by Flame Sign & Impulse).
   */
  public spawnDirectionalConeParticles(
    originX: number,
    originY: number,
    originZ: number,
    rotationY: number,
    colorHex: number,
    count = 56,
    spreadHalfAngle = Math.PI * 0.35,
    speedMin = 5.5,
    speedMax = 11.5
  ): void {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = originX + Math.sin(rotationY) * 0.5 + (Math.random() - 0.5) * 0.25;
      positions[i * 3 + 1] = originY + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = originZ + Math.cos(rotationY) * 0.5 + (Math.random() - 0.5) * 0.25;

      const angle = rotationY + (Math.random() - 0.5) * 2 * spreadHalfAngle;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      velocities[i * 3] = Math.sin(angle) * speed;
      velocities[i * 3 + 1] = (Math.random() - 0.3) * 2.4;
      velocities[i * 3 + 2] = Math.cos(angle) * speed;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.22,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const mesh = new THREE.Points(geo, mat);
    this.scene.add(mesh);

    this.bursts.push({
      mesh,
      velocities,
      life: 0.55,
      maxLife: 0.55,
      gravity: -1.5, // Slight upward buoyancy for flames
    });
  }

  public update(
    dt: number,
    player: PlayerController,
    enemyAI: EnemyAI,
    effectiveStats: {
      steelAttack: number;
      silverAttack: number;
      defense: number;
      critChance?: number;
      bossDamageMultiplier?: number;
    },
    obstacles: CollisionCylinder[],
    onEnemyKilled: (enemy: EnemyData) => void,
    onCombatLog: (msg: string, type: 'info' | 'damage' | 'quest' | 'loot') => void,
    onCameraShake?: (intensity: number, duration: number) => void,
    onFloatingDamage?: (
      text: string,
      isCrit: boolean,
      isPlayerHit: boolean,
      color?: string
    ) => void
  ): void {
    // Honest 3-phase attack evaluation: only hit during the 'active' swing phase
    if (player.getAttackPhase() === 'active' && !player.attackHitRegistered) {
      player.attackHitRegistered = true;

      const reach = player.isHeavyAttack ? 3.5 : 3.0;
      const halfCone = player.isHeavyAttack
        ? Math.PI * 0.58
        : player.comboStep === 3
        ? Math.PI * 0.75
        : Math.PI * 0.48;

      for (const activeEnemy of enemyAI.enemies) {
        const ed = activeEnemy.data;
        if (ed.state === 'DEAD') continue;

        const inCone = isTargetInAttackCone(
          player.stats.x,
          player.stats.z,
          player.stats.rotationY,
          ed.x,
          ed.z,
          reach,
          halfCone
        );

        if (inCone) {
          // Check Noonwraith Astral Invulnerability ("Невеста у колодца")
          if (ed.type === 'noonwraith' && ed.astralInvulnerable) {
            this.spawnHitParticles(ed.x, ed.y + 1.15, ed.z, 0x2dd4bf, 16);
            this.audio.playHitImpact(true);
            onCombatLog(
              `${ed.name} в астрале и неуязвима к обычным атакам! Используйте «Ледяную печать» или «Импульс»!`,
              'info'
            );
            onFloatingDamage?.('АСТРАЛ (Неуязвима)', false, false, '#2dd4bf');
            continue;
          }

          let dmg = calculatePlayerAttackDamage({
            steelAttack: effectiveStats.steelAttack,
            silverAttack: effectiveStats.silverAttack,
            isHeavy: player.isHeavyAttack,
            comboStep: player.comboStep,
            enemy: ed,
            bossDamageMultiplier: effectiveStats.bossDamageMultiplier,
          });

          // Check Gargoyle Armor ("Каменный жнец"): vulnerable only to Heavy attacks or Backstabs
          const attackDirX = Math.sin(player.stats.rotationY);
          const attackDirZ = Math.cos(player.stats.rotationY);
          const enemyFaceX = Math.sin(ed.rotationY);
          const enemyFaceZ = Math.cos(ed.rotationY);
          const isBackstab = attackDirX * enemyFaceX + attackDirZ * enemyFaceZ > 0.25;

          if (ed.type === 'gargoyle' && !player.isHeavyAttack && !isBackstab) {
            dmg = Math.max(2, Math.round(dmg * 0.15));
            this.spawnHitParticles(ed.x, ed.y + 1.15, ed.z, 0xa8a29e, 14);
            this.audio.playHitImpact(true);
            onCombatLog(
              `Гранитная броня ${ed.name} гасит быстрый удар (-${dmg} ОЗ)! Бейте Тяжёлым ударом или со спины!`,
              'info'
            );
          } else if (isBackstab) {
            dmg = Math.round(dmg * 1.25);
          }

          // Blade Oil bonus (+30% damage)
          const oil = player.stats.activeBladeOil ?? 'none';
          const oilMatches =
            (oil === 'necrophage' && (ed.type === 'ghoul' || ed.type === 'skeleton')) ||
            (oil === 'cursed' &&
              (ed.type === 'werewolf' || ed.type === 'demon' || ed.type === 'hag')) ||
            (oil === 'specter' &&
              (ed.type === 'noonwraith' ||
                ed.type === 'boss' ||
                ed.type === 'malakor' ||
                ed.type === 'gargoyle'));
          if (oilMatches && (player.stats.bladeOilTimer ?? 0) > 0) {
            dmg = Math.round(dmg * 1.3);
          }

          // Critical Hit roll
          const isCrit = Math.random() < (effectiveStats.critChance ?? 0.1);
          if (isCrit) {
            dmg = Math.round(dmg * 1.5);
          }

          ed.hp = Math.max(0, ed.hp - dmg);

          // Knockback & Stagger
          const dx = ed.x - player.stats.x;
          const dz = ed.z - player.stats.z;
          const dist = Math.max(0.01, Math.hypot(dx, dz));
          const knockback = player.isHeavyAttack ? 1.45 : 0.65;
          let nx = ed.x + (dx / dist) * knockback;
          let nz = ed.z + (dz / dist) * knockback;

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

          if (player.isHeavyAttack) {
            ed.stunTimer = Math.max(ed.stunTimer, 1.15);
          }

          enemyAI.triggerHitFlash(activeEnemy);
          // Sparks + Blood particles
          this.spawnHitParticles(ed.x, ed.y + 1.15, ed.z, 0xf59e0b, 18);
          this.spawnHitParticles(ed.x, ed.y + 1.0, ed.z, 0xdc2626, 14);
          this.audio.playHitImpact(false);
          onCameraShake?.(player.isHeavyAttack ? 0.16 : 0.08, 0.14);

          const strikeLabel = player.isHeavyAttack
            ? 'Тяжёлый удар'
            : isBackstab
            ? 'Удар в спину'
            : `Комбо x${player.comboStep}`;
          onCombatLog(
            `${strikeLabel}${isCrit ? ' [КРИТ!]' : ''} по ${ed.name}: -${dmg} ОЗ`,
            'damage'
          );
          onFloatingDamage?.(
            `-${dmg}${isCrit ? ' КРИТ!' : ''}`,
            isCrit,
            false
          );

          if (ed.hp <= 0) {
            ed.state = 'DEAD';
            onCombatLog(`Повержен враг: ${ed.name}!`, 'quest');
            onEnemyKilled(ed);
          }
        }
      }
    }

    // Update active particle bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.bursts.splice(i, 1);
        continue;
      }

      const posAttr = b.mesh.geometry.attributes.position as THREE.BufferAttribute;
      const count = b.velocities.length / 3;
      for (let p = 0; p < count; p++) {
        const vx = b.velocities[p * 3];
        const vy = b.velocities[p * 3 + 1] - b.gravity * dt;
        const vz = b.velocities[p * 3 + 2];
        b.velocities[p * 3 + 1] = vy;

        posAttr.setXYZ(
          p,
          posAttr.getX(p) + vx * dt,
          posAttr.getY(p) + vy * dt,
          posAttr.getZ(p) + vz * dt
        );
      }
      posAttr.needsUpdate = true;
      (b.mesh.material as THREE.PointsMaterial).opacity = b.life / b.maxLife;
    }
  }

  public handleEnemyAttackOnPlayer(
    enemy: EnemyData,
    rawDamage: number,
    player: PlayerController,
    effectiveDefense: number,
    onCombatLog: (msg: string, type: 'info' | 'damage' | 'quest' | 'loot') => void,
    onCameraShake?: (intensity: number, duration: number) => void,
    onBarrierShatter?: () => void
  ): void {
    const isDodging = player.hasIFrames();
    const isBlocking = player.isBlocking && player.stats.stamina >= 8;
    const hadBarrier = player.stats.barrierShield > 0;

    // If Barrier Sign is active and player didn't dodge with i-frames, Barrier absorbs the next enemy strike and explodes!
    if (!isDodging && hadBarrier) {
      player.stats.barrierShield = 0;
      this.spawnHitParticles(
        player.stats.x,
        player.stats.y + 1.15,
        player.stats.z,
        0xeab308,
        32
      );
      this.audio.playHitImpact(true);
      onCameraShake?.(0.14, 0.16);
      onBarrierShatter?.();
      return;
    }

    const res = calculateIncomingPlayerDamage({
      rawDamage,
      defense: effectiveDefense,
      isDodging,
      isBlocking,
      barrierShield: player.stats.barrierShield,
    });

    player.stats.barrierShield = res.remainingBarrier;

    if (res.dodged) {
      onCombatLog(`Уклонение (i-frames) от атаки ${enemy.name}!`, 'info');
      return;
    }

    if (res.parried) {
      player.stats.stamina = Math.max(0, player.stats.stamina - 10);
      this.spawnHitParticles(
        player.stats.x,
        player.stats.y + 1.2,
        player.stats.z,
        0xfbbf24,
        20
      );
      this.audio.playHitImpact(true);
      onCameraShake?.(0.08, 0.1);
      onCombatLog(`Блок мечом! Урон снижен (-${res.hpDamage} ОЗ)`, 'info');
    } else if (res.hpDamage > 0) {
      this.spawnHitParticles(
        player.stats.x,
        player.stats.y + 1.1,
        player.stats.z,
        0xef4444,
        18
      );
      this.audio.playHitImpact(false);
      player.triggerHitReaction();
      onCameraShake?.(0.18, 0.18);
      onCombatLog(`${enemy.name} наносит вам ${res.hpDamage} урона!`, 'damage');
    }

    player.stats.hp = Math.max(0, player.stats.hp - res.hpDamage);
  }
}
