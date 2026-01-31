import { GameEntity } from "../entities";
import { ulid } from "ulid";
import type { Game } from "@othership/shared";

export const gameService = {
  /**
   * Create a new game
   */
  async createGame(params: {
    guildId: string;
    channelId: string;
  }): Promise<Game> {
    const id = ulid();
    
    const result = await GameEntity.create({
      id,
      guildId: params.guildId,
      channelId: params.channelId,
      status: "setup",
      turnNumber: 0,
      playerIds: [],
    }).go();

    return result.data as Game;
  },

  /**
   * Get game by ID
   */
  async getGame(gameId: string): Promise<Game | null> {
    try {
      const result = await GameEntity.get({ id: gameId }).go();
      return result.data as Game;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get all games in a Discord guild
   */
  async getGamesByGuild(guildId: string): Promise<Game[]> {
    const result = await GameEntity.query.byGuild({ guildId }).go();
    return result.data as Game[];
  },

  /**
   * Get active game in a Discord channel
   */
  async getActiveGameByChannel(channelId: string): Promise<Game | null> {
    const result = await GameEntity.query
      .byChannel({ channelId, status: "active" })
      .go();
    
    return result.data.length > 0 ? (result.data[0] as Game) : null;
  },

  /**
   * Update game status
   */
  async updateGameStatus(
    gameId: string,
    status: "setup" | "active" | "paused" | "completed"
  ): Promise<Game> {
    const result = await GameEntity.patch({ id: gameId })
      .set({ status })
      .go();

    return result.data as Game;
  },

  /**
   * Add player to game
   */
  async addPlayerToGame(gameId: string, playerId: string): Promise<Game> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.playerIds.includes(playerId)) {
      return game;
    }

    const result = await GameEntity.patch({ id: gameId })
      .set({
        playerIds: [...game.playerIds, playerId],
      })
      .go();

    return result.data as Game;
  },

  /**
   * Increment turn number
   */
  async incrementTurn(gameId: string): Promise<Game> {
    const result = await GameEntity.patch({ id: gameId })
      .add({ turnNumber: 1 })
      .go();

    return result.data as Game;
  },

  /**
   * Complete game and set TTL for cleanup
   */
  async completeGame(gameId: string): Promise<Game> {
    const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    const result = await GameEntity.patch({ id: gameId })
      .set({
        status: "completed",
        ttl: thirtyDaysFromNow, // Auto-delete after 30 days
      })
      .go();

    return result.data as Game;
  },
};
