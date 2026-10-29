extends Node

## DialogueDatabase Autoload Singleton
## Provides branching medieval dialogues with quest stage conditions so players cannot complete quests early.

func get_dialogue_for_actor(actor_id: String) -> Dictionary:
	var lang: String = str(GameState.settings.get("language", "ru"))
	var is_en := (lang == "en")

	if actor_id == "npc_elder":
		var q1 := QuestManager.get_quest_by_id("quest_missing_hunters")
		var stage_idx := int(q1.get("current_stage_index", 0))
		var status := str(q1.get("status", "active"))
		var options: Array[Dictionary] = []

		if status != "completed" and stage_idx == 0:
			options.append({
				"text": "⚔️ [Accept Quest] Tell me where the hunters vanished." if is_en else "⚔️ [Начать расследование] Расскажи, где именно пропали охотники.",
				"action": "advance_q1_start"
			})
		if status == "active" and stage_idx == 4:
			options.append({
				"text": "🏆 [Turn in Quest] The ghouls at the cart are slain." if is_en else "🏆 [Сдать задание] Стая упырей у разбитой повозки уничтожена.",
				"action": "complete_q1"
			})
		options.append({
			"text": "Farewell, Elder Bran." if is_en else "До встречи, староста Бран.",
			"action": "close"
		})

		return {
			"speaker": "Elder Bran" if is_en else "Староста Бран",
			"role": "Headman of Crow's Hollow" if is_en else "Староста деревни Воронья Падь",
			"text": (
				"Amber eyes of an Ash Brother... Thank the Old Gods you arrived, Corvus! Three of our hunters went to the Old Forest edge and never returned. Follow their tracks with your Hunter Sense [V] before the ghouls devour what's left!"
				if is_en else
				"Янтарные глаза Зольника и два меча за спиной... Хвала Древним Богам, ты вовремя, Корвус! Трое наших ловчих ушли к кромке Старого леса и не вернулись. Отыщи их следы своим Чутьём [V] и истреби трупоедов, прежде чем мы все погибнем!"
			),
			"options": options
		}

	if actor_id == "npc_herbalist":
		var q2 := QuestManager.get_quest_by_id("quest_swamp_whisper")
		var q_bell := QuestManager.get_quest_by_id("quest_blood_belltower")
		var options: Array[Dictionary] = [
			{
				"text": "🌿 [Heal & Detoxify] Cleanse my wounds and blood." if is_en else "🌿 [Исцеление] Исцели мои раны и очисти кровь от токсинов.",
				"action": "heal_player"
			}
		]
		if str(q2.get("status", "available")) == "available":
			options.append({
				"text": "🔮 [Accept Quest: Whisper of the Swamp] What dark magic stirs in the Sanctuary?" if is_en else "🔮 [Взять квест «Шёпот болота»] Что за тьма сгущается в Святилище?",
				"action": "start_q2"
			})
		if str(q_bell.get("status", "")) == "active" and int(q_bell.get("current_stage_index", 0)) == 2:
			options.append({
				"text": "🔍 [Interrogate: Blood on the Belltower] Who came to you with the Night Hunger?" if is_en else "🔍 [Допрос «Кровь на колокольне»] Кто приходил к тебе с симптомами Ночного Голода?",
				"action": "interrogate_belltower"
			})
		options.append({
			"text": "Thank you, Marfa." if is_en else "Благодарю за травы, Марфа.",
			"action": "close"
		})
		return {
			"speaker": "Herbalist Marfa" if is_en else "Травница Марфа",
			"role": "Keeper of Herbs & Elixirs" if is_en else "Хранительница трав и эликсиров Вороньей Пади",
			"text": (
				"The bogs whisper at night, Corvus. An ancient altar in the Cursed Sanctuary feeds a Swamp Hag with black blood. If you go there, keep your Silver Sword and Swallow potion ready."
				if is_en else
				"Топи шепчутся по ночам, Корвус. Древний алтарь в Проклятом Святилище вытягивает соки из земли и питает Болотную ведьму. Если пойдёшь туда — держи Серебряный меч и эликсир «Ласточка» наготове."
			),
			"options": options
		}

	if actor_id == "npc_blacksmith":
		var q3 := QuestManager.get_quest_by_id("quest_ancient_king")
		var q_bell := QuestManager.get_quest_by_id("quest_blood_belltower")
		var options: Array[Dictionary] = []
		if str(q3.get("status", "available")) == "available":
			options.append({
				"text": "⚒️ [Accept Quest: Heart of the Ancient King] Tell me about the Ruined Fortress." if is_en else "⚒️ [Взять квест «Сердце древнего короля»] Расскажи о Разрушенной Крепости.",
				"action": "start_q3"
			})
		if str(q_bell.get("status", "")) == "active" and int(q_bell.get("current_stage_index", 0)) == 2:
			options.append({
				"text": "🔍 [Interrogate] We found your forge's apron at the belltower, Thorn." if is_en else "🔍 [Допрос «Кровь на колокольне»] У колокольни найден лоскут твоего передника, Торн.",
				"action": "interrogate_belltower"
			})
		options.append({
			"text": "Keep the forge burning, Master Thorn." if is_en else "Пусть горн не гаснет, мастер Торн.",
			"action": "close"
		})
		return {
			"speaker": "Blacksmith Thorn" if is_en else "Кузнец Торн (Гром)",
			"role": "Master Armorer of Valdmark" if is_en else "Мастер-оружейник Вороньей Пади",
			"text": (
				"Good steel for bandits and beasts, pure meteoric silver for cursed monsters! In the Ruined Fortress to the northeast, the Ancient Guardian still guards the royal armory."
				if is_en else
				"Добрая сталь — против разбойников и волков, чистое серебро — против нечисти и проклятых! В Разрушенной Крепости на северо-востоке Древний Страж до сих пор стережёт королевскую усыпальницу."
			),
			"options": options
		}

	if actor_id == "npc_guard":
		var q_bell := QuestManager.get_quest_by_id("quest_blood_belltower")
		var options: Array[Dictionary] = []
		if str(q_bell.get("status", "available")) == "available":
			options.append({
				"text": "🔍 [Accept Investigation: Blood on the Belltower] Show me the crime scene." if is_en else "🔍 [Начать расследование «Кровь на колокольне»] Доложи об убийстве у колокольни.",
				"action": "start_belltower"
			})
		options.append({
			"text": "Stay vigilant, guard." if is_en else "Несите службу зорко.",
			"action": "close"
		})
		return {
			"speaker": "Watchman of the Hollow" if is_en else "Стражник Дозора Пади",
			"role": "Village Militia" if is_en else "Ополчение Вальдмарка",
			"text": (
				"We keep our torches lit day and night, Wanderer. If a beast chases you from the woods, lure it to our gates — our halberds will back you up!"
				if is_en else
				"Мы держим факелы и алебарды наготове днём и ночью, Странник. Если лесная тварь погонится за тобой — веди её к воротам деревни, отобьёмся вместе!"
			),
			"options": options
		}

	if actor_id == "npc_belltower_helga":
		var q_bell := QuestManager.get_quest_by_id("quest_blood_belltower")
		var options: Array[Dictionary] = []
		if str(q_bell.get("status", "")) == "active" and int(q_bell.get("current_stage_index", 0)) == 3:
			options.append({
				"text": "🔥 [Cleanse with Ash Sign Ignis] Burn out the curse and save Helga!" if is_en else "🔥 [Провести ритуал очищения Знаком Пламени] Выжечь проклятие и спасти Хельгу!",
				"action": "complete_belltower"
			})
		options.append({
			"text": "I need more evidence first." if is_en else "Мне нужно сначала изучить все улики.",
			"action": "close"
		})
		return {
			"speaker": "Helga" if is_en else "Хельга, жена кузнеца Торна",
			"role": "Afflicted by the Night Hunger" if is_en else "Тайна «Крови на колокольне»",
			"text": (
				"Every midnight the bell rings in my skull and the Night Hunger takes my mind... Help me, Corvus, before I hurt someone else!"
				if is_en else
				"Каждую полночь колокол бьёт в моей голове, и Ночной Голод застилает разум... Помоги мне, Корвус, пока проклятие не погубило всю деревню!"
			),
			"options": options
		}

	return {
		"speaker": "Villager" if is_en else "Житель Вороньей Пади",
		"role": "Valdmark Valley" if is_en else "Долина Вальдмарк",
		"text": "May the Ash Brotherhood guide your blade." if is_en else "Пусть Братство Пепла хранит твой клинок, Странник.",
		"options": [{"text": "Farewell." if is_en else "Прощай.", "action": "close"}]
	}
