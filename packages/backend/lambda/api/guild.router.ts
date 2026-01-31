import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { guildService, playerService } from "../../db/services";
import { fetchGuildChannels, validateChannelPermissions, postToChannel } from "../../lib/discord-client";

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

  /**
   * Send an ominous message to the game channel (admin only, for testing)
   */
  sendOminousMessage: protectedProcedure
    .input(z.object({ discordGuildId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log("[guild.sendOminousMessage] Sending message for guild:", input.discordGuildId);
      
      // Check admin permissions
      const guilds = await playerService.getPlayerGuildsWithPermissions(ctx.playerId);
      const guild = guilds.find(g => g.id === input.discordGuildId);
      
      if (!guild?.canManage) {
        throw new Error("Unauthorized: Admin permissions required");
      }

      // Get guild and verify channel is set
      const guildRecord = await guildService.getGuildByDiscordId(input.discordGuildId);
      if (!guildRecord?.gameChannelId) {
        throw new Error("No game channel configured");
      }

      // Random ominous messages
      const messages = [
        "⚠️ Life support systems failing. Oxygen levels: 47% and dropping.",
        "🛸 Unknown entity detected in sector 7. All crew report to stations immediately.",
        "📡 EMERGENCY BROADCAST: Hull breach detected. Containment protocols initiated.",
        "⚠️ WARNING: Unexplained movement detected in cargo bay. Investigation required.",
        "🛸 Station lights flickering. Something is draining power from the main grid.",
        "📡 CRITICAL: Distress signal received from derelict vessel. Origin: Unknown.",
        "⚠️ Atmospheric processors offline. Temperature dropping rapidly.",
        "🛸 You are not alone. Motion sensors detecting non-human signatures.",
        "📡 ALERT: Communication array compromised. Last transmission: \"They're here.\"",
        "⚠️ Biohazard containment breach. Quarantine procedures failing.",
      ];
      
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      await postToChannel(guildRecord.gameChannelId, randomMessage);
      console.log("[guild.sendOminousMessage] Message sent successfully");
      
      return { success: true };
    }),
});
