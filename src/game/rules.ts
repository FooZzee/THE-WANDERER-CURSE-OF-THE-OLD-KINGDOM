import type {
  BestiaryEntry,
  BiomeId,
  EnemyData,
  GameItem,
  MagicSignInfo,
  PlayerStats,
  Quest,
  SignType,
  SkillNode,
  WaystoneData,
  WeatherType,
  WitcherSetId,
} from './types.ts';

export const WAYSTONES: WaystoneData[] = [
  {
    id: 'waystone_village',
    name: 'Камень Вороньей Пади',
    biomeName: 'Деревня Воронья Падь',
    x: 4,
    z: 6,
    unlockedByDefault: true,
  },
  {
    id: 'waystone_fortress',
    name: 'Камень Северной Заставы',
    biomeName: 'Разрушенная крепость',
    x: 56,
    z: -56,
  },
  {
    id: 'waystone_cemetery',
    name: 'Камень Пепельного Погоста',
    biomeName: 'Пепельный Погост и Лагерь Ордена',
    x: -6,
    z: 62,
  },
  {
    id: 'waystone_swamp',
    name: 'Камень Затопленных Топей',
    biomeName: 'Тракт Висельников и Затопленные Топи',
    x: -8,
    z: -145,
  },
  {
    id: 'waystone_pass',
    name: 'Камень Среброзубого Перевала',
    biomeName: 'Среброзубый Перевал и Мёртвые Шахты',
    x: 6,
    z: -255,
  },
  {
    id: 'waystone_bastion',
    name: 'Камень Чёрного Бастиона',
    biomeName: 'Чёрный Бастион Братства Пепла',
    x: 0,
    z: -365,
  },
  {
    id: 'waystone_crater',
    name: 'Камень Кратера Затмения',
    biomeName: 'Кратер Затмения и Зал Трона Пустоты',
    x: 0,
    z: -468,
  },
];

export const MAGIC_SIGNS: Record<SignType, MagicSignInfo> = {
  flame: {
    id: 'flame',
    name: 'Пламя (Игнис)',
    runicName: 'IGNIS',
    description: 'Выпускает огненную волну перед героем, нанося урон и поджигая врагов.',
    staminaCost: 35,
    cooldown: 4.0,
    color: '#f97316',
    hexColor: 0xf97316,
  },
  barrier: {
    id: 'barrier',
    name: 'Барьер (Эгида)',
    runicName: 'AEGIS',
    description: 'Создаёт защитную руническую оболочку, поглощающую входящий урон.',
    staminaCost: 40,
    cooldown: 7.0,
    color: '#eab308',
    hexColor: 0xeab308,
  },
  impulse: {
    id: 'impulse',
    name: 'Импульс (Аард)',
    runicName: 'IMPULSE',
    description: 'Телекинетический удар, отбрасывающий и оглушающий противников.',
    staminaCost: 30,
    cooldown: 5.0,
    color: '#38bdf8',
    hexColor: 0x38bdf8,
  },
  illusion: {
    id: 'illusion',
    name: 'Иллюзия (Морок)',
    runicName: 'MOROK',
    description: 'Туманит разум врагов поблизости, отвлекая их и прерывая агрессию.',
    staminaCost: 35,
    cooldown: 8.0,
    color: '#a855f7',
    hexColor: 0xa855f7,
  },
  frost: {
    id: 'frost',
    name: 'Ледяная печать',
    runicName: 'GLACIES',
    description: 'Чертит на земле морозный круг, резко замедляющий и сковывающий врагов.',
    staminaCost: 35,
    cooldown: 6.5,
    color: '#2dd4bf',
    hexColor: 0x2dd4bf,
  },
};

