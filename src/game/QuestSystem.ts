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
    ];
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
