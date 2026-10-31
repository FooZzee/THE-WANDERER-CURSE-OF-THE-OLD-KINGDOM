extends CharacterBody3D
class_name PlayerController

## 3D Player Controller for Corvus of the Ash Brotherhood
## Implements CharacterBody3D movement, sprint, dodge roll with i-frames, Steel/Silver sword switching,
## 5 Ash Magic Signs (with dynamic OmniLight3D on Flame), dynamic armor/weapon visuals, and SpringArm3D camera.

@export var walk_speed: float = 6.2
@export var sprint_speed: float = 9.8
@export var dodge_speed: float = 13.5
@export var rotation_speed: float = 10.0
@export var mouse_sensitivity: float = 0.0028

@onready var visual_root: Node3D = $VisualRoot
@onready var torso_mesh: MeshInstance3D = $VisualRoot/TorsoMesh
@onready var sword_mesh: MeshInstance3D = $VisualRoot/SwordPivot/SwordBlade
@onready var sword_pivot: Node3D = $VisualRoot/SwordPivot
@onready var camera_pivot: Node3D = $CameraPivot
@onready var spring_arm: SpringArm3D = $CameraPivot/SpringArm3D
@onready var camera: Camera3D = $CameraPivot/SpringArm3D/Camera3D
@onready var attack_area: Area3D = $VisualRoot/AttackArea
@onready var sign_light: OmniLight3D = $VisualRoot/SignOmniLight

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity", 9.8)
var dodge_timer: float = 0.0
var attack_cooldown: float = 0.0
var sign_light_timer: float = 0.0
var shake_intensity: float = 0.0
var shake_timer: float = 0.0
var mobile_move_vector: Vector2 = Vector2.ZERO
var nearby_interactable: Node3D = null

const SIGN_ORDER: Array[String] = ["flame", "barrier", "impulse", "illusion", "frost"]

func _ready() -> void:
	add_to_group("player")
	GameState.hud_updated.connect(_sync_equipment_visuals)
	_sync_equipment_visuals()
	if sign_light:
		sign_light.light_energy = 0.0

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		camera_pivot.rotate_y(-event.relative.x * mouse_sensitivity)
		spring_arm.rotation.x = clampf(
			spring_arm.rotation.x - event.relative.y * mouse_sensitivity,
			deg_to_rad(-55.0),
			deg_to_rad(15.0)
		)

	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_1:
				switch_sword("steel")
			KEY_2:
				switch_sword("silver")
			KEY_Q:
				cycle_magic_sign()
			KEY_R:
				cast_active_sign()
			KEY_SPACE:
				trigger_dodge()
			KEY_E:
				trigger_interact()
			KEY_F, KEY_H:
				GameState.drink_swallow_potion()
			KEY_V:
				GameState.hunter_vision_active = not GameState.hunter_vision_active
				GameState.hud_updated.emit()

	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			perform_sword_attack(false)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			perform_sword_attack(true)

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta

	if dodge_timer > 0.0:
		dodge_timer = maxf(0.0, dodge_timer - delta)
	if attack_cooldown > 0.0:
		attack_cooldown = maxf(0.0, attack_cooldown - delta)
		sword_pivot.rotation.x = lerpf(sword_pivot.rotation.x, 0.0, 12.0 * delta)

	# Dynamic Fire Sign OmniLight3D fade-out
	if sign_light_timer > 0.0 and sign_light:
		sign_light_timer = maxf(0.0, sign_light_timer - delta)
		sign_light.light_energy = (sign_light_timer / 0.55) * 4.5 + sin(Time.get_ticks_msec() * 0.03) * 0.35

	# Camera Shake
	if shake_timer > 0.0 and camera:
		shake_timer = maxf(0.0, shake_timer - delta)
		camera.h_offset = randf_range(-shake_intensity, shake_intensity)
		camera.v_offset = randf_range(-shake_intensity, shake_intensity)
	elif camera:
		camera.h_offset = 0.0
		camera.v_offset = 0.0

	var input_dir := _read_movement_input()
	var cam_basis := Basis(Vector3.UP, camera_pivot.rotation.y)
	var move_dir := (cam_basis * Vector3(input_dir.x, 0.0, input_dir.y)).normalized()

	var is_sprinting := Input.is_key_pressed(KEY_SHIFT) and float(GameState.player_stats["stamina"]) > 5.0
	var current_speed := dodge_speed if dodge_timer > 0.0 else (sprint_speed if is_sprinting else walk_speed)

	if is_sprinting and move_dir.length_squared() > 0.01:
		GameState.player_stats["stamina"] = maxf(0.0, float(GameState.player_stats["stamina"]) - 9.0 * delta)

	if move_dir.length_squared() > 0.01:
		velocity.x = move_dir.x * current_speed
		velocity.z = move_dir.z * current_speed
		var target_yaw := atan2(move_dir.x, move_dir.z)
		visual_root.rotation.y = lerp_angle(visual_root.rotation.y, target_yaw, rotation_speed * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, current_speed * 8.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, current_speed * 8.0 * delta)

	move_and_slide()

