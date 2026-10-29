import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AssetManager } from './AssetManager';
import {
  getGroundHeight,
  getNextWeatherState,
  interpolateWeatherMetrics,
  SETTLEMENT_ZONES,
  WEATHER_PRESETS,
} from './rules';
import type { CollisionBox, GraphicsSettings, WeatherType } from './types';

export interface CollisionCylinder {
  x: number;
  z: number;
  radius: number;
  height: number;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _weatherTint = new THREE.Color();
const _skyDawn = new THREE.Color(0x4a3028);
const _skyDay = new THREE.Color(0x3a4e66);
const _skyDusk = new THREE.Color(0x452618);
const _skyNight = new THREE.Color(0x070b14);

const _sunDawn = new THREE.Color(0xff9e5e);
const _sunNoon = new THREE.Color(0xfff1d6);
const _sunDusk = new THREE.Color(0xff7733);
const _moonNight = new THREE.Color(0x7da2d6);

export interface WorldLightAnchor {
  x: number;
  y: number;
  z: number;
  color: number;
  baseIntensity: number;
  distance: number;
}

export class SceneManager {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public torchLights: THREE.PointLight[] = [];
  public worldLightAnchors: WorldLightAnchor[] = [];
  private celestialOrb: THREE.Mesh | null = null;
  public obstacles: CollisionCylinder[] = [];
  public collisionBoxes: CollisionBox[] = [];
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
  private windmillSailsMesh: THREE.Group | null = null;
  private lighthouseBeamMesh: THREE.Group | null = null;
  private monasteryAstrolabeMesh: THREE.Group | null = null;
  private starfallCoreMesh: THREE.Group | null = null;
  private floatingCraterRocks: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  private swampBubbles: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  private mineCrystals: { mesh: THREE.Mesh; phase: number }[] = [];
  private biomeFogTint = new THREE.Color(0x1e242b);
  private timeOfDay = 14.5; // Starts in atmospheric afternoon, progresses smoothly through dusk, night, dawn, day
  private weather: WeatherType = 'fog';
  private previousWeather: WeatherType = 'fog';
  private weatherTransitionBlend = 1.0;
  private weatherEffectsEnabled = true;
  private shadowsEnabled = true;
  private lightningFlash = 0;
  private lightningTimer = 14;

  public windTimeUniform = { value: 0 };
  public windStrengthUniform = { value: 1.0 };
  private embersSystem: THREE.Points | null = null;
  private emberVelocities: Float32Array | null = null;

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
      this.isHeadless ? 0.5 : Math.min(window.devicePixelRatio, 2)
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
    this.scene.add(this.sunLight.target);

    // Celestial Sun / Moon Disc in the sky
    const orbGeo = new THREE.SphereGeometry(4.2, 16, 16);
    const orbMat = new THREE.MeshBasicMaterial({
      color: 0xffdcb5,
      fog: false,
    });
    this.celestialOrb = new THREE.Mesh(orbGeo, orbMat);
    this.scene.add(this.celestialOrb);

    // Pre-allocate 4 dynamic shadow-casting PointLights for nearest world light sources (torches, campfires, braziers)
    if (!this.isHeadless) {
      for (let i = 0; i < 4; i++) {
        const pt = new THREE.PointLight(0xf97316, 6.2, 24, 1.45);
        pt.castShadow = this.shadowsEnabled;
        pt.shadow.mapSize.width = 512;
        pt.shadow.mapSize.height = 512;
        pt.shadow.camera.near = 0.35;
        pt.shadow.camera.far = 24;
        pt.shadow.bias = -0.0025;
        pt.shadow.normalBias = 0.035;
        this.scene.add(pt);
        this.torchLights.push(pt);
      }
    }

    this.buildTerrainAndWater();
    this.buildCrowHollowVillage();
    this.buildOldForestAndCliffs();
    this.buildGrassTufts();
    this.buildEmbersAndGlowHalos();
    this.buildCursedSanctuary();
    this.buildRuinedFortress();
    this.buildUndergroundCatacombs();
    this.buildAshCemeteryAndOrderCamp();
    this.buildNorthernMarchBiomes();
    this.buildSunkenPortSolheim();
    this.buildSunMonastery();
    this.buildStarfallValleyAndForge();
    this.buildSettlementFencesAndGates();
    this.buildWeatherSystem();
  }

  public getAssetManager(): AssetManager {
    return this.assetManager;
  }