export const BESTIARY_ENTRIES: BestiaryEntry[] = [
  {
    id: 'bestiary_wolf',
    type: 'wolf',
    name: 'Серый и Матерый Волк Чёрной Росы',
    title: 'Хищники Старого леса Вальдмарка',
    category: 'Звери',
    lore: 'Оголодавшие лесные стаи Вальдмарка, испившие Чёрной Росы после Ночи Пепельного Затмения. Координируют атаки: стоит одному волку заметить путника, как вся стая бросается в погоню и совершает стремительные прыжки к горлу.',
    weaknessSigns: ['Пламя (Игнис)', 'Импульс (Аард)'],
    weaknessOil: 'Стальной клинок',
    trophyBonus: 'Волчья шкура (ресурс для брони Школ)',
    dangerLevel: 1,
  },
  {
    id: 'bestiary_ghoul',
    type: 'ghoul',
    name: 'Упырь-падальщик Затмения',
    title: 'Трупоеды лесных чащоб и трактов',
    category: 'Трупоеды',
    lore: 'Бывшие мародёры и крестьяне Вальдмарка, чьи тела после Затмения исказила Чёрная Роса. Ведомые запахом Тлеющей Крови, в ближнем бою обрушивают яростную серию из трёх быстрых ударов когтями.',
    weaknessSigns: ['Пламя (Игнис)', 'Ледяная печать (Ирден)'],
    weaknessOil: 'Масло против трупоедов (+30% урона)',
    trophyBonus: 'Кровь упыря и когти монстра',
    dangerLevel: 2,
  },
  {
    id: 'bestiary_hag',
    type: 'hag',
    name: 'Болотная ведьма Морана',
    title: 'Отступница Лесного Ковена',
    category: 'Реликты и Ведьмы',
    lore: 'Древняя ведунья топей, предавшая Лесной Ковен ради осколка Сердца Пустоты. Держит дистанцию, мечет сгустки болотной порчи и растворяется в тумане при попытке подойти вплотную.',
    weaknessSigns: ['Ледяная печать (Ирден)', 'Импульс (Аард)'],
    weaknessOil: 'Масло против проклятых (+30% урона)',
    trophyBonus: 'Проклятая эссенция',
    dangerLevel: 3,
  },
  {
    id: 'bestiary_werewolf',
    type: 'werewolf',
    name: 'Альфа-Воколак («Вой в ночи»)',
    title: 'Именной монстр по контракту',
    category: 'Проклятые',
    lore: 'Королевский ловчий Вальдмарка, обращённый Чёрной Росой в чудовищного оборотня. Его плоть мгновенно затягивает раны, пока зверь не охвачен огнём Печати «Пламя». На половине здоровья созывает волчью стаю.',
    weaknessSigns: ['Пламя (Игнис) — блокирует регенерацию'],
    weaknessOil: 'Масло против проклятых (+30% урона)',
    trophyBonus: 'Трофей Альфа-Воколака (+15% шанс крит. удара)',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_noonwraith',
    type: 'noonwraith',
    name: 'Полуденница Аделина («Невеста у колодца»)',
    title: 'Именной призрак заброшенного хутора',
    category: 'Призраки',
    lore: 'Неупокоенный дух невесты Аделины, преданной женихом в дни Затмения. В бою уходит в астральную форму и становится неуязвимой для серебра, пока не попадёт в круг «Ледяной печати» или под волну «Импульса».',
    weaknessSigns: ['Ледяная печать (Ирден)', 'Импульс (Аард) — снимают астрал'],
    weaknessOil: 'Масло против призраков (+30% урона)',
    trophyBonus: 'Трофей Полуденницы (+4 ОЗ/сек регенерация)',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_gargoyle',
    type: 'gargoyle',
    name: 'Древняя Горгулья («Каменный жнец»)',
    title: 'Именной страж королевских руин',
    category: 'Конструкты',
    lore: 'Ожившая в Ночь Пепельного Затмения гранитная статуя крепости Вальдмарка. Её каменный панцирь отражает быстрые выпады спереди — пробить броню способны лишь тяжёлые удары и атаки в спину.',
    weaknessSigns: ['Барьер (Квен)', 'Импульс (Аард)'],
    weaknessOil: 'Масло против призраков и реликтов (+30% урона)',
    trophyBonus: 'Трофей Горгульи (+15% к находимому золоту)',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_demon',
    type: 'demon',
    name: 'Лесной Архидемон Бездны',
    title: 'Рогатый страж Разрушенной крепости',
    category: 'Реликты',
    lore: 'Порождение разлома под Королевской Горой, вышедшее на поверхность в час Затмения. Наносит сокрушительные удары по площади (AoE), перед которыми земля вокруг него раскаляется багровым кругом.',
    weaknessSigns: ['Барьер (Квен)', 'Ледяная печать (Ирден)'],
    weaknessOil: 'Масло против проклятых (+30% урона)',
    trophyBonus: 'Сердце демона',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_boss',
    type: 'boss',
    name: 'Древний Хранитель Короны',
    title: 'Страж тронного зала Вальдмарка (Акт I)',
    category: 'Боссы',
    lore: 'Закованный в реликтовые латы лорд-командор королевской гвардии Малакора, принесённый в жертву Сердцу Пустоты. Во второй фазе боя (<50% ОЗ) впадает в пепельную ярость и обрушивает веер энергетических волн.',
    weaknessSigns: ['Барьер (Квен)', 'Пламя (Игнис)', 'Иллюзия (Аксий)'],
    weaknessOil: 'Масло против призраков и реликтов',
    trophyBonus: 'Осколок Древней Короны и Клинок Старого Королевства',
    dangerLevel: 5,
  },
  {
    id: 'bestiary_malakor',
    type: 'malakor',
    name: 'Король-Лич Малакор Бессмертный',
    title: 'Последний монарх Вальдмарка (Акт II)',
    category: 'Владыка Проклятия',
    lore: 'Последний король династии Вальдмарка, заключивший пакт с «Сердцем Пустоты» в Ночь Пепельного Затмения. Сражается в 3 фазах: в 1-й рубит руническим двуручником, во 2-й укрывается щитом филактерий и бьёт метеоритами, а в 3-й обрушивает бурю молний Пустоты.',
    weaknessSigns: ['Барьер (Квен)', 'Импульс (Аард)', 'Пламя (Игнис)'],
    weaknessOil: 'Масло против призраков (+30% урона)',
    trophyBonus: 'Корона Падшего Короля Малакора',
    dangerLevel: 5,
  },
  // ===========================================================================
  // СЕВЕРНЫЙ ПОХОД: НОВЫЕ ВРАГИ И БОССЫ 4 БИОМОВ
  // ===========================================================================
  {
    id: 'bestiary_drowned',
    type: 'drowned',
    name: 'Болотный Утопленник',
    title: 'Обитатель Затопленных Топей',
    category: 'Трупоеды',
    lore: 'Беженцы из столицы Вальдмарка, утопленные королевскими карателями в трясине у Тракта Висельников. Выпрыгивают из мутной воды, плюются болотной желчью, накладывая отравление и замедление.',
    weaknessSigns: ['Пламя (Игнис)', 'Импульс (Аард)'],
    weaknessOil: 'Масло против трупоедов (+30% урона)',
    trophyBonus: 'Кровь упыря и болотная желчь',
    dangerLevel: 3,
  },
  {
    id: 'bestiary_plague_reaper',
    type: 'plague_reaper',
    name: 'Чумной Жнец',
    title: 'Палач Тракта Висельников',
    category: 'Проклятые',
    lore: 'Бывшие королевские чумные лекари и вешатели, сросшиеся со своими двуручными косами. Окружены облаком трупных миазмов, наносящим урон вблизи, и совершают широкие круговые взмахи.',
    weaknessSigns: ['Пламя (Игнис) — рассеивает миазмы', 'Барьер (Квен)'],
    weaknessOil: 'Масло против проклятых (+30% урона)',
    trophyBonus: 'Проклятая эссенция и осколки косы',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_troglodyte',
    type: 'troglodyte',
    name: 'Горный Троглодит',
    title: 'Мутант Мёртвых Шахт',
    category: 'Огроиды и Мутанты',
    lore: 'Рудокопы Среброзубого Перевала, чьи тела разрослись от испарений Чёрной Руды. Швыряют каменные глыбы издалека и наносят сокрушительные удары кайлом, пробивающие обычный блок.',
    weaknessSigns: ['Иллюзия (Морок)', 'Ледяная печать (Ирден)'],
    weaknessOil: 'Масло против проклятых (+30% урона)',
    trophyBonus: 'Чёрная руда',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_frost_wraith',
    type: 'frost_wraith',
    name: 'Ледяной Призрак Перевала',
    title: 'Дух замёрзших каторжников',
    category: 'Призраки',
    lore: 'Тени горняков, заживо погребённых в обледенелых штольнях. Их прикосновение мгновенно выжигает выносливость охотника и сковывает движения морозным проклятием.',
    weaknessSigns: ['Пламя (Игнис)', 'Импульс (Аард) — сбивает астрал'],
    weaknessOil: 'Масло против призраков (+30% урона)',
    trophyBonus: 'Ледяной лотос и Пыль пустоты',
    dangerLevel: 4,
  },
  {
    id: 'bestiary_fallen_ash',
    type: 'fallen_ash',
    name: 'Падший Зольник',
    title: 'Одержимый брат Школы Пепла',
    category: 'Отступники Братства',
    lore: 'Бывшие братья-охотники Чёрного Бастиона, принявшие сторону Грандмастера Веспера или сломленные шёпотом Пустоты. Владеют стремительным фехтованием, перекатами и применяют против Корвуса те же боевые Печати Пепла.',
    weaknessSigns: ['Импульс (Аард)', 'Иллюзия (Морок)'],
    weaknessOil: 'Стальной клинок и Масло против проклятых',
    trophyBonus: 'Чёрная руда и реликтовые чертежи Бастиона',
    dangerLevel: 5,
  },
  {
    id: 'bestiary_void_knight',
    type: 'void_knight',
    name: 'Рыцарь Пустоты',
    title: 'Бессмертный страж Кратера Затмения',
    category: 'Порождения Бездны',
    lore: 'Элитные телохранители трона, закованные в живой обсидиан. Способны мгновенно телепортироваться сквозь разломы пространства и обрушивать на врага удары багровой молнии.',
    weaknessSigns: ['Барьер (Квен)', 'Ледяная печать (Ирден)'],
    weaknessOil: 'Масло против призраков и реликтов (+30% урона)',
    trophyBonus: 'Пыль пустоты и Чёрная руда',
    dangerLevel: 5,
  },
  {
    id: 'bestiary_boss_hydra',
    type: 'boss_hydra',
    name: 'Матерь Трясины (Болотная Гидра)',
    title: 'Босс Затопленных Топей',
    category: 'Древние Боссы Севера',
    lore: 'Исполинское многоголовое порождение Чёрной Росы, гнездящееся в центре Затопленных Топей. Плюётся разъедающей броню кислотой и призывает из омутов утопленников и болотные щупальца.',
    weaknessSigns: ['Пламя (Игнис) — прижигает регенерацию', 'Барьер (Квен)'],
    weaknessOil: 'Масло против трупоедов (+30% урона)',
    trophyBonus: 'Сердце гидры (Отвар Матери Трясины: иммунитет к яду и регенерация)',
    dangerLevel: 5,
  },
  {
    id: 'bestiary_boss_colossus',
    type: 'boss_colossus',
    name: 'Кристальный Колосс Чёрной Руды',
    title: 'Босс Среброзубого Перевала и Мёртвых Шахт',
    category: 'Древние Боссы Севера',
    lore: 'Огромный голем из живой породы и замёрзшей крови Древнего Бога. Его панцирь почти неуязвим, пока охотник не расколет светящиеся кристальные наросты на его теле знаком «Импульс» (Аард) или сокрушительными тяжёлыми ударами.',
    weaknessSigns: ['Импульс (Аард) — разбивает кристальную броню', 'Барьер (Квен)'],
    weaknessOil: 'Масло против призраков и реликтов',
    trophyBonus: 'Ядро Колосса (Отвар Кристального Колосса: +35% брони и несокрушимость)',
    dangerLevel: 5,
  },
  {
    id: 'bestiary_boss_vesper',
    type: 'boss_vesper',
    name: 'Грандмастер Веспер, Предатель Пепла',
    title: 'Босс Чёрного Бастиона Братства',
    category: 'Древние Боссы Севера',
    lore: 'Приёмный отец и наставник Корвуса, некогда величайший мечник Школы Ворона. Помог Малакору провести ритуал Затмения, чтобы выковать из Корвуса идеальный сосуд против Сердца Пустоты. В дуэли использует парные клинки «Клыки Заката», все 5 Печатей Пепла, ведьмачьи эликсиры и молниеносные контратаки.',
    weaknessSigns: ['Барьер (Квен)', 'Ледяная печать (Ирден)', 'Импульс (Аард)'],
    weaknessOil: 'Безупречная реакция и знание приёмов Школы Ворона',
    trophyBonus: 'Медальон Грандмастера и Парные клинки «Клыки Заката»',
    dangerLevel: 5,
  },
  {
    id: 'bestiary_boss_avatar',
    type: 'boss_avatar',
    name: 'Аватара Сердца Пустоты',
    title: 'Архибосс Кратера Затмения (Финал)',
    category: 'Первобытное Божество Бездны',
    lore: 'Воплощение древней сущности под расколотой Королевской Горой, ставшей причиной Ночи Пепельного Затмения. Сражается в 3 эпохальных фазах: искажает гравитацию, обрушивает реки багровой энергии и призывает из Бездны теневые фантомы поверженных боссов.',
    weaknessSigns: ['Все Пять Печатей Пепла', 'Барьер (Квен)', 'Пламя (Игнис)'],
    weaknessOil: 'Масло против призраков и реликтов (+30% урона)',
    trophyBonus: 'Право решить судьбу Вальдмарка у Алтаря Затмения',
    dangerLevel: 5,
  },
];

