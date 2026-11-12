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
  detectHardwarePlatform,
  resolveControlPlatform,
  getPlatformControlSummary,
  getActorQuestIndicatorState,
  isRespawnableMob,
  DEFAULT_MOB_RESPAWN_SECONDS,
  WAYSTONES,
  SETTLEMENT_ZONES,
  isPointInsideSettlementFence,
  isPointInSettlementSafeZone,
  clampEnemySpawnOutsideSettlements,
  clampEnemyPositionOutsideSettlements,
  computeSkyboxState,
  computeCombatScreenShake,
  computeCombatHapticPattern,
  isHeavyEnemyAttack,
  computeTimeOfDayFogMultiplier,
  computeDynamicFogIntensity,
  BIOME_FOG_MULTIPLIERS,
  EXPLORATION_FOG_SURGE_PROFILES,
  computeBloomParameters,
  shouldEmitGuardCombatFeedback,
  GUARD_COMBAT_FEEDBACK_MAX_DISTANCE,
  getBiomeMobSpawnProfile,
  BESTIARY_DATA,
  resolveNpcVoiceProfile,
  resolveNpcPersona,
  evaluateNpcCognitiveTurn,
  createInitialRelationshipState,
  STREAMER_FOOZZEE_TWITCH_URL,
  STREAMER_FOOZZEE_SITE_URL,
} from './rules.ts';
import { t, localizeQuest, localizeSkill, localizeDialogueNode } from './i18n.ts';
import { ASH_ECHOES, CODEX_ARTICLES, PROLOGUE_SLIDES, WORLD_LORE_NOTES } from './loreData.ts';
import { QuestSystem } from './QuestSystem.ts';
import { DialogueSystem } from './DialogueSystem.ts';
import { InventorySystem } from './InventorySystem.ts';
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

