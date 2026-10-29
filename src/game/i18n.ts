import type { DialogueNode, GameItem, GameLanguage, Quest, SkillNode } from './types';

export const UI_TEXT: Record<GameLanguage, Record<string, string>> = {
  ru: {
    // Title Screen
    title_badge: 'Чёрный Бастион · Тлеющая Кровь · Ночь Пепельного Затмения',
    title_subtitle: 'ПРОКЛЯТИЕ СТАРОГО КОРОЛЕВСТВА ВАЛЬДМАРК',
    title_desc:
      'Вы — Корвус из Школы Ворона, последний Зольник Братства Пепла. Двенадцать лет назад король Малакор пробудил Сердце Пустоты, погрузив Вальдмарк в вечные сумерки.',
    btn_continue: 'Продолжить охоту',
    btn_new_game: 'Новая игра (Пролог и Поход на Север)',
    btn_controls: 'Боевой устав Зольника',
    feat_combat: 'Два меча и 5 Печатей',
    feat_combat_sub: 'Сталь, Серебро и Тлеющая Кровь',
    feat_contracts: 'Контракты и Улики',
    feat_contracts_sub: 'Выслеживание бестий с Чутьём [V]',
    feat_codex: 'Хроники Вальдмарка',
    feat_codex_sub: '12 летописей мира [L] и 4 финала',
    // HUD
    hud_level: 'Ур.',
    hud_corvus: 'Корвус · Зольник',
    hud_hp: 'Здоровье',
    hud_stamina: 'Выносливость',
    hud_toxicity: 'Токсичность',
    hud_steel: 'Сталь [1]',
    hud_silver: 'Серебро [2]',
    hud_crowns: 'крон',
    hud_hunter_vision: 'Чутьё [V]',
    hud_codex: 'Кодекс [L]',
    hud_meditate: 'Привал [N]',
    hud_inventory: 'Снаряжение [I]',
    hud_quests: 'Журнал [J]',
    hud_alchemy: 'Алхимия [K]',
    hud_map: 'Карта [M]',
    hud_bestiary: 'Бестиарий [B]',
    hud_save: 'Сохр.',
    hud_settings: 'Настройки [Esc]',
    hud_active_quest: 'Текущее поручение',
    hud_all_quests_done: 'Все сюжетные поручения выполнены',
    hud_press_e: 'Нажмите [E]',
    hud_Time_dawn: 'Рассвет',
    hud_Time_day: 'День',
    hud_Time_dusk: 'Закат',
    hud_Time_night: 'Ночь',
    weather_clear: 'Ясно',
    weather_fog: 'Туман',
    weather_rain: 'Гроза',
    // Settings Modal
    settings_title: 'Пауза и Настройки Игры',
    settings_tab_general: 'Основные и Звук',
    settings_tab_hud: 'Интерфейс (HUD)',
    settings_language: 'Язык игры / Language',
    settings_graphics: 'Качество графики',
    settings_weather: 'Погода в регионе',
    settings_time: 'Время суток',
    settings_sfx_toggle: 'Звуковые эффекты (SFX)',
    settings_sfx_vol: 'Громкость звуков',
    settings_music_toggle: 'Фоновая музыка',
    settings_music_vol: 'Громкость музыки',
    settings_master_vol: 'Общая громкость',
    settings_hud_title: 'Отображение элементов интерфейса',
    settings_hud_minimap: 'Радар и компас (сверху справа)',
    settings_hud_clock: 'Часы, время суток и погода',
    settings_hud_quest: 'Активное задание и контракты',
    settings_hud_companion: 'Панель боевого напарника',
    settings_hud_reputation: 'Шкала репутации Вальдмарка',
    settings_hud_log: 'Журнал событий и боя',
    settings_hud_dock: 'Нижняя панель умений и быстрых клавиш',
    btn_resume: 'Продолжить игру',
    btn_save_progress: 'Сохранить прогресс',
    btn_load_save: 'Загрузить сохранение',
    btn_exit_title: 'Выйти в главное меню',
    // Dialogue
    dialogue_badge: 'Беседа',
    dialogue_skip_hint: 'Нажмите [Пробел] или кликните по тексту, чтобы показать сразу',
    // Dot-keys used in Title, HUD, Dock, Dialogue, Inventory & Pause
    'title.header': 'ХРОНИКИ ВАЛЬДМАРКА · ТЁМНОЕ ФЭНТЕЗИ RPG',
    'title.quickStart': 'В бой без пролога',
    'title.subtitle': 'ПРОКЛЯТИЕ СТАРОГО КОРОЛЕВСТВА ВАЛЬДМАРК',
    'title.desc':
      'Вы — Корвус из Школы Ворона, последний Зольник Братства Пепла. Двенадцать лет назад король Малакор пробудил Сердце Пустоты, погрузив Вальдмарк в вечные сумерки.',
    'title.startHunt': 'Начать охоту (Пролог)',
    'title.continueSave': 'Продолжить сохранение',
    'title.exit': 'На сайт автора',
    'title.moveDodge': 'Движение и уклонение',
    'title.combatBlock': 'Атака и блок мечом',
    'title.ashSigns': 'Знаки Пепла и магия',
    'title.codexMenus': 'Взаимодействие и меню',
    'title.pointerHint': 'Совет: кликните по экрану (или проведите пальцем на телефоне) для обзора камеры',

    'hud.level': 'Ур',
    'hud.corvusTitle': 'Корвус · Зольник',
    'hud.xp': 'Опыт',
    'hud.gold': 'Кроны',
    'hud.skillPoint': 'Очко умен.',
    'hud.health': 'Здоровье',
    'hud.shield': 'Щит',
    'hud.stamina': 'Выносливость',
    'hud.toxicity': 'Токсичность',
    'hud.prices': 'Цены',
    'hud.bountyWarning': 'Охотники за головами идут по вашему следу!',
    'hud.activeWeapon': 'Активный клинок:',
    'hud.steelSword': 'Стальной меч',
    'hud.silverSword': 'Серебряный меч',
    'hud.steelShort': 'Сталь',
    'hud.silverShort': 'Серебро',
    'hud.silver': 'Серебро',
    'hud.signReady': 'Готов [R]',
    'hud.signR': 'Знак [R]',
    'hud.potion': 'Зелье [F]',
    'hud.questCompleted': 'Поручение выполнено',
    'hud.questLogBtn': 'Журнал [J]',
    'hud.mapBtn': 'Карта [M]',

    'dock.show': 'Показать панель Зольника',
    'dock.hide': 'Скрыть панель',
    'dock.signs': 'Знаки',
    'dock.inventory': 'Снаряжение [I]',
    'dock.quests': 'Журнал [J]',
    'dock.map': 'Карта [M]',
    'dock.contracts': 'Контракты',
    'dock.alchemy': 'Алхимия [K]',
    'dock.codex': 'Кодекс [L]',
    'dock.bestiary': 'Бестиарий [B]',
    'dock.save': 'Сохр.',

    'dialogue.skipTypewriter': 'Нажмите [Пробел] или коснитесь текста, чтобы показать сразу',
    'dialogue.badge': 'Беседа',

    'inv.title': 'Снаряжение, Руны и Древо Умений Зольника',
    'inv.tab.items': 'Инвентарь',
    'inv.tab.skills': 'Древо навыков',
    'inv.close': 'Закрыть [Esc]',
    'inv.stat.steelDmg': 'Урон сталью',
    'inv.stat.silverDmg': 'Урон серебром',
    'inv.stat.defense': 'Защита брони',
    'inv.stat.crit': 'Шанс крита',
    'inv.stat.signPower': 'Мощь Знаков',
    'inv.stat.gold': 'Золотые кроны',
    'inv.slot.steel': 'Стальной меч [1]',
    'inv.slot.silver': 'Серебряный меч [2]',
    'inv.slot.armor': 'Доспех Зольника',
    'inv.slot.trophy': 'Трофей на поясе',
    'inv.notEquipped': 'Не экипировано',
    'inv.runeSocket': 'Ячейка руны',
    'inv.emptySocket': 'Пусто',
    'inv.value': 'Ценность',
    'inv.goldShort': 'крон',
    'inv.equipped': 'Надето',
    'inv.unequip': 'Снять',
    'inv.equip': 'Надеть',
    'inv.forge': 'Выковать',
    'inv.drink': 'Выпить',
    'inv.addRune': '+ Руна',
    'inv.maxSkill': 'Макс. ур.',
    'inv.learnSkill': 'Изучить (1 очко)',

    'mobile.attack': 'Удар',
    'mobile.heavy': 'Тяж.',
    'mobile.dodge': 'Рывок',
    'mobile.block': 'Блок',
    'mobile.sign': 'Знак',
    'mobile.senses': 'Чутьё',
    'mobile.potion': 'Зелье',
    'mobile.interact': 'Действие',
    'mobile.lookHint': 'Свайп — обзор камеры',

    'pause.title': 'Пауза и Настройки Игры',
    'pause.tab.general': 'Основные и Звук',
    'pause.tab.hud': 'Интерфейс (HUD)',
    'pause.subtitle': 'Настройка звука, графики, языка, управления и элементов интерфейса',
    'pause.language': 'Язык игры / Language',
    'pause.controlMode': 'Управление и платформа',
    'pause.controlMode.auto': 'Авто',
    'pause.controlMode.pc': 'ПК (Клав.+Мышь)',
    'pause.controlMode.mobile': 'Телефон (Сенсор)',
    'pause.audioEnabled': 'Звуковые эффекты (SFX)',
    'pause.sfxEnabled': 'Звуковые эффекты (SFX)',
    'pause.musicEnabled': 'Фоновая музыка',
    'pause.on': 'ВКЛ',
    'pause.off': 'ВЫКЛ',
    'pause.masterVolume': 'Общая громкость',
    'pause.sfxVolume': 'Громкость эффектов',
    'pause.musicVolume': 'Громкость музыки',
    'pause.graphics': 'Качество графики',
    'pause.quality.low': 'Низкое',
    'pause.quality.medium': 'Среднее',
    'pause.quality.high': 'Высокое',
    'pause.weather': 'Погода в долине',
    'pause.hudHint': 'Включите или скройте отдельные элементы боевого интерфейса (HUD) для максимального погружения.',
    'pause.hud.minimapRadar': 'Радар и компас (сверху справа)',
    'pause.hud.clockWeather': 'Часы, время суток и погода',
    'pause.hud.questTracker': 'Активное поручение и контракты',
    'pause.hud.companionPanel': 'Панель боевого спутника',
    'pause.hud.reputationBar': 'Шкала репутации Вальдмарка',
    'pause.hud.combatLog': 'Журнал событий и боя',
    'pause.hud.controlsDock': 'Нижняя панель умений и быстрых клавиш',
    'pause.resume': 'Продолжить игру',
    'pause.save': 'Сохранить прогресс',
    'pause.load': 'Загрузить сохранение',
    'pause.exitTitle': 'Выйти в главное меню',
    'hud.phase.dawn': 'Рассвет',
    'hud.phase.day': 'Полдень',
    'hud.phase.dusk': 'Закат',
    'hud.phase.night': 'Полночь',
    'hud.weather.clear': 'Ясно',
    'hud.weather.fog': 'Туман',
    'hud.weather.rain': 'Гроза',
  },
  en: {
    // Title Screen
    title_badge: 'Black Bastion · Smoldering Blood · Night of the Ashen Eclipse',
    title_subtitle: 'CURSE OF THE OLD KINGDOM OF VALDMARK',
    title_desc:
      'You are Corvus of the School of the Raven, the last Ash-Hunter of the Brotherhood of Ash. Twelve years ago King Malakor awakened the Heart of the Void, plunging Valdmark into eternal twilight.',
    btn_continue: 'Continue the Hunt',
    btn_new_game: 'New Game (Prologue & Northern March)',
    btn_controls: 'Ash-Hunter Combat Codex',
    feat_combat: 'Dual Blades & 5 Signs',
    feat_combat_sub: 'Steel, Silver & Smoldering Blood',
    feat_contracts: 'Contracts & Clues',
    feat_contracts_sub: 'Track beasts with Hunter Senses [V]',
    feat_codex: 'Chronicles of Valdmark',
    feat_codex_sub: '12 World Scrolls [L] & 4 Endings',
    // HUD
    hud_level: 'Lv.',
    hud_corvus: 'Corvus · Ash-Hunter',
    hud_hp: 'Vitality',
    hud_stamina: 'Stamina',
    hud_toxicity: 'Toxicity',
    hud_steel: 'Steel [1]',
    hud_silver: 'Silver [2]',
    hud_crowns: 'crowns',
    hud_hunter_vision: 'Senses [V]',
    hud_codex: 'Codex [L]',
    hud_meditate: 'Campfire [N]',
    hud_inventory: 'Equipment [I]',
    hud_quests: 'Journal [J]',
    hud_alchemy: 'Alchemy [K]',
    hud_map: 'Map [M]',
    hud_bestiary: 'Bestiary [B]',
    hud_save: 'Save',
    hud_settings: 'Settings [Esc]',
    hud_active_quest: 'Active Quest',
    hud_all_quests_done: 'All main quests completed',
    hud_press_e: 'Press [E]',
    hud_Time_dawn: 'Dawn',
    hud_Time_day: 'Midday',
    hud_Time_dusk: 'Dusk',
    hud_Time_night: 'Midnight',
    weather_clear: 'Clear',
    weather_fog: 'Dense Fog',
    weather_rain: 'Storm',
    // Settings Modal
    settings_title: 'Pause & Game Settings',
    settings_tab_general: 'General & Audio',
    settings_tab_hud: 'HUD Customization',
    settings_language: 'Language / Язык',
    settings_graphics: 'Graphics Quality',
    settings_weather: 'Region Weather',
    settings_time: 'Time of Day',
    settings_sfx_toggle: 'Sound Effects (SFX)',
    settings_sfx_vol: 'SFX Volume',
    settings_music_toggle: 'Ambient Music',
    settings_music_vol: 'Music Volume',
    settings_master_vol: 'Master Volume',
    settings_hud_title: 'Toggle HUD Elements',
    settings_hud_minimap: 'Minimap Radar & Compass',
    settings_hud_clock: 'Time of Day & Weather Indicator',
    settings_hud_quest: 'Active Quest & Contract Tracker',
    settings_hud_companion: 'Companion Command Panel',
    settings_hud_reputation: 'Valdmark Reputation Bar',
    settings_hud_log: 'Combat & Event Log',
    settings_hud_dock: 'Bottom Action Bar & Shortcuts',
    btn_resume: 'Resume Game',
    btn_save_progress: 'Save Progress',
    btn_load_save: 'Load Last Save',
    btn_exit_title: 'Return to Title Screen',
    // Dialogue
    dialogue_badge: 'Dialogue',
    dialogue_skip_hint: 'Press [Space] or tap text to reveal immediately',
    // Dot-keys used in Title, HUD, Dock, Dialogue, Inventory & Pause
    'title.header': 'CHRONICLES OF VALDMARK · DARK FANTASY RPG',
    'title.quickStart': 'Quick Start',
    'title.subtitle': 'CURSE OF THE OLD KINGDOM OF VALDMARK',
    'title.desc':
      'You are Corvus of the School of the Raven, the last Ash-Hunter of the Brotherhood of Ash. Twelve years ago King Malakor awakened the Heart of the Void, plunging Valdmark into eternal twilight.',
    'title.startHunt': 'Begin the Hunt (Prologue)',
    'title.continueSave': 'Continue Saved Game',
    'title.exit': 'Creator Website',
    'title.moveDodge': 'Movement & Dodge',
    'title.combatBlock': 'Sword Combat & Parry',
    'title.ashSigns': 'Ash Signs & Magic',
    'title.codexMenus': 'Interact & Menus',
    'title.pointerHint': 'Tip: Click the screen (or swipe on mobile) to rotate the camera',

    'hud.level': 'Lv',
    'hud.corvusTitle': 'Corvus · Ash-Hunter',
    'hud.xp': 'XP',
    'hud.gold': 'Crowns',
    'hud.skillPoint': 'Skill Pt',
    'hud.health': 'Vitality',
    'hud.shield': 'Shield',
    'hud.stamina': 'Stamina',
    'hud.toxicity': 'Toxicity',
    'hud.prices': 'Prices',
    'hud.bountyWarning': 'Bounty Hunters are tracking you!',
    'hud.activeWeapon': 'Active Blade:',
    'hud.steelSword': 'Steel Sword',
    'hud.silverSword': 'Silver Sword',
    'hud.steelShort': 'Steel',
    'hud.silverShort': 'Silver',
    'hud.silver': 'Silver',
    'hud.signReady': 'Ready [R]',
    'hud.signR': 'Sign [R]',
    'hud.potion': 'Potion [F]',
    'hud.questCompleted': 'Objective completed',
    'hud.questLogBtn': 'Journal [J]',
    'hud.mapBtn': 'Map [M]',

    'dock.show': 'Show Ash-Hunter Bar',
    'dock.hide': 'Hide Bar',
    'dock.signs': 'Signs',
    'dock.inventory': 'Gear [I]',
    'dock.quests': 'Journal [J]',
    'dock.map': 'Map [M]',
    'dock.contracts': 'Contracts',
    'dock.alchemy': 'Alchemy [K]',
    'dock.codex': 'Codex [L]',
    'dock.bestiary': 'Bestiary [B]',
    'dock.save': 'Save',

    'dialogue.skipTypewriter': 'Press [Space] or tap text to reveal immediately',
    'dialogue.badge': 'Dialogue',

    'inv.title': 'Equipment, Runestones & Ash-Hunter Skill Tree',
    'inv.tab.items': 'Inventory',
    'inv.tab.skills': 'Skill Tree',
    'inv.close': 'Close [Esc]',
    'inv.stat.steelDmg': 'Steel Damage',
    'inv.stat.silverDmg': 'Silver Damage',
    'inv.stat.defense': 'Armor Defense',
    'inv.stat.crit': 'Crit Chance',
    'inv.stat.signPower': 'Sign Intensity',
    'inv.stat.gold': 'Gold Crowns',
    'inv.slot.steel': 'Steel Sword [1]',
    'inv.slot.silver': 'Silver Sword [2]',
    'inv.slot.armor': 'Hunter Armor',
    'inv.slot.trophy': 'Belt Trophy',
    'inv.notEquipped': 'Not Equipped',
    'inv.runeSocket': 'Rune Socket',
    'inv.emptySocket': 'Empty',
    'inv.value': 'Value',
    'inv.goldShort': 'crowns',
    'inv.equipped': 'Equipped',
    'inv.unequip': 'Unequip',
    'inv.equip': 'Equip',
    'inv.forge': 'Forge',
    'inv.drink': 'Drink',
    'inv.addRune': '+ Rune',
    'inv.maxSkill': 'Max Rank',
    'inv.learnSkill': 'Learn (1 pt)',

    'mobile.attack': 'Strike',
    'mobile.heavy': 'Heavy',
    'mobile.dodge': 'Dodge',
    'mobile.block': 'Block',
    'mobile.sign': 'Sign',
    'mobile.senses': 'Senses',
    'mobile.potion': 'Potion',
    'mobile.interact': 'Interact',
    'mobile.lookHint': 'Swipe to rotate camera',

    'pause.title': 'Pause & Game Settings',
    'pause.subtitle': 'Configure audio, graphics, language, platform controls, and HUD layout',
    'pause.tab.general': 'General & Audio',
    'pause.tab.hud': 'HUD Customization',
    'pause.language': 'Language / Язык',
    'pause.controlMode': 'Controls & Platform',
    'pause.controlMode.auto': 'Auto',
    'pause.controlMode.pc': 'PC (KB+Mouse)',
    'pause.controlMode.mobile': 'Phone (Touch)',
    'pause.audioEnabled': 'Sound Effects (SFX)',
    'pause.sfxEnabled': 'Sound Effects (SFX)',
    'pause.musicEnabled': 'Ambient Music',
    'pause.on': 'ON',
    'pause.off': 'OFF',
    'pause.masterVolume': 'Master Volume',
    'pause.sfxVolume': 'SFX Volume',
    'pause.musicVolume': 'Music Volume',
    'pause.graphics': 'Graphics Quality',
    'pause.quality.low': 'Low',
    'pause.quality.medium': 'Medium',
    'pause.quality.high': 'High',
    'pause.weather': 'Region Weather',
    'pause.hudHint': 'Show or hide individual HUD elements to customize your screen layout.',
    'pause.hud.minimapRadar': 'Minimap Radar & Compass',
    'pause.hud.clockWeather': 'Time of Day & Weather Indicator',
    'pause.hud.questTracker': 'Active Quest & Contract Tracker',
    'pause.hud.companionPanel': 'Companion Command Panel',
    'pause.hud.reputationBar': 'Valdmark Reputation Bar',
    'pause.hud.combatLog': 'Combat & Event Log',
    'pause.hud.controlsDock': 'Bottom Action Bar & Shortcuts',
    'pause.resume': 'Resume Game',
    'pause.save': 'Save Progress',
    'pause.load': 'Load Last Save',
    'pause.exitTitle': 'Return to Title Screen',
    'hud.phase.dawn': 'Dawn',
    'hud.phase.day': 'Midday',
    'hud.phase.dusk': 'Dusk',
    'hud.phase.night': 'Midnight',
    'hud.weather.clear': 'Clear',
    'hud.weather.fog': 'Dense Fog',
    'hud.weather.rain': 'Storm',
  },
};

