import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { playerService, guildService } from "../../db/services";

export const playerRouter = router({
  /**
   * Get current player's guilds with bot installation status
   */
  getGuilds: protectedProcedure.query(async ({ ctx }) => {
    console.log("[player.getGuilds] Starting query");
    console.log("[player.getGuilds] Context playerId:", ctx.playerId);
    
    const player = await playerService.getPlayer(ctx.playerId);
    console.log("[player.getGuilds] Player found:", player ? "YES" : "NO");
    
    if (!player) {
      console.error("[player.getGuilds] Player not found for ID:", ctx.playerId);
      throw new Error("Player not found");
    }

    const playerGuilds = player.guilds || [];
    console.log("[player.getGuilds] Player guilds:", playerGuilds.length);

    try {
      // Fetch bot installation status for each guild
      const guildsWithStatus = await Promise.all(
        playerGuilds.map(async (guild) => {
          try {
            const guildRecord = await guildService.getGuildByDiscordId(guild.id);
            return {
              ...guild,
              botInstalled: guildRecord?.botInstalled ?? false,
            };
          } catch (error) {
            console.error(`[player.getGuilds] Error checking guild ${guild.id}:`, error);
            // Return guild without bot status on error
            return {
              ...guild,
              botInstalled: false,
            };
          }
        })
      );

      console.log("[player.getGuilds] Success, returning", guildsWithStatus.length, "guilds");
      return guildsWithStatus;
    } catch (error) {
      console.error("[player.getGuilds] Error in guild status mapping:", error);
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
});
