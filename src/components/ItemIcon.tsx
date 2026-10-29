import React from 'react';

interface ItemIconProps {
  item: {
    id: string;
    name?: string;
    category?: string;
    swordType?: string;
    setId?: string;
  };
  size?: number;
  className?: string;
}

/**
 * Bespoke medieval SVG icons for every item, weapon, armor, potion, decoction,
 * herb, ore, monster part, trophy, rune, and crafting blueprint in the game.
 */
export const ItemIcon: React.FC<ItemIconProps> = ({ item, size = 38, className = '' }) => {
  const id = item.id.toLowerCase();
  const cat = item.category || '';

  // Determine frame border & background glow by category / rarity
  const isMythic = id.startsWith('mythic_') || id.includes('relic') || id.includes('order') || id.includes('village');
  const isBlueprint = cat === 'blueprint' || id.startsWith('bp_');
  const isSilver = item.swordType === 'silver' || id.includes('silver') || id === 'mythic_void_voice' || id === 'mythic_dusk_fangs' || id === 'mythic_plague_scythe';

  const frameClass = isMythic
    ? 'border-amber-400/90 bg-gradient-to-br from-amber-950/90 via-stone-900 to-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
    : isBlueprint
    ? 'border-sky-500/80 bg-gradient-to-br from-sky-950/90 via-stone-900 to-stone-950 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
    : cat === 'potion'
    ? 'border-emerald-600/75 bg-gradient-to-br from-emerald-950/80 via-stone-900 to-stone-950'
    : cat === 'rune'
    ? 'border-purple-500/80 bg-gradient-to-br from-purple-950/85 via-stone-900 to-stone-950'
    : cat === 'trophy'
    ? 'border-red-600/80 bg-gradient-to-br from-red-950/80 via-stone-900 to-stone-950'
    : 'border-amber-700/60 bg-gradient-to-br from-stone-800/90 via-stone-900 to-stone-950';

  const renderGlyph = () => {
    // 1. BLUEPRINTS & SCROLLS (Собираемые рисунки и чертежи кузницы)
    if (isBlueprint || id.includes('lore') || id.includes('note')) {
      const accent = id.includes('raven')
        ? '#38bdf8'
        : id.includes('bear')
        ? '#f59e0b'
        : id.includes('flame') || id.includes('sun')
        ? '#f97316'
        : id.includes('frost')
        ? '#7dd3fc'
        : id.includes('void') || id.includes('obsidian')
        ? '#c084fc'
        : '#60a5fa';
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          {/* Rolled Blueprint Parchment */}
          <rect x="7" y="6" width="26" height="28" rx="2" fill="#1e293b" stroke={accent} strokeWidth="1.6" />
          <path d="M7 10 H33 M7 30 H33" stroke={accent} strokeWidth="1" strokeOpacity="0.6" />
          {/* Drafting Compass / Schematic Sword & Shield Symbol */}
          <circle cx="20" cy="20" r="6.5" fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="2 1.5" />
          {id.includes('armor') ? (
            <path d="M16 15 L24 15 L25 22 L20 26 L15 22 Z" fill={accent} fillOpacity="0.35" stroke="#e2e8f0" strokeWidth="1.3" />
          ) : (
            <path d="M15 25 L25 15 M22 14 L26 18 M14 23 L17 26" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
          )}
          <circle cx="11" cy="8" r="1.3" fill={accent} />
          <circle cx="29" cy="8" r="1.3" fill={accent} />
        </svg>
      );
    }

    // 2. MYTHIC & SPECIFIC WEAPONS
    if (id === 'mythic_plague_scythe') {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          <path d="M10 33 L27 9" stroke="#a8a29e" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M26 9 C17 6 10 11 7 19 C13 15 19 14 25 15 Z" fill="#84cc16" stroke="#ecfccb" strokeWidth="1.2" />
          <circle cx="25" cy="12" r="2" fill="#bef264" />
        </svg>
      );
    }

    if (id === 'mythic_black_cleaver') {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          <path d="M10 32 L28 10" stroke="#78716c" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M21 11 L32 8 L34 19 L23 23 Z" fill="#38bdf8" fillOpacity="0.85" stroke="#e0f2fe" strokeWidth="1.3" />
          <path d="M18 16 L24 12" stroke="#0284c7" strokeWidth="1.5" />
        </svg>
      );
    }

    if (id === 'mythic_dusk_fangs') {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          {/* Dual curved daggers/swords */}
          <path d="M9 29 Q17 17 29 9" fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M11 9 Q23 17 31 29" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="20" cy="19" r="3" fill="#faf5ff" opacity="0.8" />
        </svg>
      );
    }

    if (id === 'mythic_sun_eater') {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          {/* Flaming Greatsword */}
          <path d="M9 31 L31 9" stroke="#fb923c" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M9 31 L31 9" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M12 22 L18 28" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="16" r="5" fill="#f97316" fillOpacity="0.3" />
        </svg>
      );
    }

    if (id === 'mythic_void_voice') {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          <path d="M9 31 L31 9" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
          <path d="M9 31 L31 9" stroke="#f3e8ff" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M11 21 L19 29" stroke="#c084fc" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="22" cy="18" r="4" fill="none" stroke="#d8b4fe" strokeWidth="1.2" strokeDasharray="2 1" />
        </svg>
      );
    }

    if (cat === 'weapon') {
      const bladeColor = isSilver ? '#bae6fd' : '#e7e5e4';
      const glowColor = isSilver ? '#38bdf8' : '#f59e0b';
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          <path d="M10 30 L31 9" stroke={bladeColor} strokeWidth="2.8" strokeLinecap="round" />
          <path d="M14 26 L29 11" stroke={glowColor} strokeWidth="1" strokeLinecap="round" />
          {/* Crossguard */}
          <path d="M11 21 L19 29" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
          {/* Pommel */}
          <circle cx="9" cy="31" r="2.2" fill="#f59e0b" />
        </svg>
      );
    }

    // 3. ARMOR SETS (Доспехи)
    if (cat === 'armor') {
      const armorFill = id.includes('raven')
        ? '#1e293b'
        : id.includes('bear')
        ? '#451a03'
        : id.includes('flame')
        ? '#7c2d12'
        : id.includes('frost')
        ? '#0c4a6e'
        : id.includes('obsidian')
        ? '#3b0764'
        : id.includes('grandmaster')
        ? '#1c1917'
        : id.includes('royal')
        ? '#78350f'
        : '#44403c';
      const trimColor = id.includes('raven')
        ? '#38bdf8'
        : id.includes('bear')
        ? '#f59e0b'
        : id.includes('flame')
        ? '#fb923c'
        : id.includes('frost')
        ? '#7dd3fc'
        : id.includes('obsidian')
        ? '#c084fc'
        : '#fbbf24';

      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          {/* Pauldrons + Cuirass */}
          <path
            d="M8 13 L14 9 L26 9 L32 13 L29 20 L26 19 L26 31 L20 34 L14 31 L14 19 L11 20 Z"
            fill={armorFill}
            stroke={trimColor}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Chest Emblem / Belt */}
          <path d="M20 12 L20 29 M14 24 L26 24" stroke={trimColor} strokeWidth="1.3" strokeOpacity="0.85" />
          <circle cx="20" cy="18" r="2.4" fill={trimColor} />
        </svg>
      );
    }

    // 4. POTIONS, ELIXIRS, OILS & DECOCTIONS (Эликсиры, отвары, масла)
    if (cat === 'potion') {
      const isDecoction = id.startsWith('decoction_');
      const isOil = id.startsWith('oil_');
      const liquidColor = id.includes('swallow')
        ? '#ef4444'
        : id.includes('thunder')
        ? '#f59e0b'
        : id.includes('cat')
        ? '#38bdf8'
        : id.includes('blizzard')
        ? '#a5f3fc'
        : id.includes('white_honey')
        ? '#fde047'
        : isOil
        ? '#84cc16'
        : isDecoction
        ? '#a855f7'
        : '#10b981';

      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          {/* Cork & Flask Neck */}
          <rect x="17" y="6" width="6" height="4" rx="1" fill="#b45309" />
          <path d="M16 10 H24 L23 15 L30 24 C31 28 28 33 20 33 C12 33 9 28 10 24 L17 15 Z" fill="#1c1917" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Glowing Alchemical Liquid */}
          <path d="M12 24 C14 22 26 22 28 24 C29 27 27 31 20 31 C13 31 11 27 12 24 Z" fill={liquidColor} />
          <circle cx="18" cy="26" r="1.3" fill="#ffffff" opacity="0.8" />
          <circle cx="22" cy="24" r="1" fill="#ffffff" opacity="0.6" />
        </svg>
      );
    }

    // 5. RUNES (Рунические камни)
    if (cat === 'rune') {
      const runeColor = id.includes('fire')
        ? '#f97316'
        : id.includes('frost')
        ? '#38bdf8'
        : id.includes('vamp')
        ? '#ef4444'
        : id.includes('void')
        ? '#c084fc'
        : '#fbbf24';
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          <polygon points="20,6 31,15 27,32 13,32 9,15" fill="#1e1b4b" stroke={runeColor} strokeWidth="1.8" />
          <path d="M20 11 L20 28 M15 16 L25 22 M25 16 L15 22" stroke={runeColor} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    }

    // 6. HUNTER TROPHIES (Трофеи чудовищ на крюке)
    if (cat === 'trophy') {
      const trophyColor = id.includes('werewolf')
        ? '#ef4444'
        : id.includes('noonwraith')
        ? '#2dd4bf'
        : '#f59e0b';
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          {/* Hook & Monster Skull/Head */}
          <path d="M20 5 C23 5 23 9 20 10" fill="none" stroke="#fbbf24" strokeWidth="1.6" />
          <path d="M12 15 L15 9 L20 12 L25 9 L28 15 L26 27 L20 32 L14 27 Z" fill="#292524" stroke={trophyColor} strokeWidth="1.6" />
          <circle cx="17" cy="19" r="1.8" fill={trophyColor} />
          <circle cx="23" cy="19" r="1.8" fill={trophyColor} />
          <path d="M16 26 L20 29 L24 26" fill="none" stroke="#e7e5e4" strokeWidth="1.3" />
        </svg>
      );
    }

    // 7. HERBS, ORES & MONSTER ORGANS (Травы, руды, реагенты)
    if (id.includes('herb') || id.includes('lotus')) {
      const leafColor = id.includes('lotus') ? '#38bdf8' : '#22c55e';
      const flowerColor = id.includes('lotus') ? '#e0f2fe' : '#f43f5e';
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          <path d="M20 33 Q20 20 26 11" fill="none" stroke={leafColor} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M20 26 Q12 22 11 16 Q17 17 20 23" fill={leafColor} />
          <path d="M21 21 Q29 18 30 12 Q24 13 21 19" fill={leafColor} />
          <circle cx="26" cy="11" r="3.5" fill={flowerColor} stroke="#fff" strokeWidth="0.8" />
        </svg>
      );
    }

    if (id.includes('ore')) {
      const isBlackOre = id.includes('black');
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          <polygon
            points="10,28 14,13 24,10 31,19 28,30 16,32"
            fill={isBlackOre ? '#1e1b4b' : '#57534e'}
            stroke={isBlackOre ? '#38bdf8' : '#d6d3d1'}
            strokeWidth="1.6"
          />
          <polygon points="17,16 23,14 25,22 18,24" fill={isBlackOre ? '#60a5fa' : '#fbbf24'} opacity="0.75" />
        </svg>
      );
    }

    if (id.includes('pelt')) {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          <path d="M12 10 L17 12 L23 12 L28 10 L30 18 L27 29 L20 32 L13 29 L10 18 Z" fill="#78350f" stroke="#d97706" strokeWidth="1.5" />
          <path d="M15 16 L25 24 M25 16 L15 24" stroke="#b45309" strokeWidth="1.2" opacity="0.6" />
        </svg>
      );
    }

    if (id.includes('heart') || id.includes('blood')) {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          <path d="M20 31 C12 25 10 17 14 12 C17 9 20 12 20 14 C20 12 23 9 26 12 C30 17 28 25 20 31 Z" fill="#dc2626" stroke="#fca5a5" strokeWidth="1.4" />
          <path d="M18 15 L22 22" stroke="#fef2f2" strokeWidth="1.2" opacity="0.6" />
        </svg>
      );
    }

    if (id.includes('claw')) {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full p-1">
          <path d="M12 29 Q15 16 25 10 M17 31 Q20 19 29 13 M22 32 Q25 22 32 17" fill="none" stroke="#e7e5e4" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    }

    // Default Cursed Essence / Void Dust / Crown Shard / Relic
    return (
      <svg viewBox="0 0 40 40" className="w-full h-full p-1">
        <polygon points="20,7 29,18 20,33 11,18" fill="#9333ea" fillOpacity="0.65" stroke="#e9d5ff" strokeWidth="1.5" />
        <circle cx="20" cy="19" r="3.2" fill="#fde047" />
      </svg>
    );
  };

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-lg border flex items-center justify-center shrink-0 overflow-hidden select-none ${frameClass} ${className}`}
    >
      {renderGlyph()}
    </div>
  );
};
