import React, { useState } from 'react';
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
  Pause,
  RotateCcw,
  Save,
  ScrollText,
  Shield,
  ShoppingBag,
  Skull,
  Snowflake,
  Sparkles,
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
  ALCHEMY_RECIPES,
  computeEffectivePlayerStats,
  getUpgradeCost,
  MAGIC_SIGNS,
} from '../game/rules';
import { SaveSystem } from '../game/SaveSystem';
import type { HUDState, SignType } from '../game/types';

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

  const equippedTrophy = inventory.find((i) => i.category === 'trophy' && i.equipped);
  const availableRunes = inventory.filter((i) => i.category === 'rune' && i.quantity > 0);

  const getSetDisplayName = (setId?: string | null) => {
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

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 md:p-6">
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
        className={`flex items-start justify-between gap-4 w-full transition-opacity ${
          activeModal === 'prologue' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Top-Left: Medallion & Vital Bars */}
        <div className="pointer-events-auto bg-stone-950/90 border border-stone-800 rounded-lg p-3.5 w-72 sm:w-80 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded bg-stone-900 border border-amber-700/60 flex items-center justify-center text-amber-500 font-display font-bold text-sm">
                УР.{player.level}
              </div>
              <div>
                <div className="text-xs font-display font-bold tracking-wider text-stone-200">
                  КОРВУС · БРАТСТВО ПЕПЛА
                </div>
                <div className="text-[11px] text-stone-400 font-mono-tabular">
                  Опыт: {player.xp}/{player.xpToNext} · Золото: {player.gold}
                </div>
              </div>
            </div>
            {player.skillPoints > 0 && (
              <button
                onClick={() => {
                  setInvTab('skills');
                  game.openModal('inventory');
                }}
                className="px-2 py-0.5 text-[11px] font-medium bg-amber-700/30 border border-amber-500/50 text-amber-300 rounded hover:bg-amber-700/50 transition-colors whitespace-nowrap"
              >
                +{player.skillPoints} Навык
              </button>
            )}
          </div>

          {/* Health Bar */}
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-[11px] text-stone-300 mb-0.5 font-mono-tabular">
                <span className="flex items-center gap-1 text-red-400 font-medium">
                  <Heart className="w-3 h-3" /> Здоровье
                </span>
                <span>
                  {Math.ceil(player.hp)} / {effStats.maxHp}
                  {player.barrierShield > 0 && (
                    <span className="text-amber-400 ml-1">
                      (+{player.barrierShield} Щит)
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-900 rounded overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-red-600 transition-all duration-150"
                  style={{
                    width: `${Math.max(0, Math.min(100, (player.hp / effStats.maxHp) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Stamina Bar */}
            <div>
              <div className="flex justify-between text-[11px] text-stone-300 mb-0.5 font-mono-tabular">
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <Zap className="w-3 h-3" /> Выносливость
                </span>
                <span>
                  {Math.floor(player.stamina)} / {player.maxStamina}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-amber-500 transition-all duration-100"
                  style={{
                    width: `${Math.max(0, Math.min(100, (player.stamina / player.maxStamina) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Toxicity Bar */}
            <div>
              <div className="flex justify-between text-[10px] text-stone-400 mb-0.5 font-mono-tabular">
                <span className="flex items-center gap-1 text-lime-400 font-medium">
                  <FlaskConical className="w-3 h-3" /> Токсичность
                </span>
                <span>
                  {Math.floor(player.toxicity || 0)} / {player.maxToxicity || 100}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stone-900 rounded overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-lime-500 transition-all duration-150"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((player.toxicity || 0) / (player.maxToxicity || 100)) * 100))}%`,
                  }}
                />
              </div>
            </div>
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

          {/* Active Sign & Quick Potion Row */}
          <div className="mt-2.5 pt-2.5 border-t border-stone-800/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => game.triggerMagicSign()}
                className="flex items-center gap-2 text-left group flex-1 min-w-0"
                title={`${currentSignInfo.description} (Клавиша [Q] / [1-5] — смена, [R] — каст)`}
              >
                <div
                  className="w-8 h-8 rounded-lg bg-stone-900 border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{ borderColor: currentSignInfo.color }}
                >
                  {renderSignIcon(player.activeSign, 'w-4 h-4', currentSignInfo.color)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-stone-100 truncate">
                      {currentSignInfo.name}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono-tabular flex items-center gap-2">
                    <span className="text-amber-400/90">
                      -{currentSignInfo.staminaCost} Вын.
                    </span>
                    {signCooldowns[player.activeSign] > 0 ? (
                      <span className="text-red-400 font-semibold">
                        КД: {signCooldowns[player.activeSign].toFixed(1)}с
                      </span>
                    ) : (
                      <span className="text-emerald-400">[R] Готов</span>
                    )}
                  </div>
                </div>
              </button>

              <button
                onClick={() => game.useQuickPotion()}
                className="px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-emerald-400 hover:border-emerald-500/60 transition-colors font-mono-tabular text-[11px] whitespace-nowrap shrink-0"
              >
                [F] Зелье ({potionCount})
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
                        💎 Кристаллы: {bossEnemy.crystalsRemaining}/3 (Импульс [3])
                      </span>
                    )}
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
            <div className="w-72 bg-stone-950/90 border border-stone-800 rounded-lg px-3.5 py-2 shadow-lg">
              <div className="flex justify-between items-center text-xs text-stone-200 mb-1">
                <span className="font-medium truncate">
                  {lockedEnemy.name} (Ур.{lockedEnemy.level})
                </span>
                <span className="font-mono-tabular text-red-400">
                  {Math.ceil(lockedEnemy.hp)}/{lockedEnemy.maxHp}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-900 rounded overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-150"
                  style={{
                    width: `${Math.max(0, Math.min(100, (lockedEnemy.hp / lockedEnemy.maxHp) * 100))}%`,
                  }}
                />
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

        {/* Top-Right: Region Info & Active Quest Tracker */}
        <div className="pointer-events-auto hidden sm:flex flex-col items-end gap-2 w-72">
          <div className="bg-stone-950/90 border border-stone-800 rounded-lg px-3.5 py-2 text-right w-full">
            <div className="text-xs font-display font-bold text-amber-400">
              {currentBiomeName}
            </div>
            <div className="flex items-center justify-end gap-2 text-[11px] text-stone-400 font-mono-tabular mt-1">
              <span>Время: {formatTime(timeOfDay)}</span>
              <span>·</span>
              <button
                onClick={() => game.cycleWeather()}
                title="Переключить погоду (Ясно / Туман / Дождь) [Клавиша T]"
                className="px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/60 text-stone-200 transition-colors flex items-center gap-1"
              >
                <span>
                  {weather === 'clear'
                    ? '☀️ Ясно'
                    : weather === 'fog'
                    ? '🌫️ Туман'
                    : '🌧️ Дождь'}
                </span>
                <span className="text-[10px] text-amber-400/90">[T]</span>
              </button>
            </div>
          </div>

          {activeQuest && (
            <div
              onClick={() => game.openModal('quests')}
              className="bg-stone-950/90 border border-stone-800 hover:border-amber-700/60 cursor-pointer rounded-lg p-3 w-full transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-display font-bold text-amber-500 mb-1">
                <span>{activeQuest.title}</span>
                {distToQuest !== null && (
                  <span className="font-mono-tabular text-stone-300">
                    {distToQuest} м
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-300 leading-snug">
                {currentStage
                  ? currentStage.description
                  : 'Задание завершено'}
              </div>
              <div className="mt-2 pt-1.5 border-t border-stone-800/80 flex justify-between items-center text-[11px] text-stone-400">
                <span>[J] Журнал заданий</span>
                <span className="text-amber-400/90">[M] Карта и переход</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER-BOTTOM INTERACTION PROMPT & COMBAT LOG */}
      <div className="flex flex-col items-center gap-3 w-full">
        {nearbyInteractable && activeModal === 'none' && (
          <button
            onClick={() => game.triggerInteract()}
            className="pointer-events-auto flex items-center gap-2.5 bg-stone-950/95 border border-amber-500/80 text-stone-100 px-5 py-2.5 rounded-lg shadow-2xl hover:bg-stone-900 transition-colors"
          >
            <span className="px-2 py-0.5 bg-amber-600 text-stone-950 font-mono-tabular font-bold text-xs rounded">
              E
            </span>
            <div className="text-left">
              <div className="text-xs font-semibold text-amber-300">
                {nearbyInteractable.name}
              </div>
              <div className="text-xs text-stone-300">
                {nearbyInteractable.promptText}
              </div>
            </div>
          </button>
        )}

        {/* Subtle Combat Log */}
        {combatLog.length > 0 && activeModal === 'none' && (
          <div className="w-full max-w-md flex flex-col items-center gap-0.5 pointer-events-none">
            {combatLog.slice(0, 3).map((entry) => (
              <div
                key={entry.id}
                className={`text-xs px-2.5 py-0.5 rounded bg-stone-950/80 ${
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

        {/* MOBILE TOUCH CONTROLS (Shown on touch/small screens) */}
        <div className="flex md:hidden items-center justify-between w-full px-2 pointer-events-auto">
          <div className="grid grid-cols-3 gap-1 w-28 h-28 bg-stone-950/85 border border-stone-800 rounded-xl p-1.5">
            <div />
            <button
              onTouchStart={() => (game.player.joystickY = -1)}
              onTouchEnd={() => (game.player.joystickY = 0)}
              className="bg-stone-800 rounded text-xs font-bold text-stone-200 flex items-center justify-center"
            >
              W
            </button>
            <div />
            <button
              onTouchStart={() => (game.player.joystickX = -1)}
              onTouchEnd={() => (game.player.joystickX = 0)}
              className="bg-stone-800 rounded text-xs font-bold text-stone-200 flex items-center justify-center"
            >
              A
            </button>
            <button
              onTouchStart={() => (game.player.joystickY = 1)}
              onTouchEnd={() => (game.player.joystickY = 0)}
              className="bg-stone-800 rounded text-xs font-bold text-stone-200 flex items-center justify-center"
            >
              S
            </button>
            <button
              onTouchStart={() => (game.player.joystickX = 1)}
              onTouchEnd={() => (game.player.joystickX = 0)}
              className="bg-stone-800 rounded text-xs font-bold text-stone-200 flex items-center justify-center"
            >
              D
            </button>
          </div>

          <div className="flex flex-wrap gap-2 justify-end max-w-[210px]">
            <button
              onClick={() => game.performSwordAttack(false)}
              className="px-3.5 py-2.5 bg-red-900/90 border border-red-600 rounded-lg text-xs font-semibold text-white"
            >
              Удар
            </button>
            <button
              onClick={() => game.performSwordAttack(true)}
              className="px-3 py-2.5 bg-amber-900/90 border border-amber-600 rounded-lg text-xs font-semibold text-white"
            >
              Тяж.
            </button>
            <button
              onClick={() => game.triggerDodge()}
              className="px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-xs text-stone-200"
            >
              Рывок
            </button>
            <button
              onClick={() => game.triggerMagicSign()}
              className="px-3 py-2 bg-purple-900/90 border border-purple-500 rounded-lg text-xs text-purple-100"
            >
              Знак
            </button>
          </div>
        </div>

        {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK */}
        <div
          className={`pointer-events-auto flex flex-col items-center w-full max-w-4xl transition-opacity ${
            activeModal === 'prologue' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <button
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 bg-stone-950/90 border border-b-0 border-stone-800 rounded-t-lg text-[11px] text-stone-400 hover:text-stone-200 transition-colors"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Показать панель управления
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Скрыть панель
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="w-full bg-stone-950/95 border border-stone-800 rounded-xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
              {/* 5 Magic Signs Selector */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-stone-400 mr-1 hidden sm:inline">
                  Знаки [Q / 1-5 / R]:
                </span>
                {SIGN_LIST.map((signId, idx) => {
                  const s = MAGIC_SIGNS[signId];
                  const isSelected = player.activeSign === signId;
                  const cd = signCooldowns[signId];
                  return (
                    <button
                      key={signId}
                      onClick={() => {
                        game.player.selectSign(signId);
                        game.triggerMagicSign();
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                        isSelected
                          ? 'bg-stone-800 text-amber-300 border border-amber-600/80 shadow'
                          : 'bg-stone-900/80 text-stone-400 border border-stone-800 hover:text-stone-200'
                      }`}
                      title={`${s.name}: ${s.description} (${s.staminaCost} Вын., КД ${s.cooldown}с)`}
                    >
                      <span className="text-[10px] font-mono-tabular text-stone-500">
                        {idx + 1}
                      </span>
                      {renderSignIcon(signId, 'w-3.5 h-3.5 shrink-0', s.color)}
                      <span>{s.name.split(' (')[0]}</span>
                      {cd > 0 && (
                        <span className="text-[10px] font-mono-tabular text-red-400 font-semibold">
                          {cd.toFixed(1)}с
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
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeModal === 'inventory'
                      ? 'bg-amber-600 text-stone-950'
                      : 'bg-stone-900 text-stone-200 border border-stone-800 hover:border-stone-600'
                  }`}
                >
                  <Backpack className="w-3.5 h-3.5" /> Инвентарь [I]
                </button>
                <button
                  onClick={() => game.openModal('quests')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeModal === 'quests'
                      ? 'bg-amber-600 text-stone-950'
                      : 'bg-stone-900 text-stone-200 border border-stone-800 hover:border-stone-600'
                  }`}
                >
                  <ScrollText className="w-3.5 h-3.5" /> Задания [J]
                </button>
                <button
                  onClick={() => game.openModal('map')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeModal === 'map'
                      ? 'bg-amber-600 text-stone-950'
                      : 'bg-stone-900 text-stone-200 border border-stone-800 hover:border-stone-600'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" /> Карта [M]
                </button>
                <button
                  onClick={() => game.openModal('notice_board')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeModal === 'notice_board'
                      ? 'bg-amber-600 text-stone-950'
                      : 'bg-stone-900 text-amber-300 border border-amber-800/60 hover:border-amber-500'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" /> Контракты
                </button>
                <button
                  onClick={() => game.openModal('alchemy')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeModal === 'alchemy'
                      ? 'bg-amber-600 text-stone-950'
                      : 'bg-stone-900 text-lime-300 border border-lime-800/60 hover:border-lime-500'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" /> Алхимия
                </button>
                <button
                  onClick={() => game.openModal('codex')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeModal === 'codex'
                      ? 'bg-amber-600 text-stone-950'
                      : 'bg-stone-900 text-amber-300 border border-amber-700/70 hover:border-amber-400'
                  }`}
                  title="Хроники Вальдмарка и найденные записки [Клавиша L]"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Кодекс [L] ({discoveredLoreIds.length}/{totalLoreNotes})
                </button>
                <button
                  onClick={() => game.openModal('bestiary')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeModal === 'bestiary'
                      ? 'bg-amber-600 text-stone-950'
                      : 'bg-stone-900 text-stone-200 border border-stone-800 hover:border-stone-600'
                  }`}
                >
                  <Skull className="w-3.5 h-3.5" /> Бестиарий [B]
                </button>
                <button
                  onClick={() => game.saveGame()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-900 text-stone-200 border border-stone-800 hover:border-amber-600/60 flex items-center gap-1 transition-colors whitespace-nowrap"
                  title="Сохранить игру"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" /> Сохр.
                </button>
                <button
                  onClick={() => game.openModal('pause')}
                  aria-label="Меню паузы и настроек"
                  className="p-1.5 rounded-lg bg-stone-900 text-stone-200 border border-stone-800 hover:border-stone-600 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL WINDOWS */}
      {/* ===================================================================== */}

      {/* 1. DIALOGUE MODAL */}
      {activeModal === 'dialogue' && activeDialogueNode && (
        <div className="fixed inset-0 bg-black/70 pointer-events-auto flex items-end justify-center p-4 md:p-10 z-30">
          <div className="w-full max-w-2xl bg-stone-950 border border-amber-700/60 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-display font-bold text-amber-400">
                  {activeDialogueNode.speaker}
                </h2>
                <div className="text-xs text-stone-400">
                  {activeDialogueNode.role}
                </div>
              </div>
            </div>
            <p className="text-stone-200 text-sm md:text-base leading-relaxed mb-6">
              «{activeDialogueNode.text}»
            </p>
            <div className="flex flex-col gap-2">
              {activeDialogueNode.options.map((opt, idx) => (
                <button
                  key={opt.id}
                  onClick={() => game.selectDialogueOption(opt)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/60 text-sm text-stone-100 transition-colors flex items-center gap-3"
                >
                  <span className="text-amber-500 font-mono-tabular font-bold">
                    {idx + 1}.
                  </span>
                  <span>{opt.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. INVENTORY, RUNES, TROPHIES & SKILL TREE MODAL */}
      {activeModal === 'inventory' && (
        <div className="fixed inset-0 bg-black/75 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-4xl bg-stone-950 border border-stone-800 rounded-xl p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h2 className="text-xl font-display font-bold text-amber-400">
                  Снаряжение, Трофеи и Навыки
                </h2>
                <div className="flex bg-stone-900 p-1 rounded-lg border border-stone-800">
                  <button
                    onClick={() => setInvTab('items')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      invTab === 'items'
                        ? 'bg-amber-600 text-stone-950 font-semibold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Инвентарь ({inventory.length})
                  </button>
                  <button
                    onClick={() => setInvTab('skills')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      invTab === 'skills'
                        ? 'bg-amber-600 text-stone-950 font-semibold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Древо навыков (Очков: {player.skillPoints})
                  </button>
                </div>
              </div>
              <button
                onClick={() => game.openModal('none')}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs rounded-lg border border-stone-700"
              >
                Закрыть [Esc]
              </button>
            </div>

            {/* Stats Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4 bg-stone-900/70 border border-stone-800/90 rounded-lg p-3 text-xs">
              <div>
                <div className="text-stone-400">Стальной урон</div>
                <div className="text-base font-mono-tabular font-bold text-stone-100">
                  {effStats.steelAttack}
                </div>
              </div>
              <div>
                <div className="text-stone-400">Серебряный урон</div>
                <div className="text-base font-mono-tabular font-bold text-sky-400">
                  {effStats.silverAttack}
                </div>
              </div>
              <div>
                <div className="text-stone-400">Защита брони</div>
                <div className="text-base font-mono-tabular font-bold text-amber-400">
                  {effStats.defense}
                </div>
              </div>
              <div>
                <div className="text-stone-400">Шанс крита</div>
                <div className="text-base font-mono-tabular font-bold text-red-400">
                  {Math.round(effStats.critChance * 100)}%
                </div>
              </div>
              <div>
                <div className="text-stone-400">Сила Знаков</div>
                <div className="text-base font-mono-tabular font-bold text-purple-400">
                  {effStats.signIntensity}%
                </div>
              </div>
              <div>
                <div className="text-stone-400">Золотые кроны</div>
                <div className="text-base font-mono-tabular font-bold text-yellow-400">
                  {player.gold}
                </div>
              </div>
            </div>

            {invTab === 'items' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 ${
                      item.equipped
                        ? 'bg-stone-900 border-amber-600/60'
                        : 'bg-stone-900/50 border-stone-800'
                    }`}
                  >
                    <div>
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
                            Школа{' '}
                            {item.setId === 'raven'
                              ? 'Ворона'
                              : item.setId === 'bear'
                              ? 'Медведя'
                              : 'Пламени'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mt-1">
                        {item.description}
                      </p>
                      {(item.category === 'weapon' || item.category === 'armor') && (
                        <div className="text-[11px] text-purple-300 mt-1 font-mono-tabular">
                          Ячейка руны:{' '}
                          {item.socketedRuneId ? item.socketedRuneId : 'Свободно'}
                        </div>
                      )}
                      <div className="text-[11px] text-amber-400/90 mt-1.5">
                        Ценность: {item.value} зол.
                        {item.equipped ? ' · Экипировано' : ''}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      {(item.category === 'weapon' ||
                        item.category === 'armor' ||
                        item.category === 'trophy') && (
                        <button
                          onClick={() => game.useInventoryItem(item.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700"
                        >
                          {item.equipped ? 'Снять' : 'Надеть'}
                        </button>
                      )}
                      {item.category === 'blueprint' && (
                        <button
                          onClick={() => game.craftSchoolBlueprint(item.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded bg-amber-900/70 hover:bg-amber-800 text-amber-200 border border-amber-700"
                        >
                          Выковать
                        </button>
                      )}
                      {item.category === 'potion' && item.quantity > 0 && (
                        <button
                          onClick={() => game.useInventoryItem(item.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 border border-emerald-700"
                        >
                          Выпить
                        </button>
                      )}
                      {/* Socket Rune button if item is weapon/armor without a rune and player has a rune */}
                      {(item.category === 'weapon' || item.category === 'armor') &&
                        !item.socketedRuneId &&
                        availableRunes.length > 0 && (
                          <button
                            onClick={() =>
                              game.socketRune(availableRunes[0].id, item.id)
                            }
                            className="px-2.5 py-1 text-[11px] font-medium rounded bg-purple-900/70 hover:bg-purple-800 text-purple-200 border border-purple-600"
                            title={`Инкрустировать ${availableRunes[0].name}`}
                          >
                            + Руна
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1">
                {skills.map((sk) => (
                  <div
                    key={sk.id}
                    className="p-4 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-semibold text-amber-400">
                        {sk.name} (Ур. {sk.level}/{sk.maxLevel})
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
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 transition-colors shrink-0"
                    >
                      {sk.level >= sk.maxLevel ? 'Макс.' : 'Изучить (1 очко)'}
                    </button>
                  </div>
                ))}
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

            <div className="space-y-4 overflow-y-auto pr-1">
              {allQuests.map((q) => {
                const isTracked = activeQuest?.id === q.id;
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border ${
                      isTracked
                        ? 'bg-stone-900 border-amber-600/70'
                        : 'bg-stone-900/50 border-stone-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="text-base font-display font-bold text-stone-100">
                          {q.title}
                        </span>
                        <span className="text-xs text-stone-400 ml-2">
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
                            : 'На доске объявлений'}
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
              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-stone-300 mb-1">
                  Путевые указатели:
                </div>
                {[
                  {
                    name: 'Деревня Воронья Падь',
                    sub: 'Доска заказов, Кузнец, Трактир',
                    x: 0,
                    z: 4,
                  },
                  {
                    name: 'Старый лес (Логово Волколака)',
                    sub: 'Зона охоты и Место Силы',
                    x: -36,
                    z: -2,
                  },
                  {
                    name: 'Заброшенный хутор (Колодец)',
                    sub: 'Контракт «Невеста у колодца»',
                    x: -18,
                    z: -32,
                  },
                  {
                    name: 'Проклятое святилище и Катакомбы',
                    sub: 'Ведьма Морана и Вход в Склеп Королей',
                    x: -54,
                    z: -45,
                  },
                  {
                    name: 'Врата Разрушенной крепости',
                    sub: 'Горгулья, Демон и Древний Хранитель',
                    x: 48,
                    z: -44,
                  },
                  {
                    name: 'Акт II: Лагерь Ордена и Кладбище',
                    sub: 'Инквизитор Лазарь и Король-Лич Малакор',
                    x: 24,
                    z: 32,
                  },
                ].map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => game.fastTravelTo(loc.x, loc.z, loc.name)}
                    className="text-left p-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/60 transition-colors"
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
          <div className="w-full max-w-4xl bg-stone-950 border border-stone-800 rounded-xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-amber-400">
                  Лавка купца Велеслава
                </h2>
                <div className="text-xs text-stone-300 font-mono-tabular">
                  Ваше золото: {player.gold} крон
                </div>
              </div>
              <button
                onClick={() => game.openModal('none')}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs rounded-lg border border-stone-700"
              >
                Закрыть
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1">
              {/* Buy Column */}
              <div>
                <h3 className="text-sm font-semibold text-amber-300 mb-2.5">
                  Товары торговца (Купить)
                </h3>
                <div className="space-y-2.5">
                  {game.inventorySystem.shopCatalog.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold text-stone-100">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {item.description}
                        </div>
                      </div>
                      <button
                        disabled={player.gold < item.value}
                        onClick={() => {
                          game.inventorySystem.buyShopItem(
                            item.id,
                            game.player.stats
                          );
                          game.syncHUD();
                        }}
                        className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold text-xs whitespace-nowrap"
                      >
                        Купить ({item.value} зол.)
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sell Column */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-300 mb-2.5">
                  Ваш инвентарь (Продать трофеи и ресурсы)
                </h3>
                <div className="space-y-2.5">
                  {inventory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-stone-900/60 border border-stone-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold text-stone-100">
                          {item.name} (x{item.quantity})
                        </div>
                        <div className="text-[11px] text-stone-400">
                          Цена скупки: {Math.max(5, Math.round(item.value * 0.6))} зол.
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
                        className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs whitespace-nowrap"
                      >
                        Продать
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. BLACKSMITH FORGE & SCHOOL BLUEPRINTS MODAL */}
      {activeModal === 'blacksmith' && (
        <div className="fixed inset-0 bg-black/75 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-3xl bg-stone-950 border border-stone-800 rounded-xl p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-amber-400">
                  Кузница Мастера Грома: Заточка и Доспехи Школ
                </h2>
                <div className="text-xs text-stone-300 font-mono-tabular mt-0.5">
                  Золото: {player.gold} · Железная руда: {oreCount} шт.
                </div>
              </div>
              <button
                onClick={() => game.openModal('none')}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs rounded-lg border border-stone-700"
              >
                Закрыть
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
                  .map((item) => {
                    const cost = getUpgradeCost(item);
                    const canAfford =
                      player.gold >= cost.gold && oreCount >= cost.oreCount;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-semibold text-stone-100">
                            {item.name} (Ур. +{item.upgradeLevel ?? 0})
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            Цена: {cost.gold} зол. и {cost.oreCount} руды
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
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold text-xs flex items-center gap-1 shrink-0"
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
                  .map((bp) => {
                    return (
                      <div
                        key={bp.id}
                        className="p-3.5 rounded-lg bg-stone-900/80 border border-stone-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-semibold text-amber-200">
                            {bp.name}
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            {bp.description}
                          </div>
                        </div>
                        <button
                          onClick={() => game.craftSchoolBlueprint(bp.id)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-stone-950 font-semibold text-xs whitespace-nowrap shrink-0"
                        >
                          Выковать
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
                    className="p-3.5 rounded-lg bg-stone-900/80 border border-stone-800 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-semibold text-stone-100">
                        {rec.name}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        {rec.description}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] font-mono-tabular">
                        {ingStatus.map((s) => (
                          <span
                            key={s.itemId}
                            className={s.ok ? 'text-emerald-400' : 'text-red-400'}
                          >
                            {s.name}: {s.have}/{s.count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      disabled={!canBrew}
                      onClick={() => game.brewAlchemyRecipe(rec.id)}
                      className="px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold text-xs shrink-0"
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

      {/* 12. PAUSE & SETTINGS MODAL */}
      {activeModal === 'pause' && (
        <div className="fixed inset-0 bg-black/80 pointer-events-auto flex items-center justify-center p-4 z-30">
          <div className="w-full max-w-md bg-stone-950 border border-stone-800 rounded-xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-display font-bold text-amber-400 text-center">
              Пауза и Настройки
            </h2>

            <div className="space-y-3 bg-stone-900/70 p-4 rounded-lg border border-stone-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-300">Качество графики</span>
                <div className="flex gap-1">
                  {(['low', 'medium', 'high'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => game.updateSettings({ quality: q })}
                      className={`px-2.5 py-1 rounded ${
                        settings.quality === q
                          ? 'bg-amber-600 text-stone-950 font-semibold'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {q === 'low' ? 'Низк.' : q === 'medium' ? 'Сред.' : 'Выс.'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-300">Погода в регионе</span>
                <div className="flex gap-1">
                  {(['clear', 'fog', 'rain'] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => game.setWeather(w)}
                      className={`px-2.5 py-1 rounded ${
                        weather === w
                          ? 'bg-amber-600 text-stone-950 font-semibold'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {w === 'clear' ? 'Ясно' : w === 'fog' ? 'Туман' : 'Дождь'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-300">Звуковое сопровождение</span>
                <button
                  onClick={() =>
                    game.updateSettings({
                      audioEnabled: !settings.audioEnabled,
                    })
                  }
                  className="px-3 py-1 rounded bg-stone-800 text-stone-200 flex items-center gap-1.5"
                >
                  {settings.audioEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Вкл.
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-red-400" /> Выкл.
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => game.openModal('none')}
                className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm"
              >
                Продолжить игру
              </button>
              <button
                onClick={() => {
                  game.saveGame();
                  game.openModal('none');
                }}
                className="w-full py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-sm"
              >
                Сохранить прогресс
              </button>
              {SaveSystem.hasSave() && (
                <button
                  onClick={() => game.loadGame()}
                  className="w-full py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-sm"
                >
                  Загрузить последнее сохранение
                </button>
              )}
              <button
                onClick={onReturnToTitle}
                className="w-full py-2 rounded-lg bg-stone-950 hover:bg-stone-900 text-stone-400 text-xs"
              >
                Выйти в главное меню
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
