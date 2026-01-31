import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { playerService, guildService } from "../../db/services";
import { guildMembershipService } from "../../db/services/guild-membership.service";
import { Resource } from "sst";
import type { DiscordGuild } from "@derelict/shared";

const DISCORD_API_BASE = "https://discord.com/api/v10";

export const playerRouter = router({
  /**
   * Get current player's guilds with bot installation status and permissions
   */
  getGuilds: protectedProcedure.query(async ({ ctx }): Promise<Array<DiscordGuild & { canManage: boolean; botInstalled: boolean; optedIn: boolean }>> => {
    try {
      const guildsWithPermissions = await playerService.getPlayerGuildsWithPermissions(ctx.playerId);

      // Fetch all memberships for this player in ONE query
      const discordUserId = ctx.user.discordUserId;
      const memberships = await guildMembershipService.getPlayerMemberships(discordUserId);
      const membershipMap = new Map(memberships.map(m => [m.guildId, m.optedIn]));

      // Bot installation status is now denormalized in Player.guilds - no need to query Guild table
      const guildsWithStatus = guildsWithPermissions.map((guild) => ({
        ...guild,
        botInstalled: guild.botInstalled ?? false, // Read from denormalized field
        optedIn: membershipMap.get(guild.id) ?? false,
      }));

      return guildsWithStatus;
    } catch (error) {
      console.error("[player.getGuilds] Error:", error);
      throw error;
    }
  }),

  /**
   * Get current player info
   */
  getMe: protectedProcedure.query(async ({ ctx }) => {
    console.log("[player.getMe] Starting query for playerId:", ctx.playerId);
    
    const player = await playerService.getPlayer(ctx.playerId);
    
    if (!player) {
      console.error("[player.getMe] Player not found for ID:", ctx.playerId);
      throw new Error("Player not found");
    }

    console.log("[player.getMe] Player found:", player.id);
    return player;
  }),

  /**
   * Refresh player's guilds from Discord API
   * Re-fetches the user's guilds and permissions from Discord
   */
  refreshGuilds: protectedProcedure.mutation(async ({ ctx }) => {
    console.log("[player.refreshGuilds] Starting refresh for playerId:", ctx.playerId);
    
    try {
      const guildsWithPermissions = await playerService.refreshGuildsFromDiscord(ctx.playerId);
      return guildsWithPermissions;
    } catch (error) {
      console.error("[player.refreshGuilds] Error refreshing guilds:", error);
      throw new Error("Failed to refresh guilds from Discord");
    }
  }),
});
