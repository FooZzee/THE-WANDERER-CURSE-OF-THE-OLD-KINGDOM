import React, { useEffect, useRef, useState } from 'react';
import { UIManager } from './components/UIManager';
import { Game } from './game/Game';
import { SaveSystem } from './game/SaveSystem';
import type { HUDState } from './game/types';

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

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const game = new Game(container, (nextHud) => {
      setHud(nextHud);
    });
    gameRef.current = game;
    game.start();

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    gameRef.current?.setPaused(inTitleScreen);
    if (inTitleScreen) {
      setHasSavedGame(SaveSystem.hasSave());
    }
  }, [inTitleScreen]);

  const handleStartNewGame = (withPrologue = true) => {
    setInTitleScreen(false);
    gameRef.current?.setPaused(false);
    gameRef.current?.audio.startAmbient();
    if (withPrologue) {
      gameRef.current?.startPrologue();
    }
  };

  const handleContinueSavedGame = () => {
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
    >
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="webgl-viewport"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* TITLE SCREEN OVERLAY */}
      {inTitleScreen && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-8 md:p-14 bg-gradient-to-t from-stone-950 via-stone-950/80 to-stone-950/60">
          <header className="flex items-center justify-between gap-8 border-b border-stone-800/80 pb-4">
            <span className="font-display text-lg font-bold tracking-wider text-amber-500 whitespace-nowrap shrink-0">
              VALDMARK · БРАТСТВО ПЕПЛА
            </span>
            <div className="hidden md:flex items-center gap-6 text-xs text-stone-400">
              <span>Старое Королевство Вальдмарк</span>
              <span>·</span>
              <span>5 Печатей Пепла</span>
              <span>·</span>
              <span>22 Летописи Кодекса [L]</span>
              <span>·</span>
              <span>Северный Поход (4 Биома)</span>
            </div>
            <button
              onClick={() => handleStartNewGame(false)}
              className="px-4 py-2 text-xs font-semibold bg-amber-700 hover:bg-amber-600 text-stone-950 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Быстрый старт
            </button>
          </header>

          <main className="my-auto max-w-2xl space-y-6">
            <p className="text-xs font-semibold tracking-widest text-amber-500/90">
              DARK FANTASY ACTION RPG · ХРОНИКИ ВАЛЬДМАРКА
            </p>
            <h1
              className="font-display text-4xl md:text-6xl font-extrabold text-stone-100 leading-tight"
              style={{ textWrap: 'balance' }}
            >
              The Wanderer: Curse of the Old Kingdom
            </h1>
            <p className="text-base md:text-lg text-stone-300 leading-relaxed max-w-xl">
              Двенадцать лет назад в «Ночь Пепельного Затмения» король Малакор Бессмертный заключил
              пакт с Сердцем Пустоты. Вы — Корвус из Братства Пепла, один из последних Зольников с
              янтарными глазами, идущий по следу пропавшего наставника Веспера в проклятую Воронью Падь.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => handleStartNewGame(true)}
                className="px-7 py-3.5 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-stone-950 rounded transition-colors cursor-pointer whitespace-nowrap"
              >
                Начать охоту
              </button>
              {hasSavedGame && (
                <button
                  onClick={handleContinueSavedGame}
                  className="px-6 py-3.5 text-sm font-semibold bg-stone-900 hover:bg-stone-800 text-amber-400 border border-amber-700/50 rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  Продолжить сохранение
                </button>
              )}
              <a
                href="https://foozzee.ru"
                target="_top"
                rel="noopener noreferrer"
                className="px-6 py-3.5 text-sm font-semibold bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-amber-400 border border-stone-700 hover:border-amber-600/60 rounded transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center"
              >
                Выход
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs text-stone-300 border-t border-stone-800/80">
              <div>
                <div className="text-stone-400">Движение и рывок</div>
                <div className="font-mono-tabular font-semibold text-stone-100 mt-0.5">
                  WASD · Shift · Space
                </div>
              </div>
              <div>
                <div className="text-stone-400">Фехтование и блок</div>
                <div className="font-mono-tabular font-semibold text-stone-100 mt-0.5">
                  ЛКМ (Комбо / Тяж.) · ПКМ
                </div>
              </div>
              <div>
                <div className="text-stone-400">Печати Пепла</div>
                <div className="font-mono-tabular font-semibold text-stone-100 mt-0.5">
                  Q / 1-5 (Выбор) · R (Каст)
                </div>
              </div>
              <div>
                <div className="text-stone-400">Кодекс и Меню</div>
                <div className="font-mono-tabular font-semibold text-stone-100 mt-0.5">
                  E · L (Кодекс) · J · M · V
                </div>
              </div>
            </div>
          </main>

          <footer className="flex items-center justify-between text-xs text-stone-500">
            <span>Кликните по 3D-сцене в игре для захвата курсора (Pointer Lock)</span>
            <span>Корвус из Братства Пепла · Деревня Воронья Падь</span>
          </footer>
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
