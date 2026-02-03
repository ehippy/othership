import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { Resource } from "sst";
import { playerService } from "../../db/services";
import { guildMembershipService } from "../../db/services/guild-membership.service";
import { signToken } from "../../lib/auth";

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  permissions: string;
}

/**
 * Handle Discord OAuth callback
 */
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const code = event.queryStringParameters?.code;
  const state = event.queryStringParameters?.state;

  console.log("Auth callback invoked:", {
    hasCode: !!code,
    hasState: !!state,
  });

  if (!code) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "text/plain",
      },
      body: "Missing authorization code",
    };
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: Resource.DiscordApplicationId.value,
        client_secret: (Resource as any).DiscordClientSecret.value,
        grant_type: "authorization_code",
        code,
        redirect_uri: `https://${event.requestContext.domainName}/auth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("Discord token exchange failed:", tokenResponse.status, errorBody);
      throw new Error(`Failed to exchange code for token: ${tokenResponse.status} ${errorBody}`);
    }

    const tokens = (await tokenResponse.json()) as DiscordTokenResponse;

    // Calculate token expiration timestamp (current time + expires_in seconds)
    const tokenExpiresAt = Date.now() + (tokens.expires_in * 1000);

    // Fetch user profile
    const userResponse = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const user = (await userResponse.json()) as DiscordUser;

    // Fetch user's guilds
    const guildsResponse = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!guildsResponse.ok) {
      throw new Error("Failed to fetch guilds");
    }

    const guilds = (await guildsResponse.json()) as DiscordGuild[];

    // Fetch Guild records to get botInstalled status and slug
    const { guildService } = await import("../../db/services");
    const guildRecords = await Promise.all(
      guilds.map(async (guild) => {
        try {
          return await guildService.getGuildByDiscordId(guild.id);
        } catch {
          return null;
        }
      })
    );
    const guildDataMap = new Map(guildRecords.filter(g => g !== null).map(g => [g!.discordGuildId, g]));

    // Map guilds to the format expected by our database (include permissions for access control)
    const mappedGuilds = guilds.map(guild => {
      const guildData = guildDataMap.get(guild.id);
      return {
        id: guild.id,
        name: guild.name,
        slug: guildData?.slug,
        icon: guild.icon || undefined,
        permissions: guild.permissions, // Discord permission bitfield for this user in this guild
        botInstalled: guildData?.botInstalled ?? false,
      };
    });

    // Create or update player (without gameId - they'll join games later)
    const existingPlayers = await playerService.getPlayersByDiscordUser(user.id);
    
    let player;
    if (existingPlayers.length > 0) {
      // Update existing player with latest Discord info and tokens
      player = await playerService.updatePlayer({
        playerId: existingPlayers[0].id,
        discordUsername: user.username,
        discordDisplayName: user.global_name,
        discordAvatar: user.avatar,
        discordAccessToken: tokens.access_token,
        discordRefreshToken: tokens.refresh_token,
        discordTokenExpiresAt: tokenExpiresAt,
      });
      // Update guilds separately
      player = await playerService.updateGuilds(player.id, mappedGuilds);
    } else {
      // Create new player without a game (they'll join later)
      player = await playerService.createPlayer({
        discordUserId: user.id,
        discordUsername: user.username,
        discordDisplayName: user.global_name,
        discordAvatar: user.avatar,
        gameId: "", // Empty gameId - player not in a game yet
        discordAccessToken: tokens.access_token,
        discordRefreshToken: tokens.refresh_token,
        discordTokenExpiresAt: tokenExpiresAt,
      });
      // Update guilds after creation
      player = await playerService.updateGuilds(player.id, mappedGuilds);
    }

    // Sync guild memberships (creates/updates/deletes memberships based on current guilds)
    await guildMembershipService.syncMemberships(
      user.id,
      mappedGuilds,
      user.global_name || user.username,
      user.avatar || null
    );

    // Refetch player to ensure we have all fields including creator status and admin flag
    const fullPlayer = await playerService.getPlayer(player.id);
    if (!fullPlayer) {
      throw new Error("Failed to fetch player after update");
    }

    // Sign JWT (use display name if available, fallback to username)
    const token = signToken(
      fullPlayer.id,
      user.id,
      user.global_name || user.username,
      user.avatar,
      fullPlayer.creatorApplicationStatus || 'none',
      fullPlayer.isAdmin || false
    );

    // Redirect to frontend with token
    // Decode the frontend URL from the state parameter
    let frontendUrl = "http://localhost:3002"; // Fallback
    if (state) {
      try {
        frontendUrl = Buffer.from(state, "base64").toString("utf-8");
      } catch (e) {
        console.error("Failed to decode state parameter:", e);
      }
    }
    
    console.log("Redirecting to frontend, duh:", `${frontendUrl}/?token=...`);
    
    const response: APIGatewayProxyResultV2 = {
      statusCode: 302,
      headers: {
        "Location": `${frontendUrl}/?token=${token}`,
      },
      body: "",
    };
    
    console.log("Response being returned:", JSON.stringify(response));
    
    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain",
      },
      body: "Authentication failed",
    };
  }
}