extends Node

## QuestManager Autoload Singleton
## Manages all 12 story/investigation quests and 3 Hunter Contracts with strict stage prerequisite checks
## and computes 3D quest indicator states ("exclamation" ! vs "question" ?) for NPCs and Notice Boards.

signal quests_updated()
signal quest_completed(quest_id: String)

var active_quest_id: String = "quest_missing_hunters"
var quests: Array[Dictionary] = []
var contracts: Array[Dictionary] = []

func _ready() -> void:
	_init_quests()
	_init_contracts()

func _init_quests() -> void:
	quests = [
		{
			"id": "quest_missing_hunters",
			"title_ru": "Пропавшие охотники Вороньей Пади",
			"title_en": "Missing Hunters of Crow's Hollow",
			"giver": "Староста Бран",
			"biome": "Воронья Падь / Старый Лес",
			"status": "active",
			"current_stage_index": 0,
			"xp_reward": 180,
			"gold_reward": 95,
			"stages": [
				{"id": "q1_talk_elder", "desc_ru": "Поговорить со старостой Браном у колодца", "desc_en": "Speak with Elder Bran near the well", "completed": false, "target": Vector3(-6, 0, -4)},
				{"id": "q1_find_tracks", "desc_ru": "Изучить кровавые следы у кромки Старого леса с Чутьём [V]", "desc_en": "Inspect the bloody tracks at the Old Forest edge with Hunter Sense [V]", "completed": false, "target": Vector3(-18, 0, 10)},
				{"id": "q1_inspect_camp", "desc_ru": "Осмотреть разгромленную повозку охотников", "desc_en": "Examine the wrecked hunters' cart", "completed": false, "target": Vector3(-33, 0, 17)},
				{"id": "q1_kill_ghouls", "desc_ru": "Истребить стаю трупоедов-упырей у лагеря", "desc_en": "Slay the pack of ghouls near the camp", "completed": false, "target": Vector3(-35, 0, 22)},
				{"id": "q1_return_elder", "desc_ru": "Вернуться к старосте Брану за наградой", "desc_en": "Return to Elder Bran for your reward", "completed": false, "target": Vector3(-6, 0, -4)},
			]
		},
		{
			"id": "quest_swamp_whisper",
			"title_ru": "Шёпот болота",
			"title_en": "Whisper of the Swamp",
			"giver": "Травница Марфа",
			"biome": "Проклятое Святилище",
			"status": "available",
			"current_stage_index": 0,
			"xp_reward": 240,
			"gold_reward": 140,
			"stages": [
				{"id": "q2_inspect_clue_1", "desc_ru": "Изучить рунный обелиск у входа в Святилище", "desc_en": "Inspect the runic obelisk at the Sanctuary entrance", "completed": false, "target": Vector3(-54, 0, -46)},
				{"id": "q2_inspect_clue_2", "desc_ru": "Исследовать жертвенные скрижали", "desc_en": "Examine the sacrificial tablets", "completed": false, "target": Vector3(-62, 0, -58)},
				{"id": "q2_kill_hag", "desc_ru": "Сразить Болотную ведьму у алтаря", "desc_en": "Defeat the Swamp Hag by the altar", "completed": false, "target": Vector3(-64, 0, -54)},
				{"id": "q2_artifact_choice", "desc_ru": "Решить судьбу Проклятого Артефакта на Алтаре", "desc_en": "Decide the fate of the Cursed Artifact at the Altar", "completed": false, "target": Vector3(-65, 0, -55)},
			]
		},
		{
			"id": "quest_ancient_king",
			"title_ru": "Сердце древнего короля",
			"title_en": "Heart of the Ancient King",
			"giver": "Кузнец Торн",
			"biome": "Разрушенная Крепость",
			"status": "available",
			"current_stage_index": 0,
			"xp_reward": 320,
			"gold_reward": 210,
			"stages": [
				{"id": "q3_reach_fortress", "desc_ru": "Осмотреть врата Разрушенной Крепости", "desc_en": "Inspect the gates of the Ruined Fortress", "completed": false, "target": Vector3(48, 0, -46)},
				{"id": "q3_kill_demon", "desc_ru": "Победить Лесного Демона (Лешего)", "desc_en": "Defeat the Ancient Leshen", "completed": false, "target": Vector3(58, 0, -58)},
				{"id": "q3_kill_boss", "desc_ru": "Сокрушить Древнего Королевского Стража", "desc_en": "Vanquish the Ancient Royal Guardian", "completed": false, "target": Vector3(72, 0, -70)},
			]
		},
		{
			"id": "quest_blood_belltower",
			"title_ru": "Расследование I: «Кровь на колокольне»",
			"title_en": "Investigation I: Blood on the Belltower",
			"giver": "Стражник Дозора / Староста Бран",
			"biome": "Воронья Падь",
			"status": "available",
			"current_stage_index": 0,
			"xp_reward": 260,
			"gold_reward": 160,
			"stages": [
				{"id": "q_bell_corpse", "desc_ru": "Осмотреть раны жертвы у колокольни с Чутьём [V]", "desc_en": "Examine the victim's wounds at the belltower with Hunter Sense [V]", "completed": false, "target": Vector3(-9, 0, -9)},
				{"id": "q_bell_roof_tracks", "desc_ru": "Изучить обрывок кузнечного передника у балок", "desc_en": "Inspect the torn blacksmith apron by the beams", "completed": false, "target": Vector3(-12, 0, -13)},
				{"id": "q_bell_interrogate", "desc_ru": "Допросить подозреваемых (Травницу Марфу, Барда или Кузнеца Торна)", "desc_en": "Interrogate the suspects in the village", "completed": false, "target": Vector3(10, 0, 6)},
				{"id": "q_bell_verdict", "desc_ru": "Вынести вердикт Хельге у кузницы", "desc_en": "Deliver your verdict to Helga by the forge", "completed": false, "target": Vector3(11.5, 0, 8.2)},
			]
		}
	]