/**
 * Deterministic procedural ground height function for the entire region.
 * Flat around the central village and key arenas so buildings sit flush.
 * Seamless Northern Expansion extends from z = -105 to z = -550.
 */
export function getGroundHeight(x: number, z: number): number {
  // Underground Catacombs chamber at (x > 80, z > 80)
  if (x > 75 && z > 75) {
    return 0;
  }

  // Seamless Northern Expansion (z < -102)
  if (z < -102) {
    // Transition blend at z in [-112, -102]
    const northBlend = Math.min(1, Math.max(0, (-102 - z) / 10));

    // Biome 1: Gallows Swamp (z in [-215, -102]) — low-lying sunken mire
    if (z >= -215) {
      const distSwampArena = Math.hypot(x - 0, z - -190);
      const distCharonCamp = Math.hypot(x - -8, z - -145);
      const arenaFlat = Math.min(1, Math.max(0, (distSwampArena - 18) / 10));
      const campFlat = Math.min(1, Math.max(0, (distCharonCamp - 12) / 8));
      // Wooden causeway / boardwalk along x in [-3.5, 3.5]
      if (Math.abs(x) < 3.6) {
        return -0.25 * northBlend;
      }
      const swampWaves =
        Math.sin(x * 0.06) * Math.cos(z * 0.06) * 0.85 * arenaFlat * campFlat - 0.65;
      return swampWaves * northBlend;
    }

    // Biome 2: Silvertooth Pass & Dead Mines (z in [-325, -215]) — ascending rocky canyon
    if (z >= -325) {
      const progress = Math.min(1, Math.max(0, (-215 - z) / 110));
      const baseElevation = progress * 6.5; // Climbs from 0 to +6.5m
      const distColossusArena = Math.hypot(x - 0, z - -300);
      const distBromCamp = Math.hypot(x - 6, z - -255);
      const flatFactor =
        Math.min(1, Math.max(0, (distColossusArena - 20) / 10)) *
        Math.min(1, Math.max(0, (distBromCamp - 12) / 8));
      // Canyon road center vs rocky walls
      const roadFactor = Math.min(1, Math.max(0, (Math.abs(x) - 10) / 18));
      const crags =
        (Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2.6 + roadFactor * 3.2) * flatFactor;
      return baseElevation + crags;
    }

    // Biome 3: Black Bastion of the Brotherhood of Ash (z in [-435, -325]) — mountain plateau at +6.5m
    if (z >= -435) {
      const basePlateau = 6.5;
      const distCourtyard = Math.hypot(x - 0, z - -395);
      const distKaelCamp = Math.hypot(x - 0, z - -355);
      const flatBastion =
        Math.min(1, Math.max(0, (distCourtyard - 26) / 12)) *
        Math.min(1, Math.max(0, (distKaelCamp - 14) / 8));
      const ridges = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 1.4 * flatBastion;
      return basePlateau + ridges;
    }

    // Biome 4: Eclipse Crater & Throne of the Void (z < -435) — descends into obsidian caldera at +3.5m
    const craterProgress = Math.min(1, Math.max(0, (-435 - z) / 25));
    const baseCrater = 6.5 - craterProgress * 3.0; // Settles at +3.5m
    const distThrone = Math.hypot(x - 0, z - -505);
    const flatThrone = Math.min(1, Math.max(0, (distThrone - 28) / 12));
    const rim = Math.min(1, Math.max(0, (Math.abs(x) - 26) / 20)) * 3.5 * flatThrone;
    return baseCrater + rim;
  }

  // Distance from village center (0, 0)
  const distVillage = Math.hypot(x, z);
  // Distance from Cursed Sanctuary (-65, -55)
  const distSanctuary = Math.hypot(x - -65, z - -55);
  // Distance from Ruined Fortress (72, -68)
  const distFortress = Math.hypot(x - 72, z - -68);
  // Distance from Ash Cemetery & Order Camp (0, 74)
  const distCemetery = Math.hypot(x - 0, z - 74);

  // Smoothly flatten key architectural hubs
  const villageFlat = Math.min(1, Math.max(0, (distVillage - 24) / 18));
  const sanctuaryFlat = Math.min(1, Math.max(0, (distSanctuary - 16) / 12));
  const fortressFlat = Math.min(1, Math.max(0, (distFortress - 22) / 14));
  const cemeteryFlat = Math.min(1, Math.max(0, (distCemetery - 20) / 12));

  const flattenFactor = villageFlat * sanctuaryFlat * fortressFlat * cemeteryFlat;

  // River valley cutting from (-120, 32) to (120, 32)
  const riverDist = Math.abs(z - (34 + Math.sin(x * 0.03) * 6));
  const riverDepression = riverDist < 8 ? -1.4 * Math.cos((riverDist / 8) * (Math.PI / 2)) : 0;

  // Bridge over river at x in [-4, 4]
  const onBridge = Math.abs(x) < 4.5 && riverDist < 8.5;
  if (onBridge) {
    return 0.35;
  }

  const hills =
    Math.sin(x * 0.035) * Math.cos(z * 0.035) * 2.2 +
    Math.sin(x * 0.08 + z * 0.06) * 0.75;

  // Elevated plateau for Ruined Fortress
  const fortressElevation =
    distFortress < 34 ? (1 - Math.min(1, Math.max(0, (distFortress - 18) / 16))) * 2.8 : 0;

  return hills * flattenFactor + riverDepression * villageFlat + fortressElevation;
}

