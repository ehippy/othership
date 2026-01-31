import { PlayerEntity } from "../entities";
import { ulid } from "ulid";
import type { Player } from "@othership/shared";

export const playerService = {
  /**
   * Create a new player
   */
  async createPlayer(params: {
    discordUserId: string;
    discordUsername: string;
    discordDisplayName?: string;
    discordAvatar?: string;
    gameId: string;
  }): Promise<Player> {
    const id = ulid();

    const result = await PlayerEntity.create({
      id,
      discordUserId: params.discordUserId,
      discordUsername: params.discordUsername,
      discordDisplayName: params.discordDisplayName,
      discordAvatar: params.discordAvatar,
      gameId: params.gameId,
    }).go();

    return result.data as Player;
  },

  /**
   * Get player by ID
   */
  async getPlayer(playerId: string): Promise<Player | null> {
    try {
      const result = await PlayerEntity.get({ id: playerId }).go();
      return result.data as Player;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get all players in a game
   */
  async getPlayersByGame(gameId: string): Promise<Player[]> {
    const result = await PlayerEntity.query.byGame({ gameId }).go();
    return result.data as Player[];
  },

  /**
   * Get player by Discord user in a specific game
   */
  async getPlayerByDiscordUser(
    discordUserId: string,
    gameId: string
  ): Promise<Player | null> {
    const result = await PlayerEntity.query
      .byDiscordUser({ discordUserId, gameId })
      .go();

    return result.data.length > 0 ? (result.data[0] as Player) : null;
  },

  /**
   * Get all players by Discord user ID (across all games)
   */
  async getPlayersByDiscordUser(discordUserId: string): Promise<Player[]> {
    const result = await PlayerEntity.query
      .byDiscordUser({ discordUserId })
      .go();
    return result.data as Player[];
  },

  /**
   * Set active character for player
   */
  async setActiveCharacter(
    playerId: string,
    characterId: string
  ): Promise<Player> {
    const result = await PlayerEntity.patch({ id: playerId })
      .set({ activeCharacterId: characterId })
      .go();

    return result.data as Player;
  },

  /**
   * Update player guilds
   */
  async updateGuilds(
    playerId: string,
    guilds: Array<{ id: string; name: string; icon?: string }>
  ): Promise<Player> {
    const result = await PlayerEntity.patch({ id: playerId })
      .set({ guilds })
      .go();

    return result.data as Player;
  },

  /**
   * Update player Discord info (username and avatar)
   */
  async updatePlayer(params: {
    playerId: string;
    discordUsername?: string;
    discordDisplayName?: string;
    discordAvatar?: string;
  }): Promise<Player> {
    const updates: Record<string, any> = {};
    if (params.discordUsername !== undefined) {
      updates.discordUsername = params.discordUsername;
    }
    if (params.discordDisplayName !== undefined) {
      updates.discordDisplayName = params.discordDisplayName;
    }
    if (params.discordAvatar !== undefined) {
      updates.discordAvatar = params.discordAvatar;
    }

    const result = await PlayerEntity.patch({ id: params.playerId })
      .set(updates)
      .go();

    return result.data as Player;
  },
};
