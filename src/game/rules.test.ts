import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceQuestStage,
  applyExperienceGain,
  calculateIncomingPlayerDamage,
  calculateMerchantPrice,
  calculatePlayerAttackDamage,
  COMPANION_PROFILES,
  computeEffectivePlayerStats,
  computeNpcSchedule,
  discoverLoreEntry,
  enforceExclusiveEquipment,
  getBiomeAt,
  getCompanionCommandLabel,
  getGroundHeight,
  getItemEquipSlot,
  getNextCompanionCommand,
  getNextWeatherState,
  getReputationInfo,
  getSwordEffectiveness,
  interpolateWeatherMetrics,
  INVESTIGATION_QUEST_CHOICES,
  isTargetInAttackCone,
  MAGIC_SIGNS,
  resolveInvestigationQuestChoice,
  resolveSlidingCollision,
  validateAshExamRitual,
  WEATHER_PRESETS,
} from './rules.ts';
import { CODEX_ARTICLES, PROLOGUE_SLIDES, WORLD_LORE_NOTES } from './loreData.ts';
import type { GameItem, PlayerStats, Quest, SignType, SkillNode } from './types.ts';

test('MAGIC_SIGNS defines all 5 signs with valid staminaCost and cooldown', () => {
  const expected: SignType[] = ['flame', 'barrier', 'impulse', 'illusion', 'frost'];
  for (const signId of expected) {
    const sign = MAGIC_SIGNS[signId];
    assert.ok(sign, `Sign ${signId} must be defined`);
    assert.ok(sign.staminaCost > 0, `Sign ${signId} must have positive staminaCost`);
    assert.ok(sign.cooldown > 0, `Sign ${signId} must have positive cooldown`);
    assert.ok(sign.name.length > 0);
  }
});

test('getGroundHeight returns flat elevation near village center and bridge', () => {
  const hCenter = getGroundHeight(0, 0);
  assert.equal(hCenter, 0);
  const hBridge = getGroundHeight(0, 34);
  assert.equal(hBridge, 0.35);
});

test('getBiomeAt classifies major game regions accurately', () => {
  assert.equal(getBiomeAt(0, 0).id, 'village');
  assert.equal(getBiomeAt(-65, -55).id, 'cursed_sanctuary');
  assert.equal(getBiomeAt(72, -68).id, 'ruined_fortress');
  assert.equal(getBiomeAt(-45, 10).id, 'old_forest');
  assert.equal(getBiomeAt(40, 20).id, 'forgotten_lands');
});

test('isTargetInAttackCone validates melee range and angle accurately', () => {
  // Attacker at (0,0) facing +Z (rotationY = 0)
  assert.equal(isTargetInAttackCone(0, 0, 0, 0, 2.2, 3.0, Math.PI / 2), true);
  // Target outside reach
  assert.equal(isTargetInAttackCone(0, 0, 0, 0, 4.5, 3.0, Math.PI / 2), false);
  // Target behind attacker
  assert.equal(isTargetInAttackCone(0, 0, 0, 0, -2.0, 3.0, Math.PI / 3), false);
});

test('calculatePlayerAttackDamage respects heavy attack, combo step, and stun', () => {
  const light1 = calculatePlayerAttackDamage({
    steelAttack: 20,
    silverAttack: 30,
    isHeavy: false,
    comboStep: 1,
    enemy: { isSilverVulnerable: true, state: 'CHASE' },
  });
  assert.equal(light1, 30);

  const heavy3Stunned = calculatePlayerAttackDamage({
    steelAttack: 20,
    silverAttack: 30,
    isHeavy: true,
    comboStep: 3,
    enemy: { isSilverVulnerable: true, state: 'STUNNED' },
  });
  assert.ok(heavy3Stunned > light1 * 2);
});

test('calculateIncomingPlayerDamage handles dodge, block, and barrier absorption', () => {
  const dodged = calculateIncomingPlayerDamage({
    rawDamage: 40,
    defense: 10,
    isDodging: true,
    isBlocking: false,
    barrierShield: 25,
  });
  assert.equal(dodged.hpDamage, 0);
  assert.equal(dodged.dodged, true);
  assert.equal(dodged.remainingBarrier, 25);

  const shielded = calculateIncomingPlayerDamage({
    rawDamage: 30,
    defense: 10,
    isDodging: false,
    isBlocking: false,
    barrierShield: 50,
  });
  assert.equal(shielded.hpDamage, 0);
  assert.ok(shielded.remainingBarrier < 50);

  const blocked = calculateIncomingPlayerDamage({
    rawDamage: 40,
    defense: 10,
    isDodging: false,
    isBlocking: true,
    barrierShield: 0,
  });
  assert.equal(blocked.parried, true);
  assert.ok(blocked.hpDamage < 12);
});