test('WORLD_LORE_NOTES defines 31 canonical chronicles and discoverLoreEntry awards +25 XP and unlocks Memory Keeper title at 31/31', () => {
  assert.equal(WORLD_LORE_NOTES.length, 31);
  assert.equal(PROLOGUE_SLIDES.length, 3);
  assert.ok(CODEX_ARTICLES.length >= 12);

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

test('detectHardwarePlatform and resolveControlPlatform accurately distinguish PC browser vs Mobile phone/tablet', () => {
  const desktopEnv = {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    maxTouchPoints: 0,
    hasCoarsePointer: false,
    hasFinePointer: true,
    hasHover: true,
    screenWidth: 1920,
    screenHeight: 1080,
    lastInputType: null as 'mouse_keyboard' | 'touch' | null,
  };
  assert.equal(detectHardwarePlatform(desktopEnv), 'pc');
  assert.equal(resolveControlPlatform('auto', desktopEnv), 'pc');

  const iphoneEnv = {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    maxTouchPoints: 5,
    hasCoarsePointer: true,
    hasFinePointer: false,
    hasHover: false,
    screenWidth: 390,
    screenHeight: 844,
    lastInputType: null as 'mouse_keyboard' | 'touch' | null,
  };
  assert.equal(detectHardwarePlatform(iphoneEnv), 'mobile');
  assert.equal(resolveControlPlatform('auto', iphoneEnv), 'mobile');

  const ipadDesktopUaEnv = {
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
    maxTouchPoints: 5,
    hasCoarsePointer: true,
    hasFinePointer: false,
    hasHover: false,
    screenWidth: 1024,
    screenHeight: 768,
    lastInputType: null as 'mouse_keyboard' | 'touch' | null,
  };
  assert.equal(detectHardwarePlatform(ipadDesktopUaEnv), 'mobile');

  // Manual override works in both directions
  assert.equal(resolveControlPlatform('mobile', desktopEnv), 'mobile');
  assert.equal(resolveControlPlatform('pc', iphoneEnv), 'pc');

  // Live touch input in 'auto' mode switches to mobile controls
  assert.equal(
    resolveControlPlatform('auto', { ...desktopEnv, lastInputType: 'touch' }),
    'mobile'
  );

  const pcSummary = getPlatformControlSummary('pc', 'ru');
  const mobileSummary = getPlatformControlSummary('mobile', 'ru');
  assert.ok(pcSummary.moveDodge.includes('WASD'));
  assert.ok(mobileSummary.moveDodge.includes('Джойстик'));
});

test('i18n t() resolves all Title, HUD, Dock, Inventory, and Pause dot-keys without raw key fallbacks', () => {
  const keys = [
    'title.header',
    'title.quickStart',
    'title.subtitle',
    'title.desc',
    'title.startHunt',
    'title.exit',
    'title.moveDodge',
    'title.combatBlock',
    'title.ashSigns',
    'title.codexMenus',
    'title.pointerHint',
    'hud.level',
    'hud.corvusTitle',
    'hud.xp',
    'hud.gold',
    'hud.skillPoint',
    'hud.health',
    'hud.stamina',
    'hud.toxicity',
    'hud.prices',
    'hud.activeWeapon',
    'hud.steelSword',
    'hud.silverSword',
    'hud.steelShort',
    'hud.silverShort',
    'hud.signReady',
    'hud.potion',
    'dock.show',
    'dock.hide',
    'mobile.attack',
    'mobile.heavy',
    'mobile.dodge',
    'mobile.block',
    'mobile.sign',
  ];
  for (const key of keys) {
    const ruVal = t('ru', key);
    const enVal = t('en', key);
    assert.notEqual(ruVal, key, `Russian translation missing for ${key}`);
    assert.notEqual(enVal, key, `English translation missing for ${key}`);
    assert.ok(ruVal.length > 0);
    assert.ok(enVal.length > 0);
  }
});

test('getActorQuestIndicatorState returns exclamation (!) for quest givers & notice board, and question (?) for ready turn-ins', () => {
  const qs = new QuestSystem();

  // At start of game:
  // Elder Bran has stage 0 of quest_missing_hunters -> exclamation (!)
  assert.equal(getActorQuestIndicatorState('npc_elder', qs.quests, qs.contracts), 'exclamation');
  // Notice Board has 3 available contracts -> exclamation (!)
  assert.equal(
    getActorQuestIndicatorState('notice_board_village', qs.quests, qs.contracts),
    'exclamation'
  );
  // Herbalist Marfa has quest_swamp_whisper available -> exclamation (!)
  assert.equal(
    getActorQuestIndicatorState('npc_herbalist', qs.quests, qs.contracts),
    'exclamation'
  );
  // Suspect Helga is NOT yet ready for verdict -> none
  assert.equal(
    getActorQuestIndicatorState('npc_belltower_helga', qs.quests, qs.contracts),
    'none'
  );

  // Advance quest_missing_hunters to stage 1 and accept quest_blood_belltower -> Elder Bran has no unaccepted quests left -> none
  qs.completeStage('quest_missing_hunters', 'q1_talk_elder');
  qs.activateQuest('quest_blood_belltower');
  assert.equal(getActorQuestIndicatorState('npc_elder', qs.quests, qs.contracts), 'none');
  qs.completeStage('quest_missing_hunters', 'q1_find_tracks');
  qs.completeStage('quest_missing_hunters', 'q1_inspect_camp');
  qs.completeStage('quest_missing_hunters', 'q1_kill_ghouls');

  // Now Elder Bran has a ready turn-in -> question (?)
  assert.equal(getActorQuestIndicatorState('npc_elder', qs.quests, qs.contracts), 'question');

  // Complete quest_missing_hunters -> Elder Bran now offers quest_ancient_king -> exclamation (!)
  qs.completeStage('quest_missing_hunters', 'q1_return_elder');
  assert.equal(getActorQuestIndicatorState('npc_elder', qs.quests, qs.contracts), 'exclamation');

  // Accept all 3 contracts on Notice Board -> Notice Board indicator becomes 'none'
  qs.acceptContract('contract_werewolf');
  qs.acceptContract('contract_noonwraith');
  qs.acceptContract('contract_gargoyle');
  assert.equal(
    getActorQuestIndicatorState('notice_board_village', qs.quests, qs.contracts),
    'none'
  );
});

test('QuestSystem and DialogueSystem strictly enforce prerequisite stages and prevent skipping ahead', () => {
  const qs = new QuestSystem();
  const ds = new DialogueSystem();

  // Verify getQuestById, getQuest, and getContractById lookups
  assert.equal(qs.getQuestById('quest_act2_malakor')?.id, 'quest_act2_malakor');
  assert.equal(qs.getQuest('quest_missing_hunters')?.id, 'quest_missing_hunters');
  assert.equal(qs.getQuestById('non_existent_quest'), undefined);
  assert.equal(qs.getContractById('contract_werewolf')?.id, 'contract_werewolf');

  // 1. Unaccepted contract clues cannot advance until accepted on Notice Board
  const clueBeforeAccept = qs.advanceContractClue('contract_werewolf');
  assert.equal(clueBeforeAccept.contract?.status, 'available');
  assert.equal(clueBeforeAccept.contract?.cluesFound, 0);

  qs.acceptContract('contract_werewolf');
  const clueAfterAccept = qs.advanceContractClue('contract_werewolf');
  assert.equal(clueAfterAccept.contract?.status, 'tracking');
  assert.equal(clueAfterAccept.contract?.cluesFound, 1);

  // 2. Investigation quest "Blood on the Belltower": Helga's verdict options are hidden before stages 0..2 are completed
  const helgaEarly = ds.getDialogueNode('belltower_helga_root', qs.quests);
  assert.ok(helgaEarly);
  const earlyVerdicts = helgaEarly.options.filter(
    (o) =>
      o.action === 'belltower_kill_wife' ||
      o.action === 'belltower_cleanse_ritual' ||
      o.action === 'belltower_blame_outsider'
  );
  assert.equal(earlyVerdicts.length, 0, 'Should not allow Helga verdict before clues & interrogation');

  // Complete stages 0, 1, 2 of quest_blood_belltower
  qs.activateQuest('quest_blood_belltower');
  qs.completeStage('quest_blood_belltower', 'q_bell_corpse');
  qs.completeStage('quest_blood_belltower', 'q_bell_roof_tracks');
  qs.completeStage('quest_blood_belltower', 'q_bell_interrogate');

  // Now Helga shows (?) indicator and verdict options are unlocked
  assert.equal(
    getActorQuestIndicatorState('npc_belltower_helga', qs.quests, qs.contracts),
    'question'
  );
  const helgaReady = ds.getDialogueNode('belltower_helga_root', qs.quests);
  const readyVerdicts = (helgaReady?.options ?? []).filter(
    (o) =>
      o.action === 'belltower_kill_wife' ||
      o.action === 'belltower_cleanse_ritual' ||
      o.action === 'belltower_blame_outsider'
  );
  assert.equal(readyVerdicts.length, 3);
});

test('isRespawnableMob allows regular mobs to respawn after DEFAULT_MOB_RESPAWN_SECONDS while excluding bosses', () => {
  assert.equal(DEFAULT_MOB_RESPAWN_SECONDS, 60);
  assert.equal(
    isRespawnableMob({
      id: 'wolf_1',
      type: 'wolf',
      questTag: undefined,
      isContractBoss: false,
    }),
    true
  );
  assert.equal(
    isRespawnableMob({
      id: 'ghoul_q1',
      type: 'ghoul',
      questTag: 'q1_ghouls',
      isContractBoss: false,
    }),
    true
  );
  assert.equal(
    isRespawnableMob({
      id: 'boss_hydra',
      type: 'boss_hydra',
      questTag: 'q5_hydra',
      isContractBoss: false,
    }),
    false
  );
  assert.equal(
    isRespawnableMob({
      id: 'contract_ww',
      type: 'werewolf',
      questTag: 'contract_werewolf',
      isContractBoss: true,
    }),
    false
  );
});

test('New Biomes (Sunken Port Solheim, Sun Monastery, Starfall Valley Act III) resolve biome IDs, heights, waystones, and quest indicators', () => {
  assert.equal(getBiomeAt(-150, 0).id, 'sunken_port');
  assert.equal(getBiomeAt(155, -15).id, 'sun_monastery');
  assert.equal(getBiomeAt(0, -620).id, 'starfall_valley');

  assert.ok(getGroundHeight(160, -15) > 2.5, 'Sun Monastery plateau should be elevated');
  assert.ok(getGroundHeight(0, -640) > 5.0, 'Starfall Valley forge plateau should be high');
  assert.equal(WAYSTONES.length, 13);

  const qs = new QuestSystem();
  assert.equal(
    getActorQuestIndicatorState('npc_solheim_keeper', qs.quests, qs.contracts),
    'exclamation'
  );
  assert.equal(
    getActorQuestIndicatorState('npc_monastery_abbot', qs.quests, qs.contracts),
    'exclamation'
  );
  assert.equal(
    getActorQuestIndicatorState('npc_starfall_herald', qs.quests, qs.contracts),
    'exclamation'
  );

  // Advance Solheim quest to turn-in stage
  qs.activateQuest('quest_sunken_lighthouse');
  qs.completeStage('quest_sunken_lighthouse', 'q_port_talk_keeper');
  qs.completeStage('quest_sunken_lighthouse', 'q_port_find_amber_lens');
  assert.equal(
    getActorQuestIndicatorState('npc_solheim_keeper', qs.quests, qs.contracts),
    'question'
  );
});

test('Settlement fences, gates, safe spawn buffers, and mob exclusion prevent enemies from spawning in or entering villages', () => {
  assert.equal(SETTLEMENT_ZONES.length, 9);
  for (const zone of SETTLEMENT_ZONES) {
    assert.ok(zone.fenceRadius > 8, `${zone.id} must have a positive fence radius`);
    assert.ok(
      zone.spawnSafeRadius > zone.fenceRadius,
      `${zone.id} spawnSafeRadius must exceed fenceRadius`
    );
    assert.ok(zone.gateAngles.length >= 1, `${zone.id} must have at least one exit gate`);
  }

  // Crow Hollow center (0, 0) is inside the fence and safe zone
  assert.equal(isPointInsideSettlementFence(0, 0), true);
  assert.equal(isPointInSettlementSafeZone(0, 0), true);

  // Point at (34, 0) is outside Crow Hollow fence (31.5m) but inside safe spawn buffer (37.5m)
  assert.equal(isPointInsideSettlementFence(34, 0), false);
  assert.equal(isPointInSettlementSafeZone(34, 0), true);

  // Attempting to spawn an enemy inside or near Crow Hollow pushes it outside spawnSafeRadius
  const clampedSpawn = clampEnemySpawnOutsideSettlements(15, 0);
  assert.equal(clampedSpawn.clamped, true);
  assert.ok(
    Math.hypot(clampedSpawn.x, clampedSpawn.z) >= 37.5,
    `Enemy spawn must be pushed outside safe zone (>=37.5m), got ${Math.hypot(clampedSpawn.x, clampedSpawn.z)}`
  );
  assert.equal(isPointInSettlementSafeZone(clampedSpawn.x, clampedSpawn.z), false);

  // Attempting to move an enemy across a village gate or fence clamps it outside the fence
  const clampedMove = clampEnemyPositionOutsideSettlements(30.0, 0, 1.0);
  assert.equal(clampedMove.clamped, true);
  assert.equal(clampedMove.settlementId, 'village_crow_hollow');
  assert.ok(
    Math.hypot(clampedMove.x, clampedMove.z) >= 32.5,
    'Enemy attempting to enter village through east gate must be stopped outside fence'
  );
});

test('All waystones, lore notes, ash echoes, and swamp/port chests sit above water level and off settlement fence lines', () => {
  for (const ws of WAYSTONES) {
    const y = getGroundHeight(ws.x, ws.z);
    assert.ok(Number.isFinite(y), `Waystone ${ws.id} must have finite ground height`);
    if (ws.z < -105 && ws.z >= -215) {
      assert.ok(y > -0.45, `Swamp waystone ${ws.id} must sit above swamp water (-0.48), got ${y}`);
    }
    for (const zone of SETTLEMENT_ZONES) {
      const d = Math.hypot(ws.x - zone.x, ws.z - zone.z);
      assert.ok(
        Math.abs(d - zone.fenceRadius) >= 1.1,
        `Waystone ${ws.id} must not collide with fence of ${zone.id}`
      );
    }
  }

  for (const note of WORLD_LORE_NOTES) {
    const y = getGroundHeight(note.x, note.z);
    assert.ok(Number.isFinite(y), `Lore note ${note.id} must have finite ground height`);
    if (note.z < -105 && note.z >= -215) {
      assert.ok(y > -0.45, `Swamp lore note ${note.id} must sit above swamp water (-0.48), got ${y}`);
    }
    for (const zone of SETTLEMENT_ZONES) {
      const d = Math.hypot(note.x - zone.x, note.z - zone.z);
      assert.ok(
        Math.abs(d - zone.fenceRadius) >= 1.1,
        `Lore note ${note.id} must not collide with fence of ${zone.id}`
      );
    }
  }

  for (const echo of ASH_ECHOES) {
    const y = getGroundHeight(echo.x, echo.z);
    assert.ok(Number.isFinite(y), `Ash echo ${echo.id} must have finite ground height`);
    if (echo.z < -105 && echo.z >= -215) {
      assert.ok(y > -0.45, `Swamp ash echo ${echo.id} must sit above swamp water (-0.48), got ${y}`);
    }
  }

  // Verify key swamp and coastal chests sit above water
  assert.ok(getGroundHeight(16, -175) > -0.45, 'chest_swamp_north must be above swamp water');
  assert.ok(getGroundHeight(-52, -152) > -0.45, 'poi_swamp_stilt_stash must be above swamp water');
  assert.ok(getGroundHeight(-14, -129) > -0.45, 'poi_swamp_refugee_chest must be above swamp water');
  assert.ok(getGroundHeight(-160, 21) > -1.0, 'chest_solheim_admiral must be above sea water');
});

test('computeSkyboxState dynamically updates sky colors, celestial bodies, and cloud density by time and weather', () => {
  const clearNoon = computeSkyboxState(12.0, 'clear');
  const clearDawn = computeSkyboxState(6.2, 'clear');
  const clearDusk = computeSkyboxState(18.0, 'clear');
  const clearMidnight = computeSkyboxState(0.0, 'clear');

  assert.equal(clearNoon.phase, 'day');
  assert.equal(clearDawn.phase, 'dawn');
  assert.equal(clearDusk.phase, 'dusk');
  assert.equal(clearMidnight.phase, 'night');

  // Celestial bodies swap visibility between day and night
  assert.ok(clearNoon.sunElevation > 0.95);
  assert.ok(clearNoon.sunVisibility > 0.7);
  assert.equal(clearNoon.moonVisibility, 0);
  assert.equal(clearNoon.starVisibility, 0);

  assert.ok(clearMidnight.moonElevation > 0.95);
  assert.ok(clearMidnight.moonVisibility > 0.7);
  assert.equal(clearMidnight.sunVisibility, 0);
  assert.ok(clearMidnight.starVisibility > 0.7, 'Stars must be bright on a clear midnight');

  // Horizon/zenith colors differ across dawn, noon, dusk, and midnight
  assert.notEqual(clearDawn.horizonHex, clearNoon.horizonHex);
  assert.notEqual(clearDusk.horizonHex, clearNoon.horizonHex);
  assert.notEqual(clearMidnight.zenithHex, clearNoon.zenithHex);

  // Weather conditions scale cloud density and attenuate celestial visibility
  const fogNoon = computeSkyboxState(12.0, 'fog');
  const rainNoon = computeSkyboxState(12.0, 'rain');
  const rainMidnight = computeSkyboxState(0.0, 'rain');

  assert.ok(
    clearNoon.cloudDensity < fogNoon.cloudDensity &&
      fogNoon.cloudDensity < rainNoon.cloudDensity,
    'Cloud density must increase from clear -> fog -> rain'
  );
  assert.ok(
    clearNoon.sunVisibility > fogNoon.sunVisibility &&
      fogNoon.sunVisibility > rainNoon.sunVisibility,
    'Sun visibility must be attenuated by fog and rain clouds'
  );
  assert.ok(
    rainMidnight.starVisibility < clearMidnight.starVisibility * 0.2,
    'Heavy storm clouds at midnight must obscure most stars'
  );

  // Smooth transition blending between weather states
  const halfBlend = computeSkyboxState(12.0, 'rain', 'clear', 0.5);
  assert.ok(
    halfBlend.cloudDensity > clearNoon.cloudDensity &&
      halfBlend.cloudDensity < rainNoon.cloudDensity
  );
});

test('computeCombatScreenShake triggers stronger screen-shake on critical player hits and heavy enemy attacks', () => {
  // Verify heavy enemy attack classification
  assert.equal(isHeavyEnemyAttack('wolf', 14), false);
  assert.equal(isHeavyEnemyAttack('wolf', 30), true);
  assert.equal(isHeavyEnemyAttack('boss_colossus', 20), true);
  assert.equal(isHeavyEnemyAttack('gargoyle', 22), true);
  assert.equal(isHeavyEnemyAttack('ghoul', 16, true), true);

  // Player attacks: Light < Heavy < Crit < Heavy+Crit
  const lightHit = computeCombatScreenShake({ source: 'player', isCrit: false, isHeavy: false });
  const heavyHit = computeCombatScreenShake({ source: 'player', isCrit: false, isHeavy: true });
  const critHit = computeCombatScreenShake({ source: 'player', isCrit: true, isHeavy: false });
  const heavyCritHit = computeCombatScreenShake({ source: 'player', isCrit: true, isHeavy: true });

  assert.equal(lightHit.kind, 'light_hit');
  assert.equal(heavyHit.kind, 'heavy_hit');
  assert.equal(critHit.kind, 'critical_hit');
  assert.equal(heavyCritHit.kind, 'critical_hit');
  assert.ok(lightHit.intensity < heavyHit.intensity);
  assert.ok(heavyHit.intensity < critHit.intensity);
  assert.ok(critHit.intensity < heavyCritHit.intensity);
  assert.ok(critHit.rollAmplitude > lightHit.rollAmplitude);
  assert.equal(critHit.flashColor, '#facc15');

  // Enemy attacks: Light enemy vs Heavy enemy / Boss slam
  const enemyLight = computeCombatScreenShake({
    source: 'enemy',
    enemyType: 'wolf',
    rawDamage: 14,
  });
  const enemyHeavy = computeCombatScreenShake({
    source: 'enemy',
    enemyType: 'boss_colossus',
    rawDamage: 48,
  });
  const enemyParried = computeCombatScreenShake({
    source: 'enemy',
    enemyType: 'boss_colossus',
    rawDamage: 48,
    parried: true,
  });

  assert.equal(enemyLight.kind, 'light_hit');
  assert.equal(enemyHeavy.kind, 'heavy_enemy_attack');
  assert.ok(enemyHeavy.intensity > enemyLight.intensity * 2);
  assert.ok(enemyHeavy.duration > enemyLight.duration);
  assert.ok(enemyHeavy.rollAmplitude > enemyLight.rollAmplitude * 2);
  assert.equal(enemyHeavy.flashColor, '#ef4444');
  assert.ok(enemyParried.intensity < enemyHeavy.intensity);
});

test('computeCombatHapticPattern triggers vibration patterns on mobile for critical hits and heavy damage while ignoring desktop and light hits', () => {
  // Desktop ('pc') never triggers navigator.vibrate patterns
  assert.deepEqual(
    computeCombatHapticPattern({ platform: 'pc', kind: 'critical_hit', isHeavy: true }),
    []
  );
  assert.deepEqual(
    computeCombatHapticPattern({ platform: 'pc', kind: 'heavy_enemy_attack', hpDamage: 45 }),
    []
  );

  // Mobile ('mobile') light hits and regular heavy attacks without crit do not vibrate
  assert.deepEqual(
    computeCombatHapticPattern({ platform: 'mobile', kind: 'light_hit' }),
    []
  );
  assert.deepEqual(
    computeCombatHapticPattern({ platform: 'mobile', kind: 'heavy_hit' }),
    []
  );

  // Mobile ('mobile') critical player hits return distinct multi-pulse vibration patterns
  const mobileCrit = computeCombatHapticPattern({
    platform: 'mobile',
    kind: 'critical_hit',
    isHeavy: false,
  });
  const mobileHeavyCrit = computeCombatHapticPattern({
    platform: 'mobile',
    kind: 'critical_hit',
    isHeavy: true,
  });
  assert.deepEqual(mobileCrit, [40, 25, 70]);
  assert.deepEqual(mobileHeavyCrit, [55, 30, 95]);

  // Mobile ('mobile') heavy enemy attack or heavy HP damage (>=22) returns strong damage vibration pattern
  const mobileHeavyDamage = computeCombatHapticPattern({
    platform: 'mobile',
    kind: 'heavy_enemy_attack',
  });
  const mobileHighHpDamage = computeCombatHapticPattern({
    platform: 'mobile',
    kind: 'light_hit',
    hpDamage: 28,
  });
  assert.deepEqual(mobileHeavyDamage, [85, 40, 125]);
  assert.deepEqual(mobileHighHpDamage, [85, 40, 125]);

  // Verify ScreenShakeProfile carries hapticPattern metadata
  const critShake = computeCombatScreenShake({ source: 'player', isCrit: true, isHeavy: false });
  const heavyEnemyShake = computeCombatScreenShake({
    source: 'enemy',
    enemyType: 'boss_colossus',
    rawDamage: 42,
  });
  assert.deepEqual(critShake.hapticPattern, [40, 25, 70]);
  assert.deepEqual(heavyEnemyShake.hapticPattern, [85, 40, 125]);
});

test('computeDynamicFogIntensity reacts to time of day, exploration events, weather states, and user fogIntensity setting', () => {
  // 1. Time of day modulation: Dawn (06:00) and Midnight (00:00) produce denser fog than Midday (13:30)
  const dawnMult = computeTimeOfDayFogMultiplier(6.0);
  const middayMult = computeTimeOfDayFogMultiplier(13.5);
  const midnightMult = computeTimeOfDayFogMultiplier(0.0);

  assert.ok(dawnMult > 1.25, `Dawn mist multiplier should peak >1.25, got ${dawnMult}`);
  assert.ok(middayMult < 0.85, `Midday solar burn-off should drop <0.85, got ${middayMult}`);
  assert.ok(midnightMult > 1.15, `Midnight radiation fog should exceed 1.15, got ${midnightMult}`);

  const dawnFog = computeDynamicFogIntensity({
    weather: 'fog',
    timeOfDay: 6.0,
    biomeId: 'forgotten_lands',
    userFogIntensity: 1.0,
  });
  const middayFog = computeDynamicFogIntensity({
    weather: 'fog',
    timeOfDay: 13.5,
    biomeId: 'forgotten_lands',
    userFogIntensity: 1.0,
  });
  assert.ok(
    dawnFog.fogDensity > middayFog.fogDensity * 1.4,
    'Dawn fog density must be significantly heavier than midday fog density'
  );

  // 2. Biome & Exploration Event surges increase fog density and mist opacity
  const villageCalm = computeDynamicFogIntensity({
    weather: 'fog',
    timeOfDay: 12.0,
    biomeId: 'village',
    explorationSurge: 0,
    userFogIntensity: 1.0,
  });
  const swampCalm = computeDynamicFogIntensity({
    weather: 'fog',
    timeOfDay: 12.0,
    biomeId: 'gallows_swamp',
    explorationSurge: 0,
    userFogIntensity: 1.0,
  });
  const swampRitualSurge = computeDynamicFogIntensity({
    weather: 'fog',
    timeOfDay: 12.0,
    biomeId: 'gallows_swamp',
    explorationSurge: 1.0,
    explorationEventType: 'cursed_ritual',
    userFogIntensity: 1.0,
  });

  assert.ok(BIOME_FOG_MULTIPLIERS.gallows_swamp > BIOME_FOG_MULTIPLIERS.village);
  assert.ok(swampCalm.fogDensity > villageCalm.fogDensity);
  assert.ok(
    swampRitualSurge.fogDensity > swampCalm.fogDensity * 1.3,
    'Exploration event surge (cursed_ritual) must boost fog density'
  );
  assert.ok(swampRitualSurge.mistOpacity > swampCalm.mistOpacity);
  assert.equal(swampRitualSurge.activeEventType, 'cursed_ritual');
  assert.equal(
    swampRitualSurge.activeEventLabelEn,
    EXPLORATION_FOG_SURGE_PROFILES.cursed_ritual.labelEn
  );

  // 3. User Settings multiplier (0.0 disables fog completely; 2.0 doubles intensity up to safety cap)
  const disabledFog = computeDynamicFogIntensity({
    weather: 'fog',
    timeOfDay: 6.0,
    biomeId: 'cursed_sanctuary',
    explorationSurge: 1.0,
    explorationEventType: 'ash_echo_vision',
    userFogIntensity: 0.0,
  });
  const doubleFog = computeDynamicFogIntensity({
    weather: 'clear',
    timeOfDay: 12.0,
    biomeId: 'forgotten_lands',
    userFogIntensity: 2.0,
  });
  const normalClearFog = computeDynamicFogIntensity({
    weather: 'clear',
    timeOfDay: 12.0,
    biomeId: 'forgotten_lands',
    userFogIntensity: 1.0,
  });

  assert.equal(disabledFog.fogDensity, 0);
  assert.equal(disabledFog.mistOpacity, 0);
  assert.ok(
    Math.abs(doubleFog.fogDensity - normalClearFog.fogDensity * 2) < 0.0002,
    '200% user fogIntensity setting should double the effective fog density'
  );
});

test('computeBloomParameters computes subtle, non-blinding post-processing UnrealBloomPass strength, radius, and threshold', () => {
  const disabled = computeBloomParameters({
    bloomIntensity: 0,
    quality: 'high',
    timeOfDay: 12,
    biomeId: 'village',
  });
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.strength, 0);

  const normalDay = computeBloomParameters({
    bloomIntensity: 1.0,
    quality: 'high',
    timeOfDay: 12,
    biomeId: 'village',
  });
  const highBloomAetherNight = computeBloomParameters({
    bloomIntensity: 1.8,
    quality: 'high',
    timeOfDay: 0,
    biomeId: 'aether_sanctum',
  });

  assert.equal(normalDay.enabled, true);
  assert.ok(
    normalDay.strength > 0.12 && normalDay.strength < 0.35,
    `Normal day bloom strength should be subtle (0.12..0.35), got ${normalDay.strength}`
  );
  assert.ok(
    normalDay.threshold >= 0.78,
    `Normal day bloom threshold should be high (>=0.78) to avoid blinding glare, got ${normalDay.threshold}`
  );
  assert.ok(
    highBloomAetherNight.strength > normalDay.strength * 1.4 &&
      highBloomAetherNight.strength <= 0.58,
    'Higher bloomIntensity in celestial night biome increases bloom while staying below blinding cap (0.58)'
  );
  assert.ok(highBloomAetherNight.threshold < normalDay.threshold);
});

test('resolveSlidingCollision prevents walking or high-speed dodge-rolling through walls and settlement fences while allowing open gates', () => {
  // 1. High-speed dodge step (3.5m in one frame) toward a thin 0.4m stone wall must never tunnel through
  const thinWall = [{ minX: -5, maxX: 5, minZ: 1.8, maxZ: 2.2, minY: 0, maxY: 4 }];
  const stepResult = resolveSlidingCollision(0, 0, 0, 3.5, 0.42, [], thinWall);
  assert.ok(
    stepResult.z <= 1.8 - 0.41,
    `Player must be stopped in front of thin wall (z <= 1.39), got z=${stepResult.z}`
  );

  // 2. Attempting to cross Crow Hollow's northeast fence perimeter (radius 31.5 around (0,0), angle PI/4 has no gate) is blocked
  const startDiag = 30.2 / Math.SQRT2;
  const endDiag = 33.5 / Math.SQRT2;
  const fenceBlocked = resolveSlidingCollision(
    startDiag,
    startDiag,
    endDiag,
    endDiag,
    0.42,
    [],
    []
  );
  const distFromCenter = Math.hypot(fenceBlocked.x, fenceBlocked.z);
  assert.ok(
    distFromCenter < 31.5,
    `Player walking into solid northeast settlement fence must be blocked inside perimeter, dist=${distFromCenter}`
  );

  // 3. Walking through Crow Hollow's northern open gate (angle -PI/2 -> x=0, z=-31.5) is allowed
  const gatePass = resolveSlidingCollision(0, -30.2, 0, -32.8, 0.42, [], []);
  assert.ok(
    gatePass.z < -32.0,
    `Player walking through open northern gate must pass unimpeded, got z=${gatePass.z}`
  );
});


test('shouldEmitGuardCombatFeedback suppresses distant guard vs monster damage numbers and audio beyond 20m', () => {
  assert.equal(GUARD_COMBAT_FEEDBACK_MAX_DISTANCE, 20);
  // Player close to guard combat (10m away) -> show damage & play audio
  assert.equal(shouldEmitGuardCombatFeedback(0, 0, 6, 8), true);
  // Player exactly at boundary (20m away) -> show damage & play audio
  assert.equal(shouldEmitGuardCombatFeedback(0, 0, 20, 0), true);
  // Player far from guard combat (45m away) -> suppress damage numbers & audio
  assert.equal(shouldEmitGuardCombatFeedback(0, 0, 30, 35), false);
});

test('Act IV Biomes (WoW Emerald Weald, Aion Aether Sanctum, Horizon Titan Cauldron) resolve biomes, settlements, monsters, bosses, and quests', () => {
  assert.equal(getBiomeAt(0, -760).id, 'emerald_weald');
  assert.equal(getBiomeAt(0, -900).id, 'aether_sanctum');
  assert.equal(getBiomeAt(0, -1040).id, 'titan_cauldron');

  // Verify the 3 new fortified settlements exist and block enemy spawns/entry
  const emeraldGlade = SETTLEMENT_ZONES.find((s) => s.id === 'settlement_emerald_glade');
  const aetherBastion = SETTLEMENT_ZONES.find((s) => s.id === 'settlement_aether_bastion');
  const cauldronHearth = SETTLEMENT_ZONES.find((s) => s.id === 'settlement_cauldron_hearth');
  assert.ok(emeraldGlade);
  assert.ok(aetherBastion);
  assert.ok(cauldronHearth);

  assert.equal(isPointInsideSettlementFence(-34, -748), true);
  assert.equal(isPointInsideSettlementFence(34, -885), true);
  assert.equal(isPointInsideSettlementFence(-34, -1020), true);

  // Verify biome mob spawn profiles and bestiary entries for all 9 new enemy types
  const emeraldProfile = getBiomeMobSpawnProfile('emerald_weald');
  const aetherProfile = getBiomeMobSpawnProfile('aether_sanctum');
  const cauldronProfile = getBiomeMobSpawnProfile('titan_cauldron');
  assert.equal(emeraldProfile.mainBossType, 'boss_emerald_archon');
  assert.equal(aetherProfile.mainBossType, 'boss_aether_seraph');
  assert.equal(cauldronProfile.mainBossType, 'boss_cauldron_behemoth');

  for (const newType of [
    'mana_wyrm',
    'corrupted_treant',
    'boss_emerald_archon',
    'aether_construct',
    'daeic_shadow',
    'boss_aether_seraph',
    'scrap_watcher',
    'ravager_stalker',
    'boss_cauldron_behemoth',
  ] as const) {
    assert.ok(
      BESTIARY_DATA.some((b) => b.type === newType),
      `Bestiary must include ${newType}`
    );
  }

  // Regular new mobs respawn, while the 3 new main bosses do not respawn
  assert.equal(isRespawnableMob({ id: 'wyrm_1', type: 'mana_wyrm' }), true);
  assert.equal(isRespawnableMob({ id: 'construct_1', type: 'aether_construct' }), true);
  assert.equal(isRespawnableMob({ id: 'watcher_1', type: 'scrap_watcher' }), true);
  assert.equal(isRespawnableMob({ id: 'b1', type: 'boss_emerald_archon' }), false);
  assert.equal(isRespawnableMob({ id: 'b2', type: 'boss_aether_seraph' }), false);
  assert.equal(isRespawnableMob({ id: 'b3', type: 'boss_cauldron_behemoth' }), false);

  // Verify Act IV quest givers and progression
  const qs = new QuestSystem();
  assert.equal(
    getActorQuestIndicatorState('npc_emerald_archdruid', qs.quests, qs.contracts),
    'exclamation'
  );
  assert.equal(
    getActorQuestIndicatorState('npc_aether_legate', qs.quests, qs.contracts),
    'exclamation'
  );
  assert.equal(
    getActorQuestIndicatorState('npc_cauldron_seeker', qs.quests, qs.contracts),
    'exclamation'
  );

  qs.activateQuest('quest_act4_emerald_dream');
  qs.completeStage('quest_act4_emerald_dream', 'q_emerald_talk_archdruid');
  qs.completeStage('quest_act4_emerald_dream', 'q_emerald_cleanse_roots');
  qs.completeStage('quest_act4_emerald_dream', 'q_emerald_defeat_archon');
  assert.equal(
    getActorQuestIndicatorState('npc_emerald_archdruid', qs.quests, qs.contracts),
    'question'
  );
});

test('resolveNpcVoiceProfile assigns male voices to all male NPCs and female voices to all female NPCs', () => {
  const maleNpcs: [string, string, string][] = [
    ['Староста Бран (Боримир)', 'Глава Вороньей Пади · Вальдмарк', 'npc_elder'],
    ['Кузнец Торн (Гром)', 'Оружейник старой гвардии Вальдмарка', 'npc_blacksmith'],
    ['Торговец Велеслав', 'Странствующий купец и трактирщик', 'npc_merchant'],
    ['Крестьянин Мирон', 'Житель Вороньей Пади · Земледелец', 'npc_peasant_farmer'],
    ['Лесоруб Степан', 'Житель Вороньей Пади · Дровосек', 'npc_peasant_woodcutter'],
    ['Стражник Гуннар', 'Дружина Вороньей Пади · Северный дозор', 'npc_guard_1'],
    ['Стражник Рольф', 'Дружина Вороньей Пади · Южный дозор', 'npc_guard_2'],
    ['Бард Корвин Песнопевец', 'Менестрель Вороньей Пади', 'npc_bard'],
    ['Караванщик Радован', 'Странствующий торговец с караваном', 'npc_caravan_merchant'],
    ['Скупщик редкостей «Хорь»', 'Чёрный рынок и контрабанда Среброзубого Перевала', 'npc_fence_pass'],
    ['Брат Торвальд', 'Боевой Напарник · Паладин-Отступник', 'npc_companion_thorvald'],
    ['Грандмастер Веспер', 'Боевой Напарник · Грандмастер Братства Пепла', 'npc_companion_vesper'],
    ['Лорд Эдгар Вейн', 'Квест «Пир Воронов» · Хозяин поместья в Топях', 'npc_lord_vane'],
    ['Капитан Ордена Валлен', 'Квест «Клятва в Мёртвых Шахтах» · Карательный отряд', 'npc_order_captain_mines'],
    ['Старейшина горняков Торос', 'Квест «Клятва в Мёртвых Шахтах» · Разумный рудокоп-мутант', 'npc_sentient_ghoul_elder'],
    ['Младший адепт Эриан', 'Квест «Последний Экзамен Зольника» · Послушник Школы Ворона', 'npc_apprentice_erian'],
    ['Инквизитор Лазарь', 'Командор Ордена Алого Солнца (Акт II)', 'npc_inquisitor'],
    ['Лодочник Харон', 'Проводник через Затопленные Топи', 'npc_charon'],
    ['Старый Рудокоп Бром', 'Мастер-кузнец Среброзубого Перевала', 'npc_brom'],
    ['Выживший Адепт Каэль', 'Хранитель архивов Братства Пепла', 'npc_kael'],
    ['Мельник Тихон', 'Хозяин ветряной мельницы Вороньей Пади', 'npc_village_miller'],
    ['Подмастерье мельника Яромир', 'Зерновой амбар Вороньей Пади', 'npc_village_miller_apprentice'],
    ['Сотник Родерик', 'Начальник караула и южной заставы', 'npc_guard_captain'],
    ['Страж западного моста Гарольд', 'Охрана тракта к гавани Сольхейм', 'npc_guard_west_bridge'],
    ['Страж восточного моста Маркус', 'Охрана тракта к Лазурному Монастырю', 'npc_guard_east_bridge'],
    ['Ловчий Берен', 'Старейший егерь Лесной Заставы', 'npc_forest_ranger'],
    ['Пильщик Корней', 'Лесопильня у западного ручья', 'npc_forest_sawyer'],
    ['Интендант Ордена Кассиан', 'Снабженец полевого лагеря Алого Солнца', 'npc_cemetery_quartermaster'],
    ['Дозорный гатей Варг', 'Смотритель сигнальной вышки Топей', 'npc_swamp_watcher'],
    ['Плавильщик Дорн', 'Мастер горной плавильни Среброзубого Перевала', 'npc_pass_smelter'],
    ['Смотритель маяка Хендрик', 'Хранитель Маяка Бездны · Гавань Сольхейм', 'npc_solheim_keeper'],
    ['Капитан Корсар Вейл', 'Контрабандист и вольный шкипер Сольхейма', 'npc_solheim_smuggler'],
    ['Старый гарпунщик Олаф', 'Рыбацкий причал Сольхейма', 'npc_solheim_fisherman'],
    ['Береговой страж Сольхейма', 'Охрана каменного пирса и таможни', 'npc_solheim_guard'],
    ['Аббат Каэлум', 'Настоятель Лазурного Монастыря и Главный Звездочёт', 'npc_monastery_abbot'],
    ['Рыцарь-хранитель Солярис', 'Страж врат Лазурного Монастыря', 'npc_monastery_paladin'],
    ['Хранитель Звёздного Горна Эландр', 'Акт III · Последний Страж Кузницы Предтеч', 'npc_starfall_herald'],
    ['Часовой Лунного Клинка Эренд', 'Страж восточных ворот Приюта Сильверглейд', 'npc_emerald_guard_2'],
    ['Архонт-Центурион Кассиэль', 'Страж западных врат Заставы Серафимов', 'npc_aether_guard_1'],
    ['Серафим-Дозорный Люциан', 'Страж северного моста Заставы Серафимов', 'npc_aether_guard_2'],
    ['Копьеносец Искателей Рост', 'Страж восточных ворот Железного Очага', 'npc_cauldron_guard_2'],
    ['Король-Лич Малакор Бессмертный', 'Последний монарх Вальдмарка', ''],
  ];

  for (const [name, role, id] of maleNpcs) {
    const profile = resolveNpcVoiceProfile(name, role, id);
    assert.equal(
      profile.gender,
      'male',
      `Expected male voice for ${name} (${role}), got ${profile.gender}`
    );
    assert.ok(
      ['Fenrir', 'Charon', 'Orus', 'Puck'].includes(profile.geminiVoiceName),
      `Expected male Gemini voice for ${name}, got ${profile.geminiVoiceName}`
    );
    assert.ok(
      profile.neuralPitchMultiplier <= 0.8,
      `Expected lowered male baritone/bass pitch for ${name}, got ${profile.neuralPitchMultiplier}`
    );
    assert.ok(
      profile.voiceLabelRu.startsWith('Мужской голос'),
      `Expected Russian male voice label for ${name}, got ${profile.voiceLabelRu}`
    );
  }

  const femaleNpcs: [string, string, string][] = [
    ['Травница Марфа', 'Знахарка и хранительница Лесного Ковена', 'npc_herbalist'],
    ['Водонос Дарья', 'Жительница Вороньей Пади', 'npc_water_carrier'],
    ['Лира из Вольной Роты', 'Боевой Напарник · Лучница и следопыт', 'npc_companion_lyra'],
    ['Хельга, жена кузнеца Торна', 'Квест «Кровь на колокольне» · Заражённая «Ночным Голодом»', 'npc_belltower_helga'],
    ['Сестра Аурелия', 'Хранительница Скриптория и Аптекарского Сада', 'npc_monastery_chronicler'],
    ['Хранительница Сна Изераэль', 'Верховная друидка Изумрудного Сна · Приют Сильверглейд', 'npc_emerald_archdruid'],
    ['Стражница Рощи Талисса', 'Дозорная северных ворот Приюта Сильверглейд', 'npc_emerald_guard_1'],
    ['Легат Даэвов Серафина', 'Командор Заставы Серафимов · Хранительница Башни Вечности', 'npc_aether_legate'],
    ['Матриарх Искателей Алойя-Вальд', 'Глава племени Искателей · Охотница на Древние Машины', 'npc_cauldron_seeker'],
    ['Воительница Очага Валья', 'Дозорная северных ворот Железного Очага', 'npc_cauldron_guard_1'],
  ];

  for (const [name, role, id] of femaleNpcs) {
    const profile = resolveNpcVoiceProfile(name, role, id);
    assert.equal(
      profile.gender,
      'female',
      `Expected female voice for ${name} (${role}), got ${profile.gender}`
    );
    assert.ok(
      ['Kore', 'Aoede'].includes(profile.geminiVoiceName),
      `Expected female Gemini voice for ${name}, got ${profile.geminiVoiceName}`
    );
    assert.ok(
      profile.neuralPitchMultiplier >= 0.95,
      `Expected natural female pitch for ${name}, got ${profile.neuralPitchMultiplier}`
    );
    assert.ok(
      profile.voiceLabelRu.startsWith('Женский голос'),
      `Expected Russian female voice label for ${name}, got ${profile.voiceLabelRu}`
    );
  }

  // Verify Streamer FooZzee has a male voice profile
  const foozzeeVoice = resolveNpcVoiceProfile(
    'Стример FooZzee (Андрей)',
    'Хроно-Стример из Будущего · Twitch: twitch.tv/foozzee',
    'npc_streamer_foozzee'
  );
  assert.equal(foozzeeVoice.gender, 'male');
  assert.equal(foozzeeVoice.geminiVoiceName, 'Puck');
});

test('resolveNpcPersona and evaluateNpcCognitiveTurn provide unique biographies, inner thoughts, non-repeating replies, friendship, quarrels, romance, and Streamer FooZzee Twitch integration', () => {
  // 1. Streamer FooZzee unique profile & Twitch info
  const foozzee = resolveNpcPersona(
    'Стример FooZzee (Андрей)',
    'Хроно-Стример из Будущего · Twitch: twitch.tv/foozzee',
    'npc_streamer_foozzee'
  );
  assert.equal(foozzee.id, 'npc_streamer_foozzee');
  assert.equal(foozzee.twitchUrl, STREAMER_FOOZZEE_TWITCH_URL);
  assert.equal(foozzee.twitchUrl, 'https://www.twitch.tv/foozzee');
  assert.equal(foozzee.communityUrl, STREAMER_FOOZZEE_SITE_URL);
  assert.ok(foozzee.biography.includes('Euro Truck Simulator 2'));
  assert.ok(foozzee.biography.includes('https://www.twitch.tv/foozzee'));

  // 2. Every NPC gets a distinct backstory and personality
  const marfa = resolveNpcPersona('Травница Марфа', 'Знахарка и хранительница Лесного Ковена');
  const lyra = resolveNpcPersona('Лира из Вольной Роты', 'Лучница и следопыт');
  const guardGunnar = resolveNpcPersona('Стражник Гуннар', 'Дружина Вороньей Пади');
  const guardRolf = resolveNpcPersona('Стражник Рольф', 'Дружина Вороньей Пади');

  assert.notEqual(marfa.biography, lyra.biography);
  assert.notEqual(guardGunnar.biography, guardRolf.biography);
  assert.notEqual(guardGunnar.secretDream, guardRolf.secretDream);

  // 3. Non-repeating cognitive responses + inner thought process
  let rel = createInitialRelationshipState(foozzee);
  const seenReplies = new Set<string>();
  const history: { role: 'user' | 'npc'; text: string }[] = [];

  for (let i = 0; i < 4; i++) {
    const turn = evaluateNpcCognitiveTurn({
      npcName: 'Стример FooZzee (Андрей)',
      npcRole: 'Хроно-Стример из Будущего',
      npcId: 'npc_streamer_foozzee',
      playerText: 'Привет, расскажи про свой стрим на Twitch и во что ты играешь?',
      currentRelationship: rel,
      history,
      biomeName: 'Деревня Воронья Падь',
      questTitle: 'Пропавшие охотники',
      socialAction: 'chat',
    });
    assert.ok(turn.replyText.length > 20, 'Reply must be a thoughtful full sentence');
    assert.ok(turn.thoughtProcess.length > 15, 'NPC must generate an inner thought process');
    assert.ok(
      !seenReplies.has(turn.replyText),
      `NPC must not repeat identical phrase on turn ${i + 1}: ${turn.replyText}`
    );
    seenReplies.add(turn.replyText);
    history.push({ role: 'user', text: 'Привет, расскажи про свой стрим на Twitch и во что ты играешь?' });
    history.push({ role: 'npc', text: turn.replyText });
    rel = turn.updatedRelationship;
  }

  // 4. Quarrel and Apology mechanics
  const thornRel = createInitialRelationshipState(resolveNpcPersona('Кузнец Торн (Гром)', 'Оружейник'));
  const quarrelTurn = evaluateNpcCognitiveTurn({
    npcName: 'Кузнец Торн (Гром)',
    npcRole: 'Оружейник',
    playerText: 'Ты меня раздражаешь, хватит стучать молотом!',
    currentRelationship: thornRel,
    history: [],
    biomeName: 'Деревня Воронья Падь',
    socialAction: 'quarrel',
  });
  assert.ok(quarrelTurn.updatedRelationship.affinity < thornRel.affinity, 'Quarrel must lower affinity');
  assert.ok(
    quarrelTurn.updatedRelationship.mood === 'offended' ||
      quarrelTurn.updatedRelationship.mood === 'hostile'
  );

  const apologizeTurn = evaluateNpcCognitiveTurn({
    npcName: 'Кузнец Торн (Гром)',
    npcRole: 'Оружейник',
    playerText: 'Прости меня, друг, я погорячился. Давай помиримся!',
    currentRelationship: quarrelTurn.updatedRelationship,
    history: [],
    biomeName: 'Деревня Воронья Падь',
    socialAction: 'apologize',
  });
  assert.ok(
    apologizeTurn.updatedRelationship.affinity > quarrelTurn.updatedRelationship.affinity,
    'Apology must restore affinity'
  );

  // 5. Romance & Falling in Love with any NPC (up to Lover / Soulmate)
  let romanceRel = createInitialRelationshipState(marfa);
  for (let i = 0; i < 3; i++) {
    const flirtTurn = evaluateNpcCognitiveTurn({
      npcName: 'Травница Марфа',
      npcRole: 'Знахарка',
      playerText: 'Ты невероятно красива, Марфа, рядом с тобой моё сердце бьётся чаще.',
      currentRelationship: romanceRel,
      history: [],
      biomeName: 'Деревня Воронья Падь',
      socialAction: 'flirt',
    });
    romanceRel = flirtTurn.updatedRelationship;
  }
  assert.ok(romanceRel.romance >= 35, `Expected romance >= 35 after flirting, got ${romanceRel.romance}`);

  for (let i = 0; i < 3; i++) {
    const loveTurn = evaluateNpcCognitiveTurn({
      npcName: 'Травница Марфа',
      npcRole: 'Знахарка',
      playerText: 'Я безумно люблю тебя! Моё сердце принадлежит тебе навсегда.',
      currentRelationship: romanceRel,
      history: [],
      biomeName: 'Деревня Воронья Падь',
      socialAction: 'confess_love',
    });
    romanceRel = loveTurn.updatedRelationship;
  }
  assert.ok(
    romanceRel.stage === 'lover' || romanceRel.stage === 'soulmate',
    `Expected lover or soulmate stage after confessing love, got ${romanceRel.stage}`
  );
  assert.equal(romanceRel.mood, 'passionate');
});

test('Audit integrity: all quest itemRewards and contract trophyItemIds exist in InventorySystem and localize cleanly', () => {
  const qs = new QuestSystem();
  const inv = new InventorySystem();

  for (const quest of qs.quests) {
    if (quest.itemReward) {
      assert.equal(
        inv.hasItemDefinition(quest.itemReward),
        true,
        `Quest ${quest.id} itemReward "${quest.itemReward}" must exist in InventorySystem`
      );
    }
    const localized = localizeQuest(quest, 'en');
    assert.ok(localized.title.length > 0);
    assert.notEqual(
      localized.title[0],
      localized.title[0].toLowerCase(),
      `Quest ${quest.id} English title should start with an uppercase letter: ${localized.title}`
    );
  }

  for (const contract of qs.contracts) {
    if (contract.trophyItemId) {
      assert.equal(
        inv.hasItemDefinition(contract.trophyItemId),
        true,
        `Contract ${contract.id} trophyItemId "${contract.trophyItemId}" must exist in InventorySystem`
      );
    }
  }

  for (const skill of inv.skills) {
    const localizedSkill = localizeSkill(skill, 'en');
    assert.notEqual(
      localizedSkill.name,
      skill.name,
      `Skill ${skill.id} should have an English translation`
    );
  }

  const ds = new DialogueSystem();
  const foozzeeNode = ds.getDialogueNode('foozzee_root', qs.quests);
  const enFoozzee = localizeDialogueNode(foozzeeNode, 'en');
  assert.ok(enFoozzee);
  assert.equal(enFoozzee?.speaker, 'Streamer FooZzee (Andrey)');
  assert.ok(enFoozzee?.text.includes('https://www.twitch.tv/foozzee'));
});





