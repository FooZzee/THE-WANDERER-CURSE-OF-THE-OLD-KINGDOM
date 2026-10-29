extends Node

## Global GameState Autoload Singleton
## Manages player stats, equipped gear, time of day, weather, settings, RU/EN i18n, and Save/Load.

signal hud_updated()
signal time_weather_changed(hour: float, weather: String)
signal settings_changed()
signal log_added(message: String, category: String)
signal banner_triggered(title: String, subtitle: String)

const SAVE_PATH := "user://wanderer_save.json"

# Player Core & Derived Stats
var player_stats: Dictionary = {
	"level": 1,
	"xp": 0,
	"xp_to_next": 100,
	"hp": 150,
	"max_hp": 150,
	"stamina": 100.0,
	"max_stamina": 100.0,
	"toxicity": 0.0,
	"max_toxicity": 100.0,
	"gold": 120,
	"skill_points": 1,
	"reputation": 10,
	"steel_attack": 22,
	"silver_attack": 28,
	"defense": 10,
	"sign_intensity": 1.0,
	"active_sword": "steel",   # "steel" | "silver"
	"active_sign": "flame",    # "flame" | "barrier" | "impulse" | "illusion" | "frost"
	"barrier_shield": 0,
	"active_blade_oil": "none",
	"equipped_armor_id": "armor_raven_school",
	"equipped_steel_id": "steel_wolf_sword",
	"equipped_silver_id": "silver_ash_blade",
}

# World Atmosphere State
var time_of_day: float = 13.5      # 0.0 .. 24.0 hours
var time_scale: float = 0.15       # Game hours per real second
var weather: String = "clear"      # "clear" | "fog" | "rain"
var weather_timer: float = 55.0
var hunter_vision_active: bool = false

# Settings & HUD Customization
var settings: Dictionary = {
	"language": "ru",              # Default Russian ("ru" | "en")
	"control_mode": "auto",        # "auto" | "pc" | "mobile"
	"quality": "high",             # "low" | "medium" | "high"
	"shadows": true,
	"weather_effects": true,
	"audio_enabled": true,
	"music_enabled": true,
	"master_volume": 0.75,
	"sfx_volume": 0.85,
	"music_volume": 0.65,
	"hud_visibility": {
		"minimap_radar": true,
		"clock_weather": true,
		"quest_tracker": true,
		"reputation_bar": true,
		"combat_log": true,
		"controls_dock": true,
	}
}

# Inventory Items (Data-driven dictionaries compatible with ItemResource)
var inventory: Array[Dictionary] = [
	{
		"id": "steel_wolf_sword",
		"name_ru": "Стальной клинок Вольной Роты",
		"name_en": "Free Company Steel Blade",
		"category": "weapon",
		"equip_slot": "steelSword",
		"rarity": "common",
		"icon": "⚔️",
		"attack": 22,
		"defense": 0,
		"max_hp": 0,
		"value": 85,
		"quantity": 1,
		"equipped": true,
	},
	{
		"id": "silver_ash_blade",
		"name_ru": "Серебряный меч Братства Пепла",
		"name_en": "Ash Brotherhood Silver Sword",
		"category": "weapon",
		"equip_slot": "silverSword",
		"rarity": "rare",
		"icon": "🗡️",
		"attack": 28,
		"defense": 0,
		"max_hp": 0,
		"value": 160,
		"quantity": 1,
		"equipped": true,
	},
	{
		"id": "armor_raven_school",
		"name_ru": "Доспех Школы Ворона",
		"name_en": "Raven School Armor",
		"category": "armor",
		"equip_slot": "armor",
		"rarity": "rare",
		"icon": "🛡️",
		"attack": 0,
		"defense": 12,
		"max_hp": 30,
		"value": 140,
		"quantity": 1,
		"equipped": true,
	},
	{
		"id": "armor_bear_plate",
		"name_ru": "Тяжёлый Ламелляр Медведя",
		"name_en": "Heavy Bear Lamellar Plate",
		"category": "armor",
		"equip_slot": "armor",
		"rarity": "relic",
		"icon": "🥋",
		"attack": 0,
		"defense": 24,
		"max_hp": 65,
		"value": 280,
		"quantity": 1,
		"equipped": false,
	},
	{
		"id": "potion_swallow",
		"name_ru": "Эликсир «Ласточка»",
		"name_en": "Swallow Potion",
		"category": "potion",
		"equip_slot": "none",
		"rarity": "common",
		"icon": "🧪",
		"attack": 0,
		"defense": 0,
		"max_hp": 0,
		"value": 35,
		"quantity": 3,
		"equipped": false,
	},
	{
		"id": "herb_swallow",
		"name_ru": "Ласточкина трава",
		"name_en": "Celandine Herb",
		"category": "ingredient",
		"equip_slot": "none",
		"rarity": "common",
		"icon": "🌿",
		"attack": 0,
		"defense": 0,
		"max_hp": 0,
		"value": 12,
		"quantity": 4,
		"equipped": false,
	},
	{
		"id": "iron_ore",
		"name_ru": "Кованая железная руда",
		"name_en": "Forged Iron Ore",
		"category": "ingredient",
		"equip_slot": "none",
		"rarity": "common",
		"icon": "⛏️",
		"attack": 0,
		"defense": 0,
		"max_hp": 0,
		"value": 18,
		"quantity": 2,
		"equipped": false,
	}
]