const EN_ITEM_TRANSLATIONS: Record<string, { name: string; description: string }> = {
  sword_wolf_steel: {
    name: 'Raven Steel Sword',
    description: 'Forged in Kaer-Ash for combat against humans, beasts, and bandits.',
  },
  sword_runic_silver: {
    name: 'Ash-Silver Sword',
    description: 'Meteorite silver blade inscribed with runes to slay cursed monsters and specters.',
  },
  sword_templars_steel: {
    name: 'Templar Broadsword',
    description: 'Heavy steel blade of the Order of the Crimson Sun with high critical damage.',
  },
  sword_order_crimson: {
    name: 'Consecrated Blade of the Order',
    description: 'Blessed steel sword gifted by Inquisitor Lazarus.',
  },
  sword_village_ancient: {
    name: 'Runic Blade of Crow’s Hollow',
    description: 'Ancient silver-inlaid sword entrusted by the elders of the valley.',
  },
  relic_blade: {
    name: 'Blade of the Old Kingdom',
    description: 'Royal greatsword of King Aldric Ironhand recovered from the Catacombs.',
  },
  mythic_plague_scythe: {
    name: 'Scythe of the Plague Reaper',
    description: 'Curved marsh war-scythe steeped in corrosive venom (+bleed & poison).',
  },
  mythic_black_cleaver: {
    name: 'Black Ore Cleaver',
    description: 'Crushing war-cleaver forged from living Black Ore of the Dead Mines.',
  },
  mythic_dusk_fangs: {
    name: 'Fangs of Dusk (Vesper’s Blades)',
    description: 'Grandmaster Vesper’s twin curved witcher blades with life-leech on crits.',
  },
  mythic_void_voice: {
    name: 'Voice of the Void',
    description: 'Astral silver blade resonating with the Eclipse Crater (+35% Sign power).',
  },
  mythic_sun_eater: {
    name: 'Sun-Eater Greatsword',
    description: 'Blazing relic greatsword that unleashes a wave of fire on heavy strikes.',
  },
  armor_leather: {
    name: 'Road-Worn Leather Brigandine',
    description: 'Light hunting armor of the Brotherhood of Ash.',
  },
  armor_chainmail: {
    name: 'Tempered Chain Hauberk',
    description: 'Reinforced mail offering reliable protection against claws and blades.',
  },
  armor_raven: {
    name: 'School of the Raven Armor',
    description: 'Masterwork brigandine (+25% stamina regen & critical strike bonus).',
  },
  armor_bear: {
    name: 'School of the Bear Plate',
    description: 'Heavy northern plate with fur mantle (+30% damage reduction).',
  },
  armor_flame: {
    name: 'School of the Flame Cuirass',
    description: 'Rune-etched crimson armor (+35% Flame Sign intensity).',
  },
  armor_frost_warden: {
    name: 'Frost Warden Armor',
    description: 'Forged with Ice Lotus crystals in Silvertooth Pass (+Frost aura).',
  },
  armor_grandmaster_ash: {
    name: 'Grandmaster Ash Armor',
    description: 'Ancient panoply of Kaer-Ash (+attack, defense & Sign mastery).',
  },
  armor_obsidian_void: {
    name: 'Obsidian Void Plate',
    description: 'Armor of the Eclipse Archons forged from Black Ore and Void Dust.',
  },
  potion_swallow: {
    name: 'Swallow Elixir',
    description: 'Restores 55 Vitality over a brief moment (+25 Toxicity).',
  },
  potion_thunderbolt: {
    name: 'Thunderbolt Elixir',
    description: 'Increases attack power by +35% for 60 sec (+30 Toxicity).',
  },
  potion_cat: {
    name: 'Cat Elixir',
    description: 'Grants night vision in dark catacombs & +15% crit chance (+20 Toxicity).',
  },
  potion_blizzard: {
    name: 'Blizzard Elixir',
    description: 'Accelerates stamina recovery by +60% for 45 sec (+25 Toxicity).',
  },
  potion_white_honey: {
    name: 'White Honey',
    description: 'Purges all alchemical Toxicity from your bloodstream.',
  },
  oil_necrophage: {
    name: 'Necrophage Oil',
    description: '+30% damage against Ghouls, Drowned, and Swamp Hags.',
  },
  oil_cursed: {
    name: 'Cursed Ones Oil',
    description: '+30% damage against Werewolves, Demons, and Hydras.',
  },
  oil_specter: {
    name: 'Specter Oil',
    description: '+30% damage against Noonwraiths, Frost Wraiths, and Lich King Malakor.',
  },
  decoction_hydra: {
    name: 'Swamp Hydra Decoction',
    description: 'Regenerates +3 HP/sec continuously for 3 minutes (+45 Toxicity).',
  },
  decoction_colossus: {
    name: 'Crystal Colossus Decoction',
    description: 'Grants +45 Armor Defense and stun resistance (+45 Toxicity).',
  },
  decoction_vesper: {
    name: 'Dusk Wolf Decoction',
    description: 'Grants +25% Critical Chance and +25% Sign Power (+45 Toxicity).',
  },
  herb_swallow: {
    name: 'Celandine & Swallow Herb',
    description: 'Medicinal forest herb used in healing elixirs and blade oils.',
  },
  iron_ore: {
    name: 'Valdmark Iron Ore',
    description: 'Dense mountain ore required by Blacksmith Thorn to temper weapons.',
  },
  black_ore: {
    name: 'Living Black Ore',
    description: 'Crystallized blood of the mountain from Silvertooth Pass.',
  },
  ice_lotus: {
    name: 'Glacial Lotus',
    description: 'Rare frost flower blooming only on high mountain ledges.',
  },
  void_dust: {
    name: 'Ash of the Void',
    description: 'Glowing astral dust harvested from Fallen Ash-Hunters and Void Knights.',
  },
  wolf_pelt: {
    name: 'Timber Wolf Pelt',
    description: 'Thick fur pelt prized by village merchants and armorers.',
  },
  ghoul_blood: {
    name: 'Necrophage Blood',
    description: 'Caustic alchemical reagent harvested from forest ghouls.',
  },
  monster_claw: {
    name: 'Razor Monster Claw',
    description: 'Hardened claw used in blade oils and school gear.',
  },
  cursed_essence: {
    name: 'Cursed Essence',
    description: 'Concentrated dark magic dropped by wraiths and hags.',
  },
  demon_heart: {
    name: 'Archdemon Heart',
    description: 'Fiery core of an abyssal demon.',
  },
  hydra_heart: {
    name: 'Heart of the Swamp Mother',
    description: 'Regenerating organ of the multi-headed Hydra.',
  },
  king_crown_shard: {
    name: 'Shard of Malakor’s Crown',
    description: 'Royal relic imbued with the power of the Old Kingdom.',
  },
  rune_fire: {
    name: 'Igni Runestone',
    description: 'Socket into a weapon or armor: +15% Fire & Sign power.',
  },
  rune_frost: {
    name: 'Morana Runestone',
    description: 'Socket into a weapon or armor: +12% Attack & Frost chill.',
  },
  rune_vamp: {
    name: 'Blood Runestone',
    description: 'Socket into a weapon or armor: restores HP on every strike.',
  },
  rune_frost_sup: {
    name: 'Grand Frost Runestone',
    description: 'Ancient runestone of the Crystal Colossus (+22% Attack & Defense).',
  },
  rune_void_sup: {
    name: 'Primordial Void Runestone',
    description: 'Apex runestone of the Eclipse (+35% to all combat attributes).',
  },
  trophy_werewolf: {
    name: 'Trophy: Alpha Werewolf Head',
    description: 'Belt Trophy: +10% Critical Hit Chance.',
  },
  trophy_noonwraith: {
    name: 'Trophy: Noonwraith Veil',
    description: 'Belt Trophy: +20% Sign Intensity.',
  },
  trophy_gargoyle: {
    name: 'Trophy: Gargoyle Horn',
    description: 'Belt Trophy: +20 Armor Defense & +15% Gold found.',
  },
  bp_raven_armor: {
    name: 'Blueprint: School of the Raven Armor',
    description: 'Master diagram for forging the School of the Raven brigandine.',
  },
  bp_bear_armor: {
    name: 'Blueprint: School of the Bear Plate',
    description: 'Heavy armor schematic from the Ruined Fortress.',
  },
  bp_flame_armor: {
    name: 'Blueprint: School of the Flame Cuirass',
    description: 'Sanctuary schematic for the crimson sign-weaver armor.',
  },
  bp_frost_warden: {
    name: 'Blueprint: Frost Warden Armor',
    description: 'Diagram from the Dead Mines of Silvertooth Pass.',
  },
  bp_grandmaster_ash: {
    name: 'Blueprint: Grandmaster Ash Armor',
    description: 'Secret grandmaster diagram from the Black Bastion.',
  },
  bp_obsidian_void: {
    name: 'Blueprint: Obsidian Void Plate',
    description: 'Forbidden diagram from the Throne of the Void.',
  },
  bp_plague_scythe: {
    name: 'Blueprint: Scythe of the Plague Reaper',
    description: 'Weapon diagram found in the Gallows Swamp.',
  },
  bp_black_cleaver: {
    name: 'Blueprint: Black Ore Cleaver',
    description: 'Weapon diagram from the eastern adit of the Dead Mines.',
  },
  bp_void_voice: {
    name: 'Blueprint: Voice of the Void',
    description: 'Mythic silver sword diagram from the Eclipse Crater.',
  },
  bp_sun_eater: {
    name: 'Blueprint: Sun-Eater Greatsword',
    description: 'Relic greatsword diagram of the Crimson Sun.',
  },
};

