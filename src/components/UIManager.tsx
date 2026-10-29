import React, { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  BookOpen,
  Compass,
  Dices,
  Eye,
  Flame,
  FlaskConical,
  Ghost,
  Hammer,
  Heart,
  Map as MapIcon,
  Moon,
  Music,
  Pause,
  RotateCcw,
  Save,
  ScrollText,
  Shield,
  ShoppingBag,
  Skull,
  Sliders,
  Snowflake,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Sword,
  Trophy,
  Volume2,
  VolumeX,
  Wind,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Game } from '../game/Game';
import {
  localizeBiomeName,
  localizeDialogueNode,
  localizeItem,
  localizeQuest,
  localizeSkill,
  SIGN_TRANSLATIONS_EN,
  t,
} from '../game/i18n';
import {
  ALCHEMY_RECIPES,
  calculateMerchantPrice,
  COMPANION_PROFILES,
  computeEffectivePlayerStats,
  getBrowserDeviceSnapshot,
  getCompanionCommandLabel,
  getItemEquipSlot,
  getSwordEffectiveness,
  getUpgradeCost,
  MAGIC_SIGNS,
  resolveControlPlatform,
} from '../game/rules';
import { SaveSystem } from '../game/SaveSystem';
import type {
  CompanionId,
  ControlModeSetting,
  ControlPlatform,
  GameLanguage,
  HUDState,
  HudVisibilitySettings,
  SignType,
} from '../game/types';
import { ItemIcon } from './ItemIcon';

interface UIManagerProps {
  hud: HUDState;
  game: Game | null;
  onReturnToTitle: () => void;
}

const SIGN_LIST: SignType[] = ['flame', 'barrier', 'impulse', 'illusion', 'frost'];

const renderSignIcon = (sign: SignType, className = 'w-4 h-4', color?: string) => {
  const style = color ? { color } : undefined;
  switch (sign) {
    case 'flame':
      return <Flame className={className} style={style} />;
    case 'barrier':
      return <Shield className={className} style={style} />;
    case 'impulse':
      return <Wind className={className} style={style} />;
    case 'illusion':
      return <Ghost className={className} style={style} />;
    case 'frost':
      return <Snowflake className={className} style={style} />;
  }
};

