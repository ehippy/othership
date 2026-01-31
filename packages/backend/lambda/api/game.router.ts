import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { gameService, playerService } from "../../db/services";

export const gameRouter = router({
  // Create a new game
  create: publicProcedure
    .input(
      z.object({
        guildId: z.string(),
        channelId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await gameService.createGame({
        guildId: input.guildId,
        channelId: input.channelId,
      });
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
        status: z.enum(["setup", "active", "paused", "completed"]),
      })
    )
    .mutation(async ({ input }) => {
      return await gameService.updateGameStatus(input.gameId, input.status);
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
});
