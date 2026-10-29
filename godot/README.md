# Странник: Проклятие Старого Королевства — Godot 4.x 3D Edition

Полная структура 3D-проекта для движка **Godot 4.x (Forward+ / Jolt Physics 3D)**, спроектированная с использованием архитектурных паттернов `awesome-gamedev-agent-skills` (`godot-3d-essentials`, `godot-nodes-scenes`, `godot-gdscript`, `godot-physics`, `godot-ui-control`, `godot-resources`).

## Структура директории `/godot/`

```text
godot/
├── project.godot                          # Конфигурация Godot 4.x, слои физики, Input Map и Autoload-синглтоны
├── resources/
│   └── items/
│       ├── steel_wolf_sword.tres          # Стальной меч Школы Волка (ItemResource)
│       ├── silver_ash_blade.tres          # Серебряный клинок Пепла (ItemResource)
│       └── armor_raven_school.tres        # Доспех Школы Ворона (ItemResource)
├── scenes/
│   ├── main_menu.tscn                     # Главное меню + модальное окно настроек + переключение RU/EN
│   ├── world.tscn                         # Главная 3D-сцена (DirectionalLight3D, WorldEnvironment, NPC, враги, доска)
│   ├── player.tscn                        # 3D-персонаж игрока (CharacterBody3D + SpringArm3D + визуал брони и мечей)
│   ├── npc.tscn                           # 3D NPC / Доска объявлений + округлые жёлтые 3D-маркеры «!» и «?»
│   ├── enemy.tscn                         # 3D-монстр с FSM-ИИ и таймером респавна (RespawnTimer)
│   └── hud.tscn                           # Средневековый HUD, диалоги с эффектом печатной машинки и тач-управление
└── scripts/
    ├── autoload/
    │   ├── game_state.gd                  # Глобальное состояние, смена дня/ночи, погода, локализация RU/EN, сохранения
    │   ├── quest_manager.gd               # Система квестов со строгой проверкой этапов и расчётом 3D-маркеров (! / ?)
    │   ├── dialogue_database.gd           # Ветвящиеся диалоги NPC на русском и английском языках
    │   └── audio_manager.gd               # Процедурный генератор звука и управление громкостью / Mute
    ├── resources/
    │   └── item_resource.gd               # Кастомный класс ресурса предмета (class_name ItemResource)
    ├── entities/
    │   ├── player_controller.gd           # Управление, бой (сталь/серебро), 5 Знаков Пепла и динамический свет Огня
    │   ├── npc_actor.gd                   # Умный NPC с расписанием дня/ночи, реакцией на погоду и 3D-знаками ! / ?
    │   └── enemy_ai.gd                    # FSM ИИ врагов, уязвимость к серебру/стали и респавн через заданное время
    ├── world/
    │   └── world_manager.gd               # Управление динамическим освещением, циклом дня/ночи и погодой
    └── ui/
        ├── main_menu.gd                   # Контроллер главного меню и настроек
        └── hud_controller.gd              # Контроллер HUD, эффект печатной машинки и автоопределение ПК / Телефон
```

## Как открыть и запустить в Godot 4.x

1. Откройте **Godot Engine 4.2+ / 4.3+**.
2. Нажмите **Import** и выберите файл `godot/project.godot`.
3. Нажмите **F5 (Run Project)** — откроется главное меню `res://scenes/main_menu.tscn` с настройками и переключением языка (РУС / ENG).
