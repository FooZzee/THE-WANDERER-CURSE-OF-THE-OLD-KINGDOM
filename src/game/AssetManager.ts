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

    // Legs (pivoted at hip y = 0.85) — smooth anatomical thighs, knees, calves & rounded boots
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.18, 0.85, 0);
    const leftThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.34, 8, 14), clothMat);
    leftThigh.position.y = -0.24;
    leftThigh.castShadow = true;
    const leftKnee = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 10), leatherMat);
    leftKnee.position.set(0, -0.44, 0.03);
    const leftBootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.088, 0.34, 12), leatherMat);
    leftBootShaft.position.set(0, -0.63, 0.01);
    leftBootShaft.castShadow = true;
    const leftBootFoot = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.14, 8, 12), leatherMat);
    leftBootFoot.rotation.x = Math.PI / 2;
    leftBootFoot.scale.set(1.05, 1.0, 0.72);
    leftBootFoot.position.set(0, -0.78, 0.06);
    leftBootFoot.castShadow = true;
    leftLeg.add(leftThigh, leftKnee, leftBootShaft, leftBootFoot);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.18, 0.85, 0);
    const rightThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.34, 8, 14), clothMat);
    rightThigh.position.y = -0.24;
    rightThigh.castShadow = true;
    const rightKnee = leftKnee.clone();
    const rightBootShaft = leftBootShaft.clone();
    const rightBootFoot = leftBootFoot.clone();
    rightLeg.add(rightThigh, rightKnee, rightBootShaft, rightBootFoot);

    // Torso / Cuirass — sculpted human V-tapered chest & waist
    const body = new THREE.Group();
    body.position.set(0, 0.85, 0);

    const heroArmorMat = leatherMat.clone();
    const cuirass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.21, 0.68, 16, 2),
      heroArmorMat
    );
    cuirass.scale.set(1.08, 1.0, 0.72);
    cuirass.name = 'heroCuirass';
    cuirass.position.y = 0.36;
    cuirass.castShadow = true;
    const chestPectoral = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 14, 12),
      heroArmorMat
    );
    chestPectoral.scale.set(1.12, 0.78, 0.68);
    chestPectoral.position.set(0, 0.12, 0.04);
    cuirass.add(chestPectoral);
    body.add(cuirass);

    // Belt & Potion vials — smooth contoured waist belt
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.228, 0.235, 0.11, 16),
      new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.5, metalness: 0.4 })
    );
    belt.scale.set(1.1, 1.0, 0.76);
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

    // Modular 3D Armor Set Attachments (toggled by equipped armor)
    // 1. Bear School Fur Mantle Collar & Tassets
    const bearFurGroup = new THREE.Group();
    bearFurGroup.name = 'armorPart_bearFur';
    const furMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.92 });
    const furCollar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.085, 8, 16), furMat);
    furCollar.rotation.x = Math.PI / 2;
    furCollar.position.set(0, 0.69, -0.02);
    const tassetL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.34), furMat);
    tassetL.position.set(-0.2, -0.04, 0);
    const tassetR = tassetL.clone();
    tassetR.position.x = 0.2;
    bearFurGroup.add(furCollar, tassetL, tassetR);
    bearFurGroup.visible = false;
    body.add(bearFurGroup);

    // 2. Frost Warden / Obsidian Void Shoulder Spikes & Chest Core
    const spikesGroup = new THREE.Group();
    spikesGroup.name = 'armorPart_shoulderSpikes';
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.8,
    });
    const spikeL1 = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 5), spikeMat);
    spikeL1.position.set(-0.37, 0.8, 0);
    spikeL1.rotation.z = 0.38;
    const spikeR1 = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 5), spikeMat);
    spikeR1.position.set(0.37, 0.8, 0);
    spikeR1.rotation.z = -0.38;
    const chestGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), spikeMat);
    chestGem.position.set(0, 0.44, 0.175);
    spikesGroup.add(spikeL1, spikeR1, chestGem);
    spikesGroup.visible = false;
    body.add(spikesGroup);

    // 3. Flame / Grandmaster / Royal Guard Chest Crest & Winged Collar
    const crestGroup = new THREE.Group();
    crestGroup.name = 'armorPart_royalCrest';
    const crestMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.55,
      metalness: 0.9,
      roughness: 0.2,
    });
    const chestPlateCrest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.04), crestMat);
    chestPlateCrest.position.set(0, 0.42, 0.16);
    const collarGuardL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.22), crestMat);
    collarGuardL.position.set(-0.22, 0.72, -0.02);
    collarGuardL.rotation.z = 0.25;
    const collarGuardR = collarGuardL.clone();
    collarGuardR.position.x = 0.22;
    collarGuardR.rotation.z = -0.25;
    crestGroup.add(chestPlateCrest, collarGuardL, collarGuardR);
    crestGroup.visible = false;
    body.add(crestGroup);

    // Multi-segment dynamic flowing cloak on back — curved organic drapery
    const heroCloakMat = clothMat.clone();
    const cloak = new THREE.Group();
    cloak.name = 'heroCloak';
    cloak.position.set(0, 0.55, -0.19);
    cloak.rotation.x = 0.08;

    const cloakUpper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.3, 0.46, 12, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
      heroCloakMat
    );
    cloakUpper.scale.set(1.05, 1.0, 0.35);
    cloakUpper.name = 'heroCloakUpper';
    cloakUpper.position.y = -0.22;
    cloakUpper.castShadow = true;

    const cloakLower = new THREE.Group();
    cloakLower.position.set(0, -0.44, 0);
    const cloakLowerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.35, 0.52, 12, 1, false, -Math.PI * 0.44, Math.PI * 0.88),
      heroCloakMat
    );
    cloakLowerMesh.scale.set(1.05, 1.0, 0.35);
    cloakLowerMesh.name = 'heroCloakLower';
    cloakLowerMesh.position.y = -0.25;
    cloakLowerMesh.castShadow = true;
    cloakLower.add(cloakLowerMesh);

    cloak.add(cloakUpper, cloakLower);
    body.add(cloak);

    // Dual crossed Witcher scabbards on back (Steel & Silver)
    const steelScabbardGroup = new THREE.Group();
    steelScabbardGroup.position.set(-0.09, 0.45, -0.21);
    steelScabbardGroup.rotation.z = -0.44;
    const steelScabbardBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.024, 1.08, 10),
      leatherMat
    );
    steelScabbardBody.scale.set(1.2, 1.0, 0.65);
    const steelChape = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.14, 10), steelMat);
    steelChape.rotation.x = Math.PI;
    steelChape.position.y = -0.54;
    const steelBackHilt = new THREE.Group();
    steelBackHilt.name = 'steelBackHilt';
    const steelPommelBack = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.22, 10), steelMat);
    steelPommelBack.position.set(0, 0.6, 0);
    const steelGuardBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.22, 6, 8), steelMat);
    steelGuardBack.rotation.z = Math.PI / 2;
    steelGuardBack.position.set(0, 0.52, 0);
    steelBackHilt.add(steelPommelBack, steelGuardBack);
    steelBackHilt.visible = false;
    steelScabbardGroup.add(steelScabbardBody, steelChape, steelBackHilt);

    const silverScabbardGroup = new THREE.Group();
    silverScabbardGroup.position.set(0.09, 0.45, -0.22);
    silverScabbardGroup.rotation.z = 0.44;
    const silverScabbardBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.024, 1.08, 10),
      clothMat
    );
    silverScabbardBody.scale.set(1.2, 1.0, 0.65);
    const silverChape = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.14, 10), silverMat);
    silverChape.rotation.x = Math.PI;
    silverChape.position.y = -0.54;
    const silverBackHilt = new THREE.Group();
    silverBackHilt.name = 'silverBackHilt';
    const silverPommelBack = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.22, 10), silverMat);
    silverPommelBack.position.set(0, 0.6, 0);
    const silverGuardBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.24, 6, 8), silverMat);
    silverGuardBack.rotation.z = Math.PI / 2;
    silverGuardBack.position.set(0, 0.52, 0);
    silverBackHilt.add(silverPommelBack, silverGuardBack);
    silverBackHilt.visible = true;
    silverScabbardGroup.add(silverScabbardBody, silverChape, silverBackHilt);

    // Cross-straps over chest harness
    const harnessL = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.66, 6, 10), leatherMat);
    harnessL.scale.set(1.0, 1.0, 5.5);
    harnessL.position.set(0, 0.35, 0);
    harnessL.rotation.z = 0.42;
    const harnessR = harnessL.clone();
    harnessR.rotation.z = -0.42;
    body.add(steelScabbardGroup, silverScabbardGroup, harnessL, harnessR);

    // Head & Silver Hair + Amber Eyes of the Ash Hunter (Anatomical human head, neck, nose, jaw & hair locks)
    const head = new THREE.Group();
    head.position.set(0, 0.78, 0);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.095, 0.14, 12), skinMat);
    neck.position.set(0, -0.14, -0.01);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.165, 18, 16), skinMat);
    skull.scale.set(0.92, 1.08, 0.98);
    skull.castShadow = true;
    const jawline = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.088, 0.13, 14), skinMat);
    jawline.scale.set(0.95, 1.0, 0.92);
    jawline.position.set(0, -0.08, 0.02);
    const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.075, 8), skinMat);
    noseBridge.rotation.x = Math.PI * 0.42;
    noseBridge.position.set(0, 0.0, 0.168);

    // Sculpted silver-white hair crown & flowing locks
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.176, 16, 14), hairMat);
    hair.scale.set(0.96, 0.92, 1.04);
    hair.position.set(0, 0.05, -0.025);
    const hairBackLocks = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.22, 8, 12), hairMat);
    hairBackLocks.scale.set(1.1, 1.0, 0.65);
    hairBackLocks.position.set(0, -0.06, -0.11);

    // Cowl / Forehead band casting shadow over eyes
    const cowlBand = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.055, 16), clothMat);
    cowlBand.scale.set(0.94, 1.0, 1.0);
    cowlBand.position.set(0, 0.09, 0.008);

    // Glowing Amber Eyes of Corvus (Зольник) — warm, non-blinding intensity
    const amberEyeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    });
    const amberEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), amberEyeMat);
    amberEyeL.position.set(-0.058, 0.022, 0.152);
    const amberEyeR = amberEyeL.clone();
    amberEyeR.position.x = 0.058;

    const medallion = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.048, 0),
      silverMat
    );
    medallion.position.set(0, -0.18, 0.17);
    head.add(neck, skull, jawline, noseBridge, hair, hairBackLocks, cowlBand, amberEyeL, amberEyeR, medallion);
    body.add(head);

    // Left Arm + Optional Dual-Wield Offhand Blade (Dusk Fangs)
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.34, 0.62, 0);
    const leftSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.42, 8, 12), chainmailMat);
    leftSleeve.position.y = -0.24;
    leftSleeve.castShadow = true;
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), leatherMat);
    leftHand.position.set(0, -0.46, 0.02);
    leftSleeve.add(leftHand);

    const offhandDagger = new THREE.Group();
    offhandDagger.name = 'weaponPart_offhandDagger';
    offhandDagger.position.set(0, -0.44, 0.08);
    offhandDagger.rotation.x = Math.PI / 2.2;
    const offHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), leatherMat);
    const offBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.68, 0.016),
      new THREE.MeshStandardMaterial({
        color: 0xe9d5ff,
        emissive: 0x9333ea,
        emissiveIntensity: 0.85,
        metalness: 0.9,
        roughness: 0.15,
      })
    );
    offBlade.position.y = 0.42;
    offhandDagger.add(offHilt, offBlade);
    offhandDagger.visible = false;

    leftArm.add(leftSleeve, offhandDagger);
    body.add(leftArm);

    // Right Arm + Active Modular Weapon
    const rightArm = new THREE.Group();
    rightArm.position.set(0.34, 0.62, 0);
    const rightSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.42, 8, 12), chainmailMat);
    rightSleeve.position.y = -0.24;
    rightSleeve.castShadow = true;
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), leatherMat);
    rightHand.position.set(0, -0.46, 0.02);
    rightSleeve.add(rightHand);
    rightArm.add(rightSleeve);

    // Sword/Weapon Group held in right hand
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -0.45, 0.1);
    swordGroup.rotation.x = Math.PI / 2.2;

    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 10), leatherMat);
    const crossguard = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.25, 6, 10), steelMat.clone());
    crossguard.rotation.z = Math.PI / 2;
    crossguard.name = 'heroCrossguard';
    crossguard.position.y = 0.12;
    const heroBladeMat = silverMat.clone();
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.032, 1.05, 8), heroBladeMat);
    blade.scale.set(1.2, 1.0, 0.35);
    blade.name = 'heroBlade';
    blade.position.y = 0.65;
    blade.castShadow = true;

    // Special Weapon Head 1: Plague Reaper Scythe Blade
    const scytheHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.58, 10),
      new THREE.MeshStandardMaterial({
        color: 0x84cc16,
        emissive: 0x4d7c0f,
        emissiveIntensity: 0.65,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    scytheHead.name = 'weaponPart_scytheHead';
    scytheHead.position.set(0.24, 1.08, 0);
    scytheHead.rotation.z = -Math.PI / 2.3;
    scytheHead.visible = false;

    // Special Weapon Head 2: Black Ore Cleaver Heavy Axe-Blade
    const cleaverHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.1, 0.62, 10),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0x0284c7,
        emissiveIntensity: 0.65,
        metalness: 0.92,
        roughness: 0.18,
      })
    );
    cleaverHead.scale.set(1.0, 1.0, 0.22);
    cleaverHead.name = 'weaponPart_cleaverHead';
    cleaverHead.position.set(0.07, 0.78, 0);
    cleaverHead.visible = false;

    // Glowing runic groove along the fuller of the blade
    const runeStrip = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.01, 0.86, 4, 8),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.75,
        roughness: 0.2,
      })
    );
    runeStrip.name = 'heroRuneStrip';
    runeStrip.position.y = 0.62;
    runeStrip.visible = false;

    const trailAnchor = new THREE.Object3D();
    trailAnchor.position.set(0, 1.15, 0);
    swordGroup.add(hilt, crossguard, blade, scytheHead, cleaverHead, runeStrip, trailAnchor);
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
   * Dynamically updates hero 3D armor pieces, pauldrons, cloak, back scabbard hilts,
   * and weapon silhouettes/materials based on equipped Armor ID, Weapon ID, Witcher Set,
   * Socketed Rune, and Active Sword ('steel' vs 'silver').
   */
  public updateHeroEquipmentVisuals(
    rig: CharacterRig,
    activeSet: 'raven' | 'bear' | 'flame' | 'grandmaster' | 'obsidian' | 'frost_warden' | null,
    runeEffect?: 'fire' | 'bleed' | 'vamp' | 'ward' | 'frost' | 'void' | null,
    activeSword: 'steel' | 'silver' = 'steel',
    equippedArmorId?: string,
    equippedWeaponId?: string
  ): void {
    const cuirass = rig.root.getObjectByName('heroCuirass') as THREE.Mesh | undefined;
    const pauldronL = rig.root.getObjectByName('heroPauldronL') as THREE.Mesh | undefined;
    const pauldronR = rig.root.getObjectByName('heroPauldronR') as THREE.Mesh | undefined;
    const cloakUpper = rig.root.getObjectByName('heroCloakUpper') as THREE.Mesh | undefined;
    const cloakLower = rig.root.getObjectByName('heroCloakLower') as THREE.Mesh | undefined;
    const bearFur = rig.root.getObjectByName('armorPart_bearFur');
    const shoulderSpikes = rig.root.getObjectByName('armorPart_shoulderSpikes');
    const royalCrest = rig.root.getObjectByName('armorPart_royalCrest');

    const blade = rig.root.getObjectByName('heroBlade') as THREE.Mesh | undefined;
    const scytheHead = rig.root.getObjectByName('weaponPart_scytheHead');
    const cleaverHead = rig.root.getObjectByName('weaponPart_cleaverHead');
    const offhandDagger = rig.root.getObjectByName('weaponPart_offhandDagger');
    const runeStrip = rig.root.getObjectByName('heroRuneStrip') as THREE.Mesh | undefined;
    const crossguard = rig.root.getObjectByName('heroCrossguard') as THREE.Mesh | undefined;
    const steelBackHilt = rig.root.getObjectByName('steelBackHilt');
    const silverBackHilt = rig.root.getObjectByName('silverBackHilt');

    const armorId = equippedArmorId || (activeSet ? `armor_${activeSet}` : 'armor_leather');
    const weaponId = equippedWeaponId || (activeSword === 'silver' ? 'sword_runic_silver' : 'sword_wolf_steel');

    if (steelBackHilt) {
      steelBackHilt.visible = activeSword === 'silver';
    }
    if (silverBackHilt) {
      silverBackHilt.visible = activeSword === 'steel';
    }

    // Toggle 3D Armor Set geometry attachments
    const isBear = activeSet === 'bear' || armorId.includes('bear');
    const isFrost = activeSet === 'frost_warden' || armorId.includes('frost');
    const isObsidian = activeSet === 'obsidian' || armorId.includes('obsidian');
    const isFlame = activeSet === 'flame' || armorId.includes('flame');
    const isGrandmaster = activeSet === 'grandmaster' || armorId.includes('grandmaster');
    const isRaven = activeSet === 'raven' || armorId.includes('raven');
    const isChainmail = armorId.includes('chainmail');

    if (bearFur) bearFur.visible = isBear;
    if (shoulderSpikes) {
      shoulderSpikes.visible = isFrost || isObsidian;
      shoulderSpikes.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.color.setHex(isObsidian ? 0xc084fc : 0x38bdf8);
          obj.material.emissive.setHex(isObsidian ? 0x7e22ce : 0x0284c7);
        }
      });
    }
    if (royalCrest) {
      royalCrest.visible = isFlame || isGrandmaster;
      royalCrest.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.color.setHex(isFlame ? 0xf97316 : 0xfbbf24);
          obj.material.emissive.setHex(isFlame ? 0xea580c : 0xd97706);
        }
      });
    }

    // Scale pauldrons depending on light vs heavy armor
    if (pauldronL && pauldronR) {
      const pScale = isBear || isObsidian ? 1.38 : isFlame || isFrost || isGrandmaster ? 1.24 : 1.05;
      pauldronL.scale.set(pScale, pScale * 0.7, pScale);
      pauldronR.scale.set(pScale, pScale * 0.7, pScale);
      if (pauldronL.material instanceof THREE.MeshStandardMaterial) {
        pauldronL.material.color.setHex(
          isObsidian
            ? 0x3b0764
            : isFrost
            ? 0x0369a1
            : isFlame
            ? 0x991b1b
            : isBear
            ? 0x451a03
            : isRaven
            ? 0x1e293b
            : 0x57534e
        );
      }
    }

    if (cuirass && cuirass.material instanceof THREE.MeshStandardMaterial) {
      if (isRaven) {
        cuirass.material.color.setHex(0x1e293b);
        cuirass.material.metalness = 0.52;
      } else if (isBear) {
        cuirass.material.color.setHex(0x451a03);
        cuirass.material.metalness = 0.68;
      } else if (isFlame) {
        cuirass.material.color.setHex(0x7f1d1d);
        cuirass.material.metalness = 0.75;
      } else if (isFrost) {
        cuirass.material.color.setHex(0x0284c7);
        cuirass.material.metalness = 0.8;
      } else if (isGrandmaster) {
        cuirass.material.color.setHex(0x18181b);
        cuirass.material.metalness = 0.88;
      } else if (isObsidian) {
        cuirass.material.color.setHex(0x3b0764);
        cuirass.material.metalness = 0.92;
      } else if (isChainmail) {
        cuirass.material.color.setHex(0x78716c);
        cuirass.material.metalness = 0.78;
      } else {
        cuirass.material.color.setHex(0x4a3222);
        cuirass.material.metalness = 0.18;
      }
    }

    const cloakHex = isRaven
      ? 0x0f172a
      : isBear
      ? 0x292524
      : isFlame
      ? 0x450a0a
      : isFrost
      ? 0x0c4a6e
      : isGrandmaster
      ? 0x18181b
      : isObsidian
      ? 0x4c1d95
      : 0x1f242d;

    for (const cMesh of [cloakUpper, cloakLower]) {
      if (cMesh && cMesh.material instanceof THREE.MeshStandardMaterial) {
        cMesh.material.color.setHex(cloakHex);
      }
    }

    // Update 3D Weapon Silhouette & Materials based on equippedWeaponId
    const isScythe = weaponId === 'mythic_plague_scythe';
    const isCleaver = weaponId === 'mythic_black_cleaver';
    const isDuskFangs = weaponId === 'mythic_dusk_fangs';
    const isSunEater = weaponId === 'mythic_sun_eater';
    const isVoidVoice = weaponId === 'mythic_void_voice';
    const isRelicGreatsword = weaponId === 'relic_blade' || weaponId === 'sword_order_crimson';

    if (scytheHead) scytheHead.visible = isScythe;
    if (cleaverHead) cleaverHead.visible = isCleaver;
    if (offhandDagger) offhandDagger.visible = isDuskFangs;

    if (crossguard && crossguard.material instanceof THREE.MeshStandardMaterial) {
      crossguard.scale.set(isSunEater || isRelicGreatsword ? 1.38 : isScythe ? 0.55 : 1.0, 1, 1);
      crossguard.material.color.setHex(
        isSunEater || isRelicGreatsword
          ? 0xf59e0b
          : isVoidVoice || isDuskFangs
          ? 0xc084fc
          : activeSword === 'silver'
          ? 0xe2e8f0
          : 0x64748b
      );
    }

    if (blade && blade.material instanceof THREE.MeshStandardMaterial) {
      // Morph blade width & length by weapon archetype
      if (isSunEater || isRelicGreatsword) {
        blade.scale.set(1.65, 1.18, 1.25);
      } else if (isScythe) {
        blade.scale.set(0.55, 1.15, 0.9);
      } else if (isCleaver) {
        blade.scale.set(1.15, 0.92, 1.1);
      } else if (isDuskFangs) {
        blade.scale.set(0.88, 0.9, 1.0);
      } else {
        blade.scale.set(1.0, 1.0, 1.0);
      }

      blade.material.color.setHex(
        isSunEater
          ? 0xfde047
          : isVoidVoice
          ? 0xe9d5ff
          : isScythe
          ? 0xbef264
          : isCleaver
          ? 0x38bdf8
          : activeSword === 'silver'
          ? 0xf1f5f9
          : 0x94a3b8
      );
      blade.material.metalness = activeSword === 'silver' ? 0.96 : 0.85;
      blade.material.roughness = activeSword === 'silver' ? 0.14 : 0.26;

      if (isSunEater || runeEffect === 'fire') {
        blade.material.emissive.setHex(0xf97316);
        blade.material.emissiveIntensity = isSunEater ? 1.45 : 0.95;
      } else if (isVoidVoice || runeEffect === 'void') {
        blade.material.emissive.setHex(0xa855f7);
        blade.material.emissiveIntensity = 1.3;
      } else if (isScythe) {
        blade.material.emissive.setHex(0x65a30d);
        blade.material.emissiveIntensity = 0.95;
      } else if (isCleaver || runeEffect === 'frost') {
        blade.material.emissive.setHex(0x38bdf8);
        blade.material.emissiveIntensity = 1.15;
      } else if (isDuskFangs || runeEffect === 'vamp') {
        blade.material.emissive.setHex(0x9333ea);
        blade.material.emissiveIntensity = 0.95;
      } else if (runeEffect === 'bleed') {
        blade.material.emissive.setHex(0xdc2626);
        blade.material.emissiveIntensity = 0.85;
      } else if (activeSword === 'silver') {
        blade.material.emissive.setHex(0x38bdf8);
        blade.material.emissiveIntensity = 0.45;
      } else {
        blade.material.emissive.setHex(0x475569);
        blade.material.emissiveIntensity = 0.08;
      }
    }

    if (runeStrip && runeStrip.material instanceof THREE.MeshStandardMaterial) {
      runeStrip.visible =
        activeSword === 'silver' ||
        Boolean(runeEffect) ||
        isSunEater ||
        isVoidVoice ||
        isDuskFangs;
      if (isSunEater || runeEffect === 'fire') {
        runeStrip.material.color.setHex(0xfbbf24);
        runeStrip.material.emissive.setHex(0xf97316);
      } else if (isVoidVoice || isDuskFangs || runeEffect === 'void') {
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
      | 'streamer_foozzee'
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
      streamer_foozzee: 0x1e1b4b,
    };

    const isArmored =
      role === 'inquisitor' ||
      role === 'kael' ||
      role === 'guard' ||
      role === 'thorvald' ||
      role === 'streamer_foozzee';

    const tunicMat = new THREE.MeshStandardMaterial({
      color: tunicColors[role],
      roughness: role === 'streamer_foozzee' ? 0.22 : isArmored ? 0.38 : 0.68,
      metalness: role === 'streamer_foozzee' ? 0.85 : isArmored ? 0.68 : 0.12,
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: role === 'streamer_foozzee' ? 0x0f172a : isArmored ? 0x1e293b : 0x292524,
      roughness: role === 'streamer_foozzee' ? 0.3 : 0.78,
      metalness: role === 'streamer_foozzee' ? 0.65 : 0.1,
    });

    // 1. Articulated Left & Right Legs (pivoted at hip y = 0.82) — smooth thighs, calves & boots
    const bootMat = isArmored ? steelMat : leatherMat;
    const leftLeg = new THREE.Group();
    leftLeg.name = 'npcLeftLeg';
    leftLeg.position.set(-0.14, 0.82, 0);
    const leftThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.098, 0.34, 8, 12), pantsMat);
    leftThigh.position.y = -0.22;
    leftThigh.castShadow = true;
    const leftBootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.078, 0.34, 12), bootMat);
    leftBootShaft.position.set(0, -0.6, 0.01);
    leftBootShaft.castShadow = true;
    const leftBootFoot = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.12, 8, 10), bootMat);
    leftBootFoot.rotation.x = Math.PI / 2;
    leftBootFoot.scale.set(1.04, 1.0, 0.72);
    leftBootFoot.position.set(0, -0.74, 0.055);
    leftBootFoot.castShadow = true;
    leftLeg.add(leftThigh, leftBootShaft, leftBootFoot);

    const rightLeg = new THREE.Group();
    rightLeg.name = 'npcRightLeg';
    rightLeg.position.set(0.14, 0.82, 0);
    const rightThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.098, 0.34, 8, 12), pantsMat);
    rightThigh.position.y = -0.22;
    rightThigh.castShadow = true;
    const rightBootShaft = leftBootShaft.clone();
    const rightBootFoot = leftBootFoot.clone();
    rightLeg.add(rightThigh, rightBootShaft, rightBootFoot);

    // 2. Torso with Belt, Buckle & Role Attire — organic human proportions
    const torso = new THREE.Group();
    torso.name = 'npcTorso';
    torso.position.set(0, 1.15, 0);

    const chestMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.195, 0.68, 16, 2),
      tunicMat
    );
    chestMesh.scale.set(1.06, 1.0, 0.72);
    chestMesh.castShadow = true;
    const shouldersRound = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.135, 0.34, 8, 12),
      tunicMat
    );
    shouldersRound.rotation.z = Math.PI / 2;
    shouldersRound.scale.set(1.0, 1.0, 0.78);
    shouldersRound.position.set(0, 0.23, 0);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.218, 0.095, 16), leatherMat);
    belt.scale.set(1.08, 1.0, 0.76);
    belt.position.y = -0.24;
    const buckle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.035, 12),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 })
    );
    buckle.rotation.x = Math.PI / 2;
    buckle.position.set(0, -0.24, 0.165);
    torso.add(chestMesh, shouldersRound, belt, buckle);

    // 3. Detailed Human Head with Facial Features (Neck, Cranium, Jawline, Eyes, Brows, Nose, Beard/Hair)
    const head = new THREE.Group();
    head.name = 'npcHead';
    head.position.set(0, 1.68, 0);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.088, 0.13, 12), skinMat);
    neck.position.set(0, -0.15, -0.01);
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.158, 16, 14), skinMat);
    cranium.scale.set(0.92, 1.08, 0.96);
    cranium.castShadow = true;
    const jawline = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.084, 0.12, 12), skinMat);
    jawline.scale.set(0.95, 1.0, 0.9);
    jawline.position.set(0, -0.075, 0.018);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.072, 8), skinMat);
    nose.rotation.x = Math.PI * 0.42;
    nose.position.set(0, 0.0, 0.158);

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
      emissiveIntensity: role === 'vesper' || role === 'kael' ? 0.85 : 0.35,
    });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.023, 8, 8), eyeMat);
    eyeL.position.set(-0.056, 0.028, 0.144);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.056;

    const hairColorHex =
      role === 'elder' || role === 'vesper'
        ? 0xd6d3d1
        : role === 'blacksmith' || role === 'brom' || role === 'thorvald'
        ? 0x451a03
        : role === 'herbalist' || role === 'bard'
        ? 0x7c2d12
        : 0x27272a;
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColorHex, roughness: 0.85 });
    const browL = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.042, 4, 6), hairMat);
    browL.rotation.z = Math.PI / 2;
    browL.position.set(-0.056, 0.068, 0.146);
    const browR = browL.clone();
    browR.position.x = 0.056;

    const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.168, 14, 12), hairMat);
    hairBack.scale.set(0.95, 0.94, 1.02);
    hairBack.position.set(0, 0.045, -0.022);

    head.add(neck, cranium, jawline, nose, eyeL, eyeR, browL, browR, hairBack);

    if (
      role === 'elder' ||
      role === 'blacksmith' ||
      role === 'brom' ||
      role === 'thorvald' ||
      role === 'merchant'
    ) {
      const beard = new THREE.Mesh(
        new THREE.ConeGeometry(0.125, role === 'elder' ? 0.26 : 0.17, 12),
        hairMat
      );
      beard.rotation.x = Math.PI;
      beard.scale.set(1.0, 1.0, 0.72);
      beard.position.set(0, role === 'elder' ? -0.16 : -0.12, 0.095);
      head.add(beard);
    }

    // 4. Articulated Left & Right Arms (pivoted at shoulders y = 1.44)
    const leftArm = new THREE.Group();
    leftArm.name = 'npcLeftArm';
    leftArm.position.set(-0.32, 1.44, 0);
    const leftSleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.078, 0.38, 8, 12),
      role === 'blacksmith' ? skinMat : tunicMat
    );
    leftSleeve.position.y = -0.22;
    leftSleeve.castShadow = true;
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), skinMat);
    leftHand.position.set(0, -0.46, 0.02);
    leftArm.add(leftSleeve, leftHand);

    const rightArm = new THREE.Group();
    rightArm.name = 'npcRightArm';
    rightArm.position.set(0.32, 1.44, 0);
    const rightSleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.078, 0.38, 8, 12),
      role === 'blacksmith' ? skinMat : tunicMat
    );
    rightSleeve.position.y = -0.22;
    rightSleeve.castShadow = true;
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), skinMat);
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
          roughness: 0.2,
        })
      );
      bladeR.position.set(0.38, 1.15, 0.25);
      bladeR.rotation.x = 0.45;
      bladeR.name = 'npcWeapon';
      group.add(bladeR);
    } else if (role === 'streamer_foozzee') {
      // Futuristic Cyber-Neon Traveler Armor (Twitch Violet #9146ff + Cyber Cyan #00f0ff + Titanium)
      const cyberPurpleMat = new THREE.MeshStandardMaterial({
        color: 0x9146ff,
        emissive: 0x7c3aed,
        emissiveIntensity: 1.35,
        metalness: 0.85,
        roughness: 0.18,
      });
      const cyberCyanMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.5,
        metalness: 0.9,
        roughness: 0.15,
      });
      const darkTitaniumMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.92,
        roughness: 0.22,
      });

      // Exo-armor chest plate & glowing arc-reactor core
      const exoChest = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.56, 0.34),
        darkTitaniumMat
      );
      exoChest.position.set(0, 0.04, 0.02);
      const chestCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.085, 1),
        cyberCyanMat
      );
      chestCore.position.set(0, 0.08, 0.2);
      const neonTrimLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.5, 0.36),
        cyberPurpleMat
      );
      neonTrimLeft.position.set(-0.22, 0.04, 0.02);
      const neonTrimRight = neonTrimLeft.clone();
      neonTrimRight.position.x = 0.22;

      // High-tech floating shoulder pauldrons with neon trim
      const pauldronL = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.16, 0.36),
        darkTitaniumMat
      );
      pauldronL.position.set(-0.34, 0.28, 0);
      pauldronL.rotation.z = 0.22;
      const pauldronEdgeL = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.04, 0.38),
        cyberPurpleMat
      );
      pauldronEdgeL.position.set(-0.34, 0.35, 0);
      pauldronEdgeL.rotation.z = 0.22;

      const pauldronR = pauldronL.clone();
      pauldronR.position.x = 0.34;
      pauldronR.rotation.z = -0.22;
      const pauldronEdgeR = pauldronEdgeL.clone();
      pauldronEdgeR.position.x = 0.34;
      pauldronEdgeR.rotation.z = -0.22;

      // Holographic cyber-cape / thruster pack on back
      const jetpack = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.48, 0.18),
        darkTitaniumMat
      );
      jetpack.position.set(0, 0.06, -0.24);
      const thrusterL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.075, 0.18, 10),
        cyberCyanMat
      );
      thrusterL.position.set(-0.12, -0.18, -0.26);
      const thrusterR = thrusterL.clone();
      thrusterR.position.x = 0.12;

      torso.add(
        exoChest,
        chestCore,
        neonTrimLeft,
        neonTrimRight,
        pauldronL,
        pauldronEdgeL,
        pauldronR,
        pauldronEdgeR,
        jetpack,
        thrusterL,
        thrusterR
      );

      // Futuristic Cyber-Visor & Pro-Streamer Headset on Head
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.075, 0.16),
        cyberCyanMat
      );
      visor.position.set(0, 0.03, 0.11);
      const headsetBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.175, 0.024, 8, 16, Math.PI),
        cyberPurpleMat
      );
      headsetBand.position.set(0, 0.04, 0);
      const earCupL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.05, 12),
        cyberPurpleMat
      );
      earCupL.rotation.z = Math.PI / 2;
      earCupL.position.set(-0.175, 0.02, 0);
      const earCupR = earCupL.clone();
      earCupR.position.x = 0.175;
      head.add(visor, headsetBand, earCupL, earCupR);

      // Cool Futuristic Weapon: High-Tech Plasma Riffle-Blade ("Квазар-Фуззи 3099")
      const plasmaWeapon = new THREE.Group();
      plasmaWeapon.name = 'npcWeapon';
      plasmaWeapon.position.set(0.38, 1.15, 0.26);
      plasmaWeapon.rotation.x = 0.38;
      const hilt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.038, 0.36, 10),
        darkTitaniumMat
      );
      const plasmaCore = new THREE.Mesh(
        new THREE.BoxGeometry(0.075, 0.92, 0.14),
        cyberPurpleMat
      );
      plasmaCore.position.set(0, 0.52, 0);
      const plasmaEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.98, 0.18),
        cyberCyanMat
      );
      plasmaEdge.position.set(0, 0.55, 0.03);
      plasmaWeapon.add(hilt, plasmaCore, plasmaEdge);
      group.add(plasmaWeapon);

      // Floating Twitch Stream Holo-Camera Drone hovering above left shoulder
      const droneGroup = new THREE.Group();
      droneGroup.name = 'foozzeeDrone';
      droneGroup.position.set(-0.55, 2.05, 0.25);
      const droneSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 14, 14),
        darkTitaniumMat
      );
      const droneRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.02, 8, 18),
        cyberPurpleMat
      );
      droneRing.rotation.x = Math.PI / 2;
      const droneLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.08, 12),
        cyberCyanMat
      );
      droneLens.rotation.x = Math.PI / 2;
      droneLens.position.set(0, 0, 0.12);
      droneGroup.add(droneSphere, droneRing, droneLens);
      group.add(droneGroup);
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
      emissive: 0xdc2626,
      emissiveIntensity: 0.85,
    });

    if (type === 'wolf') {
      const furMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9 });
      const darkFur = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 });

      body.position.set(0, 0.55, 0);
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.66, 10, 14), furMat);
      torso.rotation.x = Math.PI / 2;
      torso.castShadow = true;
      const mane = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), darkFur);
      mane.scale.set(1.0, 0.95, 1.15);
      mane.position.set(0, 0.06, 0.28);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.52, 10), darkFur);
      tail.position.set(0, 0.05, -0.65);
      tail.rotation.x = -Math.PI / 3;
      cloakMesh = tail;
      body.add(torso, mane, tail);

      head.position.set(0, 0.18, 0.62);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), furMat);
      skull.scale.set(0.95, 0.9, 1.18);
      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 10), darkFur);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, -0.04, 0.24);
      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 8), darkFur);
      earL.position.set(-0.1, 0.16, -0.02);
      const earR = earL.clone();
      earR.position.x = 0.1;
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat);
      eyeL.position.set(-0.09, 0.05, 0.16);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.09;
      head.add(skull, snout, earL, earR, eyeL, eyeR);
      body.add(head);

      const legGeo = new THREE.CapsuleGeometry(0.058, 0.4, 6, 10);
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
        roughness: isAsh ? 0.35 : 0.68,
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
        emissiveIntensity: isVesper ? 0.9 : isAsh || isDrowned || isSkel ? 0.65 : 0,
        roughness: 0.4,
      });
      const clothMat = this.getMaterial('darkCloth');

      body.position.set(0, isVesper ? 0.92 : 0.78, 0);
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(
          isVesper ? 0.28 : 0.24,
          isVesper ? 0.22 : 0.18,
          isVesper ? 0.76 : 0.66,
          16,
          2
        ),
        fleshMat
      );
      torso.scale.set(1.08, 1.0, 0.74);
      torso.position.set(0, 0.22, 0.06);
      torso.rotation.x = isAsh || isSkel ? 0.06 : 0.32;
      torso.castShadow = true;

      const tatteredCloak = new THREE.Mesh(
        new THREE.CylinderGeometry(
          isVesper ? 0.28 : 0.22,
          isVesper ? 0.38 : 0.3,
          isVesper ? 0.95 : 0.68,
          12,
          1,
          false,
          -Math.PI * 0.42,
          Math.PI * 0.84
        ),
        clothMat
      );
      tatteredCloak.scale.set(1.05, 1.0, 0.35);
      tatteredCloak.position.set(0, 0.15, -0.18);
      tatteredCloak.rotation.x = 0.25;
      cloakMesh = tatteredCloak;

      for (let i = 0; i < 3; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 8), spineMat);
        spike.position.set(0, 0.42 - i * 0.16, -0.14);
        spike.rotation.x = -0.6;
        body.add(spike);
      }
      body.add(torso, tatteredCloak);

      head.position.set(0, 0.58, 0.22);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), fleshMat);
      skull.scale.set(0.92, 1.08, 0.98);
      const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.12, 12), fleshMat);
      jaw.position.set(0, -0.09, 0.02);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), spineMat);
      eyeL.position.set(-0.068, 0.025, 0.165);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.068;
      head.add(skull, jaw, eyeL, eyeR);
      body.add(head);

      const clawGeo = new THREE.CapsuleGeometry(0.082, 0.48, 8, 12);
      leftArm.position.set(-0.34, 0.42, 0.12);
      const armL = new THREE.Mesh(clawGeo, fleshMat);
      armL.position.set(0, -0.24, 0.08);
      armL.rotation.x = -0.35;
      leftArm.add(armL);
      if (isVesper) {
        const offhandBlade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.036, 0.88, 8),
          spineMat
        );
        offhandBlade.scale.set(1.2, 1.0, 0.35);
        offhandBlade.position.set(0, -0.55, 0.28);
        offhandBlade.rotation.x = Math.PI / 2.3;
        leftArm.add(offhandBlade);
      }

      rightArm.position.set(0.34, 0.42, 0.12);
      const armR = armL.clone();
      const boneBlade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.042, isVesper ? 1.05 : 0.72, 8),
        spineMat
      );
      boneBlade.scale.set(1.25, 1.0, 0.4);
      boneBlade.position.set(0, -0.52, 0.28);
      boneBlade.rotation.x = Math.PI / 2.4;
      weaponMesh = boneBlade;
      rightArm.add(armR, boneBlade);
      body.add(leftArm, rightArm);

      const legGeo = new THREE.CapsuleGeometry(0.1, 0.45, 8, 12);
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
        emissiveIntensity: isFrost || isNoon ? 0.45 : isPlague ? 0.25 : 0,
        transparent: isNoon || isFrost,
        opacity: isNoon || isFrost ? 0.8 : 1.0,
        roughness: 0.7,
      });
      const rotMat = new THREE.MeshStandardMaterial({
        color: isFrost ? 0x38bdf8 : isNoon ? 0x99f6e4 : 0x4d7c0f,
        roughness: 0.8,
      });
      const orbMat = new THREE.MeshStandardMaterial({
        color: isFrost ? 0x38bdf8 : isPlague ? 0x84cc16 : isNoon ? 0x2dd4bf : 0xa855f7,
        emissive: isFrost ? 0x0284c7 : isPlague ? 0x4d7c0f : isNoon ? 0x14b8a6 : 0x9333ea,
        emissiveIntensity: 0.85,
      });

      body.position.set(0, 0.85, 0);
      const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 16), robeMat);
      skirt.position.y = -0.05;
      skirt.castShadow = true;
      const shawl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.42, 0.9, 14, 1, false, -Math.PI * 0.45, Math.PI * 0.9),
        robeMat
      );
      shawl.scale.set(1.05, 1.0, 0.45);
      shawl.position.set(0, 0.2, -0.2);
      cloakMesh = shawl;
      body.add(skirt, shawl);

      head.position.set(0, 0.78, 0.08);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), rotMat);
      skull.scale.set(0.92, 1.08, 0.98);
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.48, 14), robeMat);
      hood.position.set(0, 0.24, -0.04);
      head.add(skull, hood);
      body.add(head);

      leftArm.position.set(-0.36, 0.55, 0);
      const sleeveL = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.45, 8, 12), robeMat);
      sleeveL.position.y = -0.22;
      leftArm.add(sleeveL);

      rightArm.position.set(0.36, 0.55, 0);
      const sleeveR = sleeveL.clone();
      const staff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 1.85, 10),
        this.getMaterial('wood')
      );
      staff.position.set(0.06, -0.1, 0.22);
      staff.rotation.x = 0.25;
      const orb = new THREE.Mesh(
        isPlague ? new THREE.ConeGeometry(0.14, 0.55, 10) : new THREE.OctahedronGeometry(0.16, 1),
        orbMat
      );
      if (isPlague) orb.rotation.z = -Math.PI / 2.3;
      orb.position.set(0.06, 0.85, 0.44);
      weaponMesh = staff;
      rightArm.add(sleeveR, staff, orb);
      body.add(leftArm, rightArm);

      leftLeg.position.set(-0.18, 0.75, 0);
      const bootL = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.36, 8, 12), robeMat);
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
        emissiveIntensity: 0.85,
      });

      const scaleMult = isHydra || isColossus ? 1.28 : 1.0;
      body.position.set(0, 1.1 * scaleMult, 0);
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5 * scaleMult, 0.38 * scaleMult, 1.35 * scaleMult, 16, 2),
        barkMat
      );
      torso.scale.set(1.12, 1.0, 0.76);
      torso.position.y = 0.55 * scaleMult;
      torso.castShadow = true;
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26 * scaleMult, 1), runeMat);
      core.position.set(0, 0.6 * scaleMult, 0.3 * scaleMult);
      const mossCape = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.42 * scaleMult,
          (isGargoyle ? 0.78 : 0.54) * scaleMult,
          1.35 * scaleMult,
          14,
          1,
          false,
          -Math.PI * 0.44,
          Math.PI * 0.88
        ),
        barkMat
      );
      mossCape.scale.set(1.05, 1.0, 0.35);
      mossCape.position.set(0, 0.55 * scaleMult, -0.3 * scaleMult);
      cloakMesh = mossCape;
      body.add(torso, core, mossCape);

      // Hydra extra serpent heads or Colossus 3 crystal growths
      if (isHydra) {
        const neckL = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.85, 8, 12), barkMat);
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
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 14), boneMat);
      skull.scale.set(0.92, 1.04, 1.16);
      const antlerL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.75, 10), runeMat);
      antlerL.position.set(-0.35, 0.4, -0.05);
      antlerL.rotation.z = 0.45;
      const antlerR = antlerL.clone();
      antlerR.position.x = 0.35;
      antlerR.rotation.z = -0.45;
      head.add(skull, antlerL, antlerR);
      body.add(head);

      const armGeo = new THREE.CapsuleGeometry(0.15 * scaleMult, 0.85 * scaleMult, 8, 12);
      leftArm.position.set(-0.66 * scaleMult, 1.05 * scaleMult, 0.08);
      const armL = new THREE.Mesh(armGeo, barkMat);
      armL.position.y = -0.48 * scaleMult;
      leftArm.add(armL);

      rightArm.position.set(0.66 * scaleMult, 1.05 * scaleMult, 0.08);
      const armR = armL.clone();
      const runicClub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.08, 1.45, 10),
        runeMat
      );
      runicClub.position.set(0, -0.95, 0.45);
      runicClub.rotation.x = Math.PI / 2.3;
      weaponMesh = runicClub;
      rightArm.add(armR, runicClub);
      body.add(leftArm, rightArm);

      const legGeo = new THREE.CapsuleGeometry(0.16 * scaleMult, 0.8 * scaleMult, 8, 12);
      leftLeg.position.set(-0.28 * scaleMult, 1.1 * scaleMult, 0);
      const legL = new THREE.Mesh(legGeo, barkMat);
      legL.position.y = -0.55 * scaleMult;
      leftLeg.add(legL);

      rightLeg.position.set(0.28 * scaleMult, 1.1 * scaleMult, 0);
      const legR = legL.clone();
      rightLeg.add(legR);
    } else if (
      type === 'mana_wyrm' ||
      type === 'corrupted_treant' ||
      type === 'boss_emerald_archon'
    ) {
      // Biome 6 (WoW style): Emerald Dreamweald — Mana Wyrm, Corrupted Treant & Archdruid Xavius-Vald
      const isWyrm = type === 'mana_wyrm';
      const isArchon = type === 'boss_emerald_archon';
      const scaleMult = isArchon ? 1.34 : isWyrm ? 0.85 : 1.08;

      const barkMat = new THREE.MeshStandardMaterial({
        color: isWyrm ? 0x0e7490 : isArchon ? 0x14261c : 0x1f3a2c,
        roughness: isWyrm ? 0.3 : 0.82,
        metalness: isWyrm ? 0.45 : 0.12,
      });
      const dreamGlowMat = new THREE.MeshStandardMaterial({
        color: isWyrm ? 0x22d3ee : isArchon ? 0x10b981 : 0x34d399,
        emissive: isWyrm ? 0x06b6d4 : isArchon ? 0x059669 : 0x10b981,
        emissiveIntensity: 0.9,
      });
      const nightmareGlowMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 0.95,
      });

      body.position.set(0, (isWyrm ? 1.05 : 1.15) * scaleMult, 0);
      const torso = new THREE.Mesh(
        isWyrm
          ? new THREE.CapsuleGeometry(0.22, 0.95, 10, 14)
          : new THREE.CylinderGeometry(0.5 * scaleMult, 0.38 * scaleMult, 1.38 * scaleMult, 16, 2),
        barkMat
      );
      if (!isWyrm) torso.scale.set(1.1, 1.0, 0.76);
      torso.position.y = 0.55 * scaleMult;
      torso.castShadow = true;

      const heartGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28 * scaleMult, 1),
        isArchon ? nightmareGlowMat : dreamGlowMat
      );
      heartGem.position.set(0, 0.62 * scaleMult, 0.3 * scaleMult);

      const canopyMantle = new THREE.Mesh(
        new THREE.ConeGeometry(0.75 * scaleMult, 0.9 * scaleMult, 14),
        dreamGlowMat
      );
      canopyMantle.position.set(0, 1.05 * scaleMult, -0.22 * scaleMult);
      cloakMesh = canopyMantle;
      body.add(torso, heartGem, canopyMantle);

      if (isArchon) {
        const nightmareHalo = new THREE.Mesh(
          new THREE.TorusGeometry(0.72 * scaleMult, 0.055, 10, 24),
          nightmareGlowMat
        );
        nightmareHalo.position.set(0, 1.55 * scaleMult, -0.18 * scaleMult);
        body.add(nightmareHalo);
      }

      head.position.set(0, 1.48 * scaleMult, 0.16 * scaleMult);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), barkMat);
      skull.scale.set(0.94, 1.06, 1.08);
      const antlerL = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.88 * scaleMult, 10),
        isArchon ? nightmareGlowMat : dreamGlowMat
      );
      antlerL.position.set(-0.38, 0.48, 0);
      antlerL.rotation.z = 0.48;
      const antlerR = antlerL.clone();
      antlerR.position.x = 0.38;
      antlerR.rotation.z = -0.48;
      head.add(skull, antlerL, antlerR);
      body.add(head);

      leftArm.position.set(-0.66 * scaleMult, 1.05 * scaleMult, 0.08);
      const armL = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.14 * scaleMult, 0.85 * scaleMult, 8, 12),
        barkMat
      );
      armL.position.y = -0.48 * scaleMult;
      leftArm.add(armL);

      rightArm.position.set(0.66 * scaleMult, 1.05 * scaleMult, 0.08);
      const armR = armL.clone();
      const dreamStaff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07 * scaleMult, 0.05 * scaleMult, 1.85 * scaleMult, 10),
        isArchon ? nightmareGlowMat : dreamGlowMat
      );
      dreamStaff.position.set(0, -0.92 * scaleMult, 0.5 * scaleMult);
      dreamStaff.rotation.x = Math.PI / 2.3;
      weaponMesh = dreamStaff;
      rightArm.add(armR, dreamStaff);
      body.add(leftArm, rightArm);

      leftLeg.position.set(-0.28 * scaleMult, 1.1 * scaleMult, 0);
      const legL = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.16 * scaleMult, 0.8 * scaleMult, 8, 12),
        barkMat
      );
      legL.position.y = -0.55 * scaleMult;
      leftLeg.add(legL);

      rightLeg.position.set(0.28 * scaleMult, 1.1 * scaleMult, 0);
      const legR = legL.clone();
      rightLeg.add(legR);
    } else if (
      type === 'aether_construct' ||
      type === 'daeic_shadow' ||
      type === 'boss_aether_seraph'
    ) {
      // Biome 7 (Aion style): Celestial Aether Sanctum — Aether Construct, Winged Daeic Shadow & Fallen Seraph Azrael
      const isShadow = type === 'daeic_shadow';
      const isSeraph = type === 'boss_aether_seraph';
      const scaleMult = isSeraph ? 1.35 : isShadow ? 0.96 : 1.08;

      const marbleArmorMat = new THREE.MeshPhysicalMaterial({
        color: isShadow ? 0x1e1b4b : 0xf8fafc,
        roughness: 0.22,
        metalness: 0.82,
        clearcoat: 0.65,
      });
      const goldTrimMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.55,
        roughness: 0.22,
        metalness: 0.92,
      });
      const aetherMat = new THREE.MeshStandardMaterial({
        color: isShadow ? 0xc084fc : 0x38bdf8,
        emissive: isShadow ? 0x9333ea : 0x0284c7,
        emissiveIntensity: 0.95,
      });

      body.position.set(0, 1.22 * scaleMult, 0);
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52 * scaleMult, 0.38 * scaleMult, 1.48 * scaleMult, 16, 2),
        marbleArmorMat
      );
      torso.scale.set(1.08, 1.0, 0.72);
      torso.position.y = 0.68 * scaleMult;
      torso.castShadow = true;

      const aetherRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.68 * scaleMult, 0.05, 10, 24),
        aetherMat
      );
      aetherRing.position.set(0, 1.15 * scaleMult, -0.28 * scaleMult);

      // Aion-style Luminous Feathered Wings — smooth tapered feathers
      const wingGroup = new THREE.Group();
      wingGroup.position.set(0, 0.95 * scaleMult, -0.32 * scaleMult);
      const wingPairs = isSeraph ? 3 : 1;
      for (let w = 0; w < wingPairs; w++) {
        const wingSpan = (1.35 - w * 0.2) * scaleMult;
        const wingL = new THREE.Mesh(
          new THREE.ConeGeometry(0.22 * scaleMult, wingSpan, 10),
          w % 2 === 0 ? aetherMat : goldTrimMat
        );
        wingL.scale.set(1.0, 1.0, 0.25);
        wingL.position.set(-wingSpan * 0.52, (w - 0.5) * 0.32, 0);
        wingL.rotation.z = Math.PI / 2 + 0.32 + w * 0.18;
        const wingR = wingL.clone();
        wingR.position.x = wingSpan * 0.52;
        wingR.rotation.z = -(Math.PI / 2 + 0.32 + w * 0.18);
        wingGroup.add(wingL, wingR);
      }
      cloakMesh = wingGroup;
      body.add(torso, aetherRing, wingGroup);

      head.position.set(0, 1.68 * scaleMult, 0);
      const helm = new THREE.Mesh(
        new THREE.SphereGeometry(0.27, 16, 14),
        marbleArmorMat
      );
      helm.scale.set(0.92, 1.12, 0.98);
      const haloCrown = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.035, 8, 20),
        goldTrimMat
      );
      haloCrown.position.set(0, 0.32, 0);
      haloCrown.rotation.x = Math.PI / 2;
      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.075, 14, 1, false, -Math.PI * 0.35, Math.PI * 0.7),
        aetherMat
      );
      visor.position.set(0, 0.04, 0.03);
      head.add(helm, haloCrown, visor);
      body.add(head);

      leftArm.position.set(-0.76 * scaleMult, 1.2 * scaleMult, 0);
      const armL = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.15 * scaleMult, 0.92 * scaleMult, 8, 12),
        marbleArmorMat
      );
      armL.position.y = -0.52 * scaleMult;
      leftArm.add(armL);

      rightArm.position.set(0.76 * scaleMult, 1.2 * scaleMult, 0);
      const armR = armL.clone();
      const aetherGlaive = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02 * scaleMult, 0.09 * scaleMult, 2.35 * scaleMult, 10),
        aetherMat
      );
      aetherGlaive.scale.set(1.2, 1.0, 0.35);
      aetherGlaive.position.set(0, -1.0 * scaleMult, 0.8 * scaleMult);
      aetherGlaive.rotation.x = Math.PI / 2.3;
      weaponMesh = aetherGlaive;
      rightArm.add(armR, aetherGlaive);
      body.add(leftArm, rightArm);

      leftLeg.position.set(-0.3 * scaleMult, 1.15 * scaleMult, 0);
      const legL = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.16 * scaleMult, 0.85 * scaleMult, 8, 12),
        goldTrimMat
      );
      legL.position.y = -0.58 * scaleMult;
      leftLeg.add(legL);

      rightLeg.position.set(0.3 * scaleMult, 1.15 * scaleMult, 0);
      const legR = legL.clone();
      rightLeg.add(legR);
    } else if (
      type === 'scrap_watcher' ||
      type === 'ravager_stalker' ||
      type === 'boss_cauldron_behemoth'
    ) {
      // Biome 8 (Horizon style): Primeval Machine Cauldron HEPHAESTUS — Watcher, Ravager & Thunderjaw-Behemoth
      const isWatcher = type === 'scrap_watcher';
      const isBehemoth = type === 'boss_cauldron_behemoth';
      const scaleMult = isBehemoth ? 1.38 : isWatcher ? 0.92 : 1.12;

      const chassisMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.32,
        metalness: 0.88,
      });
      const ceramicPlateMat = new THREE.MeshStandardMaterial({
        color: isBehemoth ? 0xd97706 : 0xe2e8f0,
        roughness: 0.35,
        metalness: 0.65,
      });
      const coreConduitMat = new THREE.MeshStandardMaterial({
        color: isBehemoth ? 0xef4444 : 0x38bdf8,
        emissive: isBehemoth ? 0xdc2626 : 0x0284c7,
        emissiveIntensity: 0.95,
      });

      body.position.set(0, (isWatcher ? 0.88 : 1.05) * scaleMult, 0);
      const chassis = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.44 * scaleMult, 0.86 * scaleMult, 10, 14),
        chassisMat
      );
      chassis.rotation.x = Math.PI / 2;
      chassis.position.y = 0.35 * scaleMult;
      chassis.castShadow = true;

      const armorShell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48 * scaleMult, 0.54 * scaleMult, 1.12 * scaleMult, 12),
        ceramicPlateMat
      );
      armorShell.rotation.x = Math.PI / 2;
      armorShell.scale.set(1.05, 1.0, 0.55);
      armorShell.position.set(0, 0.65 * scaleMult, 0.05);

      // Dorsal disc-launchers / plasma cannons on Ravager & Behemoth
      if (!isWatcher) {
        for (const side of [-1, 1]) {
          const cannon = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14 * scaleMult, 0.16 * scaleMult, 0.95 * scaleMult, 10),
            coreConduitMat
          );
          cannon.position.set(side * 0.56 * scaleMult, 0.92 * scaleMult, -0.1);
          cannon.rotation.x = Math.PI / 2.4;
          body.add(cannon);
        }
      }

      const mechTail = new THREE.Mesh(
        new THREE.ConeGeometry(0.16 * scaleMult, 1.15 * scaleMult, 10),
        ceramicPlateMat
      );
      mechTail.position.set(0, 0.35 * scaleMult, -0.95 * scaleMult);
      mechTail.rotation.x = -Math.PI / 2.6;
      cloakMesh = mechTail;
      body.add(chassis, armorShell, mechTail);

      head.position.set(0, 0.55 * scaleMult, 0.88 * scaleMult);
      const sensorPod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28 * scaleMult, 0.34 * scaleMult, 0.56 * scaleMult, 12),
        ceramicPlateMat
      );
      sensorPod.rotation.x = Math.PI / 2;
      const opticEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.19 * scaleMult, 12, 12),
        coreConduitMat
      );
      opticEye.position.set(0, 0, 0.28 * scaleMult);
      head.add(sensorPod, opticEye);
      body.add(head);

      leftArm.position.set(-0.56 * scaleMult, 0.35 * scaleMult, 0.42 * scaleMult);
      const strutL = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.12 * scaleMult, 0.72 * scaleMult, 8, 12),
        chassisMat
      );
      strutL.position.y = -0.42 * scaleMult;
      leftArm.add(strutL);

      rightArm.position.set(0.56 * scaleMult, 0.35 * scaleMult, 0.42 * scaleMult);
      const strutR = strutL.clone();
      const plasmaCutter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06 * scaleMult, 0.12 * scaleMult, 1.35 * scaleMult, 10),
        coreConduitMat
      );
      plasmaCutter.position.set(0, -0.68 * scaleMult, 0.42 * scaleMult);
      plasmaCutter.rotation.x = Math.PI / 2.3;
      weaponMesh = plasmaCutter;
      rightArm.add(strutR, plasmaCutter);
      body.add(leftArm, rightArm);

      leftLeg.position.set(-0.38 * scaleMult, 0.95 * scaleMult, -0.38 * scaleMult);
      const pistonL = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.14 * scaleMult, 0.72 * scaleMult, 8, 12),
        ceramicPlateMat
      );
      pistonL.position.y = -0.48 * scaleMult;
      leftLeg.add(pistonL);

      rightLeg.position.set(0.38 * scaleMult, 0.95 * scaleMult, -0.38 * scaleMult);
      const pistonR = pistonL.clone();
      rightLeg.add(pistonR);
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
        emissiveIntensity: isAvatar ? 0.75 : isMalakor ? 0.45 : 0,
        roughness: 0.3,
        metalness: 0.9,
      });
      const spectralMat = new THREE.MeshStandardMaterial({
        color: isAvatar ? 0xef4444 : isMalakor || isVoidKnight ? 0xa855f7 : 0x38bdf8,
        emissive: isAvatar ? 0xdc2626 : isMalakor || isVoidKnight ? 0x9333ea : 0x0284c7,
        emissiveIntensity: 0.95,
      });

      body.position.set(0, 1.2 * scaleMult, 0);
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58 * scaleMult, 0.42 * scaleMult, 1.55 * scaleMult, 16, 2),
        armorMat
      );
      torso.scale.set(1.08, 1.0, 0.72);
      torso.position.y = 0.7 * scaleMult;
      torso.castShadow = true;

      const heartCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32 * scaleMult, 1),
        spectralMat
      );
      heartCore.position.set(0, 0.75 * scaleMult, 0.36 * scaleMult);

      const cape = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.48 * scaleMult,
          0.68 * scaleMult,
          1.95 * scaleMult,
          14,
          1,
          false,
          -Math.PI * 0.45,
          Math.PI * 0.9
        ),
        new THREE.MeshStandardMaterial({
          color: isAvatar ? 0x450a0a : isMalakor || isVoidKnight ? 0x3b0764 : 0x450a0a,
          roughness: 0.85,
        })
      );
      cape.scale.set(1.05, 1.0, 0.35);
      cape.position.set(0, 0.35 * scaleMult, -0.32 * scaleMult);
      cloakMesh = cape;
      body.add(torso, heartCore, cape);

      head.position.set(0, 1.72 * scaleMult, 0);
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 14), armorMat);
      helm.scale.set(0.92, 1.14, 0.98);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.22, 12), goldMat);
      crown.position.set(0, 0.3, 0);
      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.27, 0.08, 14, 1, false, -Math.PI * 0.35, Math.PI * 0.7),
        spectralMat
      );
      visor.position.set(0, 0.02, 0.03);
      head.add(helm, crown, visor);
      body.add(head);

      leftArm.position.set(-0.84 * scaleMult, 1.25 * scaleMult, 0);
      const armL = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.17 * scaleMult, 1.0 * scaleMult, 8, 12),
        armorMat
      );
      armL.position.y = -0.55 * scaleMult;
      leftArm.add(armL);

      rightArm.position.set(0.84 * scaleMult, 1.25 * scaleMult, 0);
      const armR = armL.clone();
      const greatsword = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02 * scaleMult, 0.11 * scaleMult, 2.45 * scaleMult, 10),
        spectralMat
      );
      greatsword.scale.set(1.2, 1.0, 0.35);
      greatsword.position.set(0, -1.05 * scaleMult, 0.85 * scaleMult);
      greatsword.rotation.x = Math.PI / 2.3;
      weaponMesh = greatsword;
      rightArm.add(armR, greatsword);
      body.add(leftArm, rightArm);

      leftLeg.position.set(-0.34 * scaleMult, 1.2 * scaleMult, 0);
      const legL = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.19 * scaleMult, 0.88 * scaleMult, 8, 12),
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
      type === 'boss_avatar' ||
      type === 'boss_emerald_archon' ||
      type === 'boss_aether_seraph' ||
      type === 'boss_cauldron_behemoth'
        ? 1.35
        : type === 'demon' ||
          type === 'werewolf' ||
          type === 'gargoyle' ||
          type === 'troglodyte' ||
          type === 'void_knight' ||
          type === 'boss_vesper' ||
          type === 'corrupted_treant' ||
          type === 'aether_construct' ||
          type === 'ravager_stalker'
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
    for (const part of [body, leftLeg, rightLeg]) {
      part.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
    }
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

  /**
   * Creates a rounded yellow 3D Quest Indicator Group containing both:
   * - `questExclamation` (!): rounded 3D capsule + sphere dot for available quests/contracts
   * - `questQuestion` (?): smooth rounded 3D curved hook + spherical caps + sphere dot for ready turn-ins
   */
  public createQuestIndicatorGroup(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'questIndicatorRoot';

    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.35,
      roughness: 0.22,
      metalness: 0.35,
    });

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });

    // 1. Rounded 3D Exclamation Mark (!)
    const exclamationGroup = new THREE.Group();
    exclamationGroup.name = 'questExclamation';

    const exStem = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.105, 0.36, 12, 20),
      yellowMat
    );
    exStem.position.y = 0.36;
    exStem.castShadow = true;

    const exDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 20, 20),
      yellowMat
    );
    exDot.position.y = -0.02;
    exDot.castShadow = true;

    const exHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 16),
      haloMat
    );
    exHalo.position.y = 0.24;

    exclamationGroup.add(exStem, exDot, exHalo);
    exclamationGroup.visible = false;

    // 2. Rounded 3D Question Mark (?)
    const questionGroup = new THREE.Group();
    questionGroup.name = 'questQuestion';

    const curvePoints = [
      new THREE.Vector3(-0.15, 0.42, 0),
      new THREE.Vector3(-0.12, 0.56, 0),
      new THREE.Vector3(0.0, 0.63, 0),
      new THREE.Vector3(0.14, 0.56, 0),
      new THREE.Vector3(0.15, 0.41, 0),
      new THREE.Vector3(0.03, 0.28, 0),
      new THREE.Vector3(0.0, 0.16, 0),
    ];
    const qCurve = new THREE.CatmullRomCurve3(curvePoints);
    const qTube = new THREE.Mesh(
      new THREE.TubeGeometry(qCurve, 28, 0.092, 16, false),
      yellowMat
    );
    qTube.castShadow = true;

    const qStartCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.092, 16, 16),
      yellowMat
    );
    qStartCap.position.copy(curvePoints[0]);

    const qEndCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.092, 16, 16),
      yellowMat
    );
    qEndCap.position.copy(curvePoints[curvePoints.length - 1]);

    const qDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 20, 20),
      yellowMat
    );
    qDot.position.y = -0.04;
    qDot.castShadow = true;

    const qHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 16),
      haloMat
    );
    qHalo.position.y = 0.28;

    questionGroup.add(qTube, qStartCap, qEndCap, qDot, qHalo);
    questionGroup.visible = false;

    group.add(exclamationGroup, questionGroup);
    return group;
  }

  public dispose(): void {
    this.textures.forEach((t) => t.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