/**
 * Determines which biome the coordinates belong to.
 */
export function getBiomeAt(x: number, z: number): { id: BiomeId; name: string } {
  if (x > 75 && z > 75) {
    return { id: 'catacombs', name: 'Подземные Катакомбы Древних Королей' };
  }
  if (z < -435) {
    return { id: 'eclipse_crater', name: 'Кратер Затмения и Зал Трона Пустоты' };
  }
  if (z < -325) {
    return { id: 'ash_bastion', name: 'Чёрный Бастион Братства Пепла' };
  }
  if (z < -215) {
    return { id: 'silver_pass', name: 'Среброзубый Перевал и Мёртвые Шахты' };
  }
  if (z < -105) {
    return { id: 'gallows_swamp', name: 'Тракт Висельников и Затопленные Топи' };
  }
  if (Math.hypot(x, z) < 30) {
    return { id: 'village', name: 'Деревня Воронья Падь' };
  }
  if (Math.hypot(x - -65, z - -55) < 28) {
    return { id: 'cursed_sanctuary', name: 'Проклятое святилище' };
  }
  if (Math.hypot(x - 72, z - -68) < 34) {
    return { id: 'ruined_fortress', name: 'Разрушенная крепость' };
  }
  if (z > 48 && Math.abs(x) < 55) {
    return { id: 'ash_cemetery', name: 'Пепельный Погост и Лагерь Ордена' };
  }
  if (x < -15 && z > -25) {
    return { id: 'old_forest', name: 'Старый лес' };
  }
  return { id: 'forgotten_lands', name: 'Забытые земли' };
}