var combat_log: Array[Dictionary] = []

const TRANSLATIONS: Dictionary = {
	"ru": {
		"title.header": "БРАТСТВО ПЕПЛА · КОДЕКС СТРАННИКА",
		"title.subtitle": "ТЁМНОЕ ФЭНТЕЗИ · 3D ACTION-RPG",
		"title.main": "Странник: Проклятие Старого Королевства",
		"title.desc": "Исследуйте долину Вальдмарк, сражайтесь сталью и серебром, применяйте 5 Знаков Пепла и раскройте тайну Ночи Затмения.",
		"title.startHunt": "Начать Охоту",
		"title.quickStart": "Быстрый старт",
		"title.settings": "Настройки",
		"title.exit": "Выход",
		"hud.hp": "Здоровье",
		"hud.stamina": "Выносливость",
		"hud.toxicity": "Токсичность",
		"hud.steel": "Стальной меч [1]",
		"hud.silver": "Серебряный меч [2]",
		"hud.quest": "Активное задание",
		"hud.interact": "[E] Взаимодействовать",
		"settings.title": "Настройки Игры и Интерфейса",
		"settings.language": "Язык интерфейса",
		"settings.audio": "Звук и Музыка",
		"settings.masterVol": "Общая громкость",
		"settings.musicVol": "Громкость музыки",
		"settings.sfxVol": "Громкость эффектов",
		"settings.controls": "Режим управления (Авто / ПК / Телефон)",
		"settings.hud": "Отображение элементов HUD",
		"settings.close": "Сохранить и закрыть",
	},
	"en": {
		"title.header": "BROTHERHOOD OF ASH · WANDERER CODEX",
		"title.subtitle": "DARK FANTASY · 3D ACTION-RPG",
		"title.main": "The Wanderer: Curse of the Old Kingdom",
		"title.desc": "Explore the valley of Valdmark, wield steel and silver, cast 5 Ash Signs, and uncover the mystery of the Eclipse Night.",
		"title.startHunt": "Start the Hunt",
		"title.quickStart": "Quick Start",
		"title.settings": "Settings",
		"title.exit": "Exit",
		"hud.hp": "Vitality",
		"hud.stamina": "Stamina",
		"hud.toxicity": "Toxicity",
		"hud.steel": "Steel Sword [1]",
		"hud.silver": "Silver Sword [2]",
		"hud.quest": "Active Quest",
		"hud.interact": "[E] Interact",
		"settings.title": "Game & Interface Settings",
		"settings.language": "Language",
		"settings.audio": "Sound & Music",
		"settings.masterVol": "Master Volume",
		"settings.musicVol": "Music Volume",
		"settings.sfxVol": "SFX Volume",
		"settings.controls": "Control Mode (Auto / PC / Mobile)",
		"settings.hud": "HUD Elements Visibility",
		"settings.close": "Save & Close",
	}
}

