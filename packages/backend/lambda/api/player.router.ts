import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./trpc";
import { playerService, guildService } from "../../db/services";
import { guildMembershipService } from "../../db/services/guild-membership.service";
import { Resource } from "sst";
import type { DiscordGuild } from "@derelict/shared";
import { postEmbed } from "../../lib/discord-client";

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

  /**
   * Apply to become a scenario creator
   */
  applyForCreator: protectedProcedure
    .input(
      z.object({
        reason: z.string().min(10).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("[player.applyForCreator] User applying:", ctx.user.discordUsername);

      // Apply for creator status
      const updatedPlayer = await playerService.applyForCreator(ctx.playerId, input.reason);

      // Send notification to admin channel
      try {
        await postEmbed(
          Resource.AdminNotificationChannelId.value,
          {
            title: "🎨 New Creator Application",
            description: `**${ctx.user.discordUsername}** has applied to become a scenario creator`,
            color: 0x5865F2, // Discord blurple
            fields: [
              { name: "Discord ID", value: ctx.user.discordUserId, inline: true },
              { name: "Applied", value: new Date().toISOString(), inline: true },
              { name: "Reason", value: input.reason, inline: false },
            ],
          }
        );
      } catch (error) {
        console.error("[player.applyForCreator] Failed to send notification:", error);
        // Don't fail the mutation if notification fails
      }

      return updatedPlayer;
    }),

  /**
   * List all pending creator applications (admin only)
   */
  listPendingCreatorApplications: adminProcedure.query(async () => {
    console.log("[player.listPendingCreatorApplications] Fetching pending applications");
    return await playerService.listPendingCreatorApplications();
  }),

  /**
   * Approve or reject a creator application (admin only)
   */
  updateCreatorStatus: adminProcedure
    .input(
      z.object({
        playerId: z.string(),
        status: z.enum(["approved", "rejected"]),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[player.updateCreatorStatus] ${input.status} application for player:`, input.playerId);
      
      const updatedPlayer = await playerService.updateCreatorStatus(
        input.playerId,
        input.status
      );

      // Optionally send notification back to admin channel
      try {
        const statusEmoji = input.status === "approved" ? "✅" : "❌";
        const statusColor = input.status === "approved" ? 0x43B581 : 0xF04747; // Green or red
        
        await postEmbed(
          Resource.AdminNotificationChannelId.value,
          {
            title: `${statusEmoji} Creator Application ${input.status === "approved" ? "Approved" : "Rejected"}`,
            description: `**${updatedPlayer.discordUsername}** has been ${input.status}`,
            color: statusColor,
            fields: [
              { name: "Discord ID", value: updatedPlayer.discordUserId, inline: true },
              { name: "Updated", value: new Date().toISOString(), inline: true },
            ],
          }
        );
      } catch (error) {
        console.error("[player.updateCreatorStatus] Failed to send notification:", error);
      }

      return updatedPlayer;
    }),

  /**
   * Backfill slugs for all guilds and scenarios (admin only)
   */
  backfillSlugs: adminProcedure.mutation(async () => {
    console.log('[player.backfillSlugs] Starting slug backfill...');
    
    const { GuildEntity } = await import("../../db/entities/guild.entity");
    const { ScenarioEntity } = await import("../../db/entities/scenario.entity");
    
    function slugify(text: string): string {
      return text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
    }
    
    const results = {
      guildsProcessed: 0,
      guildsUpdated: 0,
      scenariosProcessed: 0,
      scenariosUpdated: 0,
    };
    
    // Backfill guild slugs
    const guildsResult = await GuildEntity.scan.go();
    const guilds = guildsResult.data;
    const usedGuildSlugs = new Set<string>();
    
    for (const guild of guilds) {
      results.guildsProcessed++;
      
      if (guild.slug) {
        usedGuildSlugs.add(guild.slug);
        continue;
      }
      
      const baseSlug = slugify(guild.name);
      let slug = baseSlug;
      let suffix = 1;
      
      while (usedGuildSlugs.has(slug)) {
        suffix++;
        slug = `${baseSlug}-${suffix}`;
      }
      
      usedGuildSlugs.add(slug);
      
      await GuildEntity.patch({ id: guild.id })
        .set({ slug })
        .go();
      
      console.log(`[backfillSlugs] Updated guild ${guild.name} with slug: ${slug}`);
      results.guildsUpdated++;
    }
    
    // Backfill scenario slugs
    const scenariosResult = await ScenarioEntity.scan.go();
    const scenarios = scenariosResult.data;
    const usedScenarioSlugs = new Set<string>();
    
    for (const scenario of scenarios) {
      results.scenariosProcessed++;
      
      if (scenario.slug) {
        usedScenarioSlugs.add(scenario.slug);
        continue;
      }
      
      const baseSlug = slugify(scenario.name);
      let slug = baseSlug;
      let suffix = 1;
      
      while (usedScenarioSlugs.has(slug)) {
        suffix++;
        slug = `${baseSlug}-${suffix}`;
      }
      
      usedScenarioSlugs.add(slug);
      
      await ScenarioEntity.patch({ id: scenario.id })
        .set({ slug })
        .go();
      
      console.log(`[backfillSlugs] Updated scenario ${scenario.name} with slug: ${slug}`);
      results.scenariosUpdated++;
    }
    
    console.log('[player.backfillSlugs] Backfill complete:', results);
    return results;
  }),
});
