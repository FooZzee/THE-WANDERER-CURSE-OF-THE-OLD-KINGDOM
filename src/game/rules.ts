import type {
  BestiaryEntry,
  BiomeId,
  EnemyData,
  GameItem,
  MagicSignInfo,
  PlayerStats,
  Quest,
  SignType,
  SkillNode,
  WeatherType,
  WitcherSetId,
} from './types.ts';

export const MAGIC_SIGNS: Record<SignType, MagicSignInfo> = {
  flame: {
    id: 'flame',
    name: 'Пламя (Игнис)',
    runicName: 'IGNIS',
    description: 'Выпускает огненную волну перед героем, нанося урон и поджигая врагов.',
    staminaCost: 35,
    cooldown: 4.0,
    color: '#f97316',
    hexColor: 0xf97316,
  },
  barrier: {
    id: 'barrier',
    name: 'Барьер (Эгида)',
    runicName: 'AEGIS',
    description: 'Создаёт защитную руническую оболочку, поглощающую входящий урон.',
    staminaCost: 40,
    cooldown: 7.0,
    color: '#eab308',
    hexColor: 0xeab308,
  },
  impulse: {
    id: 'impulse',
    name: 'Импульс (Аард)',
    runicName: 'IMPULSE',
    description: 'Телекинетический удар, отбрасывающий и оглушающий противников.',
    staminaCost: 30,
    cooldown: 5.0,
    color: '#38bdf8',
    hexColor: 0x38bdf8,
  },
  illusion: {
    id: 'illusion',
    name: 'Иллюзия (Морок)',
    runicName: 'MOROK',
    description: 'Туманит разум врагов поблизости, отвлекая их и прерывая агрессию.',
    staminaCost: 35,
    cooldown: 8.0,
    color: '#a855f7',
    hexColor: 0xa855f7,
  },
  frost: {
    id: 'frost',
    name: 'Ледяная печать',
    runicName: 'GLACIES',
    description: 'Чертит на земле морозный круг, резко замедляющий и сковывающий врагов.',
    staminaCost: 35,
    cooldown: 6.5,
    color: '#2dd4bf',
    hexColor: 0x2dd4bf,
  },
};