const EN_BIOME_NAMES: Record<string, string> = {
  'Деревня Воронья Падь': 'Crow’s Hollow Village',
  'Забытые земли Вальдмарка': 'Forgotten Lands of Valdmark',
  'Старый лес': 'The Old Forest',
  'Проклятое святилище': 'Cursed Sanctuary',
  'Разрушенная крепость': 'Ruined Fortress',
  'Пепельный погост (Акт II)': 'Ashen Cemetery (Act II)',
  'Катакомбы Древних Королей': 'Catacombs of the Ancient Kings',
  'Тракт Висельников и Топи': 'Gallows Road & Drowned Marshes',
  'Среброзубый Перевал и Шахты': 'Silvertooth Pass & Dead Mines',
  'Чёрный Бастион Братства Пепла': 'Black Bastion of the Brotherhood',
  'Кратер Затмения (Зал Трона)': 'Eclipse Crater (Throne of the Void)',
};

const EN_TEXT_PHRASES: Record<string, string> = {
  'Староста Бран (Боримир)': 'Elder Bran (Borimir)',
  'Глава деревни Воронья Падь · Вальдмарк': 'Village Elder of Crow’s Hollow · Valdmark',
  'Глава деревни Воронья Падь': 'Village Elder of Crow’s Hollow',
  'Кузнец Торн (Гром)': 'Blacksmith Thorn (Grom)',
  'Оружейник старой гвардии Вальдмарка': 'Armorer of Valdmark’s Old Guard',
  'Торговец Велеслав': 'Merchant Veleslav',
  'Странствующий купец и трактирщик': 'Wandering Trader & Innkeeper',
  'Травница Марфа': 'Herbalist Marfa',
  'Знахарка и хранительница Лесного Ковена': 'Healer & Keeper of the Forest Coven',
  'Инквизитор Лазарь': 'Inquisitor Lazarus',
  'Командор Ордена Алого Солнца (Акт II)': 'Commander of the Order of the Crimson Sun',
  'Король-Лич Малакор Бессмертный': 'Lich King Malakor the Undying',
  'Лодочник Харон': 'Ferryman Charon',
  'Старый Рудокоп Бром': 'Old Miner Brom',
  'Выживший Адепт Каэль': 'Surviving Adept Kael',
  'Грандмастер Веспер': 'Grandmaster Vesper',
  'Лира из Вольной Роты': 'Lyra of the Free Company',
  'Брат Торвальд': 'Brother Thorvald',
  'Бард Корвин Песнопевец': 'Bard Corwin the Songweaver',
  'Караванщик Радован': 'Caravaneer Radovan',
  'Я скоро вернусь.': 'I will return shortly.',
  'В другой раз.': 'Another time.',
  'Прощай.': 'Farewell.',
  'Береги себя, Марфа.': 'Stay safe, Marfa.',
  'Выдвигаюсь немедленно.': 'I am heading out immediately.',
  'Благодарю за награду.': 'Thank you for the reward.',
  'Благодарю.': 'Thank you.',
  'Спасибо за совет.': 'Thank you for the counsel.',
  'Отойти от алтаря.': 'Step away from the altar.',
  'Я приму решение позже.': 'I will decide later.',
};

