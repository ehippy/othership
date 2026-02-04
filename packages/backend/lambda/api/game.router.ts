import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./trpc";
import { gameService, playerService, guildService, characterService } from "../../db/services";
import { guildMembershipService } from "../../db/services/guild-membership.service";
import { postToChannel } from "../../lib/discord-client";
import { formatGameName } from "@derelict/shared";
import { DISCORD_PERMISSIONS } from "@derelict/shared";

export const gameRouter = router({
  // Create a new game with scenario
  create: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        channelId: z.string(),
        scenarioId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user is a member of this guild and opted in
      const player = await playerService.getPlayer(ctx.playerId);
      const userGuild = player?.guilds?.find(g => g.id === input.guildId);
      
      if (!userGuild) {
        throw new Error("You must be a member of this server to create a game");
      }

      // Check guild membership and opt-in status
      const membership = await guildMembershipService.getMembership(ctx.user.discordUserId, input.guildId);
      
      // Allow if opted in OR if user has guild management permissions OR if site admin
      const canManage = userGuild.permissions
        ? (BigInt(userGuild.permissions) & BigInt(DISCORD_PERMISSIONS.ADMINISTRATOR | DISCORD_PERMISSIONS.MANAGE_GUILD)) !== BigInt(0)
        : false;
      
      if (!membership?.optedIn && !canManage && !ctx.user.isAdmin) {
        throw new Error("You must be opted in to create a game in this server");
      }

      const game = await gameService.createGame({
        guildId: input.guildId,
        channelId: input.channelId,
        scenarioId: input.scenarioId,
      });

      // Get current roster for announcement
      const roster = await gameService.getCurrentRoster(input.guildId);
      
      // Get guild for URL generation
      const guild = await guildService.getGuildByDiscordId(input.guildId);
      const gameUrl = guild?.slug 
        ? `https://derelict.world/${guild.slug}/${game.slug}`
        : null;
      
      // Post staging announcement to Discord
      const gameStartTimestamp = Math.floor(new Date(game.gameStartTime).getTime() / 1000);
      const titleLine = gameUrl 
        ? `**[${game.scenarioName}](${gameUrl})**`
        : `**${game.scenarioName}**`;
      const message = `🎮 **New game staging!**\n\n${titleLine}\nGame starts in 1 hour at <t:${gameStartTimestamp}:t>\n\nOpt in/out now - roster finalizes at game start! (Min: ${game.minPlayers}, Max: ${game.maxPlayers})`;
      
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

  // Get game by guild slug and game slug
  getByGuildSlugAndGameSlug: publicProcedure
    .input(z.object({ guildSlug: z.string(), gameSlug: z.string() }))
    .query(async ({ input }) => {
      return await gameService.getByGuildSlugAndGameSlug(input.guildSlug, input.gameSlug);
    }),

  // Get game by guild and slug (legacy - internal IDs)
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

  // Begin character creation (staging → character_creation)
  beginCharacterCreation: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const game = await gameService.getGame(input.gameId);
      if (!game) {
        throw new Error("Game not found");
      }

      // Check if user is opted in or has guild management permissions
      const player = await playerService.getPlayer(ctx.playerId);
      const membership = await guildMembershipService.getMembership(ctx.user.discordUserId, game.guildId);
      const userGuild = player?.guilds?.find(g => g.id === game.guildId);
      const canManage = userGuild?.permissions
        ? (BigInt(userGuild.permissions) & BigInt(DISCORD_PERMISSIONS.ADMINISTRATOR | DISCORD_PERMISSIONS.MANAGE_GUILD)) !== BigInt(0)
        : false;
      
      if (!membership?.optedIn && !canManage && !ctx.user.isAdmin) {
        throw new Error("Unauthorized: Only opted-in players or guild admins can start the game");
      }

      // Get current roster and create character skeletons (using Discord guild ID for memberships)
      const roster = await gameService.getCurrentRoster(game.discordGuildId);
      const createdCharacters = [];
      
      console.log('[beginCharacterCreation] Roster count:', roster.length);
      
      for (const member of roster) {
        // Create skeleton character for each opted-in player
        const character = await characterService.createCharacter({
          playerId: member.playerId,
          gameId: game.id,
          name: "", // Player will name their character
        });
        createdCharacters.push(character);
        console.log('[beginCharacterCreation] Created character for:', member.playerUsername);
      }

      console.log('[beginCharacterCreation] Created', createdCharacters.length, 'characters');

      // Post character creation announcement to Discord
      const formattedName = formatGameName(game.slug);
      const message = `📝 **Character Creation**\n\n**${formattedName}** is now in character creation phase!\n\nPlayers: Name your character and finalize your builds.`;
      
      try {
        await postToChannel(game.channelId, message, game.guildId);
      } catch (error) {
        console.error('Failed to post character creation announcement:', error);
      }

      const updatedGame = await gameService.updateGameStatus(input.gameId, "character_creation");
      
      return { game: updatedGame, characters: createdCharacters };
    }),

  // Start game (character_creation → active)
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
  abandon: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const game = await gameService.getGame(input.gameId);
      if (!game) {
        throw new Error("Game not found");
      }

      // Check if user is admin or has guild management permissions
      const player = await playerService.getPlayer(ctx.playerId);
      const userGuild = player?.guilds?.find(g => g.id === game.guildId);
      const canManage = userGuild?.permissions
        ? (BigInt(userGuild.permissions) & BigInt(DISCORD_PERMISSIONS.ADMINISTRATOR | DISCORD_PERMISSIONS.MANAGE_GUILD)) !== BigInt(0)
        : false;
      
      if (!ctx.user.isAdmin && !canManage) {
        throw new Error("Unauthorized: Only guild admins or site admins can cancel games");
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
  delete: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const game = await gameService.getGame(input.gameId);
      if (!game) {
        throw new Error("Game not found");
      }

      // Check if user is admin or has guild management permissions
      const player = await playerService.getPlayer(ctx.playerId);
      const userGuild = player?.guilds?.find(g => g.id === game.guildId);
      const canManage = userGuild?.permissions
        ? (BigInt(userGuild.permissions) & BigInt(DISCORD_PERMISSIONS.ADMINISTRATOR | DISCORD_PERMISSIONS.MANAGE_GUILD)) !== BigInt(0)
        : false;
      
      if (!ctx.user.isAdmin && !canManage) {
        throw new Error("Unauthorized: Only guild admins or site admins can delete games");
      }

      await gameService.deleteGame(input.gameId);
      return { success: true };
    }),
});