export const BESTIARY_ENTRIES: BestiaryEntry[] = [
  {
    id: 'bestiary_wolf',
    type: 'wolf',
    name: 'Серый и Матерый Волк Чёрной Росы',
    title: 'Хищники Старого леса Вальдмарка',
    category: 'Звери',
    lore: 'Оголодавшие лесные стаи Вальдмарка, испившие Чёрной Росы после Ночи Пепельного Затмения. Координируют атаки: стоит одному волку заметить путника, как вся стая бросается в погоню и совершает стремительные прыжки к горлу.',
    weaknessSigns: ['Пламя (Игнис)', 'Импульс (Аард)'],
    weaknessOil: 'Стальной клинок',
    trophyBonus: 'Волчья шкура (ресурс для брони Школ)',
    dangerLevel: 1,
  },
  {
    id: 'bestiary_ghoul',
    type: 'ghoul',
    name: 'Упырь-падальщик Затмения',
    title: 'Трупоеды лесных чащоб и трактов',
    category: 'Трупоеды',
    lore: 'Бывшие мародёры и крестьяне Вальдмарка, чьи тела после Затмения исказила Чёрная Роса. Ведомые запахом Тлеющей Крови, в ближнем бою обрушивают яростную серию из трёх быстрых ударов когтями.',
    weaknessSigns: ['Пламя (Игнис)', 'Ледяная печать (Ирден)'],
    weaknessOil: 'Масло против трупоедов (+30% урона)',
    trophyBonus: 'Кровь упыря и когти монстра',
    dangerLevel: 2,
  },
  {
    id: 'bestiary_hag',
    type: 'hag',
    name: 'Болотная ведьма Морана',
    title: 'Отступница Лесного Ковена',
    category: 'Реликты и Ведьмы',
    lore: 'Древняя ведунья топей, предавшая Лесной Ковен ради осколка Сердца Пустоты. Держит дистанцию, мечет сгустки болотной порчи и растворяется в тумане при попытке подойти вплотную.',
    weaknessSigns: ['Ледяная печать (Ирден)', 'Импульс (Аард)'],
    weaknessOil: 'Масло против проклятых (+30% урона)',
    trophyBonus: 'Проклятая эссенция',
    dangerLevel: 3,
  },
  {
    id: 'bestiary_werewolf',
    type: 'werewolf',
    name: 'Альфа-Воколак («Вой в ночи»)',
    title: 'Именной монстр по контракту',
    category: 'Проклятые',
    lore: 'Королевский ловчий Вальдмарка, обращённый Чёрной Росой в чудовищного оборотня. Его плоть мгновенно затягивает раны, пока зверь не охвачен огнём Печати «Пламя». На половине здоровья созывает волчью стаю.',
    weaknessSigns: ['Пламя (Игнис) — блокирует регенерацию'],
    weaknessOil: 'Масло против проклятых (+30% урона)',
    trophyBonus: 'Трофей Альфа-Воколака (+15% шанс крит. удара)',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_noonwraith',
    type: 'noonwraith',
    name: 'Полуденница Аделина («Невеста у колодца»)',
    title: 'Именной призрак заброшенного хутора',
    category: 'Призраки',
    lore: 'Неупокоенный дух невесты Аделины, преданной женихом в дни Затмения. В бою уходит в астральную форму и становится неуязвимой для серебра, пока не попадёт в круг «Ледяной печати» или под волну «Импульса».',
    weaknessSigns: ['Ледяная печать (Ирден)', 'Импульс (Аард) — снимают астрал'],
    weaknessOil: 'Масло против призраков (+30% урона)',
    trophyBonus: 'Трофей Полуденницы (+4 ОЗ/сек регенерация)',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_gargoyle',
    type: 'gargoyle',
    name: 'Древняя Горгулья («Каменный жнец»)',
    title: 'Именной страж королевских руин',
    category: 'Конструкты',
    lore: 'Ожившая в Ночь Пепельного Затмения гранитная статуя крепости Вальдмарка. Её каменный панцирь отражает быстрые выпады спереди — пробить броню способны лишь тяжёлые удары и атаки в спину.',
    weaknessSigns: ['Барьер (Квен)', 'Импульс (Аард)'],
    weaknessOil: 'Масло против призраков и реликтов (+30% урона)',
    trophyBonus: 'Трофей Горгульи (+15% к находимому золоту)',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_demon',
    type: 'demon',
    name: 'Лесной Архидемон Бездны',
    title: 'Рогатый страж Разрушенной крепости',
    category: 'Реликты',
    lore: 'Порождение разлома под Королевской Горой, вышедшее на поверхность в час Затмения. Наносит сокрушительные удары по площади (AoE), перед которыми земля вокруг него раскаляется багровым кругом.',
    weaknessSigns: ['Барьер (Квен)', 'Ледяная печать (Ирден)'],
    weaknessOil: 'Масло против проклятых (+30% урона)',
    trophyBonus: 'Сердце демона',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_boss',
    type: 'boss',
    name: 'Древний Хранитель Короны',
    title: 'Страж тронного зала Вальдмарка (Акт I)',
    category: 'Боссы',
    lore: 'Закованный в реликтовые латы лорд-командор королевской гвардии Малакора, принесённый в жертву Сердцу Пустоты. Во второй фазе боя (<50% ОЗ) впадает в пепельную ярость и обрушивает веер энергетических волн.',
    weaknessSigns: ['Барьер (Квен)', 'Пламя (Игнис)', 'Иллюзия (Аксий)'],
    weaknessOil: 'Масло против призраков и реликтов',
    trophyBonus: 'Осколок Древней Короны и Клинок Старого Королевства',
    dangerLevel: 5,
  },
  {
    id: 'bestiary_malakor',
    type: 'malakor',
    name: 'Король-Лич Малакор Бессмертный',
    title: 'Последний монарх Вальдмарка (Акт II)',
    category: 'Владыка Проклятия',
    lore: 'Последний король династии Вальдмарка, заключивший пакт с «Сердцем Пустоты» в Ночь Пепельного Затмения. Сражается в 3 фазах: в 1-й рубит руническим двуручником, во 2-й укрывается щитом филактерий и бьёт метеоритами, а в 3-й обрушивает бурю молний Пустоты.',
    weaknessSigns: ['Барьер (Квен)', 'Импульс (Аард)', 'Пламя (Игнис)'],
    weaknessOil: 'Масло против призраков (+30% урона)',
    trophyBonus: 'Корона Падшего Короля Малакора',
    dangerLevel: 5,
  },
];