test('applyExperienceGain levels up player and awards skill points', () => {
  const initial: PlayerStats = {
    level: 1,
    xp: 80,
    xpToNext: 100,
    skillPoints: 0,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    toxicity: 0,
    maxToxicity: 100,
    gold: 50,
    baseAttack: 18,
    baseDefense: 6,
    signIntensity: 100,
    activeSign: 'flame',
    barrierShield: 0,
    potionCooldown: 0,
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
  };

  const { updated, leveledUp } = applyExperienceGain(initial, 40);
  assert.equal(leveledUp, true);
  assert.equal(updated.level, 2);
  assert.equal(updated.skillPoints, 1);
  assert.equal(updated.xp, 20);
  assert.ok(updated.maxHp > 100);
});

test('computeEffectivePlayerStats aggregates equipped items and skills', () => {
  const base: PlayerStats = {
    level: 1,
    xp: 0,
    xpToNext: 100,
    skillPoints: 0,
    hp: 120,
    maxHp: 120,
    stamina: 100,
    maxStamina: 100,
    toxicity: 0,
    maxToxicity: 100,
    gold: 50,
    baseAttack: 15,
    baseDefense: 5,
    signIntensity: 100,
    activeSign: 'flame',
    barrierShield: 0,
    potionCooldown: 0,
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
  };
  const inv: GameItem[] = [
    {
      id: 'silver_sword',
      name: 'Рунный серебряный меч',
      description: '',
      category: 'weapon',
      rarity: 'rare',
      value: 100,
      quantity: 1,
      equipped: true,
      upgradeLevel: 1,
      stats: { silverAttack: 20 },
    },
  ];
  const skills: SkillNode[] = [
    {
      id: 'skill_blade_mastery',
      branch: 'combat',
      name: 'Мастерство клинка',
      description: '',
      level: 2,
      maxLevel: 3,
      cost: 1,
    },
  ];

  const eff = computeEffectivePlayerStats(base, inv, skills);
  assert.equal(eff.silverAttack, 15 + 23 + 10);
});

test('advanceQuestStage progresses quest stages and completes final stage', () => {
  const quest: Quest = {
    id: 'q1',
    title: 'Пропавшие охотники',
    giver: 'Староста Боримир',
    biome: 'Старый лес',
    recommendedLevel: 1,
    description: '',
    status: 'active',
    currentStageIndex: 0,
    stages: [
      { id: 's1', description: 'Найти следы', completed: false, targetX: 0, targetZ: 0, radius: 5 },
      { id: 's2', description: 'Победить упырей', completed: false, targetX: 0, targetZ: 0, radius: 5 },
    ],
    xpReward: 100,
    goldReward: 50,
  };

  const step1 = advanceQuestStage(quest, 's1');
  assert.equal(step1.stageCompleted, true);
  assert.equal(step1.questCompleted, false);
  assert.equal(step1.updatedQuest.currentStageIndex, 1);

  const step2 = advanceQuestStage(step1.updatedQuest, 's2');
  assert.equal(step2.stageCompleted, true);
  assert.equal(step2.questCompleted, true);
  assert.equal(step2.updatedQuest.status, 'completed');
});

test('getNextWeatherState cycles through clear, fog, and rain states', () => {
  assert.equal(getNextWeatherState('clear'), 'fog');
  assert.equal(getNextWeatherState('fog'), 'rain');
  assert.equal(getNextWeatherState('rain'), 'clear');
});

test('interpolateWeatherMetrics smoothly blends atmospheric parameters between weather states', () => {
  const start = interpolateWeatherMetrics('clear', 'rain', 0);
  assert.equal(start.fogDensity, WEATHER_PRESETS.clear.fogDensity);
  assert.equal(start.rainIntensity, 0);

  const mid = interpolateWeatherMetrics('clear', 'rain', 0.5);
  assert.ok(mid.fogDensity > WEATHER_PRESETS.clear.fogDensity);
  assert.ok(mid.fogDensity < WEATHER_PRESETS.rain.fogDensity);
  assert.equal(mid.rainIntensity, 0.5);

  const end = interpolateWeatherMetrics('clear', 'rain', 1);
  assert.equal(end.fogDensity, WEATHER_PRESETS.rain.fogDensity);
  assert.equal(end.rainIntensity, 1);

  const foggy = interpolateWeatherMetrics('clear', 'fog', 1);
  assert.ok(foggy.fogDensity > end.fogDensity);
  assert.equal(foggy.mistIntensity, 1);
});