func _ready() -> void:
	recalculate_effective_stats()

func _process(delta: float) -> void:
	# Advance Day/Night cycle (0..24h)
	time_of_day = fmod(time_of_day + delta * time_scale, 24.0)
	if time_of_day < 0.0:
		time_of_day += 24.0

	# Dynamic Weather cycle
	weather_timer -= delta
	if weather_timer <= 0.0:
		weather_timer = 55.0
		cycle_weather()

	# Decay toxicity slowly and regenerate stamina
	if float(player_stats["toxicity"]) > 0.0:
		player_stats["toxicity"] = maxf(0.0, float(player_stats["toxicity"]) - 1.2 * delta)
	if float(player_stats["stamina"]) < float(player_stats["max_stamina"]):
		player_stats["stamina"] = minf(
			float(player_stats["max_stamina"]),
			float(player_stats["stamina"]) + 14.5 * delta
		)

	time_weather_changed.emit(time_of_day, weather)

func tr_key(key: String) -> String:
	var lang: String = str(settings.get("language", "ru"))
	var dict: Dictionary = TRANSLATIONS.get(lang, TRANSLATIONS["ru"])
	return str(dict.get(key, key))

func detect_resolved_platform() -> String:
	var mode: String = str(settings.get("control_mode", "auto"))
	if mode == "pc" or mode == "mobile":
		return mode
	if DisplayServer.is_touchscreen_available() or OS.has_feature("mobile") or OS.has_feature("web_android") or OS.has_feature("web_ios"):
		return "mobile"
	return "pc"

func cycle_weather() -> void:
	match weather:
		"clear":
			weather = "fog"
		"fog":
			weather = "rain"
		_:
			weather = "clear"
	add_log(
		"Погода изменилась: %s" % weather.to_upper() if settings["language"] == "ru" else "Weather changed: %s" % weather.to_upper(),
		"info"
	)
	time_weather_changed.emit(time_of_day, weather)
	hud_updated.emit()

func recalculate_effective_stats() -> void:
	var base_hp := 120
	var base_def := 6
	var steel_atk := 16
	var silver_atk := 20

	for item in inventory:
		if bool(item.get("equipped", false)):
			var slot := str(item.get("equip_slot", "none"))
			if slot == "armor":
				base_def += int(item.get("defense", 0))
				base_hp += int(item.get("max_hp", 0))
				player_stats["equipped_armor_id"] = str(item.get("id", ""))
			elif slot == "steelSword":
				steel_atk += int(item.get("attack", 0))
				player_stats["equipped_steel_id"] = str(item.get("id", ""))
			elif slot == "silverSword":
				silver_atk += int(item.get("attack", 0))
				player_stats["equipped_silver_id"] = str(item.get("id", ""))

	player_stats["max_hp"] = base_hp + (int(player_stats["level"]) - 1) * 15
	player_stats["hp"] = mini(int(player_stats["hp"]), int(player_stats["max_hp"]))
	player_stats["defense"] = base_def
	player_stats["steel_attack"] = steel_atk + (int(player_stats["level"]) - 1) * 3
	player_stats["silver_attack"] = silver_atk + (int(player_stats["level"]) - 1) * 4
	hud_updated.emit()

func toggle_equip_item(item_id: String) -> void:
	var target_slot := "none"
	for item in inventory:
		if str(item.get("id", "")) == item_id:
			target_slot = str(item.get("equip_slot", "none"))
			break
	if target_slot == "none":
		return

	for item in inventory:
		if str(item.get("equip_slot", "none")) == target_slot:
			item["equipped"] = (str(item.get("id", "")) == item_id)

	recalculate_effective_stats()
	AudioManager.play_sfx("equip")