/**
 * Deterministic procedural ground height function for the entire region.
 * Flat around the central village and key arenas so buildings sit flush.
 */
export function getGroundHeight(x: number, z: number): number {
  // Underground Catacombs chamber at (x > 80, z > 80)
  if (x > 75 && z > 75) {
    return 0;
  }

  // Distance from village center (0, 0)
  const distVillage = Math.hypot(x, z);
  // Distance from Cursed Sanctuary (-65, -55)
  const distSanctuary = Math.hypot(x - -65, z - -55);
  // Distance from Ruined Fortress (72, -68)
  const distFortress = Math.hypot(x - 72, z - -68);
  // Distance from Ash Cemetery & Order Camp (0, 74)
  const distCemetery = Math.hypot(x - 0, z - 74);

  // Smoothly flatten key architectural hubs
  const villageFlat = Math.min(1, Math.max(0, (distVillage - 24) / 18));
  const sanctuaryFlat = Math.min(1, Math.max(0, (distSanctuary - 16) / 12));
  const fortressFlat = Math.min(1, Math.max(0, (distFortress - 22) / 14));
  const cemeteryFlat = Math.min(1, Math.max(0, (distCemetery - 20) / 12));

  const flattenFactor = villageFlat * sanctuaryFlat * fortressFlat * cemeteryFlat;

  // River valley cutting from (-120, 32) to (120, 32)
  const riverDist = Math.abs(z - (34 + Math.sin(x * 0.03) * 6));
  const riverDepression = riverDist < 8 ? -1.4 * Math.cos((riverDist / 8) * (Math.PI / 2)) : 0;

  // Bridge over river at x in [-4, 4]
  const onBridge = Math.abs(x) < 4.5 && riverDist < 8.5;
  if (onBridge) {
    return 0.35;
  }

  const hills =
    Math.sin(x * 0.035) * Math.cos(z * 0.035) * 2.2 +
    Math.sin(x * 0.08 + z * 0.06) * 0.75;

  // Elevated plateau for Ruined Fortress
  const fortressElevation =
    distFortress < 34 ? (1 - Math.min(1, Math.max(0, (distFortress - 18) / 16))) * 2.8 : 0;

  return hills * flattenFactor + riverDepression * villageFlat + fortressElevation;
}

/**
 * Determines which biome the coordinates belong to.
 */
export function getBiomeAt(x: number, z: number): { id: BiomeId; name: string } {
  if (x > 75 && z > 75) {
    return { id: 'catacombs', name: 'Подземные Катакомбы Древних Королей' };
  }
  if (Math.hypot(x, z) < 30) {
    return { id: 'village', name: 'Деревня Воронья Падь' };
  }
  if (Math.hypot(x - -65, z - -55) < 28) {
    return { id: 'cursed_sanctuary', name: 'Проклятое святилище' };
  }
  if (Math.hypot(x - 72, z - -68) < 34) {
    return { id: 'ruined_fortress', name: 'Разрушенная крепость' };
  }
  if (z > 48 && Math.abs(x) < 55) {
    return { id: 'ash_cemetery', name: 'Пепельный Погост и Лагерь Ордена' };
  }
  if (x < -15 && z > -25) {
    return { id: 'old_forest', name: 'Старый лес' };
  }
  return { id: 'forgotten_lands', name: 'Забытые земли' };
}

/**
 * Checks if a target position is within a melee swing hitbox cone.
 */
