import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { guildService, playerService } from "../../db/services";
import { guildMembershipService } from "../../db/services/guild-membership.service";
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
      channelName: z.string(),
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
      const updatedGuild = await guildService.setGameChannel(input.discordGuildId, input.channelId, input.channelName);
      console.log("[guild.setGameChannel] Channel set successfully");
      
      return updatedGuild;
    }),

  /**
   * Send an ominous message to the game channel (admin only, for testing)
   */
  sendOminousMessage: protectedProcedure
    .input(z.object({ discordGuildId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
      
      await postToChannel(guildRecord.gameChannelId, randomMessage, input.discordGuildId);
      
      return { success: true };
    }),

  /**
   * Get guild roster (all members with opt-in status)
   * Public - anyone can view the roster
   */
  getRoster: protectedProcedure
    .input(z.object({ discordGuildId: z.string() }))
    .query(async ({ input }) => {
      console.log("[guild.getRoster] Fetching roster for guild:", input.discordGuildId);
      
      const roster = await guildMembershipService.getRoster(input.discordGuildId);
      console.log("[guild.getRoster] Found members:", roster.length);
      
      return roster;
    }),

  /**
   * Set opt-in status for a player in a guild
   * User can set their own status, or admins can set anyone's status
   */
  setOptIn: protectedProcedure
    .input(z.object({
      discordGuildId: z.string(),
      playerId: z.string(), // Discord user ID
      optedIn: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log("[guild.setOptIn] Setting opt-in:", input.optedIn, "for player:", input.playerId, "in guild:", input.discordGuildId);
      
      // Check if user is setting their own status or has admin permissions
      const guilds = await playerService.getPlayerGuildsWithPermissions(ctx.playerId);
      const guild = guilds.find(g => g.id === input.discordGuildId);
      
      const isSelf = ctx.user.discordUserId === input.playerId;
      const isAdmin = guild?.canManage === true;
      
      if (!isSelf && !isAdmin) {
        throw new Error("Unauthorized: Can only change your own opt-in status or admin permissions required");
      }
      
      const updatedMembership = await guildMembershipService.setOptIn(
        input.playerId,
        input.discordGuildId,
        input.optedIn
      );
      
      // Post notification to game channel if configured (fire-and-forget, don't block response)
      guildService.getGuildByDiscordId(input.discordGuildId).then(guildRecord => {
        if (guildRecord?.gameChannelId) {
          const message = input.optedIn
            ? `👁️ <@${input.playerId}> steps into the shadows. (opted in to play)`
            : `💀 <@${input.playerId}> retreats into the void. We'll meet again soon. (opted out)`;
          postToChannel(guildRecord.gameChannelId, message, input.discordGuildId).catch(err => 
            console.error("[guild.setOptIn] Failed to post notification:", err)
          );
        }
      }).catch(err => console.error("[guild.setOptIn] Failed to get guild record:", err));
      
      console.log("[guild.setOptIn] Opt-in status updated successfully");
      return updatedMembership;
    }),
});
