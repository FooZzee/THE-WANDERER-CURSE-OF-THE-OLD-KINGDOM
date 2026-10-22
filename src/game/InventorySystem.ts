import { getUpgradeCost } from './rules';
import type { GameItem, PlayerStats, SkillNode } from './types';

export class InventorySystem {
  public items: GameItem[] = [];
  public shopCatalog: GameItem[] = [];
  public skills: SkillNode[] = [];

  constructor() {
    this.initStartingInventory();
    this.initShopCatalog();
    this.initSkillTree();
  }

  public initStartingInventory(): void {
    this.items = [
      {
        id: 'sword_wolf_steel',
        name: 'Стальной меч Школы Странника',
        description: 'Надёжный клинок из кованой стали для боя с людьми и дикими зверями.',
        category: 'weapon',
        rarity: 'uncommon',
        value: 90,
        quantity: 1,
        equipped: true,
        upgradeLevel: 0,
        stats: { attack: 14 },
      },
      {
        id: 'sword_runic_silver',
        name: 'Рунный серебряный меч',
        description: 'Серебряный клинок с гравировкой древних рун, смертоносный для чудовищ.',
        category: 'weapon',
        rarity: 'rare',
        value: 140,
        quantity: 1,
        equipped: true,
        upgradeLevel: 0,
        stats: { silverAttack: 22 },
      },
      {
        id: 'armor_kaer_leather',
        name: 'Потёртая кожаная куртка охотника',
        description: 'Дорожная броня с кольчужными наплечниками, не сковывающая движений.',
        category: 'armor',
        rarity: 'common',
        value: 80,
        quantity: 1,
        equipped: true,
        upgradeLevel: 0,
        stats: { defense: 8, maxHealth: 20 },
      },
      {
        id: 'potion_swallow',
        name: 'Эликсир «Ласточка»',
        description: 'Восстанавливает 65 ед. здоровья (+20 Токсичности).',
        category: 'potion',
        rarity: 'uncommon',
        value: 35,
        quantity: 3,
        stats: { healAmount: 65 },
      },
      {
        id: 'potion_thunderbolt',
        name: 'Эликсир «Гром»',
        description: '+35% к силе атаки на 45 сек и +40 ОЗ (+25 Токсичности).',
        category: 'potion',
        rarity: 'rare',
        value: 50,
        quantity: 2,
        stats: { healAmount: 40, staminaBoost: 70 },
      },
      {
        id: 'potion_cat',
        name: 'Эликсир «Кошка»',
        description: 'Дарует ночное зрение в темноте и катакомбах на 60 сек (+15 Токсичности).',
        category: 'potion',
        rarity: 'uncommon',
        value: 40,
        quantity: 1,
        stats: { healAmount: 25 },
      },
      {
        id: 'potion_blizzard',
        name: 'Эликсир «Пурга»',
        description: 'Ускоряет рефлексы и восстанавливает 80 выносливости (+20 Токсичности).',
        category: 'potion',
        rarity: 'rare',
        value: 55,
        quantity: 1,
        stats: { staminaBoost: 80 },
      },
      {
        id: 'iron_ore',
        name: 'Тёмная железная руда',
        description: 'Необходима кузнецу для закалки оружия и ковки по чертежам.',
        category: 'resource',
        rarity: 'common',
        value: 25,
        quantity: 3,
      },
      {
        id: 'herb_swallow',
        name: 'Ласточкина трава',
        description: 'Целебное растение для варки ведьмачьих эликсиров.',
        category: 'resource',
        rarity: 'common',
        value: 12,
        quantity: 3,
      },
      {
        id: 'rune_fire',
        name: 'Рунический камень Огня (Игнис)',
        description: 'Вставляется в меч: придаёт лезвию огненное свечение и +8 к урону.',
        category: 'rune',
        rarity: 'rare',
        value: 75,
        quantity: 1,
        stats: { runeEffect: 'fire', attack: 8, silverAttack: 8 },
      },
      {
        id: 'bp_raven_armor',
        name: 'Чертёж: Доспех Школы Ворона',
        description: 'Лёгкий доспех (Сет Ворона: +25% реген выносливости, +20% шанс крита).',
        category: 'blueprint',
        rarity: 'rare',
        value: 95,
        quantity: 1,
        craftsItemId: 'set_raven_armor',
        craftRecipe: [
          { itemId: 'iron_ore', count: 1 },
          { itemId: 'wolf_pelt', count: 1 },
        ],
      },
      {
        id: 'bp_raven_sword',
        name: 'Чертёж: Клинок Школы Ворона',
        description: 'Серебряный и стальной клинок Ворона (Сет Ворона: +20% крит и скорость).',
        category: 'blueprint',
        rarity: 'rare',
        value: 110,
        quantity: 1,
        craftsItemId: 'set_raven_sword',
        craftRecipe: [
          { itemId: 'iron_ore', count: 2 },
          { itemId: 'monster_claw', count: 1 },
        ],
      },
    ];
  }

