import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { CombatSystem } from './CombatSystem';
import { DialogueSystem } from './DialogueSystem';
import { EnemyAI } from './EnemyAI';
import { InventorySystem } from './InventorySystem';
import { CODEX_ARTICLES, PROLOGUE_SLIDES, WORLD_LORE_NOTES } from './loreData';
import { MagicSystem } from './MagicSystem';
import { PlayerController } from './PlayerController';
import { QuestSystem } from './QuestSystem';
import {
  applyExperienceGain,
  BESTIARY_DATA,
  computeEffectivePlayerStats,
  createInitialDicePokerState,
  discoverLoreEntry,
  evaluateDiceHand,
  getBiomeAt,
  getGroundHeight,
  getNextWeatherState,
  MAGIC_SIGNS,
  pickNpcRerollIndices,
  resolveDicePokerOutcome,
  rollDiceArray,
  WEATHER_PRESETS,
} from './rules';
import { SaveSystem } from './SaveSystem';
import { SceneManager } from './SceneManager';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import type {
  BladeOilType,
  CodexArticle,
  DicePokerState,
  DialogueNode,
  DialogueOption,
  EnemyData,
  FloatingDamage,
  GraphicsSettings,
  HUDState,
  LoreNoteData,
  RoadEventPopup,
  SignType,
  WeatherType,
} from './types';
import { WorldSystem } from './WorldSystem';

const SIGN_KEYS: Record<string, SignType> = {
  Digit1: 'flame',
  Digit2: 'barrier',
  Digit3: 'impulse',
  Digit4: 'illusion',
  Digit5: 'frost',
};

export class Game {
  public sceneManager: SceneManager;
  public cameraController: ThirdPersonCamera;
  public player: PlayerController;
  public enemyAI: EnemyAI;
  public combat: CombatSystem;
  public magic: MagicSystem;
  public quests: QuestSystem;
  public questSystem: QuestSystem;
  public dialogue: DialogueSystem;
  public inventory: InventorySystem;
  public inventorySystem: InventorySystem;
  public world: WorldSystem;
  public audio: AudioManager;

  public activeModal: HUDState['activeModal'] = 'none';
  public activeDialogueNode: DialogueNode | null = null;
  public activeLoreNote: LoreNoteData | null = null;
  public prologueSlideIndex = 0;
  private prologueLookAt = new THREE.Vector3(0, 2, -20);
  public notificationBanner: { title: string; subtitle: string } | null = null;
  public dicePokerState: DicePokerState | null = null;
  public roadEventPopup: RoadEventPopup | null = null;
  public floatingDamages: FloatingDamage[] = [];
  public hunterVisionActive = false;
  public catacombsGateUnlocked = false;
  private catacombsTrapTimer = 0;
  private roadEventTimer = 42;
  private weatherCycleTimer = 45;
  private triggeredRoadEventIds: Set<string> = new Set();

  public settings: GraphicsSettings = {
    quality: 'high',
    resolutionScale: 1.0,
    shadows: true,
    weatherEffects: true,
    audioEnabled: true,
    masterVolume: 0.6,
  };

  private clock = new THREE.Clock();
  private rafId = 0;
  private isRunning = false;
  private isPaused = false;
  private hudSyncTimer = 0;
  private headlessRenderTimer = 0;
  private bannerTimer = 0;
  private combatLog: HUDState['combatLog'] = [];
  private onHUDUpdate: (state: HUDState) => void;

  // Mouse interaction tracking
  private isDraggingCamera = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lmbDownTime = 0;
  private heavyAttackTriggeredOnHold = false;

  constructor(container: HTMLElement, onHUDUpdate: (state: HUDState) => void) {
    this.onHUDUpdate = onHUDUpdate;
    this.audio = new AudioManager();
    this.sceneManager = new SceneManager(container);
    this.cameraController = new ThirdPersonCamera(
      (container.clientWidth || window.innerWidth) /
        Math.max(1, container.clientHeight || window.innerHeight)
    );

    const heroRig = this.sceneManager.getAssetManager().createHeroModel();
    this.player = new PlayerController(heroRig, this.sceneManager.scene);
    this.enemyAI = new EnemyAI(
      this.sceneManager.scene,
      this.sceneManager.getAssetManager()
    );
    this.combat = new CombatSystem(this.sceneManager.scene, this.audio);
    this.magic = new MagicSystem(this.sceneManager.scene, this.audio);
    this.quests = new QuestSystem();
    this.questSystem = this.quests;
    this.dialogue = new DialogueSystem();
    this.inventory = new InventorySystem();
    this.inventorySystem = this.inventory;
    this.world = new WorldSystem(
      this.sceneManager.scene,
      this.sceneManager.getAssetManager()
    );

    // Pre-compile shaders once on hardware GPU
    if (!this.sceneManager.isHeadless) {
      this.sceneManager.renderer.compile(
        this.sceneManager.scene,
        this.cameraController.camera
      );
    }

    this.cameraController.attachPointerLock(
      this.sceneManager.renderer.domElement,
      () => this.isRunning && !this.isPaused && this.activeModal === 'none'
    );

    this.bindEvents();
    const initialEff = computeEffectivePlayerStats(
      this.player.stats,
      this.inventory.items,
      this.inventory.skills
    );
    this.player.stats.hp = initialEff.maxHp;
    this.syncHeroVisuals();
    this.addLog('Добро пожаловать в Воронью Падь, Странник.', 'info');
    this.emitHUD();
  }

  public syncHeroVisuals(): void {
    const equippedArmor = this.inventory.items.find(
      (i) => i.category === 'armor' && i.equipped
    );
    const equippedWeapon = this.inventory.items.find(
      (i) => i.category === 'weapon' && i.equipped && i.socketedRuneId
    );

    const cloakMesh = this.player.rig.cloak as THREE.Mesh | undefined;
    if (cloakMesh && cloakMesh.material instanceof THREE.MeshStandardMaterial) {
      const setId = equippedArmor?.setId;
      if (setId === 'raven') {
        cloakMesh.material.color.setHex(0x1e293b);
      } else if (setId === 'bear') {
        cloakMesh.material.color.setHex(0x451a03);
      } else if (setId === 'flame') {
        cloakMesh.material.color.setHex(0x7f1d1d);
      } else {
        cloakMesh.material.color.setHex(0x292524);
      }
    }

    const weaponMesh = this.player.rig.weaponMesh as THREE.Mesh | undefined;
    if (
      weaponMesh &&
      weaponMesh.material instanceof THREE.MeshStandardMaterial
    ) {
      const runeEffect = equippedWeapon?.stats?.runeEffect;
      if (runeEffect === 'fire') {
        weaponMesh.material.emissive.setHex(0xf97316);
        weaponMesh.material.emissiveIntensity = 0.85;
      } else if (runeEffect === 'vamp') {
        weaponMesh.material.emissive.setHex(0xdc2626);
        weaponMesh.material.emissiveIntensity = 0.85;
      } else if (runeEffect === 'bleed') {
        weaponMesh.material.emissive.setHex(0xf43f5e);
        weaponMesh.material.emissiveIntensity = 0.7;
      } else {
        weaponMesh.material.emissive.setHex(0x000000);
        weaponMesh.material.emissiveIntensity = 0;
      }
    }
  }

  public addFloatingDamage(
    worldPos: THREE.Vector3,
    amount: number,
    isCrit: boolean,
    color: string,
    label?: string
  ): void {
    const projected = worldPos.clone();
    projected.y += 1.9;
    projected.project(this.cameraController.camera);
    if (projected.z > 1) return;
    const x = (projected.x * 0.5 + 0.5) * 100;
    const y = (-(projected.y * 0.5) + 0.5) * 100;
    const isHeal = color === '#4ade80';
    const textDisplay =
      amount > 0
        ? `${isHeal ? '+' : '-'}${amount}${label ? ` ${label}` : ''}`
        : label ?? '';
    this.floatingDamages.push({
      id: `${Date.now()}-${Math.random()}`,
      value: amount,
      text: textDisplay,
      x: Math.max(8, Math.min(92, x + (Math.random() - 0.5) * 4)),
      y: Math.max(10, Math.min(85, y + (Math.random() - 0.5) * 3)),
      isCrit,
      isPlayerHit: color === '#ef4444',
      isHeal,
      color,
      createdAt: performance.now(),
    });
    if (this.floatingDamages.length > 14) {
      this.floatingDamages.shift();
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.audio.startAmbient();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.cameraController.unlockPointer();
    }
  }

