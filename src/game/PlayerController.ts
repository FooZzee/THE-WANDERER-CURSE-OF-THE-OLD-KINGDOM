import * as THREE from 'three';
import type { CharacterRig } from './AssetManager';
import { getGroundHeight } from './rules';
import type { CollisionCylinder } from './SceneManager';
import type { PlayerStats, SignType } from './types';

export type PlayerActionState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack_light'
  | 'attack_heavy'
  | 'block'
  | 'dodge'
  | 'cast_sign'
  | 'hit'
  | 'dead';

export type AttackPhase = 'none' | 'windup' | 'active' | 'recovery';

const SIGN_ORDER: SignType[] = ['flame', 'barrier', 'impulse', 'illusion', 'frost'];

export class PlayerController {
  public rig: CharacterRig;
  public stats: PlayerStats;
  public actionState: PlayerActionState = 'idle';

  // Input flags
  public keys: Record<string, boolean> = {};
  public joystickX = 0;
  public joystickY = 0;
  public isBlocking = false;

  // Timers & Combat windows
  public attackTimer = 0;
  public attackDuration = 0.42;
  public attackHitRegistered = false;
  public isHeavyAttack = false;
  public comboStep = 1;
  public comboResetTimer = 0;

  public dodgeTimer = 0;
  public dodgeDuration = 0.42;
  public dodgeDirX = 0;
  public dodgeDirZ = 0;

  public castTimer = 0;
  public hitStaggerTimer = 0;

  private animTime = 0;

  constructor(rig: CharacterRig, scene: THREE.Scene) {
    this.rig = rig;
    scene.add(this.rig.root);

    // Spawn player in Crow's Hollow Village facing North along the main road
    const startX = 0;
    const startZ = 6;
    const startY = getGroundHeight(startX, startZ);

    this.stats = {
      level: 1,
      xp: 0,
      xpToNext: 100,
      skillPoints: 1,
      hp: 160,
      maxHp: 140,
      stamina: 100,
      maxStamina: 100,
      toxicity: 0,
      maxToxicity: 100,
      gold: 85,
      baseAttack: 22,
      baseDefense: 8,
      signIntensity: 100,
      activeSign: 'flame',
      barrierShield: 0,
      potionCooldown: 0,
      x: startX,
      y: startY,
      z: startZ,
      rotationY: 0,
      activeBladeOil: 'none',
      bladeOilTimer: 0,
      placeOfPowerTimer: 0,
      catElixirTimer: 0,
      thunderElixirTimer: 0,
      blizzardElixirTimer: 0,
      factionChoice: 'none',
      diceChampionsDefeated: [],
      discoveredLoreIds: [],
      loreMasterUnlocked: false,
      secretEndingUnlocked: false,
      activeDecoction: 'none',
      decoctionTimer: 0,
      poisonTimer: 0,
      unlockedWaystones: ['ws_village'],
      viewedAshEchoIds: [],
      vesperFate: 'none',
    };

    this.rig.root.position.set(startX, startY, startZ);
  }

  /**
   * Returns current 3-phase attack state:
   * - windup (замах: 0%..30% of swing)
   * - active (активная фаза: 30%..70% of swing — hitbox active)
   * - recovery (восстановление: 70%..100% of swing)
   */
  public getAttackPhase(): AttackPhase {
    if (this.attackTimer <= 0 || this.attackDuration <= 0) return 'none';
    const progress = 1 - this.attackTimer / this.attackDuration;
    if (progress < 0.3) return 'windup';
    if (progress <= 0.72) return 'active';
    return 'recovery';
  }

  /**
   * True when the player is in invulnerability frames (i-frames) during a dodge roll.
   */
  public hasIFrames(): boolean {
    if (this.dodgeTimer <= 0) return false;
    const progress = 1 - this.dodgeTimer / this.dodgeDuration;
    return progress >= 0.05 && progress <= 0.85;
  }

  public cycleActiveSign(): SignType {
    const idx = SIGN_ORDER.indexOf(this.stats.activeSign);
    const next = SIGN_ORDER[(idx + 1) % SIGN_ORDER.length];
    this.stats.activeSign = next;
    return next;
  }

  public selectSign(sign: SignType): void {
    this.stats.activeSign = sign;
  }