func _init_contracts() -> void:
	contracts = [
		{
			"id": "contract_werewolf",
			"title_ru": "Контракт: «Вой в ночи» (Альфа-Волколак)",
			"title_en": "Contract: Howl in the Night (Alpha Werewolf)",
			"biome": "Старый Лес",
			"status": "available", # "available" | "tracking" | "boss_spawned" | "completed"
			"clues_found": 0,
			"clues_required": 3,
			"reward_gold": 180,
			"reward_xp": 220,
		},
		{
			"id": "contract_noonwraith",
			"title_ru": "Контракт: «Невеста у колодца» (Полуденница)",
			"title_en": "Contract: Bride by the Well (Noonwraith)",
			"biome": "Восточный хутор",
			"status": "available",
			"clues_found": 0,
			"clues_required": 3,
			"reward_gold": 210,
			"reward_xp": 250,
		},
		{
			"id": "contract_gargoyle",
			"title_ru": "Контракт: «Каменный жнец» (Древняя Горгулья)",
			"title_en": "Contract: Stone Reaper (Ancient Gargoyle)",
			"biome": "Руины Крепости",
			"status": "available",
			"clues_found": 0,
			"clues_required": 3,
			"reward_gold": 260,
			"reward_xp": 300,
		}
	]

func get_quest_by_id(quest_id: String) -> Dictionary:
	for q in quests:
		if str(q.get("id", "")) == quest_id:
			return q
	return {}

func get_contract_by_id(contract_id: String) -> Dictionary:
	for c in contracts:
		if str(c.get("id", "")) == contract_id:
			return c
	return {}

func get_active_quest() -> Dictionary:
	var q := get_quest_by_id(active_quest_id)
	if not q.is_empty():
		return q
	for item in quests:
		if str(item.get("status", "")) == "active":
			return item
	return {}

func activate_quest(quest_id: String) -> void:
	for q in quests:
		if str(q.get("id", "")) == quest_id:
			if str(q.get("status", "")) == "available":
				q["status"] = "active"
			active_quest_id = quest_id
			quests_updated.emit()
			GameState.hud_updated.emit()
			return