  private bindEvents(): void {
    const canvas = this.sceneManager.renderer.domElement;

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('wheel', this.onMouseWheel, { passive: true });
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onWindowResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.sceneManager.handleResize(w, h);
    this.cameraController.handleResize(w, h);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.isPaused) return;
    this.player.keys[e.code] = true;

    if (e.code === 'Escape') {
      if (this.activeModal === 'prologue') {
        this.skipPrologue();
        return;
      }
      if (this.activeModal !== 'none' && this.activeModal !== 'death') {
        this.dicePokerState = null;
        this.roadEventPopup = null;
        this.setModal('none');
      } else if (this.activeModal === 'none') {
        this.setModal('pause');
      }
      return;
    }

    if (this.activeModal === 'prologue') {
      if (e.code === 'Space') {
        e.preventDefault();
        this.skipPrologue();
      } else if (e.code === 'Enter' || e.code === 'ArrowRight' || e.code === 'KeyE') {
        e.preventDefault();
        this.nextPrologueSlide();
      }
      return;
    }

    if (this.activeModal === 'lore_reader') {
      if (e.code === 'KeyE' || e.code === 'Space') {
        e.preventDefault();
        this.setModal('none');
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        this.setModal('codex');
      }
      return;
    }

    // Modal hotkeys
    if (e.code === 'KeyI') {
      this.setModal(this.activeModal === 'inventory' ? 'none' : 'inventory');
      return;
    }
    if (e.code === 'KeyJ') {
      this.setModal(this.activeModal === 'quests' ? 'none' : 'quests');
      return;
    }
    if (e.code === 'KeyM') {
      this.setModal(this.activeModal === 'map' ? 'none' : 'map');
      return;
    }
    if (e.code === 'KeyB') {
      this.setModal(this.activeModal === 'bestiary' ? 'none' : 'bestiary');
      return;
    }
    if (e.code === 'KeyL') {
      this.setModal(this.activeModal === 'codex' ? 'none' : 'codex');
      return;
    }
    if (e.code === 'KeyN') {
      this.setModal(this.activeModal === 'alchemy' ? 'none' : 'alchemy');
      return;
    }

    if (this.activeModal !== 'none') return;

    // Gameplay hotkeys
    if (e.code === 'Space') {
      e.preventDefault();
      this.triggerDodge();
    } else if (e.code === 'KeyV') {
      if (!this.hunterVisionActive) {
        this.hunterVisionActive = true;
        this.emitHUD();
      }
    } else if (e.code === 'KeyQ') {
      const nextSign = this.player.cycleActiveSign();
      this.addLog(`Выбран Знак: ${MAGIC_SIGNS[nextSign].name}`, 'info');
      this.emitHUD();
    } else if (SIGN_KEYS[e.code]) {
      const sign = SIGN_KEYS[e.code];
      this.player.selectSign(sign);
      this.addLog(`Выбран Знак: ${MAGIC_SIGNS[sign].name}`, 'info');
      this.emitHUD();
    } else if (e.code === 'KeyR') {
      this.triggerMagicSign();
    } else if (e.code === 'KeyE') {
      this.triggerInteraction();
    } else if (e.code === 'KeyF' || e.code === 'KeyH') {
      this.drinkQuickPotion();
    } else if (e.code === 'KeyG') {
      this.drinkSecondaryElixir();
    } else if (e.code === 'KeyT') {
      this.cycleWeather();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.player.keys[e.code] = false;
    if (e.code === 'KeyV') {
      this.hunterVisionActive = false;
      this.emitHUD();
    }
  };

