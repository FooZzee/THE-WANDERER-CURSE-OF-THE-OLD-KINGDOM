extends Resource
class_name ItemResource

@export var id: StringName = &""
@export var name_ru: String = "Предмет"
@export var name_en: String = "Item"
@export_multiline var description_ru: String = ""
@export_multiline var description_en: String = ""
@export var category: String = "weapon" # "weapon" | "armor" | "potion" | "ingredient" | "trophy"
@export var equip_slot: String = "none" # "steelSword" | "silverSword" | "armor" | "trophy" | "none"
@export var rarity: String = "common"   # "common" | "rare" | "relic"
@export var icon_symbol: String = "⚔️"
@export var attack_bonus: int = 0
@export var defense_bonus: int = 0
@export var max_hp_bonus: int = 0
@export var value: int = 50
