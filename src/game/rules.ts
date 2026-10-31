import type {
  ActiveSwordType,
  BestiaryEntry,
  BiomeId,
  CollisionBox,
  CompanionCommand,
  CompanionId,
  ControlModeSetting,
  ControlPlatform,
  DeviceEnvironmentSnapshot,
  EnemyData,
  EnemyType,
  EquipmentSlot,
  GameItem,
  GameLanguage,
  HunterContract,
  MagicSignInfo,
  NpcActivityState,
  PlayerStats,
  Quest,
  QuestConsequenceRecord,
  SignType,
  SkillNode,
  WaystoneData,
  WeatherType,
  WitcherSetId,
  WorldInteractable,
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
  {
    id: 'waystone_sunken_port',
    name: 'Камень Затонувшей Гавани Сольхейм',
    biomeName: 'Затонувший Порт Сольхейм и Маяк Бездны',
    x: -134,
    z: 3,
  },
  {
    id: 'waystone_sun_monastery',
    name: 'Камень Лазурного Монастыря',
    biomeName: 'Лазурный Монастырь Солнечных Клятв',
    x: 146,
    z: -15,
  },
  {
    id: 'waystone_starfall_valley',
    name: 'Камень Кузницы Предтеч (Акт III)',
    biomeName: 'Долина Звёздного Пепла и Кузница Предтеч',
    x: 0,
    z: -605,
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
  {
    id: 'bestiary_bounty_hunter',
    type: 'bounty_hunter',
    name: 'Наёмный Охотник за головами',
    title: 'Карательный отряд трактов Вальдмарка',
    category: 'Люди и Охотники',
    lore: 'Безжалостные ветераны и головорезы, нанятые купеческой гильдией и старостами за голову «Пепельного Мясника». Выслеживают Корвуса на дорогах при дурной славе (Репутация <= -20), используют арбалеты и тяжёлые клинки.',
    weaknessSigns: ['Иллюзия (Морок)', 'Импульс (Аард)', 'Пламя (Игнис)'],
    weaknessOil: 'Стальной клинок и блок [ПКМ]',
    trophyBonus: 'Кошель с кровавым золотом и заказ на голову Зольника',
    dangerLevel: 3,
  },
];

/**
 * Deterministic procedural ground height function for the entire region.
 * Flat around the central village and key arenas so buildings sit flush.
 * Seamless Northern Expansion extends from z = -105 to z = -550.
 */
export function getGroundHeight(x: number, z: number): number {
  // Underground Catacombs chamber at (x in [75, 128], z in [75, 128])
  if (x > 75 && x < 128 && z > 75 && z < 128) {
    return 0;
  }

  // Seamless Northern Expansion (z < -102)
  if (z < -102) {
    // Transition blend at z in [-112, -102]
    const northBlend = Math.min(1, Math.max(0, (-102 - z) / 10));

    // Biome 1: Gallows Swamp & Drowned Mire (z in [-215, -102], x in [-95, 95])
    if (z >= -215) {
      const distSwampArena = Math.hypot(x - 0, z - -190);
      const distCharonCamp = Math.hypot(x - -8, z - -145);
      const distManor = Math.hypot(x - 30, z - -166);
      const distStiltVillage = Math.hypot(x - -52, z - -152);
      const distMarauderIsle = Math.hypot(x - 52, z - -138);
      const arenaFlat = Math.min(1, Math.max(0, (distSwampArena - 20) / 10));
      const campFlat = Math.min(1, Math.max(0, (distCharonCamp - 12) / 8));
      const manorFlat = Math.min(1, Math.max(0, (distManor - 16) / 8));
      const stiltFlat = Math.min(1, Math.max(0, (distStiltVillage - 16) / 8));
      const isleFlat = Math.min(1, Math.max(0, (distMarauderIsle - 14) / 8));

      // Smooth boardwalk blend for main N-S and E-W causeways
      const mainBoardwalkDist = Math.abs(x);
      const westBranchDist = x >= -64 && x <= 2 ? Math.abs(z - -152) : 99;
      const eastBranchDist = x >= -2 && x <= 42 ? Math.abs(z - -166) : 99;
      const minBoardwalkDist = Math.min(mainBoardwalkDist, westBranchDist, eastBranchDist);
      const boardwalkBlend = 1 - Math.min(1, Math.max(0, (minBoardwalkDist - 3.2) / 3.0));

      // Smoothly elevated dry hummocks for Manor, Marauder island, Stilt Village, Charon Camp & Arena
      const manorLift = (1 - Math.min(1, Math.max(0, (distManor - 12) / 8))) * 0.48;
      const isleLift = (1 - Math.min(1, Math.max(0, (distMarauderIsle - 10) / 8))) * 0.38;
      const stiltLift = (1 - Math.min(1, Math.max(0, (distStiltVillage - 13) / 8))) * 0.22;
      const campLift = (1 - Math.min(1, Math.max(0, (distCharonCamp - 10) / 7))) * 0.2;
      const arenaLift = (1 - Math.min(1, Math.max(0, (distSwampArena - 18) / 8))) * 0.16;
      const hummockLift = Math.max(manorLift, isleLift, stiltLift, campLift, arenaLift, boardwalkBlend * 0.14);

      // Deep toxic hollows in uninhabited bog pools
      const hollow1 = Math.hypot(x - -34, z - -134);
      const hollow2 = Math.hypot(x - 24, z - -182);
      const minHollow = Math.min(hollow1, hollow2);
      const toxicHollow = (1 - Math.min(1, Math.max(0, (minHollow - 6) / 6))) * -0.55;

      const swampWaves =
        (Math.sin(x * 0.055) * Math.cos(z * 0.055) * 0.28 +
          Math.sin(x * 0.14 - z * 0.11) * 0.12) *
          arenaFlat *
          campFlat *
          manorFlat *
          stiltFlat *
          isleFlat -
        0.04 +
        hummockLift +
        toxicHollow;
      return swampWaves * northBlend;
    }

    // Biome 2: Silvertooth Pass & Dead Mines (z in [-325, -215], x in [-95, 95])
    if (z >= -325) {
      const progress = Math.min(1, Math.max(0, (-215 - z) / 110));
      const baseElevation = progress * 6.5; // Climbs from 0 to +6.5m
      const distColossusArena = Math.hypot(x - 0, z - -300);
      const distBromCamp = Math.hypot(x - 6, z - -255);
      const distMineHub = Math.hypot(x - -38, z - -276);
      const distEastGrove = Math.hypot(x - 44, z - -262);
      const flatFactor =
        Math.min(1, Math.max(0, (distColossusArena - 22) / 10)) *
        Math.min(1, Math.max(0, (distBromCamp - 13) / 8)) *
        Math.min(1, Math.max(0, (distMineHub - 18) / 8)) *
        Math.min(1, Math.max(0, (distEastGrove - 16) / 8));

      // Winding mountain switchback (серпантин) path
      const serpCenter = Math.sin((z + 215) * 0.075) * 16;
      const distFromSerp = Math.abs(x - serpCenter);
      const onSwitchback = distFromSerp < 5.5;
      if (onSwitchback) {
        return baseElevation + Math.sin(z * 0.04) * 0.25 * flatFactor;
      }

      // Suspension bridge across chasm at z in [-248, -240]
      if (Math.abs(z - -244) < 3.2 && Math.abs(x) < 18) {
        return baseElevation + 0.4;
      }

      const roadFactor = Math.min(1, Math.max(0, (Math.abs(x) - 12) / 26));
      const crags =
        (Math.sin(x * 0.048) * Math.cos(z * 0.048) * 2.4 + roadFactor * 3.0) * flatFactor;
      return baseElevation + crags;
    }

    // Biome 3: Black Bastion of the Brotherhood of Ash (z in [-435, -325], x in [-95, 95])
    if (z >= -435) {
      const basePlateau = 6.5;
      const distCourtyard = Math.hypot(x - 0, z - -395);
      const distKaelCamp = Math.hypot(x - 0, z - -355);
      const distWestBarracks = Math.hypot(x - -42, z - -382);
      const distEastLab = Math.hypot(x - 42, z - -382);
      const flatBastion =
        Math.min(1, Math.max(0, (distCourtyard - 28) / 12)) *
        Math.min(1, Math.max(0, (distKaelCamp - 16) / 8)) *
        Math.min(1, Math.max(0, (distWestBarracks - 20) / 10)) *
        Math.min(1, Math.max(0, (distEastLab - 20) / 10));
      const ridges = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 1.35 * flatBastion;
      return basePlateau + ridges;
    }

    // Biome 4: Eclipse Crater & Throne of the Void (z in [-550, -435], x in [-95, 95])
    if (z >= -550) {
      const craterProgress = Math.min(1, Math.max(0, (-435 - z) / 25));
      const baseCrater = 6.5 - craterProgress * 3.0; // Settles at +3.5m
      const distThrone = Math.hypot(x - 0, z - -505);
      const distWestIsland = Math.hypot(x - -42, z - -482);
      const distEastIsland = Math.hypot(x - 42, z - -482);
      const flatThrone =
        Math.min(1, Math.max(0, (distThrone - 30) / 12)) *
        Math.min(1, Math.max(0, (distWestIsland - 16) / 8)) *
        Math.min(1, Math.max(0, (distEastIsland - 16) / 8));
      // Energy bridges linking side obsidian islands to the center at z = -482
      if (Math.abs(z - -482) < 3.5 && Math.abs(x) <= 46) {
        return baseCrater + 0.25;
      }
      // Causeway north toward Starfall Valley
      if (Math.abs(x) < 6 && z < -525) {
        return baseCrater;
      }
      const rim = Math.min(1, Math.max(0, (Math.abs(x) - 48) / 24)) * 3.2 * flatThrone;
      return baseCrater + rim;
    }

    // Biome 5 (Act III): Starfall Valley & Precursor Astral Forge (z < -550)
    const valleyProgress = Math.min(1, Math.max(0, (-550 - z) / 28));
    const baseStarfall = 3.5 + valleyProgress * 2.3; // Rises to +5.8m astral plateau
    const distForge = Math.hypot(x - 0, z - -635);
    const distWestObservatory = Math.hypot(x - -46, z - -618);
    const distEastSanctum = Math.hypot(x - 46, z - -618);
    const flatForge =
      Math.min(1, Math.max(0, (distForge - 34) / 14)) *
      Math.min(1, Math.max(0, (distWestObservatory - 18) / 8)) *
      Math.min(1, Math.max(0, (distEastSanctum - 18) / 8));
    if (Math.abs(x) < 6 && z > -595 && z < -540) {
      return baseStarfall;
    }
    const astralRidges = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 1.4 * flatForge;
    return baseStarfall + astralRidges;
  }

  // Western Coastal Biome: Sunken Port Solheim & Abyssal Lighthouse (x < -105)
  if (x < -105) {
    const coastalProgress = Math.min(1, Math.max(0, (-105 - x) / 30));
    const basePort = 0.08 * coastalProgress;
    const distPortSquare = Math.hypot(x - -150, z - 0);
    const distLighthouse = Math.hypot(x - -174, z - -36);
    const lighthouseLift = (1 - Math.min(1, Math.max(0, (distLighthouse - 10) / 8))) * 2.5;
    const squareBlend = 1 - Math.min(1, Math.max(0, (distPortSquare - 26) / 10));
    const pierBlend =
      x < -145 && x > -194 ? 1 - Math.min(1, Math.max(0, (Math.abs(z) - 5) / 5)) : 0;
    const coastalWaves =
      Math.sin(x * 0.04) * Math.cos(z * 0.04) * 0.35 * (1 - Math.max(squareBlend, pierBlend));
    return basePort + coastalWaves + Math.max(lighthouseLift, squareBlend * 0.22, pierBlend * 0.32);
  }

  // Eastern Cliff Plateau Biome: Sun Monastery of Solar Oaths (x > 105, z <= 75)
  if (x > 105 && z <= 75) {
    const cliffProgress = Math.min(1, Math.max(0, (x - 105) / 22));
    const baseMonastery = 2.8 * cliffProgress;
    const distCourtyard = Math.hypot(x - 158, z - -15);
    const distObservatory = Math.hypot(x - 178, z - -15);
    const flatMonastery =
      Math.min(1, Math.max(0, (distCourtyard - 30) / 10)) *
      Math.min(1, Math.max(0, (distObservatory - 18) / 8));
    return baseMonastery + Math.sin(x * 0.04) * Math.cos(z * 0.04) * 0.8 * flatMonastery;
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

  // 3 Bridges over river: Central (x=0), Western Forest (x=-52), Eastern Order (x=52)
  const bridgeDistX = Math.min(Math.abs(x), Math.abs(x + 52), Math.abs(x - 52));
  const bridgeBlendX = 1 - Math.min(1, Math.max(0, (bridgeDistX - 3.2) / 2.2));
  const bridgeBlendZ = 1 - Math.min(1, Math.max(0, (riverDist - 7.5) / 2.0));
  const bridgeBlend = bridgeBlendX * bridgeBlendZ;

  const hills =
    Math.sin(x * 0.035) * Math.cos(z * 0.035) * 2.2 +
    Math.sin(x * 0.08 + z * 0.06) * 0.75;

  // Elevated plateau for Ruined Fortress
  const fortressElevation =
    distFortress < 34 ? (1 - Math.min(1, Math.max(0, (distFortress - 18) / 16))) * 2.8 : 0;

  const naturalGround =
    hills * flattenFactor + riverDepression * villageFlat * (1 - bridgeBlend) + fortressElevation;
  return naturalGround * (1 - bridgeBlend) + 0.35 * bridgeBlend;
}

/**
 * Determines which biome the coordinates belong to.
 */
export function getBiomeAt(x: number, z: number): { id: BiomeId; name: string } {
  if (x > 75 && x < 128 && z > 75 && z < 128) {
    return { id: 'catacombs', name: 'Подземные Катакомбы Древних Королей' };
  }
  if (z < -550) {
    return { id: 'starfall_valley', name: 'Долина Звёздного Пепла и Кузница Предтеч' };
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
  if (x < -105) {
    return { id: 'sunken_port', name: 'Затонувший Порт Сольхейм и Маяк Бездны' };
  }
  if (x > 105 && z <= 75) {
    return { id: 'sun_monastery', name: 'Лазурный Монастырь Солнечных Клятв' };
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
 * Determines which exclusive equipment slot an item belongs to.
 * Returns null for consumables, resources, runes, blueprints, and quest items.
 */
export function getItemEquipSlot(item: GameItem): EquipmentSlot | null {
  if (item.equipSlot) return item.equipSlot;
  if (item.category === 'armor') return 'armor';
  if (item.category === 'trophy') return 'trophy';
  if (item.category === 'weapon') {
    const steel = item.stats?.attack ?? 0;
    const silver = item.stats?.silverAttack ?? 0;
    if (silver > steel) return 'silverSword';
    if (
      item.id.includes('silver') ||
      item.id.includes('ancient') ||
      item.id.includes('coven') ||
      item.id.includes('flame') ||
      item.id.includes('grandmaster') ||
      item.id.includes('plague_scythe') ||
      item.id.includes('dusk_fangs') ||
      item.id.includes('void_voice')
    ) {
      return 'silverSword';
    }
    return 'steelSword';
  }
  return null;
}

/**
 * Enforces strict slot exclusivity across an inventory array:
 * at most ONE item per EquipmentSlot ('steelSword', 'silverSword', 'armor', 'trophy')
 * can be equipped at any time. If preferredItemId is provided, it wins its slot.
 */
export function enforceExclusiveEquipment(
  items: GameItem[],
  preferredItemId?: string
): GameItem[] {
  const occupiedSlots = new Set<EquipmentSlot>();
  const result = items.map((i) => ({ ...i }));

  if (preferredItemId) {
    const preferred = result.find((i) => i.id === preferredItemId);
    if (preferred) {
      preferred.equipped = true;
      const slot = getItemEquipSlot(preferred);
      if (slot) {
        occupiedSlots.add(slot);
      }
    }
  }

  for (const item of result) {
    if (item.id === preferredItemId) continue;
    if (!item.equipped) continue;
    const slot = getItemEquipSlot(item);
    if (!slot) {
      item.equipped = false;
      continue;
    }
    if (occupiedSlots.has(slot)) {
      item.equipped = false;
    } else {
      occupiedSlots.add(slot);
    }
  }

  return result;
}

/**
 * Calculates effective player combat stats taking equipped items (strictly 1 per slot),
 * Witcher Set bonuses, Trophy passives, socketed Runes, Elixirs, Decoctions, and skill tree into account.
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

  // Enforce 1 item per EquipmentSlot during stat calculation so stats can never stack
  const seenSlots = new Set<EquipmentSlot>();

  for (const item of inventory) {
    if (!item.equipped || !item.stats) continue;
    const slot = getItemEquipSlot(item);
    if (slot) {
      if (seenSlots.has(slot)) continue;
      seenSlots.add(slot);
    }

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
 * Returns sword effectiveness multiplier and HUD hint based on active sword vs enemy vulnerability.
 */
export function getSwordEffectiveness(
  activeSword: ActiveSwordType,
  isSilverVulnerable: boolean
): {
  multiplier: number;
  isOptimal: boolean;
  hint: string;
} {
  if (activeSword === 'silver' && isSilverVulnerable) {
    return {
      multiplier: 1.0,
      isOptimal: true,
      hint: 'Серебряный клинок эффективен против чудовища (100% урона)',
    };
  }
  if (activeSword === 'steel' && !isSilverVulnerable) {
    return {
      multiplier: 1.0,
      isOptimal: true,
      hint: 'Стальной клинок эффективен против зверя/человека (100% урона)',
    };
  }
  if (activeSword === 'steel' && isSilverVulnerable) {
    return {
      multiplier: 0.35,
      isOptimal: false,
      hint: 'Сталь малоэффективна против монстра (35% урона) — обнажите Серебро [2]!',
    };
  }
  return {
    multiplier: 0.35,
    isOptimal: false,
    hint: 'Серебро мягкое против людей и зверей (35% урона) — обнажите Сталь [1]!',
  };
}

/**
 * Calculates damage dealt by player to an enemy, factoring in active sword type (Steel vs Silver).
 */
export function calculatePlayerAttackDamage(params: {
  steelAttack: number;
  silverAttack: number;
  activeSword?: ActiveSwordType;
  isHeavy: boolean;
  comboStep: number; // 1, 2, 3
  enemy: Pick<EnemyData, 'isSilverVulnerable' | 'state'> &
    Partial<Pick<EnemyData, 'type' | 'isContractBoss'>>;
  bossDamageMultiplier?: number;
}): number {
  const chosenSword: ActiveSwordType =
    params.activeSword ?? (params.enemy.isSilverVulnerable ? 'silver' : 'steel');
  const baseDmg = chosenSword === 'silver' ? params.silverAttack : params.steelAttack;
  const effectiveness = params.activeSword
    ? getSwordEffectiveness(params.activeSword, params.enemy.isSilverVulnerable).multiplier
    : 1.0;

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

  return Math.max(
    1,
    Math.round(baseDmg * effectiveness * heavyMult * comboMult * stunBonus * bossMult)
  );
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

export type SkyboxPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface SkyboxState {
  phase: SkyboxPhase;
  zenithHex: number;
  horizonHex: number;
  nadirHex: number;
  sunColorHex: number;
  sunCoronaHex: number;
  moonColorHex: number;
  moonHaloHex: number;
  sunElevation: number;
  sunAzimuthX: number;
  sunVisibility: number;
  sunScale: number;
  moonElevation: number;
  moonAzimuthX: number;
  moonVisibility: number;
  starVisibility: number;
  cloudDensity: number;
  cloudDarkness: number;
  cloudLitHex: number;
  cloudShadowHex: number;
  cloudWindSpeed: number;
}

function lerpRgbHex(hexA: number, hexB: number, t: number): number {
  const c = Math.max(0, Math.min(1, t));
  const rA = (hexA >> 16) & 0xff;
  const gA = (hexA >> 8) & 0xff;
  const bA = hexA & 0xff;
  const rB = (hexB >> 16) & 0xff;
  const gB = (hexB >> 8) & 0xff;
  const bB = hexB & 0xff;
  const r = Math.round(rA + (rB - rA) * c);
  const g = Math.round(gA + (gB - gA) * c);
  const b = Math.round(bA + (bB - bA) * c);
  return (r << 16) | (g << 8) | b;
}

function smoothstepRange(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Pure deterministic calculation of the dynamic skybox state (sky gradient colors,
 * sun/moon celestial trajectories & visibility, starfield opacity, and volumetric
 * cloud density/tint) from in-game time (0..24) and weather conditions.
 */
export function computeSkyboxState(
  timeOfDay: number,
  weather: WeatherType,
  previousWeather: WeatherType = weather,
  weatherBlend = 1.0
): SkyboxState {
  const hour = ((timeOfDay % 24) + 24) % 24;
  const blend = Math.max(0, Math.min(1, weatherBlend));
  const sBlend = blend * blend * (3 - 2 * blend);

  // Orbital mechanics across 24-hour cycle
  const sunAngle = ((hour - 6) / 24) * Math.PI * 2;
  const sunElevation = Math.sin(sunAngle); // +1 at 12:00 Noon, -1 at 00:00 Midnight
  const sunAzimuthX = Math.cos(sunAngle); // +1 East at 06:00, -1 West at 18:00
  const moonElevation = -sunElevation;
  const moonAzimuthX = -sunAzimuthX;

  let phase: SkyboxPhase = 'night';
  if (sunElevation > 0.28) {
    phase = 'day';
  } else if (sunElevation >= -0.08) {
    phase = hour < 12 ? 'dawn' : 'dusk';
  }

  // Cloud density & storm darkness per weather preset
  const cloudPreset = (w: WeatherType) => {
    switch (w) {
      case 'clear':
        return { density: 0.22, darkness: 0.12, wind: 0.28 };
      case 'fog':
        return { density: 0.68, darkness: 0.48, wind: 0.46 };
      case 'rain':
        return { density: 0.92, darkness: 0.82, wind: 1.15 };
    }
  };
  const cpA = cloudPreset(previousWeather);
  const cpB = cloudPreset(weather);
  const baseCloudDensity = cpA.density + (cpB.density - cpA.density) * sBlend;
  // Subtle dawn/dusk atmospheric condensation boost
  const twilightFactor = Math.max(0, 1 - Math.abs(sunElevation) * 2.5) * 0.04;
  const cloudDensity = Math.max(0, Math.min(1, baseCloudDensity + twilightFactor));
  const cloudDarkness = cpA.darkness + (cpB.darkness - cpA.darkness) * sBlend;
  const cloudWindSpeed = cpA.wind + (cpB.wind - cpA.wind) * sBlend;

  // Base clear-sky zenith, horizon, nadir, sun, and cloud colors by time-of-day
  let zenithHex: number;
  let horizonHex: number;
  let nadirHex: number;
  let sunColorHex: number;
  let sunCoronaHex: number;
  let cloudLitHex: number;
  let cloudShadowHex: number;

  if (sunElevation > 0.28) {
    // Full Day (08:00 - 16:00)
    const noonFactor = smoothstepRange(0.28, 0.95, sunElevation);
    zenithHex = lerpRgbHex(0x224c87, 0x1b4580, noonFactor);
    horizonHex = lerpRgbHex(0x6e9bc4, 0x7fb0d6, noonFactor);
    nadirHex = 0x1a2430;
    sunColorHex = lerpRgbHex(0xffe099, 0xfff7d6, noonFactor);
    sunCoronaHex = lerpRgbHex(0xf59e0b, 0xfef08a, noonFactor);
    cloudLitHex = lerpRgbHex(0xf1f5f9, 0xffffff, noonFactor);
    cloudShadowHex = lerpRgbHex(0x64748b, 0x798ba3, noonFactor);
  } else if (sunElevation >= -0.08) {
    // Dawn (05:30 - 08:00) or Dusk (16:00 - 19:00)
    const t = (sunElevation + 0.08) / 0.36; // 0 at night edge, 1 at day edge
    const peakGlow = Math.sin(t * Math.PI);
    const isDawn = hour < 12;

    const twilightZenith = isDawn ? 0x263868 : 0x241e42;
    const twilightHorizon = isDawn ? 0xe07a4b : 0xd45232;
    const twilightCloudLit = isDawn ? 0xffb380 : 0xf97316;
    const twilightCloudShadow = isDawn ? 0x3b2d4a : 0x332038;

    const nightToDayZenith = lerpRgbHex(0x060b16, 0x224c87, t);
    const nightToDayHorizon = lerpRgbHex(0x101c2e, 0x6e9bc4, t);
    zenithHex = lerpRgbHex(nightToDayZenith, twilightZenith, peakGlow * 0.72);
    horizonHex = lerpRgbHex(nightToDayHorizon, twilightHorizon, peakGlow * 0.88);
    nadirHex = lerpRgbHex(0x050811, 0x1a2028, t);

    sunColorHex = lerpRgbHex(0xff5722, 0xffe099, t);
    sunCoronaHex = lerpRgbHex(0xea580c, 0xf59e0b, t);

    const baseCloudLit = lerpRgbHex(0x283852, 0xf1f5f9, t);
    const baseCloudShadow = lerpRgbHex(0x0f172a, 0x64748b, t);
    cloudLitHex = lerpRgbHex(baseCloudLit, twilightCloudLit, peakGlow * 0.85);
    cloudShadowHex = lerpRgbHex(baseCloudShadow, twilightCloudShadow, peakGlow * 0.7);
  } else {
    // Night (19:00 - 05:30)
    const midnightDepth = smoothstepRange(-0.08, -0.85, sunElevation);
    zenithHex = lerpRgbHex(0x091122, 0x040812, midnightDepth);
    horizonHex = lerpRgbHex(0x142238, 0x0c1626, midnightDepth);
    nadirHex = 0x04070e;
    sunColorHex = 0xff6b35;
    sunCoronaHex = 0xea580c;
    cloudLitHex = lerpRgbHex(0x2e405c, 0x22324a, midnightDepth);
    cloudShadowHex = lerpRgbHex(0x101827, 0x0a101d, midnightDepth);
  }

  // Modulate sky gradient & clouds by weather state (fog desaturates/hazes; rain darkens to storm slate)
  const isNight = sunElevation < -0.05;
  const fogSkyHex = isNight ? 0x141e27 : 0x526573;
  const rainSkyHex = isNight ? 0x080e16 : 0x24313d;

  const weatherSkyHex = (w: WeatherType) => {
    if (w === 'fog') return fogSkyHex;
    if (w === 'rain') return rainSkyHex;
    return zenithHex;
  };
  const wHexA = weatherSkyHex(previousWeather);
  const wHexB = weatherSkyHex(weather);
  const targetWeatherSky = lerpRgbHex(wHexA, wHexB, sBlend);

  const weatherInfluence = (cloudDensity - 0.22) / 0.7; // 0 in clear, ~0.65 in fog, 1.0 in rain
  const clampedInfluence = Math.max(0, Math.min(1, weatherInfluence));

  zenithHex = lerpRgbHex(zenithHex, targetWeatherSky, clampedInfluence * 0.78);
  horizonHex = lerpRgbHex(horizonHex, targetWeatherSky, clampedInfluence * 0.68);
  cloudLitHex = lerpRgbHex(
    cloudLitHex,
    isNight ? 0x16202e : 0x475569,
    cloudDarkness * 0.76
  );
  cloudShadowHex = lerpRgbHex(
    cloudShadowHex,
    isNight ? 0x070b12 : 0x1e293b,
    cloudDarkness * 0.85
  );

  // Celestial visibility & scaling
  const rawSunVis = smoothstepRange(-0.12, 0.14, sunElevation);
  const sunWeatherAttenuation = Math.max(0.08, 1 - cloudDensity * 0.82);
  const sunVisibility = rawSunVis * sunWeatherAttenuation;
  const sunScale = 1.0 + Math.max(0, 1 - Math.max(0, sunElevation) * 2.2) * 0.35;

  const rawMoonVis = smoothstepRange(-0.1, 0.14, moonElevation);
  const moonWeatherAttenuation = Math.max(0.12, 1 - cloudDensity * 0.74);
  const moonVisibility = rawMoonVis * moonWeatherAttenuation;

  const rawStarVis = smoothstepRange(0.06, -0.22, sunElevation);
  const starWeatherAttenuation = Math.max(0, 1 - cloudDensity * 0.92);
  const starVisibility = rawStarVis * starWeatherAttenuation;

  return {
    phase,
    zenithHex,
    horizonHex,
    nadirHex,
    sunColorHex,
    sunCoronaHex,
    moonColorHex: 0xdbeafe,
    moonHaloHex: 0x60a5fa,
    sunElevation,
    sunAzimuthX,
    sunVisibility,
    sunScale,
    moonElevation,
    moonAzimuthX,
    moonVisibility,
    starVisibility,
    cloudDensity,
    cloudDarkness,
    cloudLitHex,
    cloudShadowHex,
    cloudWindSpeed,
  };
}

export type ScreenShakeKind =
  | 'none'
  | 'light_hit'
  | 'heavy_hit'
  | 'critical_hit'
  | 'heavy_enemy_attack';

export interface ScreenShakeProfile {
  kind: ScreenShakeKind;
  intensity: number;
  duration: number;
  rollAmplitude: number;
  fovPunch: number;
  flashColor: string | null;
  flashOpacity: number;
  hapticPattern: number[];
}

const HEAVY_ENEMY_TYPES: ReadonlySet<EnemyType> = new Set<EnemyType>([
  'boss',
  'malakor',
  'boss_hydra',
  'boss_colossus',
  'boss_vesper',
  'boss_avatar',
  'demon',
  'werewolf',
  'gargoyle',
  'troglodyte',
  'void_knight',
  'plague_reaper',
]);

/**
 * Determines whether an enemy strike qualifies as a heavy/visceral attack
 * based on enemy archetype, contract boss status, or raw/actual damage threshold.
 */
export function isHeavyEnemyAttack(
  enemyType: EnemyType,
  rawDamage: number,
  isContractBoss = false,
  hpDamage = 0
): boolean {
  if (isContractBoss) return true;
  if (rawDamage >= 26 || hpDamage >= 22) return true;
  return HEAVY_ENEMY_TYPES.has(enemyType);
}

/**
 * Pure calculation of mobile haptic feedback vibration pattern (in milliseconds for navigator.vibrate)
 * triggered when the player lands a critical hit or takes heavy damage on mobile platforms.
 * Returns an empty array [] on desktop ('pc') or for non-qualifying hits.
 */
export function computeCombatHapticPattern(params: {
  platform: ControlPlatform;
  kind: ScreenShakeKind;
  isHeavy?: boolean;
  hpDamage?: number;
}): number[] {
  if (params.platform !== 'mobile') {
    return [];
  }
  if (params.kind === 'critical_hit') {
    return params.isHeavy ? [55, 30, 95] : [40, 25, 70];
  }
  if (params.kind === 'heavy_enemy_attack' || (params.hpDamage ?? 0) >= 22) {
    return [85, 40, 125];
  }
  return [];
}

/**
 * Pure calculation of screen-shake impulse parameters (camera trauma intensity,
 * duration, rotational Dutch roll amplitude, FOV punch, screen vignette flash,
 * and mobile haptic vibration pattern) triggered by critical player hits,
 * heavy player attacks, or heavy enemy attacks.
 */
export function computeCombatScreenShake(params: {
  source: 'player' | 'enemy' | 'barrier';
  isCrit?: boolean;
  isHeavy?: boolean;
  enemyType?: EnemyType;
  rawDamage?: number;
  hpDamage?: number;
  isContractBoss?: boolean;
  parried?: boolean;
}): ScreenShakeProfile {
  if (params.source === 'barrier') {
    return {
      kind: 'heavy_hit',
      intensity: 0.26,
      duration: 0.26,
      rollAmplitude: 0.018,
      fovPunch: 2.1,
      flashColor: '#eab308',
      flashOpacity: 0.28,
      hapticPattern: [],
    };
  }

  if (params.source === 'player') {
    const isCrit = Boolean(params.isCrit);
    const isHeavy = Boolean(params.isHeavy);
    if (isCrit && isHeavy) {
      return {
        kind: 'critical_hit',
        intensity: 0.44,
        duration: 0.36,
        rollAmplitude: 0.032,
        fovPunch: 3.5,
        flashColor: '#facc15',
        flashOpacity: 0.38,
        hapticPattern: [55, 30, 95],
      };
    }
    if (isCrit) {
      return {
        kind: 'critical_hit',
        intensity: 0.34,
        duration: 0.3,
        rollAmplitude: 0.024,
        fovPunch: 2.6,
        flashColor: '#facc15',
        flashOpacity: 0.3,
        hapticPattern: [40, 25, 70],
      };
    }
    if (isHeavy) {
      return {
        kind: 'heavy_hit',
        intensity: 0.22,
        duration: 0.22,
        rollAmplitude: 0.015,
        fovPunch: 1.6,
        flashColor: '#fb923c',
        flashOpacity: 0.18,
        hapticPattern: [],
      };
    }
    return {
      kind: 'light_hit',
      intensity: 0.08,
      duration: 0.12,
      rollAmplitude: 0.005,
      fovPunch: 0.4,
      flashColor: null,
      flashOpacity: 0,
      hapticPattern: [],
    };
  }

  // Enemy attack on player
  const heavyEnemy = isHeavyEnemyAttack(
    params.enemyType ?? 'wolf',
    params.rawDamage ?? 15,
    params.isContractBoss,
    params.hpDamage ?? 0
  );

  if (params.parried) {
    if (heavyEnemy) {
      return {
        kind: 'heavy_hit',
        intensity: 0.19,
        duration: 0.19,
        rollAmplitude: 0.013,
        fovPunch: -1.2,
        flashColor: '#fbbf24',
        flashOpacity: 0.2,
        hapticPattern: [],
      };
    }
    return {
      kind: 'light_hit',
      intensity: 0.09,
      duration: 0.11,
      rollAmplitude: 0.006,
      fovPunch: -0.5,
      flashColor: null,
      flashOpacity: 0,
      hapticPattern: [],
    };
  }

  if (heavyEnemy) {
    // Scale intensity slightly with rawDamage for massive boss slams (e.g., 30..65 dmg)
    const dmgScale = Math.min(1.25, Math.max(1.0, (params.rawDamage ?? 32) / 35));
    return {
      kind: 'heavy_enemy_attack',
      intensity: Number((0.38 * dmgScale).toFixed(3)),
      duration: Number((0.35 * Math.min(1.15, dmgScale)).toFixed(3)),
      rollAmplitude: Number((0.028 * dmgScale).toFixed(4)),
      fovPunch: Number((-3.0 * dmgScale).toFixed(2)),
      flashColor: '#ef4444',
      flashOpacity: 0.44,
      hapticPattern: [85, 40, 125],
    };
  }

  return {
    kind: 'light_hit',
    intensity: 0.16,
    duration: 0.18,
    rollAmplitude: 0.011,
    fovPunch: -1.0,
    flashColor: '#ef4444',
    flashOpacity: 0.22,
    hapticPattern: [],
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

// ============================================================================
// 1. REPUTATION & MORALITY SYSTEM («Спаситель Вальдмарка» vs «Пепельный Мясник»)
// ============================================================================

export function clampReputation(rep: number): number {
  return Math.max(-100, Math.min(100, Math.round(rep)));
}

export interface ReputationInfo {
  score: number;
  title: string;
  tier: 'savior' | 'defender' | 'neutral' | 'mercenary' | 'butcher';
  priceMultiplier: number;
  greetingPrefix: string;
  triggersBountyHunters: boolean;
  bountyHuntersActive: boolean;
}

export function getReputationInfo(reputation = 0): ReputationInfo {
  const score = clampReputation(reputation);
  if (score >= 50) {
    return {
      score,
      title: 'Спаситель Вальдмарка',
      tier: 'savior',
      priceMultiplier: 0.75, // 25% discount
      greetingPrefix: 'Честь и слава Спасителю Вальдмарка! Для тебя лучшие цены в долине.',
      triggersBountyHunters: false,
      bountyHuntersActive: false,
    };
  }
  if (score >= 15) {
    return {
      score,
      title: 'Защитник Долины',
      tier: 'defender',
      priceMultiplier: 0.88, // 12% discount
      greetingPrefix: 'Рады видеть честного Зольника! Люди благодарны за твою защиту.',
      triggersBountyHunters: false,
      bountyHuntersActive: false,
    };
  }
  if (score <= -50) {
    return {
      score,
      title: 'Пепельный Мясник',
      tier: 'butcher',
      priceMultiplier: 1.3, // 30% markup at honest shops
      greetingPrefix: 'Не убивай! За твою голову назначена награда, Пепельный Мясник...',
      triggersBountyHunters: true,
      bountyHuntersActive: true,
    };
  }
  if (score <= -20) {
    return {
      score,
      title: 'Безжалостный Наёмник',
      tier: 'mercenary',
      priceMultiplier: 1.15, // 15% markup
      greetingPrefix: 'Говорят, от твоего меча плачут даже вдовы... Плати сполна, Зольник.',
      triggersBountyHunters: true,
      bountyHuntersActive: true,
    };
  }
  return {
    score,
    title: 'Странствующий Зольник',
    tier: 'neutral',
    priceMultiplier: 1.0,
    greetingPrefix: 'Здравствуй, охотник из Братства Пепла.',
    triggersBountyHunters: false,
    bountyHuntersActive: false,
  };
}

export function calculateMerchantPrice(
  basePrice: number,
  reputation = 0,
  isFence = false
): number {
  const info = getReputationInfo(reputation);
  if (isFence) {
    // Fence on Silvertooth Pass favors outlaws and gives a discount to low-reputation players
    const fenceMult = info.score <= -20 ? 0.8 : info.score >= 40 ? 1.1 : 0.95;
    return Math.max(1, Math.round(basePrice * fenceMult));
  }
  return Math.max(1, Math.round(basePrice * info.priceMultiplier));
}

// ============================================================================
// 2. COMPANIONS SYSTEM (Лира, Торвальд, Веспер)
// ============================================================================

export interface CompanionProfile {
  id: CompanionId;
  name: string;
  title: string;
  role: string;
  roleDescription: string;
  weaponLabel: string;
  weaponDesc: string;
  abilityLabel: string;
  maxHp: number;
  baseDamage: number;
  preferredRange: number;
  biomeBarks: Partial<Record<BiomeId, string>>;
  campfireDialogue: {
    title: string;
    text: string;
    corvusReply: string;
    bondBonusText: string;
  };
}

export const COMPANION_PROFILES: Record<CompanionId, CompanionProfile> = {
  lyra: {
    id: 'lyra',
    name: 'Лира из Вольной Роты',
    title: 'Мастер-лучница и следопыт',
    role: 'Мастер-лучница и следопыт',
    roleDescription: 'Держит дистанцию, расстреливает врагов из лука и подсвечивает ловушки/тайники',
    weaponLabel: 'Длинный тисовый лук',
    weaponDesc: 'Длинный тисовый лук',
    abilityLabel: 'Стрелковое прикрытие и подсветка ловушек/тайников',
    maxHp: 210,
    baseDamage: 26,
    preferredRange: 9.5,
    biomeBarks: {
      village: 'Лира: «В Вороньей Пади хоть пахнет хлебом и дымом, а не мертвечиной.»',
      old_forest: 'Лира: «Держи тетиву сухой, Корвус. В этих зарослях волки заходят со спины.»',
      cursed_sanctuary: 'Лира: «От этого алтаря у меня мурашки по коже... Смотри под ноги, я подсвечу тайники!»',
      ruined_fortress: 'Лира: «Вольная Рота штурмовала такие стены в юности. Ищи брешь во фланге!»',
      ash_cemetery: 'Лира: «Костры инквизиторов и могильный пепел... Не подпускай мертвецов близко, я прикрою залпом!»',
      gallows_swamp: 'Лира: «Проклятая трясина! Клетки на деревьях ещё качаются... Стреляю по тварям в воде!»',
      silver_pass: 'Лира: «Пальцы коченеют от метели на перевале, но моя стрела найдёт глаз троглодита.»',
      ash_bastion: 'Лира: «Так вот где вас ковали, Зольников... Мрачное место даже для наёмницы.»',
      eclipse_crater: 'Лира: «Небо расколото надвое... Клянусь Вольной Ротой, Корвус, мы дойдём до Трона!»',
    },
    campfireDialogue: {
      title: 'Беседа у костра: Клятва Вольной Роты',
      text: 'Знаешь, почему я ушла из Вольной Роты, Корвус? В Ночь Пепельного Затмения наш капитан приказал бросить беженцев у моста и спасать обоз с золотом. Я пустила стрелу ему в сапог и осталась прикрывать переправу. С тех пор я стреляю только за тех, кто не прячется за чужими спинами.',
      corvusReply: 'Твой лук спас мне жизнь не раз, Лира. Вместе мы выведем эту долину из мрака.',
      bondBonusText: 'Узы доверия с Лирой укреплены: +15% к урону стрел и скорости стрельбы!',
    },
  },
  thorvald: {
    id: 'thorvald',
    name: 'Брат Торвальд',
    title: 'Паладин-Отступник Алого Солнца',
    role: 'Паладин-Отступник Алого Солнца',
    roleDescription: 'Танкует врагов щитом и булавой, периодически накладывает лечение и щит Света',
    weaponLabel: 'Башенный щит и боевое кадило-булава',
    weaponDesc: 'Башенный щит и булава',
    abilityLabel: 'Танкование угрозы и «Благословение Света» (Щит + Исцеление)',
    maxHp: 340,
    baseDamage: 32,
    preferredRange: 2.3,
    biomeBarks: {
      village: 'Торвальд: «Эти люди измучены страхом. Наш щит — их единственная надежда, брат Корвус.»',
      old_forest: 'Торвальд: «Тьма в кронах сгущается, но истинный Свет не нуждается в кострах инквизиции.»',
      cursed_sanctuary: 'Торвальд: «Ересь древнего культа! Встань за моим щитом, Зольник, я приму первый удар.»',
      ruined_fortress: 'Торвальд: «Гордыня короля Малакора обратила твердыню в склеп. Сокрушим его стражей!»',
      ash_cemetery: 'Торвальд: «Инквизитор Лазарь опозорил наш Орден. Истинный паладин защищает живых, а не сжигает их!»',
      gallows_swamp: 'Торвальд: «Господи милосердный... Беженцев топили здесь целыми семьями. Я упокою их души булавой.»',
      silver_pass: 'Торвальд: «Мороз Среброзубого Перевала не остудит праведный гнев! Держись за моей спиной!»',
      ash_bastion: 'Торвальд: «Твоё Братство приняло мученический венец, Корвус. Почтим их память в честном бою!»',
      eclipse_crater: 'Торвальд: «В самое пекло Пустоты! Пусть мой щит расколется, но ты дойдёшь до Алтаря!»',
    },
    campfireDialogue: {
      title: 'Беседа у костра: Пепел и Солнце',
      text: 'Когда Лазарь приказал запереть ворота чумного квартала и поджечь крыши, я сорвал с плаща золотое солнце Ордена. Они называют тебя мутантом с Тлеющей Кровью, Корвус, но в твоём сердце больше человечности, чем у всех кардиналов столицы. Мой щит закрывает тебя до последнего вздоха.',
      corvusReply: 'Для меня честь идти в бой плечом к плечу с настоящим рыцарем, брат Торвальд.',
      bondBonusText: 'Узы братства с Торвальдом укреплены: +20% к прочности щита и исцелению!',
    },
  },
  vesper: {
    id: 'vesper',
    name: 'Грандмастер Веспер',
    title: 'Наставник Школы Ворона · Мастер Пепла',
    role: 'Наставник Школы Ворона · Мастер Пепла',
    roleDescription: 'Мастер-охотник Братства, сражается парными клинками и боевыми Знаками',
    weaponLabel: 'Парные рунные клинки «Клыки Сумерек»',
    weaponDesc: 'Парные рунные клинки',
    abilityLabel: 'Вихрь парных мечей и боевые Печати Пепла (Игнис / Аард)',
    maxHp: 380,
    baseDamage: 44,
    preferredRange: 2.5,
    biomeBarks: {
      village: 'Веспер: «Воронья Падь... Двенадцать лет я хранил их тайну. Завершим начатое, ученик.»',
      old_forest: 'Веспер: «Помни первый урок Каэр-Пепла, Корвус: слушай ветер прежде, чем обнажить серебро.»',
      gallows_swamp: 'Веспер: «Я видел, как армия Малакора гнала людей в эти топи. Тогда я был бессилен... но не сегодня.»',
      silver_pass: 'Веспер: «В глубине этих шахт мы впервые нашли Чёрную Руду. Держи клинок наготове.»',
      ash_bastion: 'Веспер: «Каждый меч во дворе Бастиона — мой крест, Корвус. Спасибо, что дал мне шанс искупить его в бою.»',
      eclipse_crater: 'Веспер: «Вот он — эпицентр Ночи Пепельного Затмения. Два последних Зольника против самой Бездны!»',
    },
    campfireDialogue: {
      title: 'Беседа у костра: Искупление Наставника',
      text: 'Когда ты прижал клинок к моему горлу во дворе Чёрного Бастиона, я ждал смерти как избавления, Корвус. Ты превзошёл меня не только в фехтовании, но и в мудрости. Всё, чему я учил тебя с детства — теперь твоё. Веди нас к Сердцу Пустоты, Грандмастер.',
      corvusReply: 'Школа Ворона ещё жива, пока мы оба держим строй, учитель.',
      bondBonusText: 'Единство Школы Ворона: урон клинков и Печатей Веспера увеличен на +20%!',
    },
  },
};

export const COMPANION_COMMAND_ORDER: CompanionCommand[] = [
  'attack_target',
  'follow_close',
  'hold_position',
];

export function getNextCompanionCommand(current: CompanionCommand): CompanionCommand {
  const normalized = current === 'follow' ? 'follow_close' : current;
  const idx = COMPANION_COMMAND_ORDER.indexOf(normalized);
  if (idx === -1) return 'attack_target';
  return COMPANION_COMMAND_ORDER[(idx + 1) % COMPANION_COMMAND_ORDER.length];
}

export function getCompanionCommandLabel(command: CompanionCommand): string {
  switch (command) {
    case 'attack_target':
      return 'Атакуй мою цель';
    case 'follow':
    case 'follow_close':
      return 'Держись рядом';
    case 'hold_position':
      return 'Жди здесь';
  }
}

// ============================================================================
// 3. AI DAILY SCHEDULES & LIVING WORLD SIMULATION
// ============================================================================

export function computeNpcSchedule(
  role: NonNullable<WorldInteractable['npcScheduleRole']>,
  timeOfDay: number,
  weather: WeatherType,
  hasNearbyMonster: boolean,
  isArmedDefender: boolean,
  homeX: number,
  homeZ: number,
  elapsed = 0
): {
  state: NpcActivityState;
  targetX: number;
  targetZ: number;
  activityLabel: string;
  torchLit: boolean;
} {
  // 1. Emergency Combat / Monster Lured into Village or Camp
  if (hasNearbyMonster) {
    if (isArmedDefender || role === 'torch_guard' || role === 'blacksmith' || role === 'companion_npc') {
      return {
        state: 'COMBAT_DEFEND',
        targetX: homeX,
        targetZ: homeZ,
        activityLabel: '⚔️ В бою: Защищает поселение от чудовищ!',
        torchLit: role === 'torch_guard',
      };
    }
    return {
      state: 'PANIC_FLEE',
      targetX: -8,
      targetZ: 10, // Flee toward safe houses
      activityLabel: '😱 В панике: Прячется от монстра!',
      torchLit: false,
    };
  }

  // 2. Wandering Caravan Merchant along the trade road
  if (role === 'caravan') {
    const cycle = Math.sin(elapsed * 0.04); // Smoothly travels between village (z=12) and northern road (z=-75)
    const roadZ = -30 + cycle * 42;
    const roadX = 2 + Math.sin(roadZ * 0.05) * 3;
    return {
      state: 'CARAVAN_MARCH',
      targetX: roadX,
      targetZ: roadZ,
      activityLabel:
        weather === 'rain'
          ? '🛞 Караван в пути (Укрывает тюки от дождя)'
          : '🛞 Странствующий караван (Торговля редкими товарами)',
      torchLit: timeOfDay >= 20 || timeOfDay < 6,
    };
  }

  // 3. Torch Guards patrol 24/7, lighting torches at night/rain/fog
  if (role === 'torch_guard') {
    const patrolOffset = Math.sin(elapsed * 0.35 + homeX) * 6.5;
    const patrolOffsetZ = Math.cos(elapsed * 0.35 + homeZ) * 6.5;
    const isDark = timeOfDay >= 19 || timeOfDay < 7 || weather !== 'clear';
    return {
      state: 'PATROL_TORCH',
      targetX: homeX + patrolOffset,
      targetZ: homeZ + patrolOffsetZ,
      activityLabel: isDark
        ? '🔥 Ночной дозор с факелом (Охраняет периметр)'
        : '🛡️ Дозор стражи (Охраняет порядок)',
      torchLit: isDark,
    };
  }

  // 4. Contraband Fence on Silvertooth Pass
  if (role === 'fence') {
    return {
      state: 'WORK',
      targetX: homeX,
      targetZ: homeZ,
      activityLabel: '🗡️ Чёрный рынок Перевала (Скупка трофеев и редкостей)',
      torchLit: true,
    };
  }

  // 5. Companion waiting in camp
  if (role === 'companion_npc') {
    return {
      state: 'WORK',
      targetX: homeX,
      targetZ: homeZ,
      activityLabel: '⚔️ Готов отправиться в поход',
      torchLit: timeOfDay >= 20 || timeOfDay < 6,
    };
  }

  // 6. Rain / Storm Shelter for villagers
  if (weather === 'rain') {
    return {
      state: 'SHELTER_RAIN',
      targetX: homeX * 0.6 - 4,
      targetZ: homeZ * 0.6 - 2,
      activityLabel: '🌧️ Пережидает непогоду под навесом',
      torchLit: false,
    };
  }

  // 7. Nighttime Sleep (22:00 .. 06:30)
  if (timeOfDay >= 22 || timeOfDay < 6.5) {
    return {
      state: 'SLEEP_INDOORS',
      targetX: homeX > 0 ? 11.5 : -10.5,
      targetZ: homeZ > 0 ? 10.5 : -8.5,
      activityLabel: '🌙 Спит в доме до рассвета',
      torchLit: false,
    };
  }

  // 8. Evening Gathering at Tavern & Campfire (18:00 .. 22:00)
  if (timeOfDay >= 18 && timeOfDay < 22) {
    if (role === 'bard') {
      return {
        state: 'PERFORM_BARD',
        targetX: -5.2,
        targetZ: -3.2,
        activityLabel: '🎵 Исполняет вечерние баллады у трактира',
        torchLit: true,
      };
    }
    return {
      state: 'GATHER_TAVERN',
      targetX: 1.5 + Math.cos(homeX) * 3.2,
      targetZ: 1.5 + Math.sin(homeZ) * 3.2,
      activityLabel: '🍺 Отдыхает у вечернего костра и в трактире',
      torchLit: false,
    };
  }

  // 9. Daytime Work Schedules (06:30 .. 18:00)
  switch (role) {
    case 'blacksmith':
      return {
        state: 'ANVIL_FORGE',
        targetX: 10,
        targetZ: 6.5,
        activityLabel: '🔨 Куёт сталь у раскалённой наковальни',
        torchLit: false,
      };
    case 'farmer':
      return {
        state: 'WORK',
        targetX: -14 + Math.sin(elapsed * 0.25) * 3,
        targetZ: 5 + Math.cos(elapsed * 0.25) * 2.5,
        activityLabel: '🌾 Работает в поле (Возделывает землю)',
        torchLit: false,
      };
    case 'woodcutter':
      return {
        state: 'WORK',
        targetX: 14.5,
        targetZ: -7.5,
        activityLabel: '🪓 Рубит дрова на зиму у поленницы',
        torchLit: false,
      };
    case 'water_carrier': {
      const wPhase = (Math.sin(elapsed * 0.3) + 1) * 0.5;
      return {
        state: 'WORK',
        targetX: -1 + wPhase * 4,
        targetZ: -12 + wPhase * 13,
        activityLabel: '🪣 Носит воду вёдрами от реки к деревне',
        torchLit: false,
      };
    }
    case 'bard':
      return {
        state: 'PERFORM_BARD',
        targetX: -5.2,
        targetZ: -3.2,
        activityLabel: '🎵 Слагает баллады о подвигах Корвуса',
        torchLit: false,
      };
    case 'merchant':
      return {
        state: 'WORK',
        targetX: homeX,
        targetZ: homeZ,
        activityLabel: '⚖️ Торгует припасами в лавке',
        torchLit: false,
      };
    case 'herbalist':
      return {
        state: 'WORK',
        targetX: homeX + Math.sin(elapsed * 0.2) * 1.5,
        targetZ: homeZ + Math.cos(elapsed * 0.2) * 1.5,
        activityLabel: '🌿 Сушит целебные травы и варит снадобья',
        torchLit: false,
      };
    case 'elder':
    default:
      return {
        state: 'WORK',
        targetX: homeX,
        targetZ: homeZ,
        activityLabel: '📜 Следит за порядком в Вороньей Пади',
        torchLit: false,
      };
  }
}

// ============================================================================
// 4. NON-LINEAR INVESTIGATION QUESTS & WORLD CONSEQUENCES
// ============================================================================

export interface InvestigationChoiceDefinition {
  questId: string;
  questTitle: string;
  choiceId: string;
  choiceTitle: string;
  summary: string;
  worldEffectDescription: string;
  reputationDelta: number;
  goldReward: number;
  xpReward: number;
  itemReward?: string;
  blacksmithClosedSeconds?: number;
  maxHpBonus?: number;
  signIntensityBonus?: number;
}

export const INVESTIGATION_QUEST_CHOICES: Record<string, InvestigationChoiceDefinition> = {
  belltower_kill_wife: {
    questId: 'quest_blood_belltower',
    questTitle: 'Кровь на колокольне',
    choiceId: 'belltower_kill_wife',
    choiceTitle: 'Суд Стали: Казнь заражённой Хельги',
    summary:
      'Корвус исполнил суровый закон охотников и прервал страдания Хельги, жены кузнеца Торна, обращённой проклятием «Ночного Голода». Деревня спасена от ночных убийств, но сердце кузнеца разбито.',
    worldEffectDescription:
      'У кузницы возведён могильный крест со свечами. Кузнец Торн впал в глубокий траур и временно закрыл горн, а в разговорах винит Корвуса в гибели жены.',
    reputationDelta: 10,
    goldReward: 180,
    xpReward: 280,
    blacksmithClosedSeconds: 120,
  },
  belltower_cleanse_ritual: {
    questId: 'quest_blood_belltower',
    questTitle: 'Кровь на колокольне',
    choiceId: 'belltower_cleanse_ritual',
    choiceTitle: 'Ритуал Очищения: Спасение через Тлеющую Кровь',
    summary:
      'Корвус отказался убивать Хельгу и вместе с травницей Марфой провёл опаснейший ритуал выжигания «Ночного Голода» собственной Тлеющей Кровью и Знаком Игнис.',
    worldEffectDescription:
      'Исцелённая Хельга вернулась к очагу у кузницы, а благодарный Мастер Торн даровал Корвусу древний рунный слиток и вечное уважение.',
    reputationDelta: 25,
    goldReward: 140,
    xpReward: 320,
    itemReward: 'black_ore',
  },
  belltower_blame_outsider: {
    questId: 'quest_blood_belltower',
    questTitle: 'Кровь на колокольне',
    choiceId: 'belltower_blame_outsider',
    choiceTitle: 'Кровавая Сделка: Ложное обвинение чужака',
    summary:
      'За мешок золота от отчаявшегося кузнеца Торна Корвус скрыл правду о болезни Хельги и свалил вину на бродячего артиста. Невиновный изгнан, а тайный голод в кузнице лишь затаился.',
    worldEffectDescription:
      'У ворот Вороньей Пади выставлен позорный столб изгнанного артиста. Жители перешёптываются в страхе, а по ночам у кузницы всё ещё видят багровые тени.',
    reputationDelta: -25,
    goldReward: 300,
    xpReward: 240,
  },

  feast_burn_manor: {
    questId: 'quest_feast_of_ravens',
    questTitle: 'Пир Воронов',
    choiceId: 'feast_burn_manor',
    choiceTitle: 'Пепел Иллюзий: Сожжение проклятого поместья Вейнов',
    summary:
      'Корвус отверг сделку с безумным лордом Эдгаром Вейном, сжёг иллюзорный пир мертвецов и упокоил призраков его семьи, сразив самого одержимого аристократа и чудовище в подвале.',
    worldEffectDescription:
      'Заброшенное поместье в Топях очищено священным пламенем: иллюзорные гости исчезли, а путники на Тракте Висельников больше не пропадают по ночам.',
    reputationDelta: 25,
    goldReward: 220,
    xpReward: 350,
  },
  feast_spare_illusions: {
    questId: 'quest_feast_of_ravens',
    questTitle: 'Пир Воронов',
    choiceId: 'feast_spare_illusions',
    choiceTitle: 'Пакт с Призраками: Сохранение вечного пира лорда Вейна',
    summary:
      'Корвус оставил лорду Вейну артефакт иллюзий в обмен на ключ от сокровищницы и фамильный клинок Дома Вейнов, позволив мёртвому пиру продолжаться в тумане Топей.',
    worldEffectDescription:
      'Над поместьем Вейнов в Топях продолжает гореть призрачное лиловое зарево, за столом пируют мертвецы, а лорд Вейн приветствует Корвуса как почётного гостя.',
    reputationDelta: -20,
    goldReward: 360,
    xpReward: 300,
    itemReward: 'relic_blade',
  },

  mines_protect_ghouls: {
    questId: 'quest_dead_mines_oath',
    questTitle: 'Клятва в Мёртвых Шахтах',
    choiceId: 'mines_protect_ghouls',
    choiceTitle: 'Щит для Изгоев: Защита разумных горняков-гулей',
    summary:
      'Увидев, что обращённые Чёрной Рудой рудокопы сохранили человечность и защищают своего ребёнка, Корвус встал на их сторону и разгромил карательный отряд Инквизиции.',
    worldEffectDescription:
      'Заблокированный штрек Мёртвых Шахт перешёл под контроль общины старейшины Тороса: горняки-мутанты мирно добывают Чёрную Руду и делятся ею с Корвусом.',
    reputationDelta: 20,
    goldReward: 180,
    xpReward: 380,
    itemReward: 'black_ore',
  },
  mines_purge_for_order: {
    questId: 'quest_dead_mines_oath',
    questTitle: 'Клятва в Мёртвых Шахтах',
    choiceId: 'mines_purge_for_order',
    choiceTitle: 'Железный Закон Ордена: Зачистка Мёртвых Шахт',
    summary:
      'Корвус счёл мутацию Чёрной Руды необратимой угрозой и помог отряду Ордена Алого Солнца полностью выжечь общину заражённых горняков ради безопасности перевала.',
    worldEffectDescription:
      'Над Мёртвыми Шахтами реют стяги Ордена Алого Солнца и горят очистительные жаровни инквизиции, а капитан Валлен выплатил полную казённую награду.',
    reputationDelta: -20,
    goldReward: 340,
    xpReward: 340,
  },

  exam_revive_brotherhood: {
    questId: 'quest_last_ash_exam',
    questTitle: 'Последний Экзамен Зольника',
    choiceId: 'exam_revive_brotherhood',
    choiceTitle: 'Возрождение Школы Ворона: Испытание Тлеющей Кровью',
    summary:
      'Корвус безупречно провёл смертельный ритуал мутации над молодым адептом Эрианом. Выдержав агонию Тлеющей Крови, Эриан открыл янтарные глаза и стал первым новым Зольником возрождённого Братства.',
    worldEffectDescription:
      'В алхимическом зале Чёрного Бастиона вновь горят янтарные чаны Школы Ворона, а посвящённый охотник Эриан несёт стражу с двумя мечами за спиной.',
    reputationDelta: 15,
    goldReward: 200,
    xpReward: 450,
    maxHpBonus: 20,
    signIntensityBonus: 0.15,
  },
  exam_bury_secrets: {
    questId: 'quest_last_ash_exam',
    questTitle: 'Последний Экзамен Зольника',
    choiceId: 'exam_bury_secrets',
    choiceTitle: 'Конец Мутаций: Погребение секретов Тлеющей Крови',
    summary:
      'Корвус отказался обрекать юного Эриана на муки мутации, разбил алхимические сосуды Каэр-Пепла и навсегда похоронил бесчеловечные формулы создания Зольников.',
    worldEffectDescription:
      'Чаны мутаций в Чёрном Бастионе разрушены навсегда. Спасённый Эриан сохранил человеческую жизнь и стал хранителем летописей Братства.',
    reputationDelta: 25,
    goldReward: 260,
    xpReward: 450,
  },
};

export function validateAshExamRitual(
  dosageCorrect: boolean,
  signCorrect: boolean
): {
  precisionScore: number;
  statusLabel: string;
  bonusXp: number;
} {
  const precisionScore = (dosageCorrect ? 50 : 0) + (signCorrect ? 50 : 0);
  if (precisionScore === 100) {
    return {
      precisionScore,
      statusLabel: 'Безупречный синтез Тлеющей Крови (Пульс адепта стабилен)',
      bonusXp: 120,
    };
  }
  if (precisionScore === 50) {
    return {
      precisionScore,
      statusLabel: 'Нестабильная мутация (Высокая токсичность, но сердце выдержало)',
      bonusXp: 60,
    };
  }
  return {
    precisionScore,
    statusLabel: 'Критический сбой ритуала (Потребовалось экстренное вмешательство Знаком)',
    bonusXp: 25,
  };
}

export function resolveInvestigationQuestChoice(
  stats: PlayerStats,
  choiceId: string,
  dayTimeLabel = 'ДЕНЬ 1'
): {
  updatedStats: PlayerStats;
  consequence: QuestConsequenceRecord | null;
  definition: InvestigationChoiceDefinition | null;
} {
  const def = INVESTIGATION_QUEST_CHOICES[choiceId];
  if (!def) {
    return { updatedStats: stats, consequence: null, definition: null };
  }

  const record: QuestConsequenceRecord = {
    questId: def.questId,
    questTitle: def.questTitle,
    choiceId: def.choiceId,
    choiceTitle: def.choiceTitle,
    summary: def.summary,
    worldEffectDescription: def.worldEffectDescription,
    timestampLabel: dayTimeLabel,
  };

  const prevChoices = { ...(stats.questChoices ?? {}) };
  prevChoices[def.questId] = def.choiceId;

  const prevConsequences = (stats.questConsequences ?? []).filter(
    (c) => c.questId !== def.questId
  );
  prevConsequences.unshift(record);

  const xpResult = applyExperienceGain(stats, def.xpReward);
  const nextRep = clampReputation((stats.reputation ?? 0) + def.reputationDelta);

  const updatedStats: PlayerStats = {
    ...xpResult.updated,
    gold: xpResult.updated.gold + def.goldReward,
    reputation: nextRep,
    maxHp: xpResult.updated.maxHp + (def.maxHpBonus ?? 0),
    hp: Math.min(
      xpResult.updated.maxHp + (def.maxHpBonus ?? 0),
      xpResult.updated.hp + (def.maxHpBonus ?? 0)
    ),
    signIntensity: Number(
      (xpResult.updated.signIntensity + (def.signIntensityBonus ?? 0)).toFixed(2)
    ),
    questChoices: prevChoices,
    questConsequences: prevConsequences,
    blacksmithClosedTimer:
      def.blacksmithClosedSeconds !== undefined
        ? def.blacksmithClosedSeconds
        : stats.blacksmithClosedTimer,
  };

  return {
    updatedStats,
    consequence: record,
    definition: def,
  };
}

/**
 * Resolves 3D movement against both cylindrical obstacles (trees, pillars, rocks)
 * and AABB Box3 footprints (houses, fortress walls, chests, ruins) with smooth
 * X/Z axis-separated Sliding Collision and floor elevation clamping.
 */
export function resolveSlidingCollision(
  prevX: number,
  prevZ: number,
  targetX: number,
  targetZ: number,
  entityRadius: number,
  cylinders: { x: number; z: number; radius: number }[],
  boxes: CollisionBox[] = []
): { x: number; z: number; y: number } {
  let x = targetX;
  let z = targetZ;

  // 1. Axis-separated AABB Box3 sliding resolution (X then Z)
  let testX = x;
  let testZ = prevZ;
  for (const box of boxes) {
    if (box.isWalkableFloor) continue;
    const expandedMinX = box.minX - entityRadius;
    const expandedMaxX = box.maxX + entityRadius;
    const expandedMinZ = box.minZ - entityRadius;
    const expandedMaxZ = box.maxZ + entityRadius;

    if (
      testX > expandedMinX &&
      testX < expandedMaxX &&
      testZ > expandedMinZ &&
      testZ < expandedMaxZ
    ) {
      // Push out along X to nearest edge
      const distLeft = Math.abs(testX - expandedMinX);
      const distRight = Math.abs(expandedMaxX - testX);
      testX = distLeft < distRight ? expandedMinX : expandedMaxX;
    }
  }
  x = testX;

  testZ = z;
  for (const box of boxes) {
    if (box.isWalkableFloor) continue;
    const expandedMinX = box.minX - entityRadius;
    const expandedMaxX = box.maxX + entityRadius;
    const expandedMinZ = box.minZ - entityRadius;
    const expandedMaxZ = box.maxZ + entityRadius;

    if (
      x > expandedMinX &&
      x < expandedMaxX &&
      testZ > expandedMinZ &&
      testZ < expandedMaxZ
    ) {
      // Push out along Z to nearest edge
      const distTop = Math.abs(testZ - expandedMinZ);
      const distBottom = Math.abs(expandedMaxZ - testZ);
      testZ = distTop < distBottom ? expandedMinZ : expandedMaxZ;
    }
  }
  z = testZ;

  // 2. Cylindrical radial push-out (smooth tangential slide around trees, rocks, pillars)
  for (const obs of cylinders) {
    const dx = x - obs.x;
    const dz = z - obs.z;
    const minDist = entityRadius + obs.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq) || 0.001;
      const overlap = minDist - dist;
      x += (dx / dist) * overlap;
      z += (dz / dist) * overlap;
    }
  }

  // 3. Determine accurate ground + walkable bridge/platform floor height
  let y = x > 82 && x < 126 && z > 82 && z < 126 ? 0 : getGroundHeight(x, z);
  for (const box of boxes) {
    if (
      box.isWalkableFloor &&
      typeof box.floorY === 'number' &&
      x >= box.minX &&
      x <= box.maxX &&
      z >= box.minZ &&
      z <= box.maxZ
    ) {
      y = Math.max(y, box.floorY);
    }
  }

  return { x, z, y };
}

/**
 * Pure function that detects hardware platform ('pc' vs 'mobile') from a device environment snapshot.
 * Handles mobile/tablet User-Agents, iPadOS desktop UA with touch points, coarse pointer media queries,
 * and mobile viewport dimensions (both portrait and landscape).
 */
export function detectHardwarePlatform(
  env: DeviceEnvironmentSnapshot
): ControlPlatform {
  const ua = env.userAgent ?? '';
  const maxTouchPoints = env.maxTouchPoints ?? 0;
  const hasCoarsePointer = Boolean(env.hasCoarsePointer);
  const hasFinePointer = Boolean(env.hasFinePointer);
  const hasHover = env.hasHover ?? true;
  const w = env.screenWidth ?? 1440;
  const h = env.screenHeight ?? 900;
  const minSide = Math.min(w, h);

  // 1. Explicit mobile/phone/tablet User-Agent strings
  const mobileUaRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|Kindle/i;
  if (mobileUaRegex.test(ua)) {
    return 'mobile';
  }

  // 2. iPadOS 13+ reporting as Macintosh with multi-touch hardware
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) {
    return 'mobile';
  }

  // 3. Primary input is coarse pointer without fine mouse or hover capability
  if (hasCoarsePointer && (!hasFinePointer || !hasHover)) {
    return 'mobile';
  }

  // 4. Compact mobile viewport (portrait width < 768px or landscape short side <= 540px on touch/mobile emulation)
  if (w < 768 || (minSide <= 540 && (maxTouchPoints > 0 || hasCoarsePointer))) {
    return 'mobile';
  }

  return 'pc';
}

/**
 * Resolves the active control platform ('pc' | 'mobile') combining user setting ('auto' | 'pc' | 'mobile'),
 * hardware detection, and live input events (touch vs mouse/keyboard).
 */
export function resolveControlPlatform(
  mode: ControlModeSetting | undefined,
  env: DeviceEnvironmentSnapshot
): ControlPlatform {
  if (mode === 'pc') return 'pc';
  if (mode === 'mobile') return 'mobile';

  // In 'auto' mode, live touch immediately activates mobile controls
  if (env.lastInputType === 'touch') {
    return 'mobile';
  }

  const hw = detectHardwarePlatform(env);
  if (env.lastInputType === 'mouse_keyboard' && hw === 'pc') {
    return 'pc';
  }

  return hw;
}

/**
 * Reads the current browser environment snapshot safely (SSR/Node-test safe).
 */
export function getBrowserDeviceSnapshot(
  lastInputType: 'mouse_keyboard' | 'touch' | null = null
): DeviceEnvironmentSnapshot {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      userAgent: '',
      maxTouchPoints: 0,
      hasCoarsePointer: false,
      hasFinePointer: true,
      hasHover: true,
      screenWidth: 1440,
      screenHeight: 900,
      lastInputType,
    };
  }

  const matchMediaSafe = (query: string): boolean => {
    try {
      return typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false;
    } catch {
      return false;
    }
  };

  return {
    userAgent: navigator.userAgent ?? '',
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    hasCoarsePointer: matchMediaSafe('(pointer: coarse)'),
    hasFinePointer: matchMediaSafe('(pointer: fine)'),
    hasHover: matchMediaSafe('(hover: hover)'),
    screenWidth: window.innerWidth || 1440,
    screenHeight: window.innerHeight || 900,
    lastInputType,
  };
}

/**
 * Returns localized control scheme descriptions for the resolved platform ('pc' vs 'mobile').
 */
export function getPlatformControlSummary(
  platform: ControlPlatform,
  lang: GameLanguage = 'ru'
): {
  platformBadge: string;
  moveDodge: string;
  combatBlock: string;
  ashSigns: string;
  codexMenus: string;
  pointerHint: string;
} {
  if (platform === 'mobile') {
    if (lang === 'en') {
      return {
        platformBadge: 'Mobile Device Detected · Touch Controls Active',
        moveDodge: 'Left Joystick · Outer Ring Sprint · Dodge Button',
        combatBlock: 'Strike · Heavy · Block (Hold) · Dual Swords',
        ashSigns: 'Sign Cast · Cycle 5 Signs · Quick Potion',
        codexMenus: 'Touch Bar: Gear · Map · Alchemy · Senses',
        pointerHint: 'Touch Mode: Swipe anywhere on the screen to rotate the camera, use the left joystick to move',
      };
    }
    return {
      platformBadge: 'Определено устройство: Телефон · Сенсорное управление',
      moveDodge: 'Джойстик слева · Бег (до края) · Кнопка Рывок',
      combatBlock: 'Кнопки: Удар · Тяж. · Блок · Смена меча',
      ashSigns: 'Кнопки: Каст Знака · Выбор 5 Знаков · Зелье',
      codexMenus: 'Быстрое меню: Сумка · Карта · Алхимия · Чутьё',
      pointerHint: 'Сенсорный режим: проводите пальцем по экрану для обзора камеры, используйте джойстик для движения',
    };
  }

  if (lang === 'en') {
    return {
      platformBadge: 'PC Browser Detected · Keyboard & Mouse Controls',
      moveDodge: 'WASD · Shift (Sprint) · Space (Dodge)',
      combatBlock: 'LMB (Combo / Hold Heavy) · RMB (Block) · [1]/[2]',
      ashSigns: 'Q / 3-7 (Select Sign) · R (Cast) · F (Potion)',
      codexMenus: 'E · I · J · M · K · L · B · V (Senses)',
      pointerHint: 'PC Mode: Click the screen (or hold LMB + drag) to rotate the camera · [Esc] Pause & Settings',
    };
  }

  return {
    platformBadge: 'Определено устройство: ПК (Браузер) · Клавиатура и Мышь',
    moveDodge: 'WASD · Shift (Бег) · Space (Кувырок)',
    combatBlock: 'ЛКМ (Комбо / Зажать — Тяж.) · ПКМ (Блок) · [1]/[2]',
    ashSigns: 'Q / 3-7 (Выбор) · R (Каст Знака) · F (Зелье)',
    codexMenus: 'E · I · J · M · K · L · B · V (Чутьё)',
    pointerHint: 'Режим ПК: кликните по экрану (или зажмите ЛКМ) для обзора камеры · [Esc] Пауза и Настройки',
  };
}

/**
 * Default respawn duration (in seconds) for regular world mobs.
 */
export const DEFAULT_MOB_RESPAWN_SECONDS = 60;

/**
 * Determines whether a defeated enemy is a regular world mob that should respawn after a timer,
 * or a unique story/contract boss / temporary summon that stays dead permanently.
 */
export function isRespawnableMob(
  enemy: Pick<EnemyData, 'id' | 'type' | 'isContractBoss' | 'isSummonedShadow'> & {
    questTag?: string;
  }
): boolean {
  if (enemy.isContractBoss || enemy.isSummonedShadow) {
    return false;
  }

  // Dynamically spawned temporary squads or boss summons should not respawn
  if (
    enemy.id.startsWith('bounty_hunter_') ||
    enemy.id.startsWith('hydra_drowned_') ||
    enemy.id.startsWith('avatar_shadow_') ||
    enemy.id.startsWith('ww_summon_') ||
    enemy.id.startsWith('bounty_pack_')
  ) {
    return false;
  }

  // Unique story bosses, contract bosses, and named sanctuary witch Morana do not respawn
  const nonRespawnTypes: EnemyData['type'][] = [
    'boss',
    'malakor',
    'boss_hydra',
    'boss_colossus',
    'boss_vesper',
    'boss_avatar',
    'werewolf',
    'noonwraith',
    'gargoyle',
    'demon',
    'bounty_hunter',
  ];
  if (nonRespawnTypes.includes(enemy.type)) {
    return false;
  }

  if (enemy.id === 'hag_sanctuary' || enemy.questTag === 'q2_hag') {
    return false;
  }

  return true;
}

/**
 * Determines which 3D overhead quest indicator ('exclamation' for ! or 'question' for ? or 'none')
 * should be displayed above an NPC, Notice Board, or Quest Altar.
 * Priority: 'question' (turn-in / ready stage / verdict) > 'exclamation' (available quest/contract to take).
 */
export function getActorQuestIndicatorState(
  actorId: string,
  quests: Quest[],
  contracts: HunterContract[] = []
): 'exclamation' | 'question' | 'none' {
  const findQuest = (id: string) => quests.find((q) => q.id === id);

  // 1. Village Notice Board (Доска объявлений)
  if (actorId === 'notice_board_village') {
    const hasAvailableContract = contracts.some((c) => c.status === 'available');
    return hasAvailableContract ? 'exclamation' : 'none';
  }

  // 2. Elder Bran (Староста Бран)
  if (actorId === 'npc_elder') {
    const q1 = findQuest('quest_missing_hunters');
    const q3 = findQuest('quest_ancient_king');
    const qBell = findQuest('quest_blood_belltower');

    if (
      q1 &&
      q1.status === 'active' &&
      q1.currentStageIndex === 4 &&
      !q1.stages[4]?.completed
    ) {
      return 'question';
    }

    const q1CanStart =
      q1 &&
      q1.status !== 'completed' &&
      q1.currentStageIndex === 0 &&
      !q1.stages[0]?.completed;
    const q3CanStart =
      q1?.status === 'completed' && q3 && q3.status === 'available';
    const qBellCanStart = qBell && qBell.status === 'available';

    if (q1CanStart || q3CanStart || qBellCanStart) {
      return 'exclamation';
    }
    return 'none';
  }

  // 3. Village Guards (Стражники Гуннар и Рольф — дают наводку на «Кровь на колокольне»)
  if (actorId === 'npc_guard_1' || actorId === 'npc_guard_2') {
    const qBell = findQuest('quest_blood_belltower');
    if (qBell && qBell.status === 'available') {
      return 'exclamation';
    }
    return 'none';
  }

  // 4. Herbalist Marfa (Травница Марфа)
  if (actorId === 'npc_herbalist') {
    const q2 = findQuest('quest_swamp_whisper');
    const qBell = findQuest('quest_blood_belltower');

    if (
      qBell &&
      qBell.status === 'active' &&
      qBell.currentStageIndex === 2 &&
      !qBell.stages[2]?.completed
    ) {
      return 'question';
    }
    if (q2 && q2.status === 'available') {
      return 'exclamation';
    }
    return 'none';
  }

  // 5. Blacksmith Thorn (Кузнец Торн) & Bard Corvin (Бард Корвин)
  if (actorId === 'npc_blacksmith' || actorId === 'npc_bard') {
    const qBell = findQuest('quest_blood_belltower');
    if (
      qBell &&
      qBell.status === 'active' &&
      qBell.currentStageIndex === 2 &&
      !qBell.stages[2]?.completed
    ) {
      return 'question';
    }
    return 'none';
  }

  // 6. Helga (Жена кузнеца Торна — вердикт по квесту «Кровь на колокольне»)
  if (actorId === 'npc_belltower_helga') {
    const qBell = findQuest('quest_blood_belltower');
    if (
      qBell &&
      qBell.status === 'active' &&
      qBell.currentStageIndex === 3 &&
      !qBell.stages[3]?.completed
    ) {
      return 'question';
    }
    return 'none';
  }

  // 7. Cursed Sanctuary Altar (Алтарь Проклятого Святилища)
  if (actorId === 'shrine_cursed_altar') {
    const q2 = findQuest('quest_swamp_whisper');
    if (
      q2 &&
      q2.status === 'active' &&
      q2.currentStageIndex === 3 &&
      !q2.stages[3]?.completed
    ) {
      return 'question';
    }
    return 'none';
  }

  // 8. Inquisitorazar (Инквизитор Лазарь — Акт II)
  if (actorId === 'npc_inquisitor') {
    const q4 = findQuest('quest_act2_malakor');
    if (
      q4 &&
      q4.status !== 'completed' &&
      q4.currentStageIndex === 0 &&
      !q4.stages[0]?.completed
    ) {
      return 'exclamation';
    }
    return 'none';
  }

  // 9. Boatman Charon (Лодочник Харон — Поход на Север I)
  if (actorId === 'npc_charon') {
    const q5 = findQuest('quest_drowned_path');
    if (
      q5 &&
      q5.status !== 'completed' &&
      q5.currentStageIndex === 0 &&
      !q5.stages[0]?.completed
    ) {
      return 'exclamation';
    }
    return 'none';
  }

  // 10. Old Miner Brom (Старый Рудокоп Бром — Поход на Север II)
  if (actorId === 'npc_brom') {
    const q6 = findQuest('quest_mountain_blood');
    if (
      q6 &&
      q6.status !== 'completed' &&
      q6.currentStageIndex === 0 &&
      !q6.stages[0]?.completed
    ) {
      return 'exclamation';
    }
    return 'none';
  }

  // 11. Survivor Adept Kael (Выживший Адепт Каэль — Поход на Север III)
  if (actorId === 'npc_kael') {
    const q7 = findQuest('quest_ash_brotherhood');
    if (
      q7 &&
      q7.status !== 'completed' &&
      q7.currentStageIndex === 0 &&
      !q7.stages[0]?.completed
    ) {
      return 'exclamation';
    }
    return 'none';
  }

  // 12. Lord Edgar Vane (Лорд Эдгар Вейн — «Пир Воронов»)
  if (actorId === 'npc_lord_vane') {
    const qFeast = findQuest('quest_feast_of_ravens');
    if (!qFeast || qFeast.status === 'completed') return 'none';
    if (qFeast.status === 'active' && qFeast.currentStageIndex === 3 && !qFeast.stages[3]?.completed) {
      return 'question';
    }
    if (qFeast.currentStageIndex === 0 && !qFeast.stages[0]?.completed) {
      return 'exclamation';
    }
    return 'none';
  }

  // 13. Order Captain Vallen (Капитан Ордена Валлен — «Клятва в Мёртвых Шахтах»)
  if (actorId === 'npc_order_captain_mines') {
    const qMines = findQuest('quest_dead_mines_oath');
    if (!qMines || qMines.status === 'completed') return 'none';
    if (qMines.status === 'active' && qMines.currentStageIndex === 2 && !qMines.stages[2]?.completed) {
      return 'question';
    }
    if (qMines.currentStageIndex === 0 && !qMines.stages[0]?.completed) {
      return 'exclamation';
    }
    return 'none';
  }

  // 14. Sentient Ghoul Elder Toros (Старейшина горняков Торос — «Клятва в Мёртвых Шахтах»)
  if (actorId === 'npc_sentient_ghoul_elder') {
    const qMines = findQuest('quest_dead_mines_oath');
    if (
      qMines &&
      qMines.status === 'active' &&
      qMines.currentStageIndex === 2 &&
      !qMines.stages[2]?.completed
    ) {
      return 'question';
    }
    return 'none';
  }

  // 15. Apprentice Erian & Ritual Table («Последний Экзамен Зольника»)
  if (actorId === 'npc_apprentice_erian') {
    const qExam = findQuest('quest_last_ash_exam');
    if (!qExam || qExam.status === 'completed') return 'none';
    if (qExam.status === 'active' && qExam.currentStageIndex === 2 && !qExam.stages[2]?.completed) {
      return 'question';
    }
    if (qExam.currentStageIndex === 0 && !qExam.stages[0]?.completed) {
      return 'exclamation';
    }
    return 'none';
  }

  if (actorId === 'clue_bastion_ritual_table') {
    const qExam = findQuest('quest_last_ash_exam');
    if (
      qExam &&
      qExam.status === 'active' &&
      qExam.currentStageIndex === 2 &&
      !qExam.stages[2]?.completed
    ) {
      return 'question';
    }
    return 'none';
  }

  // 16. Eclipse Altar (Алтарь Пепельного Затмения — Финал)
  if (actorId === 'shrine_eclipse_altar') {
    const q8 = findQuest('quest_dawn_valdmark');
    if (
      q8 &&
      q8.status === 'active' &&
      q8.currentStageIndex === 2 &&
      !q8.stages[2]?.completed
    ) {
      return 'question';
    }
    return 'none';
  }

  // 17. Sunken Port Solheim Lighthouse Keeper Hendrick («Маяк Затонувшей Гавани»)
  if (actorId === 'npc_solheim_keeper') {
    const qPort = findQuest('quest_sunken_lighthouse');
    if (!qPort || qPort.status === 'completed') return 'none';
    if (qPort.status === 'active' && qPort.currentStageIndex === 2 && !qPort.stages[2]?.completed) {
      return 'question';
    }
    if (qPort.currentStageIndex === 0 && !qPort.stages[0]?.completed) {
      return 'exclamation';
    }
    return 'none';
  }

  // 18. Sun Monastery Abbot Caelum («Хроники Солнечных Клятв»)
  if (actorId === 'npc_monastery_abbot') {
    const qMon = findQuest('quest_monastery_chronicles');
    if (!qMon || qMon.status === 'completed') return 'none';
    if (qMon.status === 'active' && qMon.currentStageIndex === 2 && !qMon.stages[2]?.completed) {
      return 'question';
    }
    if (qMon.currentStageIndex === 0 && !qMon.stages[0]?.completed) {
      return 'exclamation';
    }
    return 'none';
  }

  // 19. Starfall Valley Precursor Herald & Anvil («Акт III: Кузница Предтеч и Падение Звезды»)
  if (actorId === 'npc_starfall_herald') {
    const qStar = findQuest('quest_act3_starfall_forge');
    if (!qStar || qStar.status === 'completed') return 'none';
    if (qStar.status === 'active' && qStar.currentStageIndex === 2 && !qStar.stages[2]?.completed) {
      return 'question';
    }
    if (qStar.currentStageIndex === 0 && !qStar.stages[0]?.completed) {
      return 'exclamation';
    }
    return 'none';
  }

  if (actorId === 'shrine_starfall_anvil') {
    const qStar = findQuest('quest_act3_starfall_forge');
    if (
      qStar &&
      qStar.status === 'active' &&
      qStar.currentStageIndex === 2 &&
      !qStar.stages[2]?.completed
    ) {
      return 'question';
    }
    return 'none';
  }

  return 'none';
}

// ============================================================================
// 8. SETTLEMENT FENCES, GATES & MOB EXCLUSION ZONES
// ============================================================================

export interface SettlementZone {
  id: string;
  name: string;
  x: number;
  z: number;
  /** Radius of the physical wooden palisade/fence surrounding the village */
  fenceRadius: number;
  /** Extended radius around the village where enemies are forbidden to spawn */
  spawnSafeRadius: number;
  /** Angles (in radians, atan2(dz, dx)) where open archway gates are placed */
  gateAngles: number[];
  /** Width of each gate opening in meters */
  gateWidth: number;
}

export const SETTLEMENT_ZONES: SettlementZone[] = [
  {
    id: 'village_crow_hollow',
    name: 'Деревня Воронья Падь',
    x: 0,
    z: 0,
    fenceRadius: 31.5,
    spawnSafeRadius: 37.5,
    gateAngles: [0, Math.PI / 2, Math.PI, -Math.PI / 2],
    gateWidth: 7.6,
  },
  {
    id: 'settlement_ranger_outpost',
    name: 'Лесной Кордон Егерей',
    x: -58,
    z: 18,
    fenceRadius: 9.5,
    spawnSafeRadius: 14.5,
    gateAngles: [0, -Math.PI / 2],
    gateWidth: 5.8,
  },
  {
    id: 'settlement_solheim_harbor',
    name: 'Гавань Сольхейма',
    x: -128,
    z: 0,
    fenceRadius: 18.5,
    spawnSafeRadius: 25.0,
    gateAngles: [0, Math.PI],
    gateWidth: 7.0,
  },
  {
    id: 'settlement_sun_monastery',
    name: 'Двор Лазурного Монастыря',
    x: 148,
    z: -15,
    fenceRadius: 16.5,
    spawnSafeRadius: 21.0,
    gateAngles: [Math.PI, 0],
    gateWidth: 7.0,
  },
  {
    id: 'settlement_order_camp',
    name: 'Лагерь Ордена Багрового Солнца',
    x: -12,
    z: 62,
    fenceRadius: 11.0,
    spawnSafeRadius: 16.0,
    gateAngles: [-Math.PI / 2, 0],
    gateWidth: 6.0,
  },
  {
    id: 'settlement_swamp_stilt_village',
    name: 'Свайный Посёлок в Топях',
    x: -54,
    z: -152,
    fenceRadius: 13.0,
    spawnSafeRadius: 18.5,
    gateAngles: [0],
    gateWidth: 6.2,
  },
];

/**
 * Checks whether a world coordinate (x, z) lies inside any village's fenced perimeter.
 */
export function isPointInsideSettlementFence(x: number, z: number, margin = 0): boolean {
  for (const zone of SETTLEMENT_ZONES) {
    const dist = Math.hypot(x - zone.x, z - zone.z);
    if (dist < zone.fenceRadius + margin) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a world coordinate (x, z) lies inside any village's extended no-spawn buffer zone.
 */
export function isPointInSettlementSafeZone(x: number, z: number, extraMargin = 0): boolean {
  for (const zone of SETTLEMENT_ZONES) {
    const dist = Math.hypot(x - zone.x, z - zone.z);
    if (dist < zone.spawnSafeRadius + extraMargin) {
      return true;
    }
  }
  return false;
}

/**
 * Ensures an enemy spawn point is strictly outside every settlement's spawnSafeRadius.
 * If a spawn coordinate falls inside a settlement or its nearby buffer, pushes it radially outward.
 */
export function clampEnemySpawnOutsideSettlements(
  x: number,
  z: number,
  extraMargin = 1.0
): { x: number; z: number; clamped: boolean } {
  let curX = x;
  let curZ = z;
  let clamped = false;

  for (const zone of SETTLEMENT_ZONES) {
    const dx = curX - zone.x;
    const dz = curZ - zone.z;
    const dist = Math.hypot(dx, dz);
    const minRadius = zone.spawnSafeRadius + extraMargin;
    if (dist < minRadius) {
      const angle = dist > 0.001 ? Math.atan2(dz, dx) : 0;
      curX = zone.x + Math.cos(angle) * minRadius;
      curZ = zone.z + Math.sin(angle) * minRadius;
      clamped = true;
    }
  }

  return { x: curX, z: curZ, clamped };
}

/**
 * Prevents active enemies (chasing, patrolling, lunging, or teleporting) from crossing
 * inside any village's fenced perimeter — even through open gates.
 */
export function clampEnemyPositionOutsideSettlements(
  x: number,
  z: number,
  margin = 1.1
): { x: number; z: number; clamped: boolean; settlementId: string | null } {
  let curX = x;
  let curZ = z;
  let clamped = false;
  let settlementId: string | null = null;

  for (const zone of SETTLEMENT_ZONES) {
    const dx = curX - zone.x;
    const dz = curZ - zone.z;
    const dist = Math.hypot(dx, dz);
    const barrierRadius = zone.fenceRadius + margin;
    if (dist < barrierRadius) {
      const angle = dist > 0.001 ? Math.atan2(dz, dx) : 0;
      curX = zone.x + Math.cos(angle) * barrierRadius;
      curZ = zone.z + Math.sin(angle) * barrierRadius;
      clamped = true;
      settlementId = zone.id;
    }
  }

  return { x: curX, z: curZ, clamped, settlementId };
}