  private onMouseWheel = (e: WheelEvent): void => {
    if (this.isPaused || this.activeModal !== 'none') return;
    if (Math.abs(e.deltaY) > 5) {
      const nextSign = this.player.cycleActiveSign();
      this.addLog(`Выбран Знак: ${MAGIC_SIGNS[nextSign].name}`, 'info');
      this.emitHUD();
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (this.isPaused || this.activeModal !== 'none') return;
    this.audio.startAmbient();

    if (e.button === 0) {
      this.lmbDownTime = performance.now();
      this.heavyAttackTriggeredOnHold = false;
      this.isDraggingCamera = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (e.button === 2) {
      this.player.isBlocking = true;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isDraggingCamera = false;
      if (
        !this.isPaused &&
        this.activeModal === 'none' &&
        !this.heavyAttackTriggeredOnHold &&
        this.lmbDownTime > 0
      ) {
        const heldMs = performance.now() - this.lmbDownTime;
        this.performPlayerAttack(heldMs >= 240);
      }
      this.lmbDownTime = 0;
    } else if (e.button === 2) {
      this.player.isBlocking = false;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isPaused || this.activeModal !== 'none') return;

    if (document.pointerLockElement === this.sceneManager.renderer.domElement) {
      this.cameraController.rotate(e.movementX, e.movementY);
    } else if (this.isDraggingCamera) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      if (Math.hypot(dx, dy) > 2) {
        this.cameraController.rotate(dx * 1.4, dy * 1.4);
      }
    }
  };

  public triggerDodge(): void {
    if (this.player.startDodge(this.cameraController.yaw)) {
      this.audio.playDodge();
      this.emitHUD();
    }
  }

  public performSwordAttack(heavy: boolean): void {
    this.performPlayerAttack(heavy);
  }

  public performPlayerAttack(heavy: boolean): void {
    if (this.activeModal !== 'none') return;

    let targetAngle: number | undefined;
    let closestDist = 4.5;
    for (const e of this.enemyAI.enemies) {
      if (e.data.state === 'DEAD') continue;
      const d = Math.hypot(
        e.data.x - this.player.stats.x,
        e.data.z - this.player.stats.z
      );
      if (d < closestDist) {
        closestDist = d;
        targetAngle = Math.atan2(
          e.data.x - this.player.stats.x,
          e.data.z - this.player.stats.z
        );
      }
    }

    if (this.player.startAttack(heavy, targetAngle)) {
      this.audio.playSwordSwing(heavy);
      this.emitHUD();
    }
  }

  public triggerMagicSign(): void {
    if (this.activeModal !== 'none') return;
    const eff = computeEffectivePlayerStats(
      this.player.stats,
      this.inventory.items,
      this.inventory.skills
    );
    const casted = this.magic.castSign(
      this.player.stats.activeSign,
      this.player,
      eff.signIntensity,
      this.enemyAI,
      this.combat,
      this.sceneManager.obstacles,
      this.handleEnemyKilled,
      this.addLog
    );
    if (casted) {
      this.emitHUD();
    }
  }

  public useQuickPotion(): void {
    this.drinkQuickPotion();
  }

  public drinkQuickPotion(): void {
    const eff = computeEffectivePlayerStats(
      this.player.stats,
      this.inventory.items,
      this.inventory.skills
    );
    const res = this.inventory.useQuickPotion(this.player.stats, eff.maxHp);
    if (res.used) {
      this.audio.playPotionDrink();
      this.addLog(res.message, 'loot');
      this.addFloatingDamage(
        new THREE.Vector3(this.player.stats.x, this.player.stats.y, this.player.stats.z),
        65,
        false,
        '#4ade80',
        'ОЗ'
      );
      this.emitHUD();
    } else {
      this.addLog(res.message, 'info');
    }
  }

  public drinkSecondaryElixir(): void {
    const eff = computeEffectivePlayerStats(
      this.player.stats,
      this.inventory.items,
      this.inventory.skills
    );
    const elixir = this.inventory.items.find(
      (i) =>
        i.category === 'potion' &&
        i.quantity > 0 &&
        i.id !== 'potion_swallow'
    );
    if (!elixir) {
      this.addLog('Нет дополнительных эликсиров на поясе (Гром / Кошка / Пурга).', 'info');
      return;
    }
    const res = this.inventory.useQuickPotion(
      this.player.stats,
      eff.maxHp,
      elixir.id
    );
    if (res.used) {
      this.audio.playPotionDrink();
      this.addLog(res.message, 'loot');
      this.emitHUD();
    } else {
      this.addLog(res.message, 'info');
    }
  }

  public useInventoryItem(itemId: string): void {
    const eff = computeEffectivePlayerStats(
      this.player.stats,
      this.inventory.items,
      this.inventory.skills
    );
    const item = this.inventory.items.find((i) => i.id === itemId);
    if (!item) return;

    if (
      item.category === 'weapon' ||
      item.category === 'armor' ||
      item.category === 'trophy'
    ) {
      this.inventory.toggleEquip(itemId);
      this.syncHeroVisuals();
      this.addLog(
        `${item.name}: ${item.equipped ? 'экипировано' : 'снято'}`,
        'info'
      );
      this.emitHUD();
      return;
    }

    if (item.category === 'potion') {
      const res = this.inventory.useQuickPotion(
        this.player.stats,
        eff.maxHp,
        itemId
      );
      if (res.used) {
        this.audio.playPotionDrink();
        this.addLog(res.message, 'loot');
      } else {
        this.addLog(res.message, 'info');
      }
      this.emitHUD();
    }
  }

  public applyBladeOil(oilType: BladeOilType): void {
    this.player.stats.activeBladeOil = oilType;
    this.player.stats.bladeOilTimer = oilType === 'none' ? 0 : 180;
    const oilLabels: Record<BladeOilType, string> = {
      none: 'Масло стёрто',
      necrophage: 'Масло против трупоедов (+30% урона на 3 мин)',
      cursed: 'Масло против проклятых (+30% урона на 3 мин)',
      specter: 'Масло против призраков (+30% урона на 3 мин)',
    };
    this.audio.playPotionDrink();
    this.addLog(`Нанесено на клинок: ${oilLabels[oilType]}`, 'loot');
    if (oilType !== 'none') {
      this.showBanner('Масло нанесено на клинок', oilLabels[oilType]);
    }
    this.emitHUD();
  }

  public brewAlchemyRecipe(
    recipeId: 'potion_swallow' | 'potion_thunderbolt' | 'potion_cat' | 'potion_blizzard'
  ): void {
    const res = this.inventory.brewElixir(recipeId);
    if (res.ok) {
      this.audio.playQuestChime();
      this.addLog(res.message, 'loot');
    } else {
      this.addLog(res.message, 'info');
    }
    this.emitHUD();
  }

  public socketRune(runeItemId: string, targetItemId: string): void {
    const res = this.inventory.socketRune(targetItemId, runeItemId);
    if (res.ok) {
      this.audio.playQuestChime();
      this.syncHeroVisuals();
      this.addLog(res.message, 'loot');
    } else {
      this.addLog(res.message, 'info');
    }
    this.emitHUD();
  }

  public craftSchoolBlueprint(blueprintId: string): void {
    const res = this.inventory.craftBlueprint(blueprintId, this.player.stats);
    if (res.ok) {
      this.audio.playHitImpact(true);
      this.syncHeroVisuals();
      this.addLog(res.message, 'loot');
    } else {
      this.addLog(res.message, 'info');
    }
    this.emitHUD();
  }

  public acceptContract(contractId: string): void {
    const contract = this.quests.acceptContract(contractId);
    if (!contract) return;
    this.audio.playQuestChime();
    this.addLog(`Принят контракт: ${contract.title}`, 'quest');
    this.showBanner(
      `Контракт принят: ${contract.title}`,
      `Отправляйтесь в регион «${contract.biome}» и изучите 3 улики [E]`
    );
    this.emitHUD();
  }

  public startDicePoker(npcName: string, bet: number): void {
    const actualBet = Math.min(bet, Math.max(10, this.player.stats.gold));
    if (this.player.stats.gold < 10) {
      this.addLog('У вас недостаточно крон для игры в Кости Судьбы (нужно минимум 10).', 'info');
      return;
    }
    this.dicePokerState = createInitialDicePokerState(npcName, actualBet);
    this.setModal('dice_poker');
  }

  public toggleDiceHold(dieIndex: number): void {
    if (!this.dicePokerState || this.dicePokerState.stage !== 'select_reroll') return;
    const next = [...this.dicePokerState.selectedForReroll];
    next[dieIndex] = !next[dieIndex];
    this.dicePokerState = {
      ...this.dicePokerState,
      selectedForReroll: next,
    };
    this.emitHUD();
  }

  public rollDicePoker(): void {
    if (!this.dicePokerState) return;
    const st = this.dicePokerState;

    if (st.stage === 'betting') {
      const pDice = rollDiceArray(5);
      const nDice = rollDiceArray(5);
      this.dicePokerState = {
        ...st,
        playerDice: pDice,
        npcDice: nDice,
        selectedForReroll: [false, false, false, false, false],
        stage: 'select_reroll',
        playerHandLabel: evaluateDiceHand(pDice).label,
        npcHandLabel: evaluateDiceHand(nDice).label,
        message: 'Выберите кости для переброса и нажмите «Перебросить» или «Оставить руку».',
      };
      this.audio.playQuestChime();
      this.emitHUD();
      return;
    }

    if (st.stage === 'select_reroll') {
      const newPlayerDice = st.playerDice.map((val: number, idx: number) =>
        st.selectedForReroll[idx] ? Math.floor(Math.random() * 6) + 1 : val
      );
      this.finishDicePokerRound(newPlayerDice);
    }
  }

  public standDicePoker(): void {
    if (!this.dicePokerState || this.dicePokerState.stage !== 'select_reroll') return;
    this.finishDicePokerRound([...this.dicePokerState.playerDice]);
  }

  private finishDicePokerRound(finalPlayerDice: number[]): void {
    if (!this.dicePokerState) return;
    const st = this.dicePokerState;
    const npcRerollIdx = pickNpcRerollIndices(st.npcDice);
    const finalNpcDice = st.npcDice.map((val: number, idx: number) =>
      npcRerollIdx.includes(idx) ? Math.floor(Math.random() * 6) + 1 : val
    );

    const outcome = resolveDicePokerOutcome(
      finalPlayerDice,
      finalNpcDice,
      st.bet
    );
    this.player.stats.gold = Math.max(0, this.player.stats.gold + outcome.goldDelta);

    this.dicePokerState = {
      ...st,
      playerDice: finalPlayerDice,
      npcDice: finalNpcDice,
      stage: 'finished',
      winner: outcome.winner,
      playerHandLabel: outcome.playerEval.label,
      npcHandLabel: outcome.npcEval.label,
      message: outcome.summary,
    };

    if (outcome.winner === 'player') {
      this.audio.playQuestChime();
      this.addLog(`Кости Судьбы: Победа! Выигрыш +${outcome.goldDelta} крон.`, 'loot');
    } else if (outcome.winner === 'npc') {
      this.addLog(`Кости Судьбы: Проигрыш (${outcome.goldDelta} крон).`, 'info');
    } else {
      this.addLog('Кости Судьбы: Ничья! Ставка возвращена.', 'info');
    }
    this.emitHUD();
  }

  private updateRoadEncounters(dt: number): void {
    if (this.activeModal !== 'none') return;
    this.roadEventTimer -= dt;
    if (this.roadEventTimer > 0) return;
    this.roadEventTimer = 55;

    const px = this.player.stats.x;
    const pz = this.player.stats.z;
    const distFromVillage = Math.hypot(px, pz);
    if (distFromVillage < 24 || (px > 75 && pz > 75)) return;

    // Pick an unvisited road event
    const events: RoadEventPopup[] = [
      {
        id: 'road_merchant_wolves',
        title: 'Странствующий купец в беде',
        description:
          'На лесной дороге перевёрнута повозка. Купец отбивается факелом от голодных хищников и умоляет о помощи!',
        options: [
          {
            label: 'Защитить купца и перевязать его раны (+95 крон, +60 Опыта)',
            outcome: 'fight',
          },
          {
            label: 'Потребовать плату вперёд за спасение (+130 крон)',
            outcome: 'pay',
          },
          {
            label: 'Пройти мимо своей дорогой',
            outcome: 'ignore',
          },
        ],
      },
      {
        id: 'road_mysterious_pilgrim',
        title: 'Подозрительный пилигрим на перепутье',
        description:
          'Человек в сером плаще предлагает вам купить старинную шкатулку с рунами, найденную у границ Пепельного Погоста.',
        options: [
          {
            label: 'Купить шкатулку за 45 крон (Руна Вампиризма + Травы)',
            outcome: 'pay',
          },
          {
            label: 'Применить знак «Иллюзия» и разоблачить обманщика (+80 крон, +50 Опыта)',
            outcome: 'sign',
          },
          {
            label: 'Отказаться от сделки',
            outcome: 'ignore',
          },
        ],
      },
      {
        id: 'road_cursed_totem',
        title: 'Кровоточащий придорожный идол',
        description:
          'Древний деревянный идол у обочины источает багровый туман Затмения. Воздух вокруг дрожит от магии.',
        options: [
          {
            label: 'Очистить идол знаком «Пламя» (+85 Опыта, +25% к Знакам на 3 мин)',
            outcome: 'sign',
          },
          {
            label: 'Собрать редкую алхимическую траву с подножия (+3 Ласточкина трава)',
            outcome: 'fight',
          },
          {
            label: 'Не прикасаться к проклятому камню',
            outcome: 'ignore',
          },
        ],
      },
    ];

    const available = events.filter((e) => !this.triggeredRoadEventIds.has(e.id));
    if (available.length === 0) return;

    const chosen = available[Math.floor(Math.random() * available.length)];
    this.triggeredRoadEventIds.add(chosen.id);
    this.roadEventPopup = chosen;
    this.setModal('road_event');
  }

  public resolveRoadEventOption(optionIndex: number): void {
    if (!this.roadEventPopup) return;
    const ev = this.roadEventPopup;
    const opt = ev.options[optionIndex];
    if (!opt) {
      this.roadEventPopup = null;
      this.setModal('none');
      return;
    }

    if (ev.id === 'road_merchant_wolves') {
      if (opt.outcome === 'fight') {
        this.player.stats.gold += 95;
        this.player.stats = applyExperienceGain(this.player.stats, 60).updated;
        this.inventory.addItemById('herb_swallow', 2);
        this.addLog('Вы спасли купца! Награда: +95 крон, +60 Опыта и целебные травы.', 'quest');
      } else if (opt.outcome === 'pay') {
        this.player.stats.gold += 130;
        this.addLog('Купец отдал вам кошель со 130 кронами за спасение.', 'loot');
      }
    } else if (ev.id === 'road_mysterious_pilgrim') {
      if (opt.outcome === 'pay') {
        if (this.player.stats.gold >= 45) {
          this.player.stats.gold -= 45;
          this.inventory.addItemById('rune_vamp', 1);
          this.inventory.addItemById('herb_swallow', 2);
          this.addLog('В шкатулке оказалась Руна Вампиризма и пучок ласточкиной травы!', 'loot');
        } else {
          this.addLog('Недостаточно золота для покупки шкатулки.', 'info');
        }
      } else if (opt.outcome === 'sign') {
        this.player.stats.gold += 80;
        this.player.stats = applyExperienceGain(this.player.stats, 50).updated;
        this.addLog('Знак Иллюзии заставил мародёра выложить 80 крон!', 'quest');
      }
    } else if (ev.id === 'road_cursed_totem') {
      if (opt.outcome === 'sign') {
        this.player.stats = applyExperienceGain(this.player.stats, 85).updated;
        this.player.stats.placeOfPowerTimer = 180;
        this.addLog('Идол очищен! Получено +85 Опыта и благословение Знаков.', 'quest');
      } else if (opt.outcome === 'fight') {
        this.inventory.addItemById('herb_swallow', 3);
        this.inventory.addItemById('ghoul_blood', 1);
        this.addLog('Собраны ценные алхимические реагенты с подножия идола!', 'loot');
      }
    }

    this.audio.playQuestChime();
    this.roadEventPopup = null;
    this.setModal('none');
  }

  public triggerInteract(): void {
    this.triggerInteraction();
  }

  public triggerInteraction(): void {
    const nearest = this.world.getNearestInteractable(
      this.player.stats.x,
      this.player.stats.z
    );
    if (!nearest) return;

    // 1. Notice Board in Crow's Hollow
    if (nearest.type === 'notice_board') {
      this.audio.playQuestChime();
      this.setModal('notice_board');
      return;
    }

    // 2. Underground Catacombs Portal
    if (nearest.type === 'catacombs_portal') {
      this.audio.playQuestChime();
      if (nearest.id === 'catacombs_entrance') {
        this.player.stats.x = 105;
        this.player.stats.z = 95;
        this.player.stats.y = 0;
        this.player.rig.root.position.set(105, 0, 95);
        this.showBanner(
          'Подземные Катакомбы Древних Королей',
          'Поверните 3 рунические колонны на «ИГНИС», чтобы открыть сокровищницу'
        );
        this.addLog('Вы спустились в Подземные Катакомбы Древних Королей.', 'quest');
      } else {
        const exitY = getGroundHeight(-56, -50);
        this.player.stats.x = -56;
        this.player.stats.z = -50;
        this.player.stats.y = exitY;
        this.player.rig.root.position.set(-56, exitY, -50);
        this.showBanner('Проклятое святилище', 'Вы поднялись на поверхность');
      }
      this.emitHUD();
      return;
    }

    // 3. Runic Pillars Puzzle in Catacombs
    if (nearest.type === 'rune_pillar') {
      const states = this.world.rotatePillar(nearest.id);
      this.audio.playQuestChime();
      this.addLog(`${nearest.name}: ${nearest.promptText}`, 'info');
      if (states.every((s) => s === 1) && !this.catacombsGateUnlocked) {
        this.catacombsGateUnlocked = true;
        this.sceneManager.setCatacombsGateOpen(true);
        this.showBanner(
          'Загадка Древних Королей решена!',
          'Решётка королевской усыпальницы поднята'
        );
        this.addLog('Все три рунические колонны выстроены на «ИГНИС»! Сокровищница открыта!', 'quest');
      }
      this.emitHUD();
      return;
    }

    // 4. Legendary Catacombs Chest check
    if (nearest.id === 'catacombs_legendary_chest' && !this.catacombsGateUnlocked) {
      this.addLog(
        'Решётка заперта! Поверните все 3 рунические колонны в зале на руну «ИГНИС».',
        'info'
      );
      this.showBanner('Усыпальница заперта', 'Выставьте руну «ИГНИС» на 3 рунических колоннах');
      return;
    }

    // 5. Guarded Treasure POI check
    if (nearest.id === 'poi_treasure_1' || nearest.id === 'poi_treasure_2') {
      const guardAlive = this.enemyAI.enemies.some(
        (e) =>
          e.data.state !== 'DEAD' &&
          Math.hypot(e.data.x - nearest.x, e.data.z - nearest.z) < 12
      );
      if (guardAlive) {
        this.addLog('Сундук скован печатью стража! Одолейте чудовище, охраняющее сокровище.', 'info');
        this.showBanner('Сокровище под охраной', 'Победите элитного стража поблизости');
        return;
      }
    }

    // 5.5 Interactive Lore Notes, Diaries & Tomes (12 World Chronicles)
    if (nearest.type === 'lore_note') {
      const note = WORLD_LORE_NOTES.find(
        (n) => n.id === (nearest.loreNoteId ?? nearest.id)
      );
      if (note) {
        this.audio.playQuestChime();
        this.world.markInteracted(nearest.id);
        this.activeLoreNote = note;

        const { updated, newlyDiscovered, leveledUp, unlockedLoreMaster } = discoverLoreEntry(
          this.player.stats,
          note.id,
          WORLD_LORE_NOTES.length
        );

        if (newlyDiscovered) {
          this.player.stats = updated;
          const count = (this.player.stats.discoveredLoreIds ?? []).length;
          this.addLog(
            `Найдена летопись: «${note.title}» (+25 XP · Кодекс ${count}/${WORLD_LORE_NOTES.length})`,
            'quest'
          );
          if (leveledUp) {
            this.audio.playQuestChime();
            this.addLog(
              `Новый уровень: ${this.player.stats.level}! Получено очко навыков.`,
              'quest'
            );
          }
          if (unlockedLoreMaster) {
            this.audio.playQuestChime();
            this.showBanner(
              'Хранитель Памяти Вальдмарка!',
              'Собраны все 12 хроник (+15% к урону по боссам, открыт истинный финал)'
            );
            this.addLog(
              'Достижение разблокировано: «Хранитель Памяти Вальдмарка»! Ваш урон по всем боссам увеличен на +15%, а у Короны Малакора открыт секретный финал.',
              'quest'
            );
          } else {
            this.showBanner(
              note.title,
              `+25 XP · Запись сохранена в Кодекс [L] (${count}/${WORLD_LORE_NOTES.length})`
            );
          }
        } else {
          this.addLog(`Вы перечитываете запись: «${note.title}»`, 'info');
        }

        this.setModal('lore_reader');
        this.emitHUD();
      }
      return;
    }

    // 6. NPCs & Shrines
    if (nearest.type === 'npc' || nearest.type === 'shrine') {
      this.world.markInteracted(nearest.id);
      if (nearest.dialogueRootId) {
        const canTriggerSecretEnding =
          Boolean(this.player.stats.loreMasterUnlocked) ||
          (this.player.stats.discoveredLoreIds ?? []).includes('lore_note_12_malakor_will');

        const node = this.dialogue.getDialogueNode(
          nearest.dialogueRootId,
          this.quests.quests,
          canTriggerSecretEnding
        );
        if (node) {
          this.activeDialogueNode = node;
          this.setModal('dialogue');
        }
      }
      return;
    }

    // 7. Campfire Meditation & Alchemy
    if (nearest.type === 'campfire') {
      const eff = computeEffectivePlayerStats(
        this.player.stats,
        this.inventory.items,
        this.inventory.skills
      );
      this.player.stats.hp = eff.maxHp;
      this.player.stats.stamina = this.player.stats.maxStamina;
      this.player.stats.toxicity = 0;
      this.sceneManager.setTimeOfDay((this.sceneManager.getTimeOfDay() + 6) % 24);
      this.showBanner(
        'Медитация и Алхимия у костра',
        'Здоровье восстановлено · Токсичность сброшена'
      );
      this.addLog('Вы помедитировали у костра. Открыта панель Алхимии и Масел.', 'info');
      this.saveProgress();
      this.setModal('alchemy');
      return;
    }

    // 8. Place of Power (Место Силы)
    if (nearest.type === 'place_of_power') {
      this.world.markInteracted(nearest.id);
      this.audio.playQuestChime();
      this.player.stats.skillPoints += 1;
      this.player.stats.placeOfPowerTimer = 180;
      this.showBanner(
        nearest.name,
        'Получено +1 Очко навыков и +25% к силе Знаков на 3 минуты!'
      );
      this.addLog(
        `Вы почерпнули энергию из Места Силы! +1 Очко навыков, мощь Знаков увеличена.`,
        'quest'
      );
      this.emitHUD();
      return;
    }

    // 9. Monster Nest (Гнездо чудовищ)
    if (nearest.type === 'monster_nest') {
      this.world.markInteracted(nearest.id);
      this.audio.playQuestChime();
      this.player.stats.gold += nearest.goldAmount ?? 75;
      this.player.stats = applyExperienceGain(this.player.stats, 90).updated;
      if (nearest.lootItems) {
        for (const li of nearest.lootItems) {
          this.inventory.addItemById(li.itemId, li.count);
        }
      }
      this.showBanner(
        `Гнездо уничтожено: ${nearest.name}`,
        '+90 Опыта · +75 Золота · Редкие трофеи'
      );
      this.addLog(
        `Вы сожгли ${nearest.name}! Получено +90 Опыта и ценные реагенты.`,
        'quest'
      );
      this.emitHUD();
      return;
    }

    // 10. Contract Clues (Улики для выслеживания Именного Монстра)
    if (nearest.type === 'clue' && nearest.contractId) {
      this.world.markInteracted(nearest.id);
      this.audio.playQuestChime();
      const clueRes = this.quests.advanceContractClue(nearest.contractId);
      if (nearest.loreText) {
        this.addLog(nearest.loreText, 'quest');
      }
      if (clueRes.contract) {
        const progressMsg = `Улика изучена (${clueRes.contract.cluesFound}/${clueRes.contract.cluesRequired}): ${nearest.name}`;
        this.addLog(progressMsg, 'quest');
        if (clueRes.readyToSpawnBoss) {
          const spawned = this.enemyAI.spawnContractBoss(nearest.contractId);
          if (spawned) {
            this.showBanner(
              `Чудовище выслежено: ${spawned.name}!`,
              'Приготовьтесь к бою с уникальным боссом контракта'
            );
          }
        } else {
          this.showBanner(nearest.name, progressMsg);
        }
      }
      this.emitHUD();
      return;
    }

    // Standard Chest / Clue / Loot Pouch / Herb
    this.world.markInteracted(nearest.id);

    if (nearest.goldAmount || nearest.lootItems) {
      this.audio.playQuestChime();
    }
    if (nearest.goldAmount) {
      const eff = computeEffectivePlayerStats(
        this.player.stats,
        this.inventory.items,
        this.inventory.skills
      );
      const bonusGold = Math.round(nearest.goldAmount * (1 + eff.goldBonus));
      this.player.stats.gold += bonusGold;
      this.addLog(
        `Подобрано золото: +${bonusGold} крон${eff.goldBonus > 0 ? ' (бонус трофея)' : ''}`,
        'loot'
      );
    }
    if (nearest.lootItems) {
      for (const li of nearest.lootItems) {
        const added = this.inventory.addItemById(li.itemId, li.count);
        if (added) {
          this.addLog(`Добыча: ${added.name} x${li.count}`, 'loot');
        }
      }
    }
    if (nearest.loreText) {
      this.addLog(nearest.loreText, 'quest');
      this.showBanner(nearest.name, nearest.loreText);
    }

    if (nearest.questId && nearest.questStageId) {
      this.advanceQuestAndReward(nearest.questId, nearest.questStageId);
    }

    this.emitHUD();
  }

  public selectDialogueOption(option: DialogueOption): void {
    if (option.action === 'accept_quest_1') {
      this.quests.activateQuest('quest_missing_hunters');
      this.advanceQuestAndReward('quest_missing_hunters', 'q1_talk_elder');
    } else if (option.action === 'complete_quest_1') {
      this.advanceQuestAndReward('quest_missing_hunters', 'q1_return_elder');
    } else if (option.action === 'start_quest_2') {
      this.quests.activateQuest('quest_swamp_whisper');
      this.showBanner('Новое задание', 'Шёпот болота');
    } else if (option.action === 'start_quest_3') {
      this.quests.activateQuest('quest_ancient_king');
      this.showBanner('Новое задание', 'Сердце древнего короля');
    } else if (option.action === 'destroy_artifact') {
      this.inventory.addItemById('amulet_abyss', 1);
      this.advanceQuestAndReward('quest_swamp_whisper', 'q2_artifact_choice');
      this.sceneManager.setWeather('clear');
      this.showBanner(
        'Проклятие разрушено!',
        'Вы раскололи кристалл и получили Рунный оберег'
      );
      this.setModal('none');
      return;
    } else if (option.action === 'cleanse_artifact') {
      this.inventory.addItemById('amulet_abyss', 1);
      this.player.stats.gold += 150;
      this.advanceQuestAndReward('quest_swamp_whisper', 'q2_artifact_choice');
      this.showBanner(
        'Сила проклятия поглощена!',
        'Вы получили Рунный оберег Проклятого Алтаря (+25% к Знакам)'
      );
      this.setModal('none');
      return;
    } else if (option.action === 'heal_player') {
      const eff = computeEffectivePlayerStats(
        this.player.stats,
        this.inventory.items,
        this.inventory.skills
      );
      this.player.stats.hp = eff.maxHp;
      this.player.stats.toxicity = 0;
      this.addLog('Травница Марфа исцелила ваши раны и очистила кровь от токсинов.', 'info');
    } else if (option.action === 'open_shop') {
      this.setModal('shop');
      return;
    } else if (option.action === 'open_blacksmith') {
      this.setModal('blacksmith');
      return;
    } else if (option.action === 'open_notice_board') {
      this.setModal('notice_board');
      return;
    } else if (option.action === 'open_alchemy') {
      this.setModal('alchemy');
      return;
    } else if (option.action === 'open_dice_poker') {
      const npcSpeaker = this.activeDialogueNode?.speaker ?? 'Трактирщик Велеслав';
      this.startDicePoker(npcSpeaker, 40);
      return;
    } else if (option.action === 'side_order') {
      this.player.stats.factionChoice = 'order';
      this.inventory.addItemById('sword_crimson_order', 1);
      this.syncHeroVisuals();
      this.quests.activateQuest('quest_act2_malakor');
      this.advanceQuestAndReward('quest_act2_malakor', 'q4_talk_inquisitor');
      this.showBanner(
        'Акт II: Союз с Орденом Алого Солнца',
        'Получен Освящённый клинок · Сразите Короля-Лича Малакора на Погосте'
      );
      this.setModal('none');
      return;
    } else if (option.action === 'side_village') {
      this.player.stats.factionChoice = 'village';
      this.inventory.addItemById('sword_coven_protector', 1);
      this.syncHeroVisuals();
      this.quests.activateQuest('quest_act2_malakor');
      this.advanceQuestAndReward('quest_act2_malakor', 'q4_talk_inquisitor');
      this.showBanner(
        'Акт II: Защитник Вороньей Пади и Ковена',
        'Получен Рунный клинок Пади · Сразите Короля-Лича Малакора на Погосте'
      );
      this.setModal('none');
      return;
    } else if (option.action === 'secret_redemption') {
      this.audio.playQuestChime();
      this.player.stats.secretEndingUnlocked = true;
      this.player.stats.factionChoice = 'redemption';
      this.quests.completeStage('quest_ancient_king', 'q3_defeat_leshen');
      this.quests.completeStage('quest_act2_malakor', 'q4_defeat_malakor');
      this.addLog(
        'Вы исполнили «Завещание короля Малакора» и провели Ритуал Тлеющей Крови у Короны Малакора!',
        'quest'
      );
      this.showBanner(
        'Истинный Финал: Искупление Сердца Пустоты',
        'Тлеющая Кровь Зольника исцелила раскол Вальдмарка'
      );
      this.setModal('victory');
      return;
    } else if (option.action === 'open_codex') {
      this.setModal('codex');
      return;
    } else if (option.action === 'close') {
      this.setModal('none');
      return;
    }

    if (option.nextNodeId) {
      const canTriggerSecretEnding =
        Boolean(this.player.stats.loreMasterUnlocked) ||
        (this.player.stats.discoveredLoreIds ?? []).includes('lore_note_12_malakor_will');

      const next = this.dialogue.getDialogueNode(
        option.nextNodeId,
        this.quests.quests,
        canTriggerSecretEnding
      );
      if (next) {
        this.activeDialogueNode = next;
        this.emitHUD();
        return;
      }
    }

    this.setModal('none');
  }

  private advanceQuestAndReward(questId: string, stageId: string): void {
    const res = this.quests.completeStage(questId, stageId);
    if (!res.stageCompleted || !res.quest) return;

    this.audio.playQuestChime();
    if (res.questCompleted) {
      this.player.stats.gold += res.quest.goldReward;
      const xpRes = applyExperienceGain(this.player.stats, res.quest.xpReward);
      this.player.stats = xpRes.updated;
      if (res.quest.itemReward) {
        this.inventory.addItemById(res.quest.itemReward, 1);
      }
      this.showBanner(
        `Задание выполнено: ${res.quest.title}`,
        `+${res.quest.xpReward} Опыта · +${res.quest.goldReward} Золота`
      );
      this.addLog(
        `Завершено задание «${res.quest.title}» (+${res.quest.xpReward} Опыта, +${res.quest.goldReward} крон)`,
        'quest'
      );
      this.saveProgress();
    } else {
      const nextStage = res.quest.stages[res.quest.currentStageIndex];
      if (nextStage) {
        this.addLog(`Новая цель: ${nextStage.description}`, 'quest');
      }
    }
  }

  private handleEnemyKilled = (enemy: EnemyData): void => {
    const xpRes = applyExperienceGain(this.player.stats, enemy.xpReward);
    this.player.stats = xpRes.updated;

    if (xpRes.leveledUp) {
      this.audio.playQuestChime();
      this.showBanner(
        `Повышение уровня! Уровень ${this.player.stats.level}`,
        'Получено +1 очко навыков и увеличены характеристики'
      );
    }

    const eff = computeEffectivePlayerStats(
      this.player.stats,
      this.inventory.items,
      this.inventory.skills
    );
    const goldWithTrophy = Math.round(enemy.goldReward * (1 + eff.goldBonus));

    // Spawn interactive loot pouch on the ground at the enemy's death location (picked up with [E])
    this.world.spawnLootPouch({
      enemyId: enemy.id,
      enemyName: enemy.name,
      x: enemy.x,
      z: enemy.z,
      goldAmount: goldWithTrophy,
      lootTable: enemy.lootTable,
    });
    this.addLog(
      `Оставлен мешочек с добычей (${enemy.name}) — нажмите [E], чтобы подобрать`,
      'loot'
    );

    if (enemy.questTag === 'q1_ghouls') {
      const remainingGhouls = this.enemyAI.enemies.filter(
        (e) => e.data.questTag === 'q1_ghouls' && e.data.state !== 'DEAD'
      );
      if (remainingGhouls.length === 0) {
        this.quests.completeStage('quest_missing_hunters', 'q1_talk_elder');
        this.quests.completeStage('quest_missing_hunters', 'q1_find_tracks');
        this.quests.completeStage('quest_missing_hunters', 'q1_inspect_camp');
        this.advanceQuestAndReward('quest_missing_hunters', 'q1_kill_ghouls');
      }
    }

    if (enemy.questTag === 'q2_hag') {
      this.quests.activateQuest('quest_swamp_whisper');
      this.quests.completeStage('quest_swamp_whisper', 'q2_inspect_clue_1');
      this.quests.completeStage('quest_swamp_whisper', 'q2_inspect_clue_2');
      this.advanceQuestAndReward('quest_swamp_whisper', 'q2_kill_hag');
    }

    if (enemy.questTag === 'q3_demon') {
      this.quests.activateQuest('quest_ancient_king');
      this.quests.completeStage('quest_ancient_king', 'q3_reach_fortress');
      this.advanceQuestAndReward('quest_ancient_king', 'q3_kill_demon');
    }

    if (enemy.questTag === 'q3_boss') {
      this.quests.activateQuest('quest_ancient_king');
      this.quests.completeStage('quest_ancient_king', 'q3_reach_fortress');
      this.quests.completeStage('quest_ancient_king', 'q3_kill_demon');
      this.advanceQuestAndReward('quest_ancient_king', 'q3_kill_boss');
      // Unlock Act II automatically!
      this.quests.activateQuest('quest_act2_malakor');
      this.showBanner(
        'Акт I завершён · Начало Акта II: Пепел и Кровь',
        'Отправляйтесь на юг в Лагерь Ордена к Инквизитору Лазарю'
      );
    }

    // Named Monster Contracts
    if (
      enemy.questTag === 'contract_werewolf' ||
      enemy.questTag === 'contract_noonwraith' ||
      enemy.questTag === 'contract_gargoyle'
    ) {
      const completedContract = this.quests.completeContract(enemy.questTag);
      if (completedContract) {
        this.player.stats.gold += completedContract.rewardGold;
        this.player.stats = applyExperienceGain(
          this.player.stats,
          completedContract.rewardXp
        ).updated;
        const trophy = this.inventory.addItemById(completedContract.trophyItemId, 1);
        this.audio.playQuestChime();
        this.showBanner(
          `Контракт выполнен: ${completedContract.title}`,
          `Получен ${trophy.name} и +${completedContract.rewardGold} крон!`
        );
        this.addLog(
          `Контракт «${completedContract.title}» завершён! Получен трофей: ${trophy.name}`,
          'quest'
        );
      }
    }

    // Act II Final Boss: Lich King Malakor
    if (enemy.questTag === 'q4_malakor') {
      this.quests.activateQuest('quest_act2_malakor');
      this.quests.completeStage('quest_act2_malakor', 'q4_talk_inquisitor');
      this.advanceQuestAndReward('quest_act2_malakor', 'q4_kill_malakor');
      this.setModal('victory');
    }

    this.emitHUD();
  };

  public openModal(modal: HUDState['activeModal']): void {
    this.setModal(modal);
  }

  public setModal(modal: HUDState['activeModal']): void {
    this.activeModal = modal;
    if (modal !== 'none') {
      this.cameraController.unlockPointer();
    }
    this.emitHUD();
  }

  public showBanner(title: string, subtitle: string): void {
    this.notificationBanner = { title, subtitle };
    this.bannerTimer = 4.2;
    this.emitHUD();
  }

  public addLog = (
    text: string,
    type: 'info' | 'damage' | 'quest' | 'loot'
  ): void => {
    this.combatLog = [
      { id: `${Date.now()}_${Math.random()}`, text, type },
      ...this.combatLog.slice(0, 5),
    ];
  };

  public saveGame(): boolean {
    return this.saveProgress();
  }

  public saveProgress(): boolean {
    const pillarStates: Record<string, number> = {};
    for (const inter of this.world.interactables) {
      if (inter.type === 'rune_pillar' && typeof inter.pillarState === 'number') {
        pillarStates[inter.id] = inter.pillarState;
      }
    }

    const ok = SaveSystem.save({
      version: 1,
      timestamp: Date.now(),
      player: this.player.stats,
      quests: this.quests.quests,
      activeQuestId: this.quests.activeQuestId,
      inventory: this.inventory.items,
      skills: this.inventory.skills,
      interactedIds: this.world.interactables
        .filter((i) => i.interacted)
        .map((i) => i.id),
      discoveredPOIs: this.world.interactables
        .filter((i) => i.discovered)
        .map((i) => i.id),
      pillarStates,
      catacombsGateUnlocked: this.catacombsGateUnlocked,
      deadEnemyIds: this.enemyAI.enemies
        .filter((e) => e.data.state === 'DEAD')
        .map((e) => e.data.id),
      settings: this.settings,
    });
    if (ok) {
      this.addLog('Игра успешно сохранена.', 'info');
      this.emitHUD();
    }
    return ok;
  }

  public loadGame(): boolean {
    return this.loadProgress();
  }

  public loadProgress(): boolean {
    const saved = SaveSystem.load();
    if (!saved) return false;

    this.player.stats = {
      ...this.player.stats,
      ...saved.player,
    };
    this.player.rig.root.position.set(
      this.player.stats.x,
      this.player.stats.y,
      this.player.stats.z
    );
    this.quests.quests = saved.quests;
    this.quests.activeQuestId = saved.activeQuestId;
    this.inventory.items = saved.inventory;
    this.inventory.skills = saved.skills;
    this.syncHeroVisuals();

    for (const id of saved.interactedIds) {
      this.world.markInteracted(id);
    }
    if (saved.discoveredPOIs) {
      for (const id of saved.discoveredPOIs) {
        const poi = this.world.interactables.find((i) => i.id === id);
        if (poi) poi.discovered = true;
      }
    }
    if (saved.catacombsGateUnlocked) {
      this.catacombsGateUnlocked = true;
      this.sceneManager.setCatacombsGateOpen(true);
    }
    for (const enemy of this.enemyAI.enemies) {
      if (saved.deadEnemyIds.includes(enemy.data.id)) {
        enemy.data.hp = 0;
        enemy.data.state = 'DEAD';
      }
    }
    if (saved.settings) {
      this.updateSettings(saved.settings);
    }

    this.activeModal = 'none';
    this.addLog('Сохранение загружено.', 'info');
    this.emitHUD();
    return true;
  }

  public respawnPlayer(): void {
    const eff = computeEffectivePlayerStats(
      this.player.stats,
      this.inventory.items,
      this.inventory.skills
    );
    this.player.stats.hp = eff.maxHp;
    this.player.stats.stamina = this.player.stats.maxStamina;
    this.player.stats.toxicity = 0;
    this.player.stats.x = 0;
    this.player.stats.z = 6;
    this.player.stats.y = getGroundHeight(0, 6);
    this.player.actionState = 'idle';
    this.player.rig.root.position.set(0, this.player.stats.y, 6);
    this.activeModal = 'none';
    this.addLog('Вы очнулись в Вороньей Пади.', 'info');
    this.emitHUD();
  }

  public fastTravelTo(x: number, z: number, label: string): void {
    this.teleportToBiome(x, z, label);
  }

  public teleportToBiome(x: number, z: number, label: string): void {
    const y = x > 75 && z > 75 ? 0 : getGroundHeight(x, z);
    this.player.stats.x = x;
    this.player.stats.z = z;
    this.player.stats.y = y;
    this.player.rig.root.position.set(x, y, z);
    this.activeModal = 'none';
    this.showBanner(label, 'Быстрое перемещение по дорожному указателю');
    this.emitHUD();
  }

  public updateSettings(next: Partial<GraphicsSettings>): void {
    this.settings = { ...this.settings, ...next };
    this.sceneManager.applySettings(this.settings);
    this.audio.setSettings(this.settings.audioEnabled, this.settings.masterVolume);
    this.emitHUD();
  }

  public setWeather(weather: WeatherType): void {
    this.weatherCycleTimer = 45;
    this.sceneManager.setWeather(weather);
    this.audio.setWeatherAtmosphere(weather);
    const preset = WEATHER_PRESETS[weather];
    if (preset) {
      this.addLog(`Погода: ${preset.announcement}`, 'info');
    }
    this.emitHUD();
  }

  public cycleWeather(): void {
    const next = getNextWeatherState(this.sceneManager.getWeather());
    this.setWeather(next);
  }

  public startPrologue(): void {
    this.prologueSlideIndex = 0;
    const slide = PROLOGUE_SLIDES[0];
    if (slide) {
      this.cameraController.camera.position.set(
        slide.camPos[0],
        slide.camPos[1],
        slide.camPos[2]
      );
      this.prologueLookAt.set(slide.lookAt[0], slide.lookAt[1], slide.lookAt[2]);
      this.cameraController.camera.lookAt(this.prologueLookAt);
    }
    this.setModal('prologue');
  }

  public nextPrologueSlide(): void {
    this.audio.playQuestChime();
    if (this.prologueSlideIndex + 1 < PROLOGUE_SLIDES.length) {
      this.prologueSlideIndex++;
      this.emitHUD();
    } else {
      this.skipPrologue();
    }
  }

  public skipPrologue(): void {
    this.audio.playQuestChime();
    this.setModal('none');
    this.showBanner(
      'Деревня Воронья Падь · Вальдмарк',
      'Поговорите со старостой Браном [E] или откройте Кодекс Мира [L]'
    );
    this.emitHUD();
  }

  public openLoreNoteFromCodex(noteId: string): void {
    const note = WORLD_LORE_NOTES.find((n) => n.id === noteId);
    if (!note) return;
    this.activeLoreNote = note;
    this.setModal('lore_reader');
  }

  private getCodexArticlesWithUnlockState(): CodexArticle[] {
    return CODEX_ARTICLES.map((article) => ({
      ...article,
    }));
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.08);
    const elapsed = this.clock.getElapsedTime();

    // Clean up expired floating damage numbers
    const nowMs = performance.now();
    if (this.floatingDamages.length > 0) {
      this.floatingDamages = this.floatingDamages.filter(
        (d) => nowMs - (d.createdAt ?? nowMs) < 1150
      );
    }

    if (
      !this.isPaused &&
      this.lmbDownTime > 0 &&
      !this.heavyAttackTriggeredOnHold &&
      performance.now() - this.lmbDownTime >= 260 &&
      this.activeModal === 'none'
    ) {
      this.heavyAttackTriggeredOnHold = true;
      this.performPlayerAttack(true);
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
      if (this.bannerTimer === 0) {
        this.notificationBanner = null;
      }
    }

    const effStats = computeEffectivePlayerStats(
      this.player.stats,
      this.inventory.items,
      this.inventory.skills
    );
    if (this.player.stats.hp > effStats.maxHp) {
      this.player.stats.hp = effStats.maxHp;
    }

    if (!this.isPaused && this.activeModal === 'prologue') {
      const slide = PROLOGUE_SLIDES[this.prologueSlideIndex] ?? PROLOGUE_SLIDES[0];
      const targetPos = new THREE.Vector3(
        slide.camPos[0] + Math.sin(elapsed * 0.28) * 3.5,
        slide.camPos[1] + Math.cos(elapsed * 0.22) * 0.8,
        slide.camPos[2] + Math.cos(elapsed * 0.25) * 3.5
      );
      const targetLook = new THREE.Vector3(
        slide.lookAt[0],
        slide.lookAt[1],
        slide.lookAt[2]
      );
      this.cameraController.camera.position.lerp(targetPos, Math.min(1, dt * 1.8));
      this.prologueLookAt.lerp(targetLook, Math.min(1, dt * 2.2));
      this.cameraController.camera.lookAt(this.prologueLookAt);
    } else if (!this.isPaused && this.activeModal === 'none') {
      // Dynamic Weather System cycle in the game loop (toggles clear -> fog -> rain)
      this.weatherCycleTimer -= dt;
      if (this.weatherCycleTimer <= 0) {
        this.cycleWeather();
      }
      // Passive HP Regen from Equipped Trophy (e.g. Noonwraith Trophy)
      if (
        effStats.hpRegen > 0 &&
        this.player.stats.hp > 0 &&
        this.player.stats.hp < effStats.maxHp
      ) {
        this.player.stats.hp = Math.min(
          effStats.maxHp,
          this.player.stats.hp + effStats.hpRegen * dt
        );
      }

      const { isSprinting } = this.player.update(
        dt,
        this.cameraController.yaw,
        this.sceneManager.obstacles
      );

      this.cameraController.update(
        dt,
        this.player.stats.x,
        this.player.stats.y,
        this.player.stats.z,
        isSprinting,
        this.sceneManager.obstacles,
        this.sceneManager.colliderMeshes
      );

      // Discover hidden ? Points of Interest when player approaches within 16m
      for (const poi of this.world.interactables) {
        if (poi.isPOI && !poi.discovered) {
          if (Math.hypot(poi.x - this.player.stats.x, poi.z - this.player.stats.z) < 16) {
            poi.discovered = true;
            this.audio.playQuestChime();
            this.showBanner(
              `Открыта точка интереса: ${poi.name}`,
              poi.roleOrSubtitle ?? 'Исследуйте объект [E]'
            );
            this.addLog(`На карте открыта точка интереса: ${poi.name}`, 'quest');
          }
        }
      }

      // Check Underground Catacombs Spike/Fire Traps
      if (
        this.player.stats.x > 85 &&
        this.player.stats.x < 125 &&
        this.player.stats.z > 90 &&
        this.player.stats.z < 118
      ) {
        this.catacombsTrapTimer += dt;
        const traps = [
          { x: 100, z: 112 },
          { x: 110, z: 106 },
          { x: 102, z: 98 },
        ];
        for (const tr of traps) {
          if (
            Math.hypot(this.player.stats.x - tr.x, this.player.stats.z - tr.z) < 1.7 &&
            this.catacombsTrapTimer > 1.25
          ) {
            this.catacombsTrapTimer = 0;
            this.player.stats.hp = Math.max(0, this.player.stats.hp - 14);
            this.addLog('Огненно-шипованная ловушка Катакомб наносит 14 ед. урона!', 'damage');
            this.addFloatingDamage(
              new THREE.Vector3(this.player.stats.x, this.player.stats.y, this.player.stats.z),
              14,
              false,
              '#ef4444',
              'ЛОВУШКА'
            );
            if (this.player.stats.hp <= 0) {
              this.setModal('death');
            }
          }
        }
      }

      // Random Road Encounters
      this.updateRoadEncounters(dt);

      this.world.update(
        elapsed,
        this.player.stats.x,
        this.player.stats.z,
        undefined,
        this.hunterVisionActive
      );
      this.magic.update(dt, this.enemyAI, this.combat);

      this.combat.update(
        dt,
        this.player,
        this.enemyAI,
        effStats,
        this.sceneManager.obstacles,
        this.handleEnemyKilled,
        this.addLog,
        (intensity, dur) => this.cameraController.addShake(intensity, dur),
        (text, isCrit, isPlayerHit, color) => {
          this.floatingDamages.push({
            id: `${Date.now()}-${Math.random()}`,
            text,
            x: 50 + (Math.random() - 0.5) * 14,
            y: isPlayerHit ? 54 : 38 + (Math.random() - 0.5) * 8,
            isCrit,
            isPlayerHit,
            color: color ?? (isCrit ? '#facc15' : '#f87171'),
            createdAt: performance.now(),
          });
          if (this.floatingDamages.length > 14) {
            this.floatingDamages.shift();
          }
        }
      );

      this.enemyAI.update(
        dt,
        this.player.stats.x,
        this.player.stats.z,
        this.player.stats.hp > 0,
        this.cameraController.camera.quaternion,
        this.sceneManager.obstacles,
        (enemy, customDamage) => {
          this.combat.handleEnemyAttackOnPlayer(
            enemy,
            customDamage ?? enemy.damage,
            this.player,
            effStats.defense,
            this.addLog,
            (intensity, dur) => this.cameraController.addShake(intensity, dur),
            () =>
              this.magic.triggerBarrierExplosion(
                this.player,
                this.enemyAI,
                this.combat,
                this.sceneManager.obstacles,
                this.handleEnemyKilled,
                this.addLog
              )
          );
          if (this.player.stats.hp <= 0) {
            this.setModal('death');
          }
        },
        (burnedEnemy) => {
          this.addLog(
            `Сожжён знаком «Пламя»: ${burnedEnemy.data.name}`,
            'damage'
          );
          this.handleEnemyKilled(burnedEnemy.data);
        },
        this.magic.activeDecoy
          ? { x: this.magic.activeDecoy.x, z: this.magic.activeDecoy.z }
          : null,
        this.addLog
      );
    }

    this.sceneManager.update(dt, elapsed, this.player.stats.x, this.player.stats.z);

    if (this.sceneManager.isHeadless) {
      this.headlessRenderTimer += dt;
      if (this.headlessRenderTimer >= 0.066) {
        this.headlessRenderTimer = 0;
        this.sceneManager.renderer.render(
          this.sceneManager.scene,
          this.cameraController.camera
        );
      }
    } else {
      this.sceneManager.renderer.render(
        this.sceneManager.scene,
        this.cameraController.camera
      );
    }

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.1) {
      this.hudSyncTimer = 0;
      this.emitHUD();
    }
  };

  public syncHUD(): void {
    this.emitHUD();
  }

  public emitHUD(): void {
    const isCatacombs = this.player.stats.x > 75 && this.player.stats.z > 75;
    const biome = isCatacombs
      ? { id: 'catacombs' as const, name: 'Подземные Катакомбы Древних Королей' }
      : getBiomeAt(this.player.stats.x, this.player.stats.z);
    const nearest = this.world.getNearestInteractable(
      this.player.stats.x,
      this.player.stats.z
    );
    const effStats = computeEffectivePlayerStats(
      this.player.stats,
      this.inventory.items,
      this.inventory.skills
    );

    let lockedEnemy: EnemyData | null = null;
    let bossEnemy: EnemyData | null = null;
    let bestDist = 18;

    for (const e of this.enemyAI.enemies) {
      if (e.data.state === 'DEAD') continue;
      const d = Math.hypot(
        e.data.x - this.player.stats.x,
        e.data.z - this.player.stats.z
      );
      const isMajorBoss =
        e.data.type === 'boss' ||
        e.data.type === 'malakor' ||
        e.data.type === 'werewolf' ||
        e.data.type === 'noonwraith' ||
        e.data.type === 'gargoyle';
      if (isMajorBoss && (d < 34 || biome.id === 'ruined_fortress')) {
        bossEnemy = { ...e.data };
      }
      if (d < bestDist) {
        bestDist = d;
        lockedEnemy = { ...e.data };
      }
    }

    this.onHUDUpdate({
      player: { ...this.player.stats },
      activeQuest: this.quests.getActiveQuest(),
      allQuests: [...this.quests.quests],
      contracts: [...this.quests.contracts],
      nearbyInteractable: nearest ? { ...nearest } : null,
      lockedEnemy,
      isTargetLocked: lockedEnemy !== null,
      bossEnemy,
      currentBiomeName: biome.name,
      timeOfDay: this.sceneManager.getTimeOfDay(),
      weather: this.sceneManager.getWeather(),
      signCooldowns: { ...this.magic.cooldowns },
      combatLog: this.combatLog,
      floatingDamages: [...this.floatingDamages],
      inventory: [...this.inventory.items],
      skills: [...this.inventory.skills],
      activeModal: this.activeModal,
      activeDialogueNode: this.activeDialogueNode,
      discoveredLoreIds: [...(this.player.stats.discoveredLoreIds ?? [])],
      activeLoreNote: this.activeLoreNote,
      codexArticles: this.getCodexArticlesWithUnlockState(),
      worldLoreNotes: WORLD_LORE_NOTES,
      prologueSlideIndex: this.prologueSlideIndex,
      prologueSlides: PROLOGUE_SLIDES,
      notificationBanner: this.notificationBanner,
      settings: { ...this.settings },
      worldInteractables: this.world.interactables.map((i) => ({ ...i })),
      enemies: this.enemyAI.enemies.map((e) => ({
        id: e.data.id,
        name: e.data.name,
        type: e.data.type,
        x: e.data.x,
        z: e.data.z,
        hp: e.data.hp,
        maxHp: e.data.maxHp,
        state: e.data.state,
      })),
      hunterVisionActive: this.hunterVisionActive,
      activeSetBonus: effStats.activeSet,
      catacombsGateOpen: this.catacombsGateUnlocked,
      pillarStates: this.world.getPillarStates(),
      dicePoker: this.dicePokerState ? { ...this.dicePokerState } : null,
      roadEvent: this.roadEventPopup ? { ...this.roadEventPopup } : null,
      bestiary: BESTIARY_DATA,
    });
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('wheel', this.onMouseWheel);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.audio.dispose();
    this.sceneManager.dispose();
  }
}