  public startAttack(heavy: boolean, targetAngle?: number): boolean {
    // Allow chaining next light combo strike during late recovery window
    const phase = this.getAttackPhase();
    const canChainCombo = !heavy && phase === 'recovery';

    if (
      this.actionState === 'dead' ||
      this.dodgeTimer > 0 ||
      (this.attackTimer > 0 && !canChainCombo) ||
      this.castTimer > 0
    ) {
      return false;
    }

    const staminaCost = heavy ? 24 : 9;
    if (this.stats.stamina < staminaCost) {
      return false;
    }

    this.stats.stamina = Math.max(0, this.stats.stamina - staminaCost);
    this.isHeavyAttack = heavy;
    this.attackDuration = heavy ? 0.58 : 0.38;
    this.attackTimer = this.attackDuration;
    this.attackHitRegistered = false;

    if (this.comboResetTimer > 0 && !heavy) {
      this.comboStep = (this.comboStep % 3) + 1;
    } else {
      this.comboStep = 1;
    }
    this.comboResetTimer = 1.25;

    if (targetAngle !== undefined) {
      this.stats.rotationY = targetAngle;
    }

    this.actionState = heavy ? 'attack_heavy' : 'attack_light';
    return true;
  }

  public startDodge(cameraYaw: number, freeGrandmasterDash = false): boolean {
    const cost = freeGrandmasterDash ? 8 : 18;
    if (
      this.actionState === 'dead' ||
      this.dodgeTimer > 0 ||
      this.stats.stamina < cost
    ) {
      return false;
    }

    this.stats.stamina = Math.max(0, this.stats.stamina - cost);
    this.dodgeDuration = freeGrandmasterDash ? 0.36 : 0.42;
    this.dodgeTimer = this.dodgeDuration;
    this.attackTimer = 0;
    this.actionState = 'dodge';

    const moveVec = this.getInputDirection(cameraYaw);
    if (moveVec.lengthSq() > 0.01) {
      this.dodgeDirX = moveVec.x;
      this.dodgeDirZ = moveVec.z;
      this.stats.rotationY = Math.atan2(moveVec.x, moveVec.z);
    } else {
      // Evade forward/backward along facing
      this.dodgeDirX = Math.sin(this.stats.rotationY);
      this.dodgeDirZ = Math.cos(this.stats.rotationY);
    }
    return true;
  }

  public startSignCast(): void {
    this.castTimer = 0.34;
    this.actionState = 'cast_sign';
  }

  public triggerHitReaction(): void {
    if (this.actionState === 'dead') return;
    this.hitStaggerTimer = 0.24;
    if (this.attackTimer <= 0 && this.dodgeTimer <= 0) {
      this.actionState = 'hit';
    }
  }