  public initShopCatalog(): void {
    this.shopCatalog = [
      {
        id: 'potion_swallow',
        name: 'Эликсир «Ласточка»',
        description: 'Восстанавливает 65 ед. здоровья.',
        category: 'potion',
        rarity: 'uncommon',
        value: 40,
        quantity: 99,
        stats: { healAmount: 65 },
      },
      {
        id: 'potion_thunderbolt',
        name: 'Эликсир «Гром»',
        description: '+35% к атаке на 45 сек и +40 ОЗ.',
        category: 'potion',
        rarity: 'rare',
        value: 55,
        quantity: 99,
        stats: { healAmount: 40, staminaBoost: 70 },
      },
      {
        id: 'iron_ore',
        name: 'Тёмная железная руда',
        description: 'Слиток руды для ковки и улучшения снаряжения у кузнеца.',
        category: 'resource',
        rarity: 'common',
        value: 30,
        quantity: 99,
      },
      {
        id: 'herb_swallow',
        name: 'Ласточкина трава',
        description: 'Алхимическая трава для варки эликсиров [N].',
        category: 'resource',
        rarity: 'common',
        value: 15,
        quantity: 99,
      },
      {
        id: 'rune_vamp',
        name: 'Руна Вампиризма (Мортана)',
        description: 'Вставляется в оружие: исцеляет героя на 5% от нанесённого урона.',
        category: 'rune',
        rarity: 'relic',
        value: 110,
        quantity: 3,
        stats: { runeEffect: 'vamp', silverAttack: 10 },
      },
      {
        id: 'rune_bleed',
        name: 'Руна Кровотечения',
        description: 'Вставляется в оружие: рассекает плоть врагов (+9 к атаке).',
        category: 'rune',
        rarity: 'rare',
        value: 85,
        quantity: 3,
        stats: { runeEffect: 'bleed', attack: 9, silverAttack: 9 },
      },
      {
        id: 'bp_bear_armor',
        name: 'Чертёж: Тяжёлый доспех Школы Медведя',
        description: 'Тяжёлые латы (Сет Медведя: +40% к броне, усиление Барьера и тяж. ударов).',
        category: 'blueprint',
        rarity: 'relic',
        value: 120,
        quantity: 1,
        craftsItemId: 'set_bear_armor',
        craftRecipe: [
          { itemId: 'iron_ore', count: 2 },
          { itemId: 'wolf_pelt', count: 1 },
        ],
      },
      {
        id: 'bp_flame_armor',
        name: 'Чертёж: Облачение Школы Пламени',
        description: 'Рунический доспех (Сет Пламени: +35% к урону Знаков, огненный шлейф).',
        category: 'blueprint',
        rarity: 'relic',
        value: 125,
        quantity: 1,
        craftsItemId: 'set_flame_armor',
        craftRecipe: [
          { itemId: 'iron_ore', count: 2 },
          { itemId: 'ghoul_blood', count: 1 },
        ],
      },
      {
        id: 'sword_temerian_silver',
        name: 'Мастерский серебряный клинок Зари',
        description: 'Реликвия старых мастеров с повышенным уроном по нечисти.',
        category: 'weapon',
        rarity: 'relic',
        value: 210,
        quantity: 1,
        upgradeLevel: 0,
        stats: { silverAttack: 36, signIntensity: 15 },
      },
    ];
  }

