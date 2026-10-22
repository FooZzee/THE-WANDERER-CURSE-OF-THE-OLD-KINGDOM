import * as THREE from 'three';
import type { AssetManager } from './AssetManager';
import { WORLD_LORE_NOTES } from './loreData';
import { getGroundHeight } from './rules';
import type { WorldInteractable } from './types';

export class WorldSystem {
  public interactables: WorldInteractable[] = [];
  private meshes: Map<string, THREE.Object3D> = new Map();
  private scene: THREE.Scene;
  private assetManager: AssetManager;

  constructor(scene: THREE.Scene, assetManager: AssetManager) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.buildWorldInteractables();
  }

  private buildWorldInteractables(): void {
    const add = (item: Omit<WorldInteractable, 'y'>) => {
      const y = getGroundHeight(item.x, item.z);
      const full: WorldInteractable = { ...item, y };
      this.interactables.push(full);
      this.spawnVisualForInteractable(full);
    };

    add({
      id: 'npc_elder',
      type: 'npc',
      name: 'Староста Бран (Боримир)',
      roleOrSubtitle: 'Глава Вороньей Пади · Вальдмарк',
      promptText: 'Поговорить со Старостой Браном',
      x: 5,
      z: -3,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'elder_root',
    });

    add({
      id: 'npc_blacksmith',
      type: 'npc',
      name: 'Кузнец Торн (Гром)',
      roleOrSubtitle: 'Оружейник старой гвардии Вальдмарка',
      promptText: 'Поговорить с Кузнецом Торном',
      x: 10,
      z: 6.5,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'blacksmith_root',
    });

    add({
      id: 'npc_merchant',
      type: 'npc',
      name: 'Торговец Велеслав',
      roleOrSubtitle: 'Странствующий купец и трактирщик',
      promptText: 'Поговорить с Велеславом (Торговля и слухи)',
      x: -7,
      z: -2,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'merchant_root',
    });

    add({
      id: 'npc_herbalist',
      type: 'npc',
      name: 'Травница Марфа',
      roleOrSubtitle: 'Знахарка и хранительница Лесного Ковена',
      promptText: 'Поговорить с Травницей Марфой',
      x: 7,
      z: 14,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'herbalist_root',
    });

    add({
      id: 'clue_forest_tracks',
      type: 'clue',
      name: 'Кровавые следы у кромки леса',
      roleOrSubtitle: 'Улика охотничьего чутья',
      promptText: 'Осмотреть следы охотников',
      x: -18,
      z: 10,
      radius: 3.8,
      interacted: false,
      repeatable: true,
      questId: 'quest_missing_hunters',
      questStageId: 'q1_find_tracks',
      loreText: 'Глубокие борозды от когтей и обрывки кожаного плаща ведут на северо-запад к лесной поляне.',
    });

    add({
      id: 'clue_ambush_site',
      type: 'clue',
      name: 'Разгромленная повозка охотников',
      roleOrSubtitle: 'Место нападения',
      promptText: 'Осмотреть место засады',
      x: -33,
      z: 17,
      radius: 4.0,
      interacted: false,
      repeatable: true,
      questId: 'quest_missing_hunters',
      questStageId: 'q1_inspect_camp',
      loreText: 'Сломанные стрелы и следы трупного яда. На охотников напала стая голодных упырей.',
    });

    add({
      id: 'clue_sanctuary_entrance',
      type: 'clue',
      name: 'Рунный обелиск у входа',
      roleOrSubtitle: 'Древнее святилище',
      promptText: 'Изучить руны святилища',
      x: -54,
      z: -46,
      radius: 4.2,
      interacted: false,
      repeatable: true,
      questId: 'quest_swamp_whisper',
      questStageId: 'q2_inspect_clue_1',
      loreText: 'Камень покрыт проклятыми письменами эпохи Падшего Короля. От алтаря исходит гул.',
    });

    add({
      id: 'clue_sanctuary_tablets',
      type: 'clue',
      name: 'Жертвенные скрижали',
      roleOrSubtitle: 'Источник проклятия',
      promptText: 'Исследовать скрижали',
      x: -62,
      z: -58,
      radius: 4.2,
      interacted: false,
      repeatable: true,
      questId: 'quest_swamp_whisper',
      questStageId: 'q2_inspect_clue_2',
      loreText: 'Скрижали гласят, что кристалл на алтаре вытягивает жизнь из болот, питая Болотную ведьму.',
    });

    add({
      id: 'shrine_cursed_altar',
      type: 'shrine',
      name: 'Алтарь Проклятого Артефакта',
      roleOrSubtitle: 'Сюжетный выбор',
      promptText: 'Решить судьбу Проклятого Артефакта',
      x: -65,
      z: -55,
      radius: 4.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'altar_choice_root',
    });

    add({
      id: 'clue_fortress_gate',
      type: 'signpost',
      name: 'Врата Разрушенной Крепости',
      roleOrSubtitle: 'Цитадель Старого Королевства',
      promptText: 'Осмотреть врата крепости',
      x: 48,
      z: -46,
      radius: 4.5,
      interacted: false,
      repeatable: true,
      questId: 'quest_ancient_king',
      questStageId: 'q3_reach_fortress',
      loreText: 'Массивные каменные врата разрушены. Внутри ощущается присутствие Лесного демона и Древнего Хранителя.',
    });

    add({
      id: 'chest_village_stash',
      type: 'chest',
      name: 'Сундук стражи',
      promptText: 'Открыть сундук',
      x: -11,
      z: 14,
      radius: 2.8,
      interacted: false,
      repeatable: false,
      goldAmount: 45,
      lootItems: [
        { itemId: 'potion_swallow', count: 1 },
        { itemId: 'iron_ore', count: 2 },
      ],
    });

    add({
      id: 'chest_fortress_treasury',
      type: 'chest',
      name: 'Королевская сокровищница',
      promptText: 'Открыть сокровищницу',
      x: 78,
      z: -74,
      radius: 3.2,
      interacted: false,
      repeatable: false,
      goldAmount: 150,
      lootItems: [
        { itemId: 'armor_royal_guard', count: 1 },
        { itemId: 'iron_ore', count: 3 },
      ],
    });

    add({
      id: 'herb_clearing_1',
      type: 'herb',
      name: 'Куст ласточкиной травы',
      promptText: 'Собрать целебные травы',
      x: -8,
      z: 22,
      radius: 2.6,
      interacted: false,
      repeatable: false,
      lootItems: [{ itemId: 'herb_swallow', count: 2 }],
    });

    add({
      id: 'campfire_village',
      type: 'campfire',
      name: 'Костёр для медитации',
      roleOrSubtitle: 'Отдых, алхимия и смена времени суток',
      promptText: 'Медитировать у костра (Восстановить ОЗ, снять токсичность, сменить время)',
      x: 2,
      z: 2,
      radius: 3.0,
      interacted: false,
      repeatable: true,
    });

    // =========================================================================
    // ДОСКА ОБЪЯВЛЕНИЙ В ЦЕНТРЕ ДЕРЕВНИ ВОРОНЬЯ ПАДЬ
    // =========================================================================
    add({
      id: 'notice_board_village',
      type: 'notice_board',
      name: 'Доска объявлений Вороньей Пади',
      roleOrSubtitle: 'Контракты Охотника и заказы на чудовищ',
      promptText: 'Осмотреть Доску объявлений (Контракты Охотника)',
      x: -2.5,
      z: -4.5,
      radius: 3.5,
      interacted: false,
      repeatable: true,
    });

    // =========================================================================
    // УЛИКИ ДЛЯ 3 ИМЕННЫХ КОНТРАКТОВ ОХОТНИКА
    // =========================================================================
    // Контракт 1: «Вой в ночи» (Альфа-Воколак в Старом лесу, центр -52, 6)
    add({
      id: 'clue_ww_1',
      type: 'clue',
      name: 'Глубокие волчьи следы на торфе',
      roleOrSubtitle: 'Улика контракта «Вой в ночи» (1/3)',
      promptText: 'Исследовать огромные следы когтей',
      x: -47,
      z: 3,
      radius: 4.0,
      interacted: false,
      repeatable: false,
      contractId: 'contract_werewolf',
      loreText: 'Следы вдвое крупнее обычного волка: зверь передвигается то на четырёх лапах, то на задних.',
    });
    add({
      id: 'clue_ww_2',
      type: 'clue',
      name: 'Клочья жёсткой серебристой шерсти',
      roleOrSubtitle: 'Улика контракта «Вой в ночи» (2/3)',
      promptText: 'Изучить клочья шерсти на коре сосны',
      x: -55,
      z: 4,
      radius: 4.0,
      interacted: false,
      repeatable: false,
      contractId: 'contract_werewolf',
      loreText: 'Шерсть пропитана проклятой кровью, которая срастается прямо на глазах. Обычная сталь здесь бессильна — нужен знак «Пламя».',
    });
    add({
      id: 'clue_ww_3',
      type: 'clue',
      name: 'Растерзанная туша лесного оленя',
      roleOrSubtitle: 'Улика контракта «Вой в ночи» (3/3)',
      promptText: 'Осмотреть растерзанную добычу',
      x: -52,
      z: 9,
      radius: 4.0,
      interacted: false,
      repeatable: false,
      contractId: 'contract_werewolf',
      loreText: 'Кровь ещё тёплая! Альфа-Воколак затаился совсем рядом и выходит на охоту!',
    });

    // Контракт 2: «Невеста у колодца» (Полуденница на хуторе, центр 42, 18)
    add({
      id: 'clue_nw_1',
      type: 'clue',
      name: 'Потускневшее обручальное кольцо',
      roleOrSubtitle: 'Улика контракта «Невеста у колодца» (1/3)',
      promptText: 'Осмотреть кольцо на камнях колодца',
      x: 39,
      z: 15,
      radius: 4.0,
      interacted: false,
      repeatable: false,
      contractId: 'contract_noonwraith',
      loreText: 'Кольцо ледяное на ощупь. Невесту погубили в день свадьбы, и её дух привязан к этому месту.',
    });
    add({
      id: 'clue_nw_2',
      type: 'clue',
      name: 'Иссохший свадебный венок из полыни',
      roleOrSubtitle: 'Улика контракта «Невеста у колодца» (2/3)',
      promptText: 'Изучить призрачный венок',
      x: 45,
      z: 17,
      radius: 4.0,
      interacted: false,
      repeatable: false,
      contractId: 'contract_noonwraith',
      loreText: 'Трава вокруг покрыта инеем. Чтобы сделать Полуденницу уязвимой для серебра, её нужно сковать «Ледяной печатью» или сбить «Импульсом».',
    });
    add({
      id: 'clue_nw_3',
      type: 'clue',
      name: 'Окровавленная фата у сруба',
      roleOrSubtitle: 'Улика контракта «Невеста у колодца» (3/3)',
      promptText: 'Прикоснуться к свадебной фате',
      x: 42,
      z: 21,
      radius: 4.0,
      interacted: false,
      repeatable: false,
      contractId: 'contract_noonwraith',
      loreText: 'Воздух пронзает ледяной вой — Полуденница материализуется из тумана!',
    });

    // Контракт 3: «Каменный жнец» (Древняя Горгулья в руинах, центр 46, -24)
    add({
      id: 'clue_gg_1',
      type: 'clue',
      name: 'Осколки ожившего гранита',
      roleOrSubtitle: 'Улика контракта «Каменный жнец» (1/3)',
      promptText: 'Изучить каменную крошку и руны',
      x: 43,
      z: -21,
      radius: 4.0,
      interacted: false,
      repeatable: false,
      contractId: 'contract_gargoyle',
      loreText: 'Древний страж руин пробудился от магии крепости.',
    });
    add({
      id: 'clue_gg_2',
      type: 'clue',
      name: 'Расколотый щит странствующего рыцаря',
      roleOrSubtitle: 'Улика контракта «Каменный жнец» (2/3)',
      promptText: 'Осмотреть расколотый щит',
      x: 49,
      z: -23,
      radius: 4.0,
      interacted: false,
      repeatable: false,
      contractId: 'contract_gargoyle',
      loreText: 'На щите зазубрины от быстрых ударов — лобовая броня Горгульи непробиваема для лёгких выпадов. Бейте тяжёлыми ударами или заходите за спину!',
    });
    add({
      id: 'clue_gg_3',
      type: 'clue',
      name: 'Пьедестал Каменного Жнеца',
      roleOrSubtitle: 'Улика контракта «Каменный жнец» (3/3)',
      promptText: 'Активировать руну пьедестала',
      x: 46,
      z: -27,
      radius: 4.0,
      interacted: false,
      repeatable: false,
      contractId: 'contract_gargoyle',
      loreText: 'Каменные крылья с грохотом раскрываются — Древняя Горгулья пикирует в бой!',
    });

    // =========================================================================
    // 6 СКРЫТЫХ ТОЧЕК ИНТЕРЕСА (? НА КАРТЕ И КОМПАСЕ)
    // =========================================================================
    // 1-2. Два Гнезда чудовищ (спавнят упырей, уничтожаются по E знаком Пламени)
    add({
      id: 'poi_nest_forest',
      type: 'monster_nest',
      name: 'Гнездо чудовищ: Логово трупоедов',
      roleOrSubtitle: 'Точка интереса (Гнездо монстров)',
      promptText: 'Уничтожить гнездо чудовищ знаком «Пламя»',
      x: -26,
      z: -18,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 65,
      lootItems: [
        { itemId: 'ghoul_blood', count: 2 },
        { itemId: 'monster_claw', count: 2 },
      ],
    });
    add({
      id: 'poi_nest_hills',
      type: 'monster_nest',
      name: 'Гнездо чудовищ: Волчья нора у руин',
      roleOrSubtitle: 'Точка интереса (Гнездо монстров)',
      promptText: 'Сжечь гнездо чудовищ знаком «Пламя»',
      x: 32,
      z: -14,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 75,
      lootItems: [
        { itemId: 'wolf_pelt', count: 2 },
        { itemId: 'iron_ore', count: 2 },
      ],
    });

    // 3-4. Два Места Силы (дают +1 бесплатное очко навыков и бафф к урону Знаков)
    add({
      id: 'poi_power_forest',
      type: 'place_of_power',
      name: 'Место Силы: Камень Игниса в Старом лесу',
      roleOrSubtitle: 'Древний рунический обелиск',
      promptText: 'Почерпнуть мощь из Места Силы (+1 Очко Навыков и +25% к Знакам)',
      x: -42,
      z: 30,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
    });
    add({
      id: 'poi_power_ridge',
      type: 'place_of_power',
      name: 'Место Силы: Алтарь Ветров на восточном кряже',
      roleOrSubtitle: 'Древний рунический обелиск',
      promptText: 'Почерпнуть мощь из Места Силы (+1 Очко Навыков и +25% к Знакам)',
      x: 60,
      z: -28,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
    });

    // 5-6. Два Спрятанных сокровища под охраной (с редкими чертежами снаряжения и рунами)
    add({
      id: 'poi_treasure_west',
      type: 'chest',
      name: 'Спрятанное сокровище Школы Медведя',
      roleOrSubtitle: 'Охраняемый тайник мастера',
      promptText: 'Открыть тайник с чертежом и руной',
      x: -68,
      z: 12,
      radius: 3.4,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 110,
      lootItems: [
        { itemId: 'bp_bear_sword', count: 1 },
        { itemId: 'rune_bleed', count: 1 },
        { itemId: 'iron_ore', count: 2 },
      ],
    });
    add({
      id: 'poi_treasure_south',
      type: 'chest',
      name: 'Спрятанное сокровище Школы Пламени',
      roleOrSubtitle: 'Охраняемый реликтовый сундук',
      promptText: 'Открыть реликтовый сундук с чертежом',
      x: 28,
      z: 52,
      radius: 3.4,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 125,
      lootItems: [
        { itemId: 'bp_flame_sword', count: 1 },
        { itemId: 'rune_vamp', count: 1 },
        { itemId: 'iron_ore', count: 2 },
      ],
    });

    // =========================================================================
    // ПОДЗЕМНЫЕ КАТАКОМБЫ ДРЕВНИХ КОРОЛЕЙ (ВХОД, 3 КОЛОННЫ, СОКРОВИЩНИЦА)
    // =========================================================================
    add({
      id: 'catacombs_entrance',
      type: 'catacombs_portal',
      name: 'Вход в Подземные Катакомбы Древних Королей',
      roleOrSubtitle: 'Древний склеп под крепостью',
      promptText: 'Спуститься по каменным ступеням в Катакомбы',
      x: 62,
      z: -62,
      radius: 4.0,
      interacted: false,
      repeatable: true,
    });
    add({
      id: 'catacombs_exit',
      type: 'catacombs_portal',
      name: 'Лестница на поверхность',
      roleOrSubtitle: 'Выход из Катакомб в Разрушенную крепость',
      promptText: 'Подняться на поверхность',
      x: 92,
      z: 92,
      radius: 4.0,
      interacted: false,
      repeatable: true,
    });

    // Загадка с поворотом 3 рунических колонн в Катакомбах (нужно выставить все 3 в символ Пламени = 1)
    add({
      id: 'catacombs_pillar_0',
      type: 'rune_pillar',
      name: 'Западная руническая колонна',
      roleOrSubtitle: 'Загадка Древних Королей',
      promptText: 'Повернуть руническую колонну',
      x: 99,
      z: 103,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      pillarIndex: 0,
      pillarState: 0,
    });
    add({
      id: 'catacombs_pillar_1',
      type: 'rune_pillar',
      name: 'Центральная руническая колонна',
      roleOrSubtitle: 'Загадка Древних Королей',
      promptText: 'Повернуть руническую колонну',
      x: 105,
      z: 103,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      pillarIndex: 1,
      pillarState: 1,
    });
    add({
      id: 'catacombs_pillar_2',
      type: 'rune_pillar',
      name: 'Восточная руническая колонна',
      roleOrSubtitle: 'Загадка Древних Королей',
      promptText: 'Повернуть руническую колонну',
      x: 111,
      z: 103,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      pillarIndex: 2,
      pillarState: 2,
    });

    add({
      id: 'chest_catacombs_legendary',
      type: 'chest',
      name: 'Саркофаг Древних Королей',
      roleOrSubtitle: 'Сокровищница Катакомб',
      promptText: 'Забрать легендарный меч «Клятва Древних Королей»',
      x: 105,
      z: 115,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      goldAmount: 250,
      lootItems: [
        { itemId: 'sword_catacombs_king', count: 1 },
        { itemId: 'rune_fire', count: 1 },
      ],
    });

    // =========================================================================
    // АКТ II: ЛАГЕРЬ ОРДЕНА АЛОГО СОЛНЦА И ПЕПЕЛЬНЫЙ ПОГОСТ
    // =========================================================================
    add({
      id: 'npc_inquisitor',
      type: 'npc',
      name: 'Инквизитор Лазарь',
      roleOrSubtitle: 'Командор Ордена Алого Солнца (Акт II)',
      promptText: 'Поговорить с Инквизитором Лазарем (Выбор фракции Акта II)',
      x: -6,
      z: 66,
      radius: 3.6,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'inquisitor_root',
    });

    add({
      id: 'shrine_malakor_throne',
      type: 'shrine',
      name: 'Трон Короля-Лича Малакора Бессмертного',
      roleOrSubtitle: 'Разлом Сердца Пустоты (Финал Хроник)',
      promptText: 'Обратиться к духу Малакора Бессмертного',
      x: 0,
      z: 81,
      radius: 4.5,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'malakor_root',
    });

    // =========================================================================
    // 12 ИНТЕРАКТИВНЫХ ЗАПИСОК, ДНЕВНИКОВ И ФОЛИАНТОВ ВАЛЬДМАРКА (КОДЕКС [L])
    // =========================================================================
    for (const note of WORLD_LORE_NOTES) {
      add({
        id: note.id,
        type: 'lore_note',
        name: `📜 ${note.title}`,
        roleOrSubtitle: `Запись Кодекса #${note.number}/12 · ${note.locationHint}`,
        promptText: `Прочесть «${note.title}» (+25 XP в Кодекс [L])`,
        x: note.x,
        z: note.z,
        radius: 3.8,
        interacted: false,
        repeatable: true,
        loreNoteId: note.id,
        visualStyle: note.visualStyle,
      });
    }
  }

  private spawnVisualForInteractable(item: WorldInteractable): void {
    if (item.type === 'npc') {
      const role = item.id.includes('elder')
        ? 'elder'
        : item.id.includes('blacksmith')
        ? 'blacksmith'
        : item.id.includes('merchant')
        ? 'merchant'
        : item.id.includes('inquisitor')
        ? 'inquisitor'
        : 'herbalist';
      const npcMesh = this.assetManager.createNPCModel(role);
      npcMesh.position.set(item.x, item.y, item.z);
      npcMesh.lookAt(0, item.y, 4);
      this.scene.add(npcMesh);
      this.meshes.set(item.id, npcMesh);
    } else if (item.type === 'notice_board') {
      const boardGroup = new THREE.Group();
      const woodMat = this.assetManager.getMaterial('wood');
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), woodMat);
      postL.position.set(-0.95, 1.2, 0);
      const postR = postL.clone();
      postR.position.x = 0.95;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.35, 0.14), woodMat);
      panel.position.set(0, 1.55, 0);
      panel.castShadow = true;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.65), woodMat);
      roof.position.set(0, 2.3, 0);

      const paperMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        roughness: 0.8,
      });
      for (let i = -1; i <= 1; i++) {
        const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), paperMat);
        scroll.position.set(i * 0.58, 1.56 + (i % 2) * 0.06, 0.08);
        boardGroup.add(scroll);
      }

      boardGroup.add(postL, postR, panel, roof);
      boardGroup.position.set(item.x, item.y, item.z);
      this.scene.add(boardGroup);
      this.meshes.set(item.id, boardGroup);
    } else if (item.type === 'monster_nest') {
      const nestGroup = new THREE.Group();
      const nestMound = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.95, 1),
        new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.95 })
      );
      nestMound.scale.set(1.2, 0.65, 1.2);
      nestMound.position.y = 0.35;
      const skullGlow = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xdc2626,
          emissiveIntensity: 1.4,
        })
      );
      skullGlow.position.y = 0.95;
      skullGlow.name = 'poiBeacon';
      nestGroup.add(nestMound, skullGlow);
      nestGroup.position.set(item.x, item.y, item.z);
      this.scene.add(nestGroup);
      this.meshes.set(item.id, nestGroup);
    } else if (item.type === 'place_of_power') {
      const stoneGroup = new THREE.Group();
      const obelisk = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 2.8, 0.55),
        this.assetManager.getMaterial('stone')
      );
      obelisk.position.y = 1.4;
      obelisk.castShadow = true;
      const runeCore = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.06, 8, 20),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 2.0,
        })
      );
      runeCore.position.set(0, 1.6, 0.3);
      runeCore.name = 'poiBeacon';
      stoneGroup.add(obelisk, runeCore);
      stoneGroup.position.set(item.x, item.y, item.z);
      this.scene.add(stoneGroup);
      this.meshes.set(item.id, stoneGroup);
    } else if (item.type === 'catacombs_portal') {
      const portalGroup = new THREE.Group();
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(1.35, 0.25, 8, 16, Math.PI),
        this.assetManager.getMaterial('stone')
      );
      arch.position.y = 0.2;
      const veil = new THREE.Mesh(
        new THREE.CircleGeometry(1.2, 16),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
        })
      );
      veil.position.y = 0.8;
      portalGroup.add(arch, veil);
      portalGroup.position.set(item.x, item.y, item.z);
      this.scene.add(portalGroup);
      this.meshes.set(item.id, portalGroup);
    } else if (item.type === 'rune_pillar') {
      const pillarGroup = new THREE.Group();
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.52, 2.4, 6),
        this.assetManager.getMaterial('stone')
      );
      column.position.y = 1.2;
      const runeCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({
          color: item.pillarState === 1 ? 0x22c55e : 0xf59e0b,
          emissive: item.pillarState === 1 ? 0x16a34a : 0xd97706,
          emissiveIntensity: 1.6,
        })
      );
      runeCrystal.position.y = 2.65;
      runeCrystal.name = 'pillarCrystal';
      pillarGroup.add(column, runeCrystal);
      pillarGroup.position.set(item.x, item.y, item.z);
      this.scene.add(pillarGroup);
      this.meshes.set(item.id, pillarGroup);
    } else if (item.type === 'chest') {
      const chest = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.65, 0.6),
        this.assetManager.getMaterial('wood')
      );
      chest.position.set(item.x, item.y + 0.32, item.z);
      chest.castShadow = true;
      this.scene.add(chest);
      this.meshes.set(item.id, chest);
    } else if (item.type === 'clue' || item.type === 'signpost') {
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 1.4,
        })
      );
      marker.position.set(item.x, item.y + 1.1, item.z);
      this.scene.add(marker);
      this.meshes.set(item.id, marker);
    } else if (item.type === 'herb') {
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({
          color: 0x22c55e,
          emissive: 0x15803d,
          emissiveIntensity: 0.4,
        })
      );
      bush.position.set(item.x, item.y + 0.3, item.z);
      this.scene.add(bush);
      this.meshes.set(item.id, bush);
    } else if (item.type === 'campfire') {
      const fireGroup = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.65, 0.14, 6, 12),
        this.assetManager.getMaterial('stone')
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.75, 7),
        new THREE.MeshBasicMaterial({ color: 0xf97316 })
      );
      flame.position.y = 0.45;
      fireGroup.add(ring, flame);
      fireGroup.position.set(item.x, item.y, item.z);
      this.scene.add(fireGroup);
      this.meshes.set(item.id, fireGroup);
    } else if (item.type === 'loot') {
      const pouchGroup = new THREE.Group();
      const leatherMat = new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.75,
        metalness: 0.1,
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 1.3,
        roughness: 0.25,
        metalness: 0.85,
      });

      const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 1), leatherMat);
      sack.scale.set(1, 0.85, 1);
      sack.position.y = 0.26;
      sack.castShadow = true;

      const knot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.16, 8), leatherMat);
      knot.position.y = 0.52;

      const goldTie = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 12), goldMat);
      goldTie.rotation.x = Math.PI / 2;
      goldTie.position.y = 0.46;

      const beaconGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), goldMat);
      beaconGem.position.y = 0.95;
      beaconGem.name = 'lootBeacon';

      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(0.38, 0.52, 20),
        new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
        })
      );
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = 0.04;

      pouchGroup.add(sack, knot, goldTie, beaconGem, glowRing);
      pouchGroup.position.set(item.x, item.y, item.z);
      this.scene.add(pouchGroup);
      this.meshes.set(item.id, pouchGroup);
    } else if (item.type === 'lore_note') {
      // Composite 3D Environmental Storytelling Vignette for each Lore Note
      const loreGroup = new THREE.Group();
      const stoneMat = this.assetManager.getMaterial('stone');
      const woodMat = this.assetManager.getMaterial('wood');
      const parchmentMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xd97706,
        emissiveIntensity: 0.75,
        roughness: 0.65,
      });
      const boneMat = new THREE.MeshStandardMaterial({
        color: 0xe7e5e4,
        roughness: 0.8,
      });

      if (item.visualStyle === 'skeleton_scroll') {
        // Fallen courier / skeleton vignette with ribcage, skull, broken spear & glowing scroll
        const ribcage = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.45, 7), boneMat);
        ribcage.rotation.z = Math.PI / 2.2;
        ribcage.position.set(-0.15, 0.18, 0);
        const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), boneMat);
        skull.position.set(-0.48, 0.2, 0.08);
        const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.35, 6), woodMat);
        spearShaft.rotation.z = 0.45;
        spearShaft.position.set(-0.1, 0.55, -0.12);
        const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.38, 10), parchmentMat);
        scroll.rotation.x = Math.PI / 2;
        scroll.position.set(0.22, 0.12, 0.14);
        loreGroup.add(ribcage, skull, spearShaft, scroll);
      } else if (item.visualStyle === 'camp_diary') {
        // Abandoned hunter stump / tavern table with leather-bound journal & dagger
        const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.62, 8), woodMat);
        stump.position.y = 0.31;
        const bookCover = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.08, 0.32),
          new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 })
        );
        bookCover.position.set(0, 0.66, 0);
        const openPages = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.28), parchmentMat);
        openPages.position.set(0, 0.71, 0);
        const daggerBlade = new THREE.Mesh(
          new THREE.ConeGeometry(0.04, 0.36, 4),
          this.assetManager.getMaterial('steel')
        );
        daggerBlade.rotation.x = Math.PI;
        daggerBlade.position.set(0.16, 0.78, -0.08);
        loreGroup.add(stump, bookCover, openPages, daggerBlade);
      } else if (
        item.visualStyle === 'podium_tome' ||
        item.visualStyle === 'royal_lectern' ||
        item.visualStyle === 'alchemist_desk'
      ) {
        // Stone lectern / alchemy pedestal with ancient folio & glowing vial/seal
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.68), stoneMat);
        base.position.y = 0.09;
        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.85, 6), stoneMat);
        column.position.y = 0.55;
        const deskTop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.48), woodMat);
        deskTop.position.y = 1.02;
        deskTop.rotation.x = 0.32;
        const tome = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.34), parchmentMat);
        tome.position.set(0, 1.1, 0.02);
        tome.rotation.x = 0.32;
        loreGroup.add(base, column, deskTop, tome);
      } else {
        // Ancient carved stone stele / edict pillar with pinned parchment
        const stele = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.45, 0.24), stoneMat);
        stele.position.y = 0.72;
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.04), parchmentMat);
        sheet.position.set(0, 0.88, 0.13);
        loreGroup.add(stele, sheet);
      }

      // Floating amber lore crystal above the note for clear readability & Hunter Vision [V]
      const loreBeacon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2, 0),
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.8,
        })
      );
      loreBeacon.position.y = 1.55;
      loreBeacon.name = 'loreBeacon';

      const runeRing = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.58, 20),
        new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        })
      );
      runeRing.rotation.x = -Math.PI / 2;
      runeRing.position.y = 0.03;

      loreGroup.add(loreBeacon, runeRing);
      loreGroup.position.set(item.x, item.y, item.z);
      this.scene.add(loreGroup);
      this.meshes.set(item.id, loreGroup);
    }
  }

  /**
   * Spawns an interactive loot pouch at a defeated enemy's coordinates that can be picked up with [E].
   */
  public spawnLootPouch(opts: {
    enemyId: string;
    enemyName: string;
    x: number;
    z: number;
    goldAmount: number;
    lootTable: string[];
  }): WorldInteractable {
    const y = getGroundHeight(opts.x, opts.z);
    const pouch: WorldInteractable = {
      id: `loot_pouch_${opts.enemyId}_${Date.now()}`,
      type: 'loot',
      name: `Мешочек с добычей (${opts.enemyName})`,
      roleOrSubtitle: 'Трофеи и кроны',
      promptText: `Подобрать добычу (${opts.goldAmount} золота и трофеи)`,
      x: opts.x,
      y,
      z: opts.z,
      radius: 2.8,
      interacted: false,
      repeatable: false,
      goldAmount: opts.goldAmount,
      lootItems: opts.lootTable.map((itemId) => ({ itemId, count: 1 })),
    };

    this.interactables.push(pouch);
    this.spawnVisualForInteractable(pouch);
    return pouch;
  }

  public rotatePillar(id: string): [number, number, number] {
    const item = this.interactables.find((i) => i.id === id);
    if (item && item.type === 'rune_pillar') {
      item.pillarState = ((item.pillarState ?? 0) + 1) % 3;
      const mesh = this.meshes.get(id);
      if (mesh) {
        mesh.rotation.y += (Math.PI * 2) / 3;
        const crystal = mesh.getObjectByName('pillarCrystal') as THREE.Mesh | undefined;
        if (crystal && crystal.material instanceof THREE.MeshStandardMaterial) {
          const aligned = item.pillarState === 1;
          crystal.material.color.setHex(aligned ? 0x22c55e : 0xf59e0b);
          crystal.material.emissive.setHex(aligned ? 0x16a34a : 0xd97706);
        }
      }
    }
    return this.getPillarStates();
  }

  public getPillarStates(): [number, number, number] {
    const p0 = this.interactables.find((i) => i.id === 'catacombs_pillar_0')?.pillarState ?? 0;
    const p1 = this.interactables.find((i) => i.id === 'catacombs_pillar_1')?.pillarState ?? 1;
    const p2 = this.interactables.find((i) => i.id === 'catacombs_pillar_2')?.pillarState ?? 2;
    return [p0, p1, p2];
  }

  public getNearestInteractable(
    playerX: number,
    playerZ: number
  ): WorldInteractable | null {
    let closest: WorldInteractable | null = null;
    let minDist = Infinity;

    for (const item of this.interactables) {
      if (item.interacted && !item.repeatable) continue;

      const dist = Math.hypot(playerX - item.x, playerZ - item.z);
      if (dist <= item.radius && dist < minDist) {
        minDist = dist;
        closest = item;
      }
    }

    return closest;
  }

  public update(
    elapsed: number,
    playerX: number,
    playerZ: number,
    onPOIDiscovered?: (item: WorldInteractable) => void,
    witcherSenseActive = false
  ): WorldInteractable | null {
    for (const item of this.interactables) {
      if (item.isPOI && !item.discovered) {
        const d = Math.hypot(playerX - item.x, playerZ - item.z);
        if (d <= 15) {
          item.discovered = true;
          onPOIDiscovered?.(item);
        }
      }

      if (item.interacted && !item.repeatable) continue;

      const mesh = this.meshes.get(item.id);
      if (mesh && (item.type === 'clue' || item.type === 'signpost')) {
        mesh.rotation.y = elapsed * 1.6;
        mesh.position.y = item.y + 1.1 + Math.sin(elapsed * 2.5) * 0.12;
      } else if (mesh && item.type === 'loot') {
        const beacon = mesh.getObjectByName('lootBeacon');
        if (beacon) {
          beacon.rotation.y = elapsed * 2.4;
          beacon.position.y = 0.92 + Math.sin(elapsed * 3.2) * 0.12;
        }
      } else if (mesh && (item.type === 'monster_nest' || item.type === 'place_of_power')) {
        const beacon = mesh.getObjectByName('poiBeacon');
        if (beacon) {
          beacon.rotation.y = elapsed * 1.8;
        }
      } else if (mesh && item.type === 'lore_note') {
        const beacon = mesh.getObjectByName('loreBeacon') as THREE.Mesh | undefined;
        if (beacon) {
          beacon.rotation.y = elapsed * (witcherSenseActive ? 4.2 : 2.1);
          beacon.position.y = 1.52 + Math.sin(elapsed * 2.8) * 0.12;
          const s = witcherSenseActive ? 1.55 + Math.sin(elapsed * 6) * 0.25 : 1.0;
          beacon.scale.set(s, s, s);
        }
      }
    }

    return this.getNearestInteractable(playerX, playerZ);
  }

  public markInteracted(id: string): void {
    const item = this.interactables.find((i) => i.id === id);
    if (!item) return;
    item.interacted = true;
    if (item.isPOI) item.discovered = true;
    if (!item.repeatable) {
      const mesh = this.meshes.get(id);
      if (
        mesh &&
        (item.type === 'herb' ||
          item.type === 'loot' ||
          item.type === 'monster_nest' ||
          item.type === 'clue')
      ) {
        mesh.visible = false;
      }
    }
  }
}
