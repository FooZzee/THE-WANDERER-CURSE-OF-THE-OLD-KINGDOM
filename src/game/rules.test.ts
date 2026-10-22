import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceQuestStage,
  applyExperienceGain,
  calculateIncomingPlayerDamage,
  calculatePlayerAttackDamage,
  computeEffectivePlayerStats,
  discoverLoreEntry,
  getBiomeAt,
  getGroundHeight,
  getNextWeatherState,
  interpolateWeatherMetrics,
  isTargetInAttackCone,
  MAGIC_SIGNS,
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

test('WORLD_LORE_NOTES defines 12 canonical chronicles and discoverLoreEntry awards +25 XP and unlocks Memory Keeper title at 12/12', () => {
  assert.equal(WORLD_LORE_NOTES.length, 12);
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
    assert.equal(res.unlockedLoreMaster, i + 1 === 12);
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