/**
 * Checks if a target position is within a melee swing hitbox cone.
 */
export function isTargetInAttackCone(
  attackerX: number,
  attackerZ: number,
  attackerRotationY: number,
  targetX: number,
  targetZ: number,
  reach: number,
  halfAngleRad: number
): boolean {
  const dx = targetX - attackerX;
  const dz = targetZ - attackerZ;
  const dist = Math.hypot(dx, dz);
  if (dist > reach) return false;
  if (dist < 0.35) return true; // Point-blank contact

  const forwardX = Math.sin(attackerRotationY);
  const forwardZ = Math.cos(attackerRotationY);

  const dirX = dx / dist;
  const dirZ = dz / dist;

  const dot = forwardX * dirX + forwardZ * dirZ;
  const clampedDot = Math.max(-1, Math.min(1, dot));
  const angle = Math.acos(clampedDot);

  return angle <= halfAngleRad;
}

/**
 * Calculates effective player combat stats taking equipped items, Witcher Set bonuses,
 * Trophy passives, socketed Runes, Elixirs, Decoctions, and skill tree into account.
 */
export function computeEffectivePlayerStats(
  base: PlayerStats,
  inventory: GameItem[],
  skills: SkillNode[]
): {
  steelAttack: number;
  silverAttack: number;
  defense: number;
  maxHp: number;
  signIntensity: number;
  critChance: number;
  goldBonus: number;
  hpRegen: number;
  activeSet: WitcherSetId | null;
  bossDamageMultiplier: number;
} {
  let steelBonus = 0;
  let silverBonus = 0;
  let defenseBonus = 0;
  let hpBonus = 0;
  let signBonus = 0;
  let critChance = 0.1; // 10% base crit chance
  let goldBonus = 0;
  let hpRegen = 0;

  const setCounts: Record<WitcherSetId, number> = {
    raven: 0,
    bear: 0,
    flame: 0,
    grandmaster: 0,
    obsidian: 0,
    frost_warden: 0,
  };

  for (const item of inventory) {
    if (!item.equipped || !item.stats) continue;
    if (item.setId) {
      setCounts[item.setId] = (setCounts[item.setId] ?? 0) + 1;
    }
    const upgMult = 1 + (item.upgradeLevel ?? 0) * 0.15;
    if (item.stats.attack) steelBonus += Math.round(item.stats.attack * upgMult);
    if (item.stats.silverAttack) silverBonus += Math.round(item.stats.silverAttack * upgMult);
    if (item.stats.defense) defenseBonus += Math.round(item.stats.defense * upgMult);
    if (item.stats.maxHealth) hpBonus += Math.round(item.stats.maxHealth * upgMult);
    if (item.stats.signIntensity) signBonus += Math.round(item.stats.signIntensity * upgMult);
    if (item.stats.critChanceBonus) critChance += item.stats.critChanceBonus;
    if (item.stats.goldBonus) goldBonus += item.stats.goldBonus;
    if (item.stats.hpRegenBonus) hpRegen += item.stats.hpRegenBonus;
  }

  let activeSet: WitcherSetId | null = null;
  if (setCounts.grandmaster >= 2) activeSet = 'grandmaster';
  else if (setCounts.obsidian >= 2) activeSet = 'obsidian';
  else if (setCounts.frost_warden >= 2) activeSet = 'frost_warden';
  else if (setCounts.raven >= 2) activeSet = 'raven';
  else if (setCounts.bear >= 2) activeSet = 'bear';
  else if (setCounts.flame >= 2) activeSet = 'flame';

  if (activeSet === 'raven') {
    critChance += 0.2;
  } else if (activeSet === 'bear') {
    defenseBonus = Math.round(defenseBonus * 1.4) + 8;
    hpBonus += 55;
  } else if (activeSet === 'flame') {
    signBonus += 35;
  } else if (activeSet === 'grandmaster') {
    // Tier-5 Set: Empowers all 5 signs (+65% Sign Intensity) & +25% Crit Chance
    signBonus += 65;
    critChance += 0.25;
    hpBonus += 60;
  } else if (activeSet === 'obsidian') {
    // Tier-5 Set: Unbreakable poise & massive armor + reflects 20% damage
    defenseBonus = Math.round(defenseBonus * 1.55) + 16;
    hpBonus += 110;
  } else if (activeSet === 'frost_warden') {
    // Tier-4 Set: Frost blade strikes & high defense/sign hybrid
    defenseBonus = Math.round(defenseBonus * 1.3) + 10;
    signBonus += 40;
    hpBonus += 75;
  }

  // Boss Decoction buffs
  if ((base.decoctionTimer ?? 0) > 0 && base.activeDecoction) {
    if (base.activeDecoction === 'hydra') {
      hpRegen += 8;
      hpBonus += 60;
    } else if (base.activeDecoction === 'colossus') {
      defenseBonus += 22;
      hpBonus += 80;
    } else if (base.activeDecoction === 'vesper') {
      critChance += 0.2;
      signBonus += 40;
    }
  }

  const combatSkill = skills.find((s) => s.id === 'skill_blade_mastery')?.level ?? 0;
  const heavySkill = skills.find((s) => s.id === 'skill_crushing_blow')?.level ?? 0;
  const signSkill = skills.find((s) => s.id === 'skill_runic_focus')?.level ?? 0;
  const vitalitySkill = skills.find((s) => s.id === 'skill_witcher_vitality')?.level ?? 0;

  let totalSteel = base.baseAttack + steelBonus + combatSkill * 5 + heavySkill * 3;
  let totalSilver = base.baseAttack + silverBonus + combatSkill * 5 + heavySkill * 3;

  // Thunder Elixir ("Гром"): +35% attack
  if ((base.thunderElixirTimer ?? 0) > 0) {
    totalSteel = Math.round(totalSteel * 1.35);
    totalSilver = Math.round(totalSilver * 1.35);
  }

  // Vesper Decoction: +20% sword damage
  if ((base.decoctionTimer ?? 0) > 0 && base.activeDecoction === 'vesper') {
    totalSteel = Math.round(totalSteel * 1.2);
    totalSilver = Math.round(totalSilver * 1.2);
  }

  const totalDefense = base.baseDefense + defenseBonus + vitalitySkill * 3;
  const totalMaxHp = base.maxHp + hpBonus + vitalitySkill * 25;
  const placeOfPowerBuff = (base.placeOfPowerTimer ?? 0) > 0 ? 25 : 0;
  const totalSignIntensity = base.signIntensity + signBonus + signSkill * 15 + placeOfPowerBuff;

  // «Хранитель Памяти Вальдмарка»: +15% damage against bosses when >= 12 lore texts are collected (+25% if all 22 collected)
  const loreCount = base.discoveredLoreIds?.length ?? 0;
  const isLoreMaster = Boolean(base.loreMasterUnlocked) || loreCount >= 12;
  const bossDamageMultiplier = loreCount >= 22 ? 1.25 : isLoreMaster ? 1.15 : 1.0;

  return {
    steelAttack: totalSteel,
    silverAttack: totalSilver,
    defense: totalDefense,
    maxHp: totalMaxHp,
    signIntensity: totalSignIntensity,
    critChance,
    goldBonus,
    hpRegen,
    activeSet,
    bossDamageMultiplier,
  };
}

