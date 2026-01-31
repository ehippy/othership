// Core type definitions for Othership

export interface CharacterStats {
  strength: number;
  speed: number;
  intellect: number;
  combat: number;
  social: number;
}

export interface CharacterSaves {
  sanity: number;
  fear: number;
  body: number;
}

// Type aliases for convenience
export type Stats = CharacterStats;
export type Saves = CharacterSaves;

export interface Character {
  id: string;
  playerId: string;
  gameId: string;
  name: string;
  stats: CharacterStats;
  saves: CharacterSaves;
  health: number;
  maxHealth: number;
  stress: number;
  maxStress: number;
  inventory: string[];
  isRIP: boolean;
  position?: Position;
  createdAt?: string;
  updatedAt?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: 'npc' | 'monster' | 'item' | 'object';
  position: Position;
  name: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
}

export interface Player {
  id: string;
  discordUserId: string;
  discordUsername: string;
  discordAvatar?: string;
  gameId: string;
  activeCharacterId?: string;
  guilds?: DiscordGuild[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Game {
  id: string;
  serverId: string;
  channelId: string;
  status: 'setup' | 'active' | 'paused' | 'completed';
  turnNumber: number;
  playerIds: string[];
  createdAt?: string;
  updatedAt?: string;
  ttl?: number;
}
