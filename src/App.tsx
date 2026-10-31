import React, { useEffect, useRef, useState } from 'react';
import { Monitor, Music, Sliders, Smartphone, Volume2, VolumeX, X } from 'lucide-react';
import { UIManager } from './components/UIManager';
import { Game } from './game/Game';
import { t } from './game/i18n';
import {
  getBrowserDeviceSnapshot,
  getPlatformControlSummary,
  resolveControlPlatform,
} from './game/rules';
import { SaveSystem } from './game/SaveSystem';
import type {
  ControlModeSetting,
  ControlPlatform,
  GameLanguage,
  HUDState,
  HudVisibilitySettings,
} from './game/types';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game | null>(null);

  const [inTitleScreen, setInTitleScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return false;
    }
    return true;
  });

  const [hud, setHud] = useState<HUDState | null>(null);
  const [hasSavedGame, setHasSavedGame] = useState<boolean>(() => SaveSystem.hasSave());
  const [showTitleSettings, setShowTitleSettings] = useState<boolean>(false);
  const [titleSettingsTab, setTitleSettingsTab] = useState<'general' | 'hud'>('general');

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const game = new Game(container, (nextHud) => {
      setHud(nextHud);
    });
    gameRef.current = game;
    (window as unknown as { __game?: Game }).__game = game;
    game.start();

    return () => {
      game.dispose();
      gameRef.current = null;
      (window as unknown as { __game?: Game }).__game = undefined;
    };
  }, []);

  useEffect(() => {
    gameRef.current?.setPaused(inTitleScreen);
    if (inTitleScreen) {
      setHasSavedGame(SaveSystem.hasSave());
    } else {
      setShowTitleSettings(false);
    }
  }, [inTitleScreen]);

  const settings = hud?.settings;
  const lang: GameLanguage = settings?.language ?? 'ru';
  const controlMode: ControlModeSetting = settings?.controlMode ?? 'auto';
  const activePlatform: ControlPlatform =
    hud?.detectedPlatform ??
    resolveControlPlatform(controlMode, getBrowserDeviceSnapshot());
  const controlSummary = getPlatformControlSummary(activePlatform, lang);

  const hudVis: HudVisibilitySettings = {
    minimapRadar: settings?.hudVisibility?.minimapRadar ?? true,
    clockWeather: settings?.hudVisibility?.clockWeather ?? true,
    questTracker: settings?.hudVisibility?.questTracker ?? true,
    companionPanel: settings?.hudVisibility?.companionPanel ?? true,
    reputationBar: settings?.hudVisibility?.reputationBar ?? true,
    combatLog: settings?.hudVisibility?.combatLog ?? true,
    controlsDock: settings?.hudVisibility?.controlsDock ?? true,
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = inTitleScreen
        ? 'title'
        : hud?.activeModal && hud.activeModal !== 'none'
        ? hud.activeModal === 'death' || hud.activeModal === 'victory'
          ? 'gameover'
          : 'paused'
        : 'playing';
      document.body.dataset.platform = activePlatform;
    }
  }, [inTitleScreen, hud?.activeModal, activePlatform]);

  const setLanguage = (nextLang: GameLanguage) => {
    gameRef.current?.updateSettings({ language: nextLang });
  };

  const setControlMode = (nextMode: ControlModeSetting) => {
    gameRef.current?.updateSettings({ controlMode: nextMode });
  };

  const handleStartNewGame = (withPrologue = true) => {
    setShowTitleSettings(false);
    setInTitleScreen(false);
    gameRef.current?.setPaused(false);
    gameRef.current?.audio.startAmbient();
    if (withPrologue) {
      gameRef.current?.startPrologue();
    }
  };

  const handleContinueSavedGame = () => {
    setShowTitleSettings(false);
    if (gameRef.current?.loadGame()) {
      setInTitleScreen(false);
      gameRef.current?.setPaused(false);
      gameRef.current?.audio.startAmbient();
    } else {
      handleStartNewGame(true);
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-stone-950 text-stone-100 select-none"
      data-state={inTitleScreen ? 'title' : hud?.activeModal || 'playing'}
      data-platform={activePlatform}
    >
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="webgl-viewport"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* TITLE SCREEN OVERLAY */}
      {inTitleScreen && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-8 md:p-14 overflow-y-auto bg-gradient-to-t from-stone-950 via-stone-950/85 to-stone-950/65">
          <header className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-6 border-b border-amber-900/40 pb-3 sm:pb-4">
            <span className="font-display text-xs sm:text-base md:text-lg font-bold tracking-wider text-amber-400">
              {t(lang, 'title.header')}
            </span>
            <div className="hidden lg:flex items-center gap-5 text-xs text-stone-300">
              <span>{lang === 'en' ? 'Old Kingdom of Valdmark' : 'Старое Королевство Вальдмарк'}</span>
              <span className="text-amber-500">❖</span>
              <span>{lang === 'en' ? 'Day/Night & Dynamic Lighting' : 'Смена дня и ночи · Динамический свет'}</span>
              <span className="text-amber-500">❖</span>
              <span>
                {activePlatform === 'mobile'
                  ? lang === 'en'
                    ? '28 Lore Chronicles · Codex'
                    : '28 Летописей Кодекса'
                  : lang === 'en'
                  ? '28 Lore Chronicles [L]'
                  : '28 Летописей Кодекса [L]'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="flex items-center rounded-lg p-0.5 medieval-panel"
                role="group"
                aria-label="Language selector"
              >
                <button
                  onClick={() => setLanguage('ru')}
                  className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded transition-colors cursor-pointer ${
                    lang === 'ru'
                      ? 'bg-amber-600 text-stone-950'
                      : 'text-stone-300 hover:text-amber-300'
                  }`}
                >
                  РУС
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded transition-colors cursor-pointer ${
                    lang === 'en'
                      ? 'bg-amber-600 text-stone-950'
                      : 'text-stone-300 hover:text-amber-300'
                  }`}
                >
                  ENG
                </button>
              </div>
              <button
                data-testid="title-header-settings-btn"
                onClick={() => setShowTitleSettings(true)}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold medieval-button rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-amber-200"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{lang === 'en' ? 'Settings' : 'Настройки'}</span>
              </button>
              <button
                data-start="true"
                onClick={() => handleStartNewGame(false)}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold medieval-button-primary rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t(lang, 'title.quickStart')}
              </button>
            </div>
          </header>

          <main className="my-auto py-3 sm:py-6 max-w-2xl space-y-3.5 sm:space-y-6">
            <p className="text-[11px] sm:text-xs font-semibold tracking-widest text-amber-400/95 uppercase">
              {t(lang, 'title.subtitle')}
            </p>
            <h1
              className="font-display text-2xl sm:text-4xl md:text-6xl font-extrabold text-stone-100 leading-tight tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              The Wanderer: Curse of the Old Kingdom
            </h1>
            <p className="text-xs sm:text-base md:text-lg text-stone-200 leading-relaxed max-w-xl">
              {t(lang, 'title.desc')}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 pt-1 sm:pt-2">
              <button
                data-testid="start-hunt-btn"
                onClick={() => handleStartNewGame(true)}
                className="px-5 sm:px-7 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold medieval-button-primary rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                {t(lang, 'title.startHunt')}
              </button>
              {hasSavedGame && (
                <button
                  onClick={handleContinueSavedGame}
                  className="px-4 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold medieval-button rounded-xl transition-all cursor-pointer whitespace-nowrap text-amber-300"
                >
                  {t(lang, 'title.continueSave')}
                </button>
              )}
              <button
                data-testid="title-settings-btn"
                onClick={() => setShowTitleSettings(true)}
                className="px-4 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold medieval-button rounded-xl transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 text-amber-200"
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>{lang === 'en' ? 'Settings' : 'Настройки'}</span>
              </button>
              <a
                href="https://foozzee.ru"
                target="_top"
                rel="noopener noreferrer"
                className="px-4 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold medieval-button rounded-xl transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center"
              >
                {t(lang, 'title.exit')}
              </a>
              <a
                href="./the-wanderer-web.zip"
                download="the-wanderer-web.zip"
                data-testid="download-web-zip-btn"
                className="px-4 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold medieval-button rounded-xl transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 text-amber-300 border-amber-500/40"
              >
                <span>⬇</span>
                <span>{lang === 'en' ? 'Download Web ZIP' : 'Скачать ZIP (Web)'}</span>
              </a>
              <a
                href="./the-wanderer-godot.zip"
                download="the-wanderer-godot.zip"
                data-testid="download-godot-zip-btn"
                className="px-4 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold medieval-button rounded-xl transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 text-sky-300 border-sky-500/40"
              >
                <span>⬇</span>
                <span>{lang === 'en' ? 'Download Godot 4.x ZIP' : 'Скачать ZIP (Godot 4.x)'}</span>
              </a>
            </div>

            {/* Detected Platform Indicator & Control Scheme Header */}
            <div className="pt-3 sm:pt-4 border-t border-amber-900/40 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  data-testid="detected-platform-badge"
                  className="flex items-center gap-2 text-xs font-semibold text-amber-300"
                >
                  {activePlatform === 'mobile' ? (
                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Monitor className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{controlSummary.platformBadge}</span>
                </div>

                <div
                  className="flex items-center rounded-lg p-0.5 medieval-panel text-[11px]"
                  role="group"
                  aria-label="Control mode selector"
                >
                  <button
                    onClick={() => setControlMode('auto')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      controlMode === 'auto'
                        ? 'bg-amber-600 text-stone-950 font-semibold'
                        : 'text-stone-300 hover:text-amber-300'
                    }`}
                  >
                    {t(lang, 'pause.controlMode.auto')}
                  </button>
                  <button
                    onClick={() => setControlMode('pc')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      controlMode === 'pc'
                        ? 'bg-amber-600 text-stone-950 font-semibold'
                        : 'text-stone-300 hover:text-amber-300'
                    }`}
                  >
                    ПК / PC
                  </button>
                  <button
                    onClick={() => setControlMode('mobile')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      controlMode === 'mobile'
                        ? 'bg-amber-600 text-stone-950 font-semibold'
                        : 'text-stone-300 hover:text-amber-300'
                    }`}
                  >
                    {lang === 'en' ? 'Phone' : 'Телефон'}
                  </button>
                </div>
              </div>

              <div
                data-testid="title-controls-grid"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-[11px] sm:text-xs text-stone-300"
              >
                <div className="medieval-panel rounded-lg p-2 sm:p-2.5">
                  <div className="text-stone-400">{t(lang, 'title.moveDodge')}</div>
                  <div className="font-mono-tabular font-semibold text-amber-200 mt-0.5">
                    {controlSummary.moveDodge}
                  </div>
                </div>
                <div className="medieval-panel rounded-lg p-2 sm:p-2.5">
                  <div className="text-stone-400">{t(lang, 'title.combatBlock')}</div>
                  <div className="font-mono-tabular font-semibold text-amber-200 mt-0.5">
                    {controlSummary.combatBlock}
                  </div>
                </div>
                <div className="medieval-panel rounded-lg p-2 sm:p-2.5">
                  <div className="text-stone-400">{t(lang, 'title.ashSigns')}</div>
                  <div className="font-mono-tabular font-semibold text-amber-200 mt-0.5">
                    {controlSummary.ashSigns}
                  </div>
                </div>
                <div className="medieval-panel rounded-lg p-2 sm:p-2.5">
                  <div className="text-stone-400">{t(lang, 'title.codexMenus')}</div>
                  <div className="font-mono-tabular font-semibold text-amber-200 mt-0.5">
                    {controlSummary.codexMenus}
                  </div>
                </div>
              </div>
            </div>
          </main>

          <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] sm:text-xs text-stone-400 pt-2">
            <span>{controlSummary.pointerHint}</span>
            <span>
              {lang === 'en'
                ? "Corvus of the Ash Brotherhood · Crow's Hollow"
                : 'Корвус из Братства Пепла · Деревня Воронья Падь'}
            </span>
          </footer>

          {/* MAIN MENU SETTINGS MODAL */}
          {showTitleSettings && (
            <div
              data-testid="title-settings-modal"
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            >
              <div className="w-full max-w-xl medieval-panel-ornate rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-amber-900/40 pb-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-display font-bold text-amber-400 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-amber-400" />
                      <span>{t(lang, 'pause.title')}</span>
                    </h2>
                    <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
                      {t(lang, 'pause.subtitle')}
                    </p>
                  </div>
                  <button
                    data-testid="close-title-settings-btn"
                    onClick={() => setShowTitleSettings(false)}
                    className="p-2 rounded-lg medieval-button text-stone-300 hover:text-amber-300 cursor-pointer"
                    aria-label="Закрыть настройки"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Settings Tabs */}
                <div className="flex gap-2 bg-stone-950/90 p-1 rounded-xl border border-amber-900/40">
                  <button
                    onClick={() => setTitleSettingsTab('general')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      titleSettingsTab === 'general'
                        ? 'bg-amber-600 text-stone-950'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {t(lang, 'pause.tab.general')}
                  </button>
                  <button
                    onClick={() => setTitleSettingsTab('hud')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      titleSettingsTab === 'hud'
                        ? 'bg-amber-600 text-stone-950'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {t(lang, 'pause.tab.hud')}
                  </button>
                </div>

                {titleSettingsTab === 'general' ? (
                  <div className="space-y-3.5 bg-stone-950/75 p-4 rounded-xl border border-amber-900/35 text-xs overflow-y-auto pr-1">
                    {/* Language Switcher */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-stone-800">
                      <span className="text-stone-200 font-semibold">
                        {t(lang, 'pause.language')}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setLanguage('ru')}
                          className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                            lang === 'ru'
                              ? 'bg-amber-600 text-stone-950'
                              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                          }`}
                        >
                          Русский (По умолчанию)
                        </button>
                        <button
                          onClick={() => setLanguage('en')}
                          className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                            lang === 'en'
                              ? 'bg-amber-600 text-stone-950'
                              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                          }`}
                        >
                          English
                        </button>
                      </div>
                    </div>

                    {/* Control Mode Switcher */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-800">
                      <span className="text-stone-200 font-semibold">
                        {t(lang, 'pause.controlMode')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            { id: 'auto', label: t(lang, 'pause.controlMode.auto') },
                            { id: 'pc', label: t(lang, 'pause.controlMode.pc') },
                            { id: 'mobile', label: t(lang, 'pause.controlMode.mobile') },
                          ] as { id: ControlModeSetting; label: string }[]
                        ).map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setControlMode(mode.id)}
                            className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                              controlMode === mode.id
                                ? 'bg-amber-600 text-stone-950'
                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sound & Music Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-2.5 border-b border-stone-800">
                      <div className="flex items-center justify-between bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
                        <span className="text-stone-300">{t(lang, 'pause.audioEnabled')}</span>
                        <button
                          onClick={() =>
                            gameRef.current?.updateSettings({
                              audioEnabled: !(settings?.audioEnabled ?? true),
                            })
                          }
                          className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center gap-1.5 cursor-pointer"
                        >
                          {(settings?.audioEnabled ?? true) ? (
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
                            gameRef.current?.updateSettings({
                              musicEnabled: !(settings?.musicEnabled ?? true),
                            })
                          }
                          className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center gap-1.5 cursor-pointer"
                        >
                          {(settings?.musicEnabled ?? true) ? (
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

                    {/* Volume Sliders */}
                    <div className="space-y-2.5 pb-2.5 border-b border-stone-800">
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>{t(lang, 'pause.masterVolume')}</span>
                          <span className="font-mono-tabular text-amber-300">
                            {Math.round((settings?.masterVolume ?? 0.6) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round((settings?.masterVolume ?? 0.6) * 100)}
                          onChange={(e) =>
                            gameRef.current?.updateSettings({
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
                              {Math.round((settings?.sfxVolume ?? 0.85) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round((settings?.sfxVolume ?? 0.85) * 100)}
                            onChange={(e) =>
                              gameRef.current?.updateSettings({
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
                              {Math.round((settings?.musicVolume ?? 0.65) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round((settings?.musicVolume ?? 0.65) * 100)}
                            onChange={(e) =>
                              gameRef.current?.updateSettings({
                                musicVolume: Number(e.target.value) / 100,
                              })
                            }
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Graphics & Weather */}
                    <div className="flex items-center justify-between">
                      <span className="text-stone-300">{t(lang, 'pause.graphics')}</span>
                      <div className="flex gap-1">
                        {(['low', 'medium', 'high'] as const).map((q) => (
                          <button
                            key={q}
                            onClick={() => gameRef.current?.updateSettings({ quality: q })}
                            className={`px-2.5 py-1 rounded cursor-pointer ${
                              (settings?.quality ?? 'high') === q
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
                            onClick={() => gameRef.current?.setWeather(w)}
                            className={`px-2.5 py-1 rounded cursor-pointer ${
                              (hud?.weather ?? 'fog') === w
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
                              gameRef.current?.updateSettings({
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

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => setShowTitleSettings(false)}
                    className="w-full py-2.5 rounded-xl medieval-button-primary font-semibold text-sm cursor-pointer"
                  >
                    {lang === 'en' ? 'Save & Return to Menu' : 'Сохранить и вернуться в меню'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IN-GAME HUD & MODALS */}
      {!inTitleScreen && hud && (
        <UIManager
          hud={hud}
          game={gameRef.current}
          onReturnToTitle={() => {
            gameRef.current?.openModal('none');
            setInTitleScreen(true);
          }}
        />
      )}
    </div>
  );
}