export function t(first: string, second: string = 'ru'): string {
  const isFirstLang = first === 'ru' || first === 'en';
  const lang: GameLanguage = isFirstLang
    ? (first as GameLanguage)
    : second === 'en'
      ? 'en'
      : 'ru';
  const key = isFirstLang ? second : first;
  return UI_TEXT[lang]?.[key] ?? UI_TEXT.ru[key] ?? key;
}

export function localizeItem(item: GameItem, lang: GameLanguage): GameItem {
  if (lang === 'ru') return item;
  const tr = EN_ITEM_TRANSLATIONS[item.id];
  if (!tr) return item;
  return {
    ...item,
    name: tr.name,
    description: tr.description,
  };
}

export function localizeBiomeName(ruName: string, lang: GameLanguage): string {
  if (lang === 'ru') return ruName;
  return EN_BIOME_NAMES[ruName] ?? ruName;
}

export function localizeSkill(skill: SkillNode, lang: GameLanguage): SkillNode {
  if (lang === 'ru') return skill;
  const map: Record<string, { name: string; description: string }> = {
    skill_blade_mastery: {
      name: 'School of the Raven Blade Mastery',
      description: 'Increases Steel and Silver sword attack power by +15% per rank.',
    },
    skill_vitality: {
      name: 'Smoldering Blood Mutation',
      description: 'Increases Maximum Vitality by +30 HP and natural resilience.',
    },
    skill_sign_intensity: {
      name: 'Ashen Sign Weaving',
      description: 'Boosts the power and duration of all 5 Magical Signs by +20% per rank.',
    },
    skill_alchemy_tolerance: {
      name: 'Alchemical Adaptation',
      description: 'Increases Maximum Toxicity threshold by +25 and elixir potency.',
    },
    skill_fleet_foot: {
      name: 'Shadow Step Reflexes',
      description: 'Reduces dodge stamina cost and increases critical strike chance by +5%.',
    },
  };
  const found = map[skill.id];
  return found ? { ...skill, name: found.name, description: found.description } : skill;
}

