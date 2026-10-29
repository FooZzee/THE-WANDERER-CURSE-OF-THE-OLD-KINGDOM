import * as THREE from 'three';
import type { AssetManager } from './AssetManager';
import { ASH_ECHOES, WORLD_LORE_NOTES } from './loreData';
import {
  computeNpcSchedule,
  getActorQuestIndicatorState,
  getGroundHeight,
  WAYSTONES,
} from './rules';
import type {
  CompanionId,
  EnemyInstance,
  HunterContract,
  Quest,
  WeatherType,
  WorldInteractable,
} from './types';

export class WorldSystem {
  public interactables: WorldInteractable[] = [];
  private meshes: Map<string, THREE.Object3D> = new Map();
  private scene: THREE.Scene;
  private assetManager: AssetManager;
  private lastAnvilStrikeTime = 0;
  private guardAttackCooldowns: Map<string, number> = new Map();

  private colliderMeshes: THREE.Object3D[] = [];
  private surfaceRaycaster = new THREE.Raycaster();

  constructor(
    scene: THREE.Scene,
    assetManager: AssetManager,
    colliderMeshes: THREE.Object3D[] = []
  ) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.colliderMeshes = colliderMeshes;
    this.buildWorldInteractables();
    this.snapInteractablesToSurface(this.colliderMeshes);
  }

  public getSurfaceHeightAt(x: number, z: number): number {
    const baseGround = getGroundHeight(x, z);
    if (!this.colliderMeshes || this.colliderMeshes.length === 0) {
      return baseGround;
    }
    this.surfaceRaycaster.set(
      new THREE.Vector3(x, baseGround + 1.35, z),
      new THREE.Vector3(0, -1, 0)
    );
    this.surfaceRaycaster.near = 0;
    this.surfaceRaycaster.far = 3.5;
    const hits = this.surfaceRaycaster.intersectObjects(this.colliderMeshes, false);
    let bestY = baseGround;
    for (const hit of hits) {
      if (hit.point.y >= baseGround - 0.35 && hit.point.y <= baseGround + 0.75) {
        if (hit.point.y > bestY) {
          bestY = hit.point.y;
        }
      }
    }
    return bestY;
  }

  public snapInteractablesToSurface(colliderMeshes: THREE.Object3D[] = this.colliderMeshes): void {
    this.colliderMeshes = colliderMeshes;
    this.scene.updateMatrixWorld(true);
    for (const item of this.interactables) {
      const surfaceY = this.getSurfaceHeightAt(item.x, item.z);
      item.y = surfaceY;
      const mesh = this.meshes.get(item.id);
      if (mesh) {
        if (item.type === 'clue' || item.type === 'signpost') {
          mesh.position.set(item.x, item.y + 1.1, item.z);
        } else if (item.type === 'herb') {
          mesh.position.set(item.x, item.y + 0.3, item.z);
        } else {
          mesh.position.set(item.x, item.y, item.z);
        }
      }
    }
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
      npcScheduleRole: 'elder',
      homeX: 5,
      homeZ: -3,
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
      npcScheduleRole: 'blacksmith',
      homeX: 10,
      homeZ: 6.5,
      isArmedDefender: true,
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
      npcScheduleRole: 'merchant',
      homeX: -7,
      homeZ: -2,
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
      npcScheduleRole: 'herbalist',
      homeX: 7,
      homeZ: 14,
    });

    // =========================================================================
    // ЖИВОЙ МИР: КРЕСТЬЯНЕ, СТРАЖНИКИ С ФАКЕЛАМИ, БАРД, КАРАВАНЩИК, СКУПЩИК И НАПАРНИКИ
    // =========================================================================
    add({
      id: 'npc_peasant_farmer',
      type: 'npc',
      name: 'Крестьянин Мирон',
      roleOrSubtitle: 'Житель Вороньей Пади · Земледелец',
      promptText: 'Поговорить с Крестьянином Мироном',
      x: -8.5,
      z: 16.5,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'peasant_root',
      npcScheduleRole: 'farmer',
      homeX: -8.5,
      homeZ: 16.5,
    });

    add({
      id: 'npc_peasant_woodcutter',
      type: 'npc',
      name: 'Лесоруб Степан',
      roleOrSubtitle: 'Житель Вороньей Пади · Дровосек',
      promptText: 'Поговорить с Лесорубом Степаном',
      x: 15.5,
      z: -17.5,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'peasant_root',
      npcScheduleRole: 'woodcutter',
      homeX: 15.5,
      homeZ: -17.5,
    });

    add({
      id: 'npc_water_carrier',
      type: 'npc',
      name: 'Водонос Дарья',
      roleOrSubtitle: 'Жительница Вороньей Пади',
      promptText: 'Поговорить с Дарьей',
      x: -9.5,
      z: -5.5,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'peasant_root',
      npcScheduleRole: 'water_carrier',
      homeX: -9.5,
      homeZ: -5.5,
    });

    add({
      id: 'npc_guard_1',
      type: 'npc',
      name: 'Стражник Гуннар',
      roleOrSubtitle: 'Дружина Вороньей Пади · Северный дозор',
      promptText: 'Поговорить со Стражником Гуннаром',
      x: -4,
      z: -16,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'guard_root',
      npcScheduleRole: 'guard',
      homeX: -4,
      homeZ: -16,
      isArmedDefender: true,
    });

    add({
      id: 'npc_guard_2',
      type: 'npc',
      name: 'Стражник Рольф',
      roleOrSubtitle: 'Дружина Вороньей Пади · Южный дозор',
      promptText: 'Поговорить со Стражником Рольфом',
      x: 4.5,
      z: 16.5,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'guard_root',
      npcScheduleRole: 'guard',
      homeX: 4.5,
      homeZ: 16.5,
      isArmedDefender: true,
    });

    add({
      id: 'npc_bard',
      type: 'npc',
      name: 'Бард Корвин Песнопевец',
      roleOrSubtitle: 'Менестрель Вороньей Пади · Баллады о подвигах',
      promptText: 'Поговорить с Бардом Корвином (Заказать балладу)',
      x: -5.2,
      z: 3.2,
      radius: 3.4,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'bard_root',
      npcScheduleRole: 'bard',
      homeX: -5.2,
      homeZ: 3.2,
    });

    add({
      id: 'npc_caravan_merchant',
      type: 'npc',
      name: 'Караванщик Радован',
      roleOrSubtitle: 'Странствующий торговец с караваном',
      promptText: 'Поговорить с Караванщиком Радованом (Торговля в пути)',
      x: 2,
      z: -42,
      radius: 3.6,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'caravan_root',
      npcScheduleRole: 'caravan',
      homeX: 2,
      homeZ: -42,
    });

    add({
      id: 'npc_fence_pass',
      type: 'npc',
      name: 'Скупщик редкостей «Хорь»',
      roleOrSubtitle: 'Контрабандист и торговец реликвиями на Перевале',
      promptText: 'Поговорить со Скупщиком «Хорём» (Чёрный рынок)',
      x: -9,
      z: -248,
      radius: 3.6,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'fence_root',
      npcScheduleRole: 'fence',
      homeX: -9,
      homeZ: -248,
    });

    // Боевые Напарники (доступны для найма в поход)
    add({
      id: 'npc_companion_lyra',
      type: 'npc',
      name: 'Лира из Вольной Роты',
      roleOrSubtitle: 'Боевой Напарник · Лучница и следопыт',
      promptText: 'Поговорить с Лирой (Взять в напарники)',
      x: -2.2,
      z: 4.8,
      radius: 3.4,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'lyra_root',
    });

    add({
      id: 'npc_companion_thorvald',
      type: 'npc',
      name: 'Брат Торвальд',
      roleOrSubtitle: 'Боевой Напарник · Паладин-Отступник',
      promptText: 'Поговорить с Братом Торвальдом (Взять в напарники)',
      x: 4.8,
      z: 4.5,
      radius: 3.4,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'thorvald_root',
    });

    add({
      id: 'npc_companion_vesper',
      type: 'npc',
      name: 'Мастер Веспер',
      roleOrSubtitle: 'Боевой Напарник · Грандмастер Братства Пепла',
      promptText: 'Поговорить с Веспером (Взять в напарники)',
      x: -2.5,
      z: -355,
      radius: 3.5,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'vesper_companion_root',
    });

    // =========================================================================
    // 4 НЕЛИНЕЙНЫХ КВЕСТА-РАССЛЕДОВАНИЯ: NPC И УЛИКИ ЧУТЬЯ ОХОТНИКА [V]
    // =========================================================================
    // 1. «Кровь на колокольне» (Воронья Падь)
    add({
      id: 'clue_belltower_corpse',
      type: 'clue',
      name: 'Жертва у старой колокольни',
      roleOrSubtitle: 'Расследование «Кровь на колокольне» · Улика [V]',
      promptText: 'Осмотреть раны жертвы с Чутьём Охотника',
      x: -9,
      z: -9,
      radius: 4.0,
      interacted: false,
      repeatable: true,
      questId: 'quest_blood_belltower',
      questStageId: 'q_bell_corpse',
      loreText:
        'Горло разорвано в полночь, но следы зубов слишком узкие для волка. На одежде жертвы — чёрная кузнечная окалина и угольная пыль.',
    });

    add({
      id: 'clue_belltower_roof',
      type: 'clue',
      name: 'Следы когтей и обрывок передника у колокольни',
      roleOrSubtitle: 'Расследование «Кровь на колокольне» · Улика [V]',
      promptText: 'Изучить обрывок кузнечного передника и следы',
      x: -12,
      z: -13,
      radius: 4.0,
      interacted: false,
      repeatable: true,
      questId: 'quest_blood_belltower',
      questStageId: 'q_bell_roof_tracks',
      loreText:
        'На балке застрял лоскут прожжённой кожи с клеймом кузни Мастера Торна. Кровавый след ведёт прямо к дому кузнеца и его жены Хельги!',
    });

    add({
      id: 'npc_belltower_helga',
      type: 'npc',
      name: 'Хельга (Жена кузнеца Торна)',
      roleOrSubtitle: 'Квест «Кровь на колокольне» · Тайна Ночного Голода',
      promptText: 'Допросить Хельгу и вынести вердикт',
      x: 10.5,
      z: 9.8,
      radius: 3.6,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'belltower_helga_root',
    });

    // 2. «Пир Воронов» (Заброшенное поместье в Топях)
    add({
      id: 'npc_lord_vane',
      type: 'npc',
      name: 'Лорд Эдгар Вейн',
      roleOrSubtitle: 'Квест «Пир Воронов» · Хозяин поместья в Топях',
      promptText: 'Поговорить с лордом Эдгаром Вейном',
      x: 25,
      z: -160,
      radius: 3.8,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'lord_vane_root',
    });

    add({
      id: 'clue_feast_table',
      type: 'clue',
      name: 'Пиршественный стол Дома Вейнов',
      roleOrSubtitle: 'Расследование «Пир Воронов» · Улика Чутья [V]',
      promptText: 'Разоблачить иллюзию пира Чутьём Охотника',
      x: 30,
      z: -166,
      radius: 4.2,
      interacted: false,
      repeatable: true,
      questId: 'quest_feast_of_ravens',
      questStageId: 'q_feast_inspect_table',
      loreText:
        'Сквозь пелену иллюзии видно страшное зрелище: за столом сидят истлевшие скелеты в кружевах, а на серебряных блюдах гниёт болотная падаль.',
    });

    add({
      id: 'clue_feast_cellar',
      type: 'clue',
      name: 'Кровавый люк в погреб поместья',
      roleOrSubtitle: 'Расследование «Пир Воронов» · Улика Чутья [V]',
      promptText: 'Осмотреть люк подвала и алтарь иллюзий',
      x: 33,
      z: -171,
      radius: 4.2,
      interacted: false,
      repeatable: true,
      questId: 'quest_feast_of_ravens',
      questStageId: 'q_feast_inspect_cellar',
      loreText:
        'Внизу в погребе ворочается откормленная тварь Бездны. Лорд Вейн заманивал путников с тракта и скармливал их монстру, чтобы питать Зеркало Иллюзий своей погибшей семьи!',
    });

    // 3. «Клятва в Мёртвых Шахтах» (Среброзубый Перевал)
    add({
      id: 'npc_order_captain_mines',
      type: 'npc',
      name: 'Капитан Ордена Валлен',
      roleOrSubtitle: 'Квест «Клятва в Мёртвых Шахтах» · Карательный отряд',
      promptText: 'Поговорить с капитаном Ордена Валленом',
      x: -18,
      z: -268,
      radius: 3.8,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'mines_captain_root',
    });

    add({
      id: 'clue_mines_barricade',
      type: 'clue',
      name: 'Баррикада заблокированного штрека',
      roleOrSubtitle: 'Расследование «Клятва в Мёртвых Шахтах» · Улика [V]',
      promptText: 'Прослушать штрек с Чутьём Охотника [V]',
      x: -22,
      z: -275,
      radius: 4.2,
      interacted: false,
      repeatable: true,
      questId: 'quest_dead_mines_oath',
      questStageId: 'q_mines_inspect_barricade',
      loreText:
        'За каменной насыпью нет следов человеческой крови — напротив, горняки вырезали на крепи охранные молитвы и поют колыбельную своему ребёнку-мутанту.',
    });

    add({
      id: 'npc_sentient_ghoul_elder',
      type: 'npc',
      name: 'Старейшина горняков Торос',
      roleOrSubtitle: 'Квест «Клятва в Мёртвых Шахтах» · Разумный рудокоп-мутант',
      promptText: 'Поговорить со старейшиной Торосом и выбрать сторону',
      x: -26,
      z: -281,
      radius: 3.8,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'mines_ghoul_elder_root',
    });

    // 4. «Последний Экзамен Зольника» (Чёрный Бастион)
    add({
      id: 'npc_apprentice_erian',
      type: 'npc',
      name: 'Младший адепт Эриан',
      roleOrSubtitle: 'Квест «Последний Экзамен Зольника» · Послушник Школы Ворона',
      promptText: 'Поговорить с адептом Эрианом о ритуале Тлеющей Крови',
      x: -16,
      z: -365,
      radius: 3.8,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'ash_exam_erian_root',
    });

    add({
      id: 'clue_bastion_mutagens',
      type: 'clue',
      name: 'Реликвариум мутагенов Школы Ворона',
      roleOrSubtitle: 'Квест «Последний Экзамен Зольника» · Улика [V]',
      promptText: 'Собрать уцелевшие фиалы «Тлеющей Крови»',
      x: -21,
      z: -372,
      radius: 4.2,
      interacted: false,
      repeatable: true,
      questId: 'quest_last_ash_exam',
      questStageId: 'q_exam_collect_mutagens',
      loreText:
        'Среди битого стекла сохранились три запечатанных сосуда с вытяжкой Чёрной Росы и записи Веспера: «Точная доза — 3 капли с Ласточкой, стабилизация — Барьер и малый Игнис».',
    });

    add({
      id: 'clue_bastion_ritual_table',
      type: 'shrine',
      name: 'Алтарь Испытания Тлеющей Кровью',
      roleOrSubtitle: 'Квест «Последний Экзамен Зольника» · Мини-ивент Ритуала',
      promptText: 'Провести ритуал мутации над Эрианом',
      x: -18,
      z: -378,
      radius: 4.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'ash_exam_ritual_step1',
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
      x: -31.8,
      z: 16.5,
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
      z: -52.8,
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
      x: -9.5,
      z: 12.5,
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
    // ДОСКА ОБЪЯЯВЛЕНИЙ В ЦЕНТРЕ ДЕРЕВНИ ВОРОНЬЯ ПАДЬ
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
      z: 19.2,
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
    add({
      id: 'poi_nest_forest',
      type: 'monster_nest',
      name: 'Гнездо чудовищ: Логово трупоедов',
      roleOrSubtitle: 'Точка интереса (Гнездо монстров)',
      promptText: 'Уничтожить гнездо чудовищ знаком «Пламя»',
      x: -40,
      z: -20,
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
      roleOrSubtitle: 'Разлом Сердца Пустоты (Акт II)',
      promptText: 'Обратиться к духу Малакора Бессмертного',
      x: 0,
      z: 81,
      radius: 4.5,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'malakor_root',
    });

    // =========================================================================
    // ДОРОЖНЫЕ ПУТЕВЫЕ КАМНИ (FAST TRAVEL WAYSTONES — 7 ОБЕЛИСКОВ)
    // =========================================================================
    for (const ws of WAYSTONES) {
      add({
        id: ws.id,
        type: 'waystone',
        name: `🔷 ${ws.name}`,
        roleOrSubtitle: `${ws.regionTitle ?? ws.biomeName} · Дорожный Путевой Камень`,
        promptText: `Активировать Путевой Камень / Быстрое перемещение [Карта M]`,
        x: ws.x,
        z: ws.z,
        radius: 4.0,
        interacted: Boolean(ws.unlockedByDefault),
        repeatable: true,
        waystoneId: ws.id,
        isPOI: true,
        discovered: Boolean(ws.unlockedByDefault),
      });
    }

    // =========================================================================
    // СЕВЕРНЫЙ ПОХОД: ПОЛЕВЫЕ ЛАГЕРЯ NPC, КОСТРЫ, ПРЕПЯТСТВИЯ, РЕАГЕНТЫ И ФИНАЛЬНЫЙ АЛТАРЬ
    // =========================================================================
    // Биом 1: Тракт Висельников и Затопленные Топи (z: -105..-215)
    add({
      id: 'npc_charon',
      type: 'npc',
      name: 'Лодочник Харон',
      roleOrSubtitle: 'Проводник через Затопленные Топи',
      promptText: 'Поговорить с Лодочником Хароном',
      x: -6,
      z: -143,
      radius: 3.5,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'charon_root',
    });
    add({
      id: 'campfire_swamp_north',
      type: 'campfire',
      name: 'Полевой костёр у причала Харона',
      roleOrSubtitle: 'Отдых, алхимия и смена времени суток',
      promptText: 'Медитировать у костра (Восстановить ОЗ, снять токсичность)',
      x: -10,
      z: -142,
      radius: 3.0,
      interacted: false,
      repeatable: true,
    });
    add({
      id: 'obstacle_ferry',
      type: 'obstacle_clearing',
      name: 'Заросшая цепь паромной переправы',
      roleOrSubtitle: 'Препятствие на пути к логову Матери Трясины',
      promptText: 'Сжечь болотные корни и освободить цепь парома знаком «Пламя» [E]',
      x: 0,
      z: -162,
      radius: 4.2,
      interacted: false,
      repeatable: false,
      questId: 'quest_drowned_path',
      questStageId: 'q5_repair_ferry',
      loreText: 'Пламя сжигает ядовитые плети! Паромная гать на север открыта.',
    });
    add({
      id: 'chest_swamp_north',
      type: 'chest',
      name: 'Затопленный сундук беженцев Вальдмарка',
      roleOrSubtitle: 'Сокровище Затопленных Топей',
      promptText: 'Открыть сундук (Коса Чумного Доктора и чертёж Стража Стужи)',
      x: 16,
      z: -175,
      radius: 3.4,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 190,
      lootItems: [
        { itemId: 'mythic_plague_scythe', count: 1 },
        { itemId: 'bp_frost_armor', count: 1 },
        { itemId: 'bp_frost_sword', count: 1 },
      ],
    });
    add({
      id: 'poi_swamp_stilt_stash',
      type: 'chest',
      name: 'Тайник рыбаков в свайной деревне',
      roleOrSubtitle: 'Точка интереса · Западные мостки Топей',
      promptText: 'Открыть рыбацкий кованый сундук',
      x: -52,
      z: -152,
      radius: 3.6,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 145,
      lootItems: [
        { itemId: 'potion_swallow', count: 2 },
        { itemId: 'cursed_essence', count: 2 },
      ],
    });
    add({
      id: 'poi_swamp_nest_west',
      type: 'monster_nest',
      name: 'Гнездо чудовищ: Омут болотных утопленников',
      roleOrSubtitle: 'Точка интереса (Гнездо монстров)',
      promptText: 'Выжечь гнездо утопленников знаком «Пламя»',
      x: -32,
      z: -162,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 115,
      lootItems: [
        { itemId: 'ghoul_blood', count: 3 },
        { itemId: 'cursed_essence', count: 1 },
      ],
    });
    add({
      id: 'poi_swamp_power_east',
      type: 'place_of_power',
      name: 'Место Силы: Камень Туманов в Топях',
      roleOrSubtitle: 'Древний рунический обелиск',
      promptText: 'Почерпнуть мощь из Места Силы (+1 Очко Навыков и +25% к Знакам)',
      x: 24,
      z: -138,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
    });
    add({
      id: 'poi_swamp_refugee_chest',
      type: 'chest',
      name: 'Брошенный сундук обоза у клеток висельников',
      roleOrSubtitle: 'Точка интереса · Тракт Висельников',
      promptText: 'Обыскать окованный сундук обоза',
      x: -14,
      z: -129,
      radius: 3.4,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 130,
      lootItems: [
        { itemId: 'oil_necrophage', count: 1 },
        { itemId: 'iron_ore', count: 3 },
      ],
    });

    // Биом 2: Среброзубый Перевал и Мёртвые Шахты (z: -215..-325)
    add({
      id: 'npc_brom',
      type: 'npc',
      name: 'Старый Рудокоп Бром',
      roleOrSubtitle: 'Мастер-кузнец Среброзубого Перевала',
      promptText: 'Поговорить с Рудокопом Бромом (Кузня Чёрной Руды)',
      x: 8,
      z: -253,
      radius: 3.5,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'brom_root',
    });
    add({
      id: 'campfire_silver_pass',
      type: 'campfire',
      name: 'Горный очаг у Мёртвых Шахт',
      roleOrSubtitle: 'Отдых, алхимия и смена времени суток',
      promptText: 'Медитировать у костра (Восстановить ОЗ, снять токсичность)',
      x: 11,
      z: -251,
      radius: 3.0,
      interacted: false,
      repeatable: true,
    });
    add({
      id: 'obstacle_mine_lift',
      type: 'obstacle_clearing',
      name: 'Обледенелый подъёмник Мёртвых Шахт',
      roleOrSubtitle: 'Путь в главный штрек Кристального Колосса',
      promptText: 'Разбить ледяную глыбу на шестернях знаком «Импульс» [E]',
      x: 0,
      z: -275,
      radius: 4.2,
      interacted: false,
      repeatable: false,
      questId: 'quest_mountain_blood',
      questStageId: 'q6_clear_mine_lift',
      loreText: 'Ударная волна «Импульса» дробит вековой лёд! Подъёмник в нижний штрек запущен.',
    });
    add({
      id: 'herb_ice_lotus_1',
      type: 'herb',
      name: 'Друза Ледяного Лотоса и Чёрной Руды',
      promptText: 'Собрать Ледяной лотос и Чёрную руду',
      x: -14,
      z: -262,
      radius: 3.2,
      interacted: false,
      repeatable: false,
      lootItems: [
        { itemId: 'ice_lotus', count: 2 },
        { itemId: 'black_ore', count: 2 },
      ],
    });
    add({
      id: 'chest_silver_pass_mythic',
      type: 'chest',
      name: 'Оружейный ящик королевских горняков',
      roleOrSubtitle: 'Сокровище Мёртвых Шахт',
      promptText: 'Открыть ящик (Дробитель Чёрной Горы и Великая руна Мороза)',
      x: 18,
      z: -292,
      radius: 3.4,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 240,
      lootItems: [
        { itemId: 'mythic_black_cleaver', count: 1 },
        { itemId: 'rune_frost_sup', count: 1 },
        { itemId: 'black_ore', count: 2 },
      ],
    });
    add({
      id: 'poi_pass_chasm_chest',
      type: 'chest',
      name: 'Схрон контрабандистов за висячим мостом',
      roleOrSubtitle: 'Точка интереса · Западный уступ Перевала',
      promptText: 'Открыть кованый сундук контрабандистов',
      x: -52,
      z: -255,
      radius: 3.6,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 210,
      lootItems: [
        { itemId: 'black_ore', count: 3 },
        { itemId: 'ice_lotus', count: 2 },
      ],
    });
    add({
      id: 'poi_pass_power_peak',
      type: 'place_of_power',
      name: 'Место Силы: Обелиск Ледяной Бури на серпантине',
      roleOrSubtitle: 'Древний рунический обелиск',
      promptText: 'Почерпнуть мощь из Места Силы (+1 Очко Навыков и +25% к Знакам)',
      x: 24,
      z: -242,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
    });
    add({
      id: 'poi_pass_mine_stash_east',
      type: 'chest',
      name: 'Сейф старшего штейгера в Восточной штольне',
      roleOrSubtitle: 'Точка интереса · Сеть Мёртвых Шахт',
      promptText: 'Открыть сундук в дальнем штреке',
      x: 46,
      z: -275,
      radius: 3.5,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 195,
      lootItems: [
        { itemId: 'black_ore', count: 3 },
        { itemId: 'potion_thunderbolt', count: 1 },
      ],
    });
    add({
      id: 'poi_pass_nest_trog',
      type: 'monster_nest',
      name: 'Гнездо чудовищ: Кладбище троглодитов в Западном забое',
      roleOrSubtitle: 'Точка интереса (Гнездо монстров)',
      promptText: 'Обрушить логово троглодитов знаком «Пламя»',
      x: -34,
      z: -275,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 155,
      lootItems: [
        { itemId: 'black_ore', count: 2 },
        { itemId: 'monster_claw', count: 3 },
      ],
    });

    // Биом 3: Чёрный Бастион Братства Пепла (z: -325..-435)
    add({
      id: 'npc_kael',
      type: 'npc',
      name: 'Выживший Адепт Каэль',
      roleOrSubtitle: 'Хранитель архивов Братства Пепла',
      promptText: 'Поговорить с Адептом Каэлем',
      x: -4,
      z: -358,
      radius: 3.5,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'kael_root',
    });
    add({
      id: 'campfire_bastion',
      type: 'campfire',
      name: 'Жаровня во дворе Чёрного Бастиона',
      roleOrSubtitle: 'Отдых, алхимия и смена времени суток',
      promptText: 'Медитировать у жаровни (Восстановить ОЗ, снять токсичность)',
      x: 4,
      z: -358,
      radius: 3.0,
      interacted: false,
      repeatable: true,
    });
    add({
      id: 'obstacle_three_seals',
      type: 'obstacle_clearing',
      name: 'Врата Испытания Трёх Печатей',
      roleOrSubtitle: 'Вход во Внутренний двор Цитадели',
      promptText: 'Начертать знаки Пламени, Мороза и Импульса на вратах [E]',
      x: 0,
      z: -376,
      radius: 4.5,
      interacted: false,
      repeatable: false,
      questId: 'quest_ash_brotherhood',
      questStageId: 'q7_trial_three_seals',
      loreText: 'Три рунные печати вспыхивают янтарным огнём! Врата во Внутренний двор Грандмастера Веспера отворены.',
    });
    add({
      id: 'chest_bastion_grandmaster',
      type: 'chest',
      name: 'Реликварий Грандмастеров Пепла',
      roleOrSubtitle: 'Сокровище Чёрного Бастиона',
      promptText: 'Открыть реликварий (Чертежи Грандмастера, Клыки Сумерек и Пожиратель Солнца)',
      x: -16,
      z: -392,
      radius: 3.6,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 320,
      lootItems: [
        { itemId: 'bp_gm_armor', count: 1 },
        { itemId: 'bp_gm_sword', count: 1 },
        { itemId: 'mythic_dusk_fangs', count: 1 },
        { itemId: 'mythic_sun_eater', count: 1 },
      ],
    });
    add({
      id: 'poi_bastion_barracks_chest',
      type: 'chest',
      name: 'Оружейный сундук сожжённых казарм Зольников',
      roleOrSubtitle: 'Точка интереса · Западный тренировочный плац',
      promptText: 'Открыть сундук мастера фехтования',
      x: -36,
      z: -376,
      radius: 3.5,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 260,
      lootItems: [
        { itemId: 'black_ore', count: 3 },
        { itemId: 'void_dust', count: 2 },
      ],
    });
    add({
      id: 'poi_bastion_alchemy_stash',
      type: 'chest',
      name: 'Алхимический ларец мутагенов Братства',
      roleOrSubtitle: 'Точка интереса · Восточная лаборатория Бастиона',
      promptText: 'Открыть ларец алхимической лаборатории',
      x: 34.2,
      z: -375,
      radius: 3.6,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 280,
      lootItems: [
        { itemId: 'cursed_essence', count: 3 },
        { itemId: 'void_dust', count: 2 },
        { itemId: 'potion_blizzard', count: 1 },
      ],
    });
    add({
      id: 'poi_bastion_power_courtyard',
      type: 'place_of_power',
      name: 'Место Силы: Обелиск Тлеющей Крови у рухнувшей башни',
      roleOrSubtitle: 'Древний рунический обелиск',
      promptText: 'Почерпнуть мощь из Места Силы (+1 Очко Навыков и +25% к Знакам)',
      x: -26,
      z: -352,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
    });

    // Биом 4: Кратер Затмения и Зал Трона Пустоты (z: -435..-550)
    add({
      id: 'chest_crater_obsidian',
      type: 'chest',
      name: 'Обсидиановый ковчег Предтеч',
      roleOrSubtitle: 'Сокровище Кратера Затмения',
      promptText: 'Открыть ковчег (Чертежи Обсидианового Вестника и Глас Пустоты)',
      x: 15,
      z: -478,
      radius: 3.6,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 400,
      lootItems: [
        { itemId: 'bp_obs_armor', count: 1 },
        { itemId: 'bp_obs_sword', count: 1 },
        { itemId: 'mythic_void_voice', count: 1 },
        { itemId: 'rune_void_sup', count: 1 },
        { itemId: 'void_dust', count: 3 },
      ],
    });
    add({
      id: 'poi_crater_west_island_chest',
      type: 'chest',
      name: 'Ковчег Затмения на Западном обсидиановом острове',
      roleOrSubtitle: 'Точка интереса · Мост Чистой Энергии',
      promptText: 'Открыть древний ковчег на парящем острове',
      x: -42,
      z: -478,
      radius: 3.6,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 360,
      lootItems: [
        { itemId: 'void_dust', count: 4 },
        { itemId: 'black_ore', count: 3 },
      ],
    });
    add({
      id: 'poi_crater_east_island_power',
      type: 'place_of_power',
      name: 'Место Силы: Монолит Пустоты на Восточном острове',
      roleOrSubtitle: 'Древний рунический обелиск',
      promptText: 'Почерпнуть мощь из Места Силы (+1 Очко Навыков и +25% к Знакам)',
      x: 42,
      z: -478,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
    });
    add({
      id: 'poi_crater_nest_void',
      type: 'monster_nest',
      name: 'Гнездо чудовищ: Разлом Гончих Пустоты у реки лавы',
      roleOrSubtitle: 'Точка интереса (Гнездо монстров)',
      promptText: 'Запечатать разлом знаком «Пламя»',
      x: -18,
      z: -462,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 290,
      lootItems: [
        { itemId: 'void_dust', count: 3 },
        { itemId: 'cursed_essence', count: 2 },
      ],
    });
    add({
      id: 'shrine_eclipse_altar',
      type: 'shrine',
      name: 'Алтарь Пепельного Затмения (Сердце Пустоты)',
      roleOrSubtitle: 'Финальный выбор судьбы Вальдмарка',
      promptText: 'Решить судьбу Сердца Пустоты и мира Вальдмарк [E]',
      x: 0,
      z: -518,
      radius: 4.8,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'eclipse_altar_root',
    });

    // =========================================================================
    // РАСШИРЕННОЕ НАСЕЛЕНИЕ СУЩЕСТВУЮЩИХ БИОМОВ (ВОРОНЬЯ ПАДЬ, ЛЕС, ПОГОСТ, ТОПИ, ПЕРЕВАЛ, БАСТИОН)
    // =========================================================================
    add({
      id: 'npc_village_miller',
      type: 'npc',
      name: 'Мельник Тихон',
      roleOrSubtitle: 'Хозяин ветряной мельницы Вороньей Пади',
      promptText: 'Поговорить с Мельником Тихоном',
      x: 18.5,
      z: -9.5,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'miller_root',
      npcScheduleRole: 'farmer',
      homeX: 18.5,
      homeZ: -9.5,
    });
    add({
      id: 'npc_village_miller_apprentice',
      type: 'npc',
      name: 'Подмастерье мельника Яромир',
      roleOrSubtitle: 'Зерновой амбар Вороньей Пади',
      promptText: 'Поговорить с подмастерье Яромиром',
      x: 18.5,
      z: -14.5,
      radius: 3.0,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'peasant_farmer_root',
      npcScheduleRole: 'farmer',
      homeX: 18.5,
      homeZ: -14.5,
    });
    add({
      id: 'npc_guard_captain',
      type: 'npc',
      name: 'Сотник Родерик',
      roleOrSubtitle: 'Начальник караула и южной заставы',
      promptText: 'Поговорить с Сотником Родериком',
      x: -3,
      z: 24,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'guard_captain_root',
      npcScheduleRole: 'torch_guard',
      homeX: -3,
      homeZ: 24,
      isArmedDefender: true,
    });
    add({
      id: 'npc_guard_west_bridge',
      type: 'npc',
      name: 'Страж западного моста Гарольд',
      roleOrSubtitle: 'Охрана тракта к гавани Сольхейм',
      promptText: 'Поговорить со стражем западного моста',
      x: -50,
      z: 28,
      radius: 3.0,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'guard_captain_root',
      npcScheduleRole: 'torch_guard',
      homeX: -50,
      homeZ: 28,
      isArmedDefender: true,
    });
    add({
      id: 'npc_guard_east_bridge',
      type: 'npc',
      name: 'Страж восточного моста Маркус',
      roleOrSubtitle: 'Охрана тракта к Лазурному Монастырю',
      promptText: 'Поговорить со стражем восточного моста',
      x: 50,
      z: 28,
      radius: 3.0,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'guard_captain_root',
      npcScheduleRole: 'torch_guard',
      homeX: 50,
      homeZ: 28,
      isArmedDefender: true,
    });
    add({
      id: 'npc_forest_ranger',
      type: 'npc',
      name: 'Ловчий Берен',
      roleOrSubtitle: 'Старейший егерь Лесной Заставы',
      promptText: 'Поговорить с Ловчим Береном (Отдых и слухи леса)',
      x: -54,
      z: 19,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'forest_ranger_root',
      npcScheduleRole: 'woodcutter',
      homeX: -54,
      homeZ: 19,
      isArmedDefender: true,
    });
    add({
      id: 'npc_forest_sawyer',
      type: 'npc',
      name: 'Пильщик Корней',
      roleOrSubtitle: 'Лесопильня у западного ручья',
      promptText: 'Поговорить с пильщиком Корнеем',
      x: -68,
      z: -11,
      radius: 3.0,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'peasant_woodcutter_root',
      npcScheduleRole: 'woodcutter',
      homeX: -68,
      homeZ: -11,
    });
    add({
      id: 'npc_cemetery_quartermaster',
      type: 'npc',
      name: 'Интендант Ордена Кассиан',
      roleOrSubtitle: 'Снабженец полевого лагеря Алого Солнца',
      promptText: 'Поговорить с интендантом Кассианом (Лавка припасов)',
      x: -16,
      z: 62,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'merchant_root',
      npcScheduleRole: 'merchant',
      homeX: -16,
      homeZ: 62,
    });
    add({
      id: 'npc_swamp_watcher',
      type: 'npc',
      name: 'Дозорный гатей Варг',
      roleOrSubtitle: 'Смотритель сигнальной вышки Топей',
      promptText: 'Поговорить с дозорным Варгом',
      x: 14,
      z: -146,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'guard_captain_root',
      npcScheduleRole: 'torch_guard',
      homeX: 14,
      homeZ: -146,
      isArmedDefender: true,
    });
    add({
      id: 'npc_pass_smelter',
      type: 'npc',
      name: 'Плавильщик Дорн',
      roleOrSubtitle: 'Мастер горной плавильни Среброзубого Перевала',
      promptText: 'Поговорить с Плавильщиком Дорном (Кузня и припасы)',
      x: 17.5,
      z: -256,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'pass_smelter_root',
      npcScheduleRole: 'blacksmith',
      homeX: 17.5,
      homeZ: -256,
      isArmedDefender: true,
    });

    // =========================================================================
    // НОВЫЙ БИОМ I: ЗАТОНУВШИЙ ПОРТ СОЛЬХЕЙМ И МАЯК БЕЗДНЫ (ЗАПАД, x < -105)
    // =========================================================================
    add({
      id: 'npc_solheim_keeper',
      type: 'npc',
      name: 'Смотритель маяка Хендрик',
      roleOrSubtitle: 'Хранитель Маяка Бездны · Гавань Сольхейм',
      promptText: 'Поговорить со Смотрителем Хендриком [Квест гавани]',
      x: -152,
      z: -8,
      radius: 3.5,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'solheim_keeper_root',
      npcScheduleRole: 'elder',
      homeX: -152,
      homeZ: -8,
    });
    add({
      id: 'npc_solheim_smuggler',
      type: 'npc',
      name: 'Капитан Корсар Вейл',
      roleOrSubtitle: 'Контрабандист и вольный шкипер Сольхейма',
      promptText: 'Поговорить с Капитаном Вейлом (Чёрный рынок и кости)',
      x: -132,
      z: 9,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'solheim_smuggler_root',
      npcScheduleRole: 'fence',
      homeX: -132,
      homeZ: 9,
    });
    add({
      id: 'npc_solheim_fisherman',
      type: 'npc',
      name: 'Старый гарпунщик Олаф',
      roleOrSubtitle: 'Рыбацкий причал Сольхейма',
      promptText: 'Поговорить с гарпунщиком Олафом',
      x: -158,
      z: 4,
      radius: 3.0,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'peasant_farmer_root',
      npcScheduleRole: 'farmer',
      homeX: -158,
      homeZ: 4,
    });
    add({
      id: 'npc_solheim_guard',
      type: 'npc',
      name: 'Береговой страж Сольхейма',
      roleOrSubtitle: 'Охрана каменного пирса и таможни',
      promptText: 'Поговорить с береговым стражем',
      x: -136,
      z: 0,
      radius: 3.0,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'guard_captain_root',
      npcScheduleRole: 'torch_guard',
      homeX: -136,
      homeZ: 0,
      isArmedDefender: true,
    });
    add({
      id: 'campfire_solheim_port',
      type: 'campfire',
      name: 'Портовый костёр у Маяка Сольхейма',
      roleOrSubtitle: 'Отдых, алхимия и смена времени суток',
      promptText: 'Медитировать у костра (Восстановить ОЗ, снять токсичность)',
      x: -148,
      z: -2,
      radius: 3.0,
      interacted: false,
      repeatable: true,
    });
    add({
      id: 'clue_solheim_amber_lens',
      type: 'clue',
      name: 'Звёздная Янтарная Линза Маяка',
      roleOrSubtitle: 'Квест «Маяк Затонувшей Гавани» · Нос затонувшего флагмана',
      promptText: 'Забрать Звёздную Янтарную Линзу для Маяка Сольхейма [E]',
      x: -162,
      z: 18,
      radius: 4.2,
      interacted: false,
      repeatable: false,
      questId: 'quest_sunken_lighthouse',
      questStageId: 'q_port_find_amber_lens',
      loreText:
        'Вы извлекаете из обломков капитанского мостика массивную линзу из Звёздного Янтаря, внутри которой теплится искра знака Игнис.',
    });
    add({
      id: 'poi_solheim_power',
      type: 'place_of_power',
      name: 'Место Силы: Морской Обелиск Прилива',
      roleOrSubtitle: 'Древний рунический обелиск Сольхейма',
      promptText: 'Почерпнуть мощь из Места Силы (+1 Очко Навыков и +25% к Знакам)',
      x: -166,
      z: -24,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
    });
    add({
      id: 'chest_solheim_admiral',
      type: 'chest',
      name: 'Казначейский сундук адмирала Ворона',
      roleOrSubtitle: 'Сокровище Затонувшего Порта Сольхейм',
      promptText: 'Открыть адмиральский сундук с метеоритным серебром',
      x: -160,
      z: 21,
      radius: 3.6,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 320,
      lootItems: [
        { itemId: 'black_ore', count: 2 },
        { itemId: 'rune_frost', count: 1 },
        { itemId: 'potion_thunderbolt', count: 2 },
      ],
    });

    // =========================================================================
    // НОВЫЙ БИОМ II: ЛАЗУРНЫЙ МОНАСТЫРЬ СОЛНЕЧНЫХ КЛЯТВ (ВОСТОК, x > 105)
    // =========================================================================
    add({
      id: 'npc_monastery_abbot',
      type: 'npc',
      name: 'Аббат Каэлум',
      roleOrSubtitle: 'Настоятель Лазурного Монастыря и Главный Звездочёт',
      promptText: 'Поговорить с Аббатом Каэлумом [Квест Монастыря]',
      x: 152,
      z: -15,
      radius: 3.5,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'monastery_abbot_root',
      npcScheduleRole: 'elder',
      homeX: 152,
      homeZ: -15,
    });
    add({
      id: 'npc_monastery_chronicler',
      type: 'npc',
      name: 'Сестра Аурелия',
      roleOrSubtitle: 'Хранительница Скриптория и Аптекарского Сада',
      promptText: 'Поговорить с Сестрой Аурелией (Монастырская лавка и исцеление)',
      x: 148,
      z: -4,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'monastery_chronicler_root',
      npcScheduleRole: 'herbalist',
      homeX: 148,
      homeZ: -4,
    });
    add({
      id: 'npc_monastery_paladin',
      type: 'npc',
      name: 'Рыцарь-хранитель Солярис',
      roleOrSubtitle: 'Страж врат Лазурного Монастыря',
      promptText: 'Поговорить с рыцарем-хранителем Солярисом',
      x: 134,
      z: -15,
      radius: 3.2,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'guard_captain_root',
      npcScheduleRole: 'torch_guard',
      homeX: 134,
      homeZ: -15,
      isArmedDefender: true,
    });
    add({
      id: 'clue_monastery_astrolabe',
      type: 'clue',
      name: 'Большая Астролябия Предтеч',
      roleOrSubtitle: 'Квест «Хроники Солнечных Клятв» · Купол Обсерватории',
      promptText: 'Сфокусировать зеркала Большой Астролябии на Северном Кратере [E]',
      x: 171,
      z: -15,
      radius: 4.4,
      interacted: false,
      repeatable: false,
      questId: 'quest_monastery_chronicles',
      questStageId: 'q_mon_align_astrolabe',
      loreText:
        'Бронзовые кольца Большой Астролябии приходят в движение! Луч лазурного света указывает прямо за северный край Кратера Затмения — в Долину Звёздного Пепла.',
    });
    add({
      id: 'poi_monastery_power',
      type: 'place_of_power',
      name: 'Место Силы: Солнечный Обелиск Хронистов',
      roleOrSubtitle: 'Древний рунический обелиск Монастыря',
      promptText: 'Почерпнуть мощь из Места Силы (+1 Очко Навыков и +25% к Знакам)',
      x: 164,
      z: -32,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
    });
    add({
      id: 'chest_monastery_religuary',
      type: 'chest',
      name: 'Реликварий Первых Звездочётов',
      roleOrSubtitle: 'Сокровище Лазурного Монастыря',
      promptText: 'Открыть золочёный ларец Скриптория',
      x: 168,
      z: 4,
      radius: 3.6,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 350,
      lootItems: [
        { itemId: 'rune_fire', count: 1 },
        { itemId: 'void_dust', count: 2 },
        { itemId: 'potion_swallow', count: 2 },
      ],
    });

    // =========================================================================
    // НОВЫЙ БИОМ III (АКТ III): ДОЛИНА ЗВЁЗДНОГО ПЕПЛА И КУЗНИЦА ПРЕДТЕЧ (z < -550)
    // =========================================================================
    add({
      id: 'npc_starfall_herald',
      type: 'npc',
      name: 'Хранитель Звёздного Горна Эландр',
      roleOrSubtitle: 'Акт III · Последний Страж Кузницы Предтеч',
      promptText: 'Поговорить с Хранителем Эландром [Акт III: Кузница Предтеч]',
      x: 0,
      z: -598,
      radius: 3.8,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'starfall_herald_root',
      npcScheduleRole: 'elder',
      homeX: 0,
      homeZ: -598,
      isArmedDefender: true,
    });
    add({
      id: 'campfire_starfall_forge',
      type: 'campfire',
      name: 'Астральная жаровня у врат Кузницы Предтеч',
      roleOrSubtitle: 'Отдых, алхимия и подготовка к битве с Архонтом',
      promptText: 'Медитировать у жаровни Предтеч (Восстановить ОЗ, снять токсичность)',
      x: -8,
      z: -598,
      radius: 3.2,
      interacted: false,
      repeatable: true,
    });
    add({
      id: 'shrine_starfall_anvil',
      type: 'shrine',
      name: 'Звёздная Наковальня Предтеч (Акт III)',
      roleOrSubtitle: 'Сердце Астральной Кузницы · Судьба Первой Короны',
      promptText: 'Прикоснуться к Звёздной Наковальне Предтеч [E]',
      x: 0,
      z: -648,
      radius: 4.8,
      interacted: false,
      repeatable: true,
      dialogueRootId: 'starfall_anvil_root',
    });
    add({
      id: 'poi_starfall_power',
      type: 'place_of_power',
      name: 'Место Силы: Монолит Падшей Звезды',
      roleOrSubtitle: 'Первородный обелиск Предтеч',
      promptText: 'Почерпнуть мощь из Места Силы (+1 Очко Навыков и +25% к Знакам)',
      x: -36,
      z: -624,
      radius: 4.0,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
    });
    add({
      id: 'chest_starfall_precursor',
      type: 'chest',
      name: 'Звёздный Ковчег Первого Короля Альдрика',
      roleOrSubtitle: 'Сокровище Долины Звёздного Пепла (Акт III)',
      promptText: 'Открыть Звёздный Ковчег Предтеч',
      x: 36,
      z: -624,
      radius: 3.8,
      interacted: false,
      repeatable: false,
      isPOI: true,
      discovered: false,
      goldAmount: 550,
      lootItems: [
        { itemId: 'black_ore', count: 4 },
        { itemId: 'void_dust', count: 4 },
        { itemId: 'rune_void_sup', count: 1 },
      ],
    });

    // =========================================================================
    // ПРИЗРАЧНЫЕ СЦЕНЫ «ОТГОЛОСКИ ПЕПЛА» (ЧУТЬЁ ЗОЛЬНИКА [V] + [E])
    // =========================================================================
    for (const echo of ASH_ECHOES) {
      add({
        id: echo.id,
        type: 'ash_echo',
        name: `👁️ ${echo.title}`,
        roleOrSubtitle: `${echo.regionName ?? echo.biomeName} · Отголосок Пепла (Чутьё [V])`,
        promptText: `Воспроизвести призрачную сцену «${echo.title}» (+40 XP в Кодекс [L])`,
        x: echo.x,
        z: echo.z,
        radius: 4.2,
        interacted: false,
        repeatable: true,
        ashEchoId: echo.id,
        isPOI: true,
        discovered: false,
      });
    }

    // =========================================================================
    // 28 ИНТЕРАКТИВНЫХ ЗАПИСОК, ДНЕВНИКОВ И ФОЛИАНТОВ ВАЛЬДМАРКА (КОДЕКС [L])
    // =========================================================================
    for (const note of WORLD_LORE_NOTES) {
      add({
        id: note.id,
        type: 'lore_note',
        name: `📜 ${note.title}`,
        roleOrSubtitle: `Запись Кодекса #${note.number}/${WORLD_LORE_NOTES.length} · ${note.locationHint}`,
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
      const role = item.id.includes('elder') || item.id.includes('abbot') || item.id.includes('keeper') || item.id.includes('herald')
        ? 'elder'
        : item.id.includes('blacksmith') || item.id.includes('smelter')
        ? 'blacksmith'
        : item.id.includes('caravan')
        ? 'caravan'
        : item.id.includes('merchant') || item.id.includes('quartermaster')
        ? 'merchant'
        : item.id.includes('inquisitor') || item.id.includes('order_captain') || item.id.includes('paladin')
        ? 'inquisitor'
        : item.id.includes('charon') || item.id.includes('ghoul_elder')
        ? 'charon'
        : item.id.includes('brom')
        ? 'brom'
        : item.id.includes('kael') || item.id.includes('erian')
        ? 'kael'
        : item.id.includes('vane')
        ? 'elder'
        : item.id.includes('guard') || item.id.includes('captain') || item.id.includes('watcher')
        ? 'guard'
        : item.id.includes('bard')
        ? 'bard'
        : item.id.includes('fence') || item.id.includes('smuggler')
        ? 'fence'
        : item.id.includes('lyra')
        ? 'lyra'
        : item.id.includes('thorvald')
        ? 'thorvald'
        : item.id.includes('vesper')
        ? 'vesper'
        : item.id.includes('peasant') || item.id.includes('water_carrier')
        ? 'peasant'
        : 'herbalist';
      const npcMesh = this.assetManager.createNPCModel(role);
      const qInd = this.assetManager.createQuestIndicatorGroup();
      qInd.position.set(0, 2.45, 0);
      npcMesh.add(qInd);
      npcMesh.position.set(item.x, item.y, item.z);
      npcMesh.lookAt(0, item.y, item.z + 4);
      this.scene.add(npcMesh);
      this.meshes.set(item.id, npcMesh);
    } else if (item.type === 'waystone') {
      const wsGroup = new THREE.Group();
      const stoneMat = this.assetManager.getMaterial('stone');
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.35, 8), stoneMat);
      base.position.y = 0.175;
      const monolith = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.1, 0.48), stoneMat);
      monolith.position.y = 1.65;
      monolith.castShadow = true;
      const runeCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 2.2,
        })
      );
      runeCrystal.position.set(0, 3.45, 0);
      runeCrystal.name = 'waystoneBeacon';
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.95, 1.15, 24),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      wsGroup.add(base, monolith, runeCrystal, ring);
      wsGroup.position.set(item.x, item.y, item.z);
      this.scene.add(wsGroup);
      this.meshes.set(item.id, wsGroup);
    } else if (item.type === 'ash_echo') {
      const echoGroup = new THREE.Group();
      const phantomMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: 0.72,
      });
      const figureA = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.05, 6, 10), phantomMat);
      figureA.position.set(-0.42, 0.95, 0);
      const figureB = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.05, 6, 10), phantomMat);
      figureB.position.set(0.42, 0.95, 0);
      const vortex = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.05, 8, 24),
        phantomMat
      );
      vortex.rotation.x = Math.PI / 2;
      vortex.position.y = 0.25;
      vortex.name = 'echoBeacon';
      echoGroup.add(figureA, figureB, vortex);
      echoGroup.position.set(item.x, item.y, item.z);
      this.scene.add(echoGroup);
      this.meshes.set(item.id, echoGroup);
    } else if (item.type === 'obstacle_clearing' || item.type === 'shrine') {
      const shrineGroup = new THREE.Group();
      const stoneMat = this.assetManager.getMaterial('stone');
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 1.2, 8), stoneMat);
      pedestal.position.y = 0.6;
      const orbColor = item.type === 'shrine' ? 0xef4444 : 0xf59e0b;
      const orb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38, 1),
        new THREE.MeshStandardMaterial({
          color: orbColor,
          emissive: orbColor,
          emissiveIntensity: 1.9,
        })
      );
      orb.position.y = 1.65;
      orb.name = 'poiBeacon';
      shrineGroup.add(pedestal, orb);
      if (item.type === 'shrine') {
        const qInd = this.assetManager.createQuestIndicatorGroup();
        qInd.position.set(0, 2.38, 0);
        shrineGroup.add(qInd);
      }
      shrineGroup.position.set(item.x, item.y, item.z);
      this.scene.add(shrineGroup);
      this.meshes.set(item.id, shrineGroup);
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

      const qInd = this.assetManager.createQuestIndicatorGroup();
      qInd.position.set(0, 2.82, 0);
      boardGroup.add(postL, postR, panel, roof, qInd);
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
      const chestGroup = this.assetManager.createDetailedChestModel(item.interacted);
      chestGroup.position.set(item.x, item.y, item.z);
      this.scene.add(chestGroup);
      this.meshes.set(item.id, chestGroup);
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
        const stele = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.45, 0.24), stoneMat);
        stele.position.y = 0.72;
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.04), parchmentMat);
        sheet.position.set(0, 0.88, 0.13);
        loreGroup.add(stele, sheet);
      }

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

  public spawnLootPouch(opts: {
    enemyId: string;
    enemyName: string;
    x: number;
    z: number;
    goldAmount: number;
    lootTable: string[];
  }): WorldInteractable {
    const y = this.getSurfaceHeightAt(opts.x, opts.z);
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

  /**
   * Visually alters the 3D world and NPC states based on the player's choices
   * in the 4 non-linear investigation quests.
   */
  public applyWorldQuestConsequence(choiceId: string): void {
    const stoneMat = this.assetManager.getMaterial('stone');
    const woodMat = this.assetManager.getMaterial('wood');

    if (choiceId === 'belltower_kill_wife') {
      const helga = this.interactables.find((i) => i.id === 'npc_belltower_helga');
      if (helga) {
        helga.interacted = true;
        helga.repeatable = false;
      }
      const helgaMesh = this.meshes.get('npc_belltower_helga');
      if (helgaMesh) helgaMesh.visible = false;

      // Spawn grave cross with memorial candle next to the forge
      const graveGroup = new THREE.Group();
      const postV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.45, 0.16), woodMat);
      postV.position.y = 0.72;
      const postH = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.14), woodMat);
      postH.position.y = 1.05;
      const candle = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf97316 })
      );
      candle.position.set(0, 0.22, 0.25);
      graveGroup.add(postV, postH, candle);
      const gy = this.getSurfaceHeightAt(10.5, 9.8);
      graveGroup.position.set(10.5, gy, 9.8);
      this.scene.add(graveGroup);
    } else if (choiceId === 'belltower_cleanse_ritual') {
      const helga = this.interactables.find((i) => i.id === 'npc_belltower_helga');
      if (helga) {
        helga.name = 'Хельга (Исцелена от Ночного Голода)';
        helga.roleOrSubtitle = 'Спасена ритуалом Тлеющей Крови';
        helga.promptText = 'Поговорить со спасённой Хельгой';
      }
    } else if (choiceId === 'belltower_blame_outsider') {
      const helga = this.interactables.find((i) => i.id === 'npc_belltower_helga');
      if (helga) {
        helga.roleOrSubtitle = 'Тайна скрыта за золото кузнеца';
      }
      // Spawn warning pillar at village gate
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 8), woodMat);
      post.position.set(0, getGroundHeight(0, 14) + 1.1, 14);
      this.scene.add(post);
    } else if (choiceId === 'feast_burn_manor') {
      const vane = this.interactables.find((i) => i.id === 'npc_lord_vane');
      if (vane) {
        vane.interacted = true;
        vane.repeatable = false;
      }
      const vaneMesh = this.meshes.get('npc_lord_vane');
      if (vaneMesh) vaneMesh.visible = false;

      // Spawn cleansing fire pillars at the manor table
      for (let i = -1; i <= 1; i++) {
        const pyre = new THREE.Mesh(
          new THREE.ConeGeometry(0.65, 2.1, 8),
          new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.82 })
        );
        const px = 30 + i * 2.2;
        const pz = -166;
        pyre.position.set(px, getGroundHeight(px, pz) + 1.05, pz);
        this.scene.add(pyre);
      }
    } else if (choiceId === 'feast_spare_illusions') {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(4.2, 16, 12),
        new THREE.MeshBasicMaterial({
          color: 0xa855f7,
          transparent: true,
          opacity: 0.22,
          wireframe: true,
        })
      );
      dome.position.set(30, getGroundHeight(30, -166) + 1.8, -166);
      this.scene.add(dome);
    } else if (choiceId === 'mines_protect_ghouls') {
      const capt = this.interactables.find((i) => i.id === 'npc_order_captain_mines');
      if (capt) {
        capt.interacted = true;
        capt.repeatable = false;
      }
      const captMesh = this.meshes.get('npc_order_captain_mines');
      if (captMesh) captMesh.visible = false;

      const ghoul = this.interactables.find((i) => i.id === 'npc_sentient_ghoul_elder');
      if (ghoul) {
        ghoul.roleOrSubtitle = 'Штрек под защитой свободных горняков';
      }
    } else if (choiceId === 'mines_purge_for_order') {
      const ghoul = this.interactables.find((i) => i.id === 'npc_sentient_ghoul_elder');
      if (ghoul) {
        ghoul.interacted = true;
        ghoul.repeatable = false;
      }
      const ghoulMesh = this.meshes.get('npc_sentient_ghoul_elder');
      if (ghoulMesh) ghoulMesh.visible = false;

      const banner = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 2.8, 0.15),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 0.9 })
      );
      banner.position.set(-22, getGroundHeight(-22, -275) + 1.4, -275);
      this.scene.add(banner);
    } else if (choiceId === 'exam_revive_brotherhood') {
      const erian = this.interactables.find((i) => i.id === 'npc_apprentice_erian');
      if (erian) {
        erian.name = 'Зольник Эриан (Мастер-Ученик)';
        erian.roleOrSubtitle = 'Возрождённое Братство Пепла · Янтарные Глаза';
      }
      const vat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.0, 1.6, 12),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 1.8,
        })
      );
      vat.position.set(-18, getGroundHeight(-18, -378) + 0.8, -378);
      this.scene.add(vat);
    } else if (choiceId === 'exam_bury_secrets') {
      const erian = this.interactables.find((i) => i.id === 'npc_apprentice_erian');
      const erianMesh = this.meshes.get('npc_apprentice_erian');
      if (erian) {
        erian.name = 'Летописец Эриан (Спасён от мутации)';
        erian.roleOrSubtitle = 'Хранитель памяти Братства в Вороньей Пади';
        erian.x = 3.5;
        erian.z = -4.5;
        erian.y = getGroundHeight(3.5, -4.5);
        if (erianMesh) {
          erianMesh.position.set(erian.x, erian.y, erian.z);
        }
      }
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), stoneMat);
      rubble.position.set(-18, getGroundHeight(-18, -378) + 0.5, -378);
      this.scene.add(rubble);
    }
  }

  public getNearestInteractable(
    playerX: number,
    playerZ: number
  ): WorldInteractable | null {
    let closest: WorldInteractable | null = null;
    let minDist = Infinity;

    for (const item of this.interactables) {
      if (item.interacted && !item.repeatable) continue;
      const mesh = this.meshes.get(item.id);
      if (mesh && !mesh.visible) continue;

      const dist = Math.hypot(playerX - item.x, playerZ - item.z);
      if (dist <= item.radius && dist < minDist) {
        minDist = dist;
        closest = item;
      }
    }

    return closest;
  }

  public syncQuestIndicators(
    quests: Quest[],
    contracts: HunterContract[],
    elapsed = 0
  ): void {
    for (const item of this.interactables) {
      if (item.type !== 'npc' && item.type !== 'notice_board' && item.type !== 'shrine') {
        continue;
      }
      const mesh = this.meshes.get(item.id);
      if (!mesh) continue;
      const qRoot = mesh.getObjectByName('questIndicatorRoot');
      if (!qRoot) continue;
      const ex = qRoot.getObjectByName('questExclamation');
      const qu = qRoot.getObjectByName('questQuestion');
      const state = getActorQuestIndicatorState(item.id, quests, contracts);
      if (ex) ex.visible = state === 'exclamation';
      if (qu) qu.visible = state === 'question';
      if (state !== 'none') {
        const baseY =
          item.type === 'notice_board' ? 2.82 : item.type === 'shrine' ? 2.38 : 2.45;
        qRoot.position.y = baseY + Math.sin(elapsed * 3.2 + item.x * 0.5) * 0.12;
        qRoot.rotation.y = elapsed * 2.1;
      }
    }
  }

  public update(
    elapsed: number,
    playerX: number,
    playerZ: number,
    onPOIDiscovered?: (item: WorldInteractable) => void,
    witcherSenseActive = false,
    livingWorldOpts?: {
      dt: number;
      timeOfDay: number;
      weather: WeatherType;
      enemies: EnemyInstance[];
      activeCompanionId: CompanionId | null;
      vesperSpared: boolean;
      quests?: Quest[];
      contracts?: HunterContract[];
      onAnvilStrike?: (distanceRatio: number) => void;
      onGuardAttackEnemy?: (guardName: string, enemy: EnemyInstance, damage: number) => void;
    }
  ): WorldInteractable | null {
    const dt = livingWorldOpts?.dt ?? 0.016;
    if (livingWorldOpts?.quests && livingWorldOpts?.contracts) {
      this.syncQuestIndicators(livingWorldOpts.quests, livingWorldOpts.contracts, elapsed);
    }

    for (const item of this.interactables) {
      if (item.isPOI && !item.discovered) {
        const d = Math.hypot(playerX - item.x, playerZ - item.z);
        if (d <= 15) {
          item.discovered = true;
          onPOIDiscovered?.(item);
        }
      }

      const mesh = this.meshes.get(item.id);

      // Animate detailed 3D Chest lid opening & inner gold glow (even after chest is interacted)
      if (item.type === 'chest' && mesh) {
        const lidPivot = mesh.getObjectByName('chestLidPivot');
        const targetAngle = item.interacted ? -1.92 : (mesh.userData.targetLidAngle ?? 0);
        if (lidPivot) {
          lidPivot.rotation.x = THREE.MathUtils.damp(
            lidPivot.rotation.x,
            targetAngle,
            7.5,
            dt
          );
        }
        const treasure = mesh.getObjectByName('chestTreasureGlow');
        if (treasure) {
          treasure.visible = item.interacted || (lidPivot ? lidPivot.rotation.x < -0.25 : false);
        }
        const aura = mesh.getObjectByName('chestInnerAura') as THREE.Mesh | undefined;
        if (aura && aura.material instanceof THREE.MeshBasicMaterial) {
          aura.material.opacity = 0.28 + Math.sin(elapsed * 3.5) * 0.1;
        }
      }

      if (item.interacted && !item.repeatable) continue;

      // Hide NPC stand-ins for the currently recruited companion
      if (livingWorldOpts && item.type === 'npc') {
        if (item.id === 'npc_companion_lyra' && mesh) {
          mesh.visible = livingWorldOpts.activeCompanionId !== 'lyra';
        } else if (item.id === 'npc_companion_thorvald' && mesh) {
          mesh.visible = livingWorldOpts.activeCompanionId !== 'thorvald';
        } else if (item.id === 'npc_companion_vesper' && mesh) {
          mesh.visible = livingWorldOpts.activeCompanionId !== 'vesper';
          if (livingWorldOpts.vesperSpared && item.z < -100) {
            item.x = 5.2;
            item.z = 1.8;
            item.y = getGroundHeight(item.x, item.z);
            mesh.position.set(item.x, item.y, item.z);
          }
        }
      }

      // Update AI Daily Schedules, Weather Sheltering, Combat Defense & Panic Fleeing
      if (livingWorldOpts && item.type === 'npc' && item.npcScheduleRole && mesh) {
        let nearestEnemy: EnemyInstance | null = null;
        let nearestEnemyDist = Infinity;
        for (const e of livingWorldOpts.enemies) {
          if (e.isDead || e.state === 'DEAD') continue;
          const ed = Math.hypot(e.x - item.x, e.z - item.z);
          if (ed < nearestEnemyDist) {
            nearestEnemyDist = ed;
            nearestEnemy = e;
          }
        }

        const schedule = computeNpcSchedule(
          item.npcScheduleRole,
          livingWorldOpts.timeOfDay,
          livingWorldOpts.weather,
          nearestEnemyDist <= 22,
          Boolean(item.isArmedDefender),
          item.homeX ?? item.x,
          item.homeZ ?? item.z,
          elapsed
        );

        item.currentActivity = schedule.state;
        item.currentActivityState = schedule.state;
        const shortName = item.name.split(' (')[0];
        item.promptText = `Поговорить с ${shortName} [${schedule.activityLabel}]`;

        const targetX =
          schedule.state === 'COMBAT_DEFEND' && nearestEnemy
            ? nearestEnemy.x
            : schedule.targetX;
        const targetZ =
          schedule.state === 'COMBAT_DEFEND' && nearestEnemy
            ? nearestEnemy.z
            : schedule.targetZ;

        const dx = targetX - item.x;
        const dz = targetZ - item.z;
        const distToTarget = Math.hypot(dx, dz);
        const moveSpeed =
          schedule.state === 'PANIC_FLEE' || schedule.state === 'COMBAT_DEFEND'
            ? 5.6
            : item.npcScheduleRole === 'caravan'
            ? 2.8
            : 2.3;

        const leftLeg = mesh.getObjectByName('npcLeftLeg');
        const rightLeg = mesh.getObjectByName('npcRightLeg');
        const leftArm = mesh.getObjectByName('npcLeftArm');
        const rightArm = mesh.getObjectByName('npcRightArm');
        const head = mesh.getObjectByName('npcHead');

        const dPlayer = Math.hypot(playerX - item.x, playerZ - item.z);
        const isConversingOrGreeting =
          dPlayer < 3.6 &&
          schedule.state !== 'PANIC_FLEE' &&
          schedule.state !== 'COMBAT_DEFEND';

        // Contextual awareness label for smarter NPC immersion
        if (isConversingOrGreeting) {
          const isNightNow = livingWorldOpts.timeOfDay >= 20 || livingWorldOpts.timeOfDay < 5.5;
          const contextNote =
            livingWorldOpts.weather === 'rain'
              ? 'Укрывается от непогоды · Готов к беседе'
              : isNightNow
              ? 'Настороже в ночной тьме · Готов к беседе'
              : schedule.activityLabel;
          item.promptText = `Поговорить с ${shortName} [${contextNote}]`;
        }

        if (dPlayer < 1.3 && schedule.state !== 'COMBAT_DEFEND') {
          // Politely step aside if standing too close to the player
          const awayX = item.x - playerX;
          const awayZ = item.z - playerZ;
          const awayDist = Math.max(0.01, Math.hypot(awayX, awayZ));
          item.x += (awayX / awayDist) * 1.5 * livingWorldOpts.dt;
          item.z += (awayZ / awayDist) * 1.5 * livingWorldOpts.dt;
          item.y = this.getSurfaceHeightAt(item.x, item.z);
          mesh.position.set(item.x, item.y, item.z);
        } else if (distToTarget > 0.18 && !isConversingOrGreeting) {
          const step = Math.min(distToTarget, moveSpeed * livingWorldOpts.dt);
          item.x += (dx / distToTarget) * step;
          item.z += (dz / distToTarget) * step;
          item.y = this.getSurfaceHeightAt(item.x, item.z);
          mesh.position.set(item.x, item.y, item.z);
          mesh.rotation.y = Math.atan2(dx, dz);
          const stride = Math.sin(elapsed * 8.5);
          const torso = mesh.getObjectByName('npcTorso');
          if (torso) {
            torso.position.y = 1.15 + Math.abs(Math.cos(elapsed * 8.5)) * 0.045;
            torso.rotation.z = stride * 0.05;
          }
          if (leftLeg) leftLeg.rotation.x = stride * 0.48;
          if (rightLeg) rightLeg.rotation.x = -stride * 0.48;
          if (leftArm) leftArm.rotation.x = -stride * 0.36;
          if (rightArm) rightArm.rotation.x = stride * 0.36;
          if (head) head.rotation.y = THREE.MathUtils.damp(head.rotation.y, 0, 8, dt);
        } else {
          if (dPlayer < 6.8) {
            mesh.lookAt(playerX, item.y, playerZ);
            if (head) {
              head.rotation.y = Math.sin(elapsed * 1.5) * 0.08;
            }
          }
          const torso = mesh.getObjectByName('npcTorso');
          if (torso) {
            torso.position.y = 1.15 + Math.sin(elapsed * 2.2) * 0.015;
            torso.rotation.z = schedule.state === 'SLEEP_INDOORS' ? 0.18 : 0;
          }
          if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 8, dt);
          if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 8, dt);
          if (leftArm) {
            leftArm.rotation.x = THREE.MathUtils.damp(
              leftArm.rotation.x,
              Math.sin(elapsed * 2.0) * 0.04,
              8,
              dt
            );
          }
          if (rightArm) {
            // Subtle greeting gesture when facing the player up close
            const greetAngle = isConversingOrGreeting
              ? -0.35 + Math.sin(elapsed * 3.2) * 0.08
              : -Math.sin(elapsed * 2.0) * 0.04;
            rightArm.rotation.x = THREE.MathUtils.damp(
              rightArm.rotation.x,
              greetAngle,
              8,
              dt
            );
          }
        }

        // Guard torch visibility
        const torch = mesh.getObjectByName('npcTorch');
        if (torch) {
          torch.visible = schedule.torchLit;
          const flame = mesh.getObjectByName('npcTorchFlame');
          if (flame) {
            const s = 0.9 + Math.sin(elapsed * 14) * 0.15;
            flame.scale.set(s, s * 1.15, s);
          }
        }

        // Blacksmith anvil hammering animation + metallic clang audio
        if (item.npcScheduleRole === 'blacksmith') {
          const hammer = mesh.getObjectByName('smithHammer');
          if (hammer) {
            if (schedule.state === 'ANVIL_FORGE' || schedule.state === 'WORK') {
              const swing = Math.sin(elapsed * 6.8);
              hammer.position.y = -0.32 + swing * 0.14;
              hammer.rotation.x = swing * 0.75;
              if (rightArm) {
                rightArm.rotation.x = -0.65 + swing * 0.55;
              }
              if (swing < -0.92 && elapsed - this.lastAnvilStrikeTime > 0.85) {
                this.lastAnvilStrikeTime = elapsed;
                const dPlayer = Math.hypot(playerX - item.x, playerZ - item.z);
                if (dPlayer < 32) {
                  livingWorldOpts.onAnvilStrike?.(1 - dPlayer / 32);
                }
              }
            } else {
              hammer.position.y = -0.32;
              hammer.rotation.x = 0;
            }
          }
        }

        // Armed defenders (Guards & Blacksmith) strike monsters lured into the village
        if (
          schedule.state === 'COMBAT_DEFEND' &&
          item.isArmedDefender &&
          nearestEnemy &&
          nearestEnemyDist <= 3.6
        ) {
          const weapon = mesh.getObjectByName('npcWeapon') ?? mesh.getObjectByName('smithHammer');
          if (weapon) {
            weapon.rotation.x = Math.sin(elapsed * 14) * 0.85;
          }
          if (rightArm) {
            rightArm.rotation.x = -0.8 + Math.sin(elapsed * 14) * 0.65;
          }
          const lastHit = this.guardAttackCooldowns.get(item.id) ?? 0;
          if (elapsed - lastHit > 1.15) {
            this.guardAttackCooldowns.set(item.id, elapsed);
            livingWorldOpts.onGuardAttackEnemy?.(shortName, nearestEnemy, 24);
          }
        }
      } else if (item.type === 'npc' && mesh) {
        // Static quest/camp NPCs: idle breathing, subtle arm sway, and turning toward player when nearby
        const dPlayer = Math.hypot(playerX - item.x, playerZ - item.z);
        if (dPlayer < 6.5) {
          mesh.lookAt(playerX, item.y, playerZ);
        }
        const torso = mesh.getObjectByName('npcTorso');
        if (torso) {
          torso.position.y = 1.15 + Math.sin(elapsed * 2.1 + item.x) * 0.016;
        }
        const leftArm = mesh.getObjectByName('npcLeftArm');
        const rightArm = mesh.getObjectByName('npcRightArm');
        if (leftArm) leftArm.rotation.x = Math.sin(elapsed * 1.8 + item.z) * 0.04;
        if (rightArm) rightArm.rotation.x = -Math.sin(elapsed * 1.8 + item.z) * 0.04;
      }

      if (mesh && (item.type === 'clue' || item.type === 'signpost')) {
        mesh.rotation.y = elapsed * 1.6;
        mesh.position.y = item.y + 1.1 + Math.sin(elapsed * 2.5) * 0.12;
      } else if (mesh && item.type === 'loot') {
        const beacon = mesh.getObjectByName('lootBeacon');
        if (beacon) {
          beacon.rotation.y = elapsed * 2.4;
          beacon.position.y = 0.92 + Math.sin(elapsed * 3.2) * 0.12;
        }
      } else if (
        mesh &&
        (item.type === 'monster_nest' ||
          item.type === 'place_of_power' ||
          item.type === 'obstacle_clearing' ||
          item.type === 'shrine')
      ) {
        const beacon = mesh.getObjectByName('poiBeacon');
        if (beacon) {
          beacon.rotation.y = elapsed * 1.8;
        }
      } else if (mesh && item.type === 'waystone') {
        const beacon = mesh.getObjectByName('waystoneBeacon');
        if (beacon) {
          beacon.rotation.y = elapsed * 2.2;
          beacon.position.y = 3.45 + Math.sin(elapsed * 2.5) * 0.12;
        }
      } else if (mesh && item.type === 'ash_echo') {
        const beacon = mesh.getObjectByName('echoBeacon');
        if (beacon) {
          beacon.rotation.z = elapsed * (witcherSenseActive ? 3.5 : 1.5);
        }
        const s = witcherSenseActive ? 1.18 + Math.sin(elapsed * 5) * 0.1 : 0.85;
        mesh.scale.set(s, s, s);
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
    const mesh = this.meshes.get(id);
    if (item.type === 'chest' && mesh) {
      mesh.userData.targetLidAngle = -1.92;
      const treasure = mesh.getObjectByName('chestTreasureGlow');
      if (treasure) treasure.visible = true;
      return;
    }
    if (!item.repeatable) {
      if (
        mesh &&
        (item.type === 'herb' ||
          item.type === 'loot' ||
          item.type === 'monster_nest' ||
          item.type === 'clue' ||
          item.type === 'obstacle_clearing')
      ) {
        mesh.visible = false;
      }
    }
  }
}