  public initSkillTree(): void {
    this.skills = [
      {
        id: 'skill_blade_mastery',
        branch: 'combat',
        name: 'Память тела',
        description: 'Увеличивает базовый урон быстрых и тяжёлых ударов мечом (+5 за уровень).',
        level: 0,
        maxLevel: 5,
        cost: 1,
      },
      {
        id: 'skill_crushing_blow',
        branch: 'combat',
        name: 'Сокрушительный натиск',
        description: 'Дополнительно усиливает все типы атак (+3 к урону за уровень).',
        level: 0,
        maxLevel: 3,
        cost: 1,
      },
      {
        id: 'skill_runic_focus',
        branch: 'signs',
        name: 'Мощь Рунных Знаков',
        description: 'Повышает интенсивность всех магических знаков на +15% за уровень.',
        level: 0,
        maxLevel: 5,
        cost: 1,
      },
      {
        id: 'skill_witcher_vitality',
        branch: 'alchemy',
        name: 'Мутация выносливости',
        description: 'Повышает максимальное здоровье на +25 и защиту на +3 за уровень.',
        level: 0,
        maxLevel: 5,
        cost: 1,
      },
    ];
  }

  private getItemDefinitions(): Record<string, Omit<GameItem, 'quantity'>> {
    return {
      monster_claw: {
        id: 'monster_claw',
        name: 'Коготь чудовища',
        description: 'Острый трофейный коготь для кузнечной ковки и алхимии.',
        category: 'resource',
        rarity: 'common',
        value: 18,
      },
      ghoul_blood: {
        id: 'ghoul_blood',
        name: 'Кровь упыря',
        description: 'Густая алхимическая субстанция для варки эликсиров.',
        category: 'resource',
        rarity: 'uncommon',
        value: 24,
      },
      wolf_pelt: {
        id: 'wolf_pelt',
        name: 'Волчья шкура',
        description: 'Прочная шкура лесного хищника для пошива ведьмачьих доспехов.',
        category: 'resource',
        rarity: 'common',
        value: 20,
      },
      cursed_essence: {
        id: 'cursed_essence',
        name: 'Трофей: Голова Болотной ведьмы',
        description: 'Даёт +15% к силе Знаков и +25 к Здоровью при экипировке на пояс.',
        category: 'trophy',
        rarity: 'relic',
        value: 120,
        equipped: true,
        stats: { signIntensity: 15, maxHealth: 25 },
      },
      demon_heart: {
        id: 'demon_heart',
        name: 'Трофей: Сердце Лесного демона',
        description: 'Древний трофей, дающий +10 к атаке и +40 к здоровью.',
        category: 'trophy',
        rarity: 'relic',
        value: 160,
        equipped: true,
        stats: { attack: 10, silverAttack: 10, maxHealth: 40 },
      },
      trophy_werewolf: {
        id: 'trophy_werewolf',
        name: 'Трофей: Клык Альфа-Воколака',
        description: 'Трофей на пояс за контракт «Вой в ночи»: +15% к шансу крит. удара и +12 к атаке.',
        category: 'trophy',
        rarity: 'relic',
        value: 180,
        equipped: true,
        stats: { critChanceBonus: 0.15, attack: 12, silverAttack: 12 },
      },
      trophy_noonwraith: {
        id: 'trophy_noonwraith',
        name: 'Трофей: Венок Полуденницы',
        description: 'Трофей на пояс за контракт «Невеста у колодца»: регенерация +4 ОЗ/сек и +20% к Знакам.',
        category: 'trophy',
        rarity: 'relic',
        value: 185,
        equipped: true,
        stats: { hpRegenBonus: 4, signIntensity: 20 },
      },
      trophy_gargoyle: {
        id: 'trophy_gargoyle',
        name: 'Трофей: Сердце Каменного Жнеца',
        description: 'Трофей на пояс за контракт «Каменный жнец»: +15% к находимому золоту и +12 к броне.',
        category: 'trophy',
        rarity: 'relic',
        value: 195,
        equipped: true,
        stats: { goldBonus: 0.15, defense: 12 },
      },
      king_crown_shard: {
        id: 'king_crown_shard',
        name: 'Корона Падшего Монарха',
        description: 'Королевская реликвия Древнего Хранителя (+20 к урону, +30% к Знакам).',
        category: 'trophy',
        rarity: 'relic',
        value: 350,
        equipped: true,
        stats: { attack: 20, silverAttack: 20, signIntensity: 30 },
      },
      relic_blade: {
        id: 'relic_blade',
        name: 'Клинок Старого Королевства',
        description: 'Легендарный двуручный меч Хранителя.',
        category: 'weapon',
        rarity: 'relic',
        value: 300,
        equipped: true,
        upgradeLevel: 1,
        stats: { attack: 35, silverAttack: 45 },
      },
      sword_catacombs_king: {
        id: 'sword_catacombs_king',
        name: 'Легендарный меч «Клятва Древних Королей»',
        description: 'Сокровище подземных катакомб: наносит колоссальный урон и усиливает Знаки.',
        category: 'weapon',
        rarity: 'relic',
        value: 380,
        equipped: true,
        upgradeLevel: 1,
        setId: 'flame',
        stats: { attack: 42, silverAttack: 52, signIntensity: 30, critChanceBonus: 0.15 },
      },
      sword_crimson_order: {
        id: 'sword_crimson_order',
        name: 'Освящённый клинок Алого Солнца',
        description: 'Фракционное оружие Инквизитора Лазаря (Акт II: +45 к атаке и огненная руна).',
        category: 'weapon',
        rarity: 'relic',
        value: 340,
        equipped: true,
        setId: 'flame',
        socketedRuneId: 'rune_fire',
        stats: { attack: 44, silverAttack: 46, signIntensity: 25, runeEffect: 'fire' },
      },
      sword_coven_protector: {
        id: 'sword_coven_protector',
        name: 'Рунный клинок Защитника Пади',
        description: 'Дар Старосты и Ковена за защиту деревни (Акт II: +46 к серебру и вампиризм).',
        category: 'weapon',
        rarity: 'relic',
        value: 340,
        equipped: true,
        setId: 'raven',
        socketedRuneId: 'rune_vamp',
        stats: { attack: 40, silverAttack: 48, critChanceBonus: 0.15, runeEffect: 'vamp' },
      },
      set_raven_armor: {
        id: 'set_raven_armor',
        name: 'Доспех Школы Ворона',
        description: 'Комплект Ворона (Тёмно-синяя кожа и вороненая сталь: +20% крит, +25% выносливость).',
        category: 'armor',
        rarity: 'relic',
        value: 220,
        equipped: true,
        setId: 'raven',
        stats: { defense: 18, maxHealth: 45, critChanceBonus: 0.1 },
      },
      set_raven_sword: {
        id: 'set_raven_sword',
        name: 'Клинок Школы Ворона',
        description: 'Стремительный клинок комплекта Школы Ворона.',
        category: 'weapon',
        rarity: 'relic',
        value: 230,
        equipped: true,
        setId: 'raven',
        stats: { attack: 28, silverAttack: 34, critChanceBonus: 0.1 },
      },
      set_bear_armor: {
        id: 'set_bear_armor',
        name: 'Тяжёлый доспех Школы Медведя',
        description: 'Комплект Медведя (Тяжёлые латы и мех: +40% к броне, усиление «Барьера»).',
        category: 'armor',
        rarity: 'relic',
        value: 260,
        equipped: true,
        setId: 'bear',
        stats: { defense: 28, maxHealth: 90 },
      },
      set_bear_sword: {
        id: 'set_bear_sword',
        name: 'Тяжёлый меч Школы Медведя',
        description: 'Мощный клинок комплекта Школы Медведя для сокрушительных ударов.',
        category: 'weapon',
        rarity: 'relic',
        value: 250,
        equipped: true,
        setId: 'bear',
        stats: { attack: 34, silverAttack: 38, defense: 8 },
      },
      set_flame_armor: {
        id: 'set_flame_armor',
        name: 'Рунический доспех Школы Пламени',
        description: 'Комплект Пламени (Багрово-золотые латы: +35% к урону всех Знаков и огненный шлейф).',
        category: 'armor',
        rarity: 'relic',
        value: 250,
        equipped: true,
        setId: 'flame',
        stats: { defense: 21, maxHealth: 60, signIntensity: 30 },
      },
      set_flame_sword: {
        id: 'set_flame_sword',
        name: 'Пламенный клинок Игниса',
        description: 'Рунический меч комплекта Школы Пламени.',
        category: 'weapon',
        rarity: 'relic',
        value: 255,
        equipped: true,
        setId: 'flame',
        socketedRuneId: 'rune_fire',
        stats: { attack: 30, silverAttack: 38, signIntensity: 25, runeEffect: 'fire' },
      },
      bp_bear_sword: {
        id: 'bp_bear_sword',
        name: 'Чертёж: Тяжёлый меч Школы Медведя',
        description: 'Позволяет выковать у кузнеца меч Школы Медведя.',
        category: 'blueprint',
        rarity: 'relic',
        value: 115,
        craftsItemId: 'set_bear_sword',
        craftRecipe: [
          { itemId: 'iron_ore', count: 2 },
          { itemId: 'monster_claw', count: 1 },
        ],
      },
      bp_flame_sword: {
        id: 'bp_flame_sword',
        name: 'Чертёж: Пламенный клинок Игниса',
        description: 'Позволяет выковать у кузнеца клинок Школы Пламени.',
        category: 'blueprint',
        rarity: 'relic',
        value: 120,
        craftsItemId: 'set_flame_sword',
        craftRecipe: [
          { itemId: 'iron_ore', count: 2 },
          { itemId: 'ghoul_blood', count: 1 },
        ],
      },
      rune_fire: {
        id: 'rune_fire',
        name: 'Рунический камень Огня (Игнис)',
        description: 'Вставляется в меч: придаёт лезвию огненное свечение и +8 к урону.',
        category: 'rune',
        rarity: 'rare',
        value: 75,
        stats: { runeEffect: 'fire', attack: 8, silverAttack: 8 },
      },
      rune_vamp: {
        id: 'rune_vamp',
        name: 'Руна Вампиризма (Мортана)',
        description: 'Вставляется в оружие: исцеляет героя на 5% от нанесённого урона.',
        category: 'rune',
        rarity: 'relic',
        value: 110,
        stats: { runeEffect: 'vamp', silverAttack: 10 },
      },
      rune_bleed: {
        id: 'rune_bleed',
        name: 'Руна Кровотечения',
        description: 'Вставляется в оружие: рассекает плоть врагов (+9 к атаке).',
        category: 'rune',
        rarity: 'rare',
        value: 85,
        stats: { runeEffect: 'bleed', attack: 9, silverAttack: 9 },
      },
      rune_ward: {
        id: 'rune_ward',
        name: 'Руна Защиты (Квен)',
        description: 'Вставляется в броню: повышает защиту на +8 и интенсивность Знаков на +12%.',
        category: 'rune',
        rarity: 'rare',
        value: 80,
        stats: { runeEffect: 'ward', defense: 8, signIntensity: 12 },
      },
      sword_hunter_steel: {
        id: 'sword_hunter_steel',
        name: 'Закалённый меч Вороньей Пади',
        description: 'Награда старосты Боримира за спасение деревни.',
        category: 'weapon',
        rarity: 'rare',
        value: 135,
        equipped: true,
        upgradeLevel: 0,
        stats: { attack: 24 },
      },
      sword_ancient_king: {
        id: 'sword_ancient_king',
        name: 'Серебряный клинок Династии',
        description: 'Древний королевский клинок, разящий любую нечисть.',
        category: 'weapon',
        rarity: 'relic',
        value: 280,
        equipped: true,
        upgradeLevel: 1,
        stats: { silverAttack: 42, signIntensity: 20 },
      },
      armor_royal_guard: {
        id: 'armor_royal_guard',
        name: 'Латы Королевской Гвардии',
        description: 'Реликвия из сокровищницы разрушенной крепости.',
        category: 'armor',
        rarity: 'relic',
        value: 240,
        equipped: true,
        upgradeLevel: 0,
        setId: 'bear',
        stats: { defense: 24, maxHealth: 80 },
      },
      amulet_abyss: {
        id: 'amulet_abyss',
        name: 'Рунный оберег Проклятого Алтаря',
        description: 'Укрощённая мощь святилища (+25% к Знакам и +30 ОЗ).',
        category: 'trophy',
        rarity: 'relic',
        value: 180,
        equipped: true,
        stats: { signIntensity: 25, maxHealth: 30 },
      },
      herb_swallow: {
        id: 'herb_swallow',
        name: 'Ласточкина трава',
        description: 'Целебное растение для алхимии и продажи.',
        category: 'resource',
        rarity: 'common',
        value: 12,
      },
      iron_ore: {
        id: 'iron_ore',
        name: 'Тёмная железная руда',
        description: 'Необходима кузнецу для закалки оружия и брони.',
        category: 'resource',
        rarity: 'common',
        value: 25,
      },
      potion_swallow: {
        id: 'potion_swallow',
        name: 'Эликсир «Ласточка»',
        description: 'Мгновенно восстанавливает 65 ед. здоровья в бою.',
        category: 'potion',
        rarity: 'uncommon',
        value: 35,
        stats: { healAmount: 65 },
      },
      potion_thunderbolt: {
        id: 'potion_thunderbolt',
        name: 'Эликсир «Гром»',
        description: '+35% к силе атаки на 45 сек и +40 ОЗ.',
        category: 'potion',
        rarity: 'rare',
        value: 50,
        stats: { healAmount: 40, staminaBoost: 70 },
      },
      potion_cat: {
        id: 'potion_cat',
        name: 'Эликсир «Кошка»',
        description: 'Ночное зрение в темноте и склепах на 60 сек.',
        category: 'potion',
        rarity: 'uncommon',
        value: 40,
        stats: { healAmount: 25 },
      },
      potion_blizzard: {
        id: 'potion_blizzard',
        name: 'Эликсир «Пурга»',
        description: 'Замедление времени при уклонении и +80 выносливости.',
        category: 'potion',
        rarity: 'rare',
        value: 55,
        stats: { staminaBoost: 80 },
      },
    };
  }