/**
 * Calculates damage dealt by player to an enemy.
 */
export function calculatePlayerAttackDamage(params: {
  steelAttack: number;
  silverAttack: number;
  isHeavy: boolean;
  comboStep: number; // 1, 2, 3
  enemy: Pick<EnemyData, 'isSilverVulnerable' | 'state'> &
    Partial<Pick<EnemyData, 'type' | 'isContractBoss'>>;
  bossDamageMultiplier?: number;
}): number {
  const baseDmg = params.enemy.isSilverVulnerable ? params.silverAttack : params.steelAttack;
  const heavyMult = params.isHeavy ? 1.75 : 1.0;
  const comboMult = 1 + (Math.max(1, Math.min(3, params.comboStep)) - 1) * 0.15;
  const stunBonus = params.enemy.state === 'STUNNED' ? 1.25 : 1.0;

  const isBossEnemy =
    params.enemy.isContractBoss ||
    params.enemy.type === 'boss' ||
    params.enemy.type === 'malakor' ||
    params.enemy.type === 'boss_hydra' ||
    params.enemy.type === 'boss_colossus' ||
    params.enemy.type === 'boss_vesper' ||
    params.enemy.type === 'boss_avatar' ||
    params.enemy.type === 'werewolf' ||
    params.enemy.type === 'noonwraith' ||
    params.enemy.type === 'gargoyle' ||
    params.enemy.type === 'demon' ||
    params.enemy.type === 'hag';

  const bossMult =
    isBossEnemy && params.bossDamageMultiplier ? params.bossDamageMultiplier : 1.0;

  return Math.max(1, Math.round(baseDmg * heavyMult * comboMult * stunBonus * bossMult));
}

/**
 * Calculates incoming damage to player after armor defense, block, dodge, and Barrier Sign.
 */
export function calculateIncomingPlayerDamage(params: {
  rawDamage: number;
  defense: number;
  isDodging: boolean;
  isBlocking: boolean;
  barrierShield: number;
}): {
  hpDamage: number;
  remainingBarrier: number;
  parried: boolean;
  dodged: boolean;
} {
  if (params.isDodging) {
    return {
      hpDamage: 0,
      remainingBarrier: params.barrierShield,
      parried: false,
      dodged: true,
    };
  }

  let mitigated = Math.max(2, params.rawDamage - params.defense * 0.45);
  let parried = false;

  if (params.isBlocking) {
    mitigated *= 0.25;
    parried = true;
  }

  mitigated = Math.round(mitigated);

  if (params.barrierShield > 0) {
    if (params.barrierShield >= mitigated) {
      return {
        hpDamage: 0,
        remainingBarrier: params.barrierShield - mitigated,
        parried,
        dodged: false,
      };
    } else {
      const leftover = mitigated - params.barrierShield;
      return {
        hpDamage: leftover,
        remainingBarrier: 0,
        parried,
        dodged: false,
      };
    }
  }

  return {
    hpDamage: mitigated,
    remainingBarrier: 0,
    parried,
    dodged: false,
  };
}

/**
 * Applies XP and handles multi-level-up progression.
 */
export function applyExperienceGain(
  stats: PlayerStats,
  gainedXp: number
): { updated: PlayerStats; leveledUp: boolean } {
  const next = { ...stats, xp: stats.xp + gainedXp };
  let leveledUp = false;

  while (next.xp >= next.xpToNext) {
    next.xp -= next.xpToNext;
    next.level += 1;
    next.xpToNext = Math.round(next.xpToNext * 1.45);
    next.skillPoints += 1;
    next.maxHp += 20;
    next.hp = next.maxHp;
    next.maxStamina += 10;
    next.stamina = next.maxStamina;
    next.baseAttack += 4;
    next.baseDefense += 2;
    leveledUp = true;
  }

  return { updated: next, leveledUp };
}

/**
 * Calculates blacksmith upgrade cost for an item.
 */
export function getUpgradeCost(item: GameItem): { gold: number; oreCount: number } {
  const level = item.upgradeLevel ?? 0;
  return {
    gold: 60 + level * 55,
    oreCount: 1 + Math.floor(level / 2),
  };
}

/**
 * Advances a quest stage and returns whether the stage or entire quest completed.
 */
export function advanceQuestStage(
  quest: Quest,
  stageId: string
): { updatedQuest: Quest; stageCompleted: boolean; questCompleted: boolean } {
  if (quest.status !== 'active') {
    return { updatedQuest: quest, stageCompleted: false, questCompleted: false };
  }

  const currentStage = quest.stages[quest.currentStageIndex];
  if (!currentStage || currentStage.id !== stageId) {
    return { updatedQuest: quest, stageCompleted: false, questCompleted: false };
  }

  const newStages = quest.stages.map((s, idx) =>
    idx === quest.currentStageIndex ? { ...s, completed: true } : s
  );

  const nextIndex = quest.currentStageIndex + 1;
  const isFinished = nextIndex >= newStages.length;

  return {
    updatedQuest: {
      ...quest,
      stages: newStages,
      currentStageIndex: isFinished ? quest.currentStageIndex : nextIndex,
      status: isFinished ? 'completed' : 'active',
    },
    stageCompleted: true,
    questCompleted: isFinished,
  };
}