export function isTargetInAttackCone(
  attackerX: number,
  attackerZ: number,
  attackerRotationY: number,
  targetX: number,
  targetZ: number,
  reach: number,
  halfAngleRad: number
): boolean {
  const dx = targetX - attackerX;
  const dz = targetZ - attackerZ;
  const dist = Math.hypot(dx, dz);
  if (dist > reach) return false;
  if (dist < 0.35) return true; // Point-blank contact

  const forwardX = Math.sin(attackerRotationY);
  const forwardZ = Math.cos(attackerRotationY);

  const dirX = dx / dist;
  const dirZ = dz / dist;

  const dot = forwardX * dirX + forwardZ * dirZ;
  const clampedDot = Math.max(-1, Math.min(1, dot));
  const angle = Math.acos(clampedDot);

  return angle <= halfAngleRad;
}

/**
 * Calculates effective player combat stats taking equipped items, Witcher Set bonuses,
 * Trophy passives, socketed Runes, Elixirs, and skill tree into account.
 */
export function computeEffectivePlayerStats(
  base: PlayerStats,
  inventory: GameItem[],
  skills: SkillNode[]
): {
  steelAttack: number;
  silverAttack: number;
  defense: number;
  maxHp: number;
  signIntensity: number;
  critChance: number;
  goldBonus: number;
  hpRegen: number;
  activeSet: WitcherSetId | null;
  bossDamageMultiplier: number;
} {
  let steelBonus = 0;
  let silverBonus = 0;
  let defenseBonus = 0;
  let hpBonus = 0;
  let signBonus = 0;
  let critChance = 0.1; // 10% base crit chance
  let goldBonus = 0;
  let hpRegen = 0;

  const setCounts: Record<WitcherSetId, number> = {
    raven: 0,
    bear: 0,
    flame: 0,
  };

  for (const item of inventory) {
    if (!item.equipped || !item.stats) continue;
    if (item.setId) {
      setCounts[item.setId] = (setCounts[item.setId] ?? 0) + 1;
    }
    const upgMult = 1 + (item.upgradeLevel ?? 0) * 0.15;
    if (item.stats.attack) steelBonus += Math.round(item.stats.attack * upgMult);
    if (item.stats.silverAttack) silverBonus += Math.round(item.stats.silverAttack * upgMult);
    if (item.stats.defense) defenseBonus += Math.round(item.stats.defense * upgMult);
    if (item.stats.maxHealth) hpBonus += Math.round(item.stats.maxHealth * upgMult);
    if (item.stats.signIntensity) signBonus += Math.round(item.stats.signIntensity * upgMult);
    if (item.stats.critChanceBonus) critChance += item.stats.critChanceBonus;
    if (item.stats.goldBonus) goldBonus += item.stats.goldBonus;
    if (item.stats.hpRegenBonus) hpRegen += item.stats.hpRegenBonus;
  }

  let activeSet: WitcherSetId | null = null;
  if (setCounts.raven >= 2) activeSet = 'raven';
  else if (setCounts.bear >= 2) activeSet = 'bear';
  else if (setCounts.flame >= 2) activeSet = 'flame';

  if (activeSet === 'raven') {
    critChance += 0.2;
  } else if (activeSet === 'bear') {
    defenseBonus = Math.round(defenseBonus * 1.4) + 8;
    hpBonus += 55;
  } else if (activeSet === 'flame') {
    signBonus += 35;
  }

  const combatSkill = skills.find((s) => s.id === 'skill_blade_mastery')?.level ?? 0;
  const heavySkill = skills.find((s) => s.id === 'skill_crushing_blow')?.level ?? 0;
  const signSkill = skills.find((s) => s.id === 'skill_runic_focus')?.level ?? 0;
  const vitalitySkill = skills.find((s) => s.id === 'skill_witcher_vitality')?.level ?? 0;

  let totalSteel = base.baseAttack + steelBonus + combatSkill * 5 + heavySkill * 3;
  let totalSilver = base.baseAttack + silverBonus + combatSkill * 5 + heavySkill * 3;

  // Thunder Elixir ("Гром"): +35% attack
  if ((base.thunderElixirTimer ?? 0) > 0) {
    totalSteel = Math.round(totalSteel * 1.35);
    totalSilver = Math.round(totalSilver * 1.35);
  }

  const totalDefense = base.baseDefense + defenseBonus + vitalitySkill * 3;
  const totalMaxHp = base.maxHp + hpBonus + vitalitySkill * 25;
  const placeOfPowerBuff = (base.placeOfPowerTimer ?? 0) > 0 ? 25 : 0;
  const totalSignIntensity = base.signIntensity + signBonus + signSkill * 15 + placeOfPowerBuff;

  // «Хранитель Памяти Вальдмарка»: +15% damage against bosses when all 12 lore texts are collected
  const isLoreMaster =
    Boolean(base.loreMasterUnlocked) || (base.discoveredLoreIds?.length ?? 0) >= 12;
  const bossDamageMultiplier = isLoreMaster ? 1.15 : 1.0;

  return {
    steelAttack: totalSteel,
    silverAttack: totalSilver,
    defense: totalDefense,
    maxHp: totalMaxHp,
    signIntensity: totalSignIntensity,
    critChance,
    goldBonus,
    hpRegen,
    activeSet,
    bossDamageMultiplier,
  };
}

