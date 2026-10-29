extends Control

## Main Menu Controller with Medieval Codex Styling, Language Switcher (RU/EN), and Full Settings Modal

@onready var header_label: Label = %HeaderLabel
@onready var subtitle_label: Label = %SubtitleLabel
@onready var title_label: Label = %TitleLabel
@onready var desc_label: Label = %DescLabel
@onready var start_btn: Button = %StartHuntButton
@onready var quick_start_btn: Button = %QuickStartButton
@onready var settings_btn: Button = %SettingsButton
@onready var exit_btn: Button = %ExitButton
@onready var lang_ru_btn: Button = %LangRuButton
@onready var lang_en_btn: Button = %LangEnButton
@onready var settings_modal: PanelContainer = %SettingsModal
@onready var master_slider: HSlider = %MasterVolumeSlider
@onready var music_slider: HSlider = %MusicVolumeSlider
@onready var sfx_slider: HSlider = %SfxVolumeSlider
@onready var close_settings_btn: Button = %CloseSettingsButton

func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	start_btn.pressed.connect(_on_start_pressed)
	quick_start_btn.pressed.connect(_on_start_pressed)
	settings_btn.pressed.connect(_on_settings_pressed)
	exit_btn.pressed.connect(_on_exit_pressed)
	lang_ru_btn.pressed.connect(func(): _set_language("ru"))
	lang_en_btn.pressed.connect(func(): _set_language("en"))
	close_settings_btn.pressed.connect(func(): settings_modal.visible = false)

	master_slider.value = float(GameState.settings.get("master_volume", 0.75)) * 100.0
	music_slider.value = float(GameState.settings.get("music_volume", 0.65)) * 100.0
	sfx_slider.value = float(GameState.settings.get("sfx_volume", 0.85)) * 100.0

	master_slider.value_changed.connect(func(v: float): GameState.update_settings({"master_volume": v / 100.0}))
	music_slider.value_changed.connect(func(v: float): GameState.update_settings({"music_volume": v / 100.0}))
	sfx_slider.value_changed.connect(func(v: float): GameState.update_settings({"sfx_volume": v / 100.0}))

	GameState.settings_changed.connect(_refresh_texts)
	_refresh_texts()
	start_btn.grab_focus()

func _set_language(lang: String) -> void:
	GameState.update_settings({"language": lang})
	_refresh_texts()

func _refresh_texts() -> void:
	header_label.text = GameState.tr_key("title.header")
	subtitle_label.text = GameState.tr_key("title.subtitle")
	title_label.text = GameState.tr_key("title.main")
	desc_label.text = GameState.tr_key("title.desc")
	start_btn.text = GameState.tr_key("title.startHunt")
	quick_start_btn.text = GameState.tr_key("title.quickStart")
	settings_btn.text = "⚙ " + GameState.tr_key("title.settings")
	exit_btn.text = GameState.tr_key("title.exit")
	close_settings_btn.text = GameState.tr_key("settings.close")

func _on_start_pressed() -> void:
	AudioManager.play_sfx("quest_step")
	get_tree().change_scene_to_file("res://scenes/world.tscn")

func _on_settings_pressed() -> void:
	AudioManager.play_sfx("equip")
	settings_modal.visible = not settings_modal.visible

func _on_exit_pressed() -> void:
	get_tree().quit()
