import * as THREE from 'three';
import type { AudioManager } from './AudioManager';
import type { CombatSystem } from './CombatSystem';
import type { EnemyAI } from './EnemyAI';
import type { PlayerController } from './PlayerController';
import { getGroundHeight, isTargetInAttackCone, MAGIC_SIGNS } from './rules';
import type { CollisionCylinder } from './SceneManager';
import type { EnemyData, MagicSignType } from './types';

interface ActiveSignVFX {
  mesh: THREE.Object3D;
  light?: THREE.PointLight;
  initialLightIntensity?: number;
  timer: number;
  maxTimer: number;
  type: MagicSignType;
  originX?: number;
  originZ?: number;
  dirX?: number;
  dirZ?: number;
}

export class MagicSystem {
  private scene: THREE.Scene;
  private audio?: AudioManager;
  public cooldowns: Record<MagicSignType, number> = {
    flame: 0,
    barrier: 0,
    impulse: 0,
    illusion: 0,
    frost: 0,
  };
  private vfxList: ActiveSignVFX[] = [];
  public activeDecoy: {
    mesh: THREE.Group;
    x: number;
    z: number;
    timer: number;
  } | null = null;

  constructor(scene: THREE.Scene, audio?: AudioManager) {
    this.scene = scene;
    this.audio = audio;
  }