/**
 * Evaluates a 5-dice hand in "Кости Судьбы" (Dice Poker).
 */
export function evaluateDicePokerHand(dice: number[]): {
  rank: number;
  name: string;
  score: number;
} {
  const counts = new Map<number, number>();
  let sum = 0;
  for (const d of dice) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
    sum += d;
  }
  const freqs = Array.from(counts.values()).sort((a, b) => b - a);
  const uniqueSorted = Array.from(counts.keys()).sort((a, b) => a - b);
  const isStraight =
    uniqueSorted.length === 5 && uniqueSorted[4] - uniqueSorted[0] === 4;

  if (freqs[0] === 5) return { rank: 8, name: 'Покер (5 одинаковых)', score: 800 + sum };
  if (freqs[0] === 4) return { rank: 7, name: 'Каре (4 одинаковых)', score: 700 + sum };
  if (freqs[0] === 3 && freqs[1] === 2) return { rank: 6, name: 'Фулл-хаус (3 + 2)', score: 600 + sum };
  if (isStraight) return { rank: 5, name: 'Стрит (5 по порядку)', score: 500 + sum };
  if (freqs[0] === 3) return { rank: 4, name: 'Сет (Тройка)', score: 400 + sum };
  if (freqs[0] === 2 && freqs[1] === 2) return { rank: 3, name: 'Две пары', score: 300 + sum };
  if (freqs[0] === 2) return { rank: 2, name: 'Пара', score: 200 + sum };
  return { rank: 1, name: 'Старшая кость', score: 100 + sum };
}

export const BESTIARY_DATA = BESTIARY_ENTRIES;

export interface AlchemyRecipe {
  id:
    | 'potion_swallow'
    | 'potion_thunderbolt'
    | 'potion_cat'
    | 'potion_blizzard'
    | 'decoction_hydra'
    | 'decoction_colossus'
    | 'decoction_vesper';
  name: string;
  description: string;
  ingredients: { itemId: string; name: string; count: number }[];
}

export const ALCHEMY_RECIPES: AlchemyRecipe[] = [
  {
    id: 'potion_swallow',
    name: 'Эликсир «Ласточка» (x2)',
    description: 'Восстанавливает 65 ед. здоровья в бою (+22 Токсичности).',
    ingredients: [{ itemId: 'herb_swallow', name: 'Ласточкина трава', count: 1 }],
  },
  {
    id: 'potion_thunderbolt',
    name: 'Эликсир «Гром» (x2)',
    description: 'Повышает урон мечом на +35% на 45 сек и лечит +40 ОЗ (+22 Токсичности).',
    ingredients: [{ itemId: 'herb_swallow', name: 'Ласточкина трава', count: 1 }],
  },
  {
    id: 'potion_cat',
    name: 'Эликсир «Кошка» (x2)',
    description: 'Дарует ночное зрение в темноте и склепах на 60 сек (+22 Токсичности).',
    ingredients: [{ itemId: 'herb_swallow', name: 'Ласточкина трава', count: 1 }],
  },
  {
    id: 'potion_blizzard',
    name: 'Эликсир «Пурга» (x2)',
    description: 'Мгновенно восстанавливает +80 выносливости (+22 Токсичности).',
    ingredients: [{ itemId: 'herb_swallow', name: 'Ласточкина трава', count: 1 }],
  },
  {
    id: 'decoction_hydra',
    name: 'Отвар из Матери Трясины',
    description: 'Высшая алхимия: +8 ОЗ/сек регенерации, +60 макс. ОЗ и иммунитет к яду на 180 сек.',
    ingredients: [
      { itemId: 'hydra_heart', name: 'Сердце гидры', count: 1 },
      { itemId: 'herb_swallow', name: 'Ласточкина трава', count: 1 },
    ],
  },
  {
    id: 'decoction_colossus',
    name: 'Отвар из Кристального Колосса',
    description: 'Высшая алхимия: +22 Брони, +80 макс. ОЗ и устойчивость к сбиванию на 180 сек.',
    ingredients: [
      { itemId: 'black_ore', name: 'Чёрная руда', count: 2 },
      { itemId: 'ice_lotus', name: 'Ледяной лотос', count: 1 },
    ],
  },
  {
    id: 'decoction_vesper',
    name: 'Отвар Тлеющей Крови',
    description: 'Высшая алхимия: +20% к урону клинками, +20% шанс крита и +40% мощи Печатей на 180 сек.',
    ingredients: [
      { itemId: 'void_dust', name: 'Пыль пустоты', count: 1 },
      { itemId: 'cursed_essence', name: 'Проклятая эссенция', count: 1 },
    ],
  },
];

export function rollDiceArray(count = 5): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

export function evaluateDiceHand(dice: number[]): {
  rank: number;
  label: string;
  score: number;
} {
  const res = evaluateDicePokerHand(dice);
  return { rank: res.rank, label: res.name, score: res.score };
}

export function createInitialDicePokerState(opponentName: string, bet: number) {
  return {
    opponentName,
    bet,
    playerDice: [1, 2, 3, 4, 5],
    npcDice: [1, 2, 3, 4, 5],
    selectedForReroll: [false, false, false, false, false],
    stage: 'betting' as const,
    playerHandLabel: 'Готов к броску',
    npcHandLabel: 'Готов к броску',
    message: `Нажмите «Бросить кости», чтобы поставить ${bet} крон и начать партию.`,
  };
}

export function pickNpcRerollIndices(npcDice: number[]): number[] {
  const counts = new Map<number, number>();
  for (const d of npcDice) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const indices: number[] = [];
  npcDice.forEach((val, idx) => {
    if ((counts.get(val) ?? 0) === 1 && val < 5) {
      indices.push(idx);
    }
  });
  return indices;
}

