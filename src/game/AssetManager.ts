import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { EnemyType } from './types';

export interface CharacterRig {
  root: THREE.Group;
  body: THREE.Object3D;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  weaponMesh?: THREE.Object3D;
  swordTrailAnchor?: THREE.Object3D;
  cloak?: THREE.Object3D;
  cloakLower?: THREE.Object3D;
  shieldBubble?: THREE.Mesh;
  amberEyes?: THREE.Object3D[];
  steelScabbard?: THREE.Object3D;
  silverScabbard?: THREE.Object3D;
}

export class AssetManager {
  private gltfLoader = new GLTFLoader();
  private textures: Map<string, THREE.CanvasTexture> = new Map();
  private materials: Map<string, THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial> = new Map();
  private maxAnisotropy = 4;

  constructor(renderer?: THREE.WebGLRenderer) {
    if (renderer) {
      this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    this.initProceduralAssets();
  }

  private createCanvasTexture(
    key: string,
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    repeatX = 1,
    repeatY = 1
  ): THREE.CanvasTexture {
    const existing = this.textures.get(key);
    if (existing) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawFn(ctx, width, height);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = this.maxAnisotropy;
    tex.needsUpdate = true;
    this.textures.set(key, tex);
    return tex;
  }

  private createCanvasNormalMap(
    key: string,
    width: number,
    height: number,
    heightFn: (x: number, y: number, w: number, h: number) => number,
    intensity = 2.0,
    repeatX = 1,
    repeatY = 1
  ): THREE.CanvasTexture {
    const existing = this.textures.get(key);
    if (existing) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.createCanvasTexture(key, width, height, () => {});

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    const hBuf = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        hBuf[y * width + x] = heightFn(x, y, width, height);
      }
    }

    for (let y = 0; y < height; y++) {
      const y0 = (y - 1 + height) % height;
      const y1 = (y + 1) % height;
      for (let x = 0; x < width; x++) {
        const x0 = (x - 1 + width) % width;
        const x1 = (x + 1) % width;

        const tl = hBuf[y0 * width + x0];
        const t  = hBuf[y0 * width + x];
        const tr = hBuf[y0 * width + x1];
        const l  = hBuf[y * width + x0];
        const r  = hBuf[y * width + x1];
        const bl = hBuf[y1 * width + x0];
        const b  = hBuf[y1 * width + x];
        const br = hBuf[y1 * width + x1];

        const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
        const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);
        const dZ = 1.0 / Math.max(0.01, intensity);

        const invLen = 1.0 / Math.hypot(dX, dY, dZ);
        const nx = -dX * invLen;
        const ny = -dY * invLen;
        const nz = dZ * invLen;

        const idx = (y * width + x) * 4;
        data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = this.maxAnisotropy;
    tex.needsUpdate = true;
    this.textures.set(key, tex);
    return tex;
  }

  private createCanvasRoughnessMap(
    key: string,
    width: number,
    height: number,
    roughnessFn: (x: number, y: number, w: number, h: number) => number,
    repeatX = 1,
    repeatY = 1
  ): THREE.CanvasTexture {
    const existing = this.textures.get(key);
    if (existing) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.createCanvasTexture(key, width, height, () => {});

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const val = Math.max(0, Math.min(255, Math.round(roughnessFn(x, y, width, height) * 255)));
        const idx = (y * width + x) * 4;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = this.maxAnisotropy;
    tex.needsUpdate = true;
    this.textures.set(key, tex);
    return tex;
  }