/**
 * Calculates damage dealt by player to an enemy.
 */
export function calculatePlayerAttackDamage(params: {
  steelAttack: number;
  silverAttack: number;
  isHeavy: boolean;
  comboStep: number; // 1, 2, 3
  enemy: Pick<EnemyData, 'isSilverVulnerable' | 'state'> &
    Partial<Pick<EnemyData, 'type' | 'isContractBoss'>>;
  bossDamageMultiplier?: number;
}): number {
  const baseDmg = params.enemy.isSilverVulnerable ? params.silverAttack : params.steelAttack;
  const heavyMult = params.isHeavy ? 1.75 : 1.0;
  const comboMult = 1 + (Math.max(1, Math.min(3, params.comboStep)) - 1) * 0.15;
  const stunBonus = params.enemy.state === 'STUNNED' ? 1.25 : 1.0;

  const isBossEnemy =
    params.enemy.isContractBoss ||
    params.enemy.type === 'boss' ||
    params.enemy.type === 'malakor' ||
    params.enemy.type === 'werewolf' ||
    params.enemy.type === 'noonwraith' ||
    params.enemy.type === 'gargoyle' ||
    params.enemy.type === 'demon' ||
    params.enemy.type === 'hag';

  const bossMult =
    isBossEnemy && params.bossDamageMultiplier ? params.bossDamageMultiplier : 1.0;

  return Math.max(1, Math.round(baseDmg * heavyMult * comboMult * stunBonus * bossMult));
}

/**
 * Calculates incoming damage to player after armor defense, block, dodge, and Barrier Sign.
 */
export function calculateIncomingPlayerDamage(params: {
  rawDamage: number;
  defense: number;
  isDodging: boolean;
  isBlocking: boolean;
  barrierShield: number;
}): {
  hpDamage: number;
  remainingBarrier: number;
  parried: boolean;
  dodged: boolean;
} {
  if (params.isDodging) {
    return {
      hpDamage: 0,
      remainingBarrier: params.barrierShield,
      parried: false,
      dodged: true,
    };
  }

  let mitigated = Math.max(2, params.rawDamage - params.defense * 0.45);
  let parried = false;

  if (params.isBlocking) {
    mitigated *= 0.25;
    parried = true;
  }

  mitigated = Math.round(mitigated);

  if (params.barrierShield > 0) {
    if (params.barrierShield >= mitigated) {
      return {
        hpDamage: 0,
        remainingBarrier: params.barrierShield - mitigated,
        parried,
        dodged: false,
      };
    } else {
      const leftover = mitigated - params.barrierShield;
      return {
        hpDamage: leftover,
        remainingBarrier: 0,
        parried,
        dodged: false,
      };
    }
  }

  return {
    hpDamage: mitigated,
    remainingBarrier: 0,
    parried,
    dodged: false,
  };
}

/**
 * Applies XP and handles multi-level-up progression.
 */
