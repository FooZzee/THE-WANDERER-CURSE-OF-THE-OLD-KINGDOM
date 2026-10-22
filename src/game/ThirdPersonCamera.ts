import * as THREE from 'three';
import { getGroundHeight } from './rules';
import type { CollisionCylinder } from './SceneManager';

const _targetPos = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _rayDir = new THREE.Vector3();

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera;
  public yaw = 0; // Horizontal angle around player (radians)
  public pitch = 0.32; // Vertical elevation angle (radians)
  public distance = 5.4;
  public isPointerLocked = false;

  private currentLookAt = new THREE.Vector3(0, 1.5, 0);
  private raycaster = new THREE.Raycaster();
  private shakeTimer = 0;
  private shakeIntensity = 0;
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

  public addShake(intensity = 0.18, duration = 0.18): void {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
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
    // Subtle FOV widening during sprint
    const targetFov = isSprinting ? 66 : 60;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }

    // Target point is player's upper chest/shoulder
    _targetPos.set(playerX, playerY + 1.55, playerZ);
    const lerpAlpha = 1 - Math.exp(-14 * dt);
    this.currentLookAt.lerp(_targetPos, lerpAlpha);

    // Compute camera spherical offset behind player
    const horizDist = this.distance * Math.cos(this.pitch);
    const vertDist = this.distance * Math.sin(this.pitch);

    const offsetX = -Math.sin(this.yaw) * horizDist;
    const offsetZ = -Math.cos(this.yaw) * horizDist;

    let effectiveDist = this.distance;

    // 1. Raycaster collision check against terrain & building meshes
    _rayDir.set(offsetX, vertDist, offsetZ).normalize();
    this.raycaster.set(this.currentLookAt, _rayDir);
    this.raycaster.near = 0.2;
    this.raycaster.far = this.distance;

    if (colliderMeshes.length > 0) {
      const hits = this.raycaster.intersectObjects(colliderMeshes, false);
      if (hits.length > 0 && hits[0].distance < effectiveDist) {
        effectiveDist = Math.max(1.4, hits[0].distance - 0.35);
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
      this.shakeTimer -= dt;
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
    }

    this.camera.lookAt(this.currentLookAt);
  }

  public handleResize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }
}
