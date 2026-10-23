import { advanceQuestStage } from './rules';
import type { HunterContract, Quest } from './types';

export class QuestSystem {
  public quests: Quest[] = [];
  public contracts: HunterContract[] = [];
  public activeQuestId: string = 'quest_missing_hunters';

  constructor() {
    this.initQuests();
    this.initContracts();
  }

  public initContracts(): void {
    this.contracts = [
      {
        id: 'contract_werewolf',
        title: 'Заказ: «Вой в ночи»',
        monsterName: 'Альфа-Воколак (Оборотень)',
        monsterType: 'werewolf',
        biome: 'Старый лес',
        recommendedLevel: 3,
        rewardGold: 180,
        rewardXp: 200,
        trophyItemId: 'trophy_werewolf',
        description:
          'По ночам из глубин Старого леса Вальдмарка доносится вой бывшего королевского ловчего, испившего Чёрной Росы. Изучите 3 охотничьи улики в чаще, выманите Альфа-Воколака и остановите его регенерацию Печатью «Пламя».',
        status: 'available',
        cluesFound: 0,
        cluesRequired: 3,
        searchX: -52,
        searchZ: 6,
      },
      {
        id: 'contract_noonwraith',
        title: 'Заказ: «Невеста у колодца»',
        monsterName: 'Полуденница (Призрак невесты)',
        monsterType: 'noonwraith',
        biome: 'Заброшенный хутор',
        recommendedLevel: 3,
        rewardGold: 195,
        rewardXp: 220,
        trophyItemId: 'trophy_noonwraith',
        description:
          'У старого колодца на восточном хуторе бродит призрак преданной невесты Аделины. Осмотрите 3 улики у колодца, снимите её астральную неуязвимость «Ледяной печатью» или «Импульсом» и упокойте дух.',
        status: 'available',
        cluesFound: 0,
        cluesRequired: 3,
        searchX: 42,
        searchZ: 18,
      },
      {
        id: 'contract_gargoyle',
        title: 'Заказ: «Каменный жнец»',
        monsterName: 'Древняя Горгулья',
        monsterType: 'gargoyle',
        biome: 'Каменные руины',
        recommendedLevel: 4,
        rewardGold: 220,
        rewardXp: 250,
        trophyItemId: 'trophy_gargoyle',
        description:
          'Среди руин Вальдмарка к северо-востоку пробудилась гранитная горгулья эпохи Малакора. Изучите 3 следа разрушений и сокрушите её броню тяжёлыми ударами меча и атаками со спины.',
        status: 'available',
        cluesFound: 0,
        cluesRequired: 3,
        searchX: 46,
        searchZ: -24,
      },
    ];
  }

