export type SignType = 'flame' | 'barrier' | 'impulse' | 'illusion' | 'frost';

export interface MagicSignInfo {
  id: SignType;
  name: string;
  runicName: string;
  description: string;
  staminaCost: number;
  cooldown: number;
  color: string;
  hexColor: number;
}

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'potion'
  | 'resource'
  | 'trophy'
  | 'quest'
  | 'rune'
  | 'blueprint';

export type WitcherSetId = 'raven' | 'bear' | 'flame';

export interface GameItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'relic';
  value: number;
  quantity: number;
  equipped?: boolean;
  upgradeLevel?: number;
  setId?: WitcherSetId;
  socketedRuneId?: string;
  craftRecipe?: { itemId: string; count: number }[];
  craftsItemId?: string;
  stats?: {
    attack?: number;
    silverAttack?: number;
    defense?: number;
    maxHealth?: number;
    signIntensity?: number;
    healAmount?: number;
    staminaBoost?: number;
    critChanceBonus?: number;
    goldBonus?: number;
    hpRegenBonus?: number;
    runeEffect?: 'fire' | 'bleed' | 'vamp' | 'ward';
  };
}

export interface SkillNode {
  id: string;
  branch: 'combat' | 'signs' | 'alchemy';
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  cost: number;
}

export type EnemyType =
  | 'wolf'
  | 'ghoul'
  | 'hag'
  | 'demon'
  | 'boss'
  | 'werewolf'
  | 'noonwraith'
  | 'gargoyle'
  | 'skeleton'
  | 'malakor';

export type AIState =
  | 'IDLE'
  | 'PATROL'
  | 'DETECT'
  | 'CHASE'
  | 'ATTACK'
  | 'HIT'
  | 'STUNNED'
  | 'RETREAT'
  | 'DEAD';

export interface EnemyData {
  id: string;
  type: EnemyType;
  name: string;
  isSilverVulnerable: boolean;
  level: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  detectRadius: number;
  attackRadius: number;
  attackCooldown: number;
  xpReward: number;
  goldReward: number;
  lootTable: string[];
  state: AIState;
  spawnX: number;
  spawnZ: number;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  stunTimer: number;
  burnTimer: number;
  slowTimer: number;
  confusedTimer: number;
  questTag?: string;
  phase?: 1 | 2 | 3;
  packId?: string;
  isContractBoss?: boolean;
  astralInvulnerable?: boolean;
  phylacteryShield?: boolean;
}

export interface HunterContract {
  id: string;
  title: string;
  monsterName: string;
  monsterType: EnemyType;
  biome: string;
  recommendedLevel: number;
  rewardGold: number;
  rewardXp: number;
  trophyItemId: string;
  description: string;
  status: 'available' | 'tracking' | 'boss_spawned' | 'completed';
  cluesFound: number;
  cluesRequired: number;
  searchX: number;
  searchZ: number;
}

export interface BestiaryEntry {
  id: string;
  type: EnemyType;
  name: string;
  title: string;
  category: string;
  lore: string;
  weaknessSigns: string[];
  weaknessOil: string;
  trophyBonus: string;
  dangerLevel: number;
}

export interface FloatingDamage {
  id: string;
  text: string;
  x: number; // Screen percentage 0..100
  y: number; // Screen percentage 0..100
  isCrit: boolean;
  isPlayerHit: boolean;
  color?: string;
  value?: number;
  isHeal?: boolean;
  createdAt?: number;
}

export interface DicePokerState {
  opponentName: string;
  bet: number;
  playerDice: number[];
  npcDice: number[];
  selectedForReroll: boolean[];
  stage: 'betting' | 'select_reroll' | 'finished';
  winner?: 'player' | 'npc' | 'draw';
  playerHandLabel: string;
  npcHandLabel: string;
  message: string;
}

export interface RoadEventPopup {
  id: string;
  title: string;
  description: string;
  options: {
    label: string;
    outcome: 'fight' | 'pay' | 'sign' | 'ignore';
  }[];
}

export interface QuestStage {
  id: string;
  description: string;
  completed: boolean;
  targetX: number;
  targetZ: number;
  radius: number;
}

export interface Quest {
  id: string;
  title: string;
  giver: string;
  biome: string;
  recommendedLevel: number;
  description: string;
  status: 'locked' | 'available' | 'active' | 'completed';
  currentStageIndex: number;
  stages: QuestStage[];
  xpReward: number;
  goldReward: number;
  itemReward?: string;
  choiceTaken?: string;
}

export interface PrologueSlide {
  id: string;
  chapter: string;
  title: string;
  text: string;
  subtext: string;
  camPos: [number, number, number];
  lookAt: [number, number, number];
}

export type CodexCategory = 'history' | 'brotherhood' | 'factions';

export interface CodexArticle {
  id: string;
  category: CodexCategory;
  title: string;
  subtitle: string;
  unlockedByDefault: boolean;
  content: string;
  quote?: string;
}

export interface LoreNoteData {
  id: string;
  number: number;
  title: string;
  locationHint: string;
  x: number;
  z: number;
  visualStyle:
    | 'camp_diary'
    | 'podium_tome'
    | 'skeleton_scroll'
    | 'alchemist_desk'
    | 'edict_pillar'
    | 'shrine_tablet'
    | 'royal_lectern';
  summary: string;
  content: string;
  corvusComment: string;
}

