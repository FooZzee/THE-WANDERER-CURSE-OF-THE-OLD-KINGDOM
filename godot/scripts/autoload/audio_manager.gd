extends Node

## AudioManager Autoload Singleton
## Synthesizes procedural SFX and dark medieval ambient drone via AudioStreamGenerator
## and applies Master / SFX / Music volume & mute settings from GameState.

var sfx_player: AudioStreamPlayer
var music_player: AudioStreamPlayer
var master_volume: float = 0.75
var sfx_volume: float = 0.85
var music_volume: float = 0.65
var audio_enabled: bool = true
var music_enabled: bool = true

func _ready() -> void:
	sfx_player = AudioStreamPlayer.new()
	sfx_player.name = "SFXPlayer"
	add_child(sfx_player)

	music_player = AudioStreamPlayer.new()
	music_player.name = "MusicPlayer"
	add_child(music_player)

	apply_settings(GameState.settings)

func apply_settings(settings: Dictionary) -> void:
	audio_enabled = bool(settings.get("audio_enabled", true))
	music_enabled = bool(settings.get("music_enabled", true))
	master_volume = clampf(float(settings.get("master_volume", 0.75)), 0.0, 1.0)
	sfx_volume = clampf(float(settings.get("sfx_volume", 0.85)), 0.0, 1.0)
	music_volume = clampf(float(settings.get("music_volume", 0.65)), 0.0, 1.0)

	var master_idx := AudioServer.get_bus_index("Master")
	if master_idx >= 0:
		AudioServer.set_bus_mute(master_idx, not audio_enabled)
		var db := linear_to_db(maxf(0.0001, master_volume))
		AudioServer.set_bus_volume_db(master_idx, db)

func play_sfx(event_name: String) -> void:
	if not audio_enabled or sfx_volume <= 0.01:
		return
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = 22050.0
	gen.buffer_length = 0.25
	sfx_player.stream = gen
	sfx_player.volume_db = linear_to_db(maxf(0.001, sfx_volume * master_volume))
	sfx_player.play()

	var playback := sfx_player.get_stream_playback() as AudioStreamGeneratorPlayback
	if playback == null:
		return

	var base_freq := 320.0
	match event_name:
		"sword_swing":
			base_freq = 210.0
		"hit":
			base_freq = 145.0
		"sign_flame":
			base_freq = 260.0
		"sign_cast":
			base_freq = 440.0
		"quest_step":
			base_freq = 523.25
		"quest_complete":
			base_freq = 659.25
		"potion":
			base_freq = 392.0
		"equip":
			base_freq = 293.66

	var frames := mini(playback.get_frames_available(), 3600)
	for i in frames:
		var t := float(i) / gen.mix_rate
		var env := exp(-t * 14.0)
		var sample := sin(TAU * base_freq * t) * env * 0.35
		playback.push_frame(Vector2(sample, sample))
