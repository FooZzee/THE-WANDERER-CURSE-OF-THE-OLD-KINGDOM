extends Node3D
class_name NPCActor

## Smart NPC & Interactable Actor (including Notice Board and Quest Clues)
## Displays a rounded 3D yellow Exclamation Mark (!) for available quests/contracts
## and a rounded 3D yellow Question Mark (?) when a quest stage is ready to turn in.

@export var actor_id: String = "npc_elder"
@export var display_name_ru: String = "Староста Бран"
@export var display_name_en: String = "Elder Bran"
@export var actor_type: String = "npc" # "npc" | "notice_board" | "clue" | "campfire"
@export var quest_id: String = ""
@export var quest_stage_id: String = ""
@export var schedule_role: String = "elder"

@onready var indicator_root: Node3D = $QuestIndicatorRoot
@onready var exclamation_group: Node3D = $QuestIndicatorRoot/ExclamationMark
@onready var question_group: Node3D = $QuestIndicatorRoot/QuestionMark
@onready var interact_area: Area3D = $InteractArea

var home_position: Vector3 = Vector3.ZERO
var bob_time: float = 0.0

func _ready() -> void:
	home_position = global_position
	if interact_area:
		interact_area.body_entered.connect(_on_body_entered)
		interact_area.body_exited.connect(_on_body_exited)
	QuestManager.quests_updated.connect(_refresh_indicator)
	_refresh_indicator()

func _process(delta: float) -> void:
	bob_time += delta
	if indicator_root and indicator_root.visible:
		indicator_root.position.y = 2.55 + sin(bob_time * 3.2) * 0.12
		indicator_root.rotate_y(delta * 2.1)

	# Smart NPC look-at player when nearby
	var player := get_tree().get_first_node_in_group("player") as Node3D
	if player and actor_type == "npc":
		var dist := global_position.distance_to(player.global_position)
		if dist < 6.0:
			var target := Vector3(player.global_position.x, global_position.y, player.global_position.z)
			if global_position.distance_to(target) > 0.1:
				look_at(target, Vector3.UP)

func _refresh_indicator() -> void:
	if indicator_root == null:
		return
	var state := QuestManager.get_actor_indicator_state(actor_id)
	indicator_root.visible = (state != "none")
	if exclamation_group:
		exclamation_group.visible = (state == "exclamation")
	if question_group:
		question_group.visible = (state == "question")

func _on_body_entered(body: Node3D) -> void:
	if body.is_in_group("player"):
		body.set("nearby_interactable", self)
		GameState.hud_updated.emit()

func _on_body_exited(body: Node3D) -> void:
	if body.is_in_group("player") and body.get("nearby_interactable") == self:
		body.set("nearby_interactable", null)
		GameState.hud_updated.emit()

func interact() -> void:
	if actor_type == "notice_board":
		var hud := get_tree().get_first_node_in_group("hud")
		if hud and hud.has_method("open_notice_board"):
			hud.call("open_notice_board")
		return

	if actor_type == "clue":
		if quest_id != "" and quest_stage_id != "":
			var res := QuestManager.complete_stage(quest_id, quest_stage_id)
			if not bool(res.get("stage_completed", false)):
				GameState.show_banner(display_name_ru, "Сначала выполните предыдущий этап задания!")
			else:
				GameState.add_log("Изучена улика: %s" % display_name_ru, "quest")
		return

	if actor_type == "campfire":
		GameState.player_stats["hp"] = GameState.player_stats["max_hp"]
		GameState.player_stats["stamina"] = GameState.player_stats["max_stamina"]
		GameState.player_stats["toxicity"] = 0.0
		GameState.time_of_day = fmod(GameState.time_of_day + 6.0, 24.0)
		GameState.save_game()
		GameState.show_banner("Медитация у костра", "Здоровье восстановлено · Токсичность сброшена · Игра сохранена")
		return

	# NPC Dialogue
	var hud_node := get_tree().get_first_node_in_group("hud")
	if hud_node and hud_node.has_method("start_dialogue"):
		var dlg := DialogueDatabase.get_dialogue_for_actor(actor_id)
		hud_node.call("start_dialogue", actor_id, dlg)
	_refresh_indicator()
