extends CharacterBody3D
class_name EnemyAI

## 3D Enemy AI with FSM (IDLE, PATROL, CHASE, ATTACK, DEAD), silver/steel vulnerability,
## and automatic 60-second timed respawn for non-boss mobs.

@export var enemy_id: String = "ghoul_1"
@export var display_name_ru: String = "Трупоед-упырь"
@export var display_name_en: String = "Rotfiend Ghoul"
@export var max_hp: int = 95
@export var attack_damage: int = 16
@export var move_speed: float = 3.8
@export var is_silver_vulnerable: bool = true
@export var is_boss: bool = false
@export var quest_tag: String = "q1_ghouls"
@export var respawn_seconds: float = 60.0

@onready var mesh_instance: MeshInstance3D = $MeshInstance3D

var hp: int = 95
var state: String = "PATROL" # "IDLE" | "PATROL" | "CHASE" | "ATTACK" | "DEAD"
var home_position: Vector3 = Vector3.ZERO
var patrol_angle: float = 0.0
var attack_timer: float = 0.0
var burn_timer: float = 0.0
var respawn_timer: float = 0.0

func _ready() -> void:
	add_to_group("enemies")
	hp = max_hp
	home_position = global_position

func _physics_process(delta: float) -> void:
	if state == "DEAD":
		if not is_boss and respawn_seconds > 0.0:
			respawn_timer -= delta
			if respawn_timer <= 0.0:
				_respawn_mob()
		return

	if burn_timer > 0.0:
		burn_timer = maxf(0.0, burn_timer - delta)
		hp = maxi(0, hp - int(ceil(6.0 * delta)))
		if hp <= 0:
			_die()
			return

	var player := get_tree().get_first_node_in_group("player") as Node3D
	if player == null:
		return

	var dist := global_position.distance_to(player.global_position)
	if dist <= 2.3:
		state = "ATTACK"
	elif dist <= 15.0:
		state = "CHASE"
	else:
		state = "PATROL"

	if state == "CHASE":
		var dir := (player.global_position - global_position).normalized()
		dir.y = 0.0
		velocity.x = dir.x * move_speed
		velocity.z = dir.z * move_speed
		look_at(Vector3(player.global_position.x, global_position.y, player.global_position.z), Vector3.UP)
	elif state == "ATTACK":
		velocity.x = 0.0
		velocity.z = 0.0
		attack_timer -= delta
		if attack_timer <= 0.0:
			attack_timer = 1.35
			if player.has_method("take_player_damage"):
				player.call("take_player_damage", attack_damage)
	elif state == "PATROL":
		patrol_angle += delta * 0.7
		var target := home_position + Vector3(cos(patrol_angle) * 3.5, 0.0, sin(patrol_angle) * 3.5)
		var dir := (target - global_position)
		dir.y = 0.0
		if dir.length() > 0.2:
			dir = dir.normalized()
			velocity.x = dir.x * (move_speed * 0.55)
			velocity.z = dir.z * (move_speed * 0.55)

	move_and_slide()

func take_combat_damage(base_damage: int, used_silver: bool, apply_burn: bool) -> void:
	if state == "DEAD":
		return
	var mult := 1.0 if (used_silver == is_silver_vulnerable) else 0.35
	var final_dmg := maxi(1, int(round(float(base_damage) * mult)))
	hp = maxi(0, hp - final_dmg)
	if apply_burn:
		burn_timer = 4.0
	AudioManager.play_sfx("hit")
	GameState.add_log("%s получает %d ед. урона." % [display_name_ru, final_dmg], "damage")
	if hp <= 0:
		_die()

func _die() -> void:
	state = "DEAD"
	visible = false
	set_physics_process(true)
	respawn_timer = respawn_seconds
	GameState.award_xp_and_gold(55 if not is_boss else 220, 25 if not is_boss else 140)
	GameState.add_log("Повержен враг: %s!" % display_name_ru, "quest")

	if quest_tag == "q1_ghouls":
		var any_alive := false
		for node in get_tree().get_nodes_in_group("enemies"):
			if node is EnemyAI and node.quest_tag == "q1_ghouls" and node.state != "DEAD":
				any_alive = true
				break
		if not any_alive:
			QuestManager.complete_stage("quest_missing_hunters", "q1_kill_ghouls")
	elif quest_tag == "q2_hag":
		QuestManager.complete_stage("quest_swamp_whisper", "q2_kill_hag")
	elif quest_tag == "q3_demon":
		QuestManager.complete_stage("quest_ancient_king", "q3_kill_demon")
	elif quest_tag == "q3_boss":
		QuestManager.complete_stage("quest_ancient_king", "q3_kill_boss")

func _respawn_mob() -> void:
	hp = max_hp
	burn_timer = 0.0
	global_position = home_position
	state = "PATROL"
	visible = true
	GameState.add_log("В окрестностях снова появились чудовища (%s)." % display_name_ru, "info")