  public castSign(
    sign: MagicSignType,
    player: PlayerController,
    signIntensity: number,
    enemyAI: EnemyAI,
    combat: CombatSystem,
    obstacles: CollisionCylinder[],
    onEnemyKilled: (enemy: EnemyData) => void,
    addLog: (text: string, type: 'info' | 'damage' | 'quest' | 'loot') => void
  ): boolean {
    const def = MAGIC_SIGNS[sign];
    if (!def) return false;

    if (this.cooldowns[sign] > 0) {
      addLog(
        `Знак «${def.name}» восстанавливается (${this.cooldowns[sign].toFixed(1)} сек.)`,
        'info'
      );
      return false;
    }

    if (player.stats.stamina < def.staminaCost) {
      addLog(`Недостаточно выносливости для знака «${def.name}»!`, 'info');
      return false;
    }

    player.stats.stamina = Math.max(0, player.stats.stamina - def.staminaCost);
    this.cooldowns[sign] = def.cooldown;
    player.startSignCast();
    this.audio?.playSignCast(sign);

    const px = player.stats.x;
    const py = player.stats.y;
    const pz = player.stats.z;
    const rotY = player.stats.rotationY;

    if (sign === 'flame') {
      this.spawnFlameVFX(px, py, pz, rotY);
      combat.spawnDirectionalConeParticles(
        px,
        py + 1.15,
        pz,
        rotY,
        0xff5500,
        72,
        Math.PI * 0.38,
        6.5,
        13.5
      );
      combat.spawnDirectionalConeParticles(
        px,
        py + 1.15,
        pz,
        rotY,
        0xfde047,
        36,
        Math.PI * 0.28,
        7.5,
        14.5
      );

      let hitCount = 0;
      const baseDmg = Math.round(28 * signIntensity);
      for (const activeEnemy of enemyAI.enemies) {
        const ed = activeEnemy.data;
        if (ed.state === 'DEAD') continue;
        if (isTargetInAttackCone(px, pz, rotY, ed.x, ed.z, 6.2, Math.PI * 0.42)) {
          hitCount++;
          const dmg = ed.isSilverVulnerable ? Math.round(baseDmg * 1.25) : baseDmg;
          ed.hp = Math.max(0, ed.hp - dmg);
          ed.burnTimer = Math.max(ed.burnTimer, 4.5);
          enemyAI.triggerHitFlash(activeEnemy);
          combat.spawnHitParticles(ed.x, ed.y + 1.1, ed.z, 0xf97316, 20);
          if (ed.hp <= 0) {
            ed.state = 'DEAD';
            onEnemyKilled(ed);
          }
        }
      }
      addLog(
        hitCount > 0
          ? `Знак «${def.name}» опалил врагов (${hitCount}) и поджёг их!`
          : `Вы выпустили струю пламени знака «${def.name}».`,
        hitCount > 0 ? 'damage' : 'info'
      );
    } else if (sign === 'barrier') {
      const shieldAmount = Math.round(55 * signIntensity);
      player.stats.barrierShield = shieldAmount;
      this.spawnBarrierVFX(player.rig.root);
      addLog(
        `Знак «${def.name}» активирован: щит поглотит до ${shieldAmount} ед. урона и взорвётся при ударе!`,
        'info'
      );
    } else if (sign === 'impulse') {
      this.spawnImpulseVFX(px, py, pz, rotY);
      combat.spawnDirectionalConeParticles(
        px,
        py + 1.0,
        pz,
        rotY,
        0x38bdf8,
        54,
        Math.PI * 0.48,
        8.0,
        15.0
      );

      let hitCount = 0;
      const dmg = Math.round(16 * signIntensity);
      for (const activeEnemy of enemyAI.enemies) {
        const ed = activeEnemy.data;
        if (ed.state === 'DEAD') continue;
        const dist = Math.hypot(ed.x - px, ed.z - pz);
        if (dist <= 6.8) {
          hitCount++;
          if (ed.type === 'noonwraith' && ed.astralInvulnerable) {
            ed.astralInvulnerable = false;
            addLog(`Волна «Импульса» выбила Полуденницу из астрала!`, 'quest');
          }
          ed.hp = Math.max(0, ed.hp - dmg);
          ed.stunTimer = Math.max(ed.stunTimer, 2.4);

          const dx = ed.x - px;
          const dz = ed.z - pz;
          const d = Math.max(0.01, Math.hypot(dx, dz));
          let nx = ed.x + (dx / d) * 3.2;
          let nz = ed.z + (dz / d) * 3.2;
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
          combat.spawnHitParticles(ed.x, ed.y + 1.1, ed.z, 0x38bdf8, 18);

          if (ed.hp <= 0) {
            ed.state = 'DEAD';
            onEnemyKilled(ed);
          }
        }
      }
      addLog(
        hitCount > 0
          ? `Знак «${def.name}» отбросил и оглушил врагов (${hitCount})!`
          : `Телекинетическая волна «${def.name}» рассеяла воздух.`,
        hitCount > 0 ? 'damage' : 'info'
      );
    } else if (sign === 'illusion') {
      const decoyX = px + Math.sin(rotY) * 3.4;
      const decoyZ = pz + Math.cos(rotY) * 3.4;
      const decoyY = getGroundHeight(decoyX, decoyZ);
      this.spawnIllusionDecoy(decoyX, decoyY, decoyZ);

      for (const activeEnemy of enemyAI.enemies) {
        const ed = activeEnemy.data;
        if (ed.state === 'DEAD') continue;
        if (Math.hypot(ed.x - decoyX, ed.z - decoyZ) <= 9.0) {
          ed.slowTimer = Math.max(ed.slowTimer, 5.0);
        }
      }
      addLog(
        `Знак «${def.name}» создал астрального двойника на 6 сек. и замедлил врагов!`,
        'info'
      );
    } else if (sign === 'frost') {
      this.spawnFrostVFX(px, py, pz);
      let hitCount = 0;
      const dmg = Math.round(22 * signIntensity);
      for (const activeEnemy of enemyAI.enemies) {
        const ed = activeEnemy.data;
        if (ed.state === 'DEAD') continue;
        const dist = Math.hypot(ed.x - px, ed.z - pz);
        if (dist <= 6.5) {
          hitCount++;
          if (ed.type === 'noonwraith' && ed.astralInvulnerable) {
            ed.astralInvulnerable = false;
            addLog(`«Ледяная печать» сковала Полуденницу и лишила её астральной защиты!`, 'quest');
          }
          ed.hp = Math.max(0, ed.hp - dmg);
          ed.freezeTimer = Math.max(ed.freezeTimer ?? 0, 3.2);
          ed.slowTimer = Math.max(ed.slowTimer, 6.0);
          enemyAI.triggerHitFlash(activeEnemy);
          combat.spawnHitParticles(ed.x, ed.y + 1.0, ed.z, 0x38bdf8, 22);
          if (ed.hp <= 0) {
            ed.state = 'DEAD';
            onEnemyKilled(ed);
          }
        }
      }
      addLog(
        hitCount > 0
          ? `Знак «${def.name}» заморозил врагов (${hitCount}) вокруг вас!`
          : `Морозное кольцо «${def.name}» покрыло землю инеем.`,
        hitCount > 0 ? 'damage' : 'info'
      );
    }

    return true;
  }

