import { PlayerEntity } from "../entities";
import { ulid } from "ulid";
import type { Player, DiscordGuild } from "@derelict/shared";
import { DISCORD_PERMISSIONS } from "@derelict/shared";
import { Resource } from "sst";

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordGuildResponse {
  id: string;
  name: string;
  icon?: string;
  permissions: string;
}

export const playerService = {
  /**
   * Create a new player
   */
  async createPlayer(params: {
    discordUserId: string;
    discordUsername: string;
    discordDisplayName?: string;
    discordAvatar?: string;
    gameId: string;
    discordAccessToken?: string;
    discordRefreshToken?: string;
    discordTokenExpiresAt?: number;
  }): Promise<Player> {
    const id = ulid();

    const result = await PlayerEntity.create({
      id,
      discordUserId: params.discordUserId,
      discordUsername: params.discordUsername,
      discordDisplayName: params.discordDisplayName,
      discordAvatar: params.discordAvatar,
      gameId: params.gameId,
      discordAccessToken: params.discordAccessToken,
      discordRefreshToken: params.discordRefreshToken,
      discordTokenExpiresAt: params.discordTokenExpiresAt,
    }).go();

    return result.data as Player;
  },

  /**
   * Get player by ID
   */
  async getPlayer(playerId: string): Promise<Player | null> {
    try {
      const result = await PlayerEntity.get({ id: playerId }).go();
      return result.data as Player;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get all players in a game
   */
  async getPlayersByGame(gameId: string): Promise<Player[]> {
    const result = await PlayerEntity.query.byGame({ gameId }).go();
    return result.data as Player[];
  },

  /**
   * Get player by Discord user in a specific game
   */
  async getPlayerByDiscordUser(
    discordUserId: string,
    gameId: string
  ): Promise<Player | null> {
    const result = await PlayerEntity.query
      .byDiscordUser({ discordUserId, gameId })
      .go();

    return result.data.length > 0 ? (result.data[0] as Player) : null;
  },

  /**
   * Get all players by Discord user ID (across all games)
   */
  async getPlayersByDiscordUser(discordUserId: string): Promise<Player[]> {
    const result = await PlayerEntity.query
      .byDiscordUser({ discordUserId })
      .go();
    return result.data as Player[];
  },

  /**
   * Set active character for player
   */
  async setActiveCharacter(
    playerId: string,
    characterId: string
  ): Promise<Player> {
    const result = await PlayerEntity.patch({ id: playerId })
      .set({ activeCharacterId: characterId })
      .go();

    return result.data as Player;
  },

  /**
   * Update player guilds
   */
  async updateGuilds(
    playerId: string,
    guilds: Array<{ id: string; name: string; icon?: string; permissions?: string; botInstalled?: boolean }>
  ): Promise<Player> {
    const result = await PlayerEntity.patch({ id: playerId })
      .set({ guilds })
      .go();

    return result.data as Player;
  },

  /**
   * Get player guilds with management permissions computed
   */
  async getPlayerGuildsWithPermissions(playerId: string): Promise<Array<DiscordGuild & { canManage: boolean; botInstalled: boolean }>> {
    const player = await PlayerEntity.get({ id: playerId }).go();
    if (!player.data) {
      return [];
    }

    const guilds = (player.data as Player).guilds || [];
    
    return guilds.map(guild => {
      const canManage = guild.permissions 
        ? (BigInt(guild.permissions) & BigInt(DISCORD_PERMISSIONS.ADMINISTRATOR | DISCORD_PERMISSIONS.MANAGE_GUILD)) !== BigInt(0)
        : false;
      
      return {
        ...guild,
        canManage,
        botInstalled: guild.botInstalled ?? false,
      };
    });
  },

  /**
   * Update player Discord info (username and avatar)
   */
  async updatePlayer(params: {
    playerId: string;
    discordUsername?: string;
    discordDisplayName?: string;
    discordAvatar?: string;
    discordAccessToken?: string;
    discordRefreshToken?: string;
    discordTokenExpiresAt?: number;
  }): Promise<Player> {
    const updates: Record<string, any> = {};
    if (params.discordUsername !== undefined) {
      updates.discordUsername = params.discordUsername;
    }
    if (params.discordDisplayName !== undefined) {
      updates.discordDisplayName = params.discordDisplayName;
    }
    if (params.discordAvatar !== undefined) {
      updates.discordAvatar = params.discordAvatar;
    }
    if (params.discordAccessToken !== undefined) {
      updates.discordAccessToken = params.discordAccessToken;
    }
    if (params.discordRefreshToken !== undefined) {
      updates.discordRefreshToken = params.discordRefreshToken;
    }
    if (params.discordTokenExpiresAt !== undefined) {
      updates.discordTokenExpiresAt = params.discordTokenExpiresAt;
    }

    const result = await PlayerEntity.patch({ id: params.playerId })
      .set(updates)
      .go();

    return result.data as Player;
  },

  /**
   * Refresh Discord access token using refresh token
   */
  async refreshDiscordToken(playerId: string): Promise<{ accessToken: string; expiresAt: number } | null> {
    const player = await PlayerEntity.get({ id: playerId }).go();
    if (!player.data) {
      return null;
    }

    const refreshToken = (player.data as any).discordRefreshToken;
    if (!refreshToken) {
      console.error("[refreshDiscordToken] No refresh token available for player:", playerId);
      return null;
    }

    try {
      const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: Resource.DiscordApplicationId.value,
          client_secret: (Resource as any).DiscordClientSecret.value,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        console.error("[refreshDiscordToken] Failed to refresh token:", tokenResponse.status);
        return null;
      }

      const tokens = await tokenResponse.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };
      const expiresAt = Date.now() + (tokens.expires_in * 1000);

      // Update stored tokens
      await PlayerEntity.patch({ id: playerId })
        .set({
          discordAccessToken: tokens.access_token,
          discordRefreshToken: tokens.refresh_token || refreshToken,
          discordTokenExpiresAt: expiresAt,
        })
        .go();

      return {
        accessToken: tokens.access_token,
        expiresAt,
      };
    } catch (error) {
      console.error("[refreshDiscordToken] Error refreshing token:", error);
      return null;
    }
  },

  /**
   * Get valid Discord access token (refresh if needed)
   */
  async getValidDiscordToken(playerId: string): Promise<string | null> {
    const player = await PlayerEntity.get({ id: playerId }).go();
    if (!player.data) {
      return null;
    }

    const accessToken = (player.data as any).discordAccessToken;
    const expiresAt = (player.data as any).discordTokenExpiresAt;

    // If token expires in less than 5 minutes, refresh it
    if (!accessToken || !expiresAt || expiresAt < Date.now() + (5 * 60 * 1000)) {
      console.log("[getValidDiscordToken] Token expired or expiring soon, refreshing...");
      const refreshed = await this.refreshDiscordToken(playerId);
      return refreshed?.accessToken || null;
    }

    return accessToken;
  },

  /**
   * Fetch fresh guilds from Discord API and update player record
   */
  async refreshGuildsFromDiscord(playerId: string): Promise<Array<DiscordGuild & { canManage: boolean; botInstalled: boolean }>> {
    const accessToken = await this.getValidDiscordToken(playerId);
    if (!accessToken) {
      console.error("[refreshGuildsFromDiscord] No valid access token available");
      throw new Error("Unable to fetch guilds: Discord authentication required");
    }

    try {
      const guildsResponse = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!guildsResponse.ok) {
        console.error("[refreshGuildsFromDiscord] Failed to fetch guilds:", guildsResponse.status);
        throw new Error("Failed to fetch guilds from Discord");
      }

      const guilds = (await guildsResponse.json()) as DiscordGuildResponse[];

      // Fetch Guild records to get botInstalled status
      const guildRecords = await Promise.all(
        guilds.map(async (guild) => {
          try {
            const { guildService } = await import("./guild.service");
            return await guildService.getGuildByDiscordId(guild.id);
          } catch {
            return null;
          }
        })
      );
      const guildStatusMap = new Map(guildRecords.filter(g => g !== null).map(g => [g!.discordGuildId, g!.botInstalled]));

      const mappedGuilds: DiscordGuild[] = guilds.map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon || undefined,
        permissions: guild.permissions,
        botInstalled: guildStatusMap.get(guild.id) ?? false,
      }));

      // Update player's guilds in database
      await this.updateGuilds(playerId, mappedGuilds);

      // Return with canManage flags
      return mappedGuilds.map(guild => {
        const canManage = guild.permissions 
          ? (BigInt(guild.permissions) & BigInt(DISCORD_PERMISSIONS.ADMINISTRATOR | DISCORD_PERMISSIONS.MANAGE_GUILD)) !== BigInt(0)
          : false;
        
        return {
          ...guild,
          canManage,
          botInstalled: guild.botInstalled ?? false,
        };
      });
    } catch (error) {
      console.error("[refreshGuildsFromDiscord] Error:", error);
      throw error;
    }
  },
};
