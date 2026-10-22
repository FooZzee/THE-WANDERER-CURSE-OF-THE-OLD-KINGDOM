import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AssetManager } from './AssetManager';
import {
  getGroundHeight,
  getNextWeatherState,
  interpolateWeatherMetrics,
  WEATHER_PRESETS,
} from './rules';
import type { GraphicsSettings, WeatherType } from './types';

export interface CollisionCylinder {
  x: number;
  z: number;
  radius: number;
  height: number;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _weatherTint = new THREE.Color();
const _skyDay = new THREE.Color(0x334155);
const _skyDusk = new THREE.Color(0x432818);
const _skyNight = new THREE.Color(0x090d16);

export class SceneManager {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public torchLights: THREE.PointLight[] = [];
  public obstacles: CollisionCylinder[] = [];
  public colliderMeshes: THREE.Object3D[] = [];
  public isHeadless: boolean;

  private assetManager: AssetManager;
  private rainSystem: THREE.Points | null = null;
  private rainVelocities: Float32Array | null = null;
  private rainSplashSystem: THREE.Points | null = null;
  private rainSplashPhases: Float32Array | null = null;
  private mistSystem: THREE.Points | null = null;
  private mistPhases: Float32Array | null = null;
  private cursedCrystalMesh: THREE.Mesh | null = null;
  private catacombsGateMesh: THREE.Mesh | null = null;
  private timeOfDay = 16.5; // Late afternoon atmospheric golden/dusk hour
  private weather: WeatherType = 'fog';
  private previousWeather: WeatherType = 'fog';
  private weatherTransitionBlend = 1.0;
  private weatherEffectsEnabled = true;
  private lightningFlash = 0;
  private lightningTimer = 14;

  constructor(container: HTMLElement) {
    this.isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1e242b);
    this.scene.fog = new THREE.FogExp2(0x1e242b, 0.014);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isHeadless,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(
      this.isHeadless ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Studio/Outdoor PMREM Environment for PBR metals & armor
    if (!this.isHeadless) {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04
      ).texture;
      pmremGenerator.dispose();
    }

    this.assetManager = new AssetManager(this.renderer);

    // Balanced 3-Point / Outdoor Rig: Warm Directional Sun/Moon + Cool Hemisphere Fill
    this.hemiLight = new THREE.HemisphereLight(0x8fa8be, 0x26231c, 0.65);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffdcb5, 1.85);
    this.sunLight.position.set(45, 65, 35);
    this.sunLight.castShadow = !this.isHeadless;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 190;
    const d = 65;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0012;
    this.sunLight.shadow.normalBias = 0.04;
    this.scene.add(this.sunLight);