func _read_movement_input() -> Vector2:
	if mobile_move_vector.length_squared() > 0.01:
		return mobile_move_vector.limit_length(1.0)
	var dir := Vector2.ZERO
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		dir.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		dir.y += 1.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		dir.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		dir.x += 1.0
	return dir.normalized()

func switch_sword(sword_type: String) -> void:
	GameState.player_stats["active_sword"] = sword_type
	_sync_equipment_visuals()
	AudioManager.play_sfx("equip")
	GameState.add_log(
		"Выхвачен Серебряный меч [2] (100% урона по чудовищам)" if sword_type == "silver" else "Выхвачен Стальной меч [1] (100% урона по людям и зверям)",
		"info"
	)

func _sync_equipment_visuals() -> void:
	if torso_mesh:
		var armor_mat := StandardMaterial3D.new()
		var eq_armor := str(GameState.player_stats.get("equipped_armor_id", "armor_raven_school"))
		if eq_armor == "armor_bear_plate":
			armor_mat.albedo_color = Color(0.45, 0.28, 0.14)
			armor_mat.metallic = 0.65
			armor_mat.roughness = 0.35
		else:
			armor_mat.albedo_color = Color(0.16, 0.18, 0.24)
			armor_mat.metallic = 0.35
			armor_mat.roughness = 0.55
		torso_mesh.material_override = armor_mat

	if sword_mesh:
		var sword_mat := StandardMaterial3D.new()
		var active_sword := str(GameState.player_stats.get("active_sword", "steel"))
		if active_sword == "silver":
			sword_mat.albedo_color = Color(0.85, 0.93, 1.0)
			sword_mat.metallic = 0.95
			sword_mat.roughness = 0.15
			sword_mat.emission_enabled = true
			sword_mat.emission = Color(0.25, 0.65, 1.0) * 0.45
		else:
			sword_mat.albedo_color = Color(0.68, 0.72, 0.76)
			sword_mat.metallic = 0.85
			sword_mat.roughness = 0.28
		sword_mesh.material_override = sword_mat

func trigger_dodge() -> void:
	if dodge_timer > 0.0 or float(GameState.player_stats["stamina"]) < 18.0:
		return
	GameState.player_stats["stamina"] = float(GameState.player_stats["stamina"]) - 18.0
	dodge_timer = 0.38
	AudioManager.play_sfx("sword_swing")
	GameState.hud_updated.emit()

func perform_sword_attack(is_heavy: bool) -> void:
	if attack_cooldown > 0.0:
		return
	var stam_cost := 22.0 if is_heavy else 12.0
	if float(GameState.player_stats["stamina"]) < stam_cost:
		GameState.add_log("Недостаточно выносливости для удара!", "info")
		return

	GameState.player_stats["stamina"] = float(GameState.player_stats["stamina"]) - stam_cost
	attack_cooldown = 0.52 if is_heavy else 0.32
	sword_pivot.rotation.x = -1.25 if is_heavy else -0.85
	AudioManager.play_sfx("sword_swing")

	var active_sword := str(GameState.player_stats.get("active_sword", "steel"))
	var base_atk := int(GameState.player_stats.get("silver_attack" if active_sword == "silver" else "steel_attack", 22))
	if is_heavy:
		base_atk = int(round(float(base_atk) * 1.45))

	var is_crit := randf() < 0.15
	if is_crit:
		base_atk = int(round(float(base_atk) * 1.5))

	if attack_area:
		for body in attack_area.get_overlapping_bodies():
			if body.has_method("take_combat_damage"):
				body.call("take_combat_damage", base_atk, active_sword == "silver", is_crit)
				if is_crit:
					add_camera_shake(0.36 if is_heavy else 0.28, 0.30)
					trigger_mobile_haptic(85 if is_heavy else 65)
				else:
					add_camera_shake(0.18 if is_heavy else 0.08, 0.18 if is_heavy else 0.12)
	GameState.hud_updated.emit()