  public addItemById(itemId: string, count = 1): GameItem {
    const existing = this.items.find((i) => i.id === itemId);
    if (existing) {
      existing.quantity += count;
      return existing;
    }

    const definitions = this.getItemDefinitions();
    const def = definitions[itemId] ?? {
      id: itemId,
      name: 'Древний трофей',
      description: 'Предмет из Забытых земель.',
      category: 'resource',
      rarity: 'common',
      value: 15,
    };

    const newItem: GameItem = { ...def, quantity: count };
    this.items.push(newItem);
    return newItem;
  }

  public useQuickPotion(
    player: PlayerStats,
    maxHp: number,
    specificPotionId?: string
  ): { used: boolean; message: string } {
    if (player.potionCooldown > 0) {
      return { used: false, message: 'Эликсир ещё усваивается' };
    }
    if (player.toxicity >= player.maxToxicity - 10) {
      return { used: false, message: 'Слишком высокая интоксикация! Отдохните у костра.' };
    }

    const potion = specificPotionId
      ? this.items.find((i) => i.id === specificPotionId && i.quantity > 0)
      : this.items.find((i) => i.category === 'potion' && i.quantity > 0);

    if (!potion) {
      return { used: false, message: 'Нет эликсиров в инвентаре (Сварите в Алхимии [N])' };
    }

    potion.quantity -= 1;
    player.toxicity = Math.min(player.maxToxicity, (player.toxicity ?? 0) + 22);

    if (potion.stats?.healAmount) {
      player.hp = Math.min(maxHp, player.hp + potion.stats.healAmount);
    }
    if (potion.stats?.staminaBoost) {
      player.stamina = Math.min(
        player.maxStamina,
        player.stamina + potion.stats.staminaBoost
      );
    }

    if (potion.id === 'potion_thunderbolt') {
      player.thunderElixirTimer = 45;
    } else if (potion.id === 'potion_cat') {
      player.catElixirTimer = 60;
    } else if (potion.id === 'potion_blizzard') {
      player.blizzardElixirTimer = 40;
    }

    player.potionCooldown = 2.0;
    return { used: true, message: `Выпит эликсир: ${potion.name} (+22 Токсичности)` };
  }

