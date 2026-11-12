import type {
  GameItem,
  GraphicsSettings,
  HunterContract,
  PlayerStats,
  Quest,
  SkillNode,
} from './types';
import type { NpcRelationshipState } from './npcPersonas';

const SAVE_KEY = 'thewanderer_save_v1';

export interface SavePayload {
  version: number;
  timestamp: number;
  player: PlayerStats;
  quests: Quest[];
  contracts?: HunterContract[];
  activeQuestId: string;
  inventory: GameItem[];
  skills: SkillNode[];
  deadEnemyIds: string[];
  defeatedQuestTags?: string[];
  interactedIds: string[];
  settings: GraphicsSettings;
  discoveredPOIs?: string[];
  pillarStates?: Record<string, number>;
  catacombsGateUnlocked?: boolean;
  npcRelationships?: Record<string, NpcRelationshipState>;
}

export class SaveSystem {
  public static hasSave(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Partial<SavePayload>;
      return parsed.version === 1 && typeof parsed.player?.hp === 'number';
    } catch {
      return false;
    }
  }

  public static save(payload: SavePayload): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  public static load(): SavePayload | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SavePayload>;
      if (
        parsed.version !== 1 ||
        !parsed.player ||
        typeof parsed.player.x !== 'number' ||
        !Array.isArray(parsed.quests) ||
        !Array.isArray(parsed.inventory)
      ) {
        return null;
      }
      return parsed as SavePayload;
    } catch {
      return null;
    }
  }

  public static clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
  }
}