  private buildTerrainAndWater(): void {
    const widthX = 430;
    const lengthZ = 270;
    const segX = this.isHeadless ? 160 : 220;
    const segZ = this.isHeadless ? 120 : 180;
    const geo = new THREE.PlaneGeometry(widthX, lengthZ, segX, segZ);
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
      roughness: 0.12,
      metalness: 0.15,
      transmission: 0.72,
      thickness: 1.4,
      ior: 1.333,
      transparent: true,
      opacity: 0.88,
    });

    if (!this.isHeadless) {
      waterMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.windTimeUniform;
        shader.vertexShader = `
          uniform float uTime;
        ` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          // Procedural river waves & ripple displacement
          float wave1 = sin(position.x * 0.25 + uTime * 2.2) * 0.12;
          float wave2 = cos(position.z * 0.42 + uTime * 1.8) * 0.08;
          float wave3 = sin((position.x + position.z) * 0.32 + uTime * 2.8) * 0.04;
          transformed.y += wave1 + wave2 + wave3;
          `
        );
      };
    }
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.scene.add(waterMesh);

    // Western Sea Ocean Water Plane for Sunken Port Solheim (x in [-225, -130], z in [-115, 115])
    const seaGeo = new THREE.PlaneGeometry(96, 230, 24, 48);
    seaGeo.rotateX(-Math.PI / 2);
    const seaMesh = new THREE.Mesh(seaGeo, waterMat);
    seaMesh.position.set(-178, -1.65, 0);
    this.scene.add(seaMesh);

    // 3 Wooden Bridges across the river at x = 0, x = -52 (West Forest Bridge), and x = 52 (East Outpost Bridge)
    const woodMat = this.assetManager.getMaterial('wood');
    for (const bx of [0, -52, 52]) {
      const riverCenterZ = 34 + Math.sin(bx * 0.03) * 6;
      const bridgeGroup = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.35, 17), woodMat);
      deck.position.set(bx, 0.195, riverCenterZ);
      deck.receiveShadow = true;
      deck.castShadow = true;
      bridgeGroup.add(deck);
      this.colliderMeshes.push(deck);

      for (let zOffset = -7.5; zOffset <= 7.5; zOffset += 3) {
        const postL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 0.3), woodMat);
        postL.position.set(bx - 3.4, 0.9, riverCenterZ + zOffset);
        const postR = postL.clone();
        postR.position.x = bx + 3.4;
        bridgeGroup.add(postL, postR);
      }
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 16.5), woodMat);
      railL.position.set(bx - 3.4, 1.35, riverCenterZ);
      const railR = railL.clone();
      railR.position.x = bx + 3.4;
      bridgeGroup.add(railL, railR);
      this.scene.add(bridgeGroup);
    }
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

    const cosR = Math.abs(Math.cos(rotY));
    const sinR = Math.abs(Math.sin(rotY));
    const halfExtX = (width * cosR + depth * sinR) * 0.5;
    const halfExtZ = (width * sinR + depth * cosR) * 0.5;

    this.collisionBoxes.push({
      minX: x - halfExtX,
      maxX: x + halfExtX,
      minZ: z - halfExtZ,
      maxZ: z + halfExtZ,
      minY: y - 0.5,
      maxY: y + height + 3.0,
      label: 'house',
    });

    this.obstacles.push({
      x,
      z,
      radius: Math.max(width, depth) * 0.56,
      height: height + 3,
    });

    return group;
  }

  private createWatchtower(x: number, z: number): void {
    const y = getGroundHeight(x, z);
    const woodMat = this.assetManager.getMaterial('wood');
    const stoneMat = this.assetManager.getMaterial('stone');
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 2.4, 8), stoneMat);
    base.position.y = 1.2;
    base.castShadow = true;
    base.receiveShadow = true;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.2, 5.2, 3.2), woodMat);
    shaft.position.y = 5.0;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    const platform = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 4.2), woodMat);
    platform.position.y = 7.7;
    platform.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.4, 4), stoneMat);
    roof.position.y = 10.1;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;

    group.add(base, shaft, platform, roof);
    this.scene.add(group);
    this.obstacles.push({ x, z, radius: 2.4, height: 10.5 });
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
    // 6. Baker & Granary House (West-South-West)
    this.createMedievalHouse(-22, 6, Math.PI / 2, 6.2, 7.2, 3.9);
    // 7. Weaver & Apothecary Cottage (Far East)
    this.createMedievalHouse(23, -3, -Math.PI / 2, 5.8, 6.8, 3.8);
    // 8. Northern Garrison Guardhouse
    this.createMedievalHouse(-10, -20, 0, 6.4, 7.4, 4.1);

    // 9. Crow Hollow Windmill ("Старая Ветряная Мельница") at (23, -15)
    const millX = 23;
    const millZ = -15;
    const millY = getGroundHeight(millX, millZ);
    const stoneMat = this.assetManager.getMaterial('stone');
    const woodMat = this.assetManager.getMaterial('wood');
    const sailClothMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const millTower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 3.5, 8.8, 10),
      stoneMat
    );
    millTower.position.set(millX, millY + 4.4, millZ);
    millTower.castShadow = true;
    millTower.receiveShadow = true;
    const millCap = new THREE.Mesh(new THREE.ConeGeometry(3.1, 2.6, 10), woodMat);
    millCap.position.set(millX, millY + 10.1, millZ);
    millCap.castShadow = true;
    this.scene.add(millTower, millCap);
    this.obstacles.push({ x: millX, z: millZ, radius: 3.6, height: 11 });

    this.windmillSailsMesh = new THREE.Group();
    this.windmillSailsMesh.position.set(millX - 2.7, millY + 7.6, millZ);
    this.windmillSailsMesh.rotation.y = -Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 8), woodMat);
    hub.rotation.x = Math.PI / 2;
    this.windmillSailsMesh.add(hub);
    for (let i = 0; i < 4; i++) {
      const armGroup = new THREE.Group();
      armGroup.rotation.z = (i * Math.PI) / 2;
      const spar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.2, 0.18), woodMat);
      spar.position.y = 2.6;
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 4.2), sailClothMat);
      sail.position.set(0.58, 2.8, 0.05);
      armGroup.add(spar, sail);
      this.windmillSailsMesh.add(armGroup);
    }
    this.scene.add(this.windmillSailsMesh);

    // 10. Village Perimeter Watchtowers & Market Stalls
    this.createWatchtower(-21, -17);
    this.createWatchtower(19, 20);

    // Market Stalls near the Village Square
    for (const [sx, sz, rot] of [
      [-6.5, 7.5, 0.3],
      [6.5, 11.5, -0.4],
    ] as [number, number, number][]) {
      const sy = getGroundHeight(sx, sz);
      const stall = new THREE.Group();
      stall.position.set(sx, sy, sz);
      stall.rotation.y = rot;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 1.4), woodMat);
      counter.position.y = 0.45;
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(3.1, 0.15, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.9 })
      );
      awning.position.y = 2.1;
      awning.rotation.x = 0.18;
      stall.add(counter, awning);
      this.scene.add(stall);
      this.obstacles.push({ x: sx, z: sz, radius: 1.5, height: 2.3 });
    }

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

      this.worldLightAnchors.push({
        x: tx,
        y: ty + 3.0,
        z: tz,
        color: 0xf97316,
        baseIntensity: 6.2,
        distance: 21,
      });
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

    // Forest Ranger Outpost ("Лесной Кордон Егерей") at (-60, 17) & Abandoned Farmhouse at (44, 8)
    this.createMedievalHouse(-60, 17, Math.PI / 4, 6.2, 7.4, 3.8);
    this.createWatchtower(-64, 13);
    this.createMedievalHouse(44, 8, -Math.PI / 3, 6.0, 7.2, 3.6);
  }

  private buildOldForestAndCliffs(): void {
    // Instanced Trees (Trunks + Foliage Cones)
    const treeCount = 240;
    const trunkGeo = new THREE.CylinderGeometry(0.26, 0.42, 3.6, 7);
    trunkGeo.translate(0, 1.8, 0);
    const canopyGeo = new THREE.ConeGeometry(2.3, 6.2, 7);
    canopyGeo.translate(0, 5.2, 0);

    const trunkMat = this.assetManager.getMaterial('wood');
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x1e3522,
      roughness: 0.88,
    });

    if (!this.isHeadless) {
      canopyMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.windTimeUniform;
        shader.uniforms.uWindStrength = this.windStrengthUniform;
        shader.vertexShader = `
          uniform float uTime;
          uniform float uWindStrength;
        ` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          // Procedural vertex wind sway for pine trees
          vec4 worldPos = instanceMatrix * vec4(position, 1.0);
          float phase = uTime * 2.2 + worldPos.x * 0.12 + worldPos.z * 0.12;
          float swayHeight = clamp((position.y - 1.2) * 0.18, 0.0, 1.0);
          float sway = (sin(phase) * 0.7 + cos(phase * 0.7) * 0.3) * uWindStrength * swayHeight;
          transformed.x += sway * 0.45;
          transformed.z += sway * 0.35;
          `
        );
      };
    }

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
    trunkInst.castShadow = !this.isHeadless;
    canopyInst.castShadow = !this.isHeadless;
    canopyInst.receiveShadow = true;

    let placed = 0;
    for (let i = 0; i < 520 && placed < treeCount; i++) {
      // Deterministic pseudo-random placement
      const angle = i * 2.39996;
      const r = 26 + ((i * 19) % 86);
      const tx = Math.cos(angle) * r;
      const tz = Math.sin(angle) * r;

      // Keep village center, roads, river, sanctuary, fortress, and ranger outpost clear
      if (Math.hypot(tx, tz) < 28) continue;
      if (Math.abs(tx) < 6 && tz > -5 && tz < 45) continue; // North-South road
      if (Math.abs(tz - (34 + Math.sin(tx * 0.03) * 6)) < 8.5) continue; // River
      if (Math.hypot(tx - -65, tz - -55) < 18) continue; // Sanctuary
      if (Math.hypot(tx - 72, tz - -68) < 24) continue; // Fortress
      if (Math.hypot(tx - -34, tz - 18) < 7) continue; // Hunter camp
      if (Math.hypot(tx - -58, tz - 18) < 12) continue; // Ranger outpost
      if (Math.hypot(tx - 44, tz - 8) < 10) continue; // Abandoned farmhouse
      if (Math.abs(tz) < 10 && tx < -75) continue; // Western Solheim road
      if (Math.abs(tz + 15) < 10 && tx > 75) continue; // Eastern Monastery road

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
    // Outer natural cliff ring at radius ~ 112m (with gaps for Northern Pass, Western Solheim Coast, and Eastern Sun Monastery)
    for (let i = 0; i < 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      const rx = Math.cos(a) * 114;
      const rz = Math.sin(a) * 114;
      if (rz < -94 && Math.abs(rx) < 18) continue; // Northern Pass gap
      if (rx < -88 && Math.abs(rz) < 42) continue; // Western Solheim Port pass gap
      if (rx > 88 && Math.abs(rz + 15) < 42) continue; // Eastern Sun Monastery pass gap
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
      const r = 30 + ((i * 23) % 75);
      const rx = Math.cos(a) * r;
      const rz = Math.sin(a) * r;
      if (Math.hypot(rx, rz) < 30) continue;
      if (Math.hypot(rx - -65, rz - -55) < 18) continue;
      if (Math.hypot(rx - 72, rz - -68) < 24) continue;
      if (Math.hypot(rx - -56, rz - 22) < 12) continue;
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

  private buildGrassTufts(): void {
    const grassCount = this.isHeadless ? 100 : 520;
    // Crossed-quad blade tuft
    const g1 = new THREE.PlaneGeometry(0.7, 0.75, 1, 2);
    g1.translate(0, 0.375, 0);
    const g2 = g1.clone();
    g2.rotateY(Math.PI / 2);

    // Merge geometries
    const tuftGeo = new THREE.BufferGeometry();
    const pos1 = g1.attributes.position.array;
    const pos2 = g2.attributes.position.array;
    const mergedPositions = new Float32Array(pos1.length + pos2.length);
    mergedPositions.set(pos1, 0);
    mergedPositions.set(pos2, pos1.length);
    tuftGeo.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));

    const norm1 = g1.attributes.normal.array;
    const norm2 = g2.attributes.normal.array;
    const mergedNormals = new Float32Array(norm1.length + norm2.length);
    mergedNormals.set(norm1, 0);
    mergedNormals.set(norm2, norm1.length);
    tuftGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNormals, 3));

    const uv1 = g1.attributes.uv.array;
    const uv2 = g2.attributes.uv.array;
    const mergedUvs = new Float32Array(uv1.length + uv2.length);
    mergedUvs.set(uv1, 0);
    mergedUvs.set(uv2, uv1.length);
    tuftGeo.setAttribute('uv', new THREE.BufferAttribute(mergedUvs, 2));

    const idx1 = g1.index?.array ?? [];
    const idx2 = g2.index?.array ?? [];
    const offset = g1.attributes.position.count;
    const mergedIndices: number[] = [...idx1];
    for (let i = 0; i < idx2.length; i++) {
      mergedIndices.push(idx2[i] + offset);
    }
    tuftGeo.setIndex(mergedIndices);

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x385429,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    if (!this.isHeadless) {
      grassMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.windTimeUniform;
        shader.uniforms.uWindStrength = this.windStrengthUniform;
        shader.vertexShader = `
          uniform float uTime;
          uniform float uWindStrength;
        ` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vec4 worldPos = instanceMatrix * vec4(position, 1.0);
          float gPhase = uTime * 3.2 + worldPos.x * 0.35 + worldPos.z * 0.35;
          float tipWeight = clamp(position.y / 0.75, 0.0, 1.0);
          float gSway = sin(gPhase) * 0.22 * uWindStrength * tipWeight;
          transformed.x += gSway;
          transformed.z += gSway * 0.65;
          `
        );
      };
    }

    const grassInst = new THREE.InstancedMesh(tuftGeo, grassMat, grassCount);
    let gIdx = 0;
    for (let i = 0; i < 900 && gIdx < grassCount; i++) {
      const angle = i * 2.15;
      const dist = 14 + ((i * 27) % 82);
      const gx = Math.cos(angle) * dist;
      const gz = Math.sin(angle) * dist;

      // Keep river and roads clear
      if (Math.abs(gz - (34 + Math.sin(gx * 0.03) * 6)) < 8.2) continue;
      if (Math.abs(gx) < 4.5 && gz > -15 && gz < 40) continue;
      if (Math.hypot(gx, gz) < 16) continue;

      const gy = getGroundHeight(gx, gz);
      const scale = 0.8 + ((i * 17) % 50) / 100;
      _dummy.position.set(gx, gy, gz);
      _dummy.rotation.set(0, (i * 0.9) % (Math.PI * 2), 0);
      _dummy.scale.set(scale, scale, scale);
      _dummy.updateMatrix();

      grassInst.setMatrixAt(gIdx, _dummy.matrix);

      // Natural grass color shade variations
      const shade = 0.85 + ((i * 13) % 30) / 100;
      _color.setRGB(0.18 * shade, 0.32 * shade, 0.14 * shade);
      grassInst.setColorAt(gIdx, _color);
      gIdx++;
    }

    grassInst.count = gIdx;
    grassInst.instanceMatrix.needsUpdate = true;
    if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
    grassInst.computeBoundingSphere();
    this.scene.add(grassInst);
  }

  private buildEmbersAndGlowHalos(): void {
    // 1. Soft Flame Glow Halos (Volumetric Light Billboard Sprites)
    const haloGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const haloTex = this.assetManager['createCanvasTexture']?.(
      'fire_halo',
      64,
      64,
      (ctx, w, h) => {
        const rad = w / 2;
        const grad = ctx.createRadialGradient(rad, rad, 2, rad, rad, rad);
        grad.addColorStop(0, 'rgba(251, 146, 60, 0.85)');
        grad.addColorStop(0.35, 'rgba(234, 88, 12, 0.45)');
        grad.addColorStop(0.7, 'rgba(180, 83, 9, 0.15)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    );

    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const firePositions: [number, number, number][] = [
      [5, getGroundHeight(5, -5) + 3.0, -5],
      [-7, getGroundHeight(-7, -4) + 3.0, -4],
      [10, getGroundHeight(10, 5) + 3.0, 5],
      [-2, getGroundHeight(-2, 16) + 3.0, 16],
      [-34, getGroundHeight(-34, 18) + 1.2, 18], // Hunter camp campfire
      [11.5, getGroundHeight(11.5, 7.5) + 1.6, 7.5], // Blacksmith forge furnace
      [-65, getGroundHeight(-65, -55) + 2.4, -55], // Cursed Sanctuary altar glow
      [50, getGroundHeight(50, -46) + 2.6, -46], // Ruined Fortress gate brazier
      [72, getGroundHeight(72, -68) + 2.8, -68], // Fortress throne brazier
      [24, getGroundHeight(24, 32) + 1.5, 32], // Order of the Crimson Sun campfire
      [0, getGroundHeight(0, -112) + 2.2, -112], // Gallows Swamp Charon lantern
      [0, getGroundHeight(0, -225) + 1.6, -225], // Silvertooth Pass Brom campfire
      [0, getGroundHeight(0, -335) + 2.2, -335], // Black Bastion Kael brazier
      [-122, getGroundHeight(-122, -4) + 1.6, -4], // Solheim Port Keeper campfire
      [-172, getGroundHeight(-172, -18) + 14.5, -18], // Solheim Lighthouse beacon
      [148, getGroundHeight(148, -15) + 1.8, -15], // Sun Monastery courtyard brazier
      [0, getGroundHeight(0, -572) + 1.8, -572], // Starfall Valley herald campfire
      [0, getGroundHeight(0, -655) + 2.6, -655], // Starfall Precursor Anvil glow
    ];

    for (const [fx, fy, fz] of firePositions) {
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(fx, fy, fz);
      this.scene.add(halo);

      // Register in dynamic light source pool if not already added
      const exists = this.worldLightAnchors.some((a) => Math.hypot(a.x - fx, a.z - fz) < 2.0);
      if (!exists) {
        const isSanctuary = Math.hypot(fx - -65, fz - -55) < 5;
        const isStarfall = fz < -550;
        this.worldLightAnchors.push({
          x: fx,
          y: fy + 0.3,
          z: fz,
          color: isSanctuary ? 0xa855f7 : isStarfall ? 0x38bdf8 : 0xff7b24,
          baseIntensity: isSanctuary ? 6.5 : 7.0,
          distance: 24,
        });
      }
    }

    // 2. Rising Sparks / Embers Particle System
    const emberCount = 140;
    const emberGeo = new THREE.BufferGeometry();
    const emberPositions = new Float32Array(emberCount * 3);
    this.emberVelocities = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      const anchor = firePositions[i % firePositions.length];
      emberPositions[i * 3] = anchor[0] + (Math.random() - 0.5) * 0.8;
      emberPositions[i * 3 + 1] = anchor[1] + Math.random() * 2.5;
      emberPositions[i * 3 + 2] = anchor[2] + (Math.random() - 0.5) * 0.8;
      this.emberVelocities[i] = 0.8 + Math.random() * 1.4;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));

    const emberMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.18,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.embersSystem = new THREE.Points(emberGeo, emberMat);
    this.scene.add(this.embersSystem);
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

    // Stone Ritual Circle Platform (top surface flush with cy + 0.03)
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.5, 0.5, 16), stoneMat);
    dais.position.set(cx, cy - 0.22, cz);
    dais.receiveShadow = true;
    this.scene.add(dais);
    this.colliderMeshes.push(dais);

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

    // Outer Druid Archways & Ritual Ossuary Shrine at (-76, -64)
    for (const [ax, az, rot] of [
      [-52, -45, -0.7],
      [-78, -46, 0.7],
      [-76, -67, -0.5],
    ] as [number, number, number][]) {
      const ay = getGroundHeight(ax, az);
      const arch = new THREE.Group();
      arch.position.set(ax, ay, az);
      arch.rotation.y = rot;
      const pL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.2, 0.9), stoneMat);
      pL.position.set(-1.8, 2.1, 0);
      const pR = pL.clone();
      pR.position.x = 1.8;
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.8, 1.1), stoneMat);
      lintel.position.set(0, 4.3, 0);
      arch.add(pL, pR, lintel);
      this.scene.add(arch);
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
    const woodMat = this.assetManager.getMaterial('wood');

    // Courtyard Floor (top surface flush with fy + 0.03)
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(16, 17, 0.4, 16), stoneMat);
    floor.position.set(fx, fy - 0.17, fz);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.colliderMeshes.push(floor);

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

    // Outer Fortress Gatehouse & Siege Ballistae at (52, -48) and (86, -54)
    this.createMedievalHouse(88, -56, -Math.PI / 3, 6.8, 8.2, 4.2);
    for (const [bx, bz, rot] of [
      [54, -46, -0.8],
      [62, -48, -0.6],
    ] as [number, number, number][]) {
      const by = getGroundHeight(bx, bz);
      const ballista = new THREE.Group();
      ballista.position.set(bx, by, bz);
      ballista.rotation.y = rot;
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.4), woodMat);
      base.position.y = 0.45;
      const arms = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 0.25), woodMat);
      arms.position.set(0, 1.0, 0.8);
      ballista.add(base, arms);
      this.scene.add(ballista);
      this.obstacles.push({ x: bx, z: bz, radius: 1.4, height: 1.5 });
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
    floor.position.set(cx, -0.18, cz);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.colliderMeshes.push(floor);

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

    // Order Command Tent at (-10, 64) + Secondary Tents at (-18, 60) and (10, 62)
    for (const [tx, tz, r] of [
      [-10, 64, 3.6],
      [-18, 60, 2.8],
      [10, 62, 2.9],
    ] as [number, number, number][]) {
      const tentY = getGroundHeight(tx, tz);
      const tent = new THREE.Mesh(new THREE.ConeGeometry(r, 4.2, 6), crimsonBannerMat);
      tent.position.set(tx, tentY + 2.1, tz);
      tent.castShadow = true;
      this.scene.add(tent);
      this.obstacles.push({ x: tx, z: tz, radius: r * 0.9, height: 4.2 });
    }

    // Ruined Bell Tower Chapel ("Часовня Пепельного Колокола") at (18, 76) & Stone Mausoleums
    const chapelY = getGroundHeight(18, 76);
    const chapelNave = new THREE.Mesh(new THREE.BoxGeometry(5.6, 4.8, 7.8), stoneMat);
    chapelNave.position.set(18, chapelY + 2.4, 76);
    const belfry = new THREE.Mesh(new THREE.BoxGeometry(3.2, 9.2, 3.2), stoneMat);
    belfry.position.set(18, chapelY + 4.6, 72.5);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.4, 4), stoneMat);
    spire.position.set(18, chapelY + 10.9, 72.5);
    spire.rotation.y = Math.PI / 4;
    this.scene.add(chapelNave, belfry, spire);
    this.obstacles.push({ x: 18, z: 76, radius: 4.2, height: 11 });

    for (const [mx, mz] of [
      [-18, 78],
      [-16, 90],
      [16, 92],
    ] as [number, number][]) {
      const my = getGroundHeight(mx, mz);
      const crypt = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.2, 4.6), stoneMat);
      crypt.position.set(mx, my + 1.6, mz);
      this.scene.add(crypt);
      this.obstacles.push({ x: mx, z: mz, radius: 2.5, height: 3.4 });
    }

    // Ash Cemetery Boss Arena & Crypt Monoliths around (0, 84)
    const arenaY = getGroundHeight(0, 84);
    const cryptDais = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 15, 0.45, 16),
      stoneMat
    );
    cryptDais.position.set(0, arenaY - 0.195, 84);
    cryptDais.receiveShadow = true;
    this.scene.add(cryptDais);
    this.colliderMeshes.push(cryptDais);

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

  private createStiltHut(x: number, z: number, rotY = 0): void {
    const group = new THREE.Group();
    const y = getGroundHeight(x, z);
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const woodMat = this.assetManager.getMaterial('wood');
    const thatchMat = new THREE.MeshStandardMaterial({
      color: 0x3f3726,
      roughness: 0.95,
    });

    // 4 Timber stilts driven into the swamp mud
    for (const [sx, sz] of [
      [-1.9, -2.2],
      [1.9, -2.2],
      [-1.9, 2.2],
      [1.9, 2.2],
    ]) {
      const stilt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, 2.2, 6),
        woodMat
      );
      stilt.position.set(sx, 0.4, sz);
      group.add(stilt);
    }

    // Elevated plank deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 5.4), woodMat);
    deck.position.y = 1.45;
    deck.receiveShadow = true;

    // Weathered cabin walls
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.4, 4.0), woodMat);
    cabin.position.set(0, 2.75, -0.3);
    cabin.castShadow = true;

    // Pitched reed thatch roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.9, 4), thatchMat);
    roof.position.set(0, 4.7, -0.3);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;

    // Sloped access ramp
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 2.6), woodMat);
    ramp.position.set(0, 0.75, 3.5);
    ramp.rotation.x = 0.52;

    group.add(deck, cabin, roof, ramp);
    this.scene.add(group);

    this.collisionBoxes.push({
      minX: x - 2.2,
      maxX: x + 2.2,
      minZ: z - 2.5,
      maxZ: z + 2.2,
      minY: y - 0.5,
      maxY: y + 5.5,
      label: 'stilt_hut',
    });
    this.obstacles.push({ x, z, radius: 2.5, height: 5.5 });
  }

  private buildNorthernMarchBiomes(): void {
    const stoneMat = this.assetManager.getMaterial('stone');
    const woodMat = this.assetManager.getMaterial('wood');
    const steelMat = this.assetManager.getMaterial('steel');

    // 0. Massively Expanded Seamless Northern Terrain Mesh covering x in [-205, 205], z in [-718, -98] (including Act III Starfall Valley)
    const northWidth = 410;
    const northLength = 620;
    const segX = this.isHeadless ? 140 : 180;
    const segZ = this.isHeadless ? 240 : 320;
    const northGeo = new THREE.PlaneGeometry(northWidth, northLength, segX, segZ);
    northGeo.rotateX(-Math.PI / 2);

    const pos = northGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i) - 408.0; // shifts [-310, +310] to [-718, -98]
      pos.setZ(i, vz);
      pos.setY(i, getGroundHeight(vx, vz));
    }
    northGeo.computeVertexNormals();

    const northTerrainMesh = new THREE.Mesh(
      northGeo,
      this.assetManager.getMaterial('ground')
    );
    northTerrainMesh.receiveShadow = true;
    this.scene.add(northTerrainMesh);
    this.colliderMeshes.push(northTerrainMesh);

    // =========================================================================
    // BIOME 1: GALLOWS SWAMP & SUNKEN FENS ("Тракт Висельников и Затопленные Топи", z in [-215, -105])
    // =========================================================================
    // Transition 1: Ruined Northern Outpost Gate at z = -106
    for (const side of [-1, 1]) {
      const gx = side * 6.5;
      const gz = -106;
      const gy = getGroundHeight(gx, gz);
      const gateTower = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 5.8, 2.6),
        stoneMat
      );
      gateTower.position.set(gx, gy + 2.9, gz);
      gateTower.castShadow = true;
      this.scene.add(gateTower);
      this.obstacles.push({ x: gx, z: gz, radius: 1.6, height: 6 });
      this.collisionBoxes.push({
        minX: gx - 1.4,
        maxX: gx + 1.4,
        minZ: gz - 1.4,
        maxZ: gz + 1.4,
        minY: gy,
        maxY: gy + 6,
      });
    }

    // Expanded Swamp Murky Toxic Water Plane (280m wide x 106m long)
    const swampWaterGeo = new THREE.PlaneGeometry(280, 106, 32, 32);
    swampWaterGeo.rotateX(-Math.PI / 2);
    const swampWaterMat = new THREE.MeshStandardMaterial({
      color: 0x132e22,
      emissive: 0x062016,
      emissiveIntensity: 0.38,
      roughness: 0.22,
      metalness: 0.15,
      transparent: true,
      opacity: 0.84,
    });
    const swampWater = new THREE.Mesh(swampWaterGeo, swampWaterMat);
    swampWater.position.set(0, -0.48, -160);
    this.scene.add(swampWater);

    // 1A. Main North-South Rotten Wooden Boardwalk (Гать) from z = -110 to -186
    for (let z = -110; z >= -186; z -= 5.2) {
      const by = getGroundHeight(0, z);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.24, 4.9), woodMat);
      plank.position.set(0, by - 0.08, z);
      plank.rotation.y = ((z * 13) % 7) * 0.015;
      plank.receiveShadow = true;
      this.scene.add(plank);
      this.colliderMeshes.push(plank);
    }

    // 1B. Western Boardwalk Branch (z = -152, x from -4 to -44) -> Abandoned Stilt Fisherman Village
    for (let x = -5; x >= -44; x -= 4.8) {
      const by = getGroundHeight(x, -152);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.22, 3.6), woodMat);
      plank.position.set(x, by - 0.08, -152);
      plank.rotation.z = (x % 2 === 0 ? 1 : -1) * 0.02;
      plank.receiveShadow = true;
      this.scene.add(plank);
      this.colliderMeshes.push(plank);
    }

    // Abandoned Fishermen's Stilt Village at x in [-46, -64], z in [-140, -166] + Alchemist Stilt Hut
    this.createStiltHut(-48, -145, 0.35);
    this.createStiltHut(-58, -154, -0.4);
    this.createStiltHut(-50, -164, 0.8);
    this.createStiltHut(-64, -144, 0.15);
    this.createStiltHut(42, -136, -0.5);
    this.createWatchtower(-36, -182);

    // 1C. Eastern Boardwalk Branch (z = -166, x from 4 to 24) -> Lord Vane's Manor ("Поместье Воронов")
    for (let x = 5; x <= 23; x += 4.5) {
      const by = getGroundHeight(x, -166);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 3.8), woodMat);
      plank.position.set(x, by - 0.08, -166);
      plank.receiveShadow = true;
      this.scene.add(plank);
      this.colliderMeshes.push(plank);
    }

    // Lord Vane's Gothic Manor House & Courtyard at (39.5, -166)
    this.createMedievalHouse(39.5, -166, -Math.PI / 2, 8.2, 10.5, 5.2);
    const banquetTableY = getGroundHeight(28, -166);
    const banquetTable = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.85, 4.4),
      woodMat
    );
    banquetTable.position.set(28, banquetTableY + 0.42, -166);
    this.scene.add(banquetTable);

    // 1D. Dozens of Sinking Wooden Carts & Wagons across the Swamp
    const sinkingCartCoords: [number, number, number][] = [
      [-11, -120, 0.4],
      [13, -128, -0.6],
      [-24, -135, 1.1],
      [22, -142, -0.3],
      [-15, -156, 0.8],
      [-35, -148, -0.5],
      [16, -158, 0.5],
      [-28, -174, 1.3],
      [25, -182, -0.9],
      [-42, -172, 0.2],
      [38, -146, -0.7],
      [-14, -188, 0.6],
    ];
    for (const [cx, cz, rot] of sinkingCartCoords) {
      const cy = getGroundHeight(cx, cz);
      const cartGroup = new THREE.Group();
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.75, 1.55), woodMat);
      bed.position.y = 0.35;
      const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.14, 10);
      wheelGeo.rotateX(Math.PI / 2);
      for (const [wx, wz] of [
        [-0.8, 0.82],
        [0.8, 0.82],
        [-0.8, -0.82],
        [0.8, -0.82],
      ]) {
        const wheel = new THREE.Mesh(wheelGeo, woodMat);
        wheel.position.set(wx, 0.28, wz);
        cartGroup.add(wheel);
      }
      cartGroup.add(bed);
      cartGroup.position.set(cx, cy - 0.18, cz);
      cartGroup.rotation.set(0.22, rot, -0.28);
      this.scene.add(cartGroup);
      this.obstacles.push({ x: cx, z: cz, radius: 1.4, height: 1.5 });
    }

    // 1E. Old Gallows with Hanging Iron Cages along the Swamp Road & Branches
    const gallowsCoords: [number, number][] = [
      [-8, -122],
      [9, -134],
      [-10, -148],
      [11, -162],
      [-24, -150],
      [-42, -155],
      [18, -164],
      [-12, -178],
    ];
    for (const [gx, gz] of gallowsCoords) {
      const gy = getGroundHeight(gx, gz);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 4.8, 6), woodMat);
      post.position.set(gx, gy + 2.4, gz);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.22), woodMat);
      arm.position.set(gx + (gx < 0 ? 0.8 : -0.8), gy + 4.6, gz);
      const cage = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 1.3, 6, 1, false),
        steelMat
      );
      cage.position.set(gx + (gx < 0 ? 1.4 : -1.4), gy + 3.4, gz);
      this.scene.add(post, arm, cage);
      this.obstacles.push({ x: gx, z: gz, radius: 0.8, height: 5 });
    }

    // Half-Sunken Village Ruins in the Swamp
    this.createMedievalHouse(-18, -138, 0.35, 6.0, 7.0, 3.2);
    this.createMedievalHouse(19, -148, -0.45, 6.2, 7.2, 3.0);

    // 1F. Dense Swamp Reed Beds (InstancedMesh — 240 reed stalks)
    const reedCount = this.isHeadless ? 60 : 240;
    const reedGeo = new THREE.CylinderGeometry(0.04, 0.08, 2.3, 5);
    reedGeo.translate(0, 1.15, 0);
    const reedMat = new THREE.MeshStandardMaterial({
      color: 0x365314,
      roughness: 0.9,
    });
    const reedInst = new THREE.InstancedMesh(reedGeo, reedMat, reedCount);
    let rPlaced = 0;
    for (let i = 0; i < reedCount; i++) {
      const rx = -85 + ((i * 37) % 170);
      const rz = -112 - ((i * 23) % 96);
      if (Math.abs(rx) < 5.5) continue;
      const ry = getGroundHeight(rx, rz);
      _dummy.position.set(rx, ry - 0.15, rz);
      _dummy.rotation.set(
        ((i % 5) - 2) * 0.08,
        (i * 1.3) % (Math.PI * 2),
        ((i % 7) - 3) * 0.06
      );
      const s = 0.8 + (i % 5) * 0.18;
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();
      reedInst.setMatrixAt(rPlaced++, _dummy.matrix);
    }
    reedInst.count = rPlaced;
    reedInst.instanceMatrix.needsUpdate = true;
    reedInst.computeBoundingSphere();
    this.scene.add(reedInst);

    // 1G. Toxic Misty Depressions with Procedural Water Bubble Animations
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x16a34a,
      emissiveIntensity: 1.6,
      transparent: true,
      opacity: 0.78,
      roughness: 0.15,
    });
    const bubbleGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const hollowCenters: [number, number][] = [
      [-26, -132],
      [26, -138],
      [-34, -172],
      [32, -182],
      [-16, -165],
      [18, -174],
    ];
    for (let i = 0; i < 24; i++) {
      const hc = hollowCenters[i % hollowCenters.length];
      const bx = hc[0] + Math.cos(i * 1.7) * (2.2 + (i % 4) * 1.8);
      const bz = hc[1] + Math.sin(i * 1.7) * (2.2 + (i % 4) * 1.8);
      const baseY = -0.32;
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
      bubble.position.set(bx, baseY, bz);
      this.scene.add(bubble);
      this.swampBubbles.push({
        mesh: bubble,
        baseY,
        phase: i * 0.65,
      });
    }

    // Swamp Hydra Boss Arena Monoliths at (0, -190)
    const hydraY = getGroundHeight(0, -190);
    const hydraDais = new THREE.Mesh(
      new THREE.CylinderGeometry(14.5, 15.5, 0.4, 16),
      stoneMat
    );
    hydraDais.position.set(0, hydraY - 0.17, -190);
    hydraDais.receiveShadow = true;
    this.scene.add(hydraDais);
    this.colliderMeshes.push(hydraDais);

    // =========================================================================
    // BIOME 2: SILVERTOOTH PASS & DEAD MINES ("Среброзубый Перевал и Мёртвые Шахты", z in [-325, -215])
    // =========================================================================
    // Transition 2: Stone Mountain Pass Archway at z = -216
    for (const side of [-1, 1]) {
      const px = side * 7.2;
      const pz = -216;
      const py = getGroundHeight(px, pz);
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 8.5, 3.2), stoneMat);
      pillar.position.set(px, py + 4.25, pz);
      pillar.castShadow = true;
      this.scene.add(pillar);
      this.obstacles.push({ x: px, z: pz, radius: 2.0, height: 8.5 });
      this.collisionBoxes.push({
        minX: px - 1.6,
        maxX: px + 1.6,
        minZ: pz - 1.6,
        maxZ: pz + 1.6,
        minY: py,
        maxY: py + 8.5,
      });
    }
    const passLint = new THREE.Mesh(
      new THREE.BoxGeometry(17.6, 1.8, 3.4),
      stoneMat
    );
    passLint.position.set(0, getGroundHeight(0, -216) + 8.2, -216);
    this.scene.add(passLint);

    // 2A. Winding Mountain Switchback Posts & Retaining Bollards (Серпантин)
    for (let z = -222; z >= -282; z -= 6) {
      const switchbackX = Math.sin((z + 215) * 0.09) * 18;
      for (const side of [-1, 1]) {
        const bx = switchbackX + side * 5.8;
        const by = getGroundHeight(bx, z);
        const bollard = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 1.5, 0.65),
          stoneMat
        );
        bollard.position.set(bx, by + 0.75, z);
        this.scene.add(bollard);
      }
    }

    // 2B. Deep Chasm & Suspension Bridge to the Western Smuggler's Ledge (x in [-26, -48], z = -255)
    for (let x = -26; x >= -48; x -= 2.2) {
      const by = getGroundHeight(x, -255);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.24, 3.8), woodMat);
      plank.position.set(x, by - 0.09, -255);
      this.scene.add(plank);
      this.colliderMeshes.push(plank);
    }
    for (const endX of [-26, -48]) {
      const py = getGroundHeight(endX, -255);
      for (const sideZ of [-2.1, 2.1]) {
        const pylon = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 3.8, 1.1),
          stoneMat
        );
        pylon.position.set(endX, py + 1.9, -255 + sideZ);
        this.scene.add(pylon);
      }
    }

    // Icy Watchtower at (-15, -246) & Dwarven Ore Smelting Foundry ("Плавильня Чёрной Руды") at (24, -256)
    const towerY = getGroundHeight(-15, -246);
    const iceTower = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.8, 10.5, 8),
      stoneMat
    );
    iceTower.position.set(-15, towerY + 5.25, -246);
    iceTower.castShadow = true;
    this.scene.add(iceTower);
    this.obstacles.push({ x: -15, z: -246, radius: 3.8, height: 10.5 });

    const foundryY = getGroundHeight(24, -256);
    const foundryHall = new THREE.Mesh(new THREE.BoxGeometry(7.6, 5.2, 9.2), stoneMat);
    foundryHall.position.set(24, foundryY + 2.6, -256);
    const stack1 = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 8.8, 8), stoneMat);
    stack1.position.set(21.5, foundryY + 6.4, -253.5);
    const stack2 = stack1.clone();
    stack2.position.set(26.5, foundryY + 6.4, -258.5);
    this.scene.add(foundryHall, stack1, stack2);
    this.obstacles.push({ x: 24, z: -256, radius: 4.8, height: 9 });

    // 2C. Snow-Covered Pine Groves (InstancedMesh — 120 snow-covered spruces across the pass)
    const snowTreeCount = this.isHeadless ? 40 : 120;
    const snowCanopyGeo = new THREE.ConeGeometry(2.2, 5.8, 7);
    snowCanopyGeo.translate(0, 4.4, 0);
    const snowCanopyMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.75,
    });
    const snowTrunkGeo = new THREE.CylinderGeometry(0.24, 0.38, 3.2, 6);
    snowTrunkGeo.translate(0, 1.6, 0);
    const snowTrunkInst = new THREE.InstancedMesh(snowTrunkGeo, woodMat, snowTreeCount);
    const snowCanopyInst = new THREE.InstancedMesh(
      snowCanopyGeo,
      snowCanopyMat,
      snowTreeCount
    );
    let stPlaced = 0;
    for (let i = 0; i < snowTreeCount; i++) {
      const tx = -95 + ((i * 43) % 190);
      const tz = -220 - ((i * 19) % 100);
      const switchbackCenter = Math.sin((tz + 215) * 0.09) * 18;
      if (Math.abs(tx) < 11 || Math.abs(tx - switchbackCenter) < 9) continue;
      if (Math.abs(tz + 255) < 6 && tx < -20 && tx > -60) continue; // Keep chasm bridge clear
      if (Math.abs(tz + 275) < 12 && Math.abs(tx) < 62) continue; // Keep mine network clear
      if (Math.hypot(tx, tz + 300) < 20) continue; // Keep Colossus arena clear
      const ty = getGroundHeight(tx, tz);
      const s = 0.85 + (i % 5) * 0.14;
      _dummy.position.set(tx, ty, tz);
      _dummy.rotation.set(0, (i * 1.7) % (Math.PI * 2), 0);
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();
      snowTrunkInst.setMatrixAt(stPlaced, _dummy.matrix);
      snowCanopyInst.setMatrixAt(stPlaced, _dummy.matrix);
      this.obstacles.push({ x: tx, z: tz, radius: 0.65 * s, height: 6 * s });
      stPlaced++;
    }
    snowTrunkInst.count = stPlaced;
    snowCanopyInst.count = stPlaced;
    snowTrunkInst.instanceMatrix.needsUpdate = true;
    snowCanopyInst.instanceMatrix.needsUpdate = true;
    snowTrunkInst.computeBoundingSphere();
    snowCanopyInst.computeBoundingSphere();
    this.scene.add(snowTrunkInst, snowCanopyInst);

    // 2D. Dead Mines Network: Timber Support Portals, Rails, Abandoned Minecarts & Rockfalls
    // Main North-South Mine Adit (z from -250 to -288)
    for (let z = -250; z >= -288; z -= 4.2) {
      const ry = getGroundHeight(0, z);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.42), woodMat);
      tie.position.set(0, ry + 0.08, z);
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 4.3), steelMat);
      railL.position.set(-0.85, ry + 0.18, z);
      const railR = railL.clone();
      railR.position.x = 0.85;
      this.scene.add(tie, railL, railR);
    }

    // East-West Mine Gallery Tracks (z = -275, x from -38 to +54)
    for (let x = -36; x <= 52; x += 4.5) {
      if (Math.abs(x) < 4) continue;
      const ry = getGroundHeight(x, -275);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 2.6), woodMat);
      tie.position.set(x, ry + 0.08, -275);
      const railN = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, 0.1), steelMat);
      railN.position.set(x, ry + 0.18, -275.85);
      const railS = railN.clone();
      railS.position.z = -274.15;
      this.scene.add(tie, railN, railS);
    }

    // Timber Mine Support Arches (Крепи штольни) along the galleries
    const archCoords: [number, number, number][] = [
      [0, -256, 0],
      [0, -268, 0],
      [0, -280, 0],
      [18, -275, Math.PI / 2],
      [30, -275, Math.PI / 2],
      [42, -275, Math.PI / 2],
      [-18, -275, Math.PI / 2],
      [-30, -275, Math.PI / 2],
    ];
    for (const [ax, az, rot] of archCoords) {
      const ay = getGroundHeight(ax, az);
      const archGroup = new THREE.Group();
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.4, 0.45), woodMat);
      postL.position.set(-2.6, 2.2, 0);
      const postR = postL.clone();
      postR.position.x = 2.6;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.5, 0.55), woodMat);
      beam.position.set(0, 4.4, 0);
      archGroup.add(postL, postR, beam);
      archGroup.position.set(ax, ay, az);
      archGroup.rotation.y = rot;
      this.scene.add(archGroup);
    }

    // Multiple Abandoned Minecarts (some overturned with Black Ore)
    const minecartCoords: [number, number, number][] = [
      [-2.8, -268, 0.15],
      [14, -273.5, 1.4],
      [36, -276.5, -1.2],
      [-24, -273.8, 1.6],
      [4.2, -284, -0.35],
    ];
    for (const [cx, cz, rot] of minecartCoords) {
      const cy = getGroundHeight(cx, cz);
      const cart = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 2.2), steelMat);
      cart.position.set(cx, cy + 0.55, cz);
      cart.rotation.y = rot;
      this.scene.add(cart);
      this.obstacles.push({ x: cx, z: cz, radius: 1.3, height: 1.5 });
    }

    // 2E. Flickering Wall Crystals & Black Ore Veins around the Mine Galleries & Colossus Arena
    const crystalCoords: [number, number][] = [
      [-12, -296],
      [12, -296],
      [-14, -304],
      [14, -304],
      [-8, -311],
      [8, -311],
      [24, -270],
      [38, -270],
      [50, -272],
      [48, -280],
      [-28, -270],
      [-38, -279],
      [-55, -252],
      [22, -242],
    ];
    for (let i = 0; i < crystalCoords.length; i++) {
      const [cx, cz] = crystalCoords[i];
      const cy = getGroundHeight(cx, cz);
      const cMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      });
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(1.1 + (i % 3) * 0.25, 3.8 + (i % 3) * 0.6, 6),
        cMat
      );
      crystal.position.set(cx, cy + 1.9, cz);
      crystal.rotation.z = ((i % 3) - 1) * 0.18;
      this.scene.add(crystal);
      this.mineCrystals.push({ mesh: crystal, phase: i * 0.85 });
      this.obstacles.push({ x: cx, z: cz, radius: 1.3, height: 4.4 });
    }

    // =========================================================================
    // BIOME 3: BLACK BASTION OF THE ASH BROTHERHOOD ("Чёрный Бастион Братства Пепла", z in [-435, -325])
    // =========================================================================
    // Transition 3: Suspension Bridge over Mountain Abyss (z from -320 to -336)
    for (let z = -320; z >= -336; z -= 2.5) {
      const by = getGroundHeight(0, z);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.28, 2.3), woodMat);
      deck.position.set(0, by - 0.11, z);
      this.scene.add(deck);
      this.colliderMeshes.push(deck);
    }
    for (const side of [-1, 1]) {
      const postS = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.2, 1.2), stoneMat);
      postS.position.set(side * 3.4, getGroundHeight(0, -320) + 2.1, -320);
      const postN = postS.clone();
      postN.position.set(side * 3.4, getGroundHeight(0, -336) + 2.1, -336);
      this.scene.add(postS, postN);
    }

    // 3A. Massive Fortress Outer Curtain Walls & Gate Towers at z = -346
    for (const side of [-1, 1]) {
      const bx = side * 9.5;
      const bz = -346;
      const by = getGroundHeight(bx, bz);
      const bastionTower = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 3.2, 11.5, 8),
        stoneMat
      );
      bastionTower.position.set(bx, by + 5.75, bz);
      bastionTower.castShadow = true;
      this.scene.add(bastionTower);
      this.obstacles.push({ x: bx, z: bz, radius: 3.1, height: 11.5 });

      // Curtain wall wings extending from gate towers out to +/- 54m
      const wallWing = new THREE.Mesh(new THREE.BoxGeometry(40, 7.5, 2.4), stoneMat);
      const wx = side * 32;
      const wy = getGroundHeight(wx, bz);
      wallWing.position.set(wx, wy + 3.75, bz);
      wallWing.castShadow = true;
      this.scene.add(wallWing);
      this.collisionBoxes.push({
        minX: wx - 20,
        maxX: wx + 20,
        minZ: bz - 1.3,
        maxZ: bz + 1.3,
        minY: wy,
        maxY: wy + 7.5,
        label: 'bastion_wall',
      });
    }

    // 3B. Collapsed Corner Watchtowers with Masonry Rubble at (-54, -348) and (+54, -348)
    for (const side of [-1, 1]) {
      const tx = side * 54;
      const tz = -348;
      const ty = getGroundHeight(tx, tz);
      const ruinedTower = new THREE.Mesh(
        new THREE.CylinderGeometry(3.4, 3.8, 6.2, 8),
        stoneMat
      );
      ruinedTower.position.set(tx, ty + 3.1, tz);
      this.scene.add(ruinedTower);
      this.obstacles.push({ x: tx, z: tz, radius: 3.8, height: 6.5 });
      for (let r = 0; r < 4; r++) {
        const rubble = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.1 + (r % 2) * 0.4, 0),
          stoneMat
        );
        rubble.position.set(
          tx - side * (3.2 + r * 1.4),
          ty + 0.6,
          tz + (r - 1.5) * 1.6
        );
        this.scene.add(rubble);
      }
    }

    // 3C. Western Wing (x = -38, z = -376): Burned Barracks & Combat Training Grounds with Dummies
    this.createMedievalHouse(-46, -366, Math.PI / 2, 7.5, 9.5, 3.8);
    this.createMedievalHouse(-46, -386, Math.PI / 2, 7.5, 9.5, 3.4);

    // 6 Combat Training Dummies (Манекены для фехтования) in the Western Training Yard
    const dummyCoords: [number, number][] = [
      [-28, -368],
      [-34, -368],
      [-28, -376],
      [-34, -376],
      [-28, -384],
      [-34, -384],
    ];
    const strawMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.9,
    });
    for (const [dx, dz] of dummyCoords) {
      const dy = getGroundHeight(dx, dz);
      const dummyGroup = new THREE.Group();
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 2.1, 6),
        woodMat
      );
      post.position.y = 1.05;
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.28, 0.95, 8),
        strawMat
      );
      body.position.y = 1.25;
      const crossbar = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.12, 0.12),
        woodMat
      );
      crossbar.position.y = 1.45;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), strawMat);
      head.position.y = 1.92;
      dummyGroup.add(post, body, crossbar, head);
      dummyGroup.position.set(dx, dy, dz);
      this.scene.add(dummyGroup);
      this.obstacles.push({ x: dx, z: dz, radius: 0.6, height: 2.1 });
    }

    // 3D. Eastern Wing (x = +38, z = -376): Alchemical Laboratory & Mutagen Vats
    const vatMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });
    const mutagenGreenMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    });
    // Central Trial Vats (Чаны Тлеющей Крови) at z = -364 + Eastern Lab Vats at x in [28..44]
    const allVats: [number, number, boolean][] = [
      [-9.0, -364, false],
      [9.0, -364, false],
      [32.0, -368, true],
      [42.0, -368, false],
      [32.0, -382, false],
      [42.0, -382, true],
    ];
    for (const [vx, vz, isGreen] of allVats) {
      const vy = getGroundHeight(vx, vz);
      const vatBase = new THREE.Mesh(
        new THREE.CylinderGeometry(2.0, 2.3, 1.8, 12),
        stoneMat
      );
      vatBase.position.set(vx, vy + 0.9, vz);
      const vatGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 1.75, 0.2, 12),
        isGreen ? mutagenGreenMat : vatMat
      );
      vatGlow.position.set(vx, vy + 1.82, vz);
      this.scene.add(vatBase, vatGlow);
      this.obstacles.push({ x: vx, z: vz, radius: 2.3, height: 2.2 });
    }

    // Alchemical Lab Stone Worktable at (37, -375)
    const labY = getGroundHeight(37, -375);
    const labTable = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 1.8), stoneMat);
    labTable.position.set(37, labY + 0.5, -375);
    this.scene.add(labTable);
    this.collisionBoxes.push({
      minX: 35.2,
      maxX: 38.8,
      minZ: -376.0,
      maxZ: -374.0,
      minY: labY,
      maxY: labY + 1.5,
      label: 'alchemy_table',
    });

    // Courtyard of Fallen Brothers & Grandmaster Vesper Duel Arena at (0, -400)
    const courtY = getGroundHeight(0, -400);
    const courtFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(18.5, 19.5, 0.35, 16),
      stoneMat
    );
    courtFloor.position.set(0, courtY - 0.145, -400);
    courtFloor.receiveShadow = true;
    this.scene.add(courtFloor);
    this.colliderMeshes.push(courtFloor);

    // Memorial Swords of Fallen Ashen Brothers around the Courtyard perimeter
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      if (Math.abs(Math.cos(a)) < 0.3) continue; // Keep North & South entrances clear
      const sx = Math.cos(a) * 14.5;
      const sz = -400 + Math.sin(a) * 14.5;
      const sy = getGroundHeight(sx, sz);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 0.06), steelMat);
      blade.position.set(sx, sy + 1.0, sz);
      blade.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.12;
      const crossguard = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.1, 0.12),
        steelMat
      );
      crossguard.position.set(0, 0.65, 0);
      blade.add(crossguard);
      this.scene.add(blade);
    }

    // =========================================================================
    // BIOME 4: ECLIPSE CRATER & VOID THRONE HALL ("Кратер Затмения и Зал Трона Пустоты", z in [-550, -435])
    // =========================================================================
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.22,
      metalness: 0.75,
    });
    const crimsonEnergyMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      emissive: 0xbe123c,
      emissiveIntensity: 2.1,
      roughness: 0.2,
    });
    const pureEnergyBridgeMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 2.4,
      transparent: true,
      opacity: 0.86,
      roughness: 0.15,
    });

    // Transition 4: Underground Obsidian Gates at z = -436
    for (const side of [-1, 1]) {
      const ox = side * 8.0;
      const oz = -436;
      const oy = getGroundHeight(ox, oz);
      const obelisk = new THREE.Mesh(
        new THREE.ConeGeometry(2.4, 12.0, 5),
        obsidianMat
      );
      obelisk.position.set(ox, oy + 6.0, oz);
      this.scene.add(obelisk);
      this.obstacles.push({ x: ox, z: oz, radius: 2.3, height: 12 });
    }

    // 4A. Crimson Void Energy & Lava Rivers flanking the Causeway and Crater Floor
    for (const side of [-1, 1]) {
      const riverStream = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 82),
        crimsonEnergyMat
      );
      riverStream.rotateX(-Math.PI / 2);
      riverStream.position.set(
        side * 10.5,
        getGroundHeight(side * 10.5, -482) + 0.15,
        -482
      );
      this.scene.add(riverStream);
    }

    // 4B. Walkable Bridges of Pure Crimson Energy connecting to West (-42, -478) & East (+42, -478) Obsidian Islands
    for (const side of [-1, 1]) {
      const bridgeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(24, 0.26, 4.2),
        pureEnergyBridgeMat
      );
      const bx = side * 20;
      const by = getGroundHeight(bx, -478);
      bridgeMesh.position.set(bx, by - 0.1, -478);
      this.scene.add(bridgeMesh);
      this.colliderMeshes.push(bridgeMesh);

      // Walkable Obsidian Sanctuary Island Dais at (-42, -478) and (+42, -478)
      const islandX = side * 42;
      const islandY = getGroundHeight(islandX, -478);
      const islandDais = new THREE.Mesh(
        new THREE.CylinderGeometry(11.5, 9.0, 2.2, 8),
        obsidianMat
      );
      islandDais.position.set(islandX, islandY - 1.07, -478);
      this.scene.add(islandDais);
      this.colliderMeshes.push(islandDais);

      // Ruined Precursor Altar on each Obsidian Island
      const ruinedAltar = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.5, 1.4),
        obsidianMat
      );
      ruinedAltar.position.set(islandX + side * 4, islandY + 0.75, -478);
      const brokenRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.6, 0.14, 6, 16, Math.PI * 1.4),
        crimsonEnergyMat
      );
      brokenRing.position.set(islandX + side * 4, islandY + 2.2, -478);
      this.scene.add(ruinedAltar, brokenRing);
    }

    // 4C. 18 Floating Obsidian Islands & Shards suspended in mid-air above the Eclipse Crater
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const radius = 22 + (i % 4) * 11;
      const fx = Math.cos(angle) * radius;
      const fz = -492 + Math.sin(angle) * 34;
      const baseY = getGroundHeight(fx, fz) + 5.8 + (i % 4) * 2.5;
      const shard = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.6 + (i % 3) * 0.75, 0),
        obsidianMat
      );
      shard.scale.set(1.3, 0.75, 1.3);
      shard.position.set(fx, baseY, fz);
      this.scene.add(shard);
      this.floatingCraterRocks.push({
        mesh: shard,
        baseY,
        phase: i * 0.75,
      });
    }

    // 4D. Giant Void Throne Boss Arena at (0, -505) & Final Eclipse Altar at (0, -518)
    const throneY = getGroundHeight(0, -505);
    const voidDais = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 22, 0.6, 16),
      obsidianMat
    );
    voidDais.position.set(0, throneY - 0.27, -505);
    this.scene.add(voidDais);
    this.colliderMeshes.push(voidDais);

    // Ring of 8 Obsidian Runic Monoliths flanking the Boss Arena
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (Math.abs(Math.cos(a)) < 0.35) continue; // Keep North-South causeway open
      const mx = Math.cos(a) * 18.5;
      const mz = -505 + Math.sin(a) * 18.5;
      const my = getGroundHeight(mx, mz);
      const monolith = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 6.8, 1.5),
        obsidianMat
      );
      monolith.position.set(mx, my + 3.4, mz);
      const runeVein = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 5.2, 1.56),
        crimsonEnergyMat
      );
      monolith.add(runeVein);
      this.scene.add(monolith);
      this.obstacles.push({ x: mx, z: mz, radius: 1.4, height: 6.8 });
    }

    // Monolithic Obsidian Spire behind the Eclipse Altar at (0, -525)
    const spireY = getGroundHeight(0, -525);
    const voidSpire = new THREE.Mesh(
      new THREE.ConeGeometry(4.2, 18.0, 6),
      obsidianMat
    );
    voidSpire.position.set(0, spireY + 9.0, -525);
    this.scene.add(voidSpire);
    this.obstacles.push({ x: 0, z: -525, radius: 4.0, height: 18 });
  }

  private buildSunkenPortSolheim(): void {
    // BIOME 5: SUNKEN PORT SOLHEIM & ABYSSAL LIGHTHOUSE ("Затонувший Порт Сольхейм и Маяк Бездны", x in [-205, -105], z in [-95, 95])
    const stoneMat = this.assetManager.getMaterial('stone');
    const woodMat = this.assetManager.getMaterial('wood');
    const steelMat = this.assetManager.getMaterial('steel');
    const beaconGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.4,
      roughness: 0.15,
    });

    // 1. Stone Harbor Causeway & Timber Piers extending from x = -115 to x = -175
    for (let x = -114; x >= -168; x -= 6.0) {
      const py = getGroundHeight(x, 0);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.45, 7.2), stoneMat);
      slab.position.set(x, py - 0.195, 0);
      slab.receiveShadow = true;
      this.scene.add(slab);
      this.colliderMeshes.push(slab);
    }

    // North & South Wooden Harbor Docks at (-148, 22) and (-148, -22)
    for (const sideZ of [-22, 22]) {
      for (let x = -132; x >= -164; x -= 4.5) {
        const dy = getGroundHeight(x, sideZ);
        const dock = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.28, 4.6), woodMat);
        dock.position.set(x, Math.max(-1.1, dy + 0.35), sideZ);
        this.scene.add(dock);
      }
    }

    // 2. Half-Sunken Merchant Guild Houses & Harbor Warehouses
    this.createMedievalHouse(-126, -14, Math.PI / 6, 7.2, 8.8, 4.4);
    this.createMedievalHouse(-128, 16, -Math.PI / 5, 6.8, 8.2, 4.0);
    this.createMedievalHouse(-142, -26, Math.PI / 4, 7.5, 9.2, 3.8);
    this.createMedievalHouse(-140, 28, -Math.PI / 4, 6.5, 7.8, 3.6);
    this.createStiltHut(-152, 34, 0.4);
    this.createStiltHut(-154, -36, -0.5);

    // 3. Shipwrecked Galleons jutting out of the surf at (-166, 26) and (-162, -32)
    for (const [sx, sz, rotZ, rotY] of [
      [-166, 26, 0.28, 0.45],
      [-162, -32, -0.32, -0.55],
    ] as [number, number, number, number][]) {
      const sy = getGroundHeight(sx, sz);
      const shipGroup = new THREE.Group();
      shipGroup.position.set(sx, sy + 0.2, sz);
      shipGroup.rotation.set(0.15, rotY, rotZ);

      const hull = new THREE.Mesh(new THREE.BoxGeometry(11.5, 3.2, 4.2), woodMat);
      hull.position.y = 1.4;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 9.5, 8), woodMat);
      mast.position.set(0, 5.8, 0);
      const yardarm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 5.2), woodMat);
      yardarm.position.set(0, 7.8, 0);
      shipGroup.add(hull, mast, yardarm);
      this.scene.add(shipGroup);
      this.obstacles.push({ x: sx, z: sz, radius: 4.5, height: 8 });
    }

    // 4. Colossal Lighthouse of the Abyss ("Маяк Бездны Сольхейма") at (-172, -18)
    const lx = -172;
    const lz = -18;
    const ly = getGroundHeight(lx, lz);
    const lhBase = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.8, 4.0, 12), stoneMat);
    lhBase.position.set(lx, ly + 2.0, lz);
    const lhShaft = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.4, 12.0, 12), stoneMat);
    lhShaft.position.set(lx, ly + 10.0, lz);
    lhShaft.castShadow = true;
    const lhGallery = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.6, 12), steelMat);
    lhGallery.position.set(lx, ly + 16.2, lz);
    const lhLantern = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.8, 10), beaconGlowMat);
    lhLantern.position.set(lx, ly + 17.8, lz);
    const lhDome = new THREE.Mesh(new THREE.ConeGeometry(3.1, 2.6, 12), steelMat);
    lhDome.position.set(lx, ly + 20.4, lz);
    this.scene.add(lhBase, lhShaft, lhGallery, lhLantern, lhDome);
    this.obstacles.push({ x: lx, z: lz, radius: 5.2, height: 21 });

    // Rotating Lighthouse Light Beam Group
    this.lighthouseBeamMesh = new THREE.Group();
    this.lighthouseBeamMesh.position.set(lx, ly + 17.8, lz);
    const beamConeGeo = new THREE.ConeGeometry(3.2, 26, 12, 1, true);
    beamConeGeo.rotateX(Math.PI / 2);
    beamConeGeo.translate(0, 0, 13);
    const beamConeMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beamCone = new THREE.Mesh(beamConeGeo, beamConeMat);
    this.lighthouseBeamMesh.add(beamCone);
    this.scene.add(this.lighthouseBeamMesh);

    // 5. Siren Queen's Tidal Boss Arena Dais at (-158, 0)
    const arenaY = getGroundHeight(-158, 0);
    const sirenDais = new THREE.Mesh(new THREE.CylinderGeometry(14, 15.5, 0.5, 16), stoneMat);
    sirenDais.position.set(-158, arenaY - 0.22, 0);
    this.scene.add(sirenDais);
    this.colliderMeshes.push(sirenDais);
  }

  private buildSunMonastery(): void {
    // BIOME 6: AZURE MONASTERY OF SOLAR VOWS ("Лазурный Монастырь Солнечных Клятв", x in [105, 205], z in [-85, 75])
    const stoneMat = this.assetManager.getMaterial('stone');
    const azureRoofMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.25,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.85,
      roughness: 0.22,
      metalness: 0.85,
    });

    // 1. Grand Ascending Mountain Stairway & Colonnade from x = 106 to x = 136 (z = -15)
    for (let x = 106; x <= 136; x += 4.5) {
      const sy = getGroundHeight(x, -15);
      const step = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 7.6), stoneMat);
      step.position.set(x, sy - 0.195, -15);
      step.receiveShadow = true;
      this.scene.add(step);
      this.colliderMeshes.push(step);

      for (const sideZ of [-4.2, 4.2]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 5.2, 8), stoneMat);
        col.position.set(x, sy + 2.6, -15 + sideZ);
        this.scene.add(col);
      }
    }

    // 2. Central Solar Cloister Courtyard Dais at (160, -15)
    const courtY = getGroundHeight(160, -15);
    const courtDais = new THREE.Mesh(new THREE.CylinderGeometry(18, 19.5, 0.5, 16), stoneMat);
    courtDais.position.set(160, courtY - 0.22, -15);
    courtDais.receiveShadow = true;
    this.scene.add(courtDais);
    this.colliderMeshes.push(courtDais);

    // Ring of 10 Marble & Azure Cloister Columns around the Solar Courtyard
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      if (Math.cos(a) < -0.75) continue; // Keep West entrance open
      const cx = 160 + Math.cos(a) * 16.8;
      const cz = -15 + Math.sin(a) * 16.8;
      const cy = getGroundHeight(cx, cz);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 7.4, 10), stoneMat);
      pillar.position.set(cx, cy + 3.7, cz);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.8, 8), azureRoofMat);
      cap.position.set(cx, cy + 8.3, cz);
      this.scene.add(pillar, cap);
      this.obstacles.push({ x: cx, z: cz, radius: 1.2, height: 8.5 });
    }

    // 3. Northern Scriptorium Hall at (152, -38) & Southern Belfry Sanctuary at (152, 8)
    this.createMedievalHouse(152, -38, 0, 8.8, 10.5, 5.2);
    this.createMedievalHouse(152, 8, Math.PI, 8.4, 9.8, 5.0);

    // 4. Grand Astronomical Observatory Dome at (182, -15)
    const obsY = getGroundHeight(182, -15);
    const obsRotunda = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 7.4, 7.5, 16), stoneMat);
    obsRotunda.position.set(182, obsY + 3.75, -15);
    const obsDome = new THREE.Mesh(
      new THREE.SphereGeometry(6.9, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      azureRoofMat
    );
    obsDome.position.set(182, obsY + 7.5, -15);
    const obsFinial = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), goldMat);
    obsFinial.position.set(182, obsY + 15.2, -15);
    this.scene.add(obsRotunda, obsDome, obsFinial);
    this.obstacles.push({ x: 182, z: -15, radius: 7.4, height: 15 });

    // 5. Rotating Golden Celestial Astrolabe suspended over the Solar Courtyard at (160, -15)
    this.monasteryAstrolabeMesh = new THREE.Group();
    this.monasteryAstrolabeMesh.position.set(160, courtY + 6.8, -15);
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.16, 8, 24), goldMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.14, 8, 24), goldMat);
    ring2.rotation.x = Math.PI / 3;
    const coreSun = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 12), goldMat);
    this.monasteryAstrolabeMesh.add(ring1, ring2, coreSun);
    this.scene.add(this.monasteryAstrolabeMesh);
  }

  private buildStarfallValleyAndForge(): void {
    // BIOME 7 (ACT III): STARFALL VALLEY & FORGE OF THE PRECURSORS ("Долина Звёздного Пепла и Кузница Предтеч", z in [-705, -550])
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.2,
      metalness: 0.78,
    });
    const astralCyanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 2.3,
      roughness: 0.15,
    });
    const starGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 2.0,
      roughness: 0.2,
      metalness: 0.85,
    });

    // 1. Astral Causeway extending North from the Eclipse Spire (z = -534 to z = -615)
    for (let z = -536; z >= -614; z -= 6.5) {
      const cy = getGroundHeight(0, z);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.4, 5.8), obsidianMat);
      slab.position.set(0, cy - 0.17, z);
      const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.46, 5.8), astralCyanMat);
      trimL.position.set(-4.0, cy - 0.15, z);
      const trimR = trimL.clone();
      trimR.position.x = 4.0;
      this.scene.add(slab, trimL, trimR);
      this.colliderMeshes.push(slab);
    }

    // 2. Fallen Meteorite Craters & Crystalline Star-Pillars across the Valley (z in [-565, -675])
    const starPillarCoords: [number, number, number][] = [
      [-24, -575, 7.5],
      [24, -575, 7.5],
      [-38, -598, 9.2],
      [38, -598, 9.2],
      [-32, -622, 8.4],
      [32, -622, 8.4],
      [-44, -648, 10.5],
      [44, -648, 10.5],
      [-28, -672, 8.8],
      [28, -672, 8.8],
    ];
    for (let i = 0; i < starPillarCoords.length; i++) {
      const [px, pz, h] = starPillarCoords[i];
      const py = getGroundHeight(px, pz);
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, h, 6),
        i % 2 === 0 ? astralCyanMat : starGoldMat
      );
      crystal.position.set(px, py + h * 0.5, pz);
      crystal.rotation.z = ((i % 3) - 1) * 0.14;
      this.scene.add(crystal);
      this.obstacles.push({ x: px, z: pz, radius: 1.9, height: h });
    }

    // 3. Grand Megalithic Forge of the Precursors ("Звёздная Кузница Предтеч") at (0, -640) & Anvil at (0, -655)
    const forgeY = getGroundHeight(0, -640);
    const forgeDais = new THREE.Mesh(
      new THREE.CylinderGeometry(23, 25, 0.7, 16),
      obsidianMat
    );
    forgeDais.position.set(0, forgeY - 0.32, -640);
    this.scene.add(forgeDais);
    this.colliderMeshes.push(forgeDais);

    // 6 Towering Precursor Forge Pylons around the Archon Boss Arena
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      if (Math.abs(Math.cos(a)) < 0.35 && Math.sin(a) > 0) continue; // Keep South entrance open
      const mx = Math.cos(a) * 21.5;
      const mz = -640 + Math.sin(a) * 21.5;
      const my = getGroundHeight(mx, mz);
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11.5, 2.4), obsidianMat);
      pylon.position.set(mx, my + 5.75, mz);
      const coreStrip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 9.5, 2.5), starGoldMat);
      pylon.add(coreStrip);
      this.scene.add(pylon);
      this.obstacles.push({ x: mx, z: mz, radius: 2.2, height: 11.5 });
    }

    // 4. Rotating Star Core Dynamo above the Precursor Anvil at (0, -655)
    const anvilY = getGroundHeight(0, -655);
    this.starfallCoreMesh = new THREE.Group();
    this.starfallCoreMesh.position.set(0, anvilY + 7.5, -655);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.22, 8, 28), starGoldMat);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.18, 8, 24), astralCyanMat);
    innerRing.rotation.x = Math.PI / 2;
    const starHeart = new THREE.Mesh(new THREE.OctahedronGeometry(1.35, 1), astralCyanMat);
    this.starfallCoreMesh.add(outerRing, innerRing, starHeart);
    this.scene.add(this.starfallCoreMesh);
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

  private buildSettlementFencesAndGates(): void {
    const woodMat = this.assetManager.getMaterial('wood');
    const stoneMat = this.assetManager.getMaterial('stone');
    const steelMat = this.assetManager.getMaterial('steel');
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 2.2,
      roughness: 0.25,
    });

    const shortestAngleDiff = (a: number, b: number): number => {
      let diff = ((a - b + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (diff < -Math.PI) diff += Math.PI * 2;
      return diff;
    };

    for (const zone of SETTLEMENT_ZONES) {
      const circumference = 2 * Math.PI * zone.fenceRadius;
      const stepDist = 2.1;
      const numSegments = Math.max(18, Math.round(circumference / stepDist));
      const gateHalfAngle = (zone.gateWidth * 0.5) / zone.fenceRadius;

      // 1. Build Wooden Palisade / Fence Segments around the settlement perimeter
      for (let i = 0; i < numSegments; i++) {
        const angle = (i / numSegments) * Math.PI * 2;
        const inGate = zone.gateAngles.some(
          (ga) => Math.abs(shortestAngleDiff(angle, ga)) < gateHalfAngle
        );
        if (inGate) continue;

        const px = zone.x + Math.cos(angle) * zone.fenceRadius;
        const pz = zone.z + Math.sin(angle) * zone.fenceRadius;
        const py = getGroundHeight(px, pz);

        const segGroup = new THREE.Group();
        segGroup.position.set(px, py, pz);
        // Align local Z along the tangent of the perimeter circle
        segGroup.rotation.y = -angle;

        // Main vertical timber post
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.22, 2.35, 6),
          woodMat
        );
        post.position.y = 1.17;
        post.castShadow = true;
        post.receiveShadow = true;

        // Sharpened palisade stake tip
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 6), woodMat);
        tip.position.y = 2.55;
        tip.castShadow = true;

        // Upper & lower horizontal fence rails
        const railUpper = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.2, stepDist + 0.25),
          woodMat
        );
        railUpper.position.y = 1.65;
        railUpper.castShadow = true;
        railUpper.receiveShadow = true;

        const railLower = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.2, stepDist + 0.25),
          woodMat
        );
        railLower.position.y = 0.85;
        railLower.castShadow = true;
        railLower.receiveShadow = true;

        // Intermediate wooden palisade plank
        const midPlank = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 2.05, 0.32),
          woodMat
        );
        midPlank.position.set(0, 1.05, stepDist * 0.48);
        midPlank.castShadow = true;
        midPlank.receiveShadow = true;

        segGroup.add(post, tip, railUpper, railLower, midPlank);
        this.scene.add(segGroup);

        // Register physical obstacle so player cannot walk through the fence (must use gates)
        this.obstacles.push({
          x: px,
          z: pz,
          radius: 0.96,
          height: 2.75,
        });
      }

      // 2. Build Wooden Archway Gates ("Ворота") at each gate opening
      for (const gateAngle of zone.gateAngles) {
        const radX = Math.cos(gateAngle);
        const radZ = Math.sin(gateAngle);
        const tanX = -Math.sin(gateAngle);
        const tanZ = Math.cos(gateAngle);

        const gx = zone.x + radX * zone.fenceRadius;
        const gz = zone.z + radZ * zone.fenceRadius;
        const gy = getGroundHeight(gx, gz);

        const halfSpan = Math.max(2.2, zone.gateWidth * 0.5 - 0.45);
        const leftX = gx - tanX * halfSpan;
        const leftZ = gz - tanZ * halfSpan;
        const rightX = gx + tanX * halfSpan;
        const rightZ = gz + tanZ * halfSpan;

        // Register collision only on the left & right gate pillars, leaving the center gate passage open
        this.obstacles.push(
          { x: leftX, z: leftZ, radius: 0.72, height: 4.5 },
          { x: rightX, z: rightZ, radius: 0.72, height: 4.5 }
        );

        const gateGroup = new THREE.Group();
        gateGroup.position.set(gx, gy, gz);
        gateGroup.rotation.y = -gateAngle;

        for (const side of [-1, 1]) {
          const zOff = side * halfSpan;
          // Stone plinth base
          const plinth = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 0.85, 0.95),
            stoneMat
          );
          plinth.position.set(0, 0.42, zOff);
          plinth.castShadow = true;
          plinth.receiveShadow = true;

          // Heavy timber gate pillar
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.38, 4.2, 8),
            woodMat
          );
          pillar.position.set(0, 2.1, zOff);
          pillar.castShadow = true;
          pillar.receiveShadow = true;

          // Swung-open wooden gate door leaf (angled outward so player can walk freely)
          const doorLeaf = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 2.65, halfSpan * 0.78),
            woodMat
          );
          doorLeaf.position.set(0.85, 1.4, zOff - side * 0.48);
          doorLeaf.rotation.y = side * 1.12;
          doorLeaf.castShadow = true;
          doorLeaf.receiveShadow = true;

          // Gate torch sconce & flame
          const bracket = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 0.12, 0.12),
            steelMat
          );
          bracket.position.set(0.36, 2.75, zOff);
          const flame = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.22, 1),
            flameMat
          );
          flame.position.set(0.5, 2.95, zOff);

          gateGroup.add(plinth, pillar, doorLeaf, bracket, flame);
        }

        // Overhead archway crossbeam & pitched gate lintel roof
        const lintelBeam = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.48, halfSpan * 2 + 1.4),
          woodMat
        );
        lintelBeam.position.set(0, 4.05, 0);
        lintelBeam.castShadow = true;
        lintelBeam.receiveShadow = true;

        const gateRoof = new THREE.Mesh(
          new THREE.BoxGeometry(1.35, 0.35, halfSpan * 2 + 1.9),
          stoneMat
        );
        gateRoof.position.set(0, 4.42, 0);
        gateRoof.castShadow = true;
        gateRoof.receiveShadow = true;

        gateGroup.add(lintelBeam, gateRoof);
        this.scene.add(gateGroup);

        // Register a dynamic world light anchor at each village gate so gate torches cast real shadows
        this.worldLightAnchors.push({
          x: gx + radX * 0.6,
          y: gy + 3.1,
          z: gz + radZ * 0.6,
          color: 0xf97316,
          baseIntensity: 6.0,
          distance: 23,
        });
      }
    }
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
    this.shadowsEnabled = settings.shadows;
    if (this.isHeadless) return;
    const scale =
      settings.quality === 'low' ? 0.75 : settings.quality === 'medium' ? 1.0 : 1.25;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio * scale * settings.resolutionScale, 2)
    );
    this.renderer.shadowMap.enabled = settings.shadows;
    this.sunLight.castShadow = settings.shadows;
    for (const pt of this.torchLights) {
      pt.castShadow = settings.shadows;
    }
    if (!settings.weatherEffects) {
      if (this.rainSystem) this.rainSystem.visible = false;
      if (this.rainSplashSystem) this.rainSplashSystem.visible = false;
      if (this.mistSystem) this.mistSystem.visible = false;
    }
  }

  public update(dt: number, elapsed: number, playerX: number, playerZ: number): void {
    // Advance Day/Night cycle smoothly (full 24h cycle in ~8 minutes of real gameplay, or controllable via Meditation/Settings)
    this.timeOfDay = (this.timeOfDay + dt * 0.055) % 24;

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

    // Calculate Sun / Moon angle and atmospheric color across 24h cycle
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunElev = Math.sin(sunAngle); // +1 at 12:00 Noon, -1 at 00:00 Midnight
    const sunHoriz = Math.cos(sunAngle);

    // Position DirectionalLight (acts as Sun during day and Moon at night)
    const isNight = sunElev < -0.05;
    const lightDirX = isNight ? -sunHoriz : sunHoriz;
    const lightElev = Math.max(0.22, Math.abs(sunElev));

    this.sunLight.position.set(
      playerX + lightDirX * 60,
      lightElev * 68 + 14,
      playerZ + 32
    );
    this.sunLight.target.position.set(playerX, 0, playerZ);
    this.sunLight.target.updateMatrixWorld();

    // Update Celestial Sun/Moon Orb in the sky
    if (this.celestialOrb) {
      this.celestialOrb.position.set(
        playerX + lightDirX * 115,
        Math.max(16, Math.abs(sunElev) * 92 + 12),
        playerZ - 75
      );
      const orbMat = this.celestialOrb.material as THREE.MeshBasicMaterial;
      if (isNight) {
        orbMat.color.setHex(0xcbd5e1); // Pale silver full moon
        this.celestialOrb.scale.setScalar(0.85);
      } else if (sunElev < 0.28) {
        orbMat.color.setHex(0xf97316); // Fiery dawn/dusk sun
        this.celestialOrb.scale.setScalar(1.25);
      } else {
        orbMat.color.setHex(0xfef08a); // Golden midday sun
        this.celestialOrb.scale.setScalar(1.0);
      }
    }

    // Base Dawn / Day / Dusk / Night sky color, sun color, and light intensities
    let baseSunIntensity = 2.25;
    let baseHemiIntensity = 1.05;
    const targetSunColor = new THREE.Color();

    if (sunElev > 0.28) {
      // Midday (08:00 - 16:00)
      _color.copy(_skyDay);
      targetSunColor.copy(_sunNoon);
      baseSunIntensity = 2.35;
      baseHemiIntensity = 1.1;
      this.hemiLight.color.setHex(0x9bb8d3);
      this.hemiLight.groundColor.setHex(0x2d2820);
    } else if (sunElev >= -0.08) {
      // Dawn (05:30 - 08:00) or Dusk (16:00 - 19:00)
      const t = (sunElev + 0.08) / 0.36; // 0 at night edge, 1 at day edge
      const isDawn = this.timeOfDay < 12;
      const horizonSky = isDawn ? _skyDawn : _skyDusk;
      const horizonSun = isDawn ? _sunDawn : _sunDusk;

      _color.copy(_skyNight).lerp(horizonSky, Math.sin(t * Math.PI)).lerp(_skyDay, t);
      targetSunColor.copy(_moonNight).lerp(horizonSun, Math.sin(t * Math.PI)).lerp(_sunNoon, t);
      baseSunIntensity = 0.85 + t * 1.5;
      baseHemiIntensity = 0.62 + t * 0.48;
      this.hemiLight.color.setHex(isDawn ? 0xd99b78 : 0xc2784e);
      this.hemiLight.groundColor.setHex(0x211b15);
    } else {
      // Night (19:00 - 05:30)
      _color.copy(_skyNight);
      targetSunColor.copy(_moonNight);
      baseSunIntensity = 0.68; // Atmospheric moonlight
      baseHemiIntensity = 0.48;
      this.hemiLight.color.setHex(0x3b5278);
      this.hemiLight.groundColor.setHex(0x111318);
    }

    this.sunLight.color.lerp(targetSunColor, Math.min(1, dt * 3.0));

    // Blend sky color with weather atmospheric tint
    const prevTint = WEATHER_PRESETS[this.previousWeather]?.skyTintHex ?? 0x3b526b;
    const targetTint = WEATHER_PRESETS[this.weather]?.skyTintHex ?? 0x3b526b;
    _weatherTint.setHex(prevTint).lerp(
      new THREE.Color(targetTint),
      this.weatherTransitionBlend
    );
    _color.lerp(_weatherTint, isNight ? 0.28 : 0.48);

    // Smoothly blend biome-specific fog & sky atmosphere across all 12 biomes
    let targetBiomeFogHex = 0x1e242b;
    let mistParticleHex = 0x94a3b8;
    if (playerZ <= -550) {
      targetBiomeFogHex = 0x0c192c;
      mistParticleHex = 0x38bdf8;
    } else if (playerZ <= -435) {
      targetBiomeFogHex = 0x260b16;
      mistParticleHex = 0xf43f5e;
    } else if (playerZ <= -325) {
      targetBiomeFogHex = 0x271e17;
      mistParticleHex = 0xf59e0b;
    } else if (playerZ <= -215) {
      targetBiomeFogHex = 0x1e2f42;
      mistParticleHex = 0xe0f2fe;
    } else if (playerZ <= -105) {
      targetBiomeFogHex = 0x11281d;
      mistParticleHex = 0x4ade80;
    } else if (playerX < -105) {
      targetBiomeFogHex = 0x0f2937;
      mistParticleHex = 0x2dd4bf;
    } else if (playerX > 105) {
      targetBiomeFogHex = 0x1e293b;
      mistParticleHex = 0xfef08a;
    }
    this.biomeFogTint.lerp(new THREE.Color(targetBiomeFogHex), Math.min(1, dt * 1.8));
    if (playerZ <= -105 || Math.abs(playerX) > 105) {
      _color.lerp(this.biomeFogTint, 0.62);
    }

    if (this.lightningFlash > 0) {
      _color.lerp(new THREE.Color(0xc7d2fe), this.lightningFlash * 0.45);
    }

    this.sunLight.intensity =
      baseSunIntensity * wMetrics.sunIntensityMultiplier + this.lightningFlash * 2.2;
    this.hemiLight.intensity =
      baseHemiIntensity * wMetrics.hemiIntensityMultiplier + this.lightningFlash * 0.9;

    // Update Dynamic World Light Sources (Torches, Campfires, Braziers, Sanctuary Altar)
    // Light sources shine brighter at Dusk/Night and during gloomy Fog/Rain weather
    if (this.torchLights.length > 0 && this.worldLightAnchors.length > 0) {
      const darknessBoost = sunElev < 0.15 ? 1.45 + Math.max(0, -sunElev) * 0.65 : 0.72;
      const weatherBoost = this.weather === 'rain' ? 1.2 : this.weather === 'fog' ? 1.12 : 1.0;

      // Sort anchors by squared distance to player and bind the closest 4 to the pooled PointLights
      const sorted = [...this.worldLightAnchors].sort(
        (a, b) =>
          (a.x - playerX) * (a.x - playerX) +
          (a.z - playerZ) * (a.z - playerZ) -
          ((b.x - playerX) * (b.x - playerX) + (b.z - playerZ) * (b.z - playerZ))
      );

      for (let i = 0; i < this.torchLights.length; i++) {
        const pt = this.torchLights[i];
        const anchor = sorted[i];
        if (!anchor) {
          pt.intensity = 0;
          continue;
        }
        pt.position.set(anchor.x, anchor.y, anchor.z);
        pt.color.setHex(anchor.color);
        pt.distance = anchor.distance * (sunElev < 0 ? 1.25 : 1.0);
        const flicker =
          1.0 +
          Math.sin(elapsed * 11.5 + i * 2.1) * 0.12 +
          Math.cos(elapsed * 19.3 + i * 3.7) * 0.07;
        pt.intensity = anchor.baseIntensity * darknessBoost * weatherBoost * flicker;
      }
    }

    this.scene.background = _color;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_color);
      this.scene.fog.density = playerZ <= -105 ? Math.max(wMetrics.fogDensity, 0.015) : wMetrics.fogDensity;
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

    // Rotate Crow Hollow Windmill Sails, Solheim Lighthouse Beacon, Sun Monastery Astrolabe & Starfall Core
    if (this.windmillSailsMesh) {
      this.windmillSailsMesh.rotation.z = elapsed * 0.75;
    }
    if (this.lighthouseBeamMesh) {
      this.lighthouseBeamMesh.rotation.y = elapsed * 0.65;
    }
    if (this.monasteryAstrolabeMesh) {
      this.monasteryAstrolabeMesh.rotation.y = elapsed * 0.55;
      this.monasteryAstrolabeMesh.rotation.z = Math.sin(elapsed * 0.8) * 0.25;
    }
    if (this.starfallCoreMesh) {
      this.starfallCoreMesh.rotation.y = elapsed * 0.9;
      this.starfallCoreMesh.rotation.x = Math.sin(elapsed * 1.1) * 0.35;
    }

    // Animate Toxic Swamp Water Bubbles (Biome 1)
    if (playerZ < -95 && playerZ > -230) {
      for (const sb of this.swampBubbles) {
        const cycle = (elapsed * 0.9 + sb.phase) % 1.0;
        sb.mesh.position.y = sb.baseY + cycle * 0.65;
        const scale = Math.sin(cycle * Math.PI) * 1.35;
        sb.mesh.scale.setScalar(Math.max(0.05, scale));
      }
    }

    // Animate Flickering Wall Crystals in the Dead Mines (Biome 2)
    if (playerZ < -205 && playerZ > -340) {
      for (const mc of this.mineCrystals) {
        const mat = mc.mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 1.2 + Math.sin(elapsed * 3.4 + mc.phase) * 0.65;
      }
    }

    // Animate Floating Obsidian Rocks in the Eclipse Crater (Biome 4)
    if (playerZ < -390) {
      for (const fr of this.floatingCraterRocks) {
        fr.mesh.position.y = fr.baseY + Math.sin(elapsed * 1.3 + fr.phase) * 0.65;
        fr.mesh.rotation.y = elapsed * 0.35 + fr.phase;
      }
    }

    // Update Falling Rain Streaks & Ground Splashes around player
    if (this.rainSystem && this.rainVelocities) {
      const isBlizzardPass = playerZ <= -215 && playerZ > -325;
      const showRain =
        this.weatherEffectsEnabled && (wMetrics.rainIntensity > 0.02 || isBlizzardPass);
      this.rainSystem.visible = showRain;
      if (showRain) {
        const rainMat = this.rainSystem.material as THREE.PointsMaterial;
        rainMat.color.setHex(isBlizzardPass ? 0xf8fafc : 0xa5b4fc);
        rainMat.opacity = isBlizzardPass
          ? 0.55
          : wMetrics.rainIntensity * 0.62;

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
      const showMist =
        this.weatherEffectsEnabled && (wMetrics.mistIntensity > 0.05 || playerZ <= -105);
      this.mistSystem.visible = showMist;
      if (showMist) {
        const mistMat = this.mistSystem.material as THREE.PointsMaterial;
        mistMat.color.setHex(mistParticleHex);
        mistMat.opacity =
          playerZ <= -105
            ? Math.max(0.32, wMetrics.mistIntensity * 0.42)
            : wMetrics.mistIntensity * 0.36;
        const posAttr = this.mistSystem.geometry.attributes.position as THREE.BufferAttribute;
        const driftSpeed = (0.4 + wMetrics.windStrength * 1.1) * dt;

        for (let i = 0; i < this.mistPhases.length; i++) {
          const phase = this.mistPhases[i];
          let mx = posAttr.getX(i) + Math.cos(elapsed * 0.3 + phase) * driftSpeed;
          let mz = posAttr.getZ(i) + Math.sin(elapsed * 0.25 + phase) * driftSpeed;

          if (Math.abs(mx - playerX) > 36 || Math.abs(rzDist(mz, playerZ)) > 36) {
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

    // Advance Wind Uniforms for custom vertex shaders (Trees, Grass, Water)
    this.windTimeUniform.value += dt;
    this.windStrengthUniform.value = wMetrics.windStrength;

    // Animate Rising Sparks & Embers from campfires and torches
    if (this.embersSystem && this.emberVelocities) {
      const posAttr = this.embersSystem.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.emberVelocities.length; i++) {
        let ey = posAttr.getY(i) + this.emberVelocities[i] * dt;
        let ex = posAttr.getX(i) + Math.sin(elapsed * 2.5 + i) * 0.012;
        let ez = posAttr.getZ(i) + Math.cos(elapsed * 2.2 + i) * 0.012;
        // Loop back down near anchor flame
        if (ey > 7.5) {
          ey = 1.2 + (i % 5) * 0.4;
        }
        posAttr.setXYZ(i, ex, ey, ez);
      }
      posAttr.needsUpdate = true;
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

function rzDist(a: number, b: number): number {
  return a - b;
}
