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
  shieldBubble?: THREE.Mesh;
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

  private initProceduralAssets(): void {
    // 1. Ground Earth & Moss Texture
    const groundTex = this.createCanvasTexture(
      'ground',
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#24291e';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) {
          const x = (i * 73) % w;
          const y = (i * 139) % h;
          const r = 2 + (i % 6);
          ctx.fillStyle = i % 3 === 0 ? '#1b2017' : i % 3 === 1 ? '#2d3424' : '#332b22';
          ctx.fillRect(x, y, r, r);
        }
      },
      36,
      36
    );

    // 2. Stone Wall Texture
    const stoneTex = this.createCanvasTexture(
      'stone',
      128,
      128,
      (ctx, w, h) => {
        ctx.fillStyle = '#44403c';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 2;
        for (let row = 0; row < 4; row++) {
          const y = row * 32;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
          for (let col = 0; col < 4; col++) {
            const x = col * 32 + (row % 2 === 0 ? 0 : 16);
            ctx.fillStyle = (row + col) % 2 === 0 ? '#57534e' : '#44403c';
            ctx.fillRect((x % w) + 2, y + 2, 28, 28);
          }
        }
      },
      2,
      2
    );

    // 3. Aged Timber Texture
    const woodTex = this.createCanvasTexture(
      'wood',
      128,
      128,
      (ctx, w, h) => {
        ctx.fillStyle = '#452c1e';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 16; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#3b2416' : '#523524';
          ctx.fillRect(0, i * 8, w, 7);
        }
      },
      2,
      2
    );

    // 4. Leather Armor Texture
    const leatherTex = this.createCanvasTexture('leather', 64, 64, (ctx, w, h) => {
      ctx.fillStyle = '#2e211b';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#47332a';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 8) {
        ctx.strokeRect(i, 0, 8, h);
      }
    });

    this.materials.set(
      'ground',
      new THREE.MeshStandardMaterial({
        map: groundTex,
        roughness: 0.92,
        metalness: 0.05,
      })
    );

    this.materials.set(
      'stone',
      new THREE.MeshStandardMaterial({
        map: stoneTex,
        roughness: 0.85,
        metalness: 0.1,
      })
    );

    this.materials.set(
      'wood',
      new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.8,
        metalness: 0.05,
      })
    );

    this.materials.set(
      'leather',
      new THREE.MeshStandardMaterial({
        map: leatherTex,
        roughness: 0.65,
        metalness: 0.15,
      })
    );

    this.materials.set(
      'steel',
      new THREE.MeshPhysicalMaterial({
        color: 0xd6d3d1,
        roughness: 0.22,
        metalness: 0.92,
        clearcoat: 0.3,
      })
    );

    this.materials.set(
      'silverBlade',
      new THREE.MeshPhysicalMaterial({
        color: 0xe2e8f0,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.2,
        roughness: 0.15,
        metalness: 0.96,
        clearcoat: 0.6,
      })
    );

    this.materials.set(
      'darkCloth',
      new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        roughness: 0.88,
        metalness: 0.05,
      })
    );

    this.materials.set(
      'skin',
      new THREE.MeshStandardMaterial({
        color: 0xd6b49c,
        roughness: 0.6,
        metalness: 0.05,
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
    body.add(leftPauldron, rightPauldron);

    // Cloak on back
    const heroCloakMat = clothMat.clone();
    const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.85, 0.06), heroCloakMat);
    cloak.name = 'heroCloak';
    cloak.position.set(0, 0.22, -0.19);
    cloak.rotation.x = 0.08;
    cloak.castShadow = true;
    body.add(cloak);

    // Secondary scabbard on back (diagonal)
    const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.05, 0.04), leatherMat);
    scabbard.position.set(-0.08, 0.45, -0.22);
    scabbard.rotation.z = -0.42;
    const pommelBack = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), steelMat);
    pommelBack.position.set(0, 0.58, 0);
    scabbard.add(pommelBack);
    body.add(scabbard);

    // Head & Silver Hair
    const head = new THREE.Group();
    head.position.set(0, 0.78, 0);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skinMat);
    skull.castShadow = true;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.22, 0.34), hairMat);
    hair.position.set(0, 0.1, -0.03);
    const medallion = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.05, 0),
      silverMat
    );
    medallion.position.set(0, -0.18, 0.17);
    head.add(skull, hair, medallion);
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
    const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.06), steelMat);
    crossguard.position.y = 0.12;
    const heroBladeMat = silverMat.clone();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.05, 0.018), heroBladeMat);
    blade.name = 'heroBlade';
    blade.position.y = 0.65;
    blade.castShadow = true;

    const trailAnchor = new THREE.Object3D();
    trailAnchor.position.set(0, 1.15, 0);
    swordGroup.add(hilt, crossguard, blade, trailAnchor);
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
      shieldBubble,
    };
  }

  /**
   * Dynamically updates hero armor & blade materials based on equipped Witcher Set and Rune.
   */
  public updateHeroEquipmentVisuals(
    rig: CharacterRig,
    activeSet: 'raven' | 'bear' | 'flame' | null,
    runeEffect?: 'fire' | 'bleed' | 'vamp' | 'ward'
  ): void {
    const cuirass = rig.root.getObjectByName('heroCuirass') as THREE.Mesh | undefined;
    const cloak = rig.root.getObjectByName('heroCloak') as THREE.Mesh | undefined;
    const blade = rig.root.getObjectByName('heroBlade') as THREE.Mesh | undefined;

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
      } else {
        cloak.material.color.setHex(0x1f242d);
      }
    }

    if (blade && blade.material instanceof THREE.MeshStandardMaterial) {
      if (runeEffect === 'fire') {
        blade.material.emissive.setHex(0xf97316);
        blade.material.emissiveIntensity = 0.9;
      } else if (runeEffect === 'bleed') {
        blade.material.emissive.setHex(0xdc2626);
        blade.material.emissiveIntensity = 0.85;
      } else if (runeEffect === 'vamp') {
        blade.material.emissive.setHex(0x9333ea);
        blade.material.emissiveIntensity = 0.9;
      } else {
        blade.material.emissive.setHex(0x38bdf8);
        blade.material.emissiveIntensity = 0.15;
      }
    }
  }

  /**
   * Builds composite NPC models with distinct silhouettes and clothing colors.
   */
  public createNPCModel(
    role: 'elder' | 'blacksmith' | 'merchant' | 'herbalist' | 'inquisitor'
  ): THREE.Group {
    const group = new THREE.Group();
    const skinMat = this.getMaterial('skin');
    const woodMat = this.getMaterial('wood');

    const tunicColors: Record<typeof role, number> = {
      elder: 0x7c2d12,
      blacksmith: 0x292524,
      merchant: 0x1e3a8a,
      herbalist: 0x14532d,
      inquisitor: 0x991b1b,
    };

    const tunicMat = new THREE.MeshStandardMaterial({
      color: tunicColors[role],
      roughness: 0.7,
      metalness: role === 'inquisitor' ? 0.45 : 0.1,
    });

    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.85, 10), woodMat);
    legs.position.y = 0.425;
    legs.castShadow = true;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.34), tunicMat);
    torso.position.y = 1.15;
    torso.castShadow = true;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skinMat);
    head.position.y = 1.68;
    head.castShadow = true;

    // Role-specific accent accessory
    if (role === 'elder') {
      const crownHat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.18, 0.16, 10),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.6 })
      );
      crownHat.position.y = 1.9;
      group.add(crownHat);
    } else if (role === 'blacksmith') {
      const hammer = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.14, 0.14),
        this.getMaterial('steel')
      );
      hammer.position.set(0.36, 1.05, 0.22);
      group.add(hammer);
    } else if (role === 'merchant') {
      const pack = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.55, 0.28),
        this.getMaterial('leather')
      );
      pack.position.set(0, 1.2, -0.26);
      group.add(pack);
    } else if (role === 'herbalist') {
      const hood = new THREE.Mesh(
        new THREE.ConeGeometry(0.26, 0.35, 8),
        tunicMat
      );
      hood.position.y = 1.92;
      group.add(hood);
    } else if (role === 'inquisitor') {
      const sunHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.03, 6, 14),
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xd97706,
          emissiveIntensity: 1.1,
          metalness: 0.85,
        })
      );
      sunHalo.position.set(0, 1.78, -0.14);
      group.add(sunHalo);
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

    group.add(legs, torso, head, shadow);
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
    } else if (type === 'ghoul' || type === 'skeleton') {
      const isSkel = type === 'skeleton';
      const fleshMat = new THREE.MeshStandardMaterial({
        color: isSkel ? 0xd6d3d1 : 0x57413a,
        roughness: isSkel ? 0.55 : 0.75,
        metalness: 0.1,
      });
      const spineMat = new THREE.MeshStandardMaterial({
        color: isSkel ? 0x38bdf8 : 0x991b1b,
        emissive: isSkel ? 0x0284c7 : 0x000000,
        emissiveIntensity: isSkel ? 0.8 : 0,
        roughness: 0.5,
      });
      const clothMat = this.getMaterial('darkCloth');

      body.position.set(0, 0.78, 0);
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.66, 0.4), fleshMat);
      torso.position.set(0, 0.22, 0.06);
      torso.rotation.x = isSkel ? 0.08 : 0.32;
      torso.castShadow = true;

      const tatteredCloak = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.05), clothMat);
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
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), isSkel ? spineMat : eyeMat);
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

      rightArm.position.set(0.34, 0.42, 0.12);
      const armR = armL.clone();
      const boneBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.72, 0.12),
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
    } else if (type === 'hag' || type === 'noonwraith') {
      const isNoon = type === 'noonwraith';
      const robeMat = new THREE.MeshStandardMaterial({
        color: isNoon ? 0xe2e8f0 : 0x1f2937,
        emissive: isNoon ? 0x2dd4bf : 0x000000,
        emissiveIntensity: isNoon ? 0.55 : 0,
        transparent: isNoon,
        opacity: isNoon ? 0.78 : 1.0,
        roughness: 0.7,
      });
      const rotMat = new THREE.MeshStandardMaterial({
        color: isNoon ? 0x99f6e4 : 0x4d7c0f,
        roughness: 0.8,
      });
      const orbMat = new THREE.MeshStandardMaterial({
        color: isNoon ? 0x2dd4bf : 0xa855f7,
        emissive: isNoon ? 0x14b8a6 : 0x9333ea,
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
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), orbMat);
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
    } else if (type === 'demon' || type === 'werewolf' || type === 'gargoyle') {
      const isWerewolf = type === 'werewolf';
      const isGargoyle = type === 'gargoyle';
      const barkMat = new THREE.MeshStandardMaterial({
        color: isWerewolf ? 0x1c1917 : isGargoyle ? 0x57534e : 0x292018,
        roughness: isGargoyle ? 0.45 : 0.9,
        metalness: isGargoyle ? 0.5 : 0.1,
      });
      const boneMat = new THREE.MeshStandardMaterial({
        color: isWerewolf ? 0x7f1d1d : isGargoyle ? 0xa8a29e : 0xd6d3d1,
        roughness: 0.5,
      });
      const runeMat = new THREE.MeshStandardMaterial({
        color: isWerewolf ? 0xef4444 : isGargoyle ? 0xf59e0b : 0xf97316,
        emissive: isWerewolf ? 0xdc2626 : isGargoyle ? 0xd97706 : 0xea580c,
        emissiveIntensity: 1.5,
      });

      body.position.set(0, 1.1, 0);
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 0.58), barkMat);
      torso.position.y = 0.55;
      torso.castShadow = true;
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), runeMat);
      core.position.set(0, 0.6, 0.28);
      const mossCape = new THREE.Mesh(
        new THREE.BoxGeometry(isGargoyle ? 1.55 : 0.98, 1.35, 0.08),
        barkMat
      );
      mossCape.position.set(0, 0.55, -0.32);
      cloakMesh = mossCape;
      body.add(torso, core, mossCape);

      head.position.set(0, 1.45, 0.18);
      const skull = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.62), boneMat);
      const antlerL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.75, 6), boneMat);
      antlerL.position.set(-0.35, 0.4, -0.05);
      antlerL.rotation.z = 0.45;
      const antlerR = antlerL.clone();
      antlerR.position.x = 0.35;
      antlerR.rotation.z = -0.45;
      head.add(skull, antlerL, antlerR);
      body.add(head);

      const armGeo = new THREE.BoxGeometry(0.28, 1.15, 0.28);
      leftArm.position.set(-0.66, 1.05, 0.08);
      const armL = new THREE.Mesh(armGeo, barkMat);
      armL.position.y = -0.48;
      leftArm.add(armL);

      rightArm.position.set(0.66, 1.05, 0.08);
      const armR = armL.clone();
      const runicClub = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.35, 0.24), runeMat);
      runicClub.position.set(0, -0.95, 0.45);
      runicClub.rotation.x = Math.PI / 2.3;
      weaponMesh = runicClub;
      rightArm.add(armR, runicClub);
      body.add(leftArm, rightArm);

      const legGeo = new THREE.CylinderGeometry(0.18, 0.14, 1.1, 8);
      leftLeg.position.set(-0.28, 1.1, 0);
      const legL = new THREE.Mesh(legGeo, barkMat);
      legL.position.y = -0.55;
      leftLeg.add(legL);

      rightLeg.position.set(0.28, 1.1, 0);
      const legR = legL.clone();
      rightLeg.add(legR);
    } else {
      // Story Boss: Ancient Guardian ('boss') or Act II Final Boss: Lich King Malakor ('malakor')
      const isMalakor = type === 'malakor';
      const armorMat = new THREE.MeshPhysicalMaterial({
        color: isMalakor ? 0x0f172a : 0x1c1917,
        roughness: 0.22,
        metalness: 0.9,
        clearcoat: 0.5,
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: isMalakor ? 0xfbbf24 : 0xd97706,
        emissive: isMalakor ? 0xb45309 : 0x000000,
        emissiveIntensity: isMalakor ? 0.6 : 0,
        roughness: 0.3,
        metalness: 0.9,
      });
      const spectralMat = new THREE.MeshStandardMaterial({
        color: isMalakor ? 0xa855f7 : 0x38bdf8,
        emissive: isMalakor ? 0x9333ea : 0x0284c7,
        emissiveIntensity: 2.0,
      });

      body.position.set(0, 1.2, 0);
      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.55, 0.68), armorMat);
      torso.position.y = 0.7;
      torso.castShadow = true;

      const heartCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 1), spectralMat);
      heartCore.position.set(0, 0.75, 0.36);

      const cape = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 1.95, 0.08),
        new THREE.MeshStandardMaterial({
          color: isMalakor ? 0x3b0764 : 0x450a0a,
          roughness: 0.85,
        })
      );
      cape.position.set(0, 0.35, -0.36);
      cloakMesh = cape;
      body.add(torso, heartCore, cape);

      head.position.set(0, 1.72, 0);
      const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.52, 10), armorMat);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.22, 8), goldMat);
      crown.position.set(0, 0.3, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.35), spectralMat);
      visor.position.set(0, 0.02, 0.16);
      head.add(helm, crown, visor);
      body.add(head);

      leftArm.position.set(-0.84, 1.25, 0);
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.35, 0.34), armorMat);
      armL.position.y = -0.55;
      leftArm.add(armL);

      rightArm.position.set(0.84, 1.25, 0);
      const armR = armL.clone();
      const greatsword = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.35, 0.06), spectralMat);
      greatsword.position.set(0, -1.05, 0.85);
      greatsword.rotation.x = Math.PI / 2.3;
      weaponMesh = greatsword;
      rightArm.add(armR, greatsword);
      body.add(leftArm, rightArm);

      leftLeg.position.set(-0.34, 1.2, 0);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.2, 0.38), armorMat);
      legL.position.y = -0.6;
      leftLeg.add(legL);

      rightLeg.position.set(0.34, 1.2, 0);
      const legR = legL.clone();
      rightLeg.add(legR);
    }

    const shadowRadius =
      type === 'boss' || type === 'malakor'
        ? 1.25
        : type === 'demon' || type === 'werewolf' || type === 'gargoyle'
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