## Strictly enforces ordered stage completion: stage_id must match the current active stage index!
func complete_stage(quest_id: String, stage_id: String) -> Dictionary:
	var q := get_quest_by_id(quest_id)
	if q.is_empty() or str(q.get("status", "")) == "completed":
		return {"stage_completed": false, "quest_completed": false}

	var stages: Array = q.get("stages", [])
	var cur_idx: int = int(q.get("current_stage_index", 0))
	if cur_idx < 0 or cur_idx >= stages.size():
		return {"stage_completed": false, "quest_completed": false}

	var cur_stage: Dictionary = stages[cur_idx]
	# Prevent completing stages out of order
	if str(cur_stage.get("id", "")) != stage_id:
		return {"stage_completed": false, "quest_completed": false}

	if str(q.get("status", "")) == "available" and cur_idx == 0:
		q["status"] = "active"

	cur_stage["completed"] = true
	var next_idx := cur_idx + 1
	var is_quest_done := next_idx >= stages.size()

	if is_quest_done:
		q["status"] = "completed"
		q["current_stage_index"] = stages.size() - 1
		GameState.award_xp_and_gold(int(q.get("xp_reward", 150)), int(q.get("gold_reward", 100)))
		AudioManager.play_sfx("quest_complete")
		GameState.show_banner(
			"Задание выполнено: %s" % str(q.get("title_ru", "")),
			"+%d XP · +%d крон" % [int(q.get("xp_reward", 150)), int(q.get("gold_reward", 100))]
		)
		quest_completed.emit(quest_id)
	else:
		q["current_stage_index"] = next_idx
		AudioManager.play_sfx("quest_step")
		var next_stage: Dictionary = stages[next_idx]
		GameState.add_log("Обновлена цель: %s" % str(next_stage.get("desc_ru", "")), "quest")

	quests_updated.emit()
	GameState.hud_updated.emit()
	return {"stage_completed": true, "quest_completed": is_quest_done}

func accept_contract(contract_id: String) -> bool:
	var c := get_contract_by_id(contract_id)
	if c.is_empty() or str(c.get("status", "")) != "available":
		return false
	c["status"] = "tracking"
	AudioManager.play_sfx("quest_step")
	GameState.show_banner(str(c.get("title_ru", "")), "Исследуйте 3 улики в регионе «%s»" % str(c.get("biome", "")))
	quests_updated.emit()
	GameState.hud_updated.emit()
	return true

## Returns "exclamation" (!), "question" (?), or "none" for 3D overhead indicators
func get_actor_indicator_state(actor_id: String) -> String:
	if actor_id == "notice_board_village":
		for c in contracts:
			if str(c.get("status", "")) == "available":
				return "exclamation"
		return "none"

	if actor_id == "npc_elder":
		var q1 := get_quest_by_id("quest_missing_hunters")
		if q1.is_empty() or str(q1.get("status", "")) == "completed":
			return "none"
		var idx := int(q1.get("current_stage_index", 0))
		if idx == 4:
			return "question"
		if idx == 0:
			return "exclamation"
		return "none"

	if actor_id == "npc_herbalist":
		var q2 := get_quest_by_id("quest_swamp_whisper")
		var q_bell := get_quest_by_id("quest_blood_belltower")
		if not q_bell.is_empty() and str(q_bell.get("status", "")) == "active" and int(q_bell.get("current_stage_index", 0)) == 2:
			return "question"
		if not q2.is_empty() and str(q2.get("status", "")) == "available":
			return "exclamation"
		return "none"

	if actor_id == "npc_blacksmith":
		var q3 := get_quest_by_id("quest_ancient_king")
		var q_bell := get_quest_by_id("quest_blood_belltower")
		if not q_bell.is_empty() and str(q_bell.get("status", "")) == "active" and int(q_bell.get("current_stage_index", 0)) == 2:
			return "question"
		if not q3.is_empty() and str(q3.get("status", "")) == "available":
			return "exclamation"
		return "none"

	if actor_id == "npc_guard":
		var q_bell := get_quest_by_id("quest_blood_belltower")
		if not q_bell.is_empty() and str(q_bell.get("status", "")) == "available":
			return "exclamation"
		return "none"

	if actor_id == "npc_belltower_helga":
		var q_bell := get_quest_by_id("quest_blood_belltower")
		if not q_bell.is_empty() and str(q_bell.get("status", "")) == "active" and int(q_bell.get("current_stage_index", 0)) == 3:
			return "question"
		return "none"

	if actor_id == "shrine_cursed_altar":
		var q2 := get_quest_by_id("quest_swamp_whisper")
		if not q2.is_empty() and str(q2.get("status", "")) == "active" and int(q2.get("current_stage_index", 0)) == 3:
			return "question"
		return "none"

	return "none"

func serialize_quests() -> Dictionary:
	return {
		"active_quest_id": active_quest_id,
		"quests": quests,
		"contracts": contracts,
	}

func deserialize_quests(data: Dictionary) -> void:
	if data.has("active_quest_id"):
		active_quest_id = str(data["active_quest_id"])
	if data.has("quests") and data["quests"] is Array:
		quests.assign(data["quests"])
	if data.has("contracts") and data["contracts"] is Array:
		contracts.assign(data["contracts"])
	quests_updated.emit()