func cycle_magic_sign() -> void:
	var cur := str(GameState.player_stats.get("active_sign", "flame"))
	var idx := SIGN_ORDER.find(cur)
	var next_sign := SIGN_ORDER[(idx + 1) % SIGN_ORDER.size()]
	GameState.player_stats["active_sign"] = next_sign
	GameState.add_log("Выбран Знак Пепла: %s" % next_sign.to_upper(), "info")
	GameState.hud_updated.emit()

func cast_active_sign() -> void:
	if float(GameState.player_stats["stamina"]) < 30.0:
		GameState.add_log("Недостаточно выносливости для Знака Пепла!", "info")
		return
	GameState.player_stats["stamina"] = float(GameState.player_stats["stamina"]) - 30.0
	var sign_name := str(GameState.player_stats.get("active_sign", "flame"))

	if sign_name == "flame":
		AudioManager.play_sfx("sign_flame")
		if sign_light:
			sign_light.light_color = Color(1.0, 0.42, 0.08)
			sign_light.light_energy = 4.5
			sign_light_timer = 0.55
		if attack_area:
			for body in attack_area.get_overlapping_bodies():
				if body.has_method("take_combat_damage"):
					body.call("take_combat_damage", 34, true, true)
		GameState.add_log("Знак «Пламя» (Игнис) освещает тьму и опаляет врагов!", "damage")
	elif sign_name == "barrier":
		AudioManager.play_sfx("sign_cast")
		GameState.player_stats["barrier_shield"] = 60
		GameState.add_log("Знак «Барьер» активирован (Щит 60 ед.).", "info")
	else:
		AudioManager.play_sfx("sign_cast")
		if attack_area:
			for body in attack_area.get_overlapping_bodies():
				if body.has_method("take_combat_damage"):
					body.call("take_combat_damage", 24, true, false)
		GameState.add_log("Сотворён Знак «%s»!" % sign_name.to_upper(), "info")

	GameState.hud_updated.emit()

func take_player_damage(raw_damage: int) -> void:
	if dodge_timer > 0.0:
		GameState.add_log("Уклонение! Урон избежан.", "info")
		return
	var shield := int(GameState.player_stats.get("barrier_shield", 0))
	if shield > 0:
		var absorbed := mini(shield, raw_damage)
		GameState.player_stats["barrier_shield"] = shield - absorbed
		raw_damage -= absorbed
	if raw_damage <= 0:
		GameState.hud_updated.emit()
		return
	var defense := int(GameState.player_stats.get("defense", 8))
	var final_dmg := maxi(1, raw_damage - int(defense * 0.4))
	GameState.player_stats["hp"] = maxi(0, int(GameState.player_stats["hp"]) - final_dmg)
	var is_heavy_damage := (raw_damage >= 26 or final_dmg >= 22)
	if is_heavy_damage:
		add_camera_shake(0.38, 0.34)
		trigger_mobile_haptic(120)
	else:
		add_camera_shake(0.16, 0.18)
	AudioManager.play_sfx("hit")
	GameState.hud_updated.emit()

func add_camera_shake(intensity: float, duration: float) -> void:
	shake_intensity = maxf(shake_intensity, intensity)
	shake_timer = maxf(shake_timer, duration)

func trigger_mobile_haptic(duration_ms: int) -> void:
	var is_mobile := (
		OS.has_feature("mobile")
		or OS.has_feature("web_android")
		or OS.has_feature("web_ios")
		or DisplayServer.is_touchscreen_available()
		or str(GameState.settings.get("control_mode", "auto")) == "mobile"
	)
	if not is_mobile:
		return
	Input.vibrate_handheld(duration_ms)
	if OS.has_feature("web"):
		JavaScriptBridge.eval("if (typeof navigator !== 'undefined' && navigator.vibrate) { navigator.vibrate(%d); }" % duration_ms)

func trigger_interact() -> void:
	if nearby_interactable and is_instance_valid(nearby_interactable):
		if nearby_interactable.has_method("interact"):
			nearby_interactable.call("interact")

