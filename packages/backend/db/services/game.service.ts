import { GameEntity } from "../entities";
import { CharacterEntity } from "../entities/character.entity";
import { GuildMembershipEntity } from "../entities/guild-membership.entity";
import { ScenarioService } from "./scenario.service";
import { generateGameSlug } from "../../lib/game-names";
import { ulid } from "ulid";
import type { Game } from "@derelict/shared";

export const gameService = {
  /**
   * Create a new game with scenario
   */
  async createGame(params: {
    guildId: string; // Discord guild ID
    channelId: string;
    scenarioId: string;
  }): Promise<Game> {
    // Convert Discord guild ID to internal guild ID
    const { guildService } = await import('./guild.service');
    const guild = await guildService.getGuildByDiscordId(params.guildId);
    if (!guild) {
      throw new Error("Guild not found");
    }
    const internalGuildId = guild.id;

    // Fetch scenario to get min/max players, name, and slug
    const scenario = await ScenarioService.getById(params.scenarioId);
    if (!scenario) {
      throw new Error("Scenario not found");
    }

    // Check for existing active games in guild
    const activeGames = await this.getActiveGamesByGuild(internalGuildId);
    if (activeGames.length > 0) {
      throw new Error("Guild already has an active game");
    }

    // Get current opted-in roster count (using Discord guild ID for memberships)
    const roster = await this.getCurrentRoster(params.guildId);
    if (roster.length < scenario.minPlayers) {
      throw new Error(`Not enough players. Need at least ${scenario.minPlayers}, have ${roster.length}`);
    }

    const id = ulid();
    
    // Check if guild has other games with same scenario, suffix if needed
    const guildGames = await this.getGamesByGuild(internalGuildId);
    const sameScenarioGames = guildGames.filter(g => g.scenarioId === params.scenarioId);
    let slug = scenario.slug;
    
    if (sameScenarioGames.length > 0) {
      slug = `${scenario.slug}-${sameScenarioGames.length + 1}`;
    }
    
    const gameStartTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
    
    const result = await GameEntity.create({
      id,
      guildId: internalGuildId,
      channelId: params.channelId,
      slug,
      scenarioId: params.scenarioId,
      scenarioName: scenario.name,
      status: "staging",
      gameStartTime,
      minPlayers: scenario.minPlayers,
      maxPlayers: scenario.maxPlayers,
      turnNumber: 0,
      playerIds: [],
    }).go();

    return result.data as Game;
  },

  /**
   * Get current opted-in roster for a guild (dynamic)
   */
  async getCurrentRoster(guildId: string) {
    const result = await GuildMembershipEntity.query
      .byGuild({ guildId })
      .go();
    
    return result.data.filter(m => m.optedIn);
  },

  /**
   * Finalize roster: snapshot opted-in players and create empty characters
   */
  async finalizeRoster(gameId: string, guildId: string): Promise<Game> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.status !== "staging") {
      throw new Error("Game must be in staging to finalize roster");
    }

    // Get current opted-in roster
    const roster = await this.getCurrentRoster(guildId);
    
    if (roster.length < game.minPlayers) {
      throw new Error(`Not enough players. Need ${game.minPlayers}, have ${roster.length}`);
    }

    if (roster.length > game.maxPlayers) {
      throw new Error(`Too many players. Max ${game.maxPlayers}, have ${roster.length}`);
    }

    const playerIds = roster.map(m => m.playerId);

    // Create empty character for each player
    for (const member of roster) {
      await CharacterEntity.create({
        id: ulid(),
        playerId: member.playerId,
        gameId,
        name: `Character ${member.playerUsername}`, // Placeholder name
        stats: {
          strength: 0,
          speed: 0,
          intellect: 0,
          combat: 0,
          social: 0,
        },
        saves: {
          sanity: 0,
          fear: 0,
          body: 0,
        },
        health: 0,
        maxHealth: 0,
        stress: 0,
        maxStress: 0,
        inventory: [],
        isRIP: false,
      }).go();
    }

    // Update game status and snapshot playerIds
    const result = await GameEntity.patch({ id: gameId })
      .set({
        status: "character_creation",
        playerIds,
      })
      .go();

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
   * Get game by guild slug and game slug (scenario-based)
   */
  async getByGuildSlugAndGameSlug(guildSlug: string, gameSlug: string): Promise<Game | null> {
    try {
      console.log('Looking up game by guildSlug:', guildSlug, 'gameSlug:', gameSlug);
      
      // First find the guild by slug
      const { guildService } = await import('./guild.service');
      const guild = await guildService.getGuildBySlug(guildSlug);
      
      if (!guild) {
        console.log('Guild not found by slug');
        return null;
      }
      
      // Now query games by guildId and slug
      const result = await GameEntity.query
        .byGuildSlug({ guildId: guild.id, slug: gameSlug })
        .go();
      
      if (result.data.length > 0) {
        console.log('Found game by guild slug + game slug');
        return result.data[0] as Game;
      }

      console.log('Game not found');
      return null;
    } catch (error) {
      console.error('Error in getByGuildSlugAndGameSlug:', error);
      return null;
    }
  },

  /**
   * Get game by guild and slug (legacy - internal guild ID)e;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get game by guild and slug
   */
  async getByGuildAndSlug(guildId: string, slug: string): Promise<Game | null> {
    try {
      console.log('Looking up game by guildId:', guildId, 'slug:', slug);
      const result = await GameEntity.query
        .byGuildSlug({ guildId, slug })
        .go();
      
      if (result.data.length > 0) {
        console.log('Found game by slug');
        return result.data[0] as Game;
      }

      // Fallback: try to extract game ID from slug and look up directly
      console.log('Slug lookup failed, trying ID extraction');
      const gameIdMatch = slug.match(/-g([A-Z0-9]{6})$/);
      if (gameIdMatch) {
        const shortId = gameIdMatch[1];
        console.log('Extracted short ID:', shortId);
        
        // Get all games in guild and find by ID suffix
        const allGames = await this.getGamesByGuild(guildId);
        const game = allGames.find(g => g.id.endsWith(shortId));
        
        if (game) {
          console.log('Found game by ID suffix match');
          return game;
        }
      }

      console.log('Game not found');
      return null;
    } catch (error) {
      console.error('Error in getByGuildAndSlug:', error);
      return null;
    }
  },

  /**
   * Get all games in a Discord guild (sorted newest first)
   */
  async getGamesByGuild(guildId: string): Promise<Game[]> {
    const result = await GameEntity.query.byGuild({ guildId }).go({ order: 'desc' });
    return result.data as Game[];
  },

  /**
   * Get active games in a guild (not tpk, won, or abandoned)
   */
  async getActiveGamesByGuild(guildId: string): Promise<Game[]> {
    const allGames = await this.getGamesByGuild(guildId);
    return allGames.filter(g => !['tpk', 'won', 'abandoned'].includes(g.status));
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
    status: Game['status']
  ): Promise<Game> {
    const result = await GameEntity.patch({ id: gameId })
      .set({ status })
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
   * Delete a game (hard delete)
   */
  async deleteGame(gameId: string): Promise<void> {
    await GameEntity.delete({ id: gameId }).go();
  },
};
