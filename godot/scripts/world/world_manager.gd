extends Node3D
class_name WorldManager

## 3D World & Dynamic Lighting Manager (Day/Night Cycle + Weather + Procedural Terrain Chunks)

@onready var sun_light: DirectionalLight3D = $DirectionalLight3D
@onready var world_env: WorldEnvironment = $WorldEnvironment
@onready var rain_particles: GPUParticles3D = $RainParticles

func _ready() -> void:
	GameState.time_weather_changed.connect(_on_time_weather_changed)
	_on_time_weather_changed(GameState.time_of_day, GameState.weather)

func _on_time_weather_changed(hour: float, current_weather: String) -> void:
	if sun_light == null or world_env == null or world_env.environment == null:
		return

	# Rotate sun/moon across the sky according to 24h clock
	var day_progress := (hour - 6.0) / 24.0
	var sun_pitch := sin(day_progress * TAU) * 75.0
	sun_light.rotation_degrees = Vector3(-sun_pitch, -32.0, 0.0)

	var is_night := (hour < 5.5 or hour >= 20.5)
	var is_dusk_dawn := (hour >= 5.5 and hour < 7.5) or (hour >= 18.0 and hour < 20.5)

	var env := world_env.environment
	if is_night:
		sun_light.light_color = Color(0.42, 0.54, 0.85)
		sun_light.light_energy = 0.35
		env.ambient_light_color = Color(0.08, 0.11, 0.18)
		env.ambient_light_energy = 0.45
	elif is_dusk_dawn:
		sun_light.light_color = Color(1.0, 0.58, 0.32)
		sun_light.light_energy = 1.35
		env.ambient_light_color = Color(0.32, 0.22, 0.25)
		env.ambient_light_energy = 0.75
	else:
		sun_light.light_color = Color(1.0, 0.96, 0.88)
		sun_light.light_energy = 2.2
		env.ambient_light_color = Color(0.35, 0.42, 0.52)
		env.ambient_light_energy = 1.0

	# Weather adjustments
	if current_weather == "fog":
		env.fog_enabled = true
		env.fog_density = 0.028
		sun_light.light_energy *= 0.65
	elif current_weather == "rain":
		env.fog_enabled = true
		env.fog_density = 0.018
		sun_light.light_energy *= 0.5
	else:
		env.fog_enabled = true
		env.fog_density = 0.004

	if rain_particles:
		rain_particles.emitting = (current_weather == "rain") and bool(GameState.settings.get("weather_effects", true))