  public triggerBarrierExplosion(
    player: PlayerController,
    enemyAI: EnemyAI,
    combat: CombatSystem,
    obstacles: CollisionCylinder[],
    onEnemyKilled: (enemy: EnemyData) => void,
    addLog: (text: string, type: 'info' | 'damage' | 'quest' | 'loot') => void
  ): void {
    const px = player.stats.x;
    const py = player.stats.y;
    const pz = player.stats.z;

    this.spawnDynamicFireLight(px, py + 1.3, pz, 4.2, 11, 0.45, 0xfacc15);

    for (const activeEnemy of enemyAI.enemies) {
      const ed = activeEnemy.data;
      if (ed.state === 'DEAD') continue;
      const dist = Math.hypot(ed.x - px, ed.z - pz);
      if (dist <= 5.2) {
        const dmg = 24;
        ed.hp = Math.max(0, ed.hp - dmg);
        ed.stunTimer = Math.max(ed.stunTimer, 1.8);
        const dx = ed.x - px;
        const dz = ed.z - pz;
        const d = Math.max(0.01, Math.hypot(dx, dz));
        let nx = ed.x + (dx / d) * 2.4;
        let nz = ed.z + (dz / d) * 2.4;
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
        combat.spawnHitParticles(ed.x, ed.y + 1.1, ed.z, 0xfacc15, 20);
        if (ed.hp <= 0) {
          ed.state = 'DEAD';
          onEnemyKilled(ed);
        }
      }
    }
    addLog('Щит «Барьер» поглотил удар и взорвался золотой волной, оглушив врагов!', 'quest');
  }

  /**
   * Spawns a rich multi-layered Flame Sign VFX with a dynamic THREE.PointLight
   * that travels forward with the fire stream and illuminates surrounding terrain/models.
   */
  private spawnFlameVFX(x: number, y: number, z: number, rotY: number): void {
    const group = new THREE.Group();
    const dirX = Math.sin(rotY);
    const dirZ = Math.cos(rotY);

    const outerGeo = new THREE.ConeGeometry(1.75, 4.6, 16, 1, true);
    outerGeo.rotateX(Math.PI / 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerCone = new THREE.Mesh(outerGeo, outerMat);
    group.add(outerCone);

    const innerGeo = new THREE.ConeGeometry(0.95, 3.8, 12, 1, true);
    innerGeo.rotateX(Math.PI / 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerCone = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerCone);

    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(0.35 + i * 0.35, 0.52 + i * 0.38, 18);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0xfef08a : 0xf97316,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = -1.0 + i * 1.1;
      group.add(ring);
    }

    const startX = x + dirX * 2.1;
    const startZ = z + dirZ * 2.1;
    group.position.set(startX, y + 1.15, startZ);
    group.rotation.y = rotY;
    this.scene.add(group);

    // Dynamic PointLight for fire skill illumination
    const fireLight = new THREE.PointLight(0xff6a00, 6.2, 16, 1.5);
    fireLight.position.set(startX, y + 1.5, startZ);
    this.scene.add(fireLight);

    this.vfxList.push({
      mesh: group,
      light: fireLight,
      initialLightIntensity: 6.2,
      timer: 0.58,
      maxTimer: 0.58,
      type: 'flame',
      originX: startX,
      originZ: startZ,
      dirX,
      dirZ,
    });
  }

  public spawnDynamicFireLight(
    x: number,
    y: number,
    z: number,
    intensity = 5.2,
    distance = 14,
    duration = 0.5,
    colorHex = 0xff5a00
  ): void {
    const dummy = new THREE.Group();
    dummy.position.set(x, y, z);
    this.scene.add(dummy);

    const light = new THREE.PointLight(colorHex, intensity, distance, 1.5);
    light.position.set(x, y, z);
    this.scene.add(light);

    this.vfxList.push({
      mesh: dummy,
      light,
      initialLightIntensity: intensity,
      timer: duration,
      maxTimer: duration,
      type: 'flame',
    });
  }

  private spawnBarrierVFX(parent: THREE.Object3D): void {
    const group = new THREE.Group();
    const sphereGeo = new THREE.IcosahedronGeometry(1.38, 1);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.y = 1.1;
    group.add(sphere);

    const haloGeo = new THREE.RingGeometry(1.15, 1.38, 24);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 0.15;
    group.add(halo);

    parent.add(group);
    this.vfxList.push({
      mesh: group,
      timer: 1.4,
      maxTimer: 1.4,
      type: 'barrier',
    });
  }

  private spawnImpulseVFX(x: number, y: number, z: number, rotY: number): void {
    const group = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.45, 3.2, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    const waveGeo = new THREE.TorusGeometry(1.8, 0.08, 8, 24, Math.PI);
    waveGeo.rotateX(Math.PI / 2);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wave = new THREE.Mesh(waveGeo, waveMat);
    wave.position.y = 0.8;
    wave.rotation.z = rotY;
    group.add(wave);

    group.position.set(x, y + 0.25, z);
    this.scene.add(group);

    this.vfxList.push({
      mesh: group,
      timer: 0.45,
      maxTimer: 0.45,
      type: 'impulse',
    });
  }