test('WORLD_LORE_NOTES defines 22 canonical chronicles and discoverLoreEntry awards +25 XP and unlocks Memory Keeper title at 22/22', () => {
  assert.equal(WORLD_LORE_NOTES.length, 22);
  assert.equal(PROLOGUE_SLIDES.length, 3);
  assert.ok(CODEX_ARTICLES.length >= 6);

  let stats: PlayerStats = {
    level: 1,
    xp: 0,
    xpToNext: 100,
    skillPoints: 1,
    hp: 140,
    maxHp: 140,
    stamina: 100,
    maxStamina: 100,
    toxicity: 0,
    maxToxicity: 100,
    gold: 85,
    baseAttack: 22,
    baseDefense: 8,
    signIntensity: 100,
    activeSign: 'flame',
    barrierShield: 0,
    potionCooldown: 0,
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
    discoveredLoreIds: [],
    loreMasterUnlocked: false,
  };

  for (let i = 0; i < WORLD_LORE_NOTES.length; i++) {
    const note = WORLD_LORE_NOTES[i];
    const res = discoverLoreEntry(stats, note.id, WORLD_LORE_NOTES.length);
    assert.equal(res.newlyDiscovered, true);
    assert.equal((res.updated.discoveredLoreIds ?? []).length, i + 1);
    assert.equal(res.unlockedLoreMaster, i + 1 === WORLD_LORE_NOTES.length);
    stats = res.updated;
  }

  assert.equal(stats.loreMasterUnlocked, true);

  // Re-reading an already discovered note should not grant duplicate XP
  const repeat = discoverLoreEntry(stats, WORLD_LORE_NOTES[0].id, WORLD_LORE_NOTES.length);
  assert.equal(repeat.newlyDiscovered, false);
  assert.equal(repeat.unlockedLoreMaster, false);
});

test('Memory Keeper of Valdmark (+15% boss damage) increases player damage against bosses', () => {
  const normalDamage = calculatePlayerAttackDamage({
    steelAttack: 40,
    silverAttack: 50,
    isHeavy: false,
    comboStep: 1,
    enemy: {
      isSilverVulnerable: true,
      state: 'CHASE',
      type: 'malakor',
      isContractBoss: true,
    },
    bossDamageMultiplier: 1.0,
  });

  const masterDamage = calculatePlayerAttackDamage({
    steelAttack: 40,
    silverAttack: 50,
    isHeavy: false,
    comboStep: 1,
    enemy: {
      isSilverVulnerable: true,
      state: 'CHASE',
      type: 'malakor',
      isContractBoss: true,
    },
    bossDamageMultiplier: 1.15,
  });

  assert.ok(
    masterDamage > normalDamage,
    `Expected master boss damage (${masterDamage}) > normal boss damage (${normalDamage})`
  );
  assert.equal(masterDamage, Math.round(normalDamage * 1.15));
});

test('Reputation system scales merchant prices and triggers Bounty Hunters at low reputation', () => {
  const savior = getReputationInfo(75);
  assert.equal(savior.title, 'Спаситель Вальдмарка');
  assert.equal(savior.triggersBountyHunters, false);
  assert.equal(calculateMerchantPrice(100, 75, false), 75);

  const butcher = getReputationInfo(-65);
  assert.equal(butcher.title, 'Пепельный Мясник');
  assert.equal(butcher.triggersBountyHunters, true);
  assert.equal(calculateMerchantPrice(100, -65, false), 130);
  // Contraband fence gives discount to outlaws
  assert.equal(calculateMerchantPrice(100, -65, true), 80);
});