export function applyExperienceGain(
  stats: PlayerStats,
  gainedXp: number
): { updated: PlayerStats; leveledUp: boolean } {
  const next = { ...stats, xp: stats.xp + gainedXp };
  let leveledUp = false;

  while (next.xp >= next.xpToNext) {
    next.xp -= next.xpToNext;
    next.level += 1;
    next.xpToNext = Math.round(next.xpToNext * 1.45);
    next.skillPoints += 1;
    next.maxHp += 20;
    next.hp = next.maxHp;
    next.maxStamina += 10;
    next.stamina = next.maxStamina;
    next.baseAttack += 4;
    next.baseDefense += 2;
    leveledUp = true;
  }

  return { updated: next, leveledUp };
}

/**
 * Calculates blacksmith upgrade cost for an item.
 */
export function getUpgradeCost(item: GameItem): { gold: number; oreCount: number } {
  const level = item.upgradeLevel ?? 0;
  return {
    gold: 60 + level * 55,
    oreCount: 1 + Math.floor(level / 2),
  };
}

/**
 * Advances a quest stage and returns whether the stage or entire quest completed.
 */
export function advanceQuestStage(
  quest: Quest,
  stageId: string
): { updatedQuest: Quest; stageCompleted: boolean; questCompleted: boolean } {
  if (quest.status !== 'active') {
    return { updatedQuest: quest, stageCompleted: false, questCompleted: false };
  }

  const currentStage = quest.stages[quest.currentStageIndex];
  if (!currentStage || currentStage.id !== stageId) {
    return { updatedQuest: quest, stageCompleted: false, questCompleted: false };
  }

  const newStages = quest.stages.map((s, idx) =>
    idx === quest.currentStageIndex ? { ...s, completed: true } : s
  );

  const nextIndex = quest.currentStageIndex + 1;
  const isFinished = nextIndex >= newStages.length;

  return {
    updatedQuest: {
      ...quest,
      stages: newStages,
      currentStageIndex: isFinished ? quest.currentStageIndex : nextIndex,
      status: isFinished ? 'completed' : 'active',
    },
    stageCompleted: true,
    questCompleted: isFinished,
  };
}

/**
 * Evaluates a 5-dice hand in "Кости Судьбы" (Dice Poker).
 */
export function evaluateDicePokerHand(dice: number[]): {
  rank: number;
  name: string;
  score: number;
} {
  const counts = new Map<number, number>();
  let sum = 0;
  for (const d of dice) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
    sum += d;
  }
  const freqs = Array.from(counts.values()).sort((a, b) => b - a);
  const uniqueSorted = Array.from(counts.keys()).sort((a, b) => a - b);
  const isStraight =
    uniqueSorted.length === 5 && uniqueSorted[4] - uniqueSorted[0] === 4;

  if (freqs[0] === 5) return { rank: 8, name: 'Покер (5 одинаковых)', score: 800 + sum };
  if (freqs[0] === 4) return { rank: 7, name: 'Каре (4 одинаковых)', score: 700 + sum };
  if (freqs[0] === 3 && freqs[1] === 2) return { rank: 6, name: 'Фулл-хаус (3 + 2)', score: 600 + sum };
  if (isStraight) return { rank: 5, name: 'Стрит (5 по порядку)', score: 500 + sum };
  if (freqs[0] === 3) return { rank: 4, name: 'Сет (Тройка)', score: 400 + sum };
  if (freqs[0] === 2 && freqs[1] === 2) return { rank: 3, name: 'Две пары', score: 300 + sum };
  if (freqs[0] === 2) return { rank: 2, name: 'Пара', score: 200 + sum };
  return { rank: 1, name: 'Старшая кость', score: 100 + sum };
}

export const BESTIARY_DATA = BESTIARY_ENTRIES;

export interface AlchemyRecipe {
  id: 'potion_swallow' | 'potion_thunderbolt' | 'potion_cat' | 'potion_blizzard';
  name: string;
  description: string;
  ingredients: { itemId: string; name: string; count: number }[];
}