export interface DialogueOption {
  id: string;
  text: string;
  nextNodeId?: string;
  action?:
    | 'accept_quest_1'
    | 'complete_quest_1'
    | 'start_quest_2'
    | 'destroy_artifact'
    | 'cleanse_artifact'
    | 'start_quest_3'
    | 'open_shop'
    | 'open_blacksmith'
    | 'open_dice_poker'
    | 'open_notice_board'
    | 'open_alchemy'
    | 'open_codex'
    | 'side_order'
    | 'side_village'
    | 'secret_redemption'
    | 'heal_player'
    | 'close';
  conditionQuestId?: string;
  conditionStatus?: 'available' | 'active' | 'completed';
  conditionStageIndex?: number;
  requiresLoreMaster?: boolean;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  role: string;
  text: string;
  options: DialogueOption[];
}

export type InteractableType =
  | 'npc'
  | 'clue'
  | 'chest'
  | 'herb'
  | 'campfire'
  | 'shrine'
  | 'signpost'
  | 'loot'
  | 'notice_board'
  | 'monster_nest'
  | 'place_of_power'
  | 'catacombs_portal'
  | 'rune_pillar'
  | 'lore_note';

export interface WorldInteractable {
  id: string;
  type: InteractableType;
  name: string;
  roleOrSubtitle?: string;
  promptText: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  interacted: boolean;
  repeatable: boolean;
  dialogueRootId?: string;
  questId?: string;
  questStageId?: string;
  contractId?: string;
  lootItems?: { itemId: string; count: number }[];
  goldAmount?: number;
  loreText?: string;
  loreNoteId?: string;
  visualStyle?: LoreNoteData['visualStyle'];
  isPOI?: boolean;
  discovered?: boolean;
  pillarIndex?: number;
  pillarState?: number;
}

export type BiomeId =
  | 'village'
  | 'forgotten_lands'
  | 'old_forest'
  | 'cursed_sanctuary'
  | 'ruined_fortress'
  | 'ash_cemetery'
  | 'catacombs';

export type WeatherType = 'clear' | 'fog' | 'rain';

export interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high';
  resolutionScale: number;
  shadows: boolean;
  weatherEffects: boolean;
  audioEnabled: boolean;
  masterVolume: number;
}

export type BladeOilType = 'none' | 'necrophage' | 'cursed' | 'specter';

export interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  skillPoints: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  toxicity: number;
  maxToxicity: number;
  gold: number;
  baseAttack: number;
  baseDefense: number;
  signIntensity: number;
  activeSign: SignType;
  barrierShield: number;
  potionCooldown: number;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  activeBladeOil?: BladeOilType;
  bladeOilTimer?: number;
  placeOfPowerTimer?: number;
  catElixirTimer?: number;
  thunderElixirTimer?: number;
  blizzardElixirTimer?: number;
  factionChoice?: 'none' | 'order' | 'village' | 'redemption';
  diceChampionsDefeated?: string[];
  discoveredLoreIds?: string[];
  loreMasterUnlocked?: boolean;
  secretEndingUnlocked?: boolean;
}

export type ActiveModalType =
  | 'none'
  | 'inventory'
  | 'quests'
  | 'map'
  | 'dialogue'
  | 'shop'
  | 'blacksmith'
  | 'pause'
  | 'death'
  | 'victory'
  | 'notice_board'
  | 'bestiary'
  | 'alchemy'
  | 'meditation'
  | 'dice_poker'
  | 'road_event'
  | 'codex'
  | 'lore_reader'
  | 'prologue';

export interface HUDState {
  player: PlayerStats;
  activeQuest: Quest | null;
  allQuests: Quest[];
  contracts: HunterContract[];
  nearbyInteractable: WorldInteractable | null;
  lockedEnemy: EnemyData | null;
  isTargetLocked: boolean;
  bossEnemy: EnemyData | null;
  currentBiomeName: string;
  timeOfDay: number; // 0..24
  weather: WeatherType;
  signCooldowns: Record<SignType, number>;
  combatLog: { id: string; text: string; type: 'info' | 'damage' | 'quest' | 'loot' }[];
  floatingDamages: FloatingDamage[];
  inventory: GameItem[];
  skills: SkillNode[];
  activeModal: ActiveModalType;
  activeDialogueNode: DialogueNode | null;
  notificationBanner: { title: string; subtitle: string } | null;
  settings: GraphicsSettings;
  worldInteractables: WorldInteractable[];
  enemies: {
    id: string;
    name: string;
    type: EnemyType;
    x: number;
    z: number;
    hp: number;
    maxHp: number;
    state: AIState;
  }[];
  hunterVisionActive: boolean;
  activeSetBonus: WitcherSetId | null;
  catacombsGateOpen: boolean;
  pillarStates: [number, number, number];
  dicePoker?: DicePokerState | null;
  roadEvent?: RoadEventPopup | null;
  bestiary?: BestiaryEntry[];
  discoveredLoreIds: string[];
  activeLoreNote: LoreNoteData | null;
  codexArticles?: CodexArticle[];
  worldLoreNotes?: LoreNoteData[];
  prologueSlideIndex: number;
  prologueSlides?: PrologueSlide[];
}