  public brewElixir(
    elixirId: 'potion_swallow' | 'potion_thunderbolt' | 'potion_cat' | 'potion_blizzard'
  ): { ok: boolean; message: string } {
    const herb = this.items.find((i) => i.id === 'herb_swallow');
    if (!herb || herb.quantity < 1) {
      return { ok: false, message: 'Недостаточно Ласточкиной травы (нужно 1 шт.)' };
    }

    herb.quantity -= 1;
    const brewed = this.addItemById(elixirId, 2);
    return { ok: true, message: `Сварен эликсир: ${brewed.name} (x2)!` };
  }

  public craftBlueprint(
    blueprintId: string,
    player: PlayerStats
  ): { ok: boolean; message: string } {
    const bp = this.items.find((i) => i.id === blueprintId && i.category === 'blueprint');
    if (!bp || !bp.craftsItemId) {
      return { ok: false, message: 'Чертёж не найден' };
    }

    const goldCost = 70;
    if (player.gold < goldCost) {
      return { ok: false, message: `Недостаточно золота для работы кузнеца (${goldCost} крон)` };
    }

    const ore = this.items.find((i) => i.id === 'iron_ore');
    if (!ore || ore.quantity < 1) {
      return { ok: false, message: 'Нужна хотя бы 1 Тёмная железная руда' };
    }

    player.gold -= goldCost;
    ore.quantity -= 1;
    const crafted = this.addItemById(bp.craftsItemId, 1);
    crafted.equipped = true;
    return {
      ok: true,
      message: `Выковано по чертежу: ${crafted.name}!`,
    };
  }

