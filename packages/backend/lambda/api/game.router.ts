import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { gameService, playerService } from "../../db/services";
import { postToChannel } from "../../lib/discord-client";
import { formatGameName } from "@derelict/shared";

export const gameRouter = router({
  // Create a new game with scenario
  create: publicProcedure
    .input(
      z.object({
        guildId: z.string(),
        channelId: z.string(),
        scenarioId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const game = await gameService.createGame({
        guildId: input.guildId,
        channelId: input.channelId,
        scenarioId: input.scenarioId,
      });

      // Get current roster for announcement
      const roster = await gameService.getCurrentRoster(input.guildId);
      
      // Post staging announcement to Discord
      const gameStartTimestamp = Math.floor(new Date(game.gameStartTime).getTime() / 1000);
      const formattedName = formatGameName(game.slug);
      const message = `🎮 **New game staging!**\n\n**${formattedName}** - ${game.scenarioName}\nGame starts in 1 hour at <t:${gameStartTimestamp}:t>\n\nOpt in/out now - roster finalizes at game start! (Min: ${game.minPlayers}, Max: ${game.maxPlayers})`;
      
      try {
        await postToChannel(input.channelId, message, input.guildId);
      } catch (error) {
        console.error('Failed to post staging announcement:', error);
        // Don't fail game creation if Discord post fails
      }

      return game;
    }),

  // Get game by ID
  get: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ input }) => {
      console.log("🎮 Fetching game:", input.gameId); // Hot reload test!
      const game = await gameService.getGame(input.gameId);
      if (!game) {
        throw new Error("Game not found");
      }
      return game;
    }),

  // Get all games in a guild
  listByGuild: publicProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      return await gameService.getGamesByGuild(input.guildId);
    }),

  // Get active games in a guild (not terminal states)
  getActiveByGuild: publicProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      const games = await gameService.getActiveGamesByGuild(input.guildId);
      return games[0] || null; // Return first active game or null
    }),

  // Get game by guild and slug
  getByGuildAndSlug: publicProcedure
    .input(z.object({ guildId: z.string(), slug: z.string() }))
    .query(async ({ input }) => {
      return await gameService.getByGuildAndSlug(input.guildId, input.slug);
    }),

  // Get current roster for a guild (dynamic during staging)
  getCurrentRoster: publicProcedure
    .input(z.object({ guildId: z.string() }))
    .query(async ({ input }) => {
      return await gameService.getCurrentRoster(input.guildId);
    }),

  // Get active game in channel
  getActiveByChannel: publicProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ input }) => {
      return await gameService.getActiveGameByChannel(input.channelId);
    }),

  // Update game status
  updateStatus: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        status: z.enum(["staging", "character_creation", "active", "tpk", "won", "abandoned"]),
      })
    )
    .mutation(async ({ input }) => {
      return await gameService.updateGameStatus(input.gameId, input.status);
    }),

  // Finalize roster and transition to character creation
  finalizeRoster: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        guildId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await gameService.finalizeRoster(input.gameId, input.guildId);
    }),

  // Join a game
  join: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        discordUserId: z.string(),
        discordUsername: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if player already exists
      const existingPlayer = await playerService.getPlayerByDiscordUser(
        input.discordUserId,
        input.gameId
      );

      if (existingPlayer) {
        return existingPlayer;
      }

      // Create new player
      const player = await playerService.createPlayer({
        discordUserId: input.discordUserId,
        discordUsername: input.discordUsername,
        gameId: input.gameId,
      });

      // Add player to game
      await gameService.addPlayerToGame(input.gameId, player.id);

      return player;
    }),

  // Get game with all players
  getWithPlayers: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ input }) => {
      const game = await gameService.getGame(input.gameId);
      if (!game) {
        throw new Error("Game not found");
      }

      const players = await playerService.getPlayersByGame(input.gameId);

      return { game, players };
    }),

  // Start game
  start: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ input }) => {
      return await gameService.updateGameStatus(input.gameId, "active");
    }),

  // Complete game
  complete: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ input }) => {
      return await gameService.completeGame(input.gameId);
    }),

  // Cancel/abandon game
  abandon: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ input }) => {
      const game = await gameService.getGame(input.gameId);
      if (!game) {
        throw new Error("Game not found");
      }

      const updatedGame = await gameService.updateGameStatus(input.gameId, "abandoned");

      // Post cancellation announcement to Discord
      const formattedName = formatGameName(game.slug);
      const message = `❌ **Game cancelled**\n\n**${formattedName}** has been cancelled.`;
      
      try {
        await postToChannel(game.channelId, message, game.guildId);
      } catch (error) {
        console.error('Failed to post cancellation announcement:', error);
        // Don't fail the cancellation if Discord post fails
      }

      return updatedGame;
    }),

  // Delete game (hard delete)
  delete: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ input }) => {
      await gameService.deleteGame(input.gameId);
      return { success: true };
    }),
});