  private initProceduralAssets(): void {
    // 1. Ground / Soil / Peat PBR Maps
    const groundTex = this.createCanvasTexture(
      'ground',
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#1c2217';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 1100; i++) {
          const x = (i * 73) % w;
          const y = (i * 139) % h;
          const r = 2 + (i % 5);
          ctx.fillStyle =
            i % 4 === 0
              ? '#141a10'
              : i % 4 === 1
              ? '#262f1c'
              : i % 4 === 2
              ? '#2c251d'
              : '#1f1b15';
          ctx.fillRect(x, y, r, r);
        }
      },
      32,
      32
    );

    const groundNormal = this.createCanvasNormalMap(
      'ground_normal',
      128,
      128,
      (x, y, w, h) => {
        const nx = x / w;
        const ny = y / h;
        return (
          Math.sin(nx * 18.0) * 0.25 +
          Math.cos(ny * 22.0) * 0.25 +
          Math.sin((nx + ny) * 35.0) * 0.15 +
          ((x * 47 + y * 97) % 17) / 34.0
        );
      },
      2.6,
      32,
      32
    );

    const groundRoughness = this.createCanvasRoughnessMap(
      'ground_roughness',
      128,
      128,
      (x, y) => 0.78 + (((x * 19 + y * 31) % 23) / 100.0) * 0.18,
      32,
      32
    );

    // 2. Stone Wall / Fortification PBR Maps
    const stoneTex = this.createCanvasTexture(
      'stone',
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#3a3633';
        ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#181614';
        const rows = 4;
        const cols = 4;
        const rH = h / rows;
        const cW = w / cols;
        for (let r = 0; r < rows; r++) {
          const y = r * rH;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
          const shift = r % 2 === 0 ? 0 : cW / 2;
          for (let c = -1; c <= cols; c++) {
            const x = c * cW + shift;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + rH);
            ctx.stroke();

            // Inner block color variation and texture noise
            const blockShade = (r * 7 + c * 13) % 5;
            ctx.fillStyle =
              blockShade === 0
                ? '#48433e'
                : blockShade === 1
                ? '#383430'
                : blockShade === 2
                ? '#524c46'
                : '#302d2a';
            ctx.fillRect(x + 3, y + 3, cW - 6, rH - 6);
          }
        }
      },
      3,
      3
    );

    const stoneNormal = this.createCanvasNormalMap(
      'stone_normal',
      128,
      128,
      (x, y, w, h) => {
        const row = Math.floor((y / h) * 4);
        const shift = row % 2 === 0 ? 0 : 0.125;
        const col = Math.floor(((x / w + shift) % 1) * 4);
        const edgeX = Math.abs(((x / w + shift) % 0.25) - 0.125);
        const edgeY = Math.abs(((y / h) % 0.25) - 0.125);
        const mortar = Math.min(edgeX, edgeY) < 0.02 ? -0.4 : 0.2;
        const grain = ((x * 37 + y * 71) % 13) / 60.0;
        return mortar + grain;
      },
      3.2,
      3,
      3
    );

    const stoneRoughness = this.createCanvasRoughnessMap(
      'stone_roughness',
      128,
      128,
      (x, y) => 0.72 + (((x * 23 + y * 41) % 19) / 80.0),
      3,
      3
    );

    // 3. Aged Timber & Pine Bark PBR Maps
    const woodTex = this.createCanvasTexture(
      'wood',
      128,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#3a2316';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 28; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#2e1b11' : '#4a2f1e';
          ctx.fillRect(0, i * 9, w, 8);
        }
        ctx.strokeStyle = '#20130b';
        ctx.lineWidth = 1;
        for (let j = 0; j < 35; j++) {
          const y = (j * 17) % h;
          ctx.strokeRect(0, y, w, 3);
        }
      },
      2,
      4
    );

    const woodNormal = this.createCanvasNormalMap(
      'wood_normal',
      64,
      128,
      (x, y, w, h) => {
        const ny = y / h;
        return Math.sin(ny * 40.0) * 0.4 + Math.cos(x * 0.5) * 0.1;
      },
      2.4,
      2,
      4
    );

    const woodRoughness = this.createCanvasRoughnessMap(
      'wood_roughness',
      64,
      128,
      (x, y) => 0.65 + Math.abs(Math.sin((y * 12) / 128)) * 0.2,
      2,
      4
    );

    // 4. Leather PBR Maps (Witcher armor, boots, scabbards, belts)
    const leatherTex = this.createCanvasTexture('leather', 128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#2d1f18';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#422e23';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 6) {
        ctx.strokeRect(i, 0, 6, h);
      }
      for (let j = 0; j < 300; j++) {
        const x = (j * 31) % w;
        const y = (j * 67) % h;
        ctx.fillStyle = j % 2 === 0 ? '#221711' : '#39281e';
        ctx.fillRect(x, y, 2, 2);
      }
    });

    const leatherNormal = this.createCanvasNormalMap(
      'leather_normal',
      64,
      64,
      (x, y) => ((x * 17 + y * 29) % 7) / 14.0,
      1.6
    );

    const leatherRoughness = this.createCanvasRoughnessMap(
      'leather_roughness',
      64,
      64,
      () => 0.52
    );

    // 5. Cold Forged Steel PBR Maps (Armor plates, guards, steel blades)
    const steelTex = this.createCanvasTexture('steel', 128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#b0b6bc';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#8d959c';
      ctx.lineWidth = 1;
      for (let i = 0; i < h; i += 3) {
        ctx.strokeRect(0, i, w, 1);
      }
    });

    const steelNormal = this.createCanvasNormalMap(
      'steel_normal',
      64,
      64,
      (x, y) => Math.sin(y * 1.5) * 0.15 + ((x * 23 + y * 41) % 5) / 30.0,
      1.2
    );

    const steelRoughness = this.createCanvasRoughnessMap(
      'steel_roughness',
      64,
      64,
      () => 0.22
    );

    // 6. Silver Runed Blade PBR Maps
    const silverTex = this.createCanvasTexture('silver', 128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(w / 2 - 2, 0, 4, h);
    });

    // 7. Dark Cloth PBR Maps (Witcher Mantle, Cape, Tunic)
    const clothTex = this.createCanvasTexture('darkCloth', 128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#171618';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#27262a';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
      for (let j = 0; j < h; j += 4) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(w, j);
        ctx.stroke();
      }
    });

    const clothNormal = this.createCanvasNormalMap(
      'cloth_normal',
      64,
      64,
      (x, y) => (Math.sin(x * 1.8) + Math.cos(y * 1.8)) * 0.25,
      2.0
    );

    // Assemble Materials
    this.materials.set(
      'ground',
      new THREE.MeshStandardMaterial({
        map: groundTex,
        normalMap: groundNormal,
        roughnessMap: groundRoughness,
        roughness: 0.92,
        metalness: 0.04,
      })
    );

    this.materials.set(
      'stone',
      new THREE.MeshStandardMaterial({
        map: stoneTex,
        normalMap: stoneNormal,
        roughnessMap: stoneRoughness,
        roughness: 0.85,
        metalness: 0.08,
      })
    );

    this.materials.set(
      'wood',
      new THREE.MeshStandardMaterial({
        map: woodTex,
        normalMap: woodNormal,
        roughnessMap: woodRoughness,
        roughness: 0.78,
        metalness: 0.04,
      })
    );

    this.materials.set(
      'leather',
      new THREE.MeshStandardMaterial({
        map: leatherTex,
        normalMap: leatherNormal,
        roughnessMap: leatherRoughness,
        roughness: 0.58,
        metalness: 0.14,
      })
    );

    this.materials.set(
      'steel',
      new THREE.MeshPhysicalMaterial({
        map: steelTex,
        normalMap: steelNormal,
        roughnessMap: steelRoughness,
        color: 0xd6d3d1,
        roughness: 0.24,
        metalness: 0.94,
        clearcoat: 0.45,
        clearcoatRoughness: 0.15,
      })
    );

    this.materials.set(
      'silverBlade',
      new THREE.MeshPhysicalMaterial({
        map: silverTex,
        color: 0xf1f5f9,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.28,
        roughness: 0.14,
        metalness: 0.98,
        clearcoat: 0.7,
        clearcoatRoughness: 0.1,
      })
    );

    this.materials.set(
      'darkCloth',
      new THREE.MeshStandardMaterial({
        map: clothTex,
        normalMap: clothNormal,
        color: 0x18181b,
        roughness: 0.86,
        metalness: 0.03,
      })
    );

    this.materials.set(
      'skin',
      new THREE.MeshStandardMaterial({
        color: 0xd6b49c,
        roughness: 0.58,
        metalness: 0.04,
      })
    );
  }

  public getMaterial(name: string): THREE.MeshStandardMaterial {
    return (
      this.materials.get(name) ??
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.7 })
    );
  }

  public async loadGLTFModel(url: string): Promise<THREE.Group | null> {
    try {
      const gltf = await this.gltfLoader.loadAsync(url);
      return gltf.scene;
    } catch {
      return null;
    }
  }

  /**
   * Builds the composite 12-part Monster Hunter Hero character rig.
   * Pivoted at bottom-center (y = 0 sits flush on ground).
   */
  public createHeroModel(): CharacterRig {
    const root = new THREE.Group();
    const leatherMat = this.getMaterial('leather');
    const clothMat = this.getMaterial('darkCloth');
    const steelMat = this.getMaterial('steel');
    const silverMat = this.getMaterial('silverBlade');
    const skinMat = this.getMaterial('skin');
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.5,
      metalness: 0.1,
    });
    const chainmailMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.4,
      metalness: 0.75,
    });

    // Legs (pivoted at hip y = 0.85)
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.18, 0.85, 0);
    const leftThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.35, 6, 8), clothMat);
    leftThigh.position.y = -0.25;
    leftThigh.castShadow = true;
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.28), leatherMat);
    leftBoot.position.set(0, -0.65, 0.03);
    leftBoot.castShadow = true;
    leftLeg.add(leftThigh, leftBoot);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.18, 0.85, 0);
    const rightThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.35, 6, 8), clothMat);
    rightThigh.position.y = -0.25;
    rightThigh.castShadow = true;
    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.28), leatherMat);
    rightBoot.position.set(0, -0.65, 0.03);
    rightBoot.castShadow = true;
    rightLeg.add(rightThigh, rightBoot);

    // Torso / Cuirass
    const body = new THREE.Group();
    body.position.set(0, 0.85, 0);

    const heroArmorMat = leatherMat.clone();
    const cuirass = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.32), heroArmorMat);
    cuirass.name = 'heroCuirass';
    cuirass.position.y = 0.36;
    cuirass.castShadow = true;
    body.add(cuirass);

    // Belt & Potion vials
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.1, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.5, metalness: 0.4 })
    );
    belt.position.y = 0.08;
    body.add(belt);

    // Pauldrons (Shoulder armor)
    const pauldronMat = chainmailMat.clone();
    const leftPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), pauldronMat);
    leftPauldron.name = 'heroPauldronL';
    leftPauldron.scale.set(1.1, 0.7, 1.1);
    leftPauldron.position.set(-0.33, 0.65, 0);
    const rightPauldron = leftPauldron.clone();
    rightPauldron.name = 'heroPauldronR';
    rightPauldron.position.set(0.33, 0.65, 0);

    // Pauldron metal plate studs
    const studMat = this.getMaterial('steel');
    const studL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 6), studMat);
    studL.position.set(-0.38, 0.73, 0.04);
    studL.rotation.z = 0.5;
    const studR = studL.clone();
    studR.position.x = 0.38;
    studR.rotation.z = -0.5;
    body.add(leftPauldron, rightPauldron, studL, studR);

    // Multi-segment dynamic flowing cloak on back
    const heroCloakMat = clothMat.clone();
    const cloak = new THREE.Group();
    cloak.name = 'heroCloak';
    cloak.position.set(0, 0.55, -0.19);
    cloak.rotation.x = 0.08;

    const cloakUpper = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.45, 0.04), heroCloakMat);
    cloakUpper.position.y = -0.22;
    cloakUpper.castShadow = true;

    const cloakLower = new THREE.Group();
    cloakLower.position.set(0, -0.44, 0);
    const cloakLowerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.03), heroCloakMat);
    cloakLowerMesh.position.y = -0.25;
    cloakLowerMesh.castShadow = true;
    cloakLower.add(cloakLowerMesh);

    cloak.add(cloakUpper, cloakLower);
    body.add(cloak);

    // Dual crossed Witcher scabbards on back (Steel & Silver)
    const steelScabbardGroup = new THREE.Group();
    steelScabbardGroup.position.set(-0.09, 0.45, -0.21);
    steelScabbardGroup.rotation.z = -0.44;
    const steelScabbardBody = new THREE.Mesh(new THREE.BoxGeometry(0.065, 1.08, 0.035), leatherMat);
    const steelChape = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.04), steelMat);
    steelChape.position.y = -0.52;
    const steelBackHilt = new THREE.Group();
    steelBackHilt.name = 'steelBackHilt';
    const steelPommelBack = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.22, 8), steelMat);
    steelPommelBack.position.set(0, 0.6, 0);
    const steelGuardBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.05), steelMat);
    steelGuardBack.position.set(0, 0.52, 0);
    steelBackHilt.add(steelPommelBack, steelGuardBack);
    // Steel sword starts drawn in right hand, so its back scabbard is empty
    steelBackHilt.visible = false;
    steelScabbardGroup.add(steelScabbardBody, steelChape, steelBackHilt);

    const silverScabbardGroup = new THREE.Group();
    silverScabbardGroup.position.set(0.09, 0.45, -0.22);
    silverScabbardGroup.rotation.z = 0.44;
    const silverScabbardBody = new THREE.Mesh(new THREE.BoxGeometry(0.065, 1.08, 0.035), clothMat);
    const silverChape = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.04), silverMat);
    silverChape.position.y = -0.52;
    const silverBackHilt = new THREE.Group();
    silverBackHilt.name = 'silverBackHilt';
    const silverPommelBack = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.22, 8), silverMat);
    silverPommelBack.position.set(0, 0.6, 0);
    const silverGuardBack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.05), silverMat);
    silverGuardBack.position.set(0, 0.52, 0);
    silverBackHilt.add(silverPommelBack, silverGuardBack);
    silverBackHilt.visible = true;
    silverScabbardGroup.add(silverScabbardBody, silverChape, silverBackHilt);

    // Cross-straps over chest harness
    const harnessL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.34), leatherMat);
    harnessL.position.set(0, 0.35, 0);
    harnessL.rotation.z = 0.42;
    const harnessR = harnessL.clone();
    harnessR.rotation.z = -0.42;
    body.add(steelScabbardGroup, silverScabbardGroup, harnessL, harnessR);

    // Head & Silver Hair + Amber Eyes of the Ash Hunter
    const head = new THREE.Group();
    head.position.set(0, 0.78, 0);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skinMat);
    skull.castShadow = true;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.22, 0.34), hairMat);
    hair.position.set(0, 0.1, -0.03);

    // Cowl / Forehead band casting shadow over eyes
    const cowlBand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.32), clothMat);
    cowlBand.position.set(0, 0.11, 0.02);

    // Glowing Amber Eyes of Corvus (Зольник)
    const amberEyeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.8,
      roughness: 0.1,
    });
    const amberEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), amberEyeMat);
    amberEyeL.position.set(-0.068, 0.02, 0.155);
    const amberEyeR = amberEyeL.clone();
    amberEyeR.position.x = 0.068;

    const medallion = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.05, 0),
      silverMat
    );
    medallion.position.set(0, -0.18, 0.17);
    head.add(skull, hair, cowlBand, amberEyeL, amberEyeR, medallion);
    body.add(head);

    // Left Arm
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.34, 0.62, 0);
    const leftSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.42, 6, 8), chainmailMat);
    leftSleeve.position.y = -0.24;
    leftSleeve.castShadow = true;
    leftArm.add(leftSleeve);
    body.add(leftArm);

    // Right Arm + Active Sword
    const rightArm = new THREE.Group();
    rightArm.position.set(0.34, 0.62, 0);
    const rightSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.42, 6, 8), chainmailMat);
    rightSleeve.position.y = -0.24;
    rightSleeve.castShadow = true;
    rightArm.add(rightSleeve);

    // Sword Group held in right hand
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -0.45, 0.1);
    swordGroup.rotation.x = Math.PI / 2.2;

    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 8), leatherMat);
    const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.06), steelMat.clone());
    crossguard.name = 'heroCrossguard';
    crossguard.position.y = 0.12;
    const heroBladeMat = silverMat.clone();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.05, 0.018), heroBladeMat);
    blade.name = 'heroBlade';
    blade.position.y = 0.65;
    blade.castShadow = true;

    // Glowing runic groove along the fuller of the blade
    const runeStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.88, 0.022),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.6,
        roughness: 0.15,
      })
    );
    runeStrip.name = 'heroRuneStrip';
    runeStrip.position.y = 0.62;
    runeStrip.visible = false;

    const trailAnchor = new THREE.Object3D();
    trailAnchor.position.set(0, 1.15, 0);
    swordGroup.add(hilt, crossguard, blade, runeStrip, trailAnchor);
    rightArm.add(swordGroup);
    body.add(rightArm);

    // Protective Barrier Sign Bubble (hidden by default)
    const shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 20, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0xeab308,
        emissive: 0xca8a04,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.28,
        roughness: 0.1,
        transmission: 0.6,
        depthWrite: false,
      })
    );
    shieldBubble.position.set(0, 1.05, 0);
    shieldBubble.visible = false;
    shieldBubble.renderOrder = 5;

    // Contact shadow plane
    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;

    root.add(leftLeg, rightLeg, body, shieldBubble, contactShadow);
    return {
      root,
      body,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      weaponMesh: swordGroup,
      swordTrailAnchor: trailAnchor,
      cloak,
      cloakLower,
      shieldBubble,
      amberEyes: [amberEyeL, amberEyeR],
      steelScabbard: steelScabbardGroup,
      silverScabbard: silverScabbardGroup,
    };
  }

  /**
   * Dynamically updates hero armor, back scabbard hilts, & blade materials based on
   * equipped Witcher Set, Socketed Rune, and Active Sword ('steel' vs 'silver').
   */
  public updateHeroEquipmentVisuals(
    rig: CharacterRig,
    activeSet: 'raven' | 'bear' | 'flame' | 'grandmaster' | 'obsidian' | 'frost_warden' | null,
    runeEffect?: 'fire' | 'bleed' | 'vamp' | 'ward' | 'frost' | 'void' | null,
    activeSword: 'steel' | 'silver' = 'steel'
  ): void {
    const cuirass = rig.root.getObjectByName('heroCuirass') as THREE.Mesh | undefined;
    const cloak = rig.root.getObjectByName('heroCloak') as THREE.Mesh | undefined;
    const blade = rig.root.getObjectByName('heroBlade') as THREE.Mesh | undefined;
    const runeStrip = rig.root.getObjectByName('heroRuneStrip') as THREE.Mesh | undefined;
    const crossguard = rig.root.getObjectByName('heroCrossguard') as THREE.Mesh | undefined;
    const steelBackHilt = rig.root.getObjectByName('steelBackHilt');
    const silverBackHilt = rig.root.getObjectByName('silverBackHilt');

    // Show the inactive sword's hilt in its back scabbard and hide the drawn sword's back hilt
    if (steelBackHilt) {
      steelBackHilt.visible = activeSword === 'silver';
    }
    if (silverBackHilt) {
      silverBackHilt.visible = activeSword === 'steel';
    }

    if (cuirass && cuirass.material instanceof THREE.MeshStandardMaterial) {
      if (activeSet === 'raven') {
        cuirass.material.color.setHex(0x1e293b);
        cuirass.material.metalness = 0.45;
      } else if (activeSet === 'bear') {
        cuirass.material.color.setHex(0x451a03);
        cuirass.material.metalness = 0.65;
      } else if (activeSet === 'flame') {
        cuirass.material.color.setHex(0x7f1d1d);
        cuirass.material.metalness = 0.7;
      } else if (activeSet === 'frost_warden') {
        cuirass.material.color.setHex(0x0284c7);
        cuirass.material.metalness = 0.78;
      } else if (activeSet === 'grandmaster') {
        cuirass.material.color.setHex(0x18181b);
        cuirass.material.metalness = 0.85;
      } else if (activeSet === 'obsidian') {
        cuirass.material.color.setHex(0x3b0764);
        cuirass.material.metalness = 0.92;
      } else {
        cuirass.material.color.setHex(0x4a3222);
        cuirass.material.metalness = 0.15;
      }
    }

    if (cloak && cloak.material instanceof THREE.MeshStandardMaterial) {
      if (activeSet === 'raven') {
        cloak.material.color.setHex(0x0f172a);
      } else if (activeSet === 'bear') {
        cloak.material.color.setHex(0x292524);
      } else if (activeSet === 'flame') {
        cloak.material.color.setHex(0x450a0a);
      } else if (activeSet === 'frost_warden') {
        cloak.material.color.setHex(0x0c4a6e);
      } else if (activeSet === 'grandmaster') {
        cloak.material.color.setHex(0x27272a);
      } else if (activeSet === 'obsidian') {
        cloak.material.color.setHex(0x581c87);
      } else {
        cloak.material.color.setHex(0x1f242d);
      }
    }

    if (crossguard && crossguard.material instanceof THREE.MeshStandardMaterial) {
      crossguard.material.color.setHex(activeSword === 'silver' ? 0xe2e8f0 : 0x64748b);
    }

    if (blade && blade.material instanceof THREE.MeshStandardMaterial) {
      blade.material.color.setHex(activeSword === 'silver' ? 0xf1f5f9 : 0x94a3b8);
      blade.material.metalness = activeSword === 'silver' ? 0.96 : 0.85;
      blade.material.roughness = activeSword === 'silver' ? 0.14 : 0.28;

      if (runeEffect === 'fire') {
        blade.material.emissive.setHex(0xf97316);
        blade.material.emissiveIntensity = 0.95;
      } else if (runeEffect === 'bleed') {
        blade.material.emissive.setHex(0xdc2626);
        blade.material.emissiveIntensity = 0.85;
      } else if (runeEffect === 'vamp') {
        blade.material.emissive.setHex(0x9333ea);
        blade.material.emissiveIntensity = 0.9;
      } else if (runeEffect === 'frost') {
        blade.material.emissive.setHex(0x38bdf8);
        blade.material.emissiveIntensity = 1.15;
      } else if (runeEffect === 'void') {
        blade.material.emissive.setHex(0xa855f7);
        blade.material.emissiveIntensity = 1.25;
      } else if (activeSword === 'silver') {
        blade.material.emissive.setHex(0x38bdf8);
        blade.material.emissiveIntensity = 0.45;
      } else {
        blade.material.emissive.setHex(0x475569);
        blade.material.emissiveIntensity = 0.08;
      }
    }

    if (runeStrip && runeStrip.material instanceof THREE.MeshStandardMaterial) {
      runeStrip.visible = activeSword === 'silver' || Boolean(runeEffect);
      if (runeEffect === 'fire') {
        runeStrip.material.color.setHex(0xfbbf24);
        runeStrip.material.emissive.setHex(0xf97316);
      } else if (runeEffect === 'void') {
        runeStrip.material.color.setHex(0xe879f9);
        runeStrip.material.emissive.setHex(0xa855f7);
      } else {
        runeStrip.material.color.setHex(0x7dd3fc);
        runeStrip.material.emissive.setHex(0x38bdf8);
      }
    }
  }

  /**
   * Builds a detailed multi-part 3D chest with dark oak planks, wrought-iron bands,
   * rivets, padlock clasp, hinged vaulted lid ('chestLidPivot'), and golden treasure inside.
   */
  public createDetailedChestModel(isOpened = false): THREE.Group {
    const chestGroup = new THREE.Group();
    const woodMat = this.getMaterial('wood');
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.42,
      metalness: 0.85,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.92,
    });
    const rubyMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.6,
      roughness: 0.15,
    });
    const sapphireMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.6,
      roughness: 0.15,
    });

    // 1. Hollow-looking Chest Base Box + Dark Interior Recess
    const baseBox = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.46, 0.66), woodMat);
    baseBox.position.y = 0.23;
    baseBox.castShadow = true;
    baseBox.receiveShadow = true;
    chestGroup.add(baseBox);

    // Wrought-iron vertical & horizontal straps on base
    for (const xOff of [-0.46, 0, 0.46]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.69), ironMat);
      band.position.set(xOff, 0.23, 0);
      chestGroup.add(band);

      // Metallic rivets on front & back
      for (const zSign of [-1, 1]) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), ironMat);
        rivet.position.set(xOff, 0.34, zSign * 0.345);
        chestGroup.add(rivet);
      }
    }

    // Side iron carrying handles
    for (const xSign of [-1, 1]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 12), ironMat);
      handle.position.set(xSign * 0.55, 0.26, 0);
      handle.rotation.y = Math.PI / 2;
      chestGroup.add(handle);
    }

    // Front iron lock plate & padlock
    const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.04), ironMat);
    lockPlate.position.set(0, 0.36, 0.34);
    const padlock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), goldMat);
    padlock.position.set(0, 0.29, 0.365);
    chestGroup.add(lockPlate, padlock);

    // 2. Interior Treasure Hoard (Coins, Ingots, Gems & Golden Glow)
    const treasureGroup = new THREE.Group();
    treasureGroup.name = 'chestTreasureGlow';
    treasureGroup.position.set(0, 0.42, 0);

    const goldMound = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.45, 0.12, 12),
      goldMat
    );
    goldMound.scale.set(1.15, 1, 0.68);
    treasureGroup.add(goldMound);

    for (let i = 0; i < 6; i++) {
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.055, 0),
        i % 2 === 0 ? rubyMat : sapphireMat
      );
      gem.position.set((i - 2.5) * 0.13, 0.07, (i % 2 === 0 ? 1 : -1) * 0.09);
      treasureGroup.add(gem);
    }

    const auraOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: isOpened ? 0.42 : 0.0,
        depthWrite: false,
      })
    );
    auraOrb.name = 'chestInnerAura';
    auraOrb.position.y = 0.18;
    treasureGroup.add(auraOrb);
    chestGroup.add(treasureGroup);

    // 3. Hinged Vaulted Lid pivoted at back edge (y = 0.46, z = -0.33)
    const lidPivot = new THREE.Group();
    lidPivot.name = 'chestLidPivot';
    lidPivot.position.set(0, 0.46, -0.33);

    const lidBox = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.16, 0.66), woodMat);
    lidBox.position.set(0, 0.08, 0.33);
    lidBox.castShadow = true;

    const vaultedArch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 1.06, 12, 1, false, 0, Math.PI),
      woodMat
    );
    vaultedArch.rotation.z = Math.PI / 2;
    vaultedArch.position.set(0, 0.14, 0.33);
    vaultedArch.castShadow = true;
    lidPivot.add(lidBox, vaultedArch);

    for (const xOff of [-0.46, 0, 0.46]) {
      const lidBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.345, 0.345, 0.07, 12, 1, false, 0, Math.PI),
        ironMat
      );
      lidBand.rotation.z = Math.PI / 2;
      lidBand.position.set(xOff, 0.14, 0.33);
      lidPivot.add(lidBand);
    }

    const lidClasp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.04), goldMat);
    lidClasp.position.set(0, 0.06, 0.67);
    lidPivot.add(lidClasp);

    // If already opened, rotate lid back to 110 degrees (-1.92 rad)
    lidPivot.rotation.x = isOpened ? -1.92 : 0;
    chestGroup.userData.targetLidAngle = isOpened ? -1.92 : 0;

    chestGroup.add(lidPivot);
    return chestGroup;
  }

  /**
   * Builds anatomical hierarchical 3D NPC models with articulated head (eyes, brows, nose, beard/hair),
   * torso, separate left/right arms and left/right legs, and role-specific tools/weapons.
   */
  public createNPCModel(
    role:
      | 'elder'
      | 'blacksmith'
      | 'merchant'
      | 'herbalist'
      | 'inquisitor'
      | 'charon'
      | 'brom'
      | 'kael'
      | 'peasant'
      | 'guard'
      | 'bard'
      | 'caravan'
      | 'fence'
      | 'lyra'
      | 'thorvald'
      | 'vesper'
  ): THREE.Group {
    const group = new THREE.Group();
    const skinMat = this.getMaterial('skin');
    const woodMat = this.getMaterial('wood');
    const leatherMat = this.getMaterial('leather');
    const steelMat = this.getMaterial('steel');
    const darkClothMat = this.getMaterial('darkCloth');

    const tunicColors: Record<typeof role, number> = {
      elder: 0x7c2d12,
      blacksmith: 0x292524,
      merchant: 0x1e3a8a,
      herbalist: 0x14532d,
      inquisitor: 0x991b1b,
      charon: 0x115e59,
      brom: 0x44403c,
      kael: 0x1e1b4b,
      peasant: 0x57534e,
      guard: 0x334155,
      bard: 0x6b21a8,
      caravan: 0xb45309,
      fence: 0x18181b,
      lyra: 0x166534,
      thorvald: 0x78716c,
      vesper: 0x1e1b4b,
    };

    const isArmored =
      role === 'inquisitor' || role === 'kael' || role === 'guard' || role === 'thorvald';

    const tunicMat = new THREE.MeshStandardMaterial({
      color: tunicColors[role],
      roughness: isArmored ? 0.38 : 0.68,
      metalness: isArmored ? 0.68 : 0.12,
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: isArmored ? 0x1e293b : 0x292524,
      roughness: 0.78,
    });

    // 1. Articulated Left & Right Legs (pivoted at hip y = 0.82)
    const leftLeg = new THREE.Group();
    leftLeg.name = 'npcLeftLeg';
    leftLeg.position.set(-0.14, 0.82, 0);
    const leftThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.34, 6, 8), pantsMat);
    leftThigh.position.y = -0.22;
    leftThigh.castShadow = true;
    const leftBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.36, 0.25),
      isArmored ? steelMat : leatherMat
    );
    leftBoot.position.set(0, -0.62, 0.03);
    leftBoot.castShadow = true;
    leftLeg.add(leftThigh, leftBoot);

    const rightLeg = new THREE.Group();
    rightLeg.name = 'npcRightLeg';
    rightLeg.position.set(0.14, 0.82, 0);
    const rightThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.34, 6, 8), pantsMat);
    rightThigh.position.y = -0.22;
    rightThigh.castShadow = true;
    const rightBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.36, 0.25),
      isArmored ? steelMat : leatherMat
    );
    rightBoot.position.set(0, -0.62, 0.03);
    rightBoot.castShadow = true;
    rightLeg.add(rightThigh, rightBoot);

    // 2. Torso with Belt, Buckle & Role Attire
    const torso = new THREE.Group();
    torso.name = 'npcTorso';
    torso.position.set(0, 1.15, 0);

    const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 0.32), tunicMat);
    chestMesh.castShadow = true;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.09, 0.34), leatherMat);
    belt.position.y = -0.24;
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 })
    );
    buckle.position.set(0, -0.24, 0.17);
    torso.add(chestMesh, belt, buckle);

    // 3. Detailed Head with Facial Features (Eyes, Brows, Nose, Beard/Hair)
    const head = new THREE.Group();
    head.name = 'npcHead';
    head.position.set(0, 1.68, 0);

    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.31, 0.28), skinMat);
    cranium.castShadow = true;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.075, 0.05), skinMat);
    nose.position.set(0, 0.0, 0.155);

    const eyeColorHex =
      role === 'vesper' || role === 'kael'
        ? 0xf59e0b
        : role === 'inquisitor'
        ? 0xef4444
        : role === 'herbalist' || role === 'lyra'
        ? 0x22c55e
        : 0x38bdf8;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: eyeColorHex,
      emissive: eyeColorHex,
      emissiveIntensity: role === 'vesper' || role === 'kael' ? 1.6 : 0.45,
    });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), eyeMat);
    eyeL.position.set(-0.065, 0.03, 0.145);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.065;

    const hairColorHex =
      role === 'elder' || role === 'vesper'
        ? 0xd6d3d1
        : role === 'blacksmith' || role === 'brom' || role === 'thorvald'
        ? 0x451a03
        : role === 'herbalist' || role === 'bard'
        ? 0x7c2d12
        : 0x27272a;
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColorHex, roughness: 0.85 });
    const browL = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.018, 0.02), hairMat);
    browL.position.set(-0.065, 0.07, 0.148);
    const browR = browL.clone();
    browR.position.x = 0.065;

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.3), hairMat);
    hairBack.position.set(0, 0.08, -0.02);

    head.add(cranium, nose, eyeL, eyeR, browL, browR, hairBack);

    if (
      role === 'elder' ||
      role === 'blacksmith' ||
      role === 'brom' ||
      role === 'thorvald' ||
      role === 'merchant'
    ) {
      const beard = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, role === 'elder' ? 0.22 : 0.14, 0.16),
        hairMat
      );
      beard.position.set(0, role === 'elder' ? -0.15 : -0.11, 0.1);
      head.add(beard);
    }

    // 4. Articulated Left & Right Arms (pivoted at shoulders y = 1.44)
    const leftArm = new THREE.Group();
    leftArm.name = 'npcLeftArm';
    leftArm.position.set(-0.32, 1.44, 0);
    const leftSleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.38, 6, 8),
      role === 'blacksmith' ? skinMat : tunicMat
    );
    leftSleeve.position.y = -0.22;
    leftSleeve.castShadow = true;
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), skinMat);
    leftHand.position.set(0, -0.46, 0.02);
    leftArm.add(leftSleeve, leftHand);

    const rightArm = new THREE.Group();
    rightArm.name = 'npcRightArm';
    rightArm.position.set(0.32, 1.44, 0);
    const rightSleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.38, 6, 8),
      role === 'blacksmith' ? skinMat : tunicMat
    );
    rightSleeve.position.y = -0.22;
    rightSleeve.castShadow = true;
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), skinMat);
    rightHand.position.set(0, -0.46, 0.02);
    rightArm.add(rightSleeve, rightHand);

    // 5. Role-Specific Props, Attire & Weapons
    if (role === 'elder') {
      const furMantle = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.22, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.92 })
      );
      furMantle.position.y = 0.28;
      torso.add(furMantle);

      const crownHat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.17, 0.16, 10),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.65 })
      );
      crownHat.position.y = 0.22;
      head.add(crownHat);

      // Elder's carved wooden staff with glowing amber lantern
      const staffGroup = new THREE.Group();
      staffGroup.position.set(0, -0.35, 0.15);
      const staffPole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 1.65, 8), woodMat);
      const staffGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.09, 0),
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.8,
        })
      );
      staffGem.position.y = 0.88;
      staffGroup.add(staffPole, staffGem);
      rightArm.add(staffGroup);
    } else if (role === 'blacksmith' || role === 'brom') {
      const leatherApron = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.66, 0.06),
        leatherMat
      );
      leatherApron.position.set(0, -0.06, 0.16);
      torso.add(leatherApron);

      const hammerGroup = new THREE.Group();
      hammerGroup.name = 'smithHammer';
      hammerGroup.position.set(0.36, 1.15, 0.25);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), woodMat);
      const headBlock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.26), steelMat);
      headBlock.position.y = 0.2;
      hammerGroup.add(handle, headBlock);
      group.add(hammerGroup);
    } else if (role === 'merchant' || role === 'caravan') {
      const apron = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.52, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.85 })
      );
      apron.position.set(0, -0.1, 0.165);
      torso.add(apron);

      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.32), leatherMat);
      pack.position.set(0, 0.06, -0.26);
      torso.add(pack);

      // Foamy wooden tavern mug in left hand
      const mug = new THREE.Group();
      mug.position.set(0, -0.46, 0.14);
      const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.14, 8), woodMat);
      const foam = new THREE.Mesh(
        new THREE.SphereGeometry(0.062, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.9 })
      );
      foam.position.y = 0.07;
      mug.add(mugBody, foam);
      leftArm.add(mug);

      if (role === 'caravan') {
        const hat = new THREE.Mesh(
          new THREE.ConeGeometry(0.28, 0.22, 10),
          new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 })
        );
        hat.position.y = 0.24;
        head.add(hat);
      }
    } else if (role === 'herbalist' || role === 'charon' || role === 'fence') {
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.34, 8), tunicMat);
      hood.position.y = 0.22;
      head.add(hood);

      // Basket of glowing alchemy herbs & vials in left hand
      const basketGroup = new THREE.Group();
      basketGroup.position.set(0, -0.46, 0.15);
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.14, 8), woodMat);
      const vialGreen = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.055, 0),
        new THREE.MeshStandardMaterial({
          color: 0x22c55e,
          emissive: 0x16a34a,
          emissiveIntensity: 1.8,
        })
      );
      vialGreen.position.set(-0.04, 0.09, 0);
      const vialRuby = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.055, 0),
        new THREE.MeshStandardMaterial({
          color: 0xa855f7,
          emissive: 0x9333ea,
          emissiveIntensity: 1.8,
        })
      );
      vialRuby.position.set(0.04, 0.09, 0.02);
      basketGroup.add(basket, vialGreen, vialRuby);
      leftArm.add(basketGroup);
    } else if (role === 'inquisitor' || role === 'kael') {
      const sunHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.03, 6, 14),
        new THREE.MeshStandardMaterial({
          color: role === 'kael' ? 0xf59e0b : 0xfbbf24,
          emissive: role === 'kael' ? 0xea580c : 0xd97706,
          emissiveIntensity: 1.2,
          metalness: 0.85,
        })
      );
      sunHalo.position.set(0, 0.1, -0.14);
      head.add(sunHalo);
    } else if (role === 'guard') {
      const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.22, 10), steelMat);
      helm.position.y = 0.18;
      const crest = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.12, 0.26),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 })
      );
      crest.position.y = 0.3;
      head.add(helm, crest);

      // Guard plate pauldrons & heraldic shield
      const pauldrons = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.38), steelMat);
      pauldrons.position.y = 0.28;
      torso.add(pauldrons);

      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 0.42), steelMat);
      shield.position.set(-0.08, -0.32, 0.16);
      leftArm.add(shield);

      // Steel Halberd (spear shaft + axe blade)
      const halberdGroup = new THREE.Group();
      halberdGroup.name = 'npcWeapon';
      halberdGroup.position.set(0.36, 1.1, 0.18);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.95, 6), woodMat);
      const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 6), steelMat);
      spearTip.position.y = 1.05;
      const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.22), steelMat);
      axeBlade.position.set(0, 0.78, 0.1);
      halberdGroup.add(shaft, spearTip, axeBlade);

      const torchGroup = new THREE.Group();
      torchGroup.position.set(-0.38, 1.25, 0.28);
      torchGroup.name = 'npcTorch';
      const torchStick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.45, 6), woodMat);
      const torchFlame = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11, 0),
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xf97316,
          emissiveIntensity: 2.2,
        })
      );
      torchFlame.position.y = 0.26;
      torchFlame.name = 'npcTorchFlame';
      torchGroup.add(torchStick, torchFlame);

      group.add(halberdGroup, torchGroup);
    } else if (role === 'peasant') {
      const strawHat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.28, 0.14, 10),
        new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.9 })
      );
      strawHat.position.y = 0.2;
      head.add(strawHat);

      const tool = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), woodMat);
      tool.position.set(0, -0.44, 0.18);
      tool.name = 'npcTool';
      rightArm.add(tool);
    } else if (role === 'bard') {
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.26, 8),
        new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.6 })
      );
      cap.position.set(0.04, 0.22, 0);
      cap.rotation.z = -0.25;
      head.add(cap);

      const lute = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45 })
      );
      lute.scale.set(1, 1.35, 0.5);
      lute.position.set(0.18, 1.12, 0.25);
      lute.name = 'bardLute';
      group.add(lute);
    } else if (role === 'lyra') {
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.32, 8), tunicMat);
      hood.position.y = 0.22;
      head.add(hood);
      const bow = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.025, 6, 12, Math.PI),
        woodMat
      );
      bow.position.set(0.36, 1.15, 0.22);
      bow.rotation.y = Math.PI / 2;
      bow.name = 'npcWeapon';
      const quiver = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.07, 0.52, 8),
        leatherMat
      );
      quiver.position.set(0.14, 0.12, -0.24);
      quiver.rotation.z = -0.3;
      torso.add(quiver);
      group.add(bow);
    } else if (role === 'thorvald') {
      const pauldrons = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.4), steelMat);
      pauldrons.position.y = 0.26;
      torso.add(pauldrons);
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.48), steelMat);
      shield.position.set(-0.08, -0.32, 0.18);
      leftArm.add(shield);
      const mace = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.68, 8), steelMat);
      mace.position.set(0.38, 1.15, 0.24);
      mace.rotation.x = 0.5;
      mace.name = 'npcWeapon';
      group.add(mace);
    } else if (role === 'vesper') {
      const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.85, 0.06), darkClothMat);
      cloak.position.set(0, -0.05, -0.21);
      torso.add(cloak);
      const bladeR = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.78, 0.09),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 1.2,
          metalness: 0.9,
        })
      );
      bladeR.position.set(0.36, 1.08, 0.28);
      bladeR.rotation.x = Math.PI / 3;
      bladeR.name = 'npcWeapon';
      const bladeL = bladeR.clone();
      bladeL.position.set(-0.36, 1.08, 0.28);
      group.add(bladeR, bladeL);
    }

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 14),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;

    group.add(leftLeg, rightLeg, torso, head, leftArm, rightArm, shadow);
    return group;
  }

  /**
   * Builds composite Monster / Boss models with anatomical shoulder/hip pivots,
   * torso, head, limbs, cloak, and right-hand weapon/claws.
   */
  public createEnemyModel(type: EnemyType): CharacterRig {
    const root = new THREE.Group();
    const body = new THREE.Group();
    const head = new THREE.Group();
    const leftArm = new THREE.Group();
    const rightArm = new THREE.Group();
    const leftLeg = new THREE.Group();
    const rightLeg = new THREE.Group();
    let cloakMesh: THREE.Object3D | undefined;
    let weaponMesh: THREE.Object3D | undefined;

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.5,
    });

    if (type === 'wolf') {
      const furMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9 });
      const darkFur = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 });

      body.position.set(0, 0.55, 0);
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 1.05), furMat);
      torso.castShadow = true;
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.48, 0.44), darkFur);
      mane.position.set(0, 0.07, 0.28);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 6), darkFur);
      tail.position.set(0, 0.05, -0.65);
      tail.rotation.x = -Math.PI / 3;
      cloakMesh = tail;
      body.add(torso, mane, tail);

      head.position.set(0, 0.18, 0.62);
      const skull = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.42), furMat);
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.28), darkFur);
      snout.position.set(0, -0.05, 0.25);
      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), eyeMat);
      eyeL.position.set(-0.1, 0.06, 0.18);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.1;
      head.add(skull, snout, eyeL, eyeR);
      body.add(head);

      const legGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.52, 8);
      leftArm.position.set(-0.16, 0, 0.35);
      const fl = new THREE.Mesh(legGeo, darkFur);
      fl.position.y = -0.26;
      leftArm.add(fl);

      rightArm.position.set(0.16, 0, 0.35);
      const fr = new THREE.Mesh(legGeo, darkFur);
      fr.position.y = -0.26;
      rightArm.add(fr);
      body.add(leftArm, rightArm);

      leftLeg.position.set(-0.16, 0.52, -0.35);
      const bl = new THREE.Mesh(legGeo, darkFur);
      bl.position.y = -0.26;
      leftLeg.add(bl);

      rightLeg.position.set(0.16, 0.52, -0.35);
      const br = new THREE.Mesh(legGeo, darkFur);
      br.position.y = -0.26;
      rightLeg.add(br);
    } else if (
      type === 'ghoul' ||
      type === 'skeleton' ||
      type === 'drowned' ||
      type === 'fallen_ash' ||
      type === 'boss_vesper' ||
      type === 'bounty_hunter'
    ) {
      const isSkel = type === 'skeleton';
      const isDrowned = type === 'drowned';
      const isBounty = type === 'bounty_hunter';
      const isAsh = type === 'fallen_ash' || type === 'boss_vesper' || isBounty;
      const isVesper = type === 'boss_vesper';

      const fleshMat = new THREE.MeshStandardMaterial({
        color: isBounty
          ? 0x451a03
          : isVesper
          ? 0x18181b
          : isAsh
          ? 0x27272a
          : isDrowned
          ? 0x134e4a
          : isSkel
          ? 0xd6d3d1
          : 0x57413a,
        roughness: isAsh ? 0.35 : 0.7,
        metalness: isAsh ? 0.75 : 0.1,
      });
      const spineMat = new THREE.MeshStandardMaterial({
        color: isBounty
          ? 0xdc2626
          : isVesper
          ? 0xf59e0b
          : isAsh
          ? 0xf97316
          : isDrowned
          ? 0x22c55e
          : isSkel
          ? 0x38bdf8
          : 0x991b1b,
        emissive: isBounty
          ? 0x991b1b
          : isVesper
          ? 0xd97706
          : isAsh
          ? 0xea580c
          : isDrowned
          ? 0x15803d
          : isSkel
          ? 0x0284c7
          : 0x000000,
        emissiveIntensity: isVesper ? 1.8 : isAsh || isDrowned || isSkel ? 1.1 : 0,
        roughness: 0.4,
      });
      const clothMat = this.getMaterial('darkCloth');

      body.position.set(0, isVesper ? 0.92 : 0.78, 0);
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(isVesper ? 0.62 : 0.54, isVesper ? 0.76 : 0.66, 0.4),
        fleshMat
      );
      torso.position.set(0, 0.22, 0.06);
      torso.rotation.x = isAsh || isSkel ? 0.06 : 0.32;
      torso.castShadow = true;

      const tatteredCloak = new THREE.Mesh(
        new THREE.BoxGeometry(isVesper ? 0.68 : 0.5, isVesper ? 0.95 : 0.65, 0.05),
        clothMat
      );
      tatteredCloak.position.set(0, 0.15, -0.18);
      tatteredCloak.rotation.x = 0.25;
      cloakMesh = tatteredCloak;

      for (let i = 0; i < 3; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), spineMat);
        spike.position.set(0, 0.42 - i * 0.16, -0.14);
        spike.rotation.x = -0.6;
        body.add(spike);
      }
      body.add(torso, tatteredCloak);

      head.position.set(0, 0.58, 0.24);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), fleshMat);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), spineMat);
      eyeL.position.set(-0.08, 0.03, 0.18);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.08;
      head.add(skull, eyeL, eyeR);
      body.add(head);

      const clawGeo = new THREE.CapsuleGeometry(0.08, 0.48, 6, 8);
      leftArm.position.set(-0.34, 0.42, 0.12);
      const armL = new THREE.Mesh(clawGeo, fleshMat);
      armL.position.set(0, -0.24, 0.08);
      armL.rotation.x = -0.35;
      leftArm.add(armL);
      if (isVesper) {
        const offhandBlade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.88, 0.08), spineMat);
        offhandBlade.position.set(0, -0.55, 0.28);
        offhandBlade.rotation.x = Math.PI / 2.3;
        leftArm.add(offhandBlade);
      }

      rightArm.position.set(0.34, 0.42, 0.12);
      const armR = armL.clone();
      const boneBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, isVesper ? 1.05 : 0.72, 0.12),
        spineMat
      );
      boneBlade.position.set(0, -0.52, 0.28);
      boneBlade.rotation.x = Math.PI / 2.4;
      weaponMesh = boneBlade;
      rightArm.add(armR, boneBlade);
      body.add(leftArm, rightArm);

      const legGeo = new THREE.CapsuleGeometry(0.1, 0.45, 6, 8);
      leftLeg.position.set(-0.19, 0.78, 0);
      const legL = new THREE.Mesh(legGeo, fleshMat);
      legL.position.y = -0.38;
      leftLeg.add(legL);

      rightLeg.position.set(0.19, 0.78, 0);
      const legR = legL.clone();
      rightLeg.add(legR);
    } else if (
      type === 'hag' ||
      type === 'noonwraith' ||
      type === 'plague_reaper' ||
      type === 'frost_wraith'
    ) {
      const isNoon = type === 'noonwraith';
      const isFrost = type === 'frost_wraith';
      const isPlague = type === 'plague_reaper';

      const robeMat = new THREE.MeshStandardMaterial({
        color: isFrost ? 0xbae6fd : isPlague ? 0x14532d : isNoon ? 0xe2e8f0 : 0x1f2937,
        emissive: isFrost ? 0x0284c7 : isPlague ? 0x15803d : isNoon ? 0x2dd4bf : 0x000000,
        emissiveIntensity: isFrost || isNoon ? 0.65 : isPlague ? 0.35 : 0,
        transparent: isNoon || isFrost,
        opacity: isNoon || isFrost ? 0.78 : 1.0,
        roughness: 0.7,
      });
      const rotMat = new THREE.MeshStandardMaterial({
        color: isFrost ? 0x38bdf8 : isNoon ? 0x99f6e4 : 0x4d7c0f,
        roughness: 0.8,
      });
      const orbMat = new THREE.MeshStandardMaterial({
        color: isFrost ? 0x38bdf8 : isPlague ? 0x84cc16 : isNoon ? 0x2dd4bf : 0xa855f7,
        emissive: isFrost ? 0x0284c7 : isPlague ? 0x4d7c0f : isNoon ? 0x14b8a6 : 0x9333ea,
        emissiveIntensity: 1.6,
      });

      body.position.set(0, 0.85, 0);
      const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 10), robeMat);
      skirt.position.y = -0.05;
      skirt.castShadow = true;
      const shawl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.9, 0.08), robeMat);
      shawl.position.set(0, 0.2, -0.22);
      cloakMesh = shawl;
      body.add(skirt, shawl);

      head.position.set(0, 0.78, 0.08);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), rotMat);
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.48, 8), robeMat);
      hood.position.set(0, 0.24, -0.04);
      head.add(skull, hood);
      body.add(head);

      leftArm.position.set(-0.36, 0.55, 0);
      const sleeveL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.45, 6, 8), robeMat);
      sleeveL.position.y = -0.22;
      leftArm.add(sleeveL);

      rightArm.position.set(0.36, 0.55, 0);
      const sleeveR = sleeveL.clone();
      const staff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 1.85, 8),
        this.getMaterial('wood')
      );
      staff.position.set(0.06, -0.1, 0.22);
      staff.rotation.x = 0.25;
      const orb = new THREE.Mesh(
        isPlague ? new THREE.BoxGeometry(0.55, 0.12, 0.06) : new THREE.OctahedronGeometry(0.16, 0),
        orbMat
      );
      orb.position.set(0.06, 0.85, 0.44);
      weaponMesh = staff;
      rightArm.add(sleeveR, staff, orb);
      body.add(leftArm, rightArm);

      leftLeg.position.set(-0.18, 0.75, 0);
      const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.24), robeMat);
      bootL.position.y = -0.45;
      leftLeg.add(bootL);

      rightLeg.position.set(0.18, 0.75, 0);
      const bootR = bootL.clone();
      rightLeg.add(bootR);
    } else if (
      type === 'demon' ||
      type === 'werewolf' ||
      type === 'gargoyle' ||
      type === 'troglodyte' ||
      type === 'boss_hydra' ||
      type === 'boss_colossus'
    ) {
      const isWerewolf = type === 'werewolf';
      const isGargoyle = type === 'gargoyle';
      const isTroglodyte = type === 'troglodyte';
      const isHydra = type === 'boss_hydra';
      const isColossus = type === 'boss_colossus';

      const barkMat = new THREE.MeshStandardMaterial({
        color: isColossus
          ? 0x1e293b
          : isHydra
          ? 0x14532d
          : isTroglodyte
          ? 0x44403c
          : isWerewolf
          ? 0x1c1917
          : isGargoyle
          ? 0x57534e
          : 0x292018,
        roughness: isColossus || isGargoyle ? 0.35 : 0.85,
        metalness: isColossus ? 0.75 : isGargoyle ? 0.5 : 0.1,
      });
      const boneMat = new THREE.MeshStandardMaterial({
        color: isColossus
          ? 0x38bdf8
          : isHydra
          ? 0x4ade80
          : isWerewolf
          ? 0x7f1d1d
          : isGargoyle
          ? 0xa8a29e
          : 0xd6d3d1,
        roughness: 0.4,
      });
      const runeMat = new THREE.MeshStandardMaterial({
        color: isColossus
          ? 0x38bdf8
          : isHydra
          ? 0x22c55e
          : isTroglodyte
          ? 0xa855f7
          : isWerewolf
          ? 0xef4444
          : isGargoyle
          ? 0xf59e0b
          : 0xf97316,
        emissive: isColossus
          ? 0x0284c7
          : isHydra
          ? 0x16a34a
          : isTroglodyte
          ? 0x7e22ce
          : isWerewolf
          ? 0xdc2626
          : isGargoyle
          ? 0xd97706
          : 0xea580c,
        emissiveIntensity: 1.6,
      });

      const scaleMult = isHydra || isColossus ? 1.28 : 1.0;
      body.position.set(0, 1.1 * scaleMult, 0);
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.95 * scaleMult, 1.35 * scaleMult, 0.58 * scaleMult),
        barkMat
      );
      torso.position.y = 0.55 * scaleMult;
      torso.castShadow = true;
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26 * scaleMult, 0), runeMat);
      core.position.set(0, 0.6 * scaleMult, 0.28 * scaleMult);
      const mossCape = new THREE.Mesh(
        new THREE.BoxGeometry(isGargoyle ? 1.55 : 0.98 * scaleMult, 1.35 * scaleMult, 0.08),
        barkMat
      );
      mossCape.position.set(0, 0.55 * scaleMult, -0.32 * scaleMult);
      cloakMesh = mossCape;
      body.add(torso, core, mossCape);

      // Hydra extra serpent heads or Colossus 3 crystal growths
      if (isHydra) {
        const neckL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.95, 8), barkMat);
        neckL.position.set(-0.55, 1.55, 0.25);
        neckL.rotation.z = 0.38;
        const neckR = neckL.clone();
        neckR.position.x = 0.55;
        neckR.rotation.z = -0.38;
        body.add(neckL, neckR);
      } else if (isColossus) {
        for (let c = 0; c < 3; c++) {
          const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), runeMat);
          crystal.name = `colossusCrystal_${c}`;
          crystal.position.set((c - 1) * 0.55, 1.35 + (c === 1 ? 0.25 : 0), -0.25);
          body.add(crystal);
        }
      }

      head.position.set(0, 1.45 * scaleMult, 0.18 * scaleMult);
      const skull = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.62), boneMat);
      const antlerL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.75, 6), runeMat);
      antlerL.position.set(-0.35, 0.4, -0.05);
      antlerL.rotation.z = 0.45;
      const antlerR = antlerL.clone();
      antlerR.position.x = 0.35;
      antlerR.rotation.z = -0.45;
      head.add(skull, antlerL, antlerR);
      body.add(head);

      const armGeo = new THREE.BoxGeometry(0.28 * scaleMult, 1.15 * scaleMult, 0.28 * scaleMult);
      leftArm.position.set(-0.66 * scaleMult, 1.05 * scaleMult, 0.08);
      const armL = new THREE.Mesh(armGeo, barkMat);
      armL.position.y = -0.48 * scaleMult;
      leftArm.add(armL);

      rightArm.position.set(0.66 * scaleMult, 1.05 * scaleMult, 0.08);
      const armR = armL.clone();
      const runicClub = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.45, 0.26), runeMat);
      runicClub.position.set(0, -0.95, 0.45);
      runicClub.rotation.x = Math.PI / 2.3;
      weaponMesh = runicClub;
      rightArm.add(armR, runicClub);
      body.add(leftArm, rightArm);

      const legGeo = new THREE.CylinderGeometry(0.18, 0.14, 1.1 * scaleMult, 8);
      leftLeg.position.set(-0.28 * scaleMult, 1.1 * scaleMult, 0);
      const legL = new THREE.Mesh(legGeo, barkMat);
      legL.position.y = -0.55 * scaleMult;
      leftLeg.add(legL);

      rightLeg.position.set(0.28 * scaleMult, 1.1 * scaleMult, 0);
      const legR = legL.clone();
      rightLeg.add(legR);
    } else {
      // Story Bosses & Void Entities: Ancient Guardian ('boss'), Lich King Malakor ('malakor'), Void Knight ('void_knight'), Avatar of Void ('boss_avatar')
      const isMalakor = type === 'malakor';
      const isAvatar = type === 'boss_avatar';
      const isVoidKnight = type === 'void_knight';
      const scaleMult = isAvatar ? 1.32 : isVoidKnight ? 0.92 : 1.0;

      const armorMat = new THREE.MeshPhysicalMaterial({
        color: isAvatar ? 0x090414 : isMalakor || isVoidKnight ? 0x0f172a : 0x1c1917,
        roughness: 0.2,
        metalness: 0.92,
        clearcoat: 0.6,
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: isAvatar ? 0xef4444 : isMalakor ? 0xfbbf24 : 0xd97706,
        emissive: isAvatar ? 0xdc2626 : isMalakor ? 0xb45309 : 0x000000,
        emissiveIntensity: isAvatar ? 1.2 : isMalakor ? 0.6 : 0,
        roughness: 0.3,
        metalness: 0.9,
      });
      const spectralMat = new THREE.MeshStandardMaterial({
        color: isAvatar ? 0xef4444 : isMalakor || isVoidKnight ? 0xa855f7 : 0x38bdf8,
        emissive: isAvatar ? 0xdc2626 : isMalakor || isVoidKnight ? 0x9333ea : 0x0284c7,
        emissiveIntensity: 2.2,
      });

      body.position.set(0, 1.2 * scaleMult, 0);
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(1.18 * scaleMult, 1.55 * scaleMult, 0.68 * scaleMult),
        armorMat
      );
      torso.position.y = 0.7 * scaleMult;
      torso.castShadow = true;

      const heartCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32 * scaleMult, 1),
        spectralMat
      );
      heartCore.position.set(0, 0.75 * scaleMult, 0.36 * scaleMult);

      const cape = new THREE.Mesh(
        new THREE.BoxGeometry(1.3 * scaleMult, 1.95 * scaleMult, 0.08),
        new THREE.MeshStandardMaterial({
          color: isAvatar ? 0x450a0a : isMalakor || isVoidKnight ? 0x3b0764 : 0x450a0a,
          roughness: 0.85,
        })
      );
      cape.position.set(0, 0.35 * scaleMult, -0.36 * scaleMult);
      cloakMesh = cape;
      body.add(torso, heartCore, cape);

      head.position.set(0, 1.72 * scaleMult, 0);
      const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.52, 10), armorMat);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.22, 8), goldMat);
      crown.position.set(0, 0.3, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.35), spectralMat);
      visor.position.set(0, 0.02, 0.16);
      head.add(helm, crown, visor);
      body.add(head);

      leftArm.position.set(-0.84 * scaleMult, 1.25 * scaleMult, 0);
      const armL = new THREE.Mesh(
        new THREE.BoxGeometry(0.34 * scaleMult, 1.35 * scaleMult, 0.34 * scaleMult),
        armorMat
      );
      armL.position.y = -0.55 * scaleMult;
      leftArm.add(armL);

      rightArm.position.set(0.84 * scaleMult, 1.25 * scaleMult, 0);
      const armR = armL.clone();
      const greatsword = new THREE.Mesh(
        new THREE.BoxGeometry(0.22 * scaleMult, 2.45 * scaleMult, 0.06),
        spectralMat
      );
      greatsword.position.set(0, -1.05 * scaleMult, 0.85 * scaleMult);
      greatsword.rotation.x = Math.PI / 2.3;
      weaponMesh = greatsword;
      rightArm.add(armR, greatsword);
      body.add(leftArm, rightArm);

      leftLeg.position.set(-0.34 * scaleMult, 1.2 * scaleMult, 0);
      const legL = new THREE.Mesh(
        new THREE.BoxGeometry(0.38 * scaleMult, 1.2 * scaleMult, 0.38 * scaleMult),
        armorMat
      );
      legL.position.y = -0.6 * scaleMult;
      leftLeg.add(legL);

      rightLeg.position.set(0.34 * scaleMult, 1.2 * scaleMult, 0);
      const legR = legL.clone();
      rightLeg.add(legR);
    }

    const shadowRadius =
      type === 'boss' ||
      type === 'malakor' ||
      type === 'boss_hydra' ||
      type === 'boss_colossus' ||
      type === 'boss_avatar'
        ? 1.35
        : type === 'demon' ||
          type === 'werewolf' ||
          type === 'gargoyle' ||
          type === 'troglodyte' ||
          type === 'void_knight' ||
          type === 'boss_vesper'
        ? 0.9
        : 0.55;
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(shadowRadius, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;

    root.add(body, leftLeg, rightLeg, shadow);
    return {
      root,
      body,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      cloak: cloakMesh,
      weaponMesh,
    };
  }

  public dispose(): void {
    this.textures.forEach((t) => t.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