export function localizeQuest(quest: Quest, lang: GameLanguage): Quest {
  if (lang === 'ru') return quest;
  const qMap: Record<string, { title: string; description: string; biome: string; stages?: string[] }> = {
    quest_missing_hunters: {
      title: 'missing Hunters & Footsteps of Ash',
      description:
        'Speak with Elder Bran in Crow’s Hollow, inspect Vesper’s abandoned camp with Hunter Senses [V], and slay the ghoul pack near the wrecked wagon.',
      biome: 'Crow’s Hollow / Old Forest',
      stages: [
        'Speak with Elder Bran in Crow’s Hollow',
        'Inspect Vesper’s old camp at the forest edge [E]',
        'Examine the bloody tracks by the wrecked wagon [E]',
        'Slay the Black Dew ghoul pack (3)',
        'Return to Elder Bran for your reward',
      ],
    },
    quest_cursed_sanctuary: {
      title: 'Whispers of the Cursed Sanctuary',
      description:
        'Herbalist Marfa sensed dark rituals in the southwest marsh. Investigate the Cursed Sanctuary, defeat Swamp Hag Morana, and decide the fate of the Void Crystal.',
      biome: 'Cursed Sanctuary',
      stages: [
        'Speak with Herbalist Marfa in the village',
        'Inspect the runic obelisk & alchemist notes in the Sanctuary',
        'Defeat Swamp Hag Morana',
        'Decide the fate of the Cursed Altar [E]',
      ],
    },
    quest_ancient_guardian: {
      title: 'Shadow of the Ruined Fortress',
      description:
        'Breach the Ruined Fortress in the northeast, slay the elite Forest Demon at the gates, and defeat the Ancient Crown Guardian in the throne room.',
      biome: 'Ruined Fortress',
      stages: [
        'Slay the Forest Archdemon guarding the fortress gate',
        'Defeat the Ancient Crown Guardian inside the citadel',
      ],
    },
    quest_act2_malakor: {
      title: 'Act II: Night of the Ashen Eclipse',
      description:
        'Meet Inquisitor Lazarus at the Order camp in the south, choose your allegiance, and confront Lich King Malakor in the Ashen Cemetery.',
      biome: 'Ashen Cemetery',
      stages: [
        'Speak with Inquisitor Lazarus at the southern camp',
        'Defeat or redeem Lich King Malakor the Undying',
      ],
    },
    quest_north_swamp: {
      title: 'Northern March I: The Drowned Marshes',
      description:
        'Cross the Northern Outpost to Gallows Road, speak with Ferryman Charon, repair the ferry winch, and slay the Swamp Hydra.',
      biome: 'Gallows Road & Marshes',
    },
    quest_north_mountain: {
      title: 'Northern March II: Silvertooth Pass',
      description:
        'Aid Old Miner Brom in the frozen canyon, activate the mine lift, shatter the Crystal Colossus’s 3 Black Ore crystals with Impulse/Heavy hits, and defeat it.',
      biome: 'Silvertooth Pass',
    },
    quest_north_bastion: {
      title: 'Northern March III: The Black Bastion',
      description:
        'Return to the ruined fortress of the Brotherhood of Ash, complete the Trial of Three Seals, and duel Grandmaster Vesper.',
      biome: 'Black Bastion',
    },
    quest_north_eclipse: {
      title: 'Finale: Heart of the Void',
      description:
        'Enter the Eclipse Crater, vanquish the Avatar of the Void, and choose the ultimate fate of Valdmark at the Primordial Altar.',
      biome: 'Eclipse Crater',
    },
  };
  const tr = qMap[quest.id];
  if (!tr) return quest;
  return {
    ...quest,
    title: tr.title,
    description: tr.description,
    biome: tr.biome,
    stages: quest.stages.map((st, idx) => ({
      ...st,
      description: tr.stages?.[idx] ?? st.description,
    })),
  };
}