test('AI Schedules dynamically transition NPCs between work, tavern, sleep, rain shelter, and combat defense', () => {
  // Daytime blacksmith forging
  const smithDay = computeNpcSchedule('blacksmith', 12, 'clear', false, true, 10, 6.5, 0);
  assert.equal(smithDay.state, 'ANVIL_FORGE');

  // Evening tavern gathering
  const farmerEvening = computeNpcSchedule('farmer', 19.5, 'clear', false, false, -14, 5, 0);
  assert.equal(farmerEvening.state, 'GATHER_TAVERN');

  // Nighttime sleeping indoors vs Torch Guard patrolling with lit torch
  const farmerNight = computeNpcSchedule('farmer', 23.5, 'clear', false, false, -14, 5, 0);
  assert.equal(farmerNight.state, 'SLEEP_INDOORS');
  const guardNight = computeNpcSchedule('torch_guard', 23.5, 'clear', false, true, 4, -8, 0);
  assert.equal(guardNight.state, 'PATROL_TORCH');
  assert.equal(guardNight.torchLit, true);

  // Rain shelter
  const farmerRain = computeNpcSchedule('farmer', 13, 'rain', false, false, -14, 5, 0);
  assert.equal(farmerRain.state, 'SHELTER_RAIN');

  // Monster lured into village: guard fights, farmer flees in panic
  const guardCombat = computeNpcSchedule('torch_guard', 14, 'clear', true, true, 4, -8, 0);
  assert.equal(guardCombat.state, 'COMBAT_DEFEND');
  const farmerPanic = computeNpcSchedule('farmer', 14, 'clear', true, false, -14, 5, 0);
  assert.equal(farmerPanic.state, 'PANIC_FLEE');
});

test('Companions system defines Lyra, Thorvald, and Vesper and cycles tactical commands', () => {
  assert.ok(COMPANION_PROFILES.lyra);
  assert.ok(COMPANION_PROFILES.thorvald);
  assert.ok(COMPANION_PROFILES.vesper);

  const c1 = getNextCompanionCommand('attack_target');
  assert.equal(c1, 'follow_close');
  assert.equal(getCompanionCommandLabel(c1), 'Держись рядом');
  const c2 = getNextCompanionCommand(c1);
  assert.equal(c2, 'hold_position');
  const c3 = getNextCompanionCommand(c2);
  assert.equal(c3, 'attack_target');
});

test('4 Non-linear Investigation Quests record choice consequences, world effects, and reputation/stat changes', () => {
  const initialStats: PlayerStats = {
    level: 1,
    xp: 0,
    xpToNext: 100,
    skillPoints: 1,
    hp: 160,
    maxHp: 160,
    stamina: 100,
    maxStamina: 100,
    toxicity: 0,
    maxToxicity: 100,
    gold: 100,
    baseAttack: 20,
    baseDefense: 8,
    signIntensity: 1.0,
    activeSign: 'flame',
    barrierShield: 0,
    potionCooldown: 0,
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
    reputation: 0,
  };

  // 1. Blood on the Belltower: executing blacksmith's wife closes the forge temporarily
  const res1 = resolveInvestigationQuestChoice(initialStats, 'belltower_kill_wife', 'ДЕНЬ 1');
  assert.ok(res1.consequence);
  assert.equal(res1.consequence?.questId, 'quest_blood_belltower');
  assert.equal(res1.updatedStats.blacksmithClosedTimer, 120);
  assert.equal(
    res1.updatedStats.questChoices?.quest_blood_belltower,
    'belltower_kill_wife'
  );

  // 2. Feast of Ravens: sparing illusions grants heirloom gold and lowers reputation
  const res2 = resolveInvestigationQuestChoice(res1.updatedStats, 'feast_spare_illusions', 'ДЕНЬ 2');
  assert.equal(res2.consequence?.questId, 'quest_feast_of_ravens');
  assert.equal(res2.updatedStats.reputation, -10);
  assert.equal(res2.updatedStats.questConsequences?.length, 2);

  // 3. Oath in the Dead Mines: protecting sentient ghouls
  const res3 = resolveInvestigationQuestChoice(res2.updatedStats, 'mines_protect_ghouls', 'ДЕНЬ 3');
  assert.equal(res3.consequence?.questId, 'quest_dead_mines_oath');
  assert.equal(res3.updatedStats.reputation, 10);

  // 4. Last Exam of the Ash-Hunter: validating ritual dosage + sign and reviving the Brotherhood
  const ritualPerfect = validateAshExamRitual(true, true);
  assert.equal(ritualPerfect.precisionScore, 100);
  assert.equal(ritualPerfect.bonusXp, 120);

  const res4 = resolveInvestigationQuestChoice(res3.updatedStats, 'exam_revive_brotherhood', 'ДЕНЬ 4');
  assert.equal(res4.consequence?.questId, 'quest_last_ash_exam');
  assert.equal(res4.updatedStats.questConsequences?.length, 4);
  assert.ok(INVESTIGATION_QUEST_CHOICES.exam_bury_secrets);
});