export const UIManager: React.FC<UIManagerProps> = ({
  hud,
  game,
  onReturnToTitle,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [invTab, setInvTab] = useState<'items' | 'skills'>('items');
  const [selectedBestiaryId, setSelectedBestiaryId] = useState<string>('bestiary_werewolf');
  const [codexTab, setCodexTab] = useState<
    'history' | 'brotherhood' | 'factions' | 'bestiary' | 'notes'
  >('history');
  const [selectedCodexId, setSelectedCodexId] = useState<string>('history_valdmark');
  const [settingsTab, setSettingsTab] = useState<'general' | 'hud'>('general');
  const [typedDialogueText, setTypedDialogueText] = useState<string>('');
  const [isDialogueTyping, setIsDialogueTyping] = useState<boolean>(false);
  const [joyState, setJoyState] = useState<{
    x: number;
    y: number;
    active: boolean;
    sprinting: boolean;
  }>({ x: 0, y: 0, active: false, sprinting: false });
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyPointerIdRef = useRef<number | null>(null);
  const lookPointerRef = useRef<{ id: number; lastX: number; lastY: number } | null>(null);

  const lang: GameLanguage = hud.settings?.language ?? 'ru';
  const controlMode: ControlModeSetting = hud.settings?.controlMode ?? 'auto';
  const activePlatform: ControlPlatform =
    hud.detectedPlatform ??
    resolveControlPlatform(controlMode, getBrowserDeviceSnapshot());
  const isMobile = activePlatform === 'mobile';

  const defaultHudVis: HudVisibilitySettings = {
    minimapRadar: true,
    clockWeather: true,
    questTracker: true,
    companionPanel: true,
    reputationBar: true,
    combatLog: true,
    controlsDock: true,
  };
  const hudVis: HudVisibilitySettings = {
    ...defaultHudVis,
    ...(hud.settings?.hudVisibility ?? {}),
  };

  const localizedDialogue =
    hud.activeDialogueNode ? localizeDialogueNode(hud.activeDialogueNode, lang) : null;

  // Typewriter effect when dialogue node opens or changes
  useEffect(() => {
    if (hud.activeModal !== 'dialogue' || !localizedDialogue) {
      setTypedDialogueText('');
      setIsDialogueTyping(false);
      return;
    }

    const fullText = localizedDialogue.text;
    setTypedDialogueText('');
    setIsDialogueTyping(true);
    let idx = 0;

    const timer = window.setInterval(() => {
      idx += 1;
      setTypedDialogueText(fullText.slice(0, idx));
      if (idx % 3 === 1) {
        game?.audio.playTypewriterTick();
      }
      if (idx >= fullText.length) {
        setIsDialogueTyping(false);
        window.clearInterval(timer);
      }
    }, 18);

    const onSkipKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && idx < fullText.length) {
        e.preventDefault();
        idx = fullText.length;
        setTypedDialogueText(fullText);
        setIsDialogueTyping(false);
        window.clearInterval(timer);
      }
    };
    window.addEventListener('keydown', onSkipKey);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('keydown', onSkipKey);
    };
  }, [hud.activeModal, localizedDialogue?.id, localizedDialogue?.text, game]);

  if (!game) return null;

  const {
    player,
    activeQuest,
    allQuests,
    contracts,
    nearbyInteractable,
    lockedEnemy,
    bossEnemy,
    currentBiomeName,
    timeOfDay,
    weather,
    signCooldowns,
    combatLog,
    inventory,
    skills,
    activeModal,
    activeDialogueNode,
    activeLoreNote,
    activeAshEcho,
    waystones,
    codexArticles,
    worldLoreNotes,
    prologueSlideIndex,
    prologueSlides,
    notificationBanner,
    settings,
    floatingDamages,
    hunterVisionActive,
    dicePoker,
    roadEvent,
    bestiary,
    activeCompanion,
    reputationInfo,
  } = hud;
  const discoveredLoreIds = player.discoveredLoreIds ?? [];
  const totalLoreNotes = worldLoreNotes?.length ?? 22;

  const effStats = computeEffectivePlayerStats(player, inventory, skills);
  const currentSignInfo = MAGIC_SIGNS[player.activeSign];
  const currentStage =
    activeQuest && activeQuest.status === 'active'
      ? activeQuest.stages[activeQuest.currentStageIndex]
      : null;

  const distToQuest = currentStage
    ? Math.round(
        Math.hypot(currentStage.targetX - player.x, currentStage.targetZ - player.z)
      )
    : null;

  const formatTime = (t: number) => {
    const h = Math.floor(t) % 24;
    const m = Math.floor((t % 1) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const potionCount = inventory
    .filter((i) => i.category === 'potion')
    .reduce((acc, item) => acc + item.quantity, 0);

  const oreCount =
    inventory.find((i) => i.id === 'iron_ore')?.quantity ?? 0;
  const blackOreCount =
    inventory.find((i) => i.id === 'black_ore')?.quantity ?? 0;

  const equippedSteelSword = inventory.find(
    (i) => getItemEquipSlot(i) === 'steelSword' && i.equipped
  );
  const equippedSilverSword = inventory.find(
    (i) => getItemEquipSlot(i) === 'silverSword' && i.equipped
  );
  const equippedArmorItem = inventory.find(
    (i) => getItemEquipSlot(i) === 'armor' && i.equipped
  );
  const equippedTrophy = inventory.find(
    (i) => getItemEquipSlot(i) === 'trophy' && i.equipped
  );
  const activeSword = player.activeSword ?? 'steel';
  const availableRunes = inventory.filter((i) => i.category === 'rune' && i.quantity > 0);

  const getSetDisplayName = (setId?: string | null) => {
    if (lang === 'en') {
      switch (setId) {
        case 'raven':
          return 'Raven School';
        case 'bear':
          return 'Bear School';
        case 'flame':
          return 'Flame School';
        case 'frost_warden':
          return 'Frost Warden (T4)';
        case 'grandmaster':
          return 'Ash Grandmaster (T5)';
        case 'obsidian':
          return 'Obsidian King (T5)';
        default:
          return 'Ash Brotherhood';
      }
    }
    switch (setId) {
      case 'raven':
        return 'Школа Ворона';
      case 'bear':
        return 'Школа Медведя';
      case 'flame':
        return 'Школа Пламени';
      case 'frost_warden':
        return 'Морозный Страж (T4)';
      case 'grandmaster':
        return 'Великий Магистр Пепла (T5)';
      case 'obsidian':
        return 'Обсидиановый Король (T5)';
      default:
        return 'Братство Пепла';
    }
  };

  const getDayPhaseInfo = (hourVal: number) => {
    const h = ((hourVal % 24) + 24) % 24;
    if (h >= 5 && h < 8.5) {
      return {
        label: t(lang, 'hud.phase.dawn'),
        icon: <Sunrise className="w-3.5 h-3.5 text-amber-400" />,
        color: 'text-amber-300',
      };
    }
    if (h >= 8.5 && h < 17.5) {
      return {
        label: t(lang, 'hud.phase.day'),
        icon: <Sun className="w-3.5 h-3.5 text-yellow-400" />,
        color: 'text-yellow-200',
      };
    }
    if (h >= 17.5 && h < 21) {
      return {
        label: t(lang, 'hud.phase.dusk'),
        icon: <Sunset className="w-3.5 h-3.5 text-orange-400" />,
        color: 'text-orange-300',
      };
    }
    return {
      label: t(lang, 'hud.phase.night'),
      icon: <Moon className="w-3.5 h-3.5 text-sky-300" />,
      color: 'text-sky-200',
    };
  };

  const dayPhase = getDayPhaseInfo(timeOfDay);
  const localizedActiveQuest = activeQuest ? localizeQuest(activeQuest, lang) : null;
  const localizedStage =
    localizedActiveQuest && localizedActiveQuest.status === 'active'
      ? localizedActiveQuest.stages[localizedActiveQuest.currentStageIndex]
      : null;
  const localizedSignName =
    lang === 'en'
      ? SIGN_TRANSLATIONS_EN[player.activeSign]?.name ?? currentSignInfo.name
      : currentSignInfo.name;

  const updateJoystickFromClientPoint = (clientX: number, clientY: number) => {
    const el = joyBaseRef.current;
    if (!el || !game) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = Math.max(28, rect.width * 0.42);
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const normX = (Math.cos(angle) * clampedDist) / maxRadius;
    const normY = (Math.sin(angle) * clampedDist) / maxRadius;
    const isSprint = clampedDist / maxRadius > 0.82;
    setJoyState({
      x: normX * (rect.width * 0.34),
      y: normY * (rect.height * 0.34),
      active: true,
      sprinting: isSprint,
    });
    game.setJoystickInput(normX, normY, isSprint);
  };

  const resetJoystick = () => {
    joyPointerIdRef.current = null;
    setJoyState({ x: 0, y: 0, active: false, sprinting: false });
    game?.setJoystickInput(0, 0, false);
  };

  return (
    <div
      data-platform={activePlatform}
      className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between p-2.5 sm:p-4 md:p-6"
    >
      {/* MOBILE TOUCH CAMERA LOOK LAYER (Swipe anywhere not covered by HUD buttons to rotate camera) */}
      {isMobile && activeModal === 'none' && (
        <div
          data-testid="mobile-camera-look-zone"
          className="fixed inset-0 pointer-events-auto z-0 touch-none"
          onPointerDown={(e) => {
            if (lookPointerRef.current === null) {
              lookPointerRef.current = {
                id: e.pointerId,
                lastX: e.clientX,
                lastY: e.clientY,
              };
            }
          }}
          onPointerMove={(e) => {
            if (lookPointerRef.current && lookPointerRef.current.id === e.pointerId) {
              const dx = e.clientX - lookPointerRef.current.lastX;
              const dy = e.clientY - lookPointerRef.current.lastY;
              lookPointerRef.current.lastX = e.clientX;
              lookPointerRef.current.lastY = e.clientY;
              game.rotateCameraByTouch(dx, dy);
            }
          }}
          onPointerUp={(e) => {
            if (lookPointerRef.current && lookPointerRef.current.id === e.pointerId) {
              lookPointerRef.current = null;
            }
          }}
          onPointerCancel={(e) => {
            if (lookPointerRef.current && lookPointerRef.current.id === e.pointerId) {
              lookPointerRef.current = null;
            }
          }}
        />
      )}

      {/* HUNTER'S SENSES (ЧУТЬЁ ОХОТНИКА [V]) OVERLAY */}
      {(hunterVisionActive || (player.catElixirTimer ?? 0) > 0) && (
        <div className="fixed inset-0 pointer-events-none z-10 border-4 border-amber-500/40 bg-amber-950/15 shadow-[inset_0_0_90px_rgba(245,158,11,0.35)] transition-opacity">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-stone-950/95 border border-amber-500/80 text-amber-300 text-xs font-display font-bold tracking-wider uppercase shadow-xl flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Чутьё Зольника активно — улики, Отголоски Пепла, летописи и тайники подсвечены
          </div>
          {hud.worldInteractables
            .filter(
              (w) =>
                !w.interacted &&
                (w.type === 'clue' ||
                  w.type === 'lore_note' ||
                  w.type === 'ash_echo' ||
                  w.type === 'waystone' ||
                  w.type === 'loot' ||
                  w.type === 'monster_nest' ||
                  w.type === 'place_of_power' ||
                  w.isPOI) &&
                Math.hypot(w.x - player.x, w.z - player.z) < 65
            )
            .slice(0, 5)
            .map((w, idx) => {
              const dist = Math.round(Math.hypot(w.x - player.x, w.z - player.z));
              return (
                <div
                  key={w.id}
                  style={{ bottom: `${9 + idx * 2.2}rem` }}
                  className="absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-stone-950/90 border border-amber-500/70 text-xs text-amber-200 font-mono-tabular shadow-lg"
                >
                  {w.type === 'lore_note'
                    ? '📜 Летопись:'
                    : w.type === 'ash_echo'
                    ? '👻 Отголосок Пепла:'
                    : w.type === 'waystone'
                    ? '🗿 Путевой Камень:'
                    : '🔍'}{' '}
                  {w.name} — {dist} м
                </div>
              );
            })}
        </div>
      )}

      {/* FLOATING DAMAGE NUMBERS OVERLAY */}
      {floatingDamages && floatingDamages.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
          {floatingDamages.map((fd) => (
            <div
              key={fd.id}
              className={`absolute font-display font-extrabold tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] transition-transform duration-500 -translate-y-3 ${
                fd.isCrit ? 'text-lg md:text-xl scale-110' : 'text-sm md:text-base'
              }`}
              style={{
                left: `${fd.x}%`,
                top: `${fd.y}%`,
                color: fd.color ?? '#f87171',
              }}
            >
              <span className="px-1.5 py-0.5 rounded bg-stone-950/80 border border-current/40">
                {fd.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TOP BAR: Left Hero Status + Center Boss/Target Bar + Right Quest Tracker */}
      <div
        className={`relative z-10 flex items-start justify-between gap-2 sm:gap-4 w-full transition-opacity ${
          activeModal === 'prologue' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Top-Left: Medallion & Vital Bars (Compact on Mobile, Full on Desktop) */}
        <div
          className={`pointer-events-auto medieval-panel rounded-xl shrink-0 ${
            isMobile ? 'p-2 w-[178px] sm:w-56' : 'p-3.5 w-72 md:w-80'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-stone-900/90 border border-amber-600/70 flex items-center justify-center text-amber-400 font-display font-bold text-[10px] sm:text-xs shadow-inner shrink-0">
                {t(lang, 'hud.level')}.{player.level}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-display font-bold tracking-wider text-amber-200 truncate">
                  {t(lang, 'hud.corvusTitle')}
                </div>
                <div className="text-[10px] sm:text-[11px] text-stone-400 font-mono-tabular truncate">
                  {player.xp}/{player.xpToNext} XP · {player.gold}🪙
                </div>
              </div>
            </div>
            {player.skillPoints > 0 && (
              <button
                onClick={() => {
                  setInvTab('skills');
                  game.openModal('inventory');
                }}
                className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium bg-amber-700/30 border border-amber-500/60 text-amber-300 rounded hover:bg-amber-700/50 transition-colors whitespace-nowrap shrink-0"
              >
                +{player.skillPoints}
              </button>
            )}
          </div>

          {/* Health Bar */}
          <div className="space-y-1 sm:space-y-1.5">
            <div>
              <div className="flex justify-between items-center gap-1 text-[10px] sm:text-[11px] text-stone-300 mb-0.5 font-mono-tabular">
                <span className="flex items-center gap-1 text-red-400 font-medium truncate">
                  <Heart className="w-3 h-3 shrink-0" /> {t(lang, 'hud.health')}
                </span>
                <span className="whitespace-nowrap shrink-0">
                  {Math.ceil(player.hp)}/{effStats.maxHp}
                  {player.barrierShield > 0 && (
                    <span className="text-amber-400 ml-1">
                      (+{player.barrierShield})
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-950 rounded overflow-hidden border border-amber-900/40">
                <div
                  className="h-full bg-gradient-to-r from-red-800 via-red-600 to-red-500 transition-all duration-150"
                  style={{
                    width: `${Math.max(0, Math.min(100, (player.hp / effStats.maxHp) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Stamina Bar */}
            <div>
              <div className="flex justify-between items-center gap-1 text-[10px] sm:text-[11px] text-stone-300 mb-0.5 font-mono-tabular">
                <span className="flex items-center gap-1 text-amber-400 font-medium truncate">
                  <Zap className="w-3 h-3 shrink-0" /> {t(lang, 'hud.stamina')}
                </span>
                <span className="whitespace-nowrap shrink-0">
                  {Math.floor(player.stamina)}/{player.maxStamina}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-950 rounded overflow-hidden border border-amber-900/40">
                <div
                  className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-400 transition-all duration-100"
                  style={{
                    width: `${Math.max(0, Math.min(100, (player.stamina / player.maxStamina) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Toxicity Bar */}
            <div>
              <div className="flex justify-between items-center gap-1 text-[10px] text-stone-400 mb-0.5 font-mono-tabular">
                <span className="flex items-center gap-1 text-lime-400 font-medium truncate">
                  <FlaskConical className="w-3 h-3 shrink-0" /> {t(lang, 'hud.toxicity')}
                </span>
                <span className="whitespace-nowrap shrink-0">
                  {Math.floor(player.toxicity || 0)}/{player.maxToxicity || 100}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stone-950 rounded overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-lime-500 transition-all duration-150"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((player.toxicity || 0) / (player.maxToxicity || 100)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Reputation & Morality Scale (Shown on PC, hidden on Mobile to keep HUD compact) */}
            {!isMobile && hudVis.reputationBar && reputationInfo && (
              <div className="pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono-tabular mb-0.5">
                  <span
                    className={`font-semibold ${
                      reputationInfo.value >= 20
                        ? 'text-emerald-400'
                        : reputationInfo.value <= -20
                        ? 'text-red-400'
                        : 'text-amber-300'
                    }`}
                  >
                    ⚖️ {reputationInfo.title} ({reputationInfo.value > 0 ? `+${reputationInfo.value}` : reputationInfo.value})
                  </span>
                  <span className="text-stone-400">
                    {t(lang, 'hud.prices')}: {Math.round(reputationInfo.priceMultiplier * 100)}%
                  </span>
                </div>
                <div className="relative w-full h-1.5 bg-stone-950 rounded overflow-hidden border border-stone-800">
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-stone-500 z-10" />
                  <div
                    className={`h-full transition-all duration-200 ${
                      reputationInfo.value >= 0 ? 'bg-emerald-500' : 'bg-red-600'
                    }`}
                    style={{
                      marginLeft:
                        reputationInfo.value >= 0
                          ? '50%'
                          : `${Math.max(0, 50 + reputationInfo.value / 2)}%`,
                      width: `${Math.min(50, Math.abs(reputationInfo.value) / 2)}%`,
                    }}
                  />
                </div>
                {reputationInfo.bountyHuntersActive && (
                  <div className="mt-1 text-[10px] text-red-400 font-semibold">
                    ⚠️ {t(lang, 'hud.bountyWarning')}
                  </div>
                )}
              </div>
            )}

            {/* Active Combat Companion HUD Card (Toggled via settings.hudVisibility.companionPanel) */}
            {hudVis.companionPanel && activeCompanion && (
              <div className="mt-2 p-2 rounded-lg bg-stone-950/90 border border-sky-700/60 space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="min-w-0">
                    <div className="text-[11px] font-display font-bold text-sky-300 truncate">
                      🛡️ {activeCompanion.name}
                    </div>
                    <div className="text-[10px] text-stone-400 truncate">
                      {activeCompanion.title}
                    </div>
                  </div>
                  <button
                    onClick={() => game.cycleCompanionCommand()}
                    className="px-2 py-0.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-500/70 text-sky-200 text-[10px] font-mono-tabular whitespace-nowrap shrink-0"
                    title="Сменить боевой приказ напарнику [Клавиша G]"
                  >
                    [G] {getCompanionCommandLabel(activeCompanion.command)}
                  </button>
                </div>
                <div className="w-full h-1.5 bg-stone-950 rounded overflow-hidden border border-stone-800">
                  <div
                    className="h-full bg-sky-400 transition-all duration-150"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (activeCompanion.hp / activeCompanion.maxHp) * 100)
                      )}%`,
                    }}
                  />
                </div>
                {activeCompanion.lastBark && activeCompanion.lastBarkTimer > 0 && (
                  <div className="text-[10px] text-amber-200/90 italic leading-snug line-clamp-2">
                    «{activeCompanion.lastBark}»
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Oils, Elixirs, Decoctions, Trophy & Set Bonus Badges */}
          {((player.activeBladeOil && player.activeBladeOil !== 'none') ||
            (player.activeDecoction && player.activeDecoction !== 'none') ||
            (player.thunderElixirTimer ?? 0) > 0 ||
            (player.placeOfPowerTimer ?? 0) > 0 ||
            equippedTrophy ||
            effStats.activeSet) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {player.activeBladeOil && player.activeBladeOil !== 'none' && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-950/90 border border-amber-600/60 text-amber-300 font-mono-tabular">
                  🗡️ Масло ({Math.ceil(player.bladeOilTimer ?? 0)}с)
                </span>
              )}
              {player.activeDecoction && player.activeDecoction !== 'none' && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-lime-950/90 border border-lime-500/70 text-lime-300 font-mono-tabular">
                  🧪 Отвар ({Math.ceil(player.decoctionTimer ?? 0)}с)
                </span>
              )}
              {(player.thunderElixirTimer ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-950/90 border border-red-600/60 text-red-300 font-mono-tabular">
                  ⚡ Гром (+35% Урон)
                </span>
              )}
              {(player.placeOfPowerTimer ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-950/90 border border-purple-500/60 text-purple-300 font-mono-tabular">
                  ✨ Место Силы (+25% Знаки)
                </span>
              )}
              {equippedTrophy && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-stone-900 border border-amber-500/50 text-amber-200 truncate max-w-full">
                  🏆 {equippedTrophy.name}
                </span>
              )}
              {effStats.activeSet && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-950/90 border border-emerald-600/60 text-emerald-300">
                  🛡️ Сет: {getSetDisplayName(effStats.activeSet)}
                </span>
              )}
            </div>
          )}

          {/* Active Sword Switcher: [1] Steel Sword vs [2] Silver Sword (Shown on PC; Mobile has right-thumb switcher) */}
          {!isMobile && (
          <div className="mt-2.5 pt-2 border-t border-amber-900/35">
            <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1 font-mono-tabular">
              <span>{t(lang, 'hud.activeWeapon')}</span>
              <span className={activeSword === 'silver' ? 'text-sky-300 font-semibold' : 'text-amber-200 font-semibold'}>
                {activeSword === 'silver' ? `🗡️ ${t(lang, 'hud.silverSword')}` : `⚔️ ${t(lang, 'hud.steelSword')}`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => game.switchPlayerSword('steel')}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all flex items-center justify-between gap-1.5 ${
                  activeSword === 'steel'
                    ? 'bg-stone-800/95 border-amber-500/90 text-stone-100 shadow-md'
                    : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span className="flex items-center gap-1 text-[11px] font-medium truncate">
                  <ItemIcon item={equippedSteelSword ?? { id: 'steel_sword', category: 'weapon' }} size={16} />
                  <span>[1] {t(lang, 'hud.steelShort')}</span>
                </span>
                <span className="text-[11px] font-mono-tabular font-bold text-amber-300">
                  {effStats.steelAttack}
                </span>
              </button>
              <button
                onClick={() => game.switchPlayerSword('silver')}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all flex items-center justify-between gap-1.5 ${
                  activeSword === 'silver'
                    ? 'bg-sky-950/90 border-sky-400 text-sky-100 shadow-md'
                    : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span className="flex items-center gap-1 text-[11px] font-medium truncate">
                  <ItemIcon item={equippedSilverSword ?? { id: 'silver_sword', category: 'weapon' }} size={16} />
                  <span>[2] {t(lang, 'hud.silverShort')}</span>
                </span>
                <span className="text-[11px] font-mono-tabular font-bold text-sky-300">
                  {effStats.silverAttack}
                </span>
              </button>
            </div>
          </div>
          )}

          {/* Active Sign & Quick Potion Row (Shown on PC; Mobile has right-thumb buttons) */}
          {!isMobile && (
          <div className="mt-2 pt-2 border-t border-amber-900/35 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => game.triggerMagicSign()}
                className="flex items-center gap-2 text-left group flex-1 min-w-0"
              >
                <div
                  className="w-8 h-8 rounded-lg bg-stone-950 border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{ borderColor: currentSignInfo.color }}
                >
                  {renderSignIcon(player.activeSign, 'w-4 h-4', currentSignInfo.color)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-stone-100 truncate">
                      {localizedSignName}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono-tabular flex items-center gap-2">
                    <span className="text-amber-400/90">
                      -{currentSignInfo.staminaCost}
                    </span>
                    {signCooldowns[player.activeSign] > 0 ? (
                      <span className="text-red-400 font-semibold">
                        {signCooldowns[player.activeSign].toFixed(1)}s
                      </span>
                    ) : (
                      <span className="text-emerald-400">{t(lang, 'hud.signReady')}</span>
                    )}
                  </div>
                </div>
              </button>

              <button
                onClick={() => game.useQuickPotion()}
                className="px-2.5 py-1.5 rounded-lg bg-stone-950 border border-emerald-700/60 text-emerald-300 hover:border-emerald-400 transition-colors font-mono-tabular text-[11px] whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <ItemIcon item={{ id: 'potion_swallow', category: 'potion' }} size={16} />
                <span>
                  {t(lang, 'hud.potion')} ({potionCount})
                </span>
              </button>
            </div>

            {/* Active Sign Cooldown Bar */}
            {signCooldowns[player.activeSign] > 0 && (
              <div className="w-full h-1.5 bg-stone-900 rounded overflow-hidden border border-stone-800">
                <div
                  className="h-full transition-all duration-100"
                  style={{
                    backgroundColor: currentSignInfo.color,
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        (1 -
                          signCooldowns[player.activeSign] /
                            currentSignInfo.cooldown) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
          )}
        </div>

        {/* Top-Center: Boss Bar or Targeted Enemy Health + Notification Banner */}
        <div className="flex flex-col items-center gap-2 max-w-md w-full">
          {bossEnemy && bossEnemy.state !== 'DEAD' ? (
            <div className="w-full bg-stone-950/95 border border-amber-700/70 rounded-lg px-4 py-2.5 shadow-2xl">
              <div className="flex justify-between items-center text-xs font-display font-bold text-amber-400 mb-1">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <Skull className="w-4 h-4 text-red-500" /> {bossEnemy.name}
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[10px] rounded border ${
                      bossEnemy.phase === 3
                        ? 'bg-purple-950/90 border-purple-400 text-purple-200'
                        : bossEnemy.phase === 2
                        ? 'bg-red-950/90 border-red-500 text-red-300'
                        : 'bg-amber-950/80 border-amber-700/70 text-amber-300'
                    }`}
                  >
                    {bossEnemy.phase === 3
                      ? 'Фаза III · Коллапс Бездны'
                      : bossEnemy.phase === 2
                      ? 'Фаза II · Ярость'
                      : 'Фаза I'}
                  </span>
                  {typeof bossEnemy.crystalsRemaining === 'number' &&
                    bossEnemy.crystalsRemaining > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-sky-950 border border-sky-400 text-sky-200">
                        💎 Кристаллы: {bossEnemy.crystalsRemaining}/3 (Импульс [5])
                      </span>
                    )}
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded border font-mono-tabular ${
                      !getSwordEffectiveness(activeSword, bossEnemy.isSilverVulnerable).isOptimal
                        ? 'bg-red-950 border-red-400 text-red-200 animate-pulse'
                        : 'bg-sky-950/80 border-sky-500/60 text-sky-200'
                    }`}
                  >
                    {bossEnemy.isSilverVulnerable
                      ? activeSword === 'silver'
                        ? '🗡️ Уязвим к СЕРЕБРУ (100%)'
                        : '⚠️ Нужен СЕРЕБРЯНЫЙ меч [2] (сейчас 35%)'
                      : activeSword === 'steel'
                      ? '⚔️ Уязвим к СТАЛИ (100%)'
                      : '⚠️ Нужен СТАЛЬНОЙ меч [1] (сейчас 35%)'}
                  </span>
                </span>
                <span className="font-mono-tabular">
                  {Math.ceil(bossEnemy.hp)} / {bossEnemy.maxHp}
                </span>
              </div>
              <div className="relative w-full h-3 bg-stone-900 rounded overflow-hidden border border-stone-800">
                <div
                  className={`h-full transition-all duration-150 ${
                    bossEnemy.phase === 3
                      ? 'bg-purple-500'
                      : bossEnemy.phase === 2
                      ? 'bg-amber-500'
                      : 'bg-red-600'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (bossEnemy.hp / bossEnemy.maxHp) * 100))}%`,
                  }}
                />
                {/* Phase transition marker */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-stone-950/80" />
              </div>
            </div>
          ) : lockedEnemy && lockedEnemy.state !== 'DEAD' ? (
            <div className="w-80 bg-stone-950/90 border border-stone-800 rounded-lg px-3.5 py-2 shadow-lg">
              <div className="flex justify-between items-center text-xs text-stone-200 mb-1">
                <span className="font-medium truncate">
                  {lockedEnemy.name} (Ур.{lockedEnemy.level})
                </span>
                <span className="font-mono-tabular text-red-400">
                  {Math.ceil(lockedEnemy.hp)}/{lockedEnemy.maxHp}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded overflow-hidden mb-1">
                <div
                  className="h-full bg-red-500 transition-all duration-150"
                  style={{
                    width: `${Math.max(0, Math.min(100, (lockedEnemy.hp / lockedEnemy.maxHp) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono-tabular">
                <span
                  className={
                    lockedEnemy.isSilverVulnerable ? 'text-sky-300' : 'text-amber-300'
                  }
                >
                  {lockedEnemy.isSilverVulnerable
                    ? '🗡️ Уязвимость: СЕРЕБРО [2]'
                    : '⚔️ Уязвимость: СТАЛЬ [1]'}
                </span>
                {!getSwordEffectiveness(activeSword, lockedEnemy.isSilverVulnerable).isOptimal && (
                  <button
                    onClick={() =>
                      game.switchPlayerSword(
                        lockedEnemy.isSilverVulnerable ? 'silver' : 'steel'
                      )
                    }
                    className="px-1.5 py-0.5 rounded bg-red-950 border border-red-500 text-red-200 animate-pulse"
                  >
                    ⚠️ Сменить меч [{lockedEnemy.isSilverVulnerable ? '2' : '1'}] (35% урона)
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {notificationBanner && (
            <div className="bg-stone-950/95 border border-amber-600/60 rounded-lg px-5 py-2.5 text-center shadow-2xl">
              <div className="text-xs uppercase tracking-widest text-amber-400 font-display font-bold">
                {notificationBanner.title}
              </div>
              <div className="text-sm text-stone-200 mt-0.5">
                {notificationBanner.subtitle}
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Region, Day/Night Clock, Minimap Radar & Active Quest Tracker (PC Mode) */}
        {!isMobile && (
        <div
          data-testid="pc-top-right-hud"
          className="pointer-events-auto flex flex-col items-end gap-2 w-72"
        >
          {hudVis.clockWeather && (
            <div className="medieval-panel rounded-xl px-3.5 py-2.5 text-right w-full">
              <div className="text-xs font-display font-bold text-amber-400">
                {localizeBiomeName(currentBiomeName, lang)}
              </div>
              <div className="flex items-center justify-end gap-2 text-[11px] text-stone-300 font-mono-tabular mt-1">
                <span className={`flex items-center gap-1 font-medium ${dayPhase.color}`}>
                  {dayPhase.icon}
                  <span>{formatTime(timeOfDay)}</span>
                  <span className="text-[10px] opacity-85">({dayPhase.label})</span>
                </span>
                <span>·</span>
                <button
                  onClick={() => game.cycleWeather()}
                  title="Переключить погоду (Ясно / Туман / Дождь) [Клавиша T]"
                  className="px-2 py-0.5 rounded bg-stone-900/90 hover:bg-stone-800 border border-amber-700/50 hover:border-amber-500 text-stone-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>
                    {weather === 'clear'
                      ? `☀️ ${t(lang, 'hud.weather.clear')}`
                      : weather === 'fog'
                      ? `🌫️ ${t(lang, 'hud.weather.fog')}`
                      : `🌧️ ${t(lang, 'hud.weather.rain')}`}
                  </span>
                  <span className="text-[10px] text-amber-400/90">[T]</span>
                </button>
              </div>
            </div>
          )}

          {/* Compact Medieval Minimap Radar (Toggled via settings.hudVisibility.minimapRadar) */}
          {hudVis.minimapRadar && (
            <div
              onClick={() => game.openModal('map')}
              title={lang === 'en' ? 'Open World Map [M]' : 'Открыть карту королевства [M]'}
              className="medieval-panel rounded-xl p-2 w-full cursor-pointer hover:border-amber-500/70 transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1 px-1">
                <span className="flex items-center gap-1 font-semibold text-amber-300">
                  <Compass className="w-3 h-3" />
                  {lang === 'en' ? 'Radar [M]' : 'Радар окрестностей [M]'}
                </span>
                <span className="font-mono-tabular">
                  {Math.round(player.x)}, {Math.round(player.z)}
                </span>
              </div>
              <div className="relative h-20 w-full rounded-lg bg-stone-950/90 border border-amber-900/40 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.35),transparent_70%)]" />
                {/* Nearby Enemies on Radar */}
                {hud.enemies
                  .filter((e) => e.state !== 'DEAD' && Math.hypot(e.x - player.x, e.z - player.z) < 48)
                  .map((e) => {
                    const rx = 50 + ((e.x - player.x) / 48) * 45;
                    const rz = 50 + ((e.z - player.z) / 48) * 45;
                    return (
                      <span
                        key={e.id}
                        style={{ left: `${rx}%`, top: `${rz}%` }}
                        className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full bg-red-500 border border-stone-950"
                      />
                    );
                  })}
                {/* Active Quest Target on Radar */}
                {currentStage && (
                  <span
                    style={{
                      left: `${Math.max(8, Math.min(92, 50 + ((currentStage.targetX - player.x) / 60) * 45))}%`,
                      top: `${Math.max(8, Math.min(92, 50 + ((currentStage.targetZ - player.z) / 60) * 45))}%`,
                    }}
                    className="absolute w-2.5 h-2.5 -ml-1 -mt-1 rounded-full bg-amber-400 border border-stone-950 animate-pulse"
                  />
                )}
                {/* Player Center Dot */}
                <span className="absolute left-1/2 top-1/2 w-2.5 h-2.5 -ml-1 -mt-1 rounded-full bg-white border-2 border-emerald-500 shadow" />
              </div>
            </div>
          )}

          {hudVis.questTracker && localizedActiveQuest && (
            <div
              onClick={() => game.openModal('quests')}
              className="medieval-panel hover:border-amber-500/70 cursor-pointer rounded-xl p-3 w-full transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-display font-bold text-amber-400 mb-1">
                <span>{localizedActiveQuest.title}</span>
                {distToQuest !== null && (
                  <span className="font-mono-tabular text-stone-300">
                    {distToQuest} {lang === 'en' ? 'm' : 'м'}
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-200 leading-snug">
                {localizedStage
                  ? localizedStage.description
                  : t(lang, 'hud.questCompleted')}
              </div>
              <div className="mt-2 pt-1.5 border-t border-amber-900/35 flex justify-between items-center text-[11px] text-stone-400">
                <span>{t(lang, 'hud.questLogBtn')}</span>
                <span className="text-amber-400/90">{t(lang, 'hud.mapBtn')}</span>
              </div>
            </div>
          )}
        </div>
        )}

        {/* MOBILE TOP-RIGHT QUICK STATUS & MENU BAR (Shown when detected platform is Mobile) */}
        {isMobile && (
        <div
          data-testid="mobile-top-right-hud"
          className="pointer-events-auto flex flex-col items-end gap-1.5 max-w-[172px] min-w-0 shrink-0"
        >
          <div className="flex items-center gap-1 medieval-panel rounded-lg px-2 py-1 text-[10px] font-mono-tabular">
            <span className={`flex items-center gap-1 ${dayPhase.color}`}>
              {dayPhase.icon}
              <span>{formatTime(timeOfDay)}</span>
            </span>
            <button
              onClick={() => game.cycleWeather()}
              className="px-1 text-stone-300"
              title="Погода"
            >
              {weather === 'clear' ? '☀️' : weather === 'fog' ? '🌫️' : '🌧️'}
            </button>
            <button
              onClick={() => game.openModal('pause')}
              aria-label="Меню паузы и настроек"
              className="p-1 rounded bg-stone-900 border border-amber-700/60 text-amber-300"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>

          {hudVis.questTracker && localizedActiveQuest && (
            <button
              onClick={() => game.openModal('quests')}
              className="medieval-panel rounded-lg px-2 py-1.5 text-right w-full"
            >
              <div className="flex items-center justify-between gap-1 text-[10px] font-display font-bold text-amber-400">
                <span className="truncate">{localizedActiveQuest.title}</span>
                {distToQuest !== null && (
                  <span className="font-mono-tabular text-stone-300 shrink-0">
                    {distToQuest}{lang === 'en' ? 'm' : 'м'}
                  </span>
                )}
              </div>
              {localizedStage && (
                <div className="text-[10px] text-stone-200 truncate mt-0.5">
                  {localizedStage.description}
                </div>
              )}
            </button>
          )}

          {/* Mobile Quick Menu Strip */}
          <div className="flex items-center gap-1 medieval-panel rounded-lg p-1">
            <button
              onClick={() => game.openModal('inventory')}
              className="p-1.5 rounded bg-stone-900/90 border border-stone-700 text-amber-300"
              title={t(lang, 'dock.inventory')}
            >
              <Backpack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => game.openModal('map')}
              className="p-1.5 rounded bg-stone-900/90 border border-stone-700 text-sky-300"
              title={t(lang, 'dock.map')}
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => game.openModal('alchemy')}
              className="p-1.5 rounded bg-stone-900/90 border border-stone-700 text-lime-300"
              title={t(lang, 'dock.alchemy')}
            >
              <FlaskConical className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => game.openModal('codex')}
              className="p-1.5 rounded bg-stone-900/90 border border-stone-700 text-amber-200"
              title={t(lang, 'dock.codex')}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => game.toggleHunterVision()}
              className={`p-1.5 rounded border ${
                hunterVisionActive
                  ? 'bg-amber-600 text-stone-950 border-amber-300'
                  : 'bg-stone-900/90 border-stone-700 text-amber-400'
              }`}
              title={t(lang, 'mobile.senses')}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        )}
      </div>

      {/* CENTER-BOTTOM INTERACTION PROMPT, COMBAT LOG & MOBILE/DESKTOP CONTROLS */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 w-full">
        {nearbyInteractable && activeModal === 'none' && (
          <button
            onClick={() => game.triggerInteract()}
            className="pointer-events-auto flex items-center gap-2 sm:gap-3 medieval-panel-ornate text-stone-100 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl shadow-2xl hover:border-amber-400 transition-colors cursor-pointer max-w-[92vw]"
          >
            <ItemIcon
              item={{
                id: nearbyInteractable.lootItems?.[0]?.itemId ?? nearbyInteractable.id,
                name: nearbyInteractable.name,
                category:
                  nearbyInteractable.type === 'herb'
                    ? 'resource'
                    : nearbyInteractable.type === 'chest' || nearbyInteractable.type === 'loot'
                    ? 'quest'
                    : 'quest',
              }}
              size={24}
            />
            <span className="px-2 py-0.5 bg-amber-600 text-stone-950 font-mono-tabular font-bold text-[11px] rounded shrink-0">
              {isMobile ? (lang === 'en' ? 'TAP' : 'ТАП') : 'E'}
            </span>
            <div className="text-left min-w-0">
              <div className="text-xs font-semibold text-amber-300 truncate">
                {nearbyInteractable.name}
              </div>
              <div className="text-[11px] sm:text-xs text-stone-300 truncate">
                {nearbyInteractable.promptText}
              </div>
            </div>
          </button>
        )}

        {/* Subtle Combat Log (Toggled via settings.hudVisibility.combatLog) */}
        {hudVis.combatLog && combatLog.length > 0 && activeModal === 'none' && (
          <div className="w-full max-w-md flex flex-col items-center gap-0.5 pointer-events-none">
            {combatLog.slice(0, 2).map((entry) => (
              <div
                key={entry.id}
                className={`text-[11px] sm:text-xs px-2.5 sm:px-3 py-0.5 rounded-md medieval-panel truncate max-w-[92vw] ${
                  entry.type === 'damage'
                    ? 'text-red-300'
                    : entry.type === 'quest'
                    ? 'text-amber-300'
                    : entry.type === 'loot'
                    ? 'text-emerald-300'
                    : 'text-stone-300'
                }`}
              >
                {entry.text}
              </div>
            ))}
          </div>
        )}

        {/* MOBILE VIRTUAL ANALOG JOYSTICK & ERGONOMIC COMBAT CLUSTER (Shown when detected platform is Mobile) */}
        {isMobile && activeModal === 'none' && (
          <div
            data-testid="mobile-controls"
            className="flex items-end justify-between gap-2 w-full pt-0.5 pointer-events-auto select-none"
          >
            {/* Left Thumb: Virtual Analog Touch Joystick */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <div
                ref={joyBaseRef}
                data-testid="virtual-joystick"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  joyPointerIdRef.current = e.pointerId;
                  updateJoystickFromClientPoint(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (joyPointerIdRef.current === e.pointerId) {
                    e.stopPropagation();
                    updateJoystickFromClientPoint(e.clientX, e.clientY);
                  }
                }}
                onPointerUp={(e) => {
                  if (joyPointerIdRef.current === e.pointerId) {
                    e.stopPropagation();
                    resetJoystick();
                  }
                }}
                onPointerCancel={(e) => {
                  if (joyPointerIdRef.current === e.pointerId) {
                    resetJoystick();
                  }
                }}
                className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full medieval-panel flex items-center justify-center touch-none transition-colors ${
                  joyState.sprinting
                    ? 'border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                    : 'border-amber-700/60'
                }`}
              >
                {/* Outer directional crosshair ticks */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-amber-400/70 font-bold pointer-events-none">
                  ▲
                </div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-amber-400/70 font-bold pointer-events-none">
                  ▼
                </div>
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-amber-400/70 font-bold pointer-events-none">
                  ◀
                </div>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-amber-400/70 font-bold pointer-events-none">
                  ▶
                </div>
                <div className="absolute w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-amber-600/25 pointer-events-none" />

                {/* Movable Thumb Stick Knob */}
                <div
                  style={{
                    transform: `translate(${joyState.x}px, ${joyState.y}px)`,
                  }}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center pointer-events-none transition-transform duration-75 shadow-lg ${
                    joyState.sprinting
                      ? 'bg-amber-500/90 border-amber-200 text-stone-950'
                      : joyState.active
                      ? 'bg-amber-700/85 border-amber-300 text-amber-100'
                      : 'bg-stone-800/90 border-amber-500/70 text-amber-300'
                  }`}
                >
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <span className="text-[9px] text-stone-400 font-mono-tabular">
                {t(lang, 'mobile.lookHint')}
              </span>
            </div>

            {/* Right Thumb: Combat & Utility Action Cluster */}
            <div className="flex flex-col items-end gap-1.5 min-w-0">
              {/* Top utility row: Sword Switch + Quick Potion + Cycle Sign */}
              <div className="flex flex-wrap items-center justify-end gap-1">
                {nearbyInteractable && (
                  <button
                    onClick={() => game.triggerInteract()}
                    className="px-2 py-1 rounded-lg bg-amber-600 border border-amber-300 text-stone-950 text-[10px] font-bold flex items-center gap-1 shadow"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{t(lang, 'mobile.interact')}</span>
                  </button>
                )}
                <button
                  onClick={() =>
                    game.switchPlayerSword(activeSword === 'steel' ? 'silver' : 'steel')
                  }
                  className={`px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center gap-1 shadow ${
                    activeSword === 'silver'
                      ? 'bg-sky-950/95 border-sky-400 text-sky-200'
                      : 'bg-stone-900/95 border-amber-500/80 text-amber-200'
                  }`}
                >
                  <Sword className="w-3 h-3" />
                  <span>
                    {activeSword === 'silver'
                      ? t(lang, 'hud.silverShort')
                      : t(lang, 'hud.steelShort')}
                  </span>
                </button>

                <button
                  onClick={() => game.useQuickPotion()}
                  className="px-2 py-1 rounded-lg bg-stone-900/95 border border-emerald-600/70 text-emerald-300 text-[10px] font-mono-tabular font-semibold flex items-center gap-1 shadow"
                >
                  <FlaskConical className="w-3 h-3" />
                  <span>{potionCount}</span>
                </button>

                <button
                  onClick={() => {
                    game.player.cycleActiveSign();
                    game.syncHUD();
                  }}
                  className="px-2 py-1 rounded-lg bg-stone-900/95 border border-amber-700/60 text-amber-200 text-[10px] flex items-center gap-1 shadow"
                  title="Сменить активный Знак"
                >
                  {renderSignIcon(player.activeSign, 'w-3 h-3', currentSignInfo.color)}
                  <span className="max-w-[50px] truncate">{localizedSignName.split(' (')[0]}</span>
                </button>
              </div>

              {/* Main Combat Action Buttons Row */}
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5 items-center">
                {/* Block (Hold) */}
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    game.player.isBlocking = true;
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    game.player.isBlocking = false;
                  }}
                  onPointerCancel={() => {
                    game.player.isBlocking = false;
                  }}
                  onPointerLeave={() => {
                    game.player.isBlocking = false;
                  }}
                  className="w-12 h-11 sm:w-14 sm:h-12 rounded-xl bg-stone-900/95 border border-stone-600 active:border-amber-400 text-[10px] sm:text-[11px] font-semibold text-stone-200 flex flex-col items-center justify-center gap-0.5 shadow-lg touch-none"
                >
                  <Shield className="w-3.5 h-3.5 text-sky-300" />
                  <span>{t(lang, 'mobile.block')}</span>
                </button>

                {/* Cast Active Sign */}
                <button
                  onClick={() => game.triggerMagicSign()}
                  className="w-12 h-11 sm:w-14 sm:h-12 rounded-xl bg-purple-950/95 border border-purple-500/80 active:scale-95 text-[10px] sm:text-[11px] font-semibold text-purple-100 flex flex-col items-center justify-center gap-0.5 shadow-lg"
                >
                  {renderSignIcon(player.activeSign, 'w-3.5 h-3.5', currentSignInfo.color)}
                  <span>
                    {signCooldowns[player.activeSign] > 0
                      ? `${signCooldowns[player.activeSign].toFixed(1)}s`
                      : t(lang, 'mobile.sign')}
                  </span>
                </button>

                {/* Heavy Attack */}
                <button
                  onClick={() => game.performSwordAttack(true)}
                  className="w-12 h-11 sm:w-14 sm:h-12 rounded-xl bg-amber-950/95 border border-amber-500/90 active:scale-95 text-[10px] sm:text-[11px] font-bold text-amber-200 flex flex-col items-center justify-center gap-0.5 shadow-lg"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t(lang, 'mobile.heavy')}</span>
                </button>

                {/* Dodge / Roll */}
                <button
                  onClick={() => game.triggerDodge()}
                  className="w-12 h-11 sm:w-14 sm:h-12 rounded-xl bg-stone-800/95 border border-amber-700/60 active:scale-95 text-[10px] sm:text-[11px] font-semibold text-stone-100 flex flex-col items-center justify-center gap-0.5 shadow-lg"
                >
                  <Wind className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{t(lang, 'mobile.dodge')}</span>
                </button>

                {/* Primary Light Attack (Spans 2 columns for easy thumb tapping) */}
                <button
                  onClick={() => game.performSwordAttack(false)}
                  className="col-span-2 h-11 sm:h-12 rounded-xl bg-gradient-to-r from-red-900/95 to-amber-800/95 border-2 border-amber-400/90 active:scale-95 text-xs font-display font-bold text-white flex items-center justify-center gap-1.5 shadow-xl"
                >
                  <Sword className="w-4 h-4 text-amber-300" />
                  <span>{t(lang, 'mobile.attack')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (Shown on PC Mode, Toggled via settings.hudVisibility.controlsDock) */}
        {!isMobile && (
          hudVis.controlsDock ? (
            <div
              data-testid="pc-controls-dock"
              className={`pointer-events-auto flex flex-col items-center w-full max-w-4xl transition-opacity ${
                activeModal === 'prologue' ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
            <button
              onClick={() => setDockCollapsed((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 medieval-panel border-b-0 rounded-t-lg text-[11px] text-amber-300/90 hover:text-amber-200 transition-colors cursor-pointer"
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> {t(lang, 'dock.show')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> {t(lang, 'dock.hide')}
                </>
              )}
            </button>

            {!dockCollapsed && (
              <div className="w-full medieval-panel rounded-xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
                {/* 5 Magic Signs Selector */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-stone-400 mr-1 hidden sm:inline">
                    {t(lang, 'dock.signs')}:
                  </span>
                  {SIGN_LIST.map((signId, idx) => {
                    const s = MAGIC_SIGNS[signId];
                    const sName =
                      lang === 'en'
                        ? SIGN_TRANSLATIONS_EN[signId]?.name.split(' (')[0] ?? s.name.split(' (')[0]
                        : s.name.split(' (')[0];
                    const isSelected = player.activeSign === signId;
                    const cd = signCooldowns[signId];
                    return (
                      <button
                        key={signId}
                        onClick={() => {
                          game.player.selectSign(signId);
                          game.triggerMagicSign();
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'bg-stone-800/95 text-amber-300 border border-amber-500/80 shadow'
                            : 'bg-stone-950/80 text-stone-400 border border-stone-800 hover:text-stone-200'
                        }`}
                      >
                        <span className="text-[10px] font-mono-tabular text-stone-500">
                          {idx + 3}
                        </span>
                        {renderSignIcon(signId, 'w-3.5 h-3.5 shrink-0', s.color)}
                        <span>{sName}</span>
                        {cd > 0 && (
                          <span className="text-[10px] font-mono-tabular text-red-400 font-semibold">
                            {cd.toFixed(1)}s
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Action & Menu Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => game.openModal('inventory')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      activeModal === 'inventory'
                        ? 'medieval-button-primary'
                        : 'medieval-button'
                    }`}
                  >
                    <Backpack className="w-3.5 h-3.5" /> {t(lang, 'dock.inventory')}
                  </button>
                  <button
                    onClick={() => game.openModal('quests')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      activeModal === 'quests'
                        ? 'medieval-button-primary'
                        : 'medieval-button'
                    }`}
                  >
                    <ScrollText className="w-3.5 h-3.5" /> {t(lang, 'dock.quests')}
                  </button>
                  <button
                    onClick={() => game.openModal('map')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      activeModal === 'map'
                        ? 'medieval-button-primary'
                        : 'medieval-button'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" /> {t(lang, 'dock.map')}
                  </button>
                  <button
                    onClick={() => game.openModal('notice_board')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      activeModal === 'notice_board'
                        ? 'medieval-button-primary'
                        : 'medieval-button text-amber-300'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" /> {t(lang, 'dock.contracts')}
                  </button>
                  <button
                    onClick={() => game.openModal('alchemy')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      activeModal === 'alchemy'
                        ? 'medieval-button-primary'
                        : 'medieval-button text-lime-300'
                    }`}
                  >
                    <FlaskConical className="w-3.5 h-3.5" /> {t(lang, 'dock.alchemy')}
                  </button>
                  <button
                    onClick={() => game.openModal('codex')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      activeModal === 'codex'
                        ? 'medieval-button-primary'
                        : 'medieval-button text-amber-300'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> {t(lang, 'dock.codex')} ({discoveredLoreIds.length}/{totalLoreNotes})
                  </button>
                  <button
                    onClick={() => game.openModal('bestiary')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      activeModal === 'bestiary'
                        ? 'medieval-button-primary'
                        : 'medieval-button'
                    }`}
                  >
                    <Skull className="w-3.5 h-3.5" /> {t(lang, 'dock.bestiary')}
                  </button>
                  <button
                    onClick={() => game.saveGame()}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium medieval-button flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" /> {t(lang, 'dock.save')}
                  </button>
                  <button
                    onClick={() => game.openModal('pause')}
                    aria-label="Меню паузы и настроек"
                    className="p-1.5 rounded-lg medieval-button transition-colors cursor-pointer"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="pointer-events-auto flex justify-end w-full">
            <button
              onClick={() => game.openModal('pause')}
              aria-label="Меню паузы и настроек"
              className="px-3 py-1.5 rounded-lg medieval-button flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>{t(lang, 'pause.title')} [Esc]</span>
            </button>
          </div>
        ))}
      </div>

      {/* ===================================================================== */}
      {/* MODAL WINDOWS */}
      {/* ===================================================================== */}

      {/* 1. DIALOGUE MODAL (Enhanced Legibility + Typewriter Effect) */}
      {activeModal === 'dialogue' && localizedDialogue && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[3px] pointer-events-auto flex items-end justify-center p-4 md:p-8 z-30 transition-all duration-300">
          <div className="w-full max-w-3xl medieval-dialogue-box rounded-2xl p-6 md:p-7">
            <div className="flex items-center justify-between border-b border-amber-700/40 pb-3.5 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-stone-900 border-2 border-amber-500/70 flex items-center justify-center text-amber-300 font-display font-bold text-base shadow-inner">
                  {localizedDialogue.speaker.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-display font-bold text-amber-300 tracking-wide">
                    {localizedDialogue.speaker}
                  </h2>
                  <div className="text-xs md:text-sm text-stone-300/90">
                    {localizedDialogue.role}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isDialogueTyping && (
                  <span className="text-[11px] text-amber-300/80 animate-pulse hidden sm:inline">
                    {t(lang, 'dialogue.skipTypewriter')}
                  </span>
                )}
                <div className="text-[11px] uppercase tracking-wider font-mono text-amber-300/90 border border-amber-700/50 px-3 py-1 rounded-full bg-stone-950/80">
                  {t(lang, 'dialogue.badge')}
                </div>
              </div>
            </div>

            <div
              onClick={() => {
                if (isDialogueTyping) {
                  setTypedDialogueText(localizedDialogue.text);
                  setIsDialogueTyping(false);
                }
              }}
              className="cursor-pointer text-stone-100 text-base md:text-lg leading-relaxed mb-6 bg-stone-950/75 p-5 rounded-xl border border-amber-800/45 shadow-inner min-h-[5.5rem] flex items-center"
            >
              <p className="font-normal tracking-normal">
                «{typedDialogueText || localizedDialogue.text}»
                {isDialogueTyping && (
                  <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle" />
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {localizedDialogue.options.map((opt, idx) => (
                <button
                  key={opt.id}
                  onClick={() => game.selectDialogueOption(opt)}
                  className="w-full text-left px-4 py-3.5 rounded-xl medieval-button text-sm md:text-base text-stone-100 transition-all duration-150 flex items-center gap-3.5 group cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-md bg-amber-950/90 border border-amber-500/70 text-amber-300 font-mono-tabular font-bold text-xs flex items-center justify-center group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors shrink-0">
                    {idx + 1}
                  </span>
                  <span className="group-hover:text-amber-200 transition-colors font-medium">
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. INVENTORY, RUNES, TROPHIES & SKILL TREE MODAL */}
      {activeModal === 'inventory' && (
        <div className="fixed inset-0 bg-black/75 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-4xl medieval-panel-ornate rounded-2xl p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-amber-900/40 pb-4 mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h2 className="text-xl font-display font-bold text-amber-400">
                  {t(lang, 'inv.title')}
                </h2>
                <div className="flex bg-stone-950/90 p-1 rounded-lg border border-amber-800/40">
                  <button
                    onClick={() => setInvTab('items')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      invTab === 'items'
                        ? 'bg-amber-600 text-stone-950 font-semibold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {t(lang, 'inv.tab.items')} ({inventory.length})
                  </button>
                  <button
                    onClick={() => setInvTab('skills')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      invTab === 'skills'
                        ? 'bg-amber-600 text-stone-950 font-semibold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {t(lang, 'inv.tab.skills')} ({player.skillPoints})
                  </button>
                </div>
              </div>
              <button
                onClick={() => game.openModal('none')}
                className="px-3 py-1.5 medieval-button text-xs rounded-lg cursor-pointer"
              >
                {t(lang, 'inv.close')}
              </button>
            </div>

            {/* Stats Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4 bg-stone-950/80 border border-amber-900/40 rounded-xl p-3 text-xs">
              <div>
                <div className="text-stone-400">{t(lang, 'inv.stat.steelDmg')}</div>
                <div className="text-base font-mono-tabular font-bold text-stone-100">
                  {effStats.steelAttack}
                </div>
              </div>
              <div>
                <div className="text-stone-400">{t(lang, 'inv.stat.silverDmg')}</div>
                <div className="text-base font-mono-tabular font-bold text-sky-400">
                  {effStats.silverAttack}
                </div>
              </div>
              <div>
                <div className="text-stone-400">{t(lang, 'inv.stat.defense')}</div>
                <div className="text-base font-mono-tabular font-bold text-amber-400">
                  {effStats.defense}
                </div>
              </div>
              <div>
                <div className="text-stone-400">{t(lang, 'inv.stat.crit')}</div>
                <div className="text-base font-mono-tabular font-bold text-red-400">
                  {Math.round(effStats.critChance * 100)}%
                </div>
              </div>
              <div>
                <div className="text-stone-400">{t(lang, 'inv.stat.signPower')}</div>
                <div className="text-base font-mono-tabular font-bold text-purple-400">
                  {effStats.signIntensity}%
                </div>
              </div>
              <div>
                <div className="text-stone-400">{t(lang, 'inv.stat.gold')}</div>
                <div className="text-base font-mono-tabular font-bold text-yellow-400">
                  {player.gold}
                </div>
              </div>
            </div>

            {/* 4 Exclusive Equipment Slots Overview with Visual Icons */}
            {invTab === 'items' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-amber-700/50 flex items-center gap-2.5">
                  <ItemIcon
                    item={equippedSteelSword ?? { id: 'steel_sword', category: 'weapon' }}
                    size={28}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-amber-400 font-display font-bold truncate">
                      {t(lang, 'inv.slot.steel')}
                    </div>
                    <div className="text-xs font-semibold text-stone-100 truncate mt-0.5">
                      {equippedSteelSword
                        ? `${localizeItem(equippedSteelSword, lang).name}${
                            equippedSteelSword.upgradeLevel
                              ? ` +${equippedSteelSword.upgradeLevel}`
                              : ''
                          }`
                        : t(lang, 'inv.notEquipped')}
                    </div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-sky-700/50 flex items-center gap-2.5">
                  <ItemIcon
                    item={equippedSilverSword ?? { id: 'silver_sword', category: 'weapon' }}
                    size={28}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-sky-400 font-display font-bold truncate">
                      {t(lang, 'inv.slot.silver')}
                    </div>
                    <div className="text-xs font-semibold text-stone-100 truncate mt-0.5">
                      {equippedSilverSword
                        ? `${localizeItem(equippedSilverSword, lang).name}${
                            equippedSilverSword.upgradeLevel
                              ? ` +${equippedSilverSword.upgradeLevel}`
                              : ''
                          }`
                        : t(lang, 'inv.notEquipped')}
                    </div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-emerald-700/50 flex items-center gap-2.5">
                  <ItemIcon
                    item={equippedArmorItem ?? { id: 'armor_raven', category: 'armor' }}
                    size={28}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-display font-bold truncate">
                      {t(lang, 'inv.slot.armor')}
                    </div>
                    <div className="text-xs font-semibold text-stone-100 truncate mt-0.5">
                      {equippedArmorItem
                        ? `${localizeItem(equippedArmorItem, lang).name}${
                            equippedArmorItem.upgradeLevel
                              ? ` +${equippedArmorItem.upgradeLevel}`
                              : ''
                          }`
                        : t(lang, 'inv.notEquipped')}
                    </div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-purple-700/50 flex items-center gap-2.5">
                  <ItemIcon
                    item={equippedTrophy ?? { id: 'trophy_werewolf', category: 'trophy' }}
                    size={28}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-purple-400 font-display font-bold truncate">
                      {t(lang, 'inv.slot.trophy')}
                    </div>
                    <div className="text-xs font-semibold text-stone-100 truncate mt-0.5">
                      {equippedTrophy
                        ? localizeItem(equippedTrophy, lang).name
                        : t(lang, 'inv.notEquipped')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {invTab === 'items' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1">
                {inventory.map((rawItem) => {
                  const item = localizeItem(rawItem, lang);
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                        item.equipped
                          ? 'bg-stone-900/95 border-amber-500/80 shadow-md'
                          : 'bg-stone-900/60 border-stone-800/90'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <ItemIcon item={rawItem} size={36} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-stone-100">
                              {item.name}
                              {item.upgradeLevel ? ` +${item.upgradeLevel}` : ''}
                            </span>
                            <span className="text-xs text-stone-400 font-mono-tabular">
                              x{item.quantity}
                            </span>
                            {item.setId && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-950/80 border border-amber-600/50 text-amber-300">
                                {getSetDisplayName(item.setId)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400 mt-1">
                            {item.description}
                          </p>
                          {(item.category === 'weapon' || item.category === 'armor') && (
                            <div className="text-[11px] text-purple-300 mt-1 font-mono-tabular">
                              {t(lang, 'inv.runeSocket')}:{' '}
                              {item.socketedRuneId ? item.socketedRuneId : t(lang, 'inv.emptySocket')}
                            </div>
                          )}
                          <div className="text-[11px] text-amber-400/90 mt-1.5">
                            {t(lang, 'inv.value')}: {item.value} {t(lang, 'inv.goldShort')}
                            {item.equipped ? ` · ${t(lang, 'inv.equipped')}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 shrink-0">
                        {(item.category === 'weapon' ||
                          item.category === 'armor' ||
                          item.category === 'trophy') && (
                          <button
                            onClick={() => game.useInventoryItem(item.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg medieval-button cursor-pointer"
                          >
                            {item.equipped ? t(lang, 'inv.unequip') : t(lang, 'inv.equip')}
                          </button>
                        )}
                        {item.category === 'blueprint' && (
                          <button
                            onClick={() => game.craftSchoolBlueprint(item.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg medieval-button-primary cursor-pointer"
                          >
                            {t(lang, 'inv.forge')}
                          </button>
                        )}
                        {item.category === 'potion' && item.quantity > 0 && (
                          <button
                            onClick={() => game.useInventoryItem(item.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-600 cursor-pointer"
                          >
                            {t(lang, 'inv.drink')}
                          </button>
                        )}
                        {(item.category === 'weapon' || item.category === 'armor') &&
                          !item.socketedRuneId &&
                          availableRunes.length > 0 && (
                            <button
                              onClick={() =>
                                game.socketRune(availableRunes[0].id, item.id)
                              }
                              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500 cursor-pointer"
                              title={`Инкрустировать ${availableRunes[0].name}`}
                            >
                              {t(lang, 'inv.addRune')}
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1">
                {skills.map((rawSk) => {
                  const sk = localizeSkill(rawSk, lang);
                  return (
                    <div
                      key={sk.id}
                      className="p-4 rounded-xl bg-stone-900/90 border border-amber-900/40 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-amber-400">
                          {sk.name} ({t(lang, 'hud.level')}. {sk.level}/{sk.maxLevel})
                        </div>
                        <p className="text-xs text-stone-300 mt-1">
                          {sk.description}
                        </p>
                      </div>
                      <button
                        disabled={
                          sk.level >= sk.maxLevel || player.skillPoints < sk.cost
                        }
                        onClick={() => {
                          game.inventorySystem.unlockSkill(sk.id, game.player.stats);
                          game.syncHUD();
                        }}
                        className="px-3.5 py-2 rounded-lg text-xs font-semibold medieval-button-primary disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
                      >
                        {sk.level >= sk.maxLevel ? t(lang, 'inv.maxSkill') : t(lang, 'inv.learnSkill')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. QUEST JOURNAL MODAL */}
      {activeModal === 'quests' && (
        <div className="fixed inset-0 bg-black/75 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-3xl bg-stone-950 border border-stone-800 rounded-xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-amber-400">
                  Журнал Заданий и Хроники Вальдмарка
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Сюжетные поручения Корвуса и переход к летописям Кодекса [L]
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => game.openModal('codex')}
                  className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 text-xs font-semibold rounded-lg border border-amber-600/70 transition-colors"
                >
                  📜 Хроники Вальдмарка [L] ({discoveredLoreIds.length}/{totalLoreNotes})
                </button>
                <button
                  onClick={() => game.openModal('none')}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs rounded-lg border border-stone-700"
                >
                  Закрыть [Esc]
                </button>
              </div>
            </div>

            {/* РАЗДЕЛ: ПОСЛЕДСТВИЯ ВЫБОРА (ХРОНИКА РЕШЕНИЙ КОРВУСА) */}
            <div className="mb-4 p-4 rounded-xl bg-stone-900/90 border border-amber-700/60">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-sm font-display font-bold text-amber-300 flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-amber-400" />
                  Раздел Журнала: «Последствия выбора» (Влияние решений на мир Вальдмарка)
                </div>
                <span className="text-[11px] font-mono-tabular text-stone-400">
                  Принято судьбоносных решений: {(player.questConsequences ?? []).length} / 4
                </span>
              </div>
              {(player.questConsequences ?? []).length === 0 ? (
                <p className="text-xs text-stone-400 leading-relaxed">
                  Здесь фиксируются моральные вердикты Корвуса в 4 нелинейных расследованиях («Кровь на колокольне», «Пир Воронов», «Клятва в Мёртвых Шахтах», «Последний Экзамен Зольника») и то, как они изменили судьбы жителей и локаций.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
                  {(player.questConsequences ?? []).map((cons) => (
                    <div
                      key={cons.questId}
                      className="p-3 rounded-lg bg-stone-950/90 border border-amber-600/50 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-display font-bold text-amber-300">
                          ⚖️ {cons.choiceTitle}
                        </span>
                        <span className="text-[10px] font-mono-tabular text-stone-400">
                          {cons.questTitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-300 leading-snug">
                        {cons.summary}
                      </p>
                      <div className="text-[11px] text-emerald-300/90 font-medium pt-1 border-t border-stone-800/80">
                        🌍 Отражение в мире: {cons.worldEffectDescription}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
              {allQuests.map((q) => {
                const isTracked = activeQuest?.id === q.id;
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border ${
                      isTracked
                        ? 'bg-stone-900 border-amber-600/70'
                        : q.isInvestigationQuest
                        ? 'bg-stone-900/75 border-amber-800/50'
                        : 'bg-stone-900/50 border-stone-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-display font-bold text-stone-100">
                          {q.title}
                        </span>
                        {q.isInvestigationQuest && (
                          <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-600/60 text-amber-300 text-[10px] font-semibold">
                            🔍 Нелинейное расследование
                          </span>
                        )}
                        <span className="text-xs text-stone-400">
                          · {q.biome} · Реком. ур. {q.recommendedLevel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium ${
                            q.status === 'completed'
                              ? 'text-emerald-400'
                              : q.status === 'active'
                              ? 'text-amber-400'
                              : 'text-stone-400'
                          }`}
                        >
                          {q.status === 'completed'
                            ? 'Выполнено'
                            : q.status === 'active'
                            ? 'Активно'
                            : 'Доступно для расследования'}
                        </span>
                        {q.status !== 'completed' && (
                          <button
                            onClick={() => {
                              game.questSystem.setActiveQuest(q.id);
                              game.syncHUD();
                            }}
                            className={`px-3 py-1 text-xs rounded font-medium ${
                              isTracked
                                ? 'bg-amber-600 text-stone-950'
                                : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                            }`}
                          >
                            {isTracked ? 'Отслеживается' : 'Отслеживать'}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-stone-300 mb-3 leading-relaxed">
                      {q.description}
                    </p>

                    <div className="space-y-1.5 border-t border-stone-800 pt-2.5">
                      {q.stages.map((st, idx) => (
                        <div
                          key={st.id}
                          className={`text-xs flex items-center gap-2 ${
                            st.completed
                              ? 'text-emerald-400 line-through'
                              : idx === q.currentStageIndex && q.status === 'active'
                              ? 'text-amber-300 font-medium'
                              : 'text-stone-500'
                          }`}
                        >
                          <span>{st.completed ? '✓' : '•'}</span>
                          <span>{st.description}</span>
                        </div>
                      ))}
                    </div>

                    {q.consequenceTitle && (
                      <div className="mt-3 p-3 rounded-lg bg-stone-950 border border-amber-600/60 space-y-1">
                        <div className="text-xs font-display font-bold text-amber-400">
                          📜 Последствия выбора: {q.consequenceTitle}
                        </div>
                        <p className="text-xs text-stone-300 leading-relaxed">
                          {q.consequenceSummary}
                        </p>
                        {q.consequenceWorldEffect && (
                          <div className="text-[11px] text-emerald-300 font-medium">
                            🌍 Изменение в мире: {q.consequenceWorldEffect}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. WORLD MAP, HIDDEN POIs (?) & FAST TRAVEL MODAL */}
      {activeModal === 'map' && (
        <div className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-4xl bg-stone-950 border border-stone-800 rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-amber-400">
                  Карта Королевства, Точки Интереса (?) и Быстрый Переход
                </h2>
                <p className="text-xs text-stone-400">
                  Исследуйте знаки вопроса (?), выслеживайте чудовищ в зонах контрактов или перемещайтесь по указателям
                </p>
              </div>
              <button
                onClick={() => game.openModal('none')}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs rounded-lg border border-stone-700"
              >
                Закрыть [Esc]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Interactive 2D Radar Map */}
              <div className="md:col-span-2 flex flex-col gap-2 w-full">
                <div className="relative aspect-square max-h-[370px] w-full bg-stone-900 border border-stone-800 rounded-xl overflow-hidden mx-auto">
                  {/* SVG Cartography Background (Biome Zones, Contract Search Circles & Roads) */}
                  <svg
                    viewBox="0 0 100 100"
                    className="absolute inset-0 w-full h-full pointer-events-none z-0"
                  >
                    <circle
                      cx="50"
                      cy="52"
                      r="10"
                      fill="rgba(245, 158, 11, 0.08)"
                      stroke="rgba(245, 158, 11, 0.25)"
                      strokeWidth="0.4"
                      strokeDasharray="1.5 1.5"
                    />
                    <circle
                      cx="18"
                      cy="23"
                      r="11"
                      fill="rgba(168, 85, 247, 0.09)"
                      stroke="rgba(168, 85, 247, 0.28)"
                      strokeWidth="0.4"
                      strokeDasharray="1.5 1.5"
                    />
                    <circle
                      cx="83"
                      cy="19"
                      r="12"
                      fill="rgba(239, 68, 68, 0.09)"
                      stroke="rgba(239, 68, 68, 0.3)"
                      strokeWidth="0.4"
                      strokeDasharray="1.5 1.5"
                    />
                    <circle
                      cx="28"
                      cy="48"
                      r="11"
                      fill="rgba(16, 185, 129, 0.08)"
                      stroke="rgba(16, 185, 129, 0.25)"
                      strokeWidth="0.4"
                      strokeDasharray="1.5 1.5"
                    />
                    <circle
                      cx="80"
                      cy="79"
                      r="10"
                      fill="rgba(56, 189, 248, 0.08)"
                      stroke="rgba(56, 189, 248, 0.28)"
                      strokeWidth="0.4"
                      strokeDasharray="1.5 1.5"
                    />
                    {/* Active Contract Search Zones */}
                    {contracts
                      .filter(
                        (c) =>
                          c.status === 'tracking' || c.status === 'boss_spawned'
                      )
                      .map((c) => (
                        <circle
                          key={c.id}
                          cx={50 + (c.searchX / 190) * 100}
                          cy={50 + (c.searchZ / 190) * 100}
                          r={(15 / 190) * 100}
                          fill="rgba(245, 158, 11, 0.16)"
                          stroke="rgba(251, 191, 36, 0.85)"
                          strokeWidth="0.6"
                          strokeDasharray="1 1"
                        />
                      ))}
                    <path
                      d="M 50 52 Q 36 38 18 23 M 50 52 Q 66 36 83 19 M 50 52 Q 38 56 32 60 M 50 52 Q 65 65 80 79"
                      fill="none"
                      stroke="rgba(168, 162, 158, 0.2)"
                      strokeWidth="0.6"
                      strokeDasharray="1.2 1.2"
                    />
                  </svg>

                  {/* Biome Labels */}
                  <div className="absolute top-[57%] left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded bg-stone-950/90 border border-amber-700/60 text-[10px] font-display font-semibold text-amber-200 pointer-events-none whitespace-nowrap shadow">
                    Деревня Воронья Падь
                  </div>
                  <div className="absolute top-[7%] left-[6%] z-10 px-2 py-0.5 rounded bg-stone-950/90 border border-purple-500/60 text-[10px] font-display font-semibold text-purple-200 pointer-events-none whitespace-nowrap shadow">
                    Проклятое святилище (Катакомбы)
                  </div>
                  <div className="absolute top-[5%] right-[6%] z-10 px-2 py-0.5 rounded bg-stone-950/90 border border-red-500/60 text-[10px] font-display font-semibold text-red-200 pointer-events-none whitespace-nowrap shadow">
                    Разрушенная крепость
                  </div>
                  <div className="absolute top-[33%] left-[8%] z-10 px-2 py-0.5 rounded bg-stone-950/90 border border-emerald-600/60 text-[10px] font-display font-semibold text-emerald-200 pointer-events-none whitespace-nowrap shadow">
                    Старый лес
                  </div>
                  <div className="absolute top-[50%] left-[2%] z-10 px-2 py-0.5 rounded bg-stone-950/90 border border-teal-500/60 text-[10px] font-display font-semibold text-teal-200 pointer-events-none whitespace-nowrap shadow">
                    Затонувший Порт Сольхейм
                  </div>
                  <div className="absolute top-[42%] right-[2%] z-10 px-2 py-0.5 rounded bg-stone-950/90 border border-yellow-500/60 text-[10px] font-display font-semibold text-yellow-200 pointer-events-none whitespace-nowrap shadow">
                    Монастырь Солнечных Клятв
                  </div>
                  <div className="absolute top-[1%] left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded bg-stone-950/90 border border-cyan-400/70 text-[10px] font-display font-semibold text-cyan-200 pointer-events-none whitespace-nowrap shadow">
                    Акт III: Долина Звёздного Пепла
                  </div>
                  <div className="absolute bottom-[10%] right-[6%] z-10 px-2 py-0.5 rounded bg-stone-950/90 border border-sky-500/60 text-[10px] font-display font-semibold text-sky-200 pointer-events-none whitespace-nowrap shadow">
                    Пепельное кладбище (Акт II)
                  </div>

                  {/* 6 Hidden Points of Interest (? on Map until discovered) */}
                  {hud.worldInteractables
                    .filter((w) => w.isPOI)
                    .map((poi) => {
                      const leftPct = Math.max(5, Math.min(95, 50 + (poi.x / 190) * 100));
                      const topPct = Math.max(5, Math.min(95, 50 + (poi.z / 190) * 100));
                      const isDiscovered = poi.discovered !== false;
                      return (
                        <div
                          key={poi.id}
                          style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                          className={`absolute -ml-2.5 -mt-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow z-20 ${
                            poi.interacted
                              ? 'bg-stone-800/80 border border-stone-600 text-stone-500'
                              : isDiscovered
                              ? 'bg-amber-500 text-stone-950 border border-white'
                              : 'bg-stone-950 border border-amber-400 text-amber-300 animate-pulse'
                          }`}
                          title={
                            isDiscovered
                              ? `${poi.name} (${poi.interacted ? 'Зачищено' : poi.roleOrSubtitle})`
                              : 'Неизвестная точка интереса (?) — подойдите ближе, чтобы открыть'
                          }
                        >
                          {!isDiscovered
                            ? '?'
                            : poi.type === 'place_of_power'
                            ? '⚡'
                            : poi.type === 'monster_nest'
                            ? '🔥'
                            : '💎'}
                        </div>
                      );
                    })}

                  {/* Active Quest Target Pin */}
                  {currentStage && (
                    <div
                      className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-amber-400 bg-amber-500/40 z-20"
                      style={{
                        left: `${Math.max(4, Math.min(96, 50 + (currentStage.targetX / 190) * 100))}%`,
                        top: `${Math.max(4, Math.min(96, 50 + (currentStage.targetZ / 190) * 100))}%`,
                      }}
                      title={`Цель задания: ${currentStage.description}`}
                    />
                  )}

                  {/* Distinct Enemy Markers by Type */}
                  {hud.enemies
                    .filter((e) => e.state !== 'DEAD' && e.x < 85)
                    .map((e) => {
                      const styleByType =
                        e.type === 'boss' || e.type === 'malakor'
                          ? 'w-4 h-4 -ml-2 -mt-2 bg-red-600 border-2 border-amber-300 z-20'
                          : e.type === 'werewolf' ||
                            e.type === 'noonwraith' ||
                            e.type === 'gargoyle'
                          ? 'w-3.5 h-3.5 -ml-1.5 -mt-1.5 bg-amber-400 border-2 border-red-600 z-20'
                          : e.type === 'demon'
                          ? 'w-3.5 h-3.5 -ml-1.5 -mt-1.5 bg-orange-500 border border-amber-200 z-15'
                          : e.type === 'hag'
                          ? 'w-3 h-3 -ml-1.5 -mt-1.5 bg-purple-500 border border-purple-200 z-15'
                          : e.type === 'wolf'
                          ? 'w-2.5 h-2.5 -ml-1 -mt-1 bg-amber-500 border border-stone-950 z-10'
                          : 'w-2.5 h-2.5 -ml-1 -mt-1 bg-red-500 border border-stone-950 z-10';
                      return (
                        <div
                          key={e.id}
                          className={`absolute rounded-full shadow ${styleByType}`}
                          style={{
                            left: `${50 + (e.x / 190) * 100}%`,
                            top: `${50 + (e.z / 190) * 100}%`,
                          }}
                          title={`${e.name} (${Math.ceil(e.hp)}/${e.maxHp} ОЗ)`}
                        />
                      );
                    })}

                  {/* Player Position Marker */}
                  <div
                    className="absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full bg-white border-2 border-emerald-500 shadow z-30"
                    style={{
                      left: `${Math.max(4, Math.min(96, 50 + (player.x / 190) * 100))}%`,
                      top: `${Math.max(4, Math.min(96, 50 + (player.z / 190) * 100))}%`,
                    }}
                    title="Герой"
                  />
                </div>

                {/* Map Legend Bar */}
                <div className="flex flex-wrap items-center justify-center gap-3 px-3 py-1.5 bg-stone-900/90 border border-stone-800 rounded-lg text-[11px] text-stone-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-emerald-500 inline-block" />
                    Герой
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="px-1 rounded bg-stone-950 border border-amber-400 text-amber-300 text-[10px] font-bold">
                      ?
                    </span>
                    Точка интереса (Гнездо / Место Силы / Клад)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-400 border-2 border-red-600 inline-block" />
                    Босс контракта
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-600 border-2 border-amber-300 inline-block" />
                    Сюжетный босс
                  </span>
                </div>
              </div>

              {/* Fast Travel Signposts List */}
              <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
                <div className="text-xs font-semibold text-stone-300 mb-1">
                  Путевые указатели (12 биомов):
                </div>
                {[
                  {
                    name: 'Деревня Воронья Падь',
                    sub: 'Доска заказов, Кузнец, Трактир, Мельница',
                    x: 0,
                    z: 4,
                  },
                  {
                    name: 'Старый лес и Кордон Егерей',
                    sub: 'Логово Волколака, Лесопилка и Место Силы',
                    x: -36,
                    z: -2,
                  },
                  {
                    name: 'Проклятое святилище и Катакомбы',
                    sub: 'Ведьма Морана и Вход в Склеп Королей',
                    x: -54,
                    z: -45,
                  },
                  {
                    name: 'Врата Разрушенной крепости',
                    sub: 'Осадный двор, Горгулья и Древний Хранитель',
                    x: 48,
                    z: -44,
                  },
                  {
                    name: 'Затонувший Порт Сольхейм (Западное море)',
                    sub: 'Маяк Бездны, Смотритель Хальвар и Сирена Никса',
                    x: -118,
                    z: 2,
                  },
                  {
                    name: 'Лазурный Монастырь Солнечных Клятв (Восток)',
                    sub: 'Обсерватория, Аббат Аврелий и Колосс Гелиос',
                    x: 118,
                    z: -15,
                  },
                  {
                    name: 'Акт II: Лагерь Ордена и Пепельное кладбище',
                    sub: 'Часовня, Инквизитор Лазарь и Король-Лич Малакор',
                    x: 24,
                    z: 32,
                  },
                  {
                    name: 'Северный Поход: Тракт Висельников и Топи',
                    sub: 'Деревня на сваях, Поместье Вейнов и Болотная Гидра',
                    x: 0,
                    z: -115,
                  },
                  {
                    name: 'Среброзубый Перевал и Мёртвые Шахты',
                    sub: 'Плавильня Чёрной Руды, Штольни и Ледяной Колосс',
                    x: 0,
                    z: -222,
                  },
                  {
                    name: 'Чёрный Бастион Братства Пепла',
                    sub: 'Цитадель Странников, Алхимический цех и Магистр Веспер',
                    x: 0,
                    z: -332,
                  },
                  {
                    name: 'Кратер Затмения и Зал Трона Пустоты',
                    sub: 'Обсидиановые острова и Аватар Чёрного Солнца',
                    x: 0,
                    z: -442,
                  },
                  {
                    name: 'Акт III: Долина Звёздного Пепла и Кузница Предтеч',
                    sub: 'Зодчий Астрарион, Наковальня Света и Архонт Солярис',
                    x: 0,
                    z: -565,
                  },
                ].map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => game.fastTravelTo(loc.x, loc.z, loc.name)}
                    className="text-left p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/60 transition-colors"
                  >
                    <div className="text-xs font-semibold text-amber-400">
                      {loc.name}
                    </div>
                    <div className="text-[11px] text-stone-400">{loc.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MERCHANT SHOP MODAL */}
      {activeModal === 'shop' && (
        <div className="fixed inset-0 bg-black/75 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-4xl medieval-panel-ornate rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-amber-900/40 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-amber-400">
                  {game.isFenceShop
                    ? 'Тайник Скупщика «Хоря» (Чёрный рынок Перевала)'
                    : 'Лавка купца и каравана'}
                </h2>
                <div className="text-xs text-stone-300 font-mono-tabular flex flex-wrap items-center gap-3 mt-0.5">
                  <span>{t(lang, 'hud.gold')}: {player.gold}</span>
                  {hud.reputationInfo && (
                    <span className="text-amber-300/90">
                      · «{hud.reputationInfo.title}» ({t(lang, 'hud.prices')}:{' '}
                      {Math.round(
                        (game.isFenceShop
                          ? 0.9
                          : hud.reputationInfo.priceMultiplier) * 100
                      )}
                      %)
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  game.isFenceShop = false;
                  game.openModal('none');
                }}
                className="px-3 py-1.5 medieval-button text-xs rounded-lg cursor-pointer"
              >
                {t(lang, 'inv.close')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1">
              {/* Buy Column */}
              <div>
                <h3 className="text-sm font-semibold text-amber-300 mb-2.5">
                  Товары торговца (Купить)
                </h3>
                <div className="space-y-2.5">
                  {game.inventorySystem.shopCatalog.map((rawItem) => {
                    const item = localizeItem(rawItem, lang);
                    const effectivePrice = calculateMerchantPrice(
                      item.value,
                      player.reputation ?? 0,
                      game.isFenceShop
                    );
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ItemIcon item={rawItem} size={32} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-stone-100 truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-stone-400">
                              {item.description}
                            </div>
                          </div>
                        </div>
                        <button
                          disabled={player.gold < effectivePrice}
                          onClick={() => {
                            game.inventorySystem.buyShopItem(
                              item.id,
                              game.player.stats,
                              game.isFenceShop
                            );
                            game.syncHUD();
                          }}
                          className="px-3 py-1.5 rounded-lg medieval-button-primary disabled:opacity-40 text-xs whitespace-nowrap cursor-pointer"
                        >
                          Купить ({effectivePrice})
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sell Column */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-300 mb-2.5">
                  Ваш инвентарь (Продать трофеи и ресурсы)
                </h3>
                <div className="space-y-2.5">
                  {inventory.map((rawItem) => {
                    const item = localizeItem(rawItem, lang);
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ItemIcon item={rawItem} size={32} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-stone-100 truncate">
                              {item.name} (x{item.quantity})
                            </div>
                            <div className="text-[11px] text-stone-400">
                              Цена скупки: {Math.max(5, Math.round(item.value * 0.6))} {t(lang, 'inv.goldShort')}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            game.inventorySystem.sellInventoryItem(
                              item.id,
                              game.player.stats
                            );
                            game.syncHUD();
                          }}
                          className="px-3 py-1.5 rounded-lg medieval-button text-xs whitespace-nowrap cursor-pointer"
                        >
                          Продать
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. BLACKSMITH FORGE & SCHOOL BLUEPRINTS MODAL */}
      {activeModal === 'blacksmith' && (
        <div className="fixed inset-0 bg-black/75 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-3xl medieval-panel-ornate rounded-2xl p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-amber-900/40 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-amber-400">
                  Кузница Мастера Грома: Заточка и Доспехи Школ
                </h2>
                <div className="text-xs text-stone-300 font-mono-tabular mt-0.5 flex items-center gap-3">
                  <span>{t(lang, 'hud.gold')}: {player.gold}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <ItemIcon item={{ id: 'iron_ore', category: 'material' }} size={16} />
                    Железная руда: {oreCount} шт.
                  </span>
                </div>
              </div>
              <button
                onClick={() => game.openModal('none')}
                className="px-3 py-1.5 medieval-button text-xs rounded-lg cursor-pointer"
              >
                {t(lang, 'inv.close')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto pr-1">
              {/* Upgrade Existing Weapons/Armor */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-amber-300">
                  Заточка и укрепление снаряжения (+15%)
                </h3>
                {inventory
                  .filter(
                    (i) => i.category === 'weapon' || i.category === 'armor'
                  )
                  .map((rawItem) => {
                    const item = localizeItem(rawItem, lang);
                    const cost = getUpgradeCost(rawItem);
                    const canAfford =
                      player.gold >= cost.gold && oreCount >= cost.oreCount;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ItemIcon item={rawItem} size={32} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-stone-100 truncate">
                              {item.name} (+{item.upgradeLevel ?? 0})
                            </div>
                            <div className="text-[11px] text-stone-400 mt-0.5">
                              Цена: {cost.gold} зол. и {cost.oreCount} руды
                            </div>
                          </div>
                        </div>
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            game.inventorySystem.upgradeItem(
                              item.id,
                              game.player.stats
                            );
                            game.audio.playHitImpact(true);
                            game.syncHUD();
                          }}
                          className="px-3 py-1.5 rounded-lg medieval-button-primary disabled:opacity-40 text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Hammer className="w-3.5 h-3.5" /> Улучшить
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Craft Witcher School Sets from Blueprints */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-sky-300">
                  Ковка комплектов Школ (Ворон / Медведь / Пламя)
                </h3>
                {inventory
                  .filter((i) => i.category === 'blueprint')
                  .map((rawBp) => {
                    const bp = localizeItem(rawBp, lang);
                    return (
                      <div
                        key={bp.id}
                        className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ItemIcon item={rawBp} size={32} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-amber-200 truncate">
                              {bp.name}
                            </div>
                            <div className="text-[11px] text-stone-400 mt-0.5">
                              {bp.description}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => game.craftSchoolBlueprint(bp.id)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-stone-950 font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {t(lang, 'inv.forge')}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. NOTICE BOARD & HUNTER CONTRACTS MODAL */}
      {activeModal === 'notice_board' && (
        <div className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-4xl bg-stone-950 border-2 border-amber-700/70 rounded-xl p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-amber-400 flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-amber-500" />
                  Доска Объявлений Вороньей Пади: Контракты Охотника
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Возьмите заказ, исследуйте 3 улики [E] в зоне поиска с Чутьём Охотника [V] и сразите Именного Монстра ради редкого Трофея на пояс
                </p>
              </div>
              <button
                onClick={() => game.openModal('none')}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs rounded-lg border border-stone-700"
              >
                Закрыть [Esc]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1">
              {contracts.map((contract) => {
                const isActive =
                  contract.status === 'tracking' ||
                  contract.status === 'boss_spawned';
                const isCompleted = contract.status === 'completed';
                return (
                  <div
                    key={contract.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      isCompleted
                        ? 'bg-stone-900/40 border-emerald-700/50'
                        : isActive
                        ? 'bg-stone-900 border-amber-500'
                        : 'bg-stone-900/80 border-amber-800/50 hover:border-amber-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-base font-display font-bold text-amber-300">
                          📜 {contract.title}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-mono-tabular rounded bg-stone-950 border border-stone-700 text-stone-300">
                          Ур. {contract.recommendedLevel} · {contract.biome}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-red-400 mb-1">
                        Цель охоты: {contract.monsterName}
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed mb-3">
                        {contract.description}
                      </p>
                      <div className="text-xs text-amber-400 font-mono-tabular mb-2">
                        Изучено улик в зоне охоты: {contract.cluesFound} /{' '}
                        {contract.cluesRequired}
                      </div>
                      <div className="text-[11px] text-emerald-300 font-mono-tabular">
                        Награда: +{contract.rewardGold} крон · +{contract.rewardXp} Опыта
                        {contract.trophyItemId ? ' · 🏆 Уникальный Трофей на пояс' : ''}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800/80">
                      {isCompleted ? (
                        <span className="px-3 py-1.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-semibold">
                          ✓ Контракт выполнен
                        </span>
                      ) : isActive ? (
                        <button
                          onClick={() => game.openModal('none')}
                          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs"
                        >
                          Отслеживается в зоне охоты
                        </button>
                      ) : (
                        <button
                          onClick={() => game.acceptContract(contract.id)}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow"
                        >
                          Сорвать объявление и взять заказ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 8. ALCHEMY, ELIXIRS & BLADE OILS MODAL */}
      {activeModal === 'alchemy' && (
        <div className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-3xl bg-stone-950 border border-lime-700/60 rounded-xl p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-lime-400 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />
                  Алхимическая Лаборатория и Масла для Клинков
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Варите эликсиры и масла из собранных трав и органов чудовищ. Токсичность: {Math.floor(player.toxicity)}/{player.maxToxicity}
                </p>
              </div>
              <button
                onClick={() => game.openModal('none')}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs rounded-lg border border-stone-700"
              >
                Закрыть [Esc]
              </button>
            </div>

            {/* Companion Campfire Bond & Recruitment Bar */}
            <div className="mb-3 p-3 rounded-lg bg-stone-900/95 border border-emerald-800/60 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-emerald-300">
                    Привал у костра: Боевой Напарник
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {hud.activeCompanion
                      ? `${hud.activeCompanion.name} (${hud.activeCompanion.title}) отдыхает у огня`
                      : 'Позовите спутника в поход или поговорите с ним у костра'}
                  </div>
                </div>
                {hud.activeCompanion && (
                  <button
                    onClick={() => game.triggerCompanionCampfireTalk()}
                    className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-stone-950 font-bold text-xs"
                  >
                    🔥 Личная беседа у костра (+Опыт)
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-800">
                {(player.unlockedCompanions ?? ['lyra', 'thorvald']).map(
                  (compId: CompanionId) => {
                    const prof = COMPANION_PROFILES[compId];
                    const isCurrent = hud.activeCompanion?.id === compId;
                    return (
                      <button
                        key={compId}
                        onClick={() =>
                          isCurrent
                            ? game.dismissCompanion()
                            : game.recruitCompanion(compId)
                        }
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                          isCurrent
                            ? 'bg-emerald-600 text-stone-950 border-emerald-400'
                            : 'bg-stone-950 text-stone-300 border-stone-700 hover:border-emerald-500'
                        }`}
                      >
                        {isCurrent
                          ? `✓ В отряде: ${prof.name} (Отпустить)`
                          : `+ Позвать: ${prof.name} (${prof.weaponDesc})`}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Quick Apply Blade Oils Bar */}
            <div className="mb-4 p-3 rounded-lg bg-stone-900 border border-stone-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-amber-300">
                Быстрое нанесение масла (+30% урона по уязвимому классу на 3 мин):
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { type: 'cursed' as const, label: '🐺 Против Проклятых (Волколак / Демон)' },
                  { type: 'necrophage' as const, label: '🧟 Против Трупоедов (Упыри / Ведьма)' },
                  { type: 'specter' as const, label: '👻 Против Призраков (Полуденница / Лич)' },
                ].map((o) => (
                  <button
                    key={o.type}
                    onClick={() => game.applyBladeOil(o.type)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                      player.activeBladeOil === o.type
                        ? 'bg-amber-600 text-stone-950 border-amber-400 font-bold'
                        : 'bg-stone-950 text-stone-200 border-stone-700 hover:border-amber-500'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              {ALCHEMY_RECIPES.map((rec) => {
                const ingStatus = rec.ingredients.map((ing) => {
                  const found = inventory.find((i) => i.id === ing.itemId);
                  const have = found ? found.quantity : 0;
                  return { ...ing, have, ok: have >= ing.count };
                });
                const canBrew = ingStatus.every((s) => s.ok);
                return (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-stone-900/85 border border-stone-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <ItemIcon item={{ id: rec.id, name: rec.name, category: 'potion' }} size={36} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-stone-100">
                          {rec.name}
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {rec.description}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono-tabular">
                          {ingStatus.map((s) => (
                            <span
                              key={s.itemId}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded bg-stone-950/90 border ${
                                s.ok
                                  ? 'text-emerald-300 border-emerald-700/50'
                                  : 'text-red-300 border-red-800/50'
                              }`}
                            >
                              <ItemIcon item={{ id: s.itemId, name: s.name, category: 'material' }} size={14} />
                              <span>
                                {s.name}: {s.have}/{s.count}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={!canBrew}
                      onClick={() => game.brewAlchemyRecipe(rec.id)}
                      className="px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold text-xs shrink-0 cursor-pointer"
                    >
                      Сварить
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 9. BESTIARY MODAL */}
      {activeModal === 'bestiary' && bestiary && (
        <div className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-4xl bg-stone-950 border border-amber-700/60 rounded-xl p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-amber-400 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Бестиарий Охотника: Уязвимости и Мутации Чудовищ
                </h2>
                <p className="text-xs text-stone-400">
                  Изучайте слабые места бестий перед боем — правильное масло и Знак решают исход схватки
                </p>
              </div>
              <button
                onClick={() => game.openModal('none')}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs rounded-lg border border-stone-700"
              >
                Закрыть [Esc]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto">
              <div className="space-y-1.5">
                {bestiary.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedBestiaryId(entry.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      selectedBestiaryId === entry.id
                        ? 'bg-amber-600 text-stone-950 border-amber-400 font-bold'
                        : 'bg-stone-900 text-stone-200 border-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <div>{entry.name}</div>
                    <div
                      className={`text-[10px] ${
                        selectedBestiaryId === entry.id
                          ? 'text-stone-900'
                          : 'text-stone-400'
                      }`}
                    >
                      {entry.title}
                    </div>
                  </button>
                ))}
              </div>

              <div className="md:col-span-2 bg-stone-900 border border-stone-800 rounded-xl p-5 flex flex-col justify-between">
                {(() => {
                  const activeEntry =
                    bestiary.find((b) => b.id === selectedBestiaryId) ||
                    bestiary[0];
                  if (!activeEntry) return null;
                  return (
                    <div className="space-y-4">
                      <div className="border-b border-stone-800 pb-3">
                        <h3 className="text-lg font-display font-bold text-amber-400">
                          {activeEntry.name}
                        </h3>
                        <div className="text-xs text-stone-400">
                          {activeEntry.title} · Класс: {activeEntry.category}
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-stone-200 leading-relaxed italic">
                        «{activeEntry.lore}»
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 rounded-lg bg-stone-950 border border-amber-700/50">
                          <div className="text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-1">
                            Уязвимость к Знакам
                          </div>
                          <div className="text-xs text-stone-200">
                            {activeEntry.weaknessSigns.join(', ')}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-stone-950 border border-lime-700/50">
                          <div className="text-[11px] uppercase tracking-wider text-lime-400 font-bold mb-1">
                            Рекомендуемое Масло
                          </div>
                          <div className="text-xs text-stone-200">
                            {activeEntry.weaknessOil}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-300">
                        <span className="text-amber-300 font-semibold">
                          Бонус трофея:{' '}
                        </span>
                        {activeEntry.trophyBonus}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. DICE POKER ("КОСТИ СУДЬБЫ") MINI-GAME MODAL */}
      {activeModal === 'dice_poker' && dicePoker && (
        <div className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-xl bg-stone-950 border-2 border-amber-600/80 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h2 className="text-xl font-display font-bold text-amber-400 flex items-center gap-2">
                  <Dices className="w-5 h-5" />
                  Кости Судьбы — Покер с костями
                </h2>
                <div className="text-xs text-stone-400">
                  Соперник: {dicePoker.opponentName} · Ставка: {dicePoker.bet} крон (Банк: {dicePoker.bet * 2})
                </div>
              </div>
              <button
                onClick={() => game.openModal('none')}
                className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs rounded border border-stone-700"
              >
                Выйти
              </button>
            </div>

            {/* Opponent Dice Row */}
            <div className="p-4 rounded-lg bg-stone-900/90 border border-stone-800">
              <div className="flex justify-between text-xs text-stone-400 mb-2">
                <span>Рука соперника ({dicePoker.opponentName})</span>
                <span className="text-amber-300 font-semibold">
                  {dicePoker.npcHandLabel}
                </span>
              </div>
              <div className="flex justify-center gap-3">
                {dicePoker.npcDice.map((val, i) => (
                  <div
                    key={i}
                    className="w-11 h-11 rounded-lg bg-stone-950 border border-stone-700 flex items-center justify-center text-lg font-mono-tabular font-bold text-stone-200"
                  >
                    {val}
                  </div>
                ))}
              </div>
            </div>

            {/* Player Dice Row (Clickable to select for reroll) */}
            <div className="p-4 rounded-lg bg-stone-900 border border-amber-700/50">
              <div className="flex justify-between text-xs text-stone-300 mb-2">
                <span>Ваша рука (нажмите на кости для переброса)</span>
                <span className="text-emerald-400 font-semibold">
                  {dicePoker.playerHandLabel}
                </span>
              </div>
              <div className="flex justify-center gap-3">
                {dicePoker.playerDice.map((val, i) => {
                  const selected = dicePoker.selectedForReroll[i];
                  return (
                    <button
                      key={i}
                      onClick={() => game.toggleDiceHold(i)}
                      className={`w-12 h-12 rounded-lg border-2 flex flex-col items-center justify-center font-mono-tabular font-bold transition-transform ${
                        selected
                          ? 'bg-amber-600/30 border-amber-400 text-amber-200 -translate-y-1'
                          : 'bg-stone-950 border-stone-700 text-white hover:border-amber-500/60'
                      }`}
                    >
                      <span className="text-lg">{val}</span>
                      {selected && (
                        <span className="text-[9px] uppercase text-amber-300">
                          Сброс
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-center text-amber-200 bg-stone-900/70 p-2.5 rounded border border-stone-800">
              {dicePoker.message}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              {dicePoker.stage === 'betting' && (
                <button
                  onClick={() => game.rollDicePoker()}
                  className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm"
                >
                  Бросить кости (Ставка {dicePoker.bet} крон)
                </button>
              )}
              {dicePoker.stage === 'select_reroll' && (
                <>
                  <button
                    onClick={() => game.standDicePoker()}
                    className="flex-1 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700"
                  >
                    Оставить руку (Вскрыться)
                  </button>
                  <button
                    onClick={() => game.rollDicePoker()}
                    className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                  >
                    Перебросить выбранные
                  </button>
                </>
              )}
              {dicePoker.stage === 'finished' && (
                <>
                  <button
                    onClick={() =>
                      game.startDicePoker(dicePoker.opponentName, dicePoker.bet)
                    }
                    className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                  >
                    Сыграть ещё партию
                  </button>
                  <button
                    onClick={() => game.openModal('none')}
                    className="px-4 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs"
                  >
                    Забрать золото и уйти
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 11. RANDOM ROAD EVENT MODAL */}
      {activeModal === 'road_event' && roadEvent && (
        <div className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-lg bg-stone-950 border-2 border-amber-600/80 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="text-xs uppercase tracking-widest text-amber-400 font-display font-bold">
              Случайная встреча на тракте
            </div>
            <h2 className="text-xl font-display font-bold text-stone-100">
              {roadEvent.title}
            </h2>
            <p className="text-xs md:text-sm text-stone-300 leading-relaxed">
              {roadEvent.description}
            </p>
            <div className="space-y-2 pt-2">
              {roadEvent.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => game.resolveRoadEventOption(idx)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500 text-xs text-stone-100 transition-colors"
                >
                  {idx + 1}. {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 12. PAUSE & SETTINGS MODAL (Audio/Music Sliders, RU/EN Language, Day/Night & HUD Customization) */}
      {activeModal === 'pause' && (
        <div className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-xl medieval-panel-ornate rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-amber-900/40 pb-3">
              <h2 className="text-xl font-display font-bold text-amber-400">
                {t(lang, 'pause.title')}
              </h2>
              <div className="flex bg-stone-950 p-1 rounded-lg border border-amber-800/40">
                <button
                  onClick={() => setSettingsTab('general')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    settingsTab === 'general'
                      ? 'bg-amber-600 text-stone-950'
                      : 'text-stone-300 hover:text-amber-300'
                  }`}
                >
                  {t(lang, 'pause.tab.general')}
                </button>
                <button
                  onClick={() => setSettingsTab('hud')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    settingsTab === 'hud'
                      ? 'bg-amber-600 text-stone-950'
                      : 'text-stone-300 hover:text-amber-300'
                  }`}
                >
                  {t(lang, 'pause.tab.hud')}
                </button>
              </div>
            </div>

            {settingsTab === 'general' ? (
              <div className="space-y-3.5 bg-stone-950/75 p-4 rounded-xl border border-amber-900/35 text-xs overflow-y-auto pr-1">
                {/* Language Switcher (Default: Russian) */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-800">
                  <span className="text-stone-200 font-medium">{t(lang, 'pause.language')}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => game.updateSettings({ language: 'ru' })}
                      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                        lang === 'ru'
                          ? 'bg-amber-600 text-stone-950'
                          : 'bg-stone-900 text-stone-300 border border-stone-700'
                      }`}
                    >
                      Русский
                    </button>
                    <button
                      onClick={() => game.updateSettings({ language: 'en' })}
                      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                        lang === 'en'
                          ? 'bg-amber-600 text-stone-950'
                          : 'bg-stone-900 text-stone-300 border border-stone-700'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* Control Mode & Detected Platform Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-800">
                  <div>
                    <div className="text-stone-200 font-medium">{t(lang, 'pause.controlMode')}</div>
                    <div className="text-[10px] text-amber-400/90 mt-0.5">
                      {activePlatform === 'mobile'
                        ? lang === 'en'
                          ? 'Active: Phone (Touch Controls)'
                          : 'Активно: Телефон (Сенсорное управление)'
                        : lang === 'en'
                        ? 'Active: PC (Keyboard & Mouse)'
                        : 'Активно: ПК (Клавиатура и Мышь)'}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(
                      [
                        { id: 'auto', label: t(lang, 'pause.controlMode.auto') },
                        { id: 'pc', label: t(lang, 'pause.controlMode.pc') },
                        { id: 'mobile', label: t(lang, 'pause.controlMode.mobile') },
                      ] as { id: ControlModeSetting; label: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => game.updateSettings({ controlMode: m.id })}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                          controlMode === m.id
                            ? 'bg-amber-600 text-stone-950'
                            : 'bg-stone-900 text-stone-300 border border-stone-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound & Music Toggle Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-2.5 border-b border-stone-800">
                  <div className="flex items-center justify-between bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-stone-300">{t(lang, 'pause.sfxEnabled')}</span>
                    <button
                      onClick={() =>
                        game.updateSettings({
                          audioEnabled: !settings.audioEnabled,
                        })
                      }
                      className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      {settings.audioEnabled ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> {t(lang, 'pause.on')}
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-red-400" /> {t(lang, 'pause.off')}
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-stone-300">{t(lang, 'pause.musicEnabled')}</span>
                    <button
                      onClick={() =>
                        game.updateSettings({
                          musicEnabled: !(settings.musicEnabled ?? true),
                        })
                      }
                      className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      {(settings.musicEnabled ?? true) ? (
                        <>
                          <Music className="w-3.5 h-3.5 text-amber-400" /> {t(lang, 'pause.on')}
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-red-400" /> {t(lang, 'pause.off')}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Volume Sliders: Master, SFX, Music */}
                <div className="space-y-2.5 pb-2.5 border-b border-stone-800">
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>{t(lang, 'pause.masterVolume')}</span>
                      <span className="font-mono-tabular text-amber-300">
                        {Math.round((settings.masterVolume ?? 0.6) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((settings.masterVolume ?? 0.6) * 100)}
                      onChange={(e) =>
                        game.updateSettings({
                          masterVolume: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-stone-300 mb-1">
                        <span>{t(lang, 'pause.sfxVolume')}</span>
                        <span className="font-mono-tabular text-amber-300">
                          {Math.round((settings.sfxVolume ?? 0.85) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round((settings.sfxVolume ?? 0.85) * 100)}
                        onChange={(e) =>
                          game.updateSettings({
                            sfxVolume: Number(e.target.value) / 100,
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-stone-300 mb-1">
                        <span>{t(lang, 'pause.musicVolume')}</span>
                        <span className="font-mono-tabular text-amber-300">
                          {Math.round((settings.musicVolume ?? 0.65) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round((settings.musicVolume ?? 0.65) * 100)}
                        onChange={(e) =>
                          game.updateSettings({
                            musicVolume: Number(e.target.value) / 100,
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Day/Night Cycle Preset Selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-800">
                  <span className="text-stone-300">
                    {lang === 'en' ? 'Time of Day & Lighting' : 'Время суток и освещение'} ({formatTime(timeOfDay)})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { h: 6.5, label: t(lang, 'hud.phase.dawn') },
                      { h: 13.0, label: t(lang, 'hud.phase.day') },
                      { h: 19.0, label: t(lang, 'hud.phase.dusk') },
                      { h: 0.5, label: t(lang, 'hud.phase.night') },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => game.setTimeOfDayPreset(preset.h)}
                        className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500 text-stone-200 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Graphics & Weather */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">{t(lang, 'pause.graphics')}</span>
                  <div className="flex gap-1">
                    {(['low', 'medium', 'high'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => game.updateSettings({ quality: q })}
                        className={`px-2.5 py-1 rounded cursor-pointer ${
                          settings.quality === q
                            ? 'bg-amber-600 text-stone-950 font-semibold'
                            : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {q === 'low'
                          ? t(lang, 'pause.quality.low')
                          : q === 'medium'
                          ? t(lang, 'pause.quality.medium')
                          : t(lang, 'pause.quality.high')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-300">{t(lang, 'pause.weather')}</span>
                  <div className="flex gap-1">
                    {(['clear', 'fog', 'rain'] as const).map((w) => (
                      <button
                        key={w}
                        onClick={() => game.setWeather(w)}
                        className={`px-2.5 py-1 rounded cursor-pointer ${
                          weather === w
                            ? 'bg-amber-600 text-stone-950 font-semibold'
                            : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {w === 'clear'
                          ? t(lang, 'hud.weather.clear')
                          : w === 'fog'
                          ? t(lang, 'hud.weather.fog')
                          : t(lang, 'hud.weather.rain')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* HUD Customization Tab */
              <div className="space-y-2.5 bg-stone-950/75 p-4 rounded-xl border border-amber-900/35 text-xs overflow-y-auto pr-1">
                <p className="text-stone-400 mb-2">
                  {t(lang, 'pause.hudHint')}
                </p>
                {(
                  [
                    { key: 'minimapRadar', label: t(lang, 'pause.hud.minimapRadar') },
                    { key: 'clockWeather', label: t(lang, 'pause.hud.clockWeather') },
                    { key: 'questTracker', label: t(lang, 'pause.hud.questTracker') },
                    { key: 'companionPanel', label: t(lang, 'pause.hud.companionPanel') },
                    { key: 'reputationBar', label: t(lang, 'pause.hud.reputationBar') },
                    { key: 'combatLog', label: t(lang, 'pause.hud.combatLog') },
                    { key: 'controlsDock', label: t(lang, 'pause.hud.controlsDock') },
                  ] as { key: keyof HudVisibilitySettings; label: string }[]
                ).map((item) => {
                  const enabled = hudVis[item.key];
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-stone-900/80 border border-stone-800 hover:border-amber-700/50 cursor-pointer"
                    >
                      <span className="text-stone-200 font-medium">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) =>
                          game.updateSettings({
                            hudVisibility: {
                              ...hudVis,
                              [item.key]: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => game.openModal('none')}
                className="sm:col-span-2 w-full py-2.5 rounded-xl medieval-button-primary font-semibold text-sm cursor-pointer"
              >
                {t(lang, 'pause.resume')}
              </button>
              <button
                onClick={() => {
                  game.saveGame();
                  game.openModal('none');
                }}
                className="w-full py-2 rounded-xl medieval-button text-xs cursor-pointer"
              >
                {t(lang, 'pause.save')}
              </button>
              {SaveSystem.hasSave() && (
                <button
                  onClick={() => game.loadGame()}
                  className="w-full py-2 rounded-xl medieval-button text-xs cursor-pointer"
                >
                  {t(lang, 'pause.load')}
                </button>
              )}
              <button
                onClick={onReturnToTitle}
                className="sm:col-span-2 w-full py-2 rounded-xl bg-stone-950 hover:bg-stone-900 border border-stone-800 text-stone-400 text-xs cursor-pointer"
              >
                {t(lang, 'pause.exitTitle')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12.5 CINEMATIC PROLOGUE OVERLAY (3D CAMERA FLYOVER + ANIMATED LORE CHAPTERS) */}
      {activeModal === 'prologue' && prologueSlides && prologueSlides.length > 0 && (
        <div
          data-testid="prologue-modal"
          className="fixed inset-0 z-40 pointer-events-auto flex flex-col justify-between p-6 md:p-14 bg-gradient-to-t from-stone-950/95 via-stone-950/45 to-stone-950/85"
        >
          {(() => {
            const slide =
              prologueSlides[prologueSlideIndex ?? 0] ?? prologueSlides[0];
            const idx = prologueSlideIndex ?? 0;
            const total = prologueSlides.length;
            return (
              <>
                <div className="flex items-center justify-between border-b border-amber-900/40 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rotate-45 bg-amber-500 shadow-[0_0_12px_#f59e0b]" />
                    <span className="text-xs font-display uppercase tracking-[0.25em] text-amber-400 font-bold">
                      {slide.chapter}
                    </span>
                  </div>
                  <button
                    data-testid="skip-prologue-btn"
                    onClick={() => game.skipPrologue()}
                    className="px-4 py-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-amber-600/60 text-amber-300 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                  >
                    Пропустить [Space]
                  </button>
                </div>

                <div
                  key={slide.id}
                  className="my-auto max-w-3xl mx-auto w-full bg-stone-950/90 border border-amber-800/60 rounded-2xl p-6 md:p-10 shadow-[0_0_70px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-500"
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-amber-500/90 font-semibold mb-2">
                    Хроники Старого Королевства · Глава {idx + 1} из {total}
                  </div>
                  <h2 className="text-2xl md:text-4xl font-display font-bold text-stone-100 mb-5 leading-tight">
                    {slide.title}
                  </h2>
                  <p className="text-sm md:text-base text-stone-200 leading-relaxed mb-6">
                    {slide.text}
                  </p>
                  <blockquote className="border-l-2 border-amber-500/80 pl-4 py-1 text-xs md:text-sm italic text-amber-200/90 mb-7">
                    {slide.subtext}
                  </blockquote>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-800/90">
                    <div className="flex items-center gap-2">
                      {prologueSlides.map((s, sIdx) => (
                        <span
                          key={s.id}
                          className={`h-2 rounded-full transition-all ${
                            sIdx === idx
                              ? 'w-8 bg-amber-500'
                              : sIdx < idx
                              ? 'w-2.5 bg-amber-700'
                              : 'w-2.5 bg-stone-700'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => game.skipPrologue()}
                        className="px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Пропустить [Space]
                      </button>
                      <button
                        data-testid="next-prologue-btn"
                        onClick={() => game.nextPrologueSlide()}
                        className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider shadow-lg transition-colors cursor-pointer"
                      >
                        {idx + 1 < total
                          ? 'Следующая глава [Enter]'
                          : 'Начать охоту в Вороньей Пади [Enter]'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>Камера облетает владения Вальдмарка в реальном времени</span>
                  <span>Клавиша [L] в игре открывает «Хроники Вальдмарка»</span>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* 12.6 OLD PARCHMENT LORE READER MODAL (СТАРЫЙ ПЕРГАМЕНТ ДЛЯ ЧТЕНИЯ ЗАПИСОК И КНИГ) */}
      {activeModal === 'lore_reader' && activeLoreNote && (
        <div
          data-testid="lore-reader-modal"
          className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-40"
        >
          <div className="w-full max-w-2xl bg-[#1c1611] border-2 border-amber-700/80 rounded-2xl p-1.5 shadow-[0_0_60px_rgba(0,0,0,0.95)]">
            <div className="bg-gradient-to-b from-[#292018] via-[#211a14] to-[#17120e] border border-amber-600/40 rounded-xl p-6 md:p-8 max-h-[86vh] flex flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-amber-800/50 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400 font-semibold mb-1">
                    <span>📜 Летопись Вальдмарка #{activeLoreNote.number}</span>
                    <span>·</span>
                    <span>{activeLoreNote.locationHint}</span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-amber-200">
                    {activeLoreNote.title}
                  </h2>
                  <div className="text-xs italic text-amber-400/80 mt-0.5">
                    {activeLoreNote.summary}
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/70 text-amber-300 text-xs font-mono-tabular font-bold shrink-0">
                  +25 XP · Кодекс {discoveredLoreIds.length}/{totalLoreNotes}
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 text-stone-200 text-sm md:text-base leading-relaxed font-serif">
                {activeLoreNote.content.split('\n\n').map((p: string, i: number) => (
                  <p
                    key={i}
                    className="first-letter:text-2xl first-letter:font-display first-letter:font-bold first-letter:text-amber-400 first-letter:mr-1"
                  >
                    {p}
                  </p>
                ))}
                {activeLoreNote.corvusComment && (
                  <blockquote className="mt-4 border-l-2 border-amber-500/70 pl-4 py-1 text-xs md:text-sm italic text-amber-300/90">
                    {activeLoreNote.corvusComment}
                  </blockquote>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-amber-900/50 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-amber-400/90">
                  {player.loreMasterUnlocked
                    ? '👑 Статус «Хранитель Памяти Вальдмарка» активен (+15% урона по боссам)'
                    : `Соберите все ${totalLoreNotes} записей для титула «Хранитель Памяти Вальдмарка» (${discoveredLoreIds.length}/${totalLoreNotes})`}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => game.openModal('codex')}
                    className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-amber-600/70 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Открыть Кодекс [L]
                  </button>
                  <button
                    onClick={() => game.openModal('none')}
                    className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Свернуть свиток [E]
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12.7 WORLD CODEX MODAL — «ХРОНИКИ ВАЛЬДМАРКА» (КЛАВИША [L]) */}
      {activeModal === 'codex' && (
        <div
          data-testid="codex-modal"
          className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-40"
        >
          <div className="w-full max-w-5xl bg-stone-950 border border-amber-700/70 rounded-xl p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xl md:text-2xl font-display font-bold text-amber-400">
                    Хроники Вальдмарка — Кодекс Мира [L]
                  </h2>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Канон Старого Королевства, Братство Пепла, персонажи, бестиарий и {totalLoreNotes} найденных летописей (+25 XP за каждую)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium ${
                    player.loreMasterUnlocked
                      ? 'bg-amber-950/90 border-amber-500 text-amber-300'
                      : 'bg-stone-900 border-stone-800 text-stone-300'
                  }`}
                >
                  {player.loreMasterUnlocked ? (
                    <span>
                      👑 Хранитель Памяти Вальдмарка ({totalLoreNotes}/{totalLoreNotes} · +15% к урону по боссам · Секретный финал открыт)
                    </span>
                  ) : (
                    <span>
                      📜 Собрано летописей:{' '}
                      <strong className="text-amber-400">
                        {discoveredLoreIds.length}/{totalLoreNotes}
                      </strong>{' '}
                      (соберите все {totalLoreNotes} для +15% к урону по боссам)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => game.openModal('none')}
                  className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs rounded-lg border border-stone-700 cursor-pointer"
                >
                  Закрыть [Esc]
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4 border-b border-stone-800/80 pb-3">
              {[
                { id: 'history', label: 'История Королевства' },
                { id: 'brotherhood', label: 'Братство Пепла' },
                { id: 'factions', label: 'Фракции и Персонажи' },
                { id: 'bestiary', label: 'Бестиарий Вальдмарка' },
                {
                  id: 'notes',
                  label: `Найденные записки и книги (${discoveredLoreIds.length}/${totalLoreNotes})`,
                },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() =>
                    setCodexTab(
                      t.id as
                        | 'history'
                        | 'brotherhood'
                        | 'factions'
                        | 'bestiary'
                        | 'notes'
                    )
                  }
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    codexTab === t.id
                      ? 'bg-amber-600 text-stone-950 shadow'
                      : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {codexTab === 'notes' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto pr-1">
                {(worldLoreNotes ?? []).map((note, idx) => {
                  const isFound = discoveredLoreIds.includes(note.id);
                  return (
                    <div
                      key={note.id}
                      className={`p-4 rounded-xl border transition-colors flex flex-col justify-between gap-3 ${
                        isFound
                          ? 'bg-stone-900/90 border-amber-700/70'
                          : 'bg-stone-900/40 border-stone-800/80 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-amber-400">
                            Летопись #{idx + 1} · {note.locationHint}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              isFound
                                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/60'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {isFound ? 'Найдено (+25 XP)' : 'Не найдено'}
                          </span>
                        </div>
                        <h3 className="text-sm font-display font-bold text-stone-100">
                          {note.title}
                        </h3>
                        <div className="text-xs text-stone-400 mb-2">
                          {note.summary}
                        </div>
                        {isFound ? (
                          <p className="text-xs text-stone-300 line-clamp-3 leading-relaxed">
                            {note.content}
                          </p>
                        ) : (
                          <p className="text-xs text-stone-500 italic">
                            Подсказка для поиска (Чутьё Зольника [V]): {note.locationHint}.
                          </p>
                        )}
                      </div>

                      {isFound && (
                        <button
                          onClick={() => game.openLoreNoteFromCodex(note.id)}
                          className="self-start px-3.5 py-1.5 rounded bg-amber-600/90 hover:bg-amber-500 text-stone-950 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Прочитать на пергаменте
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : codexTab === 'bestiary' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1">
                {(bestiary ?? []).map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-display font-bold text-amber-400">
                        {b.name}
                      </h3>
                      <span className="text-[11px] text-stone-400">
                        {b.title}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {b.lore}
                    </p>
                    <div className="pt-2 border-t border-stone-800 text-[11px] text-amber-300">
                      Слабость: {b.weaknessSigns.join(', ')} · {b.weaknessOil}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto pr-1">
                <div className="space-y-2">
                  {(codexArticles ?? [])
                    .filter((a) => a.category === codexTab)
                    .map((art) => {
                      const isSel = selectedCodexId === art.id;
                      return (
                        <button
                          key={art.id}
                          onClick={() => setSelectedCodexId(art.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                              : 'bg-stone-900 hover:bg-stone-800/80 border-stone-800 text-stone-200'
                          }`}
                        >
                          <div className="text-xs font-display font-bold">
                            {art.title}
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            {art.subtitle}
                          </div>
                        </button>
                      );
                    })}
                </div>

                <div className="md:col-span-2 bg-stone-900/90 border border-stone-800 rounded-xl p-5 space-y-4">
                  {(() => {
                    const articlesInTab = (codexArticles ?? []).filter(
                      (a) => a.category === codexTab
                    );
                    const current =
                      articlesInTab.find((a) => a.id === selectedCodexId) ??
                      articlesInTab[0];
                    if (!current) return null;
                    return (
                      <>
                        <div className="border-b border-stone-800 pb-3">
                          <div className="text-xs uppercase tracking-widest text-amber-500 font-semibold">
                            {current.subtitle}
                          </div>
                          <h3 className="text-xl font-display font-bold text-stone-100 mt-1">
                            {current.title}
                          </h3>
                        </div>
                        <div className="space-y-3 text-sm text-stone-200 leading-relaxed">
                          {current.content.split('\n\n').map((para: string, pIdx: number) => (
                            <p key={pIdx}>{para}</p>
                          ))}
                          {current.quote && (
                            <blockquote className="mt-4 border-l-2 border-amber-500/80 pl-4 py-1 text-xs italic text-amber-300/90">
                              {current.quote}
                            </blockquote>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 13. DEATH SCREEN */}
      {activeModal === 'death' && (
        <div className="fixed inset-0 bg-black/85 pointer-events-auto flex items-center justify-center p-4 z-40">
          <div className="max-w-md w-full bg-stone-950 border border-red-900/80 rounded-xl p-8 text-center shadow-2xl space-y-5">
            <Skull className="w-12 h-12 text-red-600 mx-auto" />
            <h2 className="text-2xl font-display font-bold text-red-500">
              ВЫ ПАЛИ В БОЮ
            </h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              Тьма Старого Королевства Вальдмарк поглотила ещё одного Зольника. Но ваша
              легенда ещё не окончена.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => game.respawnPlayer()}
                className="w-full py-3 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Возродиться в Вороньей Пади
              </button>
              {SaveSystem.hasSave() && (
                <button
                  onClick={() => game.loadGame()}
                  className="w-full py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-sm"
                >
                  Загрузить сохранение
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 14. STORY EPILOGUE & VICTORY MODAL */}
      {activeModal === 'victory' && (
        <div className="fixed inset-0 bg-black/85 pointer-events-auto flex items-center justify-center p-4 z-40">
          <div className="max-w-xl w-full bg-stone-950 border-2 border-amber-500 rounded-xl p-8 text-center shadow-2xl space-y-5">
            <Sparkles className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-2xl font-display font-bold text-amber-400">
              {player.secretEndingUnlocked
                ? 'ИСТИННЫЙ ФИНАЛ: ИСКУПЛЕНИЕ СЕРДЦА ПУСТОТЫ'
                : 'ХРОНИКИ ВАЛЬДМАРКА: ЭПИЛОГ'}
            </h2>
            <p className="text-sm text-stone-200 leading-relaxed">
              {player.secretEndingUnlocked
                ? 'Собрав 12 летописей Вальдмарка и прочитав «Завещание короля Малакора», Корвус не стал рубить бессмертную оболочку монарха. Пролив собственную Тлеющую Кровь Зольника в алтарь Короны Малакора, он запечатал разлом Сердца Пустоты изнутри, очистил леса от Чёрной Росы и даровал душе последнего короля долгожданный покой.'
                : 'Король-Лич Малакор Бессмертный и Древний Хранитель повержены. Ночь Пепельного Затмения отступила от границ Вороньей Пади, а имя Зольника Корвуса вошло в легенды Старого Королевства.'}
            </p>
            <div className="text-left bg-stone-900/90 border border-stone-800 rounded-lg p-4 space-y-2 text-xs text-stone-300">
              <div>
                <span className="text-amber-400 font-semibold">Судьба Вальдмарка: </span>
                {player.secretEndingUnlocked
                  ? 'Истинный финал «Хранителя Памяти Вальдмарка» — Ритуал Тлеющей Крови исцелил Сердце Пустоты без новой крови.'
                  : player.factionChoice === 'order'
                  ? 'Союз с Орденом Алого Пламени — Инквизиция выжгла скверну и установила железный порядок в долине.'
                  : player.factionChoice === 'village'
                  ? 'Защита старейшин Вороньей Пади — древние святилища и свобода жителей долины сохранены.'
                  : 'Путь нейтрального Зольника — вы сохранили верность только кодексу Братства Пепла.'}
              </div>
              <div>
                <span className="text-amber-400 font-semibold">Собрано летописей Кодекса [L]: </span>
                {discoveredLoreIds.length} / {totalLoreNotes}{' '}
                {player.loreMasterUnlocked ? '(Титул «Хранитель Памяти Вальдмарка» открыт)' : ''}
              </div>
              <div>
                <span className="text-amber-400 font-semibold">Выполнено контрактов на чудовищ: </span>
                {contracts.filter((c) => c.status === 'completed').length} / {contracts.length}
              </div>
              <div>
                <span className="text-amber-400 font-semibold">Уровень Мастера: </span>
                Уровень {player.level} · Золото: {player.gold} крон
              </div>
            </div>
            <button
              onClick={() => game.openModal('none')}
              className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm cursor-pointer"
            >
              Продолжить свободное исследование мира
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