export const ALCHEMY_RECIPES: AlchemyRecipe[] = [
  {
    id: 'potion_swallow',
    name: 'Эликсир «Ласточка» (x2)',
    description: 'Восстанавливает 65 ед. здоровья в бою (+22 Токсичности).',
    ingredients: [{ itemId: 'herb_swallow', name: 'Ласточкина трава', count: 1 }],
  },
  {
    id: 'potion_thunderbolt',
    name: 'Эликсир «Гром» (x2)',
    description: 'Повышает урон мечом на +35% на 45 сек и лечит +40 ОЗ (+22 Токсичности).',
    ingredients: [{ itemId: 'herb_swallow', name: 'Ласточкина трава', count: 1 }],
  },
  {
    id: 'potion_cat',
    name: 'Эликсир «Кошка» (x2)',
    description: 'Дарует ночное зрение в темноте и склепах на 60 сек (+22 Токсичности).',
    ingredients: [{ itemId: 'herb_swallow', name: 'Ласточкина трава', count: 1 }],
  },
  {
    id: 'potion_blizzard',
    name: 'Эликсир «Пурга» (x2)',
    description: 'Мгновенно восстанавливает +80 выносливости (+22 Токсичности).',
    ingredients: [{ itemId: 'herb_swallow', name: 'Ласточкина трава', count: 1 }],
  },
];

export function rollDiceArray(count = 5): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

export function evaluateDiceHand(dice: number[]): {
  rank: number;
  label: string;
  score: number;
} {
  const res = evaluateDicePokerHand(dice);
  return { rank: res.rank, label: res.name, score: res.score };
}

export function createInitialDicePokerState(opponentName: string, bet: number) {
  return {
    opponentName,
    bet,
    playerDice: [1, 2, 3, 4, 5],
    npcDice: [1, 2, 3, 4, 5],
    selectedForReroll: [false, false, false, false, false],
    stage: 'betting' as const,
    playerHandLabel: 'Готов к броску',
    npcHandLabel: 'Готов к броску',
    message: `Нажмите «Бросить кости», чтобы поставить ${bet} крон и начать партию.`,
  };
}

export function pickNpcRerollIndices(npcDice: number[]): number[] {
  const counts = new Map<number, number>();
  for (const d of npcDice) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const indices: number[] = [];
  npcDice.forEach((val, idx) => {
    if ((counts.get(val) ?? 0) === 1 && val < 5) {
      indices.push(idx);
    }
  });
  return indices;
}

export function resolveDicePokerOutcome(
  playerDice: number[],
  npcDice: number[],
  bet: number
): {
  winner: 'player' | 'npc' | 'draw';
  goldDelta: number;
  playerEval: { rank: number; label: string; score: number };
  npcEval: { rank: number; label: string; score: number };
  summary: string;
} {
  const playerEval = evaluateDiceHand(playerDice);
  const npcEval = evaluateDiceHand(npcDice);
  if (playerEval.score > npcEval.score) {
    return {
      winner: 'player',
      goldDelta: bet,
      playerEval,
      npcEval,
      summary: `Победа! Ваша комбинация «${playerEval.label}» старше «${npcEval.label}». Выигрыш: +${bet} крон!`,
    };
  }
  if (npcEval.score > playerEval.score) {
    return {
      winner: 'npc',
      goldDelta: -bet,
      playerEval,
      npcEval,
      summary: `Поражение. У соперника «${npcEval.label}» против вашей «${playerEval.label}» (-${bet} крон).`,
    };
  }
  return {
    winner: 'draw',
    goldDelta: 0,
    playerEval,
    npcEval,
    summary: `Ничья («${playerEval.label}»)! Ставка сохранена.`,
  };
}

export interface WeatherPreset {
  id: WeatherType;
  label: string;
  announcement: string;
  fogDensity: number;
  sunIntensityMultiplier: number;
  hemiIntensityMultiplier: number;
  skyTintHex: number;
  rainIntensity: number;
  mistIntensity: number;
  windStrength: number;
  groundRoughness: number;
}