export function resolveDicePokerOutcome(
  playerDice: number[],
  npcDice: number[],
  bet: number
): {
  winner: 'player' | 'npc' | 'draw';
  goldDelta: number;
  playerEval: { rank: number; label: string; score: number };
  npcEval: { rank: number; label: string; score: number };
  summary: string;
} {
  const playerEval = evaluateDiceHand(playerDice);
  const npcEval = evaluateDiceHand(npcDice);
  if (playerEval.score > npcEval.score) {
    return {
      winner: 'player',
      goldDelta: bet,
      playerEval,
      npcEval,
      summary: `Победа! Ваша комбинация «${playerEval.label}» старше «${npcEval.label}». Выигрыш: +${bet} крон!`,
    };
  }
  if (npcEval.score > playerEval.score) {
    return {
      winner: 'npc',
      goldDelta: -bet,
      playerEval,
      npcEval,
      summary: `Поражение. У соперника «${npcEval.label}» против вашей «${playerEval.label}» (-${bet} крон).`,
    };
  }
  return {
    winner: 'draw',
    goldDelta: 0,
    playerEval,
    npcEval,
    summary: `Ничья («${playerEval.label}»)! Ставка сохранена.`,
  };
}

export interface WeatherPreset {
  id: WeatherType;
  label: string;
  announcement: string;
  fogDensity: number;
  sunIntensityMultiplier: number;
  hemiIntensityMultiplier: number;
  skyTintHex: number;
  rainIntensity: number;
  mistIntensity: number;
  windStrength: number;
  groundRoughness: number;
}

export const WEATHER_PRESETS: Record<WeatherType, WeatherPreset> = {
  clear: {
    id: 'clear',
    label: 'Ясно',
    announcement: 'Тучи рассеялись — над долиной установилась ясная погода.',
    fogDensity: 0.007,
    sunIntensityMultiplier: 1.15,
    hemiIntensityMultiplier: 1.1,
    skyTintHex: 0x3b526b,
    rainIntensity: 0,
    mistIntensity: 0.15,
    windStrength: 0.2,
    groundRoughness: 0.92,
  },
  fog: {
    id: 'fog',
    label: 'Туман',
    announcement: 'С болот и реки поднимается густой мистический туман.',
    fogDensity: 0.021,
    sunIntensityMultiplier: 0.68,
    hemiIntensityMultiplier: 0.82,
    skyTintHex: 0x26313a,
    rainIntensity: 0,
    mistIntensity: 1.0,
    windStrength: 0.35,
    groundRoughness: 0.84,
  },
  rain: {
    id: 'rain',
    label: 'Дождь',
    announcement: 'Небо затянуло свинцовыми тучами — начался холодный ливень.',
    fogDensity: 0.0155,
    sunIntensityMultiplier: 0.52,
    hemiIntensityMultiplier: 0.72,
    skyTintHex: 0x151e28,
    rainIntensity: 1.0,
    mistIntensity: 0.55,
    windStrength: 1.0,
    groundRoughness: 0.52,
  },
};

export const WEATHER_CYCLE_ORDER: WeatherType[] = ['clear', 'fog', 'rain'];

export function getNextWeatherState(current: WeatherType): WeatherType {
  const idx = WEATHER_CYCLE_ORDER.indexOf(current);
  if (idx === -1) return 'clear';
  return WEATHER_CYCLE_ORDER[(idx + 1) % WEATHER_CYCLE_ORDER.length];
}

export function interpolateWeatherMetrics(
  from: WeatherType,
  to: WeatherType,
  blend: number
): {
  fogDensity: number;
  sunIntensityMultiplier: number;
  hemiIntensityMultiplier: number;
  rainIntensity: number;
  mistIntensity: number;
  windStrength: number;
  groundRoughness: number;
} {
  const t = Math.max(0, Math.min(1, blend));
  // Smoothstep easing for atmospheric transitions
  const s = t * t * (3 - 2 * t);
  const a = WEATHER_PRESETS[from] ?? WEATHER_PRESETS.clear;
  const b = WEATHER_PRESETS[to] ?? WEATHER_PRESETS.clear;

  const lerp = (v0: number, v1: number) => v0 + (v1 - v0) * s;

  return {
    fogDensity: lerp(a.fogDensity, b.fogDensity),
    sunIntensityMultiplier: lerp(a.sunIntensityMultiplier, b.sunIntensityMultiplier),
    hemiIntensityMultiplier: lerp(a.hemiIntensityMultiplier, b.hemiIntensityMultiplier),
    rainIntensity: lerp(a.rainIntensity, b.rainIntensity),
    mistIntensity: lerp(a.mistIntensity, b.mistIntensity),
    windStrength: lerp(a.windStrength, b.windStrength),
    groundRoughness: lerp(a.groundRoughness, b.groundRoughness),
  };
}

/**
 * Pure helper for unlocking a world lore note / codex entry:
 * - Grants +25 XP on first discovery
 * - Unlocks the «Хранитель Памяти Вальдмарка» (+15% boss damage) talent when 12 notes are found
 */
export function discoverLoreEntry(
  stats: PlayerStats,
  noteId: string,
  totalNotesCount = 12
): {
  updated: PlayerStats;
  newlyDiscovered: boolean;
  leveledUp: boolean;
  unlockedLoreMaster: boolean;
} {
  const existing = stats.discoveredLoreIds ?? [];
  if (existing.includes(noteId)) {
    return {
      updated: stats,
      newlyDiscovered: false,
      leveledUp: false,
      unlockedLoreMaster: false,
    };
  }

  const nextList = [...existing, noteId];
  const xpRes = applyExperienceGain(stats, 25);
  const reachedAll = nextList.length >= totalNotesCount;
  const unlockedLoreMaster = reachedAll && !stats.loreMasterUnlocked;

  return {
    updated: {
      ...xpRes.updated,
      discoveredLoreIds: nextList,
      loreMasterUnlocked: Boolean(stats.loreMasterUnlocked || reachedAll),
    },
    newlyDiscovered: true,
    leveledUp: xpRes.leveledUp,
    unlockedLoreMaster,
  };
}