  private spawnIllusionDecoy(x: number, y: number, z: number): void {
    if (this.activeDecoy) {
      this.scene.remove(this.activeDecoy.mesh);
      this.activeDecoy = null;
    }

    const group = new THREE.Group();
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
    });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 1.5, 10), bodyMat);
    torso.position.y = 0.95;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 1), bodyMat);
    head.position.y = 1.95;
    group.add(head);

    const runeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.25, 20),
      new THREE.MeshBasicMaterial({
        color: 0xd8b4fe,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      })
    );
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.08;
    group.add(runeRing);

    group.position.set(x, y, z);
    this.scene.add(group);

    this.activeDecoy = {
      mesh: group,
      x,
      z,
      timer: 6.0,
    };
  }

  private spawnFrostVFX(x: number, y: number, z: number): void {
    const group = new THREE.Group();

    const ringGeo = new THREE.RingGeometry(0.5, 5.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    const shardMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 2.1 + (i % 2) * 1.1;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.45, 5), shardMat);
      shard.position.set(Math.cos(angle) * dist, 0.65, Math.sin(angle) * dist);
      shard.rotation.x = (Math.random() - 0.5) * 0.35;
      shard.rotation.z = (Math.random() - 0.5) * 0.35;
      group.add(shard);
    }

    const frostLight = new THREE.PointLight(0x38bdf8, 3.2, 11, 1.6);
    frostLight.position.set(x, y + 1.2, z);
    this.scene.add(frostLight);

    group.position.set(x, y + 0.12, z);
    this.scene.add(group);

    this.vfxList.push({
      mesh: group,
      light: frostLight,
      initialLightIntensity: 3.2,
      timer: 0.68,
      maxTimer: 0.68,
      type: 'frost',
    });
  }

  public update(dt: number, _enemyAI?: EnemyAI, _combat?: CombatSystem): void {
    (Object.keys(this.cooldowns) as MagicSignType[]).forEach((k) => {
      if (this.cooldowns[k] > 0) {
        this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
      }
    });

    if (this.activeDecoy) {
      this.activeDecoy.timer -= dt;
      this.activeDecoy.mesh.rotation.y += dt * 2.4;
      if (this.activeDecoy.timer <= 0) {
        this.scene.remove(this.activeDecoy.mesh);
        this.activeDecoy = null;
      }
    }

    for (let i = this.vfxList.length - 1; i >= 0; i--) {
      const vfx = this.vfxList[i];
      vfx.timer -= dt;
      const progress = 1 - Math.max(0, vfx.timer) / vfx.maxTimer;

      if (vfx.type === 'impulse' || vfx.type === 'frost') {
        const s = 0.65 + progress * 1.45;
        vfx.mesh.scale.set(s, 1 + progress * 0.35, s);
      } else if (vfx.type === 'flame') {
        const s = 0.85 + progress * 0.7;
        vfx.mesh.scale.set(s, s, 1 + progress * 0.55);
        if (
          vfx.originX !== undefined &&
          vfx.originZ !== undefined &&
          vfx.dirX !== undefined &&
          vfx.dirZ !== undefined
        ) {
          const travel = progress * 2.4;
          const nx = vfx.originX + vfx.dirX * travel;
          const nz = vfx.originZ + vfx.dirZ * travel;
          vfx.mesh.position.x = nx;
          vfx.mesh.position.z = nz;
          if (vfx.light) {
            vfx.light.position.x = nx;
            vfx.light.position.z = nz;
          }
        }
      } else if (vfx.type === 'barrier') {
        vfx.mesh.rotation.y += dt * 2.6;
      }

      if (vfx.light && vfx.initialLightIntensity !== undefined) {
        const flicker = 0.88 + Math.sin(progress * 28) * 0.12;
        vfx.light.intensity = Math.max(0, vfx.initialLightIntensity * (1 - progress) * flicker);
      }

      vfx.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshBasicMaterial;
          if (mat.transparent) {
            mat.opacity = Math.max(0, (1 - progress) * 0.82);
          }
        }
      });

      if (vfx.timer <= 0) {
        if (vfx.mesh.parent) {
          vfx.mesh.parent.remove(vfx.mesh);
        } else {
          this.scene.remove(vfx.mesh);
        }
        if (vfx.light) {
          this.scene.remove(vfx.light);
        }
        this.vfxList.splice(i, 1);
      }
    }
  }
}