  private getInputDirection(cameraYaw: number): THREE.Vector3 {
    let forward = 0;
    let right = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) right += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) right -= 1;

    if (Math.abs(this.joystickX) > 0.05 || Math.abs(this.joystickY) > 0.05) {
      right += this.joystickX;
      forward -= this.joystickY;
    }

    const dir = new THREE.Vector3();
    if (Math.abs(forward) > 0.01 || Math.abs(right) > 0.01) {
      const sinY = Math.sin(cameraYaw);
      const cosY = Math.cos(cameraYaw);
      dir.x = forward * sinY - right * cosY;
      dir.z = forward * cosY + right * sinY;
      dir.normalize();
    }
    return dir;
  }

  public update(
    dt: number,
    cameraYaw: number,
    obstacles: CollisionCylinder[]
  ): { isSprinting: boolean } {
    this.animTime += dt;

    if (this.stats.potionCooldown > 0) {
      this.stats.potionCooldown = Math.max(0, this.stats.potionCooldown - dt);
    }
    if (this.stats.toxicity > 0) {
      this.stats.toxicity = Math.max(0, this.stats.toxicity - 1.5 * dt);
    }
    if ((this.stats.bladeOilTimer ?? 0) > 0) {
      this.stats.bladeOilTimer = Math.max(0, (this.stats.bladeOilTimer ?? 0) - dt);
      if (this.stats.bladeOilTimer === 0) {
        this.stats.activeBladeOil = 'none';
      }
    }
    if ((this.stats.placeOfPowerTimer ?? 0) > 0) {
      this.stats.placeOfPowerTimer = Math.max(0, (this.stats.placeOfPowerTimer ?? 0) - dt);
    }
    if ((this.stats.catElixirTimer ?? 0) > 0) {
      this.stats.catElixirTimer = Math.max(0, (this.stats.catElixirTimer ?? 0) - dt);
    }
    if ((this.stats.thunderElixirTimer ?? 0) > 0) {
      this.stats.thunderElixirTimer = Math.max(0, (this.stats.thunderElixirTimer ?? 0) - dt);
    }
    if ((this.stats.blizzardElixirTimer ?? 0) > 0) {
      this.stats.blizzardElixirTimer = Math.max(0, (this.stats.blizzardElixirTimer ?? 0) - dt);
    }
    if ((this.stats.decoctionTimer ?? 0) > 0) {
      this.stats.decoctionTimer = Math.max(0, (this.stats.decoctionTimer ?? 0) - dt);
      if (this.stats.decoctionTimer === 0) {
        this.stats.activeDecoction = 'none';
      }
    }
    if ((this.stats.poisonTimer ?? 0) > 0) {
      this.stats.poisonTimer = Math.max(0, (this.stats.poisonTimer ?? 0) - dt);
      const isHydraImmune =
        this.stats.activeDecoction === 'hydra' && (this.stats.decoctionTimer ?? 0) > 0;
      if (!isHydraImmune && this.stats.hp > 1) {
        this.stats.hp = Math.max(1, this.stats.hp - 4.5 * dt);
      }
    }
    if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
    }

    // Update protective barrier visibility
    if (this.rig.shieldBubble) {
      this.rig.shieldBubble.visible = this.stats.barrierShield > 0;
      if (this.rig.shieldBubble.visible) {
        this.rig.shieldBubble.rotation.y += dt * 1.5;
      }
    }

    if (this.stats.hp <= 0) {
      this.actionState = 'dead';
      this.animateRig(dt);
      return { isSprinting: false };
    }

    // Handle active dodge roll with i-frames
    if (this.dodgeTimer > 0) {
      this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);
      const dodgeSpeed = 12.2;
      this.moveWithCollision(
        this.dodgeDirX * dodgeSpeed * dt,
        this.dodgeDirZ * dodgeSpeed * dt,
        obstacles
      );
      this.animateRig(dt);
      return { isSprinting: false };
    }

    // Handle 3-phase sword attack
    if (this.attackTimer > 0) {
      this.attackTimer = Math.max(0, this.attackTimer - dt);
      const phase = this.getAttackPhase();
      if (phase === 'active') {
        const lungeSpeed = this.isHeavyAttack ? 4.2 : 2.8;
        this.moveWithCollision(
          Math.sin(this.stats.rotationY) * lungeSpeed * dt,
          Math.cos(this.stats.rotationY) * lungeSpeed * dt,
          obstacles
        );
      }
      this.animateRig(dt);
      return { isSprinting: false };
    }

    if (this.castTimer > 0) {
      this.castTimer = Math.max(0, this.castTimer - dt);
      this.animateRig(dt);
      return { isSprinting: false };
    }

    if (this.hitStaggerTimer > 0) {
      this.hitStaggerTimer = Math.max(0, this.hitStaggerTimer - dt);
    }

    // Normal Movement & Stamina Regeneration
    const inputDir = this.getInputDirection(cameraYaw);
    const isMoving = inputDir.lengthSq() > 0.01;
    const wantsSprint =
      (this.keys['ShiftLeft'] || this.keys['ShiftRight']) &&
      isMoving &&
      !this.isBlocking &&
      this.stats.stamina > 5;

    if (wantsSprint) {
      this.stats.stamina = Math.max(0, this.stats.stamina - 14 * dt);
    } else {
      const regenRate = this.isBlocking ? 8 : 24;
      this.stats.stamina = Math.min(
        this.stats.maxStamina,
        this.stats.stamina + regenRate * dt
      );
    }

    if (this.isBlocking) {
      this.actionState = 'block';
    } else if (isMoving) {
      this.actionState = wantsSprint ? 'run' : 'walk';
    } else {
      this.actionState = 'idle';
    }

    if (isMoving) {
      const moveSpeed = this.isBlocking ? 2.8 : wantsSprint ? 8.5 : 5.5;
      this.moveWithCollision(
        inputDir.x * moveSpeed * dt,
        inputDir.z * moveSpeed * dt,
        obstacles
      );

      // Smoothly orient character toward movement direction
      const targetRotY = Math.atan2(inputDir.x, inputDir.z);
      let diff = targetRotY - this.stats.rotationY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.stats.rotationY += diff * Math.min(1, dt * 13);
    }

    this.animateRig(dt);
    return { isSprinting: Boolean(wantsSprint) };
  }

  private moveWithCollision(
    dx: number,
    dz: number,
    obstacles: CollisionCylinder[]
  ): void {
    let nextX = this.stats.x + dx;
    let nextZ = this.stats.z + dz;

    if (this.stats.x > 75 && this.stats.z > 75) {
      // Underground Catacombs chamber bounds
      nextX = Math.max(89, Math.min(121, nextX));
      nextZ = Math.max(89, Math.min(121, nextZ));
    } else if (nextZ < -95) {
      // Northern March expansion bounds (z down to -542, x in [-105, 105])
      nextX = Math.max(-105, Math.min(105, nextX));
      nextZ = Math.max(-542, nextZ);
    } else {
      const distFromOrigin = Math.hypot(nextX, nextZ);
      if (distFromOrigin > 108) {
        const scale = 108 / distFromOrigin;
        nextX *= scale;
        nextZ *= scale;
      }

      const riverZ = 34 + Math.sin(nextX * 0.03) * 6;
      if (Math.abs(nextZ - riverZ) < 5.2 && Math.abs(nextX) > 3.6) {
        nextZ = this.stats.z;
      }
    }

    const playerRadius = 0.48;
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const ox = nextX - obs.x;
      const oz = nextZ - obs.z;
      const dist = Math.hypot(ox, oz);
      const minDist = playerRadius + obs.radius;
      if (dist < minDist && dist > 0.0001) {
        const push = (minDist - dist) / dist;
        nextX += ox * push;
        nextZ += oz * push;
      }
    }

    this.stats.x = nextX;
    this.stats.z = nextZ;
    this.stats.y = getGroundHeight(nextX, nextZ);

    this.rig.root.position.set(this.stats.x, this.stats.y, this.stats.z);
    this.rig.root.rotation.y = this.stats.rotationY;
  }

  private animateRig(dt: number): void {
    const { body, head, leftArm, rightArm, leftLeg, rightLeg, cloak } = this.rig;

    if (this.actionState === 'dead') {
      this.rig.root.rotation.x = THREE.MathUtils.damp(
        this.rig.root.rotation.x,
        -Math.PI / 2.1,
        8,
        dt
      );
      return;
    } else {
      this.rig.root.rotation.x = THREE.MathUtils.damp(this.rig.root.rotation.x, 0, 12, dt);
    }

    if (this.actionState === 'walk' || this.actionState === 'run') {
      const freq = this.actionState === 'run' ? 11.5 : 7.8;
      const amp = this.actionState === 'run' ? 0.68 : 0.44;
      const s = Math.sin(this.animTime * freq);

      leftLeg.rotation.x = s * amp;
      rightLeg.rotation.x = -s * amp;
      leftArm.rotation.x = -s * amp * 0.7;
      rightArm.rotation.x = s * amp * 0.5;
      rightArm.rotation.z = 0;
      body.position.y = 0.85 + Math.abs(Math.cos(this.animTime * freq)) * 0.055;
      body.rotation.x = this.actionState === 'run' ? 0.16 : 0.06;
      body.rotation.y = THREE.MathUtils.damp(body.rotation.y, 0, 10, dt);
      head.rotation.y = THREE.MathUtils.damp(head.rotation.y, 0, 10, dt);
      if (cloak) cloak.rotation.x = 0.28 + Math.abs(s) * 0.2;
    } else if (
      this.actionState === 'attack_light' ||
      this.actionState === 'attack_heavy'
    ) {
      const progress = 1 - this.attackTimer / Math.max(0.01, this.attackDuration);
      const phase = this.getAttackPhase();

      if (this.isHeavyAttack) {
        // 3-phase Heavy Cleave: Windup overhead -> Active downward slash -> Recovery
        if (phase === 'windup') {
          const w = progress / 0.3;
          rightArm.rotation.x = THREE.MathUtils.lerp(-0.4, -2.55, w);
          rightArm.rotation.z = THREE.MathUtils.lerp(0, -0.2, w);
          body.rotation.x = THREE.MathUtils.lerp(0, -0.22, w);
          body.rotation.y = THREE.MathUtils.lerp(0, -0.45, w);
        } else if (phase === 'active') {
          const a = (progress - 0.3) / 0.42;
          rightArm.rotation.x = THREE.MathUtils.lerp(-2.55, 0.75, a);
          rightArm.rotation.z = -0.15;
          body.rotation.x = THREE.MathUtils.lerp(-0.22, 0.32, a);
          body.rotation.y = THREE.MathUtils.lerp(-0.45, 0.5, a);
        } else {
          const r = (progress - 0.72) / 0.28;
          rightArm.rotation.x = THREE.MathUtils.lerp(0.75, -0.2, r);
          body.rotation.x = THREE.MathUtils.lerp(0.32, 0, r);
          body.rotation.y = THREE.MathUtils.lerp(0.5, 0, r);
        }
      } else {
        // 3-Step Fast Sword Combo (Diagonal Slash -> Reverse Slash -> Spinning Cut)
        const dir = this.comboStep % 2 === 1 ? 1 : -1;
        if (phase === 'windup') {
          const w = progress / 0.3;
          rightArm.rotation.x = THREE.MathUtils.lerp(-0.3, -1.75, w);
          rightArm.rotation.z = dir * THREE.MathUtils.lerp(0, -0.85, w);
          body.rotation.y = dir * THREE.MathUtils.lerp(0, -0.45, w);
        } else if (phase === 'active') {
          const a = (progress - 0.3) / 0.42;
          rightArm.rotation.x = THREE.MathUtils.lerp(-1.75, 0.35, a);
          rightArm.rotation.z = dir * THREE.MathUtils.lerp(-0.85, 0.85, a);
          body.rotation.y =
            this.comboStep === 3
              ? a * Math.PI * 2
              : dir * THREE.MathUtils.lerp(-0.45, 0.55, a);
          body.rotation.x = 0.18;
        } else {
          const r = (progress - 0.72) / 0.28;
          rightArm.rotation.x = THREE.MathUtils.lerp(0.35, -0.2, r);
          rightArm.rotation.z = THREE.MathUtils.lerp(dir * 0.85, 0, r);
          body.rotation.y = THREE.MathUtils.lerp(0.3, 0, r);
          body.rotation.x = THREE.MathUtils.lerp(0.18, 0, r);
        }
      }
      leftArm.rotation.x = -0.45;
      if (cloak) cloak.rotation.x = 0.38;
    } else if (this.actionState === 'block') {
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -1.25, 14, dt);
      rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -0.75, 14, dt);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.85, 14, dt);
      body.rotation.y = THREE.MathUtils.damp(body.rotation.y, -0.25, 14, dt);
      body.rotation.x = THREE.MathUtils.damp(body.rotation.x, 0.08, 14, dt);
    } else if (this.actionState === 'dodge') {
      // Dynamic forward combat roll / somersault tuck
      const rollProgress = 1 - this.dodgeTimer / Math.max(0.01, this.dodgeDuration);
      body.rotation.x = rollProgress * Math.PI * 2;
      body.position.y = 0.65 + Math.sin(rollProgress * Math.PI) * 0.25;
      leftLeg.rotation.x = -0.75;
      rightLeg.rotation.x = -0.75;
      leftArm.rotation.x = -1.1;
      rightArm.rotation.x = -1.1;
      if (cloak) cloak.rotation.x = 0.65;
    } else if (this.actionState === 'cast_sign') {
      leftArm.rotation.x = -1.6;
      rightArm.rotation.x = -0.3;
      body.rotation.y = 0.28;
    } else if (this.actionState === 'hit') {
      body.rotation.x = -0.28;
      head.rotation.x = -0.25;
    } else {
      // Idle breathing
      const breath = Math.sin(this.animTime * 2.4) * 0.025;
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 10, dt);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 10, dt);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, breath, 10, dt);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -0.15 + breath, 10, dt);
      rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, 0, 10, dt);
      body.rotation.y = THREE.MathUtils.damp(body.rotation.y, 0, 10, dt);
      body.rotation.x = THREE.MathUtils.damp(body.rotation.x, 0, 10, dt);
      head.rotation.x = THREE.MathUtils.damp(head.rotation.x, 0, 10, dt);
      body.position.y = 0.85 + breath;
      if (cloak) cloak.rotation.x = 0.08 + Math.abs(breath) * 2;
    }
  }
}
