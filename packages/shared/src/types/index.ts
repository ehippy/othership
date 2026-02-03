// Core type definitions for Derelict

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
  permissions?: string; // Discord permission bitfield
  botInstalled?: boolean; // Whether Derelict bot is installed in this guild
  gameChannelId?: string; // Discord channel ID for game messages
  gameChannelName?: string; // Cached name of game channel
}

export interface Player {
  id: string;
  discordUserId: string;
  discordUsername: string;
  discordDisplayName?: string;
  discordAvatar?: string;
  gameId: string;
  activeCharacterId?: string;
  guilds?: DiscordGuild[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Game {
  id: string;
  guildId: string;
  channelId: string;
  slug: string;
  scenarioId: string;
  scenarioName: string;
  status: 'staging' | 'character_creation' | 'active' | 'tpk' | 'won' | 'abandoned';
  gameStartTime: string; // ISO timestamp when staging ends
  minPlayers: number;
  maxPlayers: number;
  turnNumber: number;
  playerIds: string[];
  createdAt?: string;
  updatedAt?: string;
  ttl?: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'deadly';
  minPlayers: number;
  maxPlayers: number;
  mapData?: any; // JSON structure for map/room layout
  initialState?: any; // JSON structure for starting entities
  objectives?: string[];
  createdAt?: string;
  updatedAt?: string;
}