  public initQuests(): void {
    this.quests = [
      {
        id: 'quest_missing_hunters',
        title: 'Пропавшие охотники и след Веспера',
        giver: 'Староста Бран (Боримир)',
        biome: 'Старый лес',
        recommendedLevel: 1,
        description:
          'Двое охотников Вороньей Пади ушли по следам вашего наставника Веспера к северной кромке Старого леса и не вернулись. Староста Бран просит выследить их и зачистить тракт от трупоедов Чёрной Росы.',
        status: 'active',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q1_talk_elder',
            description: 'Поговорить со старостой Браном в центре Вороньей Пади',
            completed: false,
            targetX: 6,
            targetZ: -4,
            radius: 4,
          },
          {
            id: 'q1_find_tracks',
            description: 'Найти следы охотников и дневник Веспера у кромки Старого леса',
            completed: false,
            targetX: -18,
            targetZ: 12,
            radius: 4,
          },
          {
            id: 'q1_inspect_camp',
            description: 'Обнаружить место нападения у разбитой повозки',
            completed: false,
            targetX: -34,
            targetZ: 18,
            radius: 4,
          },
          {
            id: 'q1_kill_ghouls',
            description: 'Уничтожить стаю упырей Чёрной Росы на месте засады',
            completed: false,
            targetX: -34,
            targetZ: 18,
            radius: 8,
          },
          {
            id: 'q1_return_elder',
            description: 'Вернуться к старосте Брану за наградой',
            completed: false,
            targetX: 6,
            targetZ: -4,
            radius: 4,
          },
        ],
        xpReward: 150,
        goldReward: 120,
        itemReward: 'sword_hunter_steel',
      },
      {
        id: 'quest_swamp_whisper',
        title: 'Шёпот Чёрной Росы',
        giver: 'Травница Марфа',
        biome: 'Проклятое святилище',
        recommendedLevel: 2,
        description:
          'Из глубин болот на юго-западе доносится гул осколка Сердца Пустоты. Проклятое святилище отравляет воды Чёрной Росой под властью отступницы Мораны.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q2_inspect_clue_1',
            description: 'Найти Проклятое святилище и осмотреть расколотую рунную скрижаль',
            completed: false,
            targetX: -54,
            targetZ: -46,
            radius: 5,
          },
          {
            id: 'q2_inspect_clue_2',
            description: 'Изучить жертвенную чашу и журнал алхимика Морвана',
            completed: false,
            targetX: -62,
            targetZ: -58,
            radius: 5,
          },
          {
            id: 'q2_kill_hag',
            description: 'Победить Болотную ведьму Морану, хранящую ритуал',
            completed: false,
            targetX: -61,
            targetZ: -49,
            radius: 7,
          },
          {
            id: 'q2_artifact_choice',
            description: 'Принять решение у Алтаря: уничтожить осколок или подчинить его Печатью Пепла',
            completed: false,
            targetX: -65,
            targetZ: -55,
            radius: 4,
          },
        ],
        xpReward: 220,
        goldReward: 160,
      },
      {
        id: 'quest_ancient_king',
        title: 'Цитадель Вальдмарка (Акт I)',
        giver: 'Староста Бран (Боримир)',
        biome: 'Разрушенная крепость',
        recommendedLevel: 4,
        description:
          'В Разрушенной крепости Вальдмарка на восточном плато замурованы жертвы Ночи Пепельного Затмения. Сразите Архидемона и Древнего Хранителя Короны, чтобы открыть путь к усыпальнице Малакора.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q3_reach_fortress',
            description: 'Найти вход в Разрушенную крепость Вальдмарка на северо-востоке',
            completed: false,
            targetX: 48,
            targetZ: -46,
            radius: 5,
          },
          {
            id: 'q3_kill_demon',
            description: 'Пройти охраняемый двор и победить Архидемона Бездны',
            completed: false,
            targetX: 56,
            targetZ: -54,
            radius: 7,
          },
          {
            id: 'q3_kill_boss',
            description: 'Сразиться с главным боссом Акта I — Древним Хранителем Короны',
            completed: false,
            targetX: 72,
            targetZ: -68,
            radius: 8,
          },
        ],
        xpReward: 400,
        goldReward: 300,
        itemReward: 'relic_blade',
      },
      {
        id: 'quest_act2_malakor',
        title: 'Акт II: Сердце Пустоты и Малакор Бессмертный',
        giver: 'Инквизитор Лазарь / Староста Бран',
        biome: 'Пепельный Погост и Лагерь Ордена',
        recommendedLevel: 5,
        description:
          'На южном Пепельном Погосте разбил лагерь Орден Алого Солнца во главе с Инквизитором Лазарем. Выберите сторону — или соберите все 12 рукописей Кодекса [L], чтобы провести секретный Ритуал Истинного Искупления с Королём-Личем Малакором Бессмертным.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q4_talk_inquisitor',
            description: 'Отправиться на юг в Лагерь Ордена и выбрать сторону у Инквизитора Лазаря',
            completed: false,
            targetX: -6,
            targetZ: 66,
            radius: 5,
          },
          {
            id: 'q4_kill_malakor',
            description: 'Сразиться с Королём-Личем Малакором Бессмертным или провести Ритуал Пепла у его Трона',
            completed: false,
            targetX: 0,
            targetZ: 84,
            radius: 9,
          },
        ],
        xpReward: 600,
        goldReward: 500,
        itemReward: 'king_crown_shard',
      },
      // =======================================================================
      // СЕВЕРНЫЙ ПОХОД: 4 СВЯЗАННЫХ СЮЖЕТНЫХ КВЕСТА ПОХОДА НА СЕВЕР
      // =======================================================================
      {
        id: 'quest_drowned_path',
        title: 'Поход на Север I: «Тропа Утопленников»',
        giver: 'Лодочник Харон',
        biome: 'Тракт Висельников и Затопленные Топи',
        recommendedLevel: 5,
        description:
          'Северная застава за Разрушенной крепостью открывает путь к Тракту Висельников и Затопленным Топям. Разыщите Лодочника Харона у причала, восстановите паромную переправу через ядовитую трясину и убейте многоголовую Матерь Трясины, преграждающую путь к горам.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q5_talk_charon',
            description: 'Найти Лодочника Харона в полевом лагере Затопленных Топей (на севере за мостом)',
            completed: false,
            targetX: -8,
            targetZ: -145,
            radius: 5,
          },
          {
            id: 'q5_repair_ferry',
            description: 'Починить лебёдку паромной переправы и расчистить гать через ядовитую трясину',
            completed: false,
            targetX: 0,
            targetZ: -162,
            radius: 5,
          },
          {
            id: 'q5_kill_hydra',
            description: 'Сразить босса Топей — «Матерь Трясины (Гидру)» в сердце омута',
            completed: false,
            targetX: 0,
            targetZ: -190,
            radius: 9,
          },
        ],
        xpReward: 550,
        goldReward: 380,
        itemReward: 'mythic_plague_scythe',
      },
      {
        id: 'quest_mountain_blood',
        title: 'Поход на Север II: «Кровь Горы»',
        giver: 'Старый Рудокоп Бром',
        biome: 'Среброзубый Перевал и Мёртвые Шахты',
        recommendedLevel: 6,
        description:
          'Подъём из болот ведёт в заснеженный Среброзубый Перевал и Мёртвые Шахты, где для короля Малакора добывали Чёрную Руду. Помогите Старому Рудокопу Брому расчистить обвал у древнего подъёмника и сокрушите Кристального Колосса.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q6_talk_brom',
            description: 'Поговорить со Старым Рудокопом Бромом у костра на Среброзубом Перевале',
            completed: false,
            targetX: 6,
            targetZ: -255,
            radius: 5,
          },
          {
            id: 'q6_clear_mine_lift',
            description: 'Активировать древний рудничный подъёмник и расчистить завал у входа в Мёртвые Шахты',
            completed: false,
            targetX: 0,
            targetZ: -275,
            radius: 5,
          },
          {
            id: 'q6_kill_colossus',
            description: 'Разбить кристальные наросты Импульсом/тяж. ударами и победить Кристального Колосса',
            completed: false,
            targetX: 0,
            targetZ: -300,
            radius: 9,
          },
        ],
        xpReward: 700,
        goldReward: 460,
        itemReward: 'mythic_black_cleaver',
      },
      {
        id: 'quest_ash_brotherhood',
        title: 'Поход на Север III: «Пепел Братства»',
        giver: 'Выживший Адепт Каэль',
        biome: 'Чёрный Бастион Братства Пепла',
        recommendedLevel: 7,
        description:
          'На вершине перевала высятся руины Чёрного Бастиона — крепости-школы, где обучали Корвуса. Встретьтесь с Выжившим Адептом Каэлем, пройдите «Испытание Трёх Печатей», узнайте правду о предательстве Веспера и сойдитесь с Грандмастером в дуэли.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q7_talk_kael',
            description: 'Поговорить с Выжившим Адептом Каэлем у врат Чёрного Бастиона',
            completed: false,
            targetX: 0,
            targetZ: -355,
            radius: 5,
          },
          {
            id: 'q7_trial_three_seals',
            description: 'Активировать Алтарь «Испытания Трёх Печатей» в зале алхимических чанов Бастиона',
            completed: false,
            targetX: 0,
            targetZ: -376,
            radius: 5,
          },
          {
            id: 'q7_duel_vesper',
            description: 'Победить Грандмастера Веспера во внутреннем дворе мечей павших братьев',
            completed: false,
            targetX: 0,
            targetZ: -400,
            radius: 9,
          },
          {
            id: 'q7_vesper_choice',
            description: 'Решить судьбу поверженного Веспера: казнить за предательство или пощадить как союзника',
            completed: false,
            targetX: 0,
            targetZ: -400,
            radius: 6,
          },
        ],
        xpReward: 900,
        goldReward: 600,
        itemReward: 'mythic_dusk_fangs',
      },
      {
        id: 'quest_dawn_valdmark',
        title: 'Поход на Север IV: «Рассвет над Вальдмарком» (Финал)',
        giver: 'Грандмастер Веспер / Алтарь Затмения',
        biome: 'Кратер Затмения и Зал Трона Пустоты',
        recommendedLevel: 8,
        description:
          'За северными вратами Чёрного Бастиона лежит выжженный Кратер Затмения — эпицентр раскола мира. Войдите в Зал Трона Пустоты, сокрушите трёхфазную Аватару Сердца Пустоты и примите финальное мировоззренческое решение о судьбе Вальдмарка.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q8_enter_crater',
            description: 'Пройти по обсидиановому мосту через реки багровой энергии в Кратер Затмения',
            completed: false,
            targetX: 0,
            targetZ: -468,
            radius: 6,
          },
          {
            id: 'q8_kill_avatar',
            description: 'Сокрушить финального архибосса — «Аватару Сердца Пустоты» у расколотого Трона',
            completed: false,
            targetX: 0,
            targetZ: -505,
            radius: 10,
          },
          {
            id: 'q8_final_choice',
            description: 'Принять решение у Алтаря Затмения: Уничтожить Сердце, Поглотить мощь или Передать фракции',
            completed: false,
            targetX: 0,
            targetZ: -518,
            radius: 6,
          },
        ],
        xpReward: 1500,
        goldReward: 1000,
        itemReward: 'mythic_void_voice',
      },

      // =======================================================================
      // 4 НЕЛИНЕЙНЫХ КВЕСТА-РАССЛЕДОВАНИЯ (ДЕТЕКТИВНЫЕ ИСТОРИИ И ПОСЛЕДСТВИЯ)
      // =======================================================================
      {
        id: 'quest_blood_belltower',
        title: 'Расследование I: «Кровь на колокольне»',
        giver: 'Староста Бран / Дозорный Ворон',
        biome: 'Деревня Воронья Падь',
        recommendedLevel: 2,
        isInvestigationQuest: true,
        description:
          'По ночам у старой колокольни Вороньей Пади находят растерзанных жителей. Толпа готова линчевать ручного волка травницы или бродячего артиста. Проведите расследование с «Чутьём Охотника» [V], изучите улики на крыше, допросите подозреваемых и раскройте страшную тайну семьи кузнеца Торна.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q_bell_corpse',
            description: 'Осмотреть раны жертвы у подножия старой колокольни с Чутьём Охотника [V]',
            completed: false,
            targetX: -9,
            targetZ: -9,
            radius: 4.5,
          },
          {
            id: 'q_bell_roof_tracks',
            description: 'Изучить следы когтей и обрывок кузнечного передника на балке у колокольни',
            completed: false,
            targetX: -12,
            targetZ: -13,
            radius: 4.5,
          },
          {
            id: 'q_bell_interrogate',
            description: 'Допросить подозреваемых и вывести на чистую воду Хельгу, жену кузнеца Торна',
            completed: false,
            targetX: 11.5,
            targetZ: 8.2,
            radius: 4.5,
          },
          {
            id: 'q_bell_verdict',
            description: 'Принять решение: Казнить Хельгу по закону / Провести ритуал очищения / Обвинить чужака',
            completed: false,
            targetX: 11.5,
            targetZ: 8.2,
            radius: 4.5,
          },
        ],
        xpReward: 280,
        goldReward: 180,
      },
      {
        id: 'quest_feast_of_ravens',
        title: 'Расследование II: «Пир Воронов»',
        giver: 'Лорд Эдгар Вейн',
        biome: 'Заброшенное поместье в Топях',
        recommendedLevel: 5,
        isInvestigationQuest: true,
        description:
          'Аристократ лорд Эдгар Вейн приглашает Корвуса снять проклятие с его родового поместья в Топях, где каждый вечер за столом пируют знатные гости. Проведите расследование с «Чутьём Охотника» [V] и узнайте, какой ценой лорд удерживает рядом свою погибшую семью.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q_feast_talk_vane',
            description: 'Встретиться с лордом Эдгаром Вейном у ворот поместья в Затопленных Топях',
            completed: false,
            targetX: 25,
            targetZ: -160,
            radius: 5,
          },
          {
            id: 'q_feast_inspect_table',
            description: 'Осмотреть пиршественный стол поместья с Чутьём Охотника [V] и разоблачить иллюзию',
            completed: false,
            targetX: 30,
            targetZ: -166,
            radius: 5,
          },
          {
            id: 'q_feast_inspect_cellar',
            description: 'Исследовать люк в подвал поместья, куда лорд Вейн сбрасывает путников',
            completed: false,
            targetX: 33,
            targetZ: -171,
            radius: 5,
          },
          {
            id: 'q_feast_choice',
            description: 'Решить судьбу поместья у лорда Вейна: Сжечь иллюзии и дать бой ИЛИ принять сделку',
            completed: false,
            targetX: 25,
            targetZ: -160,
            radius: 5,
          },
        ],
        xpReward: 350,
        goldReward: 220,
        itemReward: 'relic_blade',
      },
      {
        id: 'quest_dead_mines_oath',
        title: 'Расследование III: «Клятва в Мёртвых Шахтах»',
        giver: 'Капитан Ордена Валлен / Старейшина Торос',
        biome: 'Среброзубый Перевал и Мёртвые Шахты',
        recommendedLevel: 6,
        isInvestigationQuest: true,
        description:
          'В заблокированном штреке Мёртвых Шахт выжившие горняки мутировали в полуразумных гулей из-за Чёрной Руды, но не нападают первыми и защищают своего ребёнка. Снаружи отряд Ордена требует перебить их всех. Выберите, чью клятву защитить.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q_mines_talk_captain',
            description: 'Выслушать ультиматум капитана Ордена Валлена у заблокированного штрека Перевала',
            completed: false,
            targetX: -18,
            targetZ: -268,
            radius: 5,
          },
          {
            id: 'q_mines_inspect_barricade',
            description: 'Изучить баррикаду горняков с Чутьём Охотника [V] и услышать голоса внутри',
            completed: false,
            targetX: -22,
            targetZ: -275,
            radius: 5,
          },
          {
            id: 'q_mines_choice',
            description: 'Поговорить со старейшиной горняков-гулей Торосом и выбрать сторону конфликта',
            completed: false,
            targetX: -26,
            targetZ: -281,
            radius: 5,
          },
        ],
        xpReward: 380,
        goldReward: 240,
      },
      {
        id: 'quest_last_ash_exam',
        title: 'Расследование IV: «Последний Экзамен Зольника»',
        giver: 'Младший адепт Эриан',
        biome: 'Чёрный Бастион Братства Пепла',
        recommendedLevel: 7,
        isInvestigationQuest: true,
        description:
          'В руинах Чёрного Бастиона Корвус находит выжившего молодого ученика Эриана, который умоляет провести над ним смертельно опасный ритуал «Тлеющей Крови», чтобы отомстить за павших братьев. Соберите мутагены, проведите ритуал и решите будущее Школы Ворона.',
        status: 'available',
        currentStageIndex: 0,
        stages: [
          {
            id: 'q_exam_talk_erian',
            description: 'Поговорить с выжившим младшим адептом Эрианом в западном крыле Бастиона',
            completed: false,
            targetX: -16,
            targetZ: -365,
            radius: 5,
          },
          {
            id: 'q_exam_collect_mutagens',
            description: 'Отыскать с Чутьём Охотника [V] уцелевшие мутагены «Тлеющей Крови» в реликвариуме',
            completed: false,
            targetX: -21,
            targetZ: -372,
            radius: 5,
          },
          {
            id: 'q_exam_ritual_choice',
            description: 'Провести ритуал у алхимического стола и решить судьбу секретов Братства Пепла',
            completed: false,
            targetX: -18,
            targetZ: -378,
            radius: 5,
          },
        ],
        xpReward: 450,
        goldReward: 260,
      },
    ];
  }

  public applyChoiceConsequenceToQuest(
    questId: string,
    choiceId: string,
    consequenceTitle: string,
    consequenceSummary: string,
    consequenceWorldEffect: string
  ): Quest | null {
    const q = this.quests.find((item) => item.id === questId);
    if (!q) return null;
    q.choiceTaken = choiceId;
    q.consequenceTitle = consequenceTitle;
    q.consequenceSummary = consequenceSummary;
    q.consequenceWorldEffect = consequenceWorldEffect;
    q.status = 'completed';
    q.stages = q.stages.map((s) => ({ ...s, completed: true }));
    return q;
  }

  public getActiveQuest(): Quest | null {
    return (
      this.quests.find((q) => q.id === this.activeQuestId) ??
      this.quests.find((q) => q.status === 'active') ??
      null
    );
  }

  public setActiveQuest(questId: string): void {
    const q = this.quests.find((item) => item.id === questId);
    if (q) {
      if (q.status === 'available' || q.status === 'locked') q.status = 'active';
      this.activeQuestId = questId;
    }
  }

  public activateQuest(questId: string): void {
    this.setActiveQuest(questId);
  }

  public acceptContract(contractId: string): HunterContract | null {
    const c = this.contracts.find((item) => item.id === contractId);
    if (!c) return null;
    if (c.status === 'available') {
      c.status = 'tracking';
    }
    return c;
  }

  public advanceContractClue(contractId: string): {
    contract: HunterContract | null;
    readyToSpawnBoss: boolean;
  } {
    const c = this.contracts.find((item) => item.id === contractId);
    if (!c || c.status === 'completed') {
      return { contract: c ?? null, readyToSpawnBoss: false };
    }
    if (c.status === 'available') {
      c.status = 'tracking';
    }
    if (c.cluesFound < c.cluesRequired) {
      c.cluesFound += 1;
    }
    if (c.cluesFound >= c.cluesRequired && c.status === 'tracking') {
      c.status = 'boss_spawned';
      return { contract: c, readyToSpawnBoss: true };
    }
    return { contract: c, readyToSpawnBoss: false };
  }

  public completeContract(contractId: string): HunterContract | null {
    const c = this.contracts.find((item) => item.id === contractId);
    if (!c || c.status === 'completed') return null;
    c.status = 'completed';
    return c;
  }

  public completeStage(
    questId: string,
    stageId: string
  ): { stageCompleted: boolean; questCompleted: boolean; quest: Quest | null } {
    return this.triggerStage(questId, stageId);
  }

  public triggerStage(
    questId: string,
    stageId: string
  ): { stageCompleted: boolean; questCompleted: boolean; quest: Quest | null } {
    const idx = this.quests.findIndex((q) => q.id === questId);
    if (idx === -1) {
      return { stageCompleted: false, questCompleted: false, quest: null };
    }

    const q = this.quests[idx];
    if (q.status === 'available') {
      q.status = 'active';
    }

    const res = advanceQuestStage(q, stageId);
    this.quests[idx] = res.updatedQuest;

    if (res.questCompleted) {
      const nextActive = this.quests.find((other) => other.status === 'active');
      if (nextActive) {
        this.activeQuestId = nextActive.id;
      } else {
        const nextAvail = this.quests.find((other) => other.status === 'available');
        if (nextAvail) {
          nextAvail.status = 'active';
          this.activeQuestId = nextAvail.id;
        }
      }
    }

    return {
      stageCompleted: res.stageCompleted,
      questCompleted: res.questCompleted,
      quest: this.quests[idx],
    };
  }
}