    this.buildTerrainAndWater();
    this.buildCrowHollowVillage();
    this.buildOldForestAndCliffs();
    this.buildCursedSanctuary();
    this.buildRuinedFortress();
    this.buildUndergroundCatacombs();
    this.buildAshCemeteryAndOrderCamp();
    this.buildWeatherSystem();
  }

  public getAssetManager(): AssetManager {
    return this.assetManager;
  }

  private buildTerrainAndWater(): void {
    const size = 260;
    const segments = this.isHeadless ? 64 : 128;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      pos.setY(i, getGroundHeight(vx, vz));
    }
    geo.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(geo, this.assetManager.getMaterial('ground'));
    terrainMesh.receiveShadow = true;
    this.scene.add(terrainMesh);
    this.colliderMeshes.push(terrainMesh);

    // River Water Plane flowing through z ~ 34
    const waterGeo = new THREE.PlaneGeometry(260, 16, 64, 4);
    waterGeo.rotateX(-Math.PI / 2);
    const wPos = waterGeo.attributes.position;
    for (let i = 0; i < wPos.count; i++) {
      const wx = wPos.getX(i);
      const wz = wPos.getZ(i);
      wPos.setZ(i, wz + 34 + Math.sin(wx * 0.03) * 6);
      wPos.setY(i, -0.45);
    }
    waterGeo.computeVertexNormals();

    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f293a,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.65,
      thickness: 1.2,
      ior: 1.33,
      transparent: true,
      opacity: 0.85,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.scene.add(waterMesh);

    // Wooden Bridge across the river at (0, 34)
    const bridgeGroup = new THREE.Group();
    const woodMat = this.assetManager.getMaterial('wood');
    const deck = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.35, 17), woodMat);
    deck.position.set(0, 0.25, 34);
    deck.receiveShadow = true;
    deck.castShadow = true;
    bridgeGroup.add(deck);

    for (let zOffset = -7.5; zOffset <= 7.5; zOffset += 3) {
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 0.3), woodMat);
      postL.position.set(-3.4, 0.9, 34 + zOffset);
      const postR = postL.clone();
      postR.position.x = 3.4;
      bridgeGroup.add(postL, postR);
    }
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 16.5), woodMat);
    railL.position.set(-3.4, 1.35, 34);
    const railR = railL.clone();
    railR.position.x = 3.4;
    bridgeGroup.add(railL, railR);
    this.scene.add(bridgeGroup);
  }

  private createMedievalHouse(
    x: number,
    z: number,
    rotY: number,
    width = 6.5,
    depth = 8.0,
    height = 4.2
  ): THREE.Group {
    const group = new THREE.Group();
    const y = getGroundHeight(x, z);
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const stoneMat = this.assetManager.getMaterial('stone');
    const woodMat = this.assetManager.getMaterial('wood');
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.9,
    });
    const windowGlowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    });

    // Stone foundation
    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.3, 0.8, depth + 0.3),
      stoneMat
    );
    foundation.position.y = 0.4;
    foundation.castShadow = true;
    foundation.receiveShadow = true;

    // Timber-framed main walls
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      woodMat
    );
    walls.position.y = 0.8 + height / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;

    // Pitched roof (Cone/Prism)
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.hypot(width, depth) * 0.58, 2.8, 4),
      roofMat
    );
    roof.position.y = 0.8 + height + 1.35;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;

    // Stone chimney
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 2.6, 0.9),
      stoneMat
    );
    chimney.position.set(width * 0.28, 0.8 + height + 1.4, -depth * 0.2);
    chimney.castShadow = true;

    // Glowing tavern/cottage windows
    const winFront = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.1),
      windowGlowMat
    );
    winFront.position.set(-width * 0.24, 2.4, depth / 2 + 0.02);
    const winRight = winFront.clone();
    winRight.position.x = width * 0.24;

    // Heavy wooden door
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.1, 0.12),
      this.assetManager.getMaterial('leather')
    );
    door.position.set(0, 1.85, depth / 2 + 0.03);

    group.add(foundation, walls, roof, chimney, winFront, winRight, door);
    this.scene.add(group);
    this.colliderMeshes.push(walls, roof);

    this.obstacles.push({
      x,
      z,
      radius: Math.max(width, depth) * 0.56,
      height: height + 3,
    });

    return group;
  }

  private buildCrowHollowVillage(): void {
    // 1. Elder's Manor (North-East of square)
    this.createMedievalHouse(12, -10, -Math.PI / 4, 7.5, 9.0, 4.6);
    // 2. Tavern "Вороний Ночлег" (West of square)
    this.createMedievalHouse(-15, -6, Math.PI / 2.2, 8.5, 10.0, 4.8);
    // 3. Blacksmith's Cottage & Forge (East of square)
    this.createMedievalHouse(16, 8, -Math.PI / 1.8, 6.5, 7.5, 4.0);
    // 4. Herbalist's Hut (South-East)
    this.createMedievalHouse(10, 18, Math.PI, 5.5, 6.5, 3.6);
    // 5. Abandoned Border House
    this.createMedievalHouse(-14, 15, Math.PI / 3, 6.0, 7.0, 3.8);

    // Blacksmith Forge Anvil & Brazier at (11.5, 7.5)
    const forgeY = getGroundHeight(11.5, 7.5);
    const anvil = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.75, 0.55),
      this.assetManager.getMaterial('steel')
    );
    anvil.position.set(11.5, forgeY + 0.38, 7.5);
    anvil.castShadow = true;
    this.scene.add(anvil);

    // Central Village Well & Bonfire at (0, -2)
    const wellGroup = new THREE.Group();
    const wellBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.75, 1.1, 12),
      this.assetManager.getMaterial('stone')
    );
    wellBase.position.y = 0.55;
    wellBase.castShadow = true;
    wellGroup.position.set(0, getGroundHeight(0, -2), -2);
    wellGroup.add(wellBase);
    this.scene.add(wellGroup);
    this.obstacles.push({ x: 0, z: -2, radius: 1.9, height: 2.5 });

    // Village Torches (Warm PointLights)
    const torchCoords: [number, number][] = [
      [5, -5],
      [-7, -4],
      [10, 5],
      [-2, 16],
    ];
    for (const [tx, tz] of torchCoords) {
      const ty = getGroundHeight(tx, tz);
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 2.8, 6),
        this.assetManager.getMaterial('wood')
      );
      post.position.set(tx, ty + 1.4, tz);
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf97316 })
      );
      flame.position.set(tx, ty + 2.9, tz);
      this.scene.add(post, flame);

      if (!this.isHeadless && this.torchLights.length < 2) {
        const pt = new THREE.PointLight(0xf97316, 6, 18, 1.6);
        pt.position.set(tx, ty + 3.0, tz);
        this.scene.add(pt);
        this.torchLights.push(pt);
      }
    }

    // Ambushed Hunter's Camp in the Old Forest (-34, 18) for Quest 1
    const campY = getGroundHeight(-34, 18);
    const brokenCart = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.1, 1.8),
      this.assetManager.getMaterial('wood')
    );
    brokenCart.position.set(-34, campY + 0.5, 18);
    brokenCart.rotation.set(0.25, 0.6, -0.35);
    brokenCart.castShadow = true;
    this.scene.add(brokenCart);
    this.obstacles.push({ x: -34, z: 18, radius: 1.8, height: 2 });
  }

  private buildOldForestAndCliffs(): void {
    // Instanced Trees (Trunks + Foliage Cones)
    const treeCount = 210;
    const trunkGeo = new THREE.CylinderGeometry(0.26, 0.42, 3.6, 7);
    trunkGeo.translate(0, 1.8, 0);
    const canopyGeo = new THREE.ConeGeometry(2.3, 6.2, 7);
    canopyGeo.translate(0, 5.2, 0);

    const trunkMat = this.assetManager.getMaterial('wood');
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x1e3522,
      roughness: 0.88,
    });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
    trunkInst.castShadow = !this.isHeadless;
    canopyInst.castShadow = !this.isHeadless;
    canopyInst.receiveShadow = true;

    let placed = 0;
    for (let i = 0; i < 450 && placed < treeCount; i++) {
      // Deterministic pseudo-random placement
      const angle = i * 2.39996;
      const r = 24 + ((i * 19) % 88);
      const tx = Math.cos(angle) * r;
      const tz = Math.sin(angle) * r;

      // Keep village center, roads, river, sanctuary, and fortress clear
      if (Math.hypot(tx, tz) < 23) continue;
      if (Math.abs(tx) < 6 && tz > -5 && tz < 45) continue; // North road
      if (Math.abs(tz - (34 + Math.sin(tx * 0.03) * 6)) < 8.5) continue; // River
      if (Math.hypot(tx - -65, tz - -55) < 17) continue; // Sanctuary
      if (Math.hypot(tx - 72, tz - -68) < 23) continue; // Fortress
      if (Math.hypot(tx - -34, tz - 18) < 7) continue; // Hunter camp

      const ty = getGroundHeight(tx, tz);
      const scale = 0.85 + ((i * 13) % 45) / 100;
      _dummy.position.set(tx, ty, tz);
      _dummy.rotation.set(0, (i * 1.1) % (Math.PI * 2), 0);
      _dummy.scale.set(scale, scale, scale);
      _dummy.updateMatrix();

      trunkInst.setMatrixAt(placed, _dummy.matrix);
      canopyInst.setMatrixAt(placed, _dummy.matrix);

      // Subtle dark pine tint variation
      const shade = 0.8 + ((i * 7) % 35) / 100;
      _color.setRGB(0.11 * shade, 0.21 * shade, 0.13 * shade);
      canopyInst.setColorAt(placed, _color);

      this.obstacles.push({ x: tx, z: tz, radius: 0.65 * scale, height: 7 * scale });
      placed++;
    }

    trunkInst.count = placed;
    canopyInst.count = placed;
    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    canopyInst.computeBoundingSphere();
    this.scene.add(trunkInst, canopyInst);

    // Instanced Perimeter Cliffs & Boulders (Natural outdoor border + scattered rocks)
    const rockCount = 130;
    const rockGeo = new THREE.DodecahedronGeometry(1.8, 1);
    rockGeo.translate(0, 1.1, 0);
    const rockInst = new THREE.InstancedMesh(
      rockGeo,
      this.assetManager.getMaterial('stone'),
      rockCount
    );
    rockInst.castShadow = !this.isHeadless;
    rockInst.receiveShadow = true;

    let rockIdx = 0;
    // Outer natural cliff ring at radius ~ 112m
    for (let i = 0; i < 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      const rx = Math.cos(a) * 114;
      const rz = Math.sin(a) * 114;
      const ry = getGroundHeight(rx, rz);
      _dummy.position.set(rx, ry - 0.5, rz);
      _dummy.rotation.set(i * 0.4, i * 0.9, 0);
      _dummy.scale.set(3.2, 2.8 + (i % 3), 3.2);
      _dummy.updateMatrix();
      rockInst.setMatrixAt(rockIdx++, _dummy.matrix);
    }
    // Scattered boulders in the world
    for (let i = 0; i < 50 && rockIdx < rockCount; i++) {
      const a = i * 1.75;
      const r = 28 + ((i * 23) % 75);
      const rx = Math.cos(a) * r;
      const rz = Math.sin(a) * r;
      if (Math.hypot(rx, rz) < 26) continue;
      if (Math.hypot(rx - -65, rz - -55) < 18) continue;
      if (Math.hypot(rx - 72, rz - -68) < 24) continue;
      if (Math.abs(rz - 34) < 9) continue;

      const ry = getGroundHeight(rx, rz);
      const s = 0.7 + ((i * 11) % 70) / 100;
      _dummy.position.set(rx, ry - 0.2, rz);
      _dummy.rotation.set(0, i * 1.2, 0);
      _dummy.scale.set(s, s * 0.85, s);
      _dummy.updateMatrix();
      rockInst.setMatrixAt(rockIdx++, _dummy.matrix);
      this.obstacles.push({ x: rx, z: rz, radius: 1.5 * s, height: 2.5 * s });
    }
    rockInst.count = rockIdx;
    rockInst.instanceMatrix.needsUpdate = true;
    rockInst.computeBoundingSphere();
    this.scene.add(rockInst);
  }

  private buildCursedSanctuary(): void {
    // Located at (-65, -55)
    const cx = -65;
    const cz = -55;
    const cy = getGroundHeight(cx, cz);

    const stoneMat = this.assetManager.getMaterial('stone');
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    // Stone Ritual Circle Platform
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.5, 0.5, 16), stoneMat);
    dais.position.set(cx, cy + 0.25, cz);
    dais.receiveShadow = true;
    this.scene.add(dais);

    // 6 Standing Monoliths
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const mx = cx + Math.cos(angle) * 7.8;
      const mz = cz + Math.sin(angle) * 7.8;
      const my = getGroundHeight(mx, mz);

      const monolith = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.8, 0.8), stoneMat);
      monolith.position.set(mx, my + 2.4, mz);
      monolith.lookAt(cx, my + 2.4, cz);
      monolith.castShadow = true;

      const runeStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.6), runeMat);
      runeStrip.position.set(0, 0.2, 0.42);
      monolith.add(runeStrip);

      this.scene.add(monolith);
      this.colliderMeshes.push(monolith);
      this.obstacles.push({ x: mx, z: mz, radius: 1.0, height: 5 });
    }

    // Central Cursed Altar & Floating Artifact Crystal
    const altar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.4), stoneMat);
    altar.position.set(cx, cy + 0.9, cz);
    altar.castShadow = true;
    this.scene.add(altar);
    this.obstacles.push({ x: cx, z: cz, radius: 1.5, height: 2.5 });

    this.cursedCrystalMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.48, 0),
      runeMat
    );
    this.cursedCrystalMesh.position.set(cx, cy + 2.3, cz);
    this.scene.add(this.cursedCrystalMesh);
  }

  private buildRuinedFortress(): void {
    // Located at (72, -68)
    const fx = 72;
    const fz = -68;
    const fy = getGroundHeight(fx, fz);
    const stoneMat = this.assetManager.getMaterial('stone');

    // Courtyard Floor
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(16, 17, 0.4, 16), stoneMat);
    floor.position.set(fx, fy + 0.2, fz);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ruined Battlement Pillars around the Boss Arena (leaving South-West entrance open)
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      // Leave entrance gap facing (-0.7, +0.7) toward village
      if (angle > 2.0 && angle < 2.9) continue;

      const wx = fx + Math.cos(angle) * 15.2;
      const wz = fz + Math.sin(angle) * 15.2;
      const wy = getGroundHeight(wx, wz);

      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 2.0, 6.5 - (i % 3) * 1.2, 8),
        stoneMat
      );
      tower.position.set(wx, wy + 3.0, wz);
      tower.castShadow = true;
      tower.receiveShadow = true;
      this.scene.add(tower);
      this.colliderMeshes.push(tower);
      this.obstacles.push({ x: wx, z: wz, radius: 2.1, height: 7 });
    }

    // Ancient King's Ruined Throne at back of Fortress
    const throne = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 1.8), stoneMat);
    throne.position.set(fx + 8, fy + 2.1, fz - 8);
    throne.rotation.y = -Math.PI / 4;
    throne.castShadow = true;
    this.scene.add(throne);
    this.obstacles.push({ x: fx + 8, z: fz - 8, radius: 2.2, height: 4.5 });
  }

  private buildUndergroundCatacombs(): void {
    // Underground Crypt Chamber centered around (105, 105)
    const cx = 105;
    const cz = 105;
    const stoneMat = this.assetManager.getMaterial('stone');
    const steelMat = this.assetManager.getMaterial('steel');

    const floor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.4, 34), stoneMat);
    floor.position.set(cx, 0.1, cz);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Perimeter Crypt Walls
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(34, 6.5, 1.5), stoneMat);
    wallN.position.set(cx, 3.25, cz - 17);
    const wallS = wallN.clone();
    wallS.position.set(cx, 3.25, cz + 17);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6.5, 34), stoneMat);
    wallW.position.set(cx - 17, 3.25, cz);
    const wallE = wallW.clone();
    wallE.position.set(cx + 17, 3.25, cz);
    this.scene.add(wallN, wallS, wallW, wallE);

    // Iron Grate blocking the Treasury at z = 110 until 3 Runic Pillars are aligned
    this.catacombsGateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4.8, 0.45),
      steelMat
    );
    this.catacombsGateMesh.position.set(cx, 2.4, 110);
    this.scene.add(this.catacombsGateMesh);

    // Crypt Torches
    const cryptTorches: [number, number][] = [
      [96, 96],
      [114, 96],
      [96, 112],
      [114, 112],
    ];
    for (const [tx, tz] of cryptTorches) {
      const brazier = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.25, 1.4, 8),
        stoneMat
      );
      brazier.position.set(tx, 0.7, tz);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.65, 6),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      flame.position.set(tx, 1.65, tz);
      this.scene.add(brazier, flame);
    }
  }

  public setCatacombsGateOpen(open: boolean): void {
    if (this.catacombsGateMesh) {
      this.catacombsGateMesh.position.y = open ? 6.8 : 2.4;
    }
  }

  private buildAshCemeteryAndOrderCamp(): void {
    // Act II: Order of the Crimson Sun Camp at (-6, 66) & Ash Cemetery Crypt at (0, 84)
    const stoneMat = this.assetManager.getMaterial('stone');
    const crimsonBannerMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.4,
      roughness: 0.7,
    });

    // Order Command Tent at (-10, 64)
    const tentY = getGroundHeight(-10, 64);
    const tent = new THREE.Mesh(new THREE.ConeGeometry(3.6, 4.2, 6), crimsonBannerMat);
    tent.position.set(-10, tentY + 2.1, 64);
    tent.castShadow = true;
    this.scene.add(tent);
    this.obstacles.push({ x: -10, z: 64, radius: 3.2, height: 4.2 });

    // Ash Cemetery Boss Arena & Crypt Monoliths around (0, 84)
    const arenaY = getGroundHeight(0, 84);
    const cryptDais = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 15, 0.45, 16),
      stoneMat
    );
    cryptDais.position.set(0, arenaY + 0.2, 84);
    cryptDais.receiveShadow = true;
    this.scene.add(cryptDais);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      if (Math.abs(Math.sin(a) + 1) < 0.35) continue; // Keep North approach open
      const px = Math.cos(a) * 13.5;
      const pz = 84 + Math.sin(a) * 13.5;
      const py = getGroundHeight(px, pz);
      const cryptPillar = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 5.4, 1.4),
        stoneMat
      );
      cryptPillar.position.set(px, py + 2.7, pz);
      this.scene.add(cryptPillar);
      this.obstacles.push({ x: px, z: pz, radius: 1.3, height: 5.5 });
    }
  }

  private buildWeatherSystem(): void {
    // 1. Falling Rain Streaks
    const rainCount = this.isHeadless ? 120 : 1200;
    const rainPositions = new Float32Array(rainCount * 3);
    this.rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 64;
      rainPositions[i * 3 + 1] = Math.random() * 28;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 64;
      this.rainVelocities[i] = 18 + Math.random() * 9;
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.16,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.rainSystem = new THREE.Points(rainGeo, rainMat);
    this.rainSystem.visible = false;
    this.scene.add(this.rainSystem);

    // 2. Rain Ground Splashes
    const splashCount = this.isHeadless ? 40 : 260;
    const splashPositions = new Float32Array(splashCount * 3);
    this.rainSplashPhases = new Float32Array(splashCount);
    for (let i = 0; i < splashCount; i++) {
      const sx = (Math.random() - 0.5) * 44;
      const sz = (Math.random() - 0.5) * 44;
      splashPositions[i * 3] = sx;
      splashPositions[i * 3 + 1] = getGroundHeight(sx, sz) + 0.08;
      splashPositions[i * 3 + 2] = sz;
      this.rainSplashPhases[i] = Math.random() * Math.PI * 2;
    }
    const splashGeo = new THREE.BufferGeometry();
    splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3));
    const splashMat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.22,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainSplashSystem = new THREE.Points(splashGeo, splashMat);
    this.rainSplashSystem.visible = false;
    this.scene.add(this.rainSplashSystem);

    // 3. Volumetric Drifting Ground Mist / Fog Particles
    const mistCount = this.isHeadless ? 60 : 420;
    const mistPositions = new Float32Array(mistCount * 3);
    this.mistPhases = new Float32Array(mistCount);
    for (let i = 0; i < mistCount; i++) {
      const mx = (Math.random() - 0.5) * 68;
      const mz = (Math.random() - 0.5) * 68;
      const my = getGroundHeight(mx, mz) + 0.5 + Math.random() * 2.8;
      mistPositions[i * 3] = mx;
      mistPositions[i * 3 + 1] = my;
      mistPositions[i * 3 + 2] = mz;
      this.mistPhases[i] = Math.random() * Math.PI * 2;
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    const mistMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.75,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.mistSystem = new THREE.Points(mistGeo, mistMat);
    this.mistSystem.visible = true;
    this.scene.add(this.mistSystem);
  }

  public setWeather(weather: WeatherType, immediate = false): void {
    if (weather === this.weather && !immediate) return;
    this.previousWeather = immediate ? weather : this.weather;
    this.weather = weather;
    this.weatherTransitionBlend = immediate ? 1.0 : 0.0;
    if (this.rainSystem && immediate) {
      this.rainSystem.visible = this.weatherEffectsEnabled && weather === 'rain';
    }
  }

  public cycleWeather(): WeatherType {
    const next = getNextWeatherState(this.weather);
    this.setWeather(next);
    return next;
  }

  public getWeather(): WeatherType {
    return this.weather;
  }

  public getWeatherTransitionBlend(): number {
    return this.weatherTransitionBlend;
  }

  public setTimeOfDay(hour: number): void {
    this.timeOfDay = ((hour % 24) + 24) % 24;
  }

  public getTimeOfDay(): number {
    return this.timeOfDay;
  }

  public applySettings(settings: GraphicsSettings): void {
    this.weatherEffectsEnabled = settings.weatherEffects;
    if (this.isHeadless) return;
    const scale =
      settings.quality === 'low' ? 0.75 : settings.quality === 'medium' ? 1.0 : 1.25;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio * scale * settings.resolutionScale, 2)
    );
    this.renderer.shadowMap.enabled = settings.shadows;
    this.sunLight.castShadow = settings.shadows;
    if (!settings.weatherEffects) {
      if (this.rainSystem) this.rainSystem.visible = false;
      if (this.rainSplashSystem) this.rainSplashSystem.visible = false;
      if (this.mistSystem) this.mistSystem.visible = false;
    }
  }

  public update(dt: number, elapsed: number, playerX: number, playerZ: number): void {
    // Advance Day/Night slowly (1 game hour per 25 real seconds)
    this.timeOfDay = (this.timeOfDay + dt * 0.04) % 24;

    // Advance smooth weather crossfade transition (~3.1 seconds full transition)
    if (this.weatherTransitionBlend < 1) {
      this.weatherTransitionBlend = Math.min(1, this.weatherTransitionBlend + dt * 0.32);
    }

    const wMetrics = interpolateWeatherMetrics(
      this.previousWeather,
      this.weather,
      this.weatherTransitionBlend
    );

    // Distant storm lightning flash during heavy rain
    if (wMetrics.rainIntensity > 0.65) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 9 + Math.random() * 11;
        this.lightningFlash = 1.0;
      }
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 4.5);
    }

    // Calculate Sun angle and atmospheric color
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunElev = Math.sin(sunAngle);
    const sunHoriz = Math.cos(sunAngle);

    this.sunLight.position.set(
      playerX + sunHoriz * 55,
      Math.max(12, Math.abs(sunElev) * 65 + 15),
      playerZ + 30
    );
    this.sunLight.target.position.set(playerX, 0, playerZ);
    this.sunLight.target.updateMatrixWorld();

    // Base Day / Dusk / Night sky color and light intensities
    let baseSunIntensity = 2.2;
    let baseHemiIntensity = 1.05;
    if (sunElev > 0.25) {
      _color.copy(_skyDay);
      baseSunIntensity = 2.2;
      baseHemiIntensity = 1.05;
    } else if (sunElev > -0.15) {
      const t = (sunElev + 0.15) / 0.4;
      _color.copy(_skyNight).lerp(_skyDusk, Math.sin(t * Math.PI)).lerp(_skyDay, t);
      baseSunIntensity = 1.15 + t * 1.05;
      baseHemiIntensity = 0.8 + t * 0.25;
    } else {
      _color.copy(_skyNight);
      baseSunIntensity = 0.9; // Clear moonlight
      baseHemiIntensity = 0.72;
    }

    // Blend sky color with weather atmospheric tint
    const prevTint = WEATHER_PRESETS[this.previousWeather]?.skyTintHex ?? 0x3b526b;
    const targetTint = WEATHER_PRESETS[this.weather]?.skyTintHex ?? 0x3b526b;
    _weatherTint.setHex(prevTint).lerp(
      new THREE.Color(targetTint),
      this.weatherTransitionBlend
    );
    _color.lerp(_weatherTint, 0.48);

    if (this.lightningFlash > 0) {
      _color.lerp(new THREE.Color(0xc7d2fe), this.lightningFlash * 0.45);
    }

    this.sunLight.intensity =
      baseSunIntensity * wMetrics.sunIntensityMultiplier + this.lightningFlash * 2.2;
    this.hemiLight.intensity =
      baseHemiIntensity * wMetrics.hemiIntensityMultiplier + this.lightningFlash * 0.9;

    this.scene.background = _color;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_color);
      this.scene.fog.density = wMetrics.fogDensity;
    }

    // Wet ground reflection adjustment during rain
    const groundMat = this.assetManager.getMaterial('ground');
    if (groundMat) {
      groundMat.roughness = wMetrics.groundRoughness;
    }

    // Rotate Cursed Sanctuary Artifact
    if (this.cursedCrystalMesh) {
      this.cursedCrystalMesh.rotation.y = elapsed * 1.4;
      this.cursedCrystalMesh.position.y =
        getGroundHeight(-65, -55) + 2.3 + Math.sin(elapsed * 2.5) * 0.15;
    }

    // Update Falling Rain Streaks & Ground Splashes around player
    if (this.rainSystem && this.rainVelocities) {
      const showRain = this.weatherEffectsEnabled && wMetrics.rainIntensity > 0.02;
      this.rainSystem.visible = showRain;
      if (showRain) {
        const rainMat = this.rainSystem.material as THREE.PointsMaterial;
        rainMat.opacity = wMetrics.rainIntensity * 0.62;

        const posAttr = this.rainSystem.geometry.attributes.position as THREE.BufferAttribute;
        const windDriftX = wMetrics.windStrength * 3.6 * dt;
        const windDriftZ = wMetrics.windStrength * 1.4 * dt;

        for (let i = 0; i < this.rainVelocities.length; i++) {
          let rx = posAttr.getX(i) + windDriftX;
          let ry = posAttr.getY(i) - this.rainVelocities[i] * dt;
          let rz = posAttr.getZ(i) + windDriftZ;

          if (ry < 0 || Math.abs(rx - playerX) > 34 || Math.abs(rz - playerZ) > 34) {
            rx = playerX + (Math.random() - 0.5) * 56;
            ry = 24 + Math.random() * 6;
            rz = playerZ + (Math.random() - 0.5) * 56;
          }
          posAttr.setXYZ(i, rx, ry, rz);
        }
        posAttr.needsUpdate = true;
      }
    }

    if (this.rainSplashSystem && this.rainSplashPhases) {
      const showSplashes = this.weatherEffectsEnabled && wMetrics.rainIntensity > 0.1;
      this.rainSplashSystem.visible = showSplashes;
      if (showSplashes) {
        const splashMat = this.rainSplashSystem.material as THREE.PointsMaterial;
        splashMat.opacity = wMetrics.rainIntensity * 0.45;
        const posAttr = this.rainSplashSystem.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < this.rainSplashPhases.length; i++) {
          this.rainSplashPhases[i] += dt * 7.5;
          if (this.rainSplashPhases[i] > Math.PI * 2) {
            this.rainSplashPhases[i] -= Math.PI * 2;
            const sx = playerX + (Math.random() - 0.5) * 40;
            const sz = playerZ + (Math.random() - 0.5) * 40;
            posAttr.setXYZ(i, sx, getGroundHeight(sx, sz) + 0.08, sz);
          } else {
            const sy = posAttr.getY(i) + Math.sin(this.rainSplashPhases[i]) * 0.012;
            posAttr.setY(i, sy);
          }
        }
        posAttr.needsUpdate = true;
      }
    }

    // Update Volumetric Ground Mist / Fog Wisps around player
    if (this.mistSystem && this.mistPhases) {
      const showMist = this.weatherEffectsEnabled && wMetrics.mistIntensity > 0.05;
      this.mistSystem.visible = showMist;
      if (showMist) {
        const mistMat = this.mistSystem.material as THREE.PointsMaterial;
        mistMat.opacity = wMetrics.mistIntensity * 0.36;
        const posAttr = this.mistSystem.geometry.attributes.position as THREE.BufferAttribute;
        const driftSpeed = (0.4 + wMetrics.windStrength * 1.1) * dt;

        for (let i = 0; i < this.mistPhases.length; i++) {
          const phase = this.mistPhases[i];
          let mx = posAttr.getX(i) + Math.cos(elapsed * 0.3 + phase) * driftSpeed;
          let mz = posAttr.getZ(i) + Math.sin(elapsed * 0.25 + phase) * driftSpeed;

          if (Math.abs(mx - playerX) > 36 || Math.abs(mz - playerZ) > 36) {
            mx = playerX + (Math.random() - 0.5) * 64;
            mz = playerZ + (Math.random() - 0.5) * 64;
          }
          const my =
            getGroundHeight(mx, mz) +
            1.1 +
            Math.sin(elapsed * 0.7 + phase) * 0.65;
          posAttr.setXYZ(i, mx, my, mz);
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  public handleResize(width: number, height: number): void {
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    this.assetManager.dispose();
    this.renderer.dispose();
  }
}
