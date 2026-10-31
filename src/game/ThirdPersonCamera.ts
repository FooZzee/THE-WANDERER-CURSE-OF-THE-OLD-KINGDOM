import * as THREE from 'three';
import {
  getGroundHeight,
  type ScreenShakeKind,
  type ScreenShakeProfile,
} from './rules';
import type { CollisionCylinder } from './SceneManager';

const _targetPos = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _meshWorldPos = new THREE.Vector3();
const _nearbyColliders: THREE.Object3D[] = [];

export interface ActiveScreenShakeState {
  active: boolean;
  kind: ScreenShakeKind;
  intensity: number;
  timer: number;
  duration: number;
  trauma: number;
  offsetX: number;
  offsetY: number;
  flashColor: string | null;
  flashOpacity: number;
}

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera;
  public yaw = 0; // Horizontal angle around player (radians)
  public pitch = 0.32; // Vertical elevation angle (radians)
  public distance = 5.4;
  public isPointerLocked = false;

  private currentLookAt = new THREE.Vector3(0, 1.5, 0);
  private raycaster = new THREE.Raycaster();
  private shakeTimer = 0;
  private shakeDuration = 0.18;
  private shakeIntensity = 0;
  private shakeRollAmplitude = 0;
  private shakeFovPunch = 0;
  private shakeKind: ScreenShakeKind = 'none';
  private shakeFlashColor: string | null = null;
  private shakeFlashBaseOpacity = 0;
  private shakeElapsed = 0;
  private lastShakeOffsetX = 0;
  private lastShakeOffsetY = 0;
  private domElement: HTMLElement | null = null;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.15, 240);
    this.camera.position.set(0, 3.2, -5.4);
  }

  public attachPointerLock(canvas: HTMLElement, canLock: () => boolean): void {
    this.domElement = canvas;

    const onPointerLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    };

    const onCanvasClick = () => {
      if (!canLock()) return;
      if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
        try {
          const promise = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
          if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {});
          }
        } catch {
          // Fallback to drag look if Pointer Lock is blocked by sandbox
        }
      }
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvas.addEventListener('click', onCanvasClick);
  }

  public unlockPointer(): void {
    if (document.pointerLockElement && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch {
        // ignore
      }
    }
    this.isPointerLocked = false;
  }

  public rotate(deltaX: number, deltaY: number): void {
    const sensitivity = 0.003;
    this.yaw -= deltaX * sensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + deltaY * sensitivity,
      0.06,
      1.18
    );
  }

  public addShake(
    intensity = 0.18,
    duration = 0.18,
    profile?: ScreenShakeProfile
  ): void {
    const nextIntensity = profile ? profile.intensity : intensity;
    const nextDuration = profile ? profile.duration : duration;

    // Trauma priority: prevent a weak hit from overriding a stronger active critical/boss shake
    const remainingRatio =
      this.shakeTimer > 0 && this.shakeDuration > 0
        ? this.shakeTimer / this.shakeDuration
        : 0;
    const currentEffectiveIntensity = this.shakeIntensity * remainingRatio;

    if (nextIntensity >= currentEffectiveIntensity * 0.85 || this.shakeTimer <= 0) {
      this.shakeIntensity = Math.max(currentEffectiveIntensity, nextIntensity);
      this.shakeDuration = Math.max(this.shakeTimer, nextDuration);
      this.shakeTimer = this.shakeDuration;
      this.shakeRollAmplitude = profile ? profile.rollAmplitude : nextIntensity * 0.065;
      this.shakeFovPunch = profile ? profile.fovPunch : nextIntensity * 5.0;
      this.shakeKind = profile
        ? profile.kind
        : nextIntensity >= 0.3
        ? 'heavy_enemy_attack'
        : nextIntensity >= 0.2
        ? 'heavy_hit'
        : 'light_hit';
      this.shakeFlashColor = profile
        ? profile.flashColor
        : nextIntensity >= 0.25
        ? '#ef4444'
        : null;
      this.shakeFlashBaseOpacity = profile
        ? profile.flashOpacity
        : nextIntensity >= 0.25
        ? 0.3
        : 0;
      this.shakeElapsed = 0;

      // Compute immediate initial jolt offset so getShakeState() is non-zero on frame 0
      this.lastShakeOffsetX = (Math.random() > 0.5 ? 1 : -1) * this.shakeIntensity * 14;
      this.lastShakeOffsetY = -this.shakeIntensity * 11;
    }
  }

  public getShakeState(): ActiveScreenShakeState {
    if (this.shakeTimer <= 0 || this.shakeDuration <= 0) {
      return {
        active: false,
        kind: 'none',
        intensity: 0,
        timer: 0,
        duration: 0,
        trauma: 0,
        offsetX: 0,
        offsetY: 0,
        flashColor: null,
        flashOpacity: 0,
      };
    }
    const decay = Math.max(0, Math.min(1, this.shakeTimer / this.shakeDuration));
    const trauma = decay * (0.45 + 0.55 * decay);
    return {
      active: true,
      kind: this.shakeKind,
      intensity: this.shakeIntensity,
      timer: this.shakeTimer,
      duration: this.shakeDuration,
      trauma,
      offsetX: Number(this.lastShakeOffsetX.toFixed(2)),
      offsetY: Number(this.lastShakeOffsetY.toFixed(2)),
      flashColor: this.shakeFlashColor,
      flashOpacity: Number((this.shakeFlashBaseOpacity * trauma).toFixed(3)),
    };
  }

  public isDialogueMode = false;
  private dialogueNpcPos: THREE.Vector3 | null = null;

  public setDialogueTarget(npcPos: THREE.Vector3): void {
    this.isDialogueMode = true;
    this.dialogueNpcPos = npcPos.clone();
  }

  public clearDialogueTarget(): void {
    this.isDialogueMode = false;
    this.dialogueNpcPos = null;
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    isSprinting: boolean,
    obstacles: CollisionCylinder[],
    colliderMeshes: THREE.Object3D[] = []
  ): void {
    const decay =
      this.shakeTimer > 0 && this.shakeDuration > 0
        ? Math.max(0, Math.min(1, this.shakeTimer / this.shakeDuration))
        : 0;
    const trauma = decay * (0.45 + 0.55 * decay);

    // Cinematic FOV: narrower 46° in dialogue, wider in sprint, plus visceral FOV punch on heavy/crit hits
    const baseFov = this.isDialogueMode ? 46 : isSprinting ? 66 : 60;
    const targetFov = baseFov + (this.shakeTimer > 0 ? this.shakeFovPunch * trauma : 0);
    if (Math.abs(this.camera.fov - targetFov) > 0.08) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 10, dt);
      this.camera.updateProjectionMatrix();
    }

    // Target point: NPC chest/head in dialogue, player chest in exploration
    if (this.isDialogueMode && this.dialogueNpcPos) {
      _targetPos.set(
        this.dialogueNpcPos.x,
        this.dialogueNpcPos.y + 1.45,
        this.dialogueNpcPos.z
      );
    } else {
      _targetPos.set(playerX, playerY + 1.55, playerZ);
    }
    const lerpAlpha = 1 - Math.exp(-14 * dt);
    this.currentLookAt.lerp(_targetPos, lerpAlpha);

    // Compute camera spherical offset behind player with over-the-shoulder bias in dialogue
    const targetDist = this.isDialogueMode ? 2.7 : this.distance;
    const horizDist = targetDist * Math.cos(this.pitch);
    const vertDist = (this.isDialogueMode ? 1.15 : targetDist) * Math.sin(this.pitch);

    let offsetX = -Math.sin(this.yaw) * horizDist;
    let offsetZ = -Math.cos(this.yaw) * horizDist;

    if (this.isDialogueMode) {
      const shoulderX = Math.cos(this.yaw) * 0.65;
      const shoulderZ = -Math.sin(this.yaw) * 0.65;
      offsetX += shoulderX;
      offsetZ += shoulderZ;
    }

    let effectiveDist = targetDist;

    // 1. Raycaster collision check against nearby building meshes only (within 20m)
    _rayDir.set(offsetX, vertDist, offsetZ).normalize();
    this.raycaster.set(this.currentLookAt, _rayDir);
    this.raycaster.near = 0.2;
    this.raycaster.far = this.distance;

    if (colliderMeshes.length > 0) {
      _nearbyColliders.length = 0;
      for (let i = 0; i < colliderMeshes.length; i++) {
        const m = colliderMeshes[i];
        _meshWorldPos.setFromMatrixPosition(m.matrixWorld);
        const dx = _meshWorldPos.x - playerX;
        const dz = _meshWorldPos.z - playerZ;
        if (dx * dx + dz * dz <= 400) {
          _nearbyColliders.push(m);
        }
      }
      if (_nearbyColliders.length > 0) {
        const hits = this.raycaster.intersectObjects(_nearbyColliders, false);
        if (hits.length > 0 && hits[0].distance < effectiveDist) {
          effectiveDist = Math.max(1.4, hits[0].distance - 0.35);
        }
      }
    }

    // 2. Cylinder obstacle fallback check for fast analytical pull-in
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.radius < 1.3) continue;
      const dx = obs.x - playerX;
      const dz = obs.z - playerZ;
      const distToPlayer = Math.hypot(dx, dz);
      if (distToPlayer > this.distance + obs.radius) continue;

      const rayDirX = offsetX / this.distance;
      const rayDirZ = offsetZ / this.distance;
      const proj = dx * rayDirX + dz * rayDirZ;
      if (proj > 0 && proj < effectiveDist) {
        const perpDistSq = dx * dx + dz * dz - proj * proj;
        const minClearance = obs.radius + 0.35;
        if (perpDistSq < minClearance * minClearance) {
          effectiveDist = Math.max(1.5, proj - minClearance);
        }
      }
    }

    const scaleRatio = effectiveDist / this.distance;
    _desiredCamPos.set(
      this.currentLookAt.x + offsetX * scaleRatio,
      this.currentLookAt.y + vertDist * scaleRatio,
      this.currentLookAt.z + offsetZ * scaleRatio
    );

    // Ensure camera stays above terrain height
    const groundAtCam = getGroundHeight(_desiredCamPos.x, _desiredCamPos.z);
    if (_desiredCamPos.y < groundAtCam + 0.65) {
      _desiredCamPos.y = groundAtCam + 0.65;
    }

    // Smooth camera position lerp/damping
    const camLerp = 1 - Math.exp(-15 * dt);
    this.camera.position.lerp(_desiredCamPos, camLerp);

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      this.shakeElapsed += dt;

      // Damped harmonic + stochastic camera trauma across X, Y, Z and rotational roll
      const waveX =
        Math.sin(this.shakeElapsed * 58.0) * 0.65 +
        Math.cos(this.shakeElapsed * 93.0) * 0.35 +
        (Math.random() - 0.5) * 0.45;
      const waveY =
        Math.cos(this.shakeElapsed * 64.0) * 0.65 +
        Math.sin(this.shakeElapsed * 107.0) * 0.35 +
        (Math.random() - 0.5) * 0.45;
      const waveZ = Math.sin(this.shakeElapsed * 47.0) * 0.5;

      const amp = this.shakeIntensity * trauma;
      this.camera.position.x += waveX * amp;
      this.camera.position.y += waveY * amp;
      this.camera.position.z += waveZ * amp * 0.65;

      this.lastShakeOffsetX = waveX * amp * 28;
      this.lastShakeOffsetY = waveY * amp * 24;

      this.camera.lookAt(this.currentLookAt);
      this.camera.rotation.z +=
        Math.sin(this.shakeElapsed * 52.0) * this.shakeRollAmplitude * trauma;

      if (this.shakeTimer === 0) {
        this.shakeKind = 'none';
        this.shakeFlashColor = null;
        this.shakeFlashBaseOpacity = 0;
        this.lastShakeOffsetX = 0;
        this.lastShakeOffsetY = 0;
      }
    } else {
      this.camera.lookAt(this.currentLookAt);
    }
  }

  public handleResize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }
}