func add_item_by_id(item_id: String, count: int = 1) -> void:
	for item in inventory:
		if str(item.get("id", "")) == item_id:
			item["quantity"] = int(item.get("quantity", 1)) + count
			hud_updated.emit()
			return
	inventory.append({
		"id": item_id,
		"name_ru": item_id,
		"name_en": item_id,
		"category": "ingredient",
		"equip_slot": "none",
		"rarity": "common",
		"icon": "📦",
		"attack": 0,
		"defense": 0,
		"max_hp": 0,
		"value": 25,
		"quantity": count,
		"equipped": false,
	})
	hud_updated.emit()

func drink_swallow_potion() -> bool:
	for item in inventory:
		if str(item.get("id", "")) == "potion_swallow" and int(item.get("quantity", 0)) > 0:
			if float(player_stats["toxicity"]) + 25.0 > float(player_stats["max_toxicity"]):
				add_log("Слишком высокая токсичность для приёма эликсира!", "damage")
				return false
			item["quantity"] = int(item["quantity"]) - 1
			player_stats["toxicity"] = float(player_stats["toxicity"]) + 25.0
			player_stats["hp"] = mini(int(player_stats["max_hp"]), int(player_stats["hp"]) + 65)
			AudioManager.play_sfx("potion")
			add_log("Выпит эликсир «Ласточка» (+65 ОЗ, +25 Токсичность).", "loot")
			hud_updated.emit()
			return true
	add_log("Эликсир «Ласточка» закончился! Сварите его у костра.", "info")
	return false

func award_xp_and_gold(xp_amount: int, gold_amount: int) -> void:
	player_stats["gold"] = int(player_stats["gold"]) + gold_amount
	player_stats["xp"] = int(player_stats["xp"]) + xp_amount
	while int(player_stats["xp"]) >= int(player_stats["xp_to_next"]):
		player_stats["xp"] = int(player_stats["xp"]) - int(player_stats["xp_to_next"])
		player_stats["level"] = int(player_stats["level"]) + 1
		player_stats["skill_points"] = int(player_stats["skill_points"]) + 1
		player_stats["xp_to_next"] = int(round(float(player_stats["xp_to_next"]) * 1.35))
		recalculate_effective_stats()
		player_stats["hp"] = player_stats["max_hp"]
		show_banner(
			"Новый уровень: %d!" % int(player_stats["level"]),
			"+1 Очко навыков · Характеристики увеличены"
		)
	hud_updated.emit()

func add_log(text: String, category: String = "info") -> void:
	combat_log.push_front({"text": text, "category": category})
	if combat_log.size() > 6:
		combat_log.resize(6)
	log_added.emit(text, category)
	hud_updated.emit()

func show_banner(title: String, subtitle: String) -> void:
	banner_triggered.emit(title, subtitle)

func update_settings(patch: Dictionary) -> void:
	for k in patch.keys():
		if k == "hud_visibility" and patch[k] is Dictionary:
			var cur_vis: Dictionary = settings.get("hud_visibility", {})
			for hk in patch[k].keys():
				cur_vis[hk] = patch[k][hk]
			settings["hud_visibility"] = cur_vis
		else:
			settings[k] = patch[k]
	AudioManager.apply_settings(settings)
	settings_changed.emit()
	hud_updated.emit()

func save_game() -> bool:
	var payload := {
		"version": 1,
		"player_stats": player_stats,
		"time_of_day": time_of_day,
		"weather": weather,
		"settings": settings,
		"inventory": inventory,
		"quests": QuestManager.serialize_quests(),
	}
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(payload, "\t"))
	file.close()
	add_log("Игра сохранена.", "info")
	return true

func load_game() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return false
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	file.close()
	if not (parsed is Dictionary):
		return false
	var data: Dictionary = parsed
	if data.has("player_stats"):
		player_stats.merge(data["player_stats"], true)
	if data.has("time_of_day"):
		time_of_day = float(data["time_of_day"])
	if data.has("weather"):
		weather = str(data["weather"])
	if data.has("settings"):
		update_settings(data["settings"])
	if data.has("quests"):
		QuestManager.deserialize_quests(data["quests"])
	recalculate_effective_stats()
	add_log("Сохранение загружено.", "info")
	return true