test('Exclusive equipment slots prevent stat stacking across duplicate armors or swords', () => {
  const base: PlayerStats = {
    level: 1,
    xp: 0,
    xpToNext: 100,
    skillPoints: 0,
    hp: 140,
    maxHp: 140,
    stamina: 100,
    maxStamina: 100,
    toxicity: 0,
    maxToxicity: 100,
    gold: 50,
    baseAttack: 20,
    baseDefense: 8,
    signIntensity: 100,
    activeSign: 'flame',
    barrierShield: 0,
    potionCooldown: 0,
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
  };

  const items: GameItem[] = [
    {
      id: 'armor_1',
      name: 'Броня Ворона',
      description: '',
      category: 'armor',
      rarity: 'rare',
      value: 100,
      quantity: 1,
      equipped: true,
      stats: { defense: 10, maxHealth: 30 },
    },
    {
      id: 'armor_2',
      name: 'Броня Медведя',
      description: '',
      category: 'armor',
      rarity: 'relic',
      value: 200,
      quantity: 1,
      equipped: true, // Even if both are marked equipped before sanitization
      stats: { defense: 25, maxHealth: 70 },
    },
    {
      id: 'steel_1',
      name: 'Стальной меч 1',
      description: '',
      category: 'weapon',
      equipSlot: 'steelSword',
      rarity: 'common',
      value: 50,
      quantity: 1,
      equipped: true,
      stats: { attack: 12 },
    },
    {
      id: 'steel_2',
      name: 'Стальной меч 2',
      description: '',
      category: 'weapon',
      equipSlot: 'steelSword',
      rarity: 'rare',
      value: 150,
      quantity: 1,
      equipped: false,
      stats: { attack: 28 },
    },
  ];

  // computeEffectivePlayerStats only counts 1 item per slot even on unsanitized arrays
  const effBefore = computeEffectivePlayerStats(base, items, []);
  assert.equal(effBefore.defense, 8 + 10);
  assert.equal(effBefore.maxHp, 140 + 30);

  // Equipping steel_2 automatically unequips steel_1 and sanitizes armor_2
  const sanitized = enforceExclusiveEquipment(items, 'steel_2');
  const equippedSteel = sanitized.filter(
    (i) => getItemEquipSlot(i) === 'steelSword' && i.equipped
  );
  const equippedArmor = sanitized.filter(
    (i) => getItemEquipSlot(i) === 'armor' && i.equipped
  );
  assert.equal(equippedSteel.length, 1);
  assert.equal(equippedSteel[0].id, 'steel_2');
  assert.equal(equippedArmor.length, 1);

  const effAfter = computeEffectivePlayerStats(base, sanitized, []);
  assert.equal(effAfter.steelAttack, 20 + 28);
});

test('Active Sword switching applies 100% damage on matching vulnerability and 35% on wrong sword', () => {
  assert.equal(getSwordEffectiveness('steel', false).multiplier, 1.0);
  assert.equal(getSwordEffectiveness('steel', true).multiplier, 0.35);
  assert.equal(getSwordEffectiveness('silver', true).multiplier, 1.0);
  assert.equal(getSwordEffectiveness('silver', false).multiplier, 0.35);

  const monsterCorrect = calculatePlayerAttackDamage({
    steelAttack: 40,
    silverAttack: 50,
    activeSword: 'silver',
    isHeavy: false,
    comboStep: 1,
    enemy: { isSilverVulnerable: true, state: 'CHASE' },
  });
  const monsterWrong = calculatePlayerAttackDamage({
    steelAttack: 40,
    silverAttack: 50,
    activeSword: 'steel',
    isHeavy: false,
    comboStep: 1,
    enemy: { isSilverVulnerable: true, state: 'CHASE' },
  });
  assert.equal(monsterCorrect, 50);
  assert.equal(monsterWrong, Math.round(40 * 0.35));
});

test('resolveSlidingCollision slides smoothly along AABB walls and cylinders without penetrating', () => {
  const boxes = [{ minX: -5, maxX: 5, minZ: -2, maxZ: 2 }];
  // Moving diagonally into the north face of a wall at z = -2 (with radius 0.6 -> boundary at z = -2.6)
  const res = resolveSlidingCollision(-2, -2.65, -0.5, -1.8, 0.6, [], boxes);
  // X movement should slide freely to -0.5 while Z stays outside the box
  assert.equal(res.x, -0.5);
  assert.ok(res.z <= -2.6, `Expected z (${res.z}) to stay outside wall boundary -2.6`);
});