  public socketRune(
    targetItemId: string,
    runeItemId: string
  ): { ok: boolean; message: string } {
    const target = this.items.find((i) => i.id === targetItemId);
    const rune = this.items.find((i) => i.id === runeItemId && i.category === 'rune');
    if (!target || (target.category !== 'weapon' && target.category !== 'armor')) {
      return { ok: false, message: 'Выберите оружие или броню для вставки руны' };
    }
    if (!rune || rune.quantity <= 0) {
      return { ok: false, message: 'Рунический камень отсутствует' };
    }

    rune.quantity -= 1;
    target.socketedRuneId = rune.id;
    target.stats = {
      ...target.stats,
      attack: (target.stats?.attack ?? 0) + (rune.stats?.attack ?? 0),
      silverAttack: (target.stats?.silverAttack ?? 0) + (rune.stats?.silverAttack ?? 0),
      defense: (target.stats?.defense ?? 0) + (rune.stats?.defense ?? 0),
      signIntensity: (target.stats?.signIntensity ?? 0) + (rune.stats?.signIntensity ?? 0),
      runeEffect: rune.stats?.runeEffect,
    };

    if (rune.quantity <= 0) {
      this.items = this.items.filter((i) => i.id !== rune.id);
    }

    return {
      ok: true,
      message: `${rune.name} инкрустирована в «${target.name}»!`,
    };
  }

