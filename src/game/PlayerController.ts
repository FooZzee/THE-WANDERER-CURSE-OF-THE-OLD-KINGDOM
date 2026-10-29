import * as THREE from 'three';
import type { CharacterRig } from './AssetManager';
import { getGroundHeight, resolveSlidingCollision } from './rules';
import type { CollisionCylinder } from './SceneManager';
import type { ActiveSwordType, CollisionBox, PlayerStats, SignType } from './types';

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
  public potionDrinkTimer = 0;
  public swordSwapTimer = 0;
  public swordSwapDuration = 0.45;

  private animTime = 0;
  private prevRotationY = 0;
  private turnAngularVelocity = 0;

  public triggerDrinkAnimation(): void {
    this.potionDrinkTimer = 0.95;
  }

  public switchSword(swordType: ActiveSwordType): boolean {
    if (this.actionState === 'dead') return false;
    const current = this.stats.activeSword ?? 'steel';
    if (current === swordType && this.swordSwapTimer <= 0) {
      return false;
    }
    this.stats.activeSword = swordType;
    this.swordSwapTimer = this.swordSwapDuration;
    this.stats.swordSwapTimer = this.swordSwapDuration;
    return true;
  }

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
      activeSword: 'steel',
      swordSwapTimer: 0,
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
      reputation: 0,
      activeCompanionId: null,
      unlockedCompanions: ['lyra', 'thorvald'],
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
    obstacles: CollisionCylinder[],
    collisionBoxes: CollisionBox[] = []
  ): { isSprinting: boolean } {
    this.animTime += dt;

    if (this.swordSwapTimer > 0) {
      this.swordSwapTimer = Math.max(0, this.swordSwapTimer - dt);
      this.stats.swordSwapTimer = this.swordSwapTimer;
    }

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
        obstacles,
        collisionBoxes
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
          obstacles,
          collisionBoxes
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
    const joyMag = Math.hypot(this.joystickX, this.joystickY);
    const wantsSprint =
      (this.keys['ShiftLeft'] ||
        this.keys['ShiftRight'] ||
        this.keys['MobileSprint'] ||
        joyMag > 0.82) &&
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
      const baseMoveSpeed = this.isBlocking ? 2.8 : wantsSprint ? 8.5 : 5.5;
      const analogScale =
        joyMag > 0.05 && !wantsSprint ? Math.max(0.45, Math.min(1, joyMag / 0.82)) : 1;
      const moveSpeed = baseMoveSpeed * analogScale;
      this.moveWithCollision(
        inputDir.x * moveSpeed * dt,
        inputDir.z * moveSpeed * dt,
        obstacles,
        collisionBoxes
      );

      // Smoothly orient character toward movement direction
      const targetRotY = Math.atan2(inputDir.x, inputDir.z);
      let diff = targetRotY - this.stats.rotationY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.stats.rotationY += diff * Math.min(1, dt * 13);
    }

    // Compute angular turning speed for procedural banking / lean
    let deltaRot = this.stats.rotationY - this.prevRotationY;
    while (deltaRot > Math.PI) deltaRot -= Math.PI * 2;
    while (deltaRot < -Math.PI) deltaRot += Math.PI * 2;
    this.turnAngularVelocity = THREE.MathUtils.damp(
      this.turnAngularVelocity,
      deltaRot / Math.max(0.001, dt),
      8,
      dt
    );
    this.prevRotationY = this.stats.rotationY;

    this.animateRig(dt);
    return { isSprinting: Boolean(wantsSprint) };
  }

  private moveWithCollision(
    dx: number,
    dz: number,
    obstacles: CollisionCylinder[],
    collisionBoxes: CollisionBox[] = []
  ): void {
    let nextX = this.stats.x + dx;
    let nextZ = this.stats.z + dz;

    if (this.stats.x > 82 && this.stats.x < 126 && this.stats.z > 82 && this.stats.z < 126) {
      // Underground Catacombs chamber bounds
      nextX = Math.max(89, Math.min(121, nextX));
      nextZ = Math.max(89, Math.min(121, nextZ));
    } else if (nextZ < -95) {
      // Massively expanded Northern March & Starfall Valley bounds (z down to -705, x in [-165, 165])
      nextX = Math.max(-165, Math.min(165, nextX));
      nextZ = Math.max(-705, nextZ);
    } else {
      // Expanded Central Valley, Sunken Port Solheim (West) & Sun Monastery (East)
      nextX = Math.max(-205, Math.min(205, nextX));
      nextZ = Math.max(-95, Math.min(128, nextZ));

      const riverZ = 34 + Math.sin(nextX * 0.03) * 6;
      const onBridge =
        Math.abs(nextX) <= 3.8 ||
        Math.abs(nextX + 52) <= 3.8 ||
        Math.abs(nextX - 52) <= 3.8 ||
        Math.abs(nextX) > 108;
      if (Math.abs(nextZ - riverZ) < 5.2 && !onBridge) {
        nextZ = this.stats.z;
      }
    }

    const playerRadius = 0.48;
    const resolved = resolveSlidingCollision(
      this.stats.x,
      this.stats.z,
      nextX,
      nextZ,
      playerRadius,
      obstacles,
      collisionBoxes
    );

    this.stats.x = resolved.x;
    this.stats.z = resolved.z;
    this.stats.y = resolved.y;

    this.rig.root.position.set(this.stats.x, this.stats.y, this.stats.z);
    this.rig.root.rotation.y = this.stats.rotationY;
  }

  private animateRig(dt: number): void {
    const { body, head, leftArm, rightArm, leftLeg, rightLeg, cloak, cloakLower } = this.rig;

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

    // Health-dependent limp state (wounded when HP < 20%)
    const hpRatio = this.stats.hp / Math.max(1, this.stats.maxHp);
    const isWoundedLimp = hpRatio < 0.2 && this.actionState !== 'dodge';

    if (this.actionState === 'walk' || this.actionState === 'run') {
      const isRun = this.actionState === 'run' && !isWoundedLimp;
      const freq = isWoundedLimp ? 6.2 : isRun ? 11.5 : 7.8;
      const amp = isWoundedLimp ? 0.38 : isRun ? 0.68 : 0.44;
      const s = Math.sin(this.animTime * freq);

      if (isWoundedLimp) {
        // Asymmetric wounded limp gait: right foot favored, left dragging, hunched torso
        leftLeg.rotation.x = s * amp * 0.45;
        rightLeg.rotation.x = -s * amp * 1.25;
        body.rotation.z = THREE.MathUtils.damp(body.rotation.z, -0.16, 8, dt);
        body.rotation.x = THREE.MathUtils.damp(body.rotation.x, 0.24, 8, dt);
        body.position.y = 0.81 + Math.abs(Math.cos(this.animTime * freq)) * 0.04;
      } else {
        leftLeg.rotation.x = s * amp;
        rightLeg.rotation.x = -s * amp;
        body.position.y = 0.85 + Math.abs(Math.cos(this.animTime * freq)) * 0.055;
        body.rotation.x = isRun ? 0.16 : 0.06;

        // Lean banking into turns like in The Witcher 3
        const bank = THREE.MathUtils.clamp(this.turnAngularVelocity * 0.09, -0.25, 0.25);
        body.rotation.z = THREE.MathUtils.damp(body.rotation.z, -bank, 8, dt);
      }

      leftArm.rotation.x = -s * amp * 0.7;
      rightArm.rotation.x = s * amp * 0.5;
      rightArm.rotation.z = 0;
      body.rotation.y = THREE.MathUtils.damp(body.rotation.y, 0, 10, dt);
      head.rotation.y = THREE.MathUtils.damp(head.rotation.y, 0, 10, dt);

      // Flowing dynamic cloak trailing
      if (cloak) {
        const cloakSway = 0.28 + Math.abs(s) * (isRun ? 0.35 : 0.18);
        cloak.rotation.x = THREE.MathUtils.damp(cloak.rotation.x, cloakSway, 10, dt);
        cloak.rotation.z = THREE.MathUtils.damp(cloak.rotation.z, -body.rotation.z * 1.3, 8, dt);
        if (cloakLower) {
          cloakLower.rotation.x = THREE.MathUtils.damp(
            cloakLower.rotation.x,
            cloakSway * 1.4 + (isRun ? 0.3 : 0.1),
            12,
            dt
          );
        }
      }
    } else if (
      this.actionState === 'attack_light' ||
      this.actionState === 'attack_heavy'
    ) {
      const progress = 1 - this.attackTimer / Math.max(0.01, this.attackDuration);
      const phase = this.getAttackPhase();

      if (this.isHeavyAttack) {
        // 3-phase Heavy Cleave: Windup overhead -> Active downward slash -> Recovery with follow-through
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
          // Recovery with blade inertia follow-through
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
      if (cloak) {
        cloak.rotation.x = 0.38;
        if (cloakLower) cloakLower.rotation.x = 0.55;
      }
    } else if (this.actionState === 'block') {
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -1.25, 14, dt);
      rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -0.75, 14, dt);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.85, 14, dt);
      body.rotation.y = THREE.MathUtils.damp(body.rotation.y, -0.25, 14, dt);
      body.rotation.x = THREE.MathUtils.damp(body.rotation.x, 0.08, 14, dt);
      body.rotation.z = THREE.MathUtils.damp(body.rotation.z, 0, 14, dt);
    } else if (this.actionState === 'dodge') {
      // Dynamic forward combat roll / somersault tuck
      const rollProgress = 1 - this.dodgeTimer / Math.max(0.01, this.dodgeDuration);
      body.rotation.x = rollProgress * Math.PI * 2;
      body.position.y = 0.65 + Math.sin(rollProgress * Math.PI) * 0.25;
      body.rotation.z = THREE.MathUtils.damp(body.rotation.z, 0, 14, dt);
      leftLeg.rotation.x = -0.75;
      rightLeg.rotation.x = -0.75;
      leftArm.rotation.x = -1.1;
      rightArm.rotation.x = -1.1;
      if (cloak) {
        cloak.rotation.x = 0.65;
        if (cloakLower) cloakLower.rotation.x = 0.85;
      }
    } else if (this.actionState === 'cast_sign') {
      leftArm.rotation.x = -1.6;
      rightArm.rotation.x = -0.3;
      body.rotation.y = 0.28;
      body.rotation.z = THREE.MathUtils.damp(body.rotation.z, 0, 14, dt);
    } else if (this.actionState === 'hit') {
      body.rotation.x = -0.28;
      head.rotation.x = -0.25;
      body.rotation.z = THREE.MathUtils.damp(body.rotation.z, 0, 14, dt);
    } else {
      // Idle breathing: subtle chest expansion and head nodding cycle
      const breath = Math.sin(this.animTime * 2.2) * 0.028;
      body.scale.set(1 + breath * 0.35, 1 + breath * 0.7, 1 + breath * 0.35);

      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 10, dt);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 10, dt);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, breath, 10, dt);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -0.15 + breath, 10, dt);
      rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, 0, 10, dt);
      body.rotation.y = THREE.MathUtils.damp(body.rotation.y, 0, 10, dt);
      body.rotation.x = THREE.MathUtils.damp(body.rotation.x, 0, 10, dt);
      body.rotation.z = THREE.MathUtils.damp(body.rotation.z, 0, 10, dt);
      head.rotation.x = THREE.MathUtils.damp(head.rotation.x, breath * 0.5, 8, dt);
      body.position.y = 0.85 + breath;

      if (cloak) {
        cloak.rotation.x = THREE.MathUtils.damp(cloak.rotation.x, 0.08 + Math.abs(breath) * 1.5, 6, dt);
        if (cloakLower) {
          cloakLower.rotation.x = THREE.MathUtils.damp(cloakLower.rotation.x, 0.12 + Math.abs(breath) * 2, 6, dt);
        }
      }
    }

    // Potion Drinking Overlay Animation (raising vial with left hand while moving)
    if (this.potionDrinkTimer > 0) {
      this.potionDrinkTimer -= dt;
      const drinkPhase = Math.sin((1 - this.potionDrinkTimer / 0.95) * Math.PI);
      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -2.15, drinkPhase);
      leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.42, drinkPhase);
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -0.28, drinkPhase * 0.8);
    }

    // Sword Draw / Swap Animation (reaching behind shoulder to scabbards and drawing active blade)
    if (this.swordSwapTimer > 0 && this.attackTimer <= 0) {
      const progress = 1 - this.swordSwapTimer / Math.max(0.01, this.swordSwapDuration);
      if (progress < 0.48) {
        // Phase 1: Reach up behind right shoulder to back scabbards
        const t = progress / 0.48;
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -2.55, t);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.48, t);
        body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, -0.24, t);
      } else {
        // Phase 2: Sweep newly drawn sword out in a crisp arc
        const t = (progress - 0.48) / 0.52;
        rightArm.rotation.x = THREE.MathUtils.lerp(-2.55, -0.15, t);
        rightArm.rotation.z = THREE.MathUtils.lerp(0.48, -0.35 * (1 - t), t);
        body.rotation.y = THREE.MathUtils.lerp(-0.24, 0, t);
      }
    }
  }
}
