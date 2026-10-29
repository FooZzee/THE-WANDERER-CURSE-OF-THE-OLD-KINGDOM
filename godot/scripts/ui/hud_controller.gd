extends CanvasLayer

## Medieval HUD & Dialogue Controller
## Features:
## - Typewriter effect on NPC dialogue text (visible_ratio animated over time)
## - Automatic PC vs Mobile touch controls detection
## - Customizable HUD visibility from Settings
## - Inventory, Quests & Notice Board modals

@onready var hp_bar: ProgressBar = %HpBar
@onready var stamina_bar: ProgressBar = %StaminaBar
@onready var toxicity_bar: ProgressBar = %ToxicityBar
@onready var sword_label: Label = %ActiveSwordLabel
@onready var sign_label: Label = %ActiveSignLabel
@onready var clock_weather_panel: PanelContainer = %ClockWeatherPanel
@onready var clock_label: Label = %ClockLabel
@onready var quest_panel: PanelContainer = %QuestTrackerPanel
@onready var quest_title_label: Label = %QuestTitleLabel
@onready var quest_stage_label: Label = %QuestStageLabel
@onready var interact_prompt: Label = %InteractPromptLabel
@onready var dialogue_panel: PanelContainer = %DialoguePanel
@onready var dialogue_speaker: Label = %DialogueSpeakerLabel
@onready var dialogue_text: RichTextLabel = %DialogueRichText
@onready var dialogue_options_box: VBoxContainer = %DialogueOptionsBox
@onready var mobile_controls: Control = %MobileTouchControls

var typewriter_speed: float = 42.0 # characters per second
var is_typing_dialogue: bool = false

func _ready() -> void:
	add_to_group("hud")
	GameState.hud_updated.connect(_refresh_hud)
	GameState.time_weather_changed.connect(_on_time_weather_updated)
	GameState.settings_changed.connect(_refresh_hud)
	dialogue_panel.visible = false
	_refresh_hud()

func _process(delta: float) -> void:
	if is_typing_dialogue and dialogue_panel.visible:
		var total_chars := maxi(1, dialogue_text.get_total_character_count())
		dialogue_text.visible_ratio = minf(
			1.0,
			dialogue_text.visible_ratio + (typewriter_speed / float(total_chars)) * delta
		)
		if dialogue_text.visible_ratio >= 1.0:
			is_typing_dialogue = false

func _refresh_hud() -> void:
	var stats := GameState.player_stats
	hp_bar.max_value = float(stats.get("max_hp", 150))
	hp_bar.value = float(stats.get("hp", 150))
	stamina_bar.max_value = float(stats.get("max_stamina", 100))
	stamina_bar.value = float(stats.get("stamina", 100))
	toxicity_bar.max_value = float(stats.get("max_toxicity", 100))
	toxicity_bar.value = float(stats.get("toxicity", 0))

	var active_sword := str(stats.get("active_sword", "steel"))
	sword_label.text = GameState.tr_key("hud.silver" if active_sword == "silver" else "hud.steel")
	sign_label.text = "🔥 Знак: %s [Q/R]" % str(stats.get("active_sign", "flame")).to_upper()

	# HUD Visibility customization
	var vis: Dictionary = GameState.settings.get("hud_visibility", {})
	clock_weather_panel.visible = bool(vis.get("clock_weather", true))
	quest_panel.visible = bool(vis.get("quest_tracker", true))

	# Active Quest Tracker
	var active_q := QuestManager.get_active_quest()
	if not active_q.is_empty():
		var is_en := (str(GameState.settings.get("language", "ru")) == "en")
		quest_title_label.text = str(active_q.get("title_en" if is_en else "title_ru", ""))
		var stages: Array = active_q.get("stages", [])
		var idx := int(active_q.get("current_stage_index", 0))
		if idx >= 0 and idx < stages.size():
			var st: Dictionary = stages[idx]
			quest_stage_label.text = "• " + str(st.get("desc_en" if is_en else "desc_ru", ""))

	# Auto-detect PC vs Mobile controls
	var platform := GameState.detect_resolved_platform()
	mobile_controls.visible = (platform == "mobile")

	# Interact Prompt
	var player := get_tree().get_first_node_in_group("player")
	if player and player.get("nearby_interactable") != null:
		interact_prompt.visible = true
		interact_prompt.text = GameState.tr_key("hud.interact")
	else:
		interact_prompt.visible = false

func _on_time_weather_updated(hour: float, current_weather: String) -> void:
	var h := int(floor(hour))
	var m := int(floor((hour - float(h)) * 60.0))
	clock_label.text = "%02d:%02d · %s" % [h, m, current_weather.to_upper()]

## Starts NPC dialogue with a typewriter effect on the spoken text
func start_dialogue(actor_id: String, dlg_data: Dictionary) -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	dialogue_panel.visible = true
	dialogue_speaker.text = "%s — %s" % [str(dlg_data.get("speaker", "")), str(dlg_data.get("role", ""))]
	dialogue_text.text = str(dlg_data.get("text", ""))
	dialogue_text.visible_ratio = 0.0
	is_typing_dialogue = true

	for child in dialogue_options_box.get_children():
		child.queue_free()

	var options: Array = dlg_data.get("options", [])
	for opt in options:
		var btn := Button.new()
		btn.text = str(opt.get("text", "Продолжить"))
		var action := str(opt.get("action", "close"))
		btn.pressed.connect(func(): _on_dialogue_option_selected(actor_id, action))
		dialogue_options_box.add_child(btn)

func _on_dialogue_option_selected(_actor_id: String, action: String) -> void:
	match action:
		"advance_q1_start":
			QuestManager.activate_quest("quest_missing_hunters")
			QuestManager.complete_stage("quest_missing_hunters", "q1_talk_elder")
		"complete_q1":
			QuestManager.complete_stage("quest_missing_hunters", "q1_return_elder")
		"start_q2":
			QuestManager.activate_quest("quest_swamp_whisper")
		"start_q3":
			QuestManager.activate_quest("quest_ancient_king")
		"start_belltower":
			QuestManager.activate_quest("quest_blood_belltower")
		"interrogate_belltower":
			QuestManager.complete_stage("quest_blood_belltower", "q_bell_interrogate")
		"complete_belltower":
			QuestManager.complete_stage("quest_blood_belltower", "q_bell_verdict")
		"heal_player":
			GameState.player_stats["hp"] = GameState.player_stats["max_hp"]
			GameState.player_stats["toxicity"] = 0.0
			AudioManager.play_sfx("potion")

	dialogue_panel.visible = false
	_refresh_hud()

func open_notice_board() -> void:
	for c in QuestManager.contracts:
		if str(c.get("status", "")) == "available":
			QuestManager.accept_contract(str(c.get("id", "")))
			return
	GameState.show_banner("Доска объявлений Вороньей Пади", "Все доступные охотничьи заказы уже приняты!")