  public toggleEquip(itemId: string): void {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;
    if (
      item.category === 'weapon' ||
      item.category === 'armor' ||
      item.category === 'trophy'
    ) {
      item.equipped = !item.equipped;
    }
  }

  public upgradeItem(
    itemId: string,
    player: PlayerStats
  ): { ok: boolean; message: string } {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || (item.category !== 'weapon' && item.category !== 'armor')) {
      return { ok: false, message: 'Этот предмет нельзя улучшить' };
    }

    const cost = getUpgradeCost(item);
    const ore = this.items.find((i) => i.id === 'iron_ore');
    const oreQty = ore?.quantity ?? 0;

    if (player.gold < cost.gold) {
      return { ok: false, message: `Недостаточно золота (нужно ${cost.gold})` };
    }
    if (oreQty < cost.oreCount) {
      return { ok: false, message: `Недостаточно железной руды (нужно ${cost.oreCount})` };
    }

    player.gold -= cost.gold;
    if (ore) ore.quantity -= cost.oreCount;
    item.upgradeLevel = (item.upgradeLevel ?? 0) + 1;

    return {
      ok: true,
      message: `${item.name} улучшен до ур. +${item.upgradeLevel}!`,
    };
  }

  public buyShopItem(
    shopItemId: string,
    player: PlayerStats
  ): { ok: boolean; message: string } {
    const shopItem = this.shopCatalog.find((i) => i.id === shopItemId);
    if (!shopItem) return { ok: false, message: 'Товар не найден' };
    if (player.gold < shopItem.value) {
      return { ok: false, message: 'Недостаточно золота' };
    }

    player.gold -= shopItem.value;
    const existing = this.items.find((i) => i.id === shopItem.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({
        ...shopItem,
        quantity: 1,
        equipped: shopItem.category === 'weapon' || shopItem.category === 'armor',
      });
    }
    return { ok: true, message: `Куплено: ${shopItem.name}` };
  }

  public sellInventoryItem(
    itemId: string,
    player: PlayerStats
  ): { ok: boolean; message: string } {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.quantity <= 0) return { ok: false, message: 'Предмет отсутствует' };

    const sellPrice = Math.max(5, Math.round(item.value * 0.6));
    player.gold += sellPrice;
    item.quantity -= 1;
    if (item.quantity <= 0) {
      this.items = this.items.filter((i) => i.id !== itemId);
    }
    return { ok: true, message: `Продано: ${item.name} (+${sellPrice} золота)` };
  }

  public unlockSkill(skillId: string, player: PlayerStats): boolean {
    const skill = this.skills.find((s) => s.id === skillId);
    if (!skill || skill.level >= skill.maxLevel || player.skillPoints < skill.cost) {
      return false;
    }
    player.skillPoints -= skill.cost;
    skill.level += 1;
    return true;
  }
}