export function localizeDialogueNode(node: DialogueNode | null, lang: GameLanguage): DialogueNode | null {
  if (!node || lang === 'ru') return node;

  const nodeTranslations: Record<string, { text: string; options?: Record<string, string> }> = {
    elder_root: {
      text: 'Corvus of the Brotherhood of Ash... So the rumors are true — another Ash-Hunter with amber eyes has arrived in our valley. Your mentor Vesper was here three moons ago asking about the Black Dew before heading into the Old Forest. Since then, creatures of the Eclipse have been pouring out of the marshes and Malakor’s Ruined Fortress!',
      options: {
        opt_q1_accept: 'I will track the missing hunters and check the trail Vesper took.',
        opt_q1_turnin: 'The hunters are dead. I slew the pack of Black Dew ghouls near the wrecked wagon.',
        opt_q3_info: 'Tell me about the Night of the Ashen Eclipse, Malakor, and the Ruined Fortress.',
        opt_elder_vesper_lore: 'What exactly was my mentor Vesper searching for here?',
        opt_elder_belltower: '🔍 [Investigation: Blood on the Belltower] "What are these nightly murders near the old belltower?"',
        opt_elder_contracts: 'Show me the witcher contracts from the Notice Board.',
        opt_elder_dice: 'Care for a round of Dice of Fate for gold?',
        opt_close: 'I will return shortly.',
      },
    },
    elder_q1_details: {
      text: 'Head northwest to the edge of the Old Forest. Vesper’s old camp and journal remain by the stones. Hold [V] to awaken your Ash-Hunter Senses — they will highlight claw tracks and ancient parchments alike.',
      options: {
        opt_go: 'I am heading out immediately.',
      },
    },
    blacksmith_root: {
      text: 'Eyes of smoldering amber and twin blades on your back... It has been a long time since I saw a brother from Kaer-Ash, Corvus! Brought iron ore or Brotherhood diagrams? I can forge School of the Raven, Bear, or Flame armor and socket ancient runes!',
      options: {
        opt_open_smith: 'Open the Forge (Tempering, School Armors & Runes)',
        opt_smith_lore: 'Did you forge weapons for Valdmark’s Royal Guard before the Eclipse?',
        opt_smith_interrogate: '🔍 [Interrogate Suspect] "A bloodied scrap of your blacksmith apron was found on the belltower beam, Thorn."',
        opt_smith_dice: 'Play a round of Dice of Fate for gold',
        opt_leave_smith: 'Another time.',
      },
    },
    merchant_root: {
      text: 'Welcome to the Crow’s Hollow outpost, Ash-Hunter! Folk whisper that Smoldering Blood brings misfortune, but your crowns ring as true as royal gold. Elixirs, runestones, rare herbs — or a game of Dice of Fate?',
      options: {
        opt_open_shop: 'Browse merchant goods (Trade)',
        opt_merchant_lore: 'What rumors travel the roads about the Catacombs and the Mad Bard?',
        opt_merchant_dice: 'Play a round of Dice of Fate for gold',
        opt_leave_shop: 'Farewell.',
      },
    },
    herbalist_root: {
      text: 'Your Smoldering Blood smells of wormwood and ash, Corvus of the Raven. Do you hear the hum from the southwest? In the Cursed Sanctuary the renegade hag Morana feeds a shard of the Void Heart with Black Dew!',
      options: {
        opt_start_q2: 'I will investigate the Cursed Sanctuary and stop Morana’s ritual.',
        opt_herbalist_lore: 'Tell me about the Black Dew and the role of the Forest Coven.',
        opt_herb_interrogate: '🔍 [Interrogate Suspect] "Villagers blame your tame wolf for the belltower killings."',
        opt_heal: 'Can you dress my wounds and purge alchemical toxicity from my blood?',
        opt_leave_herb: 'Stay safe, Marfa.',
      },
    },
  };

  const specific = nodeTranslations[node.id];
  return {
    ...node,
    speaker: EN_TEXT_PHRASES[node.speaker] ?? node.speaker,
    role: EN_TEXT_PHRASES[node.role] ?? node.role,
    text: specific?.text ?? node.text,
    options: node.options.map((opt) => ({
      ...opt,
      text: specific?.options?.[opt.id] ?? EN_TEXT_PHRASES[opt.text] ?? opt.text,
    })),
  };
}

export const SIGN_TRANSLATIONS_EN: Record<string, { name: string; description: string }> = {
  flame: {
    name: 'Sign of Flame (Ignis)',
    description: 'Unleashes a scorching cone of witcher fire that burns enemies and illuminates the darkness.',
  },
  barrier: {
    name: 'Sign of Barrier (Quen)',
    description: 'Weaves an amber runic shield that absorbs incoming strikes and reflects shockwaves.',
  },
  impulse: {
    name: 'Sign of Impulse (Aard)',
    description: 'Releases a telekinetic shockwave that knocks back and stuns surrounding foes.',
  },
  illusion: {
    name: 'Sign of Mind (Axii)',
    description: 'Clouds enemy minds with a psychic hex, stunning and weakening their defenses.',
  },
  frost: {
    name: 'Sign of Frost (Yrden-Glacius)',
    description: 'Anchors a crystalline frost glyph on the ground that slows and freezes enemies inside.',
  },
};

