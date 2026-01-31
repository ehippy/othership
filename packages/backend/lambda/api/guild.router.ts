import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { guildService, playerService } from "../../db/services";
import { fetchGuildChannels, validateChannelPermissions } from "../../lib/discord-client";

export const guildRouter = router({
  /**
   * Get guild info by Discord guild ID
   */
  get: protectedProcedure
    .input(z.object({ discordGuildId: z.string() }))
    .query(async ({ input }) => {
      const guild = await guildService.getGuildByDiscordId(input.discordGuildId);
      if (!guild) {
        throw new Error("Guild not found");
      }
      return guild;
    }),

  /**
   * Get available text channels for a guild (admin only)
   */
  getChannels: protectedProcedure
    .input(z.object({ discordGuildId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log("[guild.getChannels] Fetching channels for guild:", input.discordGuildId);
      
      // Check if user can manage guild
      const guilds = await playerService.getPlayerGuildsWithPermissions(ctx.playerId);
      const guild = guilds.find(g => g.id === input.discordGuildId);
      
      if (!guild?.canManage) {
        throw new Error("Unauthorized: Admin permissions required");
      }

      const channels = await fetchGuildChannels(input.discordGuildId);
      console.log("[guild.getChannels] Found channels:", channels.length);
      
      return channels;
    }),

  /**
   * Set the game channel for a guild (admin only)
   */
  setGameChannel: protectedProcedure
    .input(z.object({
      discordGuildId: z.string(),
      channelId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log("[guild.setGameChannel] Setting channel:", input.channelId, "for guild:", input.discordGuildId);
      
      // Check admin permissions
      const guilds = await playerService.getPlayerGuildsWithPermissions(ctx.playerId);
      const guild = guilds.find(g => g.id === input.discordGuildId);
      
      if (!guild?.canManage) {
        throw new Error("Unauthorized: Admin permissions required");
      }

      // Validate channel permissions
      const validation = await validateChannelPermissions(input.discordGuildId, input.channelId);
      if (!validation.valid) {
        throw new Error(`Bot lacks permissions in this channel: ${validation.missingPermissions.join(', ')}`);
      }

      // Update guild with new channel
      const updatedGuild = await guildService.setGameChannel(input.discordGuildId, input.channelId);
      console.log("[guild.setGameChannel] Channel set successfully");
      
      return updatedGuild;
    }),
});