export const WEATHER_PRESETS: Record<WeatherType, WeatherPreset> = {
  clear: {
    id: 'clear',
    label: 'Ясно',
    announcement: 'Тучи рассеялись — над долиной установилась ясная погода.',
    fogDensity: 0.007,
    sunIntensityMultiplier: 1.15,
    hemiIntensityMultiplier: 1.1,
    skyTintHex: 0x3b526b,
    rainIntensity: 0,
    mistIntensity: 0.15,
    windStrength: 0.2,
    groundRoughness: 0.92,
  },
  fog: {
    id: 'fog',
    label: 'Туман',
    announcement: 'С болот и реки поднимается густой мистический туман.',
    fogDensity: 0.021,
    sunIntensityMultiplier: 0.68,
    hemiIntensityMultiplier: 0.82,
    skyTintHex: 0x26313a,
    rainIntensity: 0,
    mistIntensity: 1.0,
    windStrength: 0.35,
    groundRoughness: 0.84,
  },
  rain: {
    id: 'rain',
    label: 'Дождь',
    announcement: 'Небо затянуло свинцовыми тучами — начался холодный ливень.',
    fogDensity: 0.0155,
    sunIntensityMultiplier: 0.52,
    hemiIntensityMultiplier: 0.72,
    skyTintHex: 0x151e28,
    rainIntensity: 1.0,
    mistIntensity: 0.55,
    windStrength: 1.0,
    groundRoughness: 0.52,
  },
};

export const WEATHER_CYCLE_ORDER: WeatherType[] = ['clear', 'fog', 'rain'];

export function getNextWeatherState(current: WeatherType): WeatherType {
  const idx = WEATHER_CYCLE_ORDER.indexOf(current);
  if (idx === -1) return 'clear';
  return WEATHER_CYCLE_ORDER[(idx + 1) % WEATHER_CYCLE_ORDER.length];
}

export function interpolateWeatherMetrics(
  from: WeatherType,
  to: WeatherType,
  blend: number
): {
  fogDensity: number;
  sunIntensityMultiplier: number;
  hemiIntensityMultiplier: number;
  rainIntensity: number;
  mistIntensity: number;
  windStrength: number;
  groundRoughness: number;
} {
  const t = Math.max(0, Math.min(1, blend));
  // Smoothstep easing for atmospheric transitions
  const s = t * t * (3 - 2 * t);
  const a = WEATHER_PRESETS[from] ?? WEATHER_PRESETS.clear;
  const b = WEATHER_PRESETS[to] ?? WEATHER_PRESETS.clear;

  const lerp = (v0: number, v1: number) => v0 + (v1 - v0) * s;

  return {
    fogDensity: lerp(a.fogDensity, b.fogDensity),
    sunIntensityMultiplier: lerp(a.sunIntensityMultiplier, b.sunIntensityMultiplier),
    hemiIntensityMultiplier: lerp(a.hemiIntensityMultiplier, b.hemiIntensityMultiplier),
    rainIntensity: lerp(a.rainIntensity, b.rainIntensity),
    mistIntensity: lerp(a.mistIntensity, b.mistIntensity),
    windStrength: lerp(a.windStrength, b.windStrength),
    groundRoughness: lerp(a.groundRoughness, b.groundRoughness),
  };
}

/**
 * Pure helper for unlocking a world lore note / codex entry:
 * - Grants +25 XP on first discovery
 * - Unlocks the «Хранитель Памяти Вальдмарка» (+15% boss damage) talent when all 12 notes are found
 */
export function discoverLoreEntry(
  stats: PlayerStats,
  noteId: string,
  totalNotesCount = 12
): {
  updated: PlayerStats;
  newlyDiscovered: boolean;
  leveledUp: boolean;
  unlockedLoreMaster: boolean;
} {
  const existing = stats.discoveredLoreIds ?? [];
  if (existing.includes(noteId)) {
    return {
      updated: stats,
      newlyDiscovered: false,
      leveledUp: false,
      unlockedLoreMaster: false,
    };
  }

  const nextList = [...existing, noteId];
  const xpRes = applyExperienceGain(stats, 25);
  const reachedAll = nextList.length >= totalNotesCount;
  const unlockedLoreMaster = reachedAll && !stats.loreMasterUnlocked;

  return {
    updated: {
      ...xpRes.updated,
      discoveredLoreIds: nextList,
      loreMasterUnlocked: Boolean(stats.loreMasterUnlocked || reachedAll),
    },
    newlyDiscovered: true,
    leveledUp: xpRes.leveledUp,
    unlockedLoreMaster,
  };
}



