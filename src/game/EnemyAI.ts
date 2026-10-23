import * as THREE from 'three';
import type { AssetManager, CharacterRig } from './AssetManager';
import { getGroundHeight, resolveSlidingCollision } from './rules';
import type { CollisionCylinder } from './SceneManager';
import type { CollisionBox, EnemyData, EnemyType } from './types';

export interface ActiveEnemy {
  data: EnemyData;
  rig: CharacterRig;
  hpBarGroup: THREE.Group;
  hpFillMesh: THREE.Mesh;
  patrolAngle: number;
  attackTimer: number;
  attackWindupTimer: number;
  attackWindupDuration: number;
  hitFlashTimer: number;
  animTime: number;
  // Special behavior state
  flurryRemaining: number;
  flurryTickTimer: number;
  teleportCooldown: number;
  aoeTelegraphGroup?: THREE.Group;
  aoeCenterX: number;
  aoeCenterZ: number;
  aoeRadius: number;
}

interface EnemyProjectile {
  mesh: THREE.Group;
  owner: EnemyData;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  life: number;
}

export class EnemyAI {
  public enemies: ActiveEnemy[] = [];
  private projectiles: EnemyProjectile[] = [];
  private scene: THREE.Scene;
  private assetManager: AssetManager;

  constructor(scene: THREE.Scene, assetManager: AssetManager) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.spawnInitialEnemies();
  }

  public spawnInitialEnemies(): void {
    // Clean up existing enemies & telegraphs
    for (const e of this.enemies) {
      this.scene.remove(e.rig.root);
      if (e.aoeTelegraphGroup) {
        this.scene.remove(e.aoeTelegraphGroup);
      }
    }
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
    }
    this.enemies = [];
    this.projectiles = [];

    // =========================================================================
    // 1. ВОЛКИ (Лес и окраины) — быстрые, низкие, атакуют стаей по 2-3 особи, делают рывок при атаке
    // =========================================================================
    // Стайка №1: Окраины деревни и Забытых земель (3 особи)
    this.createEnemy({
      id: 'wolf_outskirts_1',
      type: 'wolf',
      name: 'Степной волк',
      level: 1,
      hp: 65,
      damage: 11,
      speed: 5.9,
      detectRadius: 17,
      attackRadius: 3.3,
      spawnX: 25,
      spawnZ: -16,
      xpReward: 30,
      goldReward: 14,
      lootTable: ['wolf_pelt'],
      packId: 'pack_outskirts',
    });

    this.createEnemy({
      id: 'wolf_outskirts_2',
      type: 'wolf',
      name: 'Молодой волк',
      level: 1,
      hp: 60,
      damage: 10,
      speed: 6.1,
      detectRadius: 17,
      attackRadius: 3.3,
      spawnX: 29,
      spawnZ: -19,
      xpReward: 28,
      goldReward: 12,
      lootTable: ['wolf_pelt', 'herb_swallow'],
      packId: 'pack_outskirts',
    });

    this.createEnemy({
      id: 'wolf_outskirts_alpha',
      type: 'wolf',
      name: 'Матёрый волк окраин',
      level: 2,
      hp: 85,
      damage: 14,
      speed: 6.2,
      detectRadius: 18,
      attackRadius: 3.5,
      spawnX: 27,
      spawnZ: -22,
      xpReward: 40,
      goldReward: 20,
      lootTable: ['wolf_pelt', 'monster_claw'],
      packId: 'pack_outskirts',
    });

    // Стайка №2: Чаща Старого леса (3 особи)
    this.createEnemy({
      id: 'wolf_1',
      type: 'wolf',
      name: 'Лесной волк',
      level: 1,
      hp: 70,
      damage: 12,
      speed: 6.0,
      detectRadius: 18,
      attackRadius: 3.4,
      spawnX: -44,
      spawnZ: -10,
      xpReward: 32,
      goldReward: 15,
      lootTable: ['wolf_pelt'],
      packId: 'pack_forest',
    });

    this.createEnemy({
      id: 'wolf_2',
      type: 'wolf',
      name: 'Вожак лесной стаи',
      level: 2,
      hp: 95,
      damage: 16,
      speed: 6.3,
      detectRadius: 19,
      attackRadius: 3.6,
      spawnX: -48,
      spawnZ: -14,
      xpReward: 48,
      goldReward: 24,
      lootTable: ['wolf_pelt', 'monster_claw'],
      packId: 'pack_forest',
    });

    this.createEnemy({
      id: 'wolf_3',
      type: 'wolf',
      name: 'Чёрный волк-охотник',
      level: 2,
      hp: 80,
      damage: 14,
      speed: 6.1,
      detectRadius: 18,
      attackRadius: 3.4,
      spawnX: -42,
      spawnZ: -15,
      xpReward: 38,
      goldReward: 18,
      lootTable: ['wolf_pelt'],
      packId: 'pack_forest',
    });

    // =========================================================================
    // 2. УПЫРИ (Место нападения в лесу) — сгорбленные гуманоиды, агрессивный ближний бой, серия быстрых ударов когтями
    // =========================================================================
    this.createEnemy({
      id: 'ghoul_clearing_1',
      type: 'ghoul',
      name: 'Лесной упырь-разведчик',
      level: 1,
      hp: 85,
      damage: 13,
      speed: 4.5,
      detectRadius: 15,
      attackRadius: 2.3,
      spawnX: -14,
      spawnZ: -20,
      xpReward: 40,
      goldReward: 20,
      lootTable: ['monster_claw', 'herb_swallow'],
    });

    this.createEnemy({
      id: 'ghoul_camp_1',
      type: 'ghoul',
      name: 'Упырь-падальщик',
      level: 1,
      hp: 95,
      damage: 15,
      speed: 4.6,
      detectRadius: 16,
      attackRadius: 2.3,
      spawnX: -32,
      spawnZ: 16,
      xpReward: 45,
      goldReward: 25,
      lootTable: ['ghoul_blood', 'monster_claw'],
      questTag: 'q1_ghouls',
    });

    this.createEnemy({
      id: 'ghoul_camp_2',
      type: 'ghoul',
      name: 'Свирепый упырь',
      level: 2,
      hp: 115,
      damage: 18,
      speed: 4.7,
      detectRadius: 16,
      attackRadius: 2.4,
      spawnX: -36,
      spawnZ: 20,
      xpReward: 55,
      goldReward: 30,
      lootTable: ['ghoul_blood', 'iron_ore'],
      questTag: 'q1_ghouls',
    });

    this.createEnemy({
      id: 'ghoul_camp_3',
      type: 'ghoul',
      name: 'Кровавый трупоед',
      level: 2,
      hp: 105,
      damage: 16,
      speed: 4.6,
      detectRadius: 16,
      attackRadius: 2.3,
      spawnX: -34,
      spawnZ: 22,
      xpReward: 50,
      goldReward: 28,
      lootTable: ['ghoul_blood', 'herb_swallow'],
      questTag: 'q1_ghouls',
    });

    // =========================================================================
    // 3. БОЛОТНАЯ ВЕДЬМА (Святилище / Болото) — держит дистанцию, стреляет магическими сгустками и телепортируется при сближении
    // =========================================================================
    this.createEnemy({
      id: 'hag_marsh_1',
      type: 'hag',
      name: 'Болотная ведунья',
      level: 3,
      hp: 150,
      damage: 20,
      speed: 3.9,
      detectRadius: 20,
      attackRadius: 11.0,
      spawnX: -48,
      spawnZ: -40,
      xpReward: 85,
      goldReward: 48,
      lootTable: ['cursed_essence', 'herb_swallow'],
    });

    this.createEnemy({
      id: 'hag_sanctuary',
      type: 'hag',
      name: 'Болотная ведьма Морана',
      level: 3,
      hp: 195,
      damage: 25,
      speed: 4.0,
      detectRadius: 22,
      attackRadius: 12.0,
      spawnX: -61,
      spawnZ: -51,
      xpReward: 115,
      goldReward: 70,
      lootTable: ['cursed_essence', 'herb_swallow', 'iron_ore'],
      questTag: 'q2_hag',
    });

    // =========================================================================
    // 4. ЛЕСНОЙ ДЕМОН (Вход в крепость) — крупный элитный враг с рогами, медленные, но мощные AoE-удары с индикацией зоны на земле
    // =========================================================================
    this.createEnemy({
      id: 'demon_fortress',
      type: 'demon',
      name: 'Лесной демон (Элитный)',
      level: 4,
      hp: 270,
      damage: 34,
      speed: 4.1,
      detectRadius: 21,
      attackRadius: 3.6,
      spawnX: 54,
      spawnZ: -50,
      xpReward: 165,
      goldReward: 100,
      lootTable: ['demon_heart', 'iron_ore'],
      questTag: 'q3_demon',
    });

    // =========================================================================
    // 5. ДРЕВНИЙ ХРАНИТЕЛЬ (Босс внутри крепости) — огромный рыцарь/голем с мечом, 2 фазы боя, полоска здоровья вверху экрана
    // =========================================================================
    this.createEnemy({
      id: 'boss_guardian',
      type: 'boss',
      name: 'Древний Хранитель Короны',
      level: 5,
      hp: 460,
      damage: 40,
      speed: 4.4,
      detectRadius: 26,
      attackRadius: 3.8,
      spawnX: 72,
      spawnZ: -68,
      xpReward: 350,
      goldReward: 260,
      lootTable: ['king_crown_shard', 'relic_blade'],
      questTag: 'q3_boss',
    });

    // =========================================================================
    // 6. СТРАЖИ КАТАКОМБ (Скелеты-стражи) И ОХРАНА СОКРОВИЩ (?)
    // =========================================================================
    this.createEnemy({
      id: 'skel_catacombs_1',
      type: 'skeleton',
      name: 'Скелет-страж Древних Королей',
      level: 3,
      hp: 135,
      damage: 21,
      speed: 4.6,
      detectRadius: 15,
      attackRadius: 2.4,
      spawnX: 99,
      spawnZ: 98,
      xpReward: 75,
      goldReward: 40,
      lootTable: ['iron_ore', 'monster_claw'],
    });
    this.createEnemy({
      id: 'skel_catacombs_2',
      type: 'skeleton',
      name: 'Королевский скелет-мечник',
      level: 3,
      hp: 150,
      damage: 23,
      speed: 4.7,
      detectRadius: 15,
      attackRadius: 2.5,
      spawnX: 111,
      spawnZ: 98,
      xpReward: 80,
      goldReward: 45,
      lootTable: ['iron_ore', 'herb_swallow'],
    });

    // =========================================================================
    // 7. АКТ II: ИСТИННЫЙ ФИНАЛЬНЫЙ БОСС — КОРОЛЬ-ЛИЧ МАЛАКОР (Пепельный Погост)
    // =========================================================================
    this.createEnemy({
      id: 'boss_malakor',
      type: 'malakor',
      name: 'Король-Лич Малакор (Владыка Проклятия)',
      level: 6,
      hp: 640,
      damage: 46,
      speed: 4.6,
      detectRadius: 28,
      attackRadius: 4.0,
      spawnX: 0,
      spawnZ: 84,
      xpReward: 600,
      goldReward: 500,
      lootTable: ['king_crown_shard', 'rune_vamp'],
      questTag: 'q4_malakor',
    });

    // =========================================================================
    // 8. ПОХОД НА СЕВЕР — БИОМ 1: ТРАКТ ВИСЕЛЬНИКОВ И ЗАТОПЛЕННЫЕ ТОПИ (z: -105..-215)
    // =========================================================================
    this.createEnemy({
      id: 'drowned_swamp_1',
      type: 'drowned',
      name: 'Болотный Утопленник',
      level: 5,
      hp: 210,
      damage: 26,
      speed: 5.1,
      detectRadius: 19,
      attackRadius: 2.5,
      spawnX: -5,
      spawnZ: -125,
      xpReward: 95,
      goldReward: 55,
      lootTable: ['ghoul_blood', 'herb_swallow'],
      questTag: 'q5_swamp_monsters',
    });
    this.createEnemy({
      id: 'drowned_swamp_2',
      type: 'drowned',
      name: 'Трясинный Удавленник',
      level: 5,
      hp: 225,
      damage: 28,
      speed: 5.2,
      detectRadius: 19,
      attackRadius: 2.5,
      spawnX: 6,
      spawnZ: -132,
      xpReward: 100,
      goldReward: 60,
      lootTable: ['ghoul_blood', 'monster_claw'],
      questTag: 'q5_swamp_monsters',
    });
    this.createEnemy({
      id: 'reaper_swamp_1',
      type: 'plague_reaper',
      name: 'Чумной Жнец Трясины',
      level: 6,
      hp: 260,
      damage: 32,
      speed: 4.4,
      detectRadius: 21,
      attackRadius: 10.5,
      spawnX: 4,
      spawnZ: -154,
      xpReward: 130,
      goldReward: 75,
      lootTable: ['cursed_essence', 'herb_swallow'],
      questTag: 'q5_swamp_monsters',
    });
    this.createEnemy({
      id: 'drowned_swamp_stilt',
      type: 'drowned',
      name: 'Вожак Утопленников Свайного Посёлка',
      level: 5,
      hp: 235,
      damage: 29,
      speed: 5.2,
      detectRadius: 20,
      attackRadius: 2.5,
      spawnX: -48,
      spawnZ: -152,
      xpReward: 110,
      goldReward: 65,
      lootTable: ['ghoul_blood', 'cursed_essence'],
    });
    this.createEnemy({
      id: 'boss_hydra',
      type: 'boss_hydra',
      name: 'Матерь Трясины (Многоголовая Гидра)',
      level: 7,
      hp: 720,
      damage: 44,
      speed: 4.5,
      detectRadius: 28,
      attackRadius: 4.2,
      spawnX: 0,
      spawnZ: -190,
      xpReward: 520,
      goldReward: 380,
      lootTable: ['hydra_heart', 'cursed_essence'],
      questTag: 'q5_hydra',
    });

    // =========================================================================
    // 9. ПОХОД НА СЕВЕР — БИОМ 2: СРЕБРОЗУБЫЙ ПЕРЕВАЛ И МЁРТВЫЕ ШАХТЫ (z: -215..-325)
    // =========================================================================
    this.createEnemy({
      id: 'trog_pass_1',
      type: 'troglodyte',
      name: 'Горный Троглодит-Рудокоп',
      level: 7,
      hp: 310,
      damage: 36,
      speed: 4.3,
      detectRadius: 20,
      attackRadius: 3.2,
      spawnX: -6,
      spawnZ: -236,
      xpReward: 150,
      goldReward: 85,
      lootTable: ['black_ore', 'iron_ore'],
      questTag: 'q6_mine_monsters',
    });
    this.createEnemy({
      id: 'wraith_pass_1',
      type: 'frost_wraith',
      name: 'Ледяной Призрак Перевала',
      level: 7,
      hp: 280,
      damage: 34,
      speed: 4.9,
      detectRadius: 22,
      attackRadius: 10.5,
      spawnX: 7,
      spawnZ: -244,
      xpReward: 155,
      goldReward: 90,
      lootTable: ['ice_lotus', 'cursed_essence'],
      questTag: 'q6_mine_monsters',
    });
    this.createEnemy({
      id: 'trog_pass_2',
      type: 'troglodyte',
      name: 'Панцирный Троглодит Штрека',
      level: 8,
      hp: 340,
      damage: 38,
      speed: 4.4,
      detectRadius: 20,
      attackRadius: 3.3,
      spawnX: -5,
      spawnZ: -268,
      xpReward: 165,
      goldReward: 95,
      lootTable: ['black_ore', 'monster_claw'],
      questTag: 'q6_mine_monsters',
    });
    this.createEnemy({
      id: 'trog_pass_east_adit',
      type: 'troglodyte',
      name: 'Матёрый Троглодит Восточной Штольни',
      level: 8,
      hp: 350,
      damage: 39,
      speed: 4.4,
      detectRadius: 20,
      attackRadius: 3.3,
      spawnX: 40,
      spawnZ: -275,
      xpReward: 175,
      goldReward: 105,
      lootTable: ['black_ore', 'ice_lotus'],
    });
    this.createEnemy({
      id: 'wraith_pass_chasm',
      type: 'frost_wraith',
      name: 'Страж Висячего Моста (Ледяной Дух)',
      level: 7,
      hp: 295,
      damage: 35,
      speed: 4.9,
      detectRadius: 22,
      attackRadius: 10.5,
      spawnX: -46,
      spawnZ: -255,
      xpReward: 165,
      goldReward: 95,
      lootTable: ['ice_lotus', 'cursed_essence'],
    });
    this.createEnemy({
      id: 'boss_colossus',
      type: 'boss_colossus',
      name: 'Кристальный Колосс Чёрной Горы',
      level: 8,
      hp: 880,
      damage: 52,
      speed: 4.1,
      detectRadius: 28,
      attackRadius: 4.4,
      spawnX: 0,
      spawnZ: -300,
      xpReward: 680,
      goldReward: 480,
      lootTable: ['black_ore', 'ice_lotus', 'rune_frost_sup'],
      questTag: 'q6_colossus',
      crystalArmorCount: 3,
    });

    // =========================================================================
    // 10. ПОХОД НА СЕВЕР — БИОМ 3: ЧЁРНЫЙ БАСТИОН БРАТСТВА ПЕПЛА (z: -325..-435)
    // =========================================================================
    this.createEnemy({
      id: 'fallen_ash_1',
      type: 'fallen_ash',
      name: 'Падший Зольник-Страж',
      level: 8,
      hp: 360,
      damage: 40,
      speed: 5.4,
      detectRadius: 21,
      attackRadius: 2.8,
      spawnX: -6,
      spawnZ: -344,
      xpReward: 195,
      goldReward: 110,
      lootTable: ['cursed_essence', 'black_ore'],
      questTag: 'q7_fallen_ash',
    });
    this.createEnemy({
      id: 'fallen_ash_2',
      type: 'fallen_ash',
      name: 'Падший Мастер Клинка Пепла',
      level: 9,
      hp: 390,
      damage: 42,
      speed: 5.6,
      detectRadius: 21,
      attackRadius: 2.8,
      spawnX: 6,
      spawnZ: -350,
      xpReward: 210,
      goldReward: 120,
      lootTable: ['cursed_essence', 'void_dust'],
      questTag: 'q7_fallen_ash',
    });
    this.createEnemy({
      id: 'fallen_ash_barracks',
      type: 'fallen_ash',
      name: 'Инструктор Фехтования Сожжённых Казарм',
      level: 9,
      hp: 405,
      damage: 44,
      speed: 5.6,
      detectRadius: 20,
      attackRadius: 2.9,
      spawnX: -32,
      spawnZ: -376,
      xpReward: 220,
      goldReward: 130,
      lootTable: ['black_ore', 'void_dust'],
    });
    this.createEnemy({
      id: 'boss_vesper',
      type: 'boss_vesper',
      name: 'Грандмастер Веспер, Предатель Пепла',
      level: 9,
      hp: 980,
      damage: 54,
      speed: 5.8,
      detectRadius: 28,
      attackRadius: 3.4,
      spawnX: 0,
      spawnZ: -400,
      xpReward: 850,
      goldReward: 620,
      lootTable: ['void_dust', 'black_ore', 'ice_lotus'],
      questTag: 'q7_vesper',
    });

    // =========================================================================
    // 11. ПОХОД НА СЕВЕР — БИОМ 4: КРАТЕР ЗАТМЕНИЯ И ЗАЛ ТРОНА ПУСТОТЫ (z: -435..-550)
    // =========================================================================
    this.createEnemy({
      id: 'void_knight_1',
      type: 'void_knight',
      name: 'Рыцарь Пустоты (Страж Разлома)',
      level: 9,
      hp: 440,
      damage: 48,
      speed: 4.8,
      detectRadius: 22,
      attackRadius: 3.6,
      spawnX: -7,
      spawnZ: -456,
      xpReward: 250,
      goldReward: 150,
      lootTable: ['void_dust', 'black_ore'],
      questTag: 'q8_void_knights',
    });
    this.createEnemy({
      id: 'void_knight_2',
      type: 'void_knight',
      name: 'Архонт Чёрного Обсидиана',
      level: 10,
      hp: 470,
      damage: 50,
      speed: 4.9,
      detectRadius: 22,
      attackRadius: 3.6,
      spawnX: 7,
      spawnZ: -464,
      xpReward: 270,
      goldReward: 165,
      lootTable: ['void_dust', 'black_ore'],
      questTag: 'q8_void_knights',
    });
    this.createEnemy({
      id: 'void_knight_island_west',
      type: 'void_knight',
      name: 'Хранитель Западного Острова Затмения',
      level: 10,
      hp: 485,
      damage: 51,
      speed: 4.9,
      detectRadius: 22,
      attackRadius: 3.6,
      spawnX: -38,
      spawnZ: -478,
      xpReward: 280,
      goldReward: 175,
      lootTable: ['void_dust', 'black_ore'],
    });
    this.createEnemy({
      id: 'boss_avatar',
      type: 'boss_avatar',
      name: 'Аватара Сердца Пустоты (Первородный Архибосс)',
      level: 10,
      hp: 1350,
      damage: 62,
      speed: 5.2,
      detectRadius: 32,
      attackRadius: 4.5,
      spawnX: 0,
      spawnZ: -505,
      xpReward: 1400,
      goldReward: 1000,
      lootTable: ['void_dust', 'king_crown_shard', 'rune_void_sup'],
      questTag: 'q8_avatar',
    });
  }

  public shatterColossusCrystal(enemyId: string): number {
    const active = this.enemies.find((e) => e.data.id === enemyId);
    if (!active || (active.data.crystalArmorCount ?? 0) <= 0) return 0;
    active.data.crystalArmorCount = Math.max(0, (active.data.crystalArmorCount ?? 0) - 1);
    const remaining = active.data.crystalArmorCount;
    const crystalMesh = active.rig.root.getObjectByName(`colossusCrystal_${remaining}`);
    if (crystalMesh) {
      crystalMesh.visible = false;
    }
    return remaining;
  }

  public spawnBountyHunterSquad(playerX: number, playerZ: number): EnemyData[] {
    const aliveHunters = this.enemies.filter(
      (e) => e.data.type === 'bounty_hunter' && e.data.state !== 'DEAD' && !e.data.isDead
    );
    if (aliveHunters.length > 0) {
      return aliveHunters.map((h) => h.data);
    }

    const stamp = Date.now();
    const h1 = this.createEnemy({
      id: `bounty_hunter_1_${stamp}`,
      type: 'bounty_hunter',
      name: 'Волкодав «Чёрной Петли» (Охотник за головами)',
      level: 4,
      hp: 195,
      damage: 25,
      speed: 5.5,
      detectRadius: 28,
      attackRadius: 3.3,
      spawnX: playerX + 11,
      spawnZ: playerZ - 9,
      xpReward: 120,
      goldReward: 85,
      lootTable: ['iron_ore', 'potion_swallow'],
      packId: `pack_bounty_${stamp}`,
    });

    const h2 = this.createEnemy({
      id: `bounty_hunter_2_${stamp}`,
      type: 'bounty_hunter',
      name: 'Наёмный Каратель Вальдмарка',
      level: 4,
      hp: 180,
      damage: 23,
      speed: 5.6,
      detectRadius: 28,
      attackRadius: 3.3,
      spawnX: playerX - 11,
      spawnZ: playerZ - 10,
      xpReward: 115,
      goldReward: 75,
      lootTable: ['iron_ore', 'oil_cursed'],
      packId: `pack_bounty_${stamp}`,
    });

    return [h1, h2];
  }

  public spawnContractBoss(contractId: string): EnemyData | null {
    const existing = this.enemies.find((e) => e.data.questTag === contractId);
    if (existing && existing.data.state !== 'DEAD') {
      return existing.data;
    }

    if (contractId === 'contract_werewolf') {
      return this.createEnemy({
        id: 'boss_contract_werewolf',
        type: 'werewolf',
        name: 'Альфа-Воколак («Вой в ночи»)',
        level: 4,
        hp: 320,
        damage: 32,
        speed: 5.5,
        detectRadius: 24,
        attackRadius: 3.4,
        spawnX: -52,
        spawnZ: 6,
        xpReward: 220,
        goldReward: 180,
        lootTable: ['trophy_werewolf', 'wolf_pelt', 'monster_claw'],
        questTag: 'contract_werewolf',
        isContractBoss: true,
      });
    }

    if (contractId === 'contract_noonwraith') {
      return this.createEnemy({
        id: 'boss_contract_noonwraith',
        type: 'noonwraith',
        name: 'Полуденница («Невеста у колодца»)',
        level: 4,
        hp: 290,
        damage: 30,
        speed: 4.6,
        detectRadius: 24,
        attackRadius: 11.5,
        spawnX: 42,
        spawnZ: 18,
        xpReward: 240,
        goldReward: 195,
        lootTable: ['trophy_noonwraith', 'cursed_essence'],
        questTag: 'contract_noonwraith',
        isContractBoss: true,
        astralInvulnerable: true,
      });
    }

    if (contractId === 'contract_gargoyle') {
      return this.createEnemy({
        id: 'boss_contract_gargoyle',
        type: 'gargoyle',
        name: 'Древняя Горгулья («Каменный жнец»)',
        level: 4,
        hp: 350,
        damage: 38,
        speed: 4.2,
        detectRadius: 24,
        attackRadius: 3.8,
        spawnX: 46,
        spawnZ: -24,
        xpReward: 260,
        goldReward: 220,
        lootTable: ['trophy_gargoyle', 'iron_ore'],
        questTag: 'contract_gargoyle',
        isContractBoss: true,
      });
    }

    return null;
  }

  public spawnRenewableBounty(playerX: number, playerZ: number): EnemyData {
    const angle = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 10;
    const sx = Math.max(-90, Math.min(90, playerX + Math.cos(angle) * dist));
    const sz = Math.max(-520, Math.min(90, playerZ + Math.sin(angle) * dist));
    return this.createEnemy({
      id: `bounty_pack_${Date.now()}`,
      type: 'ghoul',
      name: 'Вожак мародёров-трупоедов (Заказ)',
      level: 3,
      hp: 175,
      damage: 24,
      speed: 4.9,
      detectRadius: 22,
      attackRadius: 2.5,
      spawnX: sx,
      spawnZ: sz,
      xpReward: 110,
      goldReward: 95,
      lootTable: ['ghoul_blood', 'monster_claw', 'iron_ore'],
    });
  }

  private createEnemy(cfg: {
    id: string;
    type: EnemyType;
    name: string;
    level: number;
    hp: number;
    damage: number;
    speed: number;
    detectRadius: number;
    attackRadius: number;
    spawnX: number;
    spawnZ: number;
    xpReward: number;
    goldReward: number;
    lootTable: string[];
    questTag?: string;
    packId?: string;
    isContractBoss?: boolean;
    astralInvulnerable?: boolean;
    crystalArmorCount?: number;
  }): EnemyData {
    const rig = this.assetManager.createEnemyModel(cfg.type);
    const y = getGroundHeight(cfg.spawnX, cfg.spawnZ);
    rig.root.position.set(cfg.spawnX, y, cfg.spawnZ);

    // Clone materials on enemy meshes so hit flash and boss phase aura affect only this enemy
    rig.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material = obj.material.clone();
      }
    });

    const isMajorBoss =
      cfg.type === 'boss' ||
      cfg.type === 'malakor' ||
      cfg.type === 'boss_hydra' ||
      cfg.type === 'boss_colossus' ||
      cfg.type === 'boss_vesper' ||
      cfg.type === 'boss_avatar';

    // Overhead 3D Health Bar
    const hpBarGroup = new THREE.Group();
    const barHeight = isMajorBoss
      ? 3.85
      : cfg.type === 'demon' ||
        cfg.type === 'werewolf' ||
        cfg.type === 'gargoyle' ||
        cfg.type === 'troglodyte' ||
        cfg.type === 'void_knight'
      ? 3.35
      : 2.15;
    hpBarGroup.position.set(0, barHeight, 0);

    const bgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.24, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x1c1917, side: THREE.DoubleSide })
    );
    const hpFillMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.095),
      new THREE.MeshBasicMaterial({
        color: isMajorBoss
          ? 0xf59e0b
          : cfg.type === 'demon' ||
            cfg.type === 'werewolf' ||
            cfg.type === 'gargoyle' ||
            cfg.type === 'troglodyte' ||
            cfg.type === 'void_knight'
          ? 0xf97316
          : cfg.type === 'hag' ||
            cfg.type === 'noonwraith' ||
            cfg.type === 'plague_reaper' ||
            cfg.type === 'frost_wraith'
          ? 0xa855f7
          : 0xef4444,
        side: THREE.DoubleSide,
      })
    );
    hpFillMesh.position.z = 0.01;
    hpBarGroup.add(bgMesh, hpFillMesh);
    rig.root.add(hpBarGroup);

    this.scene.add(rig.root);

    // Create ground AoE telegraph indicator for heavy/boss enemies
    let aoeTelegraphGroup: THREE.Group | undefined;
    const aoeRadius = isMajorBoss ? 4.8 : 4.2;
    if (
      isMajorBoss ||
      cfg.type === 'demon' ||
      cfg.type === 'gargoyle' ||
      cfg.type === 'werewolf' ||
      cfg.type === 'troglodyte' ||
      cfg.type === 'void_knight'
    ) {
      aoeTelegraphGroup = this.createAoETelegraphMesh(aoeRadius);
      aoeTelegraphGroup.visible = false;
      this.scene.add(aoeTelegraphGroup);
    }

    const data: EnemyData = {
      id: cfg.id,
      type: cfg.type,
      name: cfg.name,
      isSilverVulnerable:
        cfg.type !== 'wolf' &&
        cfg.type !== 'fallen_ash' &&
        cfg.type !== 'boss_vesper' &&
        cfg.type !== 'bounty_hunter',
      level: cfg.level,
      hp: cfg.hp,
      maxHp: cfg.hp,
      damage: cfg.damage,
      speed: cfg.speed,
      detectRadius: cfg.detectRadius,
      attackRadius: cfg.attackRadius,
      attackCooldown:
        cfg.type === 'wolf' || cfg.type === 'boss_vesper'
          ? 1.25
          : cfg.type === 'ghoul' ||
            cfg.type === 'skeleton' ||
            cfg.type === 'drowned' ||
            cfg.type === 'fallen_ash'
          ? 1.45
          : cfg.type === 'hag' ||
            cfg.type === 'noonwraith' ||
            cfg.type === 'plague_reaper' ||
            cfg.type === 'frost_wraith'
          ? 1.9
          : cfg.type === 'demon' || cfg.type === 'gargoyle' || cfg.type === 'boss_colossus'
          ? 2.2
          : 1.85,
      xpReward: cfg.xpReward,
      goldReward: cfg.goldReward,
      lootTable: cfg.lootTable,
      state: 'PATROL',
      spawnX: cfg.spawnX,
      spawnZ: cfg.spawnZ,
      x: cfg.spawnX,
      y,
      z: cfg.spawnZ,
      rotationY: 0,
      stunTimer: 0,
      burnTimer: 0,
      slowTimer: 0,
      confusedTimer: 0,
      bleedTimer: 0,
      questTag: cfg.questTag,
      phase: 1,
      packId: cfg.packId,
      isContractBoss: cfg.isContractBoss,
      astralInvulnerable: cfg.astralInvulnerable,
      crystalArmorCount: cfg.crystalArmorCount,
      vesperHealed: false,
    };

    this.enemies.push({
      data,
      rig,
      hpBarGroup,
      hpFillMesh,
      patrolAngle: Math.random() * Math.PI * 2,
      attackTimer: 0,
      attackWindupTimer: 0,
      attackWindupDuration: 0.4,
      hitFlashTimer: 0,
      animTime: Math.random() * 10,
      flurryRemaining: 0,
      flurryTickTimer: 0,
      teleportCooldown: 0,
      aoeTelegraphGroup,
      aoeCenterX: cfg.spawnX,
      aoeCenterZ: cfg.spawnZ,
      aoeRadius,
    });

    return data;
  }

  private createAoETelegraphMesh(radius: number): THREE.Group {
    const group = new THREE.Group();

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.22, radius, 36),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
    );
    outerRing.rotation.x = -Math.PI / 2;

    const innerFill = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 32),
      new THREE.MeshBasicMaterial({
        color: 0xdc2626,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      })
    );
    innerFill.rotation.x = -Math.PI / 2;
    innerFill.name = 'aoeInnerFill';

    group.add(outerRing, innerFill);
    return group;
  }

  private spawnMagicProjectile(
    enemy: EnemyData,
    targetX: number,
    targetY: number,
    targetZ: number,
    angleOffset = 0,
    colorHex = 0xa855f7
  ): void {
    const startX = enemy.x;
    const startY = enemy.y + 1.25;
    const startZ = enemy.z;

    const dx = targetX - startX;
    const dy = targetY + 1.0 - startY;
    const dz = targetZ - startZ;
    const horizAngle = Math.atan2(dx, dz) + angleOffset;
    const dist = Math.max(0.5, Math.hypot(dx, dz));
    const speed = 11.5;

    const vx = Math.sin(horizAngle) * speed;
    const vz = Math.cos(horizAngle) * speed;
    const vy = (dy / dist) * speed * 0.5;

    const orbGroup = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 1),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 2.0,
        roughness: 0.2,
      })
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 10, 10),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    orbGroup.add(core, halo);
    orbGroup.position.set(startX, startY, startZ);
    this.scene.add(orbGroup);

    this.projectiles.push({
      mesh: orbGroup,
      owner: enemy,
      x: startX,
      y: startY,
      z: startZ,
      vx,
      vy,
      vz,
      damage: Math.round(enemy.damage * 0.9),
      life: 2.4,
    });
  }

  public triggerHitFlash(enemy: ActiveEnemy): void {
    enemy.hitFlashTimer = 0.16;
    enemy.rig.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.emissive.setHex(0xdc2626);
        obj.material.emissiveIntensity = 1.6;
      }
    });
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    playerAlive: boolean,
    cameraQuaternion: THREE.Quaternion,
    obstacles: CollisionCylinder[],
    onAttackPlayer: (enemy: EnemyData, customDamage?: number) => void,
    onEnemyBurnDeath: (enemy: ActiveEnemy) => void,
    decoyTarget: { x: number; z: number } | null = null,
    onCombatEvent?: (msg: string, type: 'info' | 'damage' | 'quest' | 'loot') => void,
    collisionBoxes: CollisionBox[] = []
  ): { lockedEnemy: EnemyData | null; bossEnemy: EnemyData | null } {
    let closestCombatEnemy: EnemyData | null = null;
    let closestDist = 22;
    let bossEnemy: EnemyData | null = null;

    // Determine which wolf packs are currently alerted
    const alertedPacks = new Set<string>();
    for (const enemy of this.enemies) {
      const d = enemy.data;
      if (d.state === 'DEAD' || !d.packId) continue;
      const dist = Math.hypot(playerX - d.x, playerZ - d.z);
      if (dist <= d.detectRadius || d.hp < d.maxHp) {
        alertedPacks.add(d.packId);
      }
    }

    // Update ranged projectiles
    const playerY = getGroundHeight(playerX, playerZ);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y += dt * 6;
      p.mesh.rotation.x += dt * 4;

      const distToPlayer = Math.hypot(p.x - playerX, p.z - playerZ);
      const groundH = getGroundHeight(p.x, p.z);

      if (playerAlive && distToPlayer <= 0.95 && Math.abs(p.y - (playerY + 1.0)) <= 1.3) {
        onAttackPlayer(p.owner, p.damage);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.life <= 0 || p.y < groundH) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    for (const enemy of this.enemies) {
      const d = enemy.data;
      enemy.animTime += dt;

      // Update hit flash decay
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
        if (enemy.hitFlashTimer === 0) {
          const isBossEnraged = (d.type === 'boss' || d.type === 'boss_avatar') && (d.phase ?? 1) >= 2;
          enemy.rig.root.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
              obj.material.emissive.setHex(isBossEnraged ? 0x991b1b : 0x000000);
              obj.material.emissiveIntensity = isBossEnraged ? 0.55 : 0;
            }
          });
        }
      }

      if (d.state === 'DEAD') {
        enemy.hpBarGroup.visible = false;
        if (enemy.aoeTelegraphGroup) enemy.aoeTelegraphGroup.visible = false;
        enemy.rig.root.rotation.x = THREE.MathUtils.damp(
          enemy.rig.root.rotation.x,
          -Math.PI / 2,
          7,
          dt
        );
        enemy.rig.root.position.y = THREE.MathUtils.damp(
          enemy.rig.root.position.y,
          d.y - 0.35,
          4,
          dt
        );
        continue;
      }

      // Boss Phase 2 transition (< 50% HP)
      if (d.type === 'boss' && d.phase !== 2 && d.hp <= d.maxHp * 0.5) {
        d.phase = 2;
        d.speed = 5.4;
        d.attackCooldown = 1.35;
        enemy.aoeRadius = 5.4;
        onCombatEvent?.(
          'Древний Хранитель Короны переходит во II фазу боя: Ярость Старого Королевства!',
          'quest'
        );
      }

      // Lich King Malakor 3-Phase Transitions
      if (d.type === 'malakor') {
        if ((d.phase ?? 1) < 2 && d.hp <= d.maxHp * 0.65) {
          d.phase = 2;
          d.speed = 5.2;
          d.attackCooldown = 1.45;
          onCombatEvent?.(
            'Король-Лич Малакор (Фаза II): Проклятые Метеоры и Пепельный Щит!',
            'quest'
          );
        } else if ((d.phase ?? 1) < 3 && d.hp <= d.maxHp * 0.3) {
          d.phase = 3;
          d.speed = 5.8;
          d.attackCooldown = 1.15;
          enemy.aoeRadius = 5.8;
          onCombatEvent?.(
            'Король-Лич Малакор (Фаза III): Буря Чёрных Молний Бездны!',
            'quest'
          );
        }
      }

      // Northern Boss 1: Hydra Phase 2 (< 55% HP) summons Drowned minions
      if (d.type === 'boss_hydra' && (d.phase ?? 1) < 2 && d.hp <= d.maxHp * 0.55) {
        d.phase = 2;
        d.attackCooldown = 1.45;
        onCombatEvent?.(
          'Матерь Трясины вздымает новые головы и призывает Болотных Утопленников из тины!',
          'quest'
        );
        this.createEnemy({
          id: `hydra_drowned_${Date.now()}_1`,
          type: 'drowned',
          name: 'Призванный Утопленник Трясины',
          level: 6,
          hp: 160,
          damage: 24,
          speed: 5.3,
          detectRadius: 26,
          attackRadius: 2.5,
          spawnX: d.x + 3.2,
          spawnZ: d.z + 2.5,
          xpReward: 55,
          goldReward: 25,
          lootTable: ['ghoul_blood'],
        });
      }

      // Northern Boss 2: Crystal Colossus Phase 2 (< 50% HP)
      if (d.type === 'boss_colossus' && (d.phase ?? 1) < 2 && d.hp <= d.maxHp * 0.5) {
        d.phase = 2;
        d.speed = 4.8;
        d.attackCooldown = 1.65;
        onCombatEvent?.(
          'Кристальный Колосс впадает в резонанс Чёрной Руды (Фаза II)!',
          'quest'
        );
      }

      // Northern Boss 3: Grandmaster Vesper drinks Swallow elixir once at < 45% HP
      if (d.type === 'boss_vesper' && !d.vesperHealed && d.hp <= d.maxHp * 0.45) {
        d.vesperHealed = true;
        d.phase = 2;
        d.hp = Math.min(d.maxHp, d.hp + 160);
        d.speed = 6.3;
        onCombatEvent?.(
          'Грандмастер Веспер выпивает эликсир «Ласточка» (+160 ОЗ) и активирует Знаки Пепла!',
          'quest'
        );
      }

      // Northern Boss 4: Avatar of the Void 3-Phase Transitions
      if (d.type === 'boss_avatar') {
        if ((d.phase ?? 1) < 2 && d.hp <= d.maxHp * 0.66) {
          d.phase = 2;
          d.speed = 5.6;
          d.attackCooldown = 1.4;
          onCombatEvent?.(
            'Аватара Сердца Пустоты (Фаза II): Призыв Теней Павших Боссов!',
            'quest'
          );
          this.createEnemy({
            id: `avatar_shadow_${Date.now()}`,
            type: 'void_knight',
            name: 'Тень Древнего Хранителя Пустоты',
            level: 9,
            hp: 260,
            damage: 38,
            speed: 5.2,
            detectRadius: 30,
            attackRadius: 3.4,
            spawnX: d.x - 4.0,
            spawnZ: d.z + 3.0,
            xpReward: 120,
            goldReward: 60,
            lootTable: ['void_dust'],
          });
        } else if ((d.phase ?? 1) < 3 && d.hp <= d.maxHp * 0.33) {
          d.phase = 3;
          d.speed = 6.1;
          d.attackCooldown = 1.15;
          enemy.aoeRadius = 6.0;
          onCombatEvent?.(
            'Аватара Сердца Пустоты (Фаза III): Коллапс Пепельного Затмения!',
            'quest'
          );
        }
      }

      // Contract Boss 1: Alpha Werewolf regeneration (unless burning with Flame Sign) & 50% HP wolf pack summon
      if (d.type === 'werewolf') {
        if (d.burnTimer <= 0 && d.hp < d.maxHp && d.state !== 'PATROL') {
          d.hp = Math.min(d.maxHp, d.hp + 8 * dt);
        }
        if (d.phase !== 2 && d.hp <= d.maxHp * 0.5) {
          d.phase = 2;
          onCombatEvent?.(
            'Альфа-Воколак издаёт вой и призывает стаю лесных волков!',
            'quest'
          );
          this.createEnemy({
            id: `ww_summon_1_${Date.now()}`,
            type: 'wolf',
            name: 'Призванный волк стаи',
            level: 3,
            hp: 75,
            damage: 14,
            speed: 6.2,
            detectRadius: 24,
            attackRadius: 3.3,
            spawnX: d.x + 2.5,
            spawnZ: d.z + 2.0,
            xpReward: 35,
            goldReward: 15,
            lootTable: ['wolf_pelt'],
          });
          this.createEnemy({
            id: `ww_summon_2_${Date.now()}`,
            type: 'wolf',
            name: 'Призванный волк стаи',
            level: 3,
            hp: 75,
            damage: 14,
            speed: 6.2,
            detectRadius: 24,
            attackRadius: 3.3,
            spawnX: d.x - 2.5,
            spawnZ: d.z - 2.0,
            xpReward: 35,
            goldReward: 15,
            lootTable: ['wolf_pelt'],
          });
        }
      }

      // Contract Boss 2: Noonwraith astral invulnerability unless slowed (Frost Seal) or stunned (Impulse)
      if (d.type === 'noonwraith') {
        d.astralInvulnerable = d.slowTimer <= 0 && d.stunTimer <= 0;
      }

      // Update 3D Health Bar orientation & fill
      enemy.hpBarGroup.quaternion.copy(cameraQuaternion);
      const hpRatio = Math.max(0, Math.min(1, d.hp / d.maxHp));
      enemy.hpFillMesh.scale.x = Math.max(0.001, hpRatio);
      enemy.hpFillMesh.position.x = -(1 - hpRatio) * 0.58;

      // Burn & Bleed damage over time
      if (d.burnTimer > 0) {
        d.burnTimer = Math.max(0, d.burnTimer - dt);
        d.hp -= 12 * dt;
        if (d.hp <= 0) {
          d.hp = 0;
          d.state = 'DEAD';
          if (enemy.aoeTelegraphGroup) enemy.aoeTelegraphGroup.visible = false;
          onEnemyBurnDeath(enemy);
          continue;
        }
      }
      if ((d.bleedTimer ?? 0) > 0) {
        d.bleedTimer = Math.max(0, (d.bleedTimer ?? 0) - dt);
        d.hp -= 10 * dt;
        if (d.hp <= 0) {
          d.hp = 0;
          d.state = 'DEAD';
          if (enemy.aoeTelegraphGroup) enemy.aoeTelegraphGroup.visible = false;
          onEnemyBurnDeath(enemy);
          continue;
        }
      }

      if (d.slowTimer > 0) d.slowTimer = Math.max(0, d.slowTimer - dt);
      if (d.confusedTimer > 0) d.confusedTimer = Math.max(0, d.confusedTimer - dt);
      if (enemy.attackTimer > 0) enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
      if (enemy.teleportCooldown > 0) {
        enemy.teleportCooldown = Math.max(0, enemy.teleportCooldown - dt);
      }

      const distToRealPlayer = Math.hypot(playerX - d.x, playerZ - d.z);
      const isTauntedByDecoy =
        decoyTarget !== null && Math.hypot(decoyTarget.x - d.x, decoyTarget.z - d.z) <= 18;
      const aggroX = isTauntedByDecoy && decoyTarget ? decoyTarget.x : playerX;
      const aggroZ = isTauntedByDecoy && decoyTarget ? decoyTarget.z : playerZ;
      const distToTarget = Math.hypot(aggroX - d.x, aggroZ - d.z);
      const distToSpawn = Math.hypot(d.spawnX - d.x, d.spawnZ - d.z);

      enemy.hpBarGroup.visible = distToRealPlayer < 24 || d.hp < d.maxHp;

      // Show top-screen Boss Health Bar when fighting any Boss or Contract Mini-Boss
      if (
        (d.type === 'boss' ||
          d.type === 'malakor' ||
          d.type === 'boss_hydra' ||
          d.type === 'boss_colossus' ||
          d.type === 'boss_vesper' ||
          d.type === 'boss_avatar' ||
          d.isContractBoss) &&
        distToRealPlayer < 35
      ) {
        bossEnemy = d;
      }
      if (distToRealPlayer < closestDist) {
        closestDist = distToRealPlayer;
        closestCombatEnemy = d;
      }

      // Stunned state (Impulse Sign 2s stun)
      if (d.stunTimer > 0) {
        d.stunTimer = Math.max(0, d.stunTimer - dt);
        d.state = 'STUNNED';
        enemy.flurryRemaining = 0;
        enemy.attackWindupTimer = 0;
        if (enemy.aoeTelegraphGroup) enemy.aoeTelegraphGroup.visible = false;
        enemy.rig.body.rotation.z = Math.sin(enemy.animTime * 18) * 0.15;
        continue;
      } else {
        enemy.rig.body.rotation.z = 0;
      }

      if (!playerAlive) {
        d.state = 'PATROL';
        if (enemy.aoeTelegraphGroup) enemy.aoeTelegraphGroup.visible = false;
      }

      // =======================================================================
      // SWAMP HAG, NOONWRAITH, FROST WRAITH & VESPER SHADOW STEP TELEPORT
      // =======================================================================
      if (
        (d.type === 'hag' ||
          d.type === 'noonwraith' ||
          d.type === 'frost_wraith' ||
          d.type === 'boss_vesper') &&
        playerAlive &&
        distToTarget < 3.8 &&
        enemy.teleportCooldown <= 0 &&
        d.slowTimer <= 0
      ) {
        enemy.teleportCooldown = d.type === 'boss_vesper' ? 5.0 : 6.5;
        const angle = Math.random() * Math.PI * 2;
        const teleDist = d.type === 'boss_vesper' ? 4.2 : 7.5 + Math.random() * 2.5;
        d.x = (d.type === 'boss_vesper' ? aggroX : d.spawnX) + Math.cos(angle) * teleDist;
        d.z = (d.type === 'boss_vesper' ? aggroZ : d.spawnZ) + Math.sin(angle) * teleDist;
        d.y = getGroundHeight(d.x, d.z);
        enemy.rig.root.position.set(d.x, d.y, d.z);
        onCombatEvent?.(
          d.type === 'boss_vesper'
            ? 'Грандмастер Веспер совершает теневой рывок Зольника!'
            : `${d.name} исчезает в тумане и телепортируется!`,
          'info'
        );
      }

      // =======================================================================
      // AI STATE TRANSITIONS & ZONE LEASHING
      // =======================================================================
      const leashLimit =
        d.type === 'boss' ||
        d.type === 'malakor' ||
        d.type === 'boss_hydra' ||
        d.type === 'boss_colossus' ||
        d.type === 'boss_vesper' ||
        d.type === 'boss_avatar' ||
        d.isContractBoss
          ? 38
          : 30;
      const isPackAlerted = Boolean(d.packId && alertedPacks.has(d.packId));

      if (distToSpawn > leashLimit && d.state !== 'RETREAT') {
        d.state = 'RETREAT';
        enemy.attackWindupTimer = 0;
        enemy.flurryRemaining = 0;
        if (enemy.aoeTelegraphGroup) enemy.aoeTelegraphGroup.visible = false;
      } else if (d.state === 'RETREAT') {
        if (distToSpawn < 3.5) {
          d.state = 'PATROL';
          d.hp = Math.min(d.maxHp, d.hp + d.maxHp * 0.35);
        }
      } else if (
        playerAlive &&
        (distToTarget <= d.attackRadius || enemy.attackWindupTimer > 0 || enemy.flurryRemaining > 0)
      ) {
        d.state = 'ATTACK';
      } else if (playerAlive && (distToTarget <= d.detectRadius || isPackAlerted)) {
        d.state = 'CHASE';
      } else {
        d.state = 'PATROL';
        if (enemy.aoeTelegraphGroup) enemy.aoeTelegraphGroup.visible = false;
      }

      // Frost Seal slows enemy by 60% (speed multiplier = 0.40)
      const speedMult = d.slowTimer > 0 ? 0.4 : 1.0;

      // =======================================================================
      // EXECUTE AI STATE
      // =======================================================================
      if (d.state === 'PATROL') {
        enemy.patrolAngle += dt * 0.55;
        const patrolRadius = d.type === 'wolf' ? 5.5 : 4.2;
        const targetX = d.spawnX + Math.cos(enemy.patrolAngle) * patrolRadius;
        const targetZ = d.spawnZ + Math.sin(enemy.patrolAngle) * patrolRadius;
        const dx = targetX - d.x;
        const dz = targetZ - d.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.25) {
          const step = d.speed * 0.45 * speedMult * dt;
          this.moveEnemy(enemy, (dx / dist) * step, (dz / dist) * step, obstacles, collisionBoxes);
          d.rotationY = Math.atan2(dx, dz);
          this.animateEnemy(enemy, 'walk');
        } else {
          this.animateEnemy(enemy, 'idle');
        }
      } else if (d.state === 'RETREAT') {
        const dx = d.spawnX - d.x;
        const dz = d.spawnZ - d.z;
        const dist = Math.max(0.01, Math.hypot(dx, dz));
        const step = d.speed * 1.15 * dt;
        this.moveEnemy(enemy, (dx / dist) * step, (dz / dist) * step, obstacles, collisionBoxes);
        d.rotationY = Math.atan2(dx, dz);
        this.animateEnemy(enemy, 'run');
      } else if (d.state === 'CHASE') {
        if (enemy.aoeTelegraphGroup) enemy.aoeTelegraphGroup.visible = false;
        const dx = aggroX - d.x;
        const dz = aggroZ - d.z;
        const dist = Math.max(0.01, Math.hypot(dx, dz));
        const step = d.speed * speedMult * dt;
        this.moveEnemy(enemy, (dx / dist) * step, (dz / dist) * step, obstacles, collisionBoxes);
        d.rotationY = Math.atan2(dx, dz);
        this.animateEnemy(enemy, 'run');
      } else if (d.state === 'ATTACK') {
        const dx = aggroX - d.x;
        const dz = aggroZ - d.z;
        const dist = Math.max(0.01, Math.hypot(dx, dz));
        d.rotationY = Math.atan2(dx, dz);
        enemy.rig.root.rotation.y = d.rotationY;

        // 1. WOLF: Forward Lunge / Pounce on Attack
        if (d.type === 'wolf') {
          if (enemy.attackWindupTimer > 0) {
            enemy.attackWindupTimer = Math.max(0, enemy.attackWindupTimer - dt);
            const lungeStep = 10.2 * speedMult * dt;
            if (dist > 1.15) {
              this.moveEnemy(enemy, (dx / dist) * lungeStep, (dz / dist) * lungeStep, obstacles, collisionBoxes);
            }
            this.animateEnemy(enemy, 'attack');
            if (enemy.attackWindupTimer === 0) {
              if (!isTauntedByDecoy && Math.hypot(playerX - d.x, playerZ - d.z) <= 2.4) {
                onAttackPlayer(d);
              }
              enemy.attackTimer = d.attackCooldown;
            }
          } else if (enemy.attackTimer <= 0) {
            enemy.attackWindupDuration = 0.32;
            enemy.attackWindupTimer = 0.32;
          } else {
            this.animateEnemy(enemy, 'idle');
          }
        }
        // 2. GHOUL, SKELETON, DROWNED, FALLEN ASH & GRANDMASTER VESPER: Rapid Multi-Hit Flurry
        else if (
          d.type === 'ghoul' ||
          d.type === 'skeleton' ||
          d.type === 'drowned' ||
          d.type === 'fallen_ash' ||
          d.type === 'boss_vesper'
        ) {
          if (enemy.flurryRemaining > 0) {
            enemy.flurryTickTimer = Math.max(0, enemy.flurryTickTimer - dt);
            this.animateEnemy(enemy, 'attack');
            if (enemy.flurryTickTimer === 0) {
              enemy.flurryRemaining--;
              if (!isTauntedByDecoy && Math.hypot(playerX - d.x, playerZ - d.z) <= d.attackRadius + 0.95) {
                onAttackPlayer(d, Math.round(d.damage * 0.55));
              }
              if (enemy.flurryRemaining === 0 && (d.type === 'fallen_ash' || d.type === 'boss_vesper')) {
                const targetY = getGroundHeight(aggroX, aggroZ);
                this.spawnMagicProjectile(d, aggroX, targetY, aggroZ, 0, 0xf97316);
              }
              if (enemy.flurryRemaining > 0) {
                enemy.flurryTickTimer = 0.16;
              } else {
                enemy.attackTimer = d.attackCooldown;
              }
            }
          } else if (enemy.attackWindupTimer > 0) {
            enemy.attackWindupTimer = Math.max(0, enemy.attackWindupTimer - dt);
            this.animateEnemy(enemy, 'attack');
            if (enemy.attackWindupTimer === 0) {
              enemy.flurryRemaining = d.type === 'boss_vesper' ? 4 : 3;
              enemy.flurryTickTimer = 0.05;
            }
          } else if (enemy.attackTimer <= 0) {
            enemy.attackWindupDuration = 0.26;
            enemy.attackWindupTimer = 0.26;
          } else {
            this.animateEnemy(enemy, 'idle');
          }
        }
        // 3. SWAMP HAG, NOONWRAITH, PLAGUE REAPER & FROST WRAITH: Kiting & Magical Projectiles
        else if (
          d.type === 'hag' ||
          d.type === 'noonwraith' ||
          d.type === 'plague_reaper' ||
          d.type === 'frost_wraith'
        ) {
          if (dist < 5.6) {
            const backStep = d.speed * 0.75 * speedMult * dt;
            this.moveEnemy(enemy, -(dx / dist) * backStep, -(dz / dist) * backStep, obstacles);
            this.animateEnemy(enemy, 'walk');
          } else {
            this.animateEnemy(enemy, 'idle');
          }

          if (enemy.attackWindupTimer > 0) {
            enemy.attackWindupTimer = Math.max(0, enemy.attackWindupTimer - dt);
            this.animateEnemy(enemy, 'attack');
            if (enemy.attackWindupTimer === 0) {
              const targetY = getGroundHeight(aggroX, aggroZ);
              const projColor =
                d.type === 'frost_wraith'
                  ? 0x38bdf8
                  : d.type === 'plague_reaper'
                  ? 0x84cc16
                  : d.type === 'noonwraith'
                  ? 0x2dd4bf
                  : 0x22c55e;
              this.spawnMagicProjectile(d, aggroX, targetY, aggroZ, 0, projColor);
              enemy.attackTimer = d.attackCooldown;
            }
          } else if (enemy.attackTimer <= 0) {
            enemy.attackWindupDuration = 0.42;
            enemy.attackWindupTimer = 0.42;
          }
        }
        // 4. HEAVY BOSSES & ELITES (Demon, Werewolf, Gargoyle, Troglodyte, Void Knight, Hydra, Colossus, Guardian, Malakor, Avatar)
        else {
          if (enemy.attackWindupTimer > 0) {
            enemy.attackWindupTimer = Math.max(0, enemy.attackWindupTimer - dt);
            this.animateEnemy(enemy, 'attack');

            // Update glowing red ground AoE indicator
            if (enemy.aoeTelegraphGroup) {
              enemy.aoeTelegraphGroup.visible = true;
              const progress =
                1 - enemy.attackWindupTimer / Math.max(0.01, enemy.attackWindupDuration);
              const innerFill = enemy.aoeTelegraphGroup.getObjectByName('aoeInnerFill');
              if (innerFill) {
                const scale = Math.max(0.1, progress);
                innerFill.scale.set(scale, scale, 1);
              }
            }

            if (enemy.attackWindupTimer === 0) {
              if (enemy.aoeTelegraphGroup) {
                enemy.aoeTelegraphGroup.visible = false;
              }
              const playerDistToAoE = Math.hypot(
                playerX - enemy.aoeCenterX,
                playerZ - enemy.aoeCenterZ
              );
              if (!isTauntedByDecoy && playerDistToAoE <= enemy.aoeRadius) {
                const slamDamage =
                  (d.phase ?? 1) >= 2 ? Math.round(d.damage * 1.25) : d.damage;
                onAttackPlayer(d, slamDamage);
              }
              // Ranged fan volleys for Hydra, Colossus Phase 2, Guardian Phase 2, Malakor Phase 2+, Avatar
              if (
                d.type === 'boss_hydra' ||
                ((d.type === 'boss' ||
                  d.type === 'malakor' ||
                  d.type === 'boss_colossus' ||
                  d.type === 'boss_avatar') &&
                  (d.phase ?? 1) >= 2) ||
                d.type === 'boss_avatar'
              ) {
                const targetY = getGroundHeight(aggroX, aggroZ);
                const orbColor =
                  d.type === 'boss_hydra'
                    ? 0x22c55e
                    : d.type === 'boss_colossus'
                    ? 0x38bdf8
                    : d.type === 'boss_avatar'
                    ? 0xef4444
                    : d.type === 'malakor'
                    ? 0xa855f7
                    : 0xef4444;
                this.spawnMagicProjectile(d, aggroX, targetY, aggroZ, -0.25, orbColor);
                this.spawnMagicProjectile(d, aggroX, targetY, aggroZ, 0, orbColor);
                this.spawnMagicProjectile(d, aggroX, targetY, aggroZ, 0.25, orbColor);
              }
              enemy.attackTimer = d.attackCooldown;
            }
          } else if (enemy.attackTimer <= 0) {
            const windup =
              d.type === 'demon' || d.type === 'gargoyle' || d.type === 'boss_colossus'
                ? 1.05
                : (d.phase ?? 1) >= 2
                ? 0.82
                : 0.98;
            enemy.attackWindupDuration = windup;
            enemy.attackWindupTimer = windup;
            enemy.aoeCenterX = d.x + Math.sin(d.rotationY) * 1.6;
            enemy.aoeCenterZ = d.z + Math.cos(d.rotationY) * 1.6;
            if (enemy.aoeTelegraphGroup) {
              const groundY = getGroundHeight(enemy.aoeCenterX, enemy.aoeCenterZ);
              enemy.aoeTelegraphGroup.position.set(
                enemy.aoeCenterX,
                groundY + 0.07,
                enemy.aoeCenterZ
              );
              enemy.aoeTelegraphGroup.visible = true;
            }
          } else {
            this.animateEnemy(enemy, 'idle');
          }
        }
      }
    }

    return { lockedEnemy: closestCombatEnemy, bossEnemy };
  }

  private moveEnemy(
    enemy: ActiveEnemy,
    dx: number,
    dz: number,
    obstacles: CollisionCylinder[],
    collisionBoxes: CollisionBox[] = []
  ): void {
    const d = enemy.data;
    const nextX = d.x + dx;
    const nextZ = d.z + dz;

    const r =
      d.type === 'boss' ||
      d.type === 'malakor' ||
      d.type === 'boss_hydra' ||
      d.type === 'boss_colossus' ||
      d.type === 'boss_avatar' ||
      d.type === 'demon' ||
      d.type === 'werewolf' ||
      d.type === 'gargoyle' ||
      d.type === 'troglodyte' ||
      d.type === 'void_knight'
        ? 0.72
        : 0.45;

    const resolved = resolveSlidingCollision(
      d.x,
      d.z,
      nextX,
      nextZ,
      r,
      obstacles,
      collisionBoxes
    );

    d.x = resolved.x;
    d.z = resolved.z;
    d.y = resolved.y;
    enemy.rig.root.position.set(d.x, d.y, d.z);
    enemy.rig.root.rotation.y = d.rotationY;
  }

  private animateEnemy(
    enemy: ActiveEnemy,
    mode: 'idle' | 'walk' | 'run' | 'attack'
  ): void {
    const { body, head, leftArm, rightArm, leftLeg, rightLeg, cloak } = enemy.rig;
    const t = enemy.animTime;
    const baseY =
      enemy.data.type === 'wolf'
        ? 0.55
        : enemy.data.type === 'ghoul' ||
          enemy.data.type === 'skeleton' ||
          enemy.data.type === 'drowned' ||
          enemy.data.type === 'fallen_ash'
        ? 0.78
        : enemy.data.type === 'boss_vesper'
        ? 0.92
        : enemy.data.type === 'hag' ||
          enemy.data.type === 'noonwraith' ||
          enemy.data.type === 'plague_reaper' ||
          enemy.data.type === 'frost_wraith'
        ? 0.8
        : enemy.data.type === 'demon' ||
          enemy.data.type === 'werewolf' ||
          enemy.data.type === 'gargoyle' ||
          enemy.data.type === 'troglodyte'
        ? 1.1
        : 1.25;

    if (mode === 'walk' || mode === 'run') {
      const freq = mode === 'run' ? 10.5 : 6.5;
      const amp = mode === 'run' ? 0.58 : 0.36;
      const s = Math.sin(t * freq);
      leftLeg.rotation.x = s * amp;
      rightLeg.rotation.x = -s * amp;
      leftArm.rotation.x = -s * amp * 0.8;
      rightArm.rotation.x = s * amp * 0.8;
      rightArm.rotation.z = 0;
      body.position.y = baseY + Math.abs(Math.cos(t * freq)) * 0.05;
      body.rotation.x = mode === 'run' ? 0.16 : 0.06;
      if (cloak) cloak.rotation.x = 0.25 + Math.abs(s) * 0.2;
    } else if (mode === 'attack') {
      if (enemy.data.type === 'wolf') {
        body.position.y = baseY + 0.18;
        body.rotation.x = -0.25;
        leftArm.rotation.x = -0.95;
        rightArm.rotation.x = -0.95;
        leftLeg.rotation.x = 0.65;
        rightLeg.rotation.x = 0.65;
      } else if (
        enemy.data.type === 'ghoul' ||
        enemy.data.type === 'skeleton' ||
        enemy.data.type === 'drowned' ||
        enemy.data.type === 'fallen_ash' ||
        enemy.data.type === 'boss_vesper'
      ) {
        const flurryWave = Math.sin(t * 28);
        leftArm.rotation.x = -1.2 + flurryWave * 0.85;
        rightArm.rotation.x = -1.2 - flurryWave * 0.85;
        body.rotation.y = flurryWave * 0.25;
        body.rotation.x = 0.25;
      } else {
        const swing = Math.sin(enemy.attackWindupTimer * 10);
        rightArm.rotation.x = -1.55 + swing * 1.35;
        rightArm.rotation.z = -0.25 * swing;
        leftArm.rotation.x = -1.1 + swing * 0.8;
        body.rotation.x = 0.2 * swing;
        if (cloak) cloak.rotation.x = 0.4;
      }
    } else {
      const breath = Math.sin(t * 2.5) * 0.03;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      leftArm.rotation.x = breath;
      rightArm.rotation.x = -0.15 + breath;
      rightArm.rotation.z = 0;
      body.rotation.x = 0;
      body.rotation.y = 0;
      head.rotation.y = Math.sin(t * 1.4) * 0.08;
      body.position.y = baseY + breath;
      if (cloak) cloak.rotation.x = 0.1 + Math.abs(breath) * 2;
    }
  }
}
