import { Resource } from "sst";
import { guildService } from "../db/services";

const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * Check if the bot is still a member of a guild
 */
async function checkBotInGuild(guildId: string): Promise<boolean> {
  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}`,
    {
      headers: {
        Authorization: `Bot ${Resource.DiscordBotToken.value}`,
      },
    }
  );
  
  // 200: Bot is in guild
  // 403: Bot lacks permissions (but is in guild) - error code 50001 means not in guild
  // 404: Guild doesn't exist or bot not in guild
  if (response.ok) {
    return true;
  }
  
  if (response.status === 404) {
    return false; // Guild doesn't exist or bot definitely not in it
  }
  
  if (response.status === 403) {
    try {
      const error = await response.json();
      // Error code 50001 = Missing Access (bot not in guild)
      if (error.code === 50001) {
        return false;
      }
    } catch {
      // Couldn't parse error, assume network issue
    }
  }
  
  // For other errors (rate limits, server errors), assume bot is still in guild
  return true;
}

/**
 * Handle Discord API errors, including bot removal detection
 */
async function handleDiscordError(response: Response, guildId?: string): Promise<void> {
  const status = response.status;
  const errorText = await response.text();
  
  // If we got a guild-related error, do an authoritative check
  if (guildId && (status === 403 || status === 404)) {
    console.log(`[discord-client] Discord API error ${status} for guild ${guildId}, checking bot membership...`);
    
    const stillInGuild = await checkBotInGuild(guildId);
    
    if (!stillInGuild) {
      console.log(`[discord-client] Confirmed: Bot is not in guild ${guildId}`);
      try {
        const guild = await guildService.getGuildByDiscordId(guildId);
        await guildService.markBotUninstalled(guildId);
        console.log(`[discord-client] Marked guild ${guildId} as bot uninstalled`);
        
        // Send notification to admin channel about bot removal
        if (guild) {
          try {
            await postEmbed(
              Resource.AdminNotificationChannelId.value,
              {
                title: "🚫 Bot Removed from Server",
                description: `**${guild.name}** has removed the bot`,
                color: 0xF04747, // Red
                fields: [
                  { name: "Guild ID", value: guildId, inline: true },
                  { name: "Removed", value: new Date().toISOString(), inline: true },
                ],
              }
            );
          } catch (notifyError) {
            console.error(`[discord-client] Failed to send removal notification:`, notifyError);
            // Don't fail the removal if notification fails
          }
        }
      } catch (err) {
        console.error(`[discord-client] Failed to mark guild ${guildId} as uninstalled:`, err);
      }
    } else {
      console.log(`[discord-client] Bot is still in guild ${guildId}, error was likely a permission issue`);
    }
  }
  
  throw new Error(`Discord API error (${status}): ${errorText}`);
}

/**
 * Post a message to a Discord channel
 */
export async function postToChannel(
  channelId: string,
  content: string,
  guildId?: string
): Promise<void> {
  const response = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${Resource.DiscordBotToken.value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    }
  );

  if (!response.ok) {
    await handleDiscordError(response, guildId);
  }
}

/**
 * Post an embed message to a Discord channel
 */
export async function postEmbed(
  channelId: string,
  embed: {
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  },
  guildId?: string
): Promise<void> {
  const response = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${Resource.DiscordBotToken.value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
    }
  );

  if (!response.ok) {
    await handleDiscordError(response, guildId);
  }
}

/**
 * Reply to a Discord interaction
 */
export async function replyToInteraction(
  interactionId: string,
  interactionToken: string,
  content: string
): Promise<void> {
  const response = await fetch(
    `${DISCORD_API_BASE}/interactions/${interactionId}/${interactionToken}/callback`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: { content },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to reply to interaction: ${error}`);
  }
}

/**
 * Fetch guild information from Discord API
 */
export async function fetchGuildInfo(guildId: string): Promise<{
  id: string;
  name: string;
  icon: string | null;
} | null> {
  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}`,
    {
      headers: {
        Authorization: `Bot ${Resource.DiscordBotToken.value}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      // Guild doesn't exist or bot was removed
      await handleDiscordError(response, guildId);
      return null;
    }
    await handleDiscordError(response, guildId);
  }

  const guild = await response.json() as {
    id: string;
    name: string;
    icon: string | null;
  };
  return {
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
  };
}

/**
 * Fetch text channels from a Discord guild
 */
export async function fetchGuildChannels(guildId: string): Promise<Array<{
  id: string;
  name: string;
  type: number;
}>> {
  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/channels`,
    {
      headers: {
        Authorization: `Bot ${Resource.DiscordBotToken.value}`,
      },
    }
  );

  if (!response.ok) {
    await handleDiscordError(response, guildId);
  }

  const channels = await response.json() as Array<{
    id: string;
    name: string;
    type: number;
  }>;
  
  // Filter to text channels only (type 0)
  return channels
    .filter((channel) => channel.type === 0)
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
    }));
}

/**
 * Validate bot has required permissions in a channel
 * Tests by attempting to send a message to the channel
 */
export async function validateChannelPermissions(
  guildId: string,
  channelId: string
): Promise<{ valid: boolean; missingPermissions: string[] }> {
  console.log('[validateChannelPermissions] Testing channel:', channelId, 'in guild:', guildId);
  
  // First check if we can read the channel
  const channelResponse = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}`,
    {
      headers: {
        Authorization: `Bot ${Resource.DiscordBotToken.value}`,
      },
    }
  );

  if (!channelResponse.ok) {
    console.error('[validateChannelPermissions] Cannot access channel:', channelResponse.status);
    await handleDiscordError(channelResponse, guildId);
    return { valid: false, missingPermissions: ['Channel not accessible - bot may not be in server'] };
  }

  // Test sending a message to verify permissions
  const messages = [
    "🛸 DERELICT station online. Emergency protocols now monitoring this channel.",
    "⚠️ DISTRESS BEACON DETECTED: DERELICT has established connection to this channel.",
    "🛸 DERELICT automated systems active. This channel is now under station surveillance.",
  ];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
  const testResponse = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${Resource.DiscordBotToken.value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        content: randomMessage,
      }),
    }
  );

  if (!testResponse.ok) {
    const errorText = await testResponse.text();
    console.error('[validateChannelPermissions] Message send failed:', testResponse.status, errorText);
    await handleDiscordError(testResponse, guildId);
    
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      return { valid: false, missingPermissions: [`HTTP ${testResponse.status}: ${errorText.slice(0, 100)}`] };
    }
    
    const missingPerms = [];
    
    // Discord error codes: https://discord.com/developers/docs/topics/opcodes-and-status-codes
    if (error.code === 50001) missingPerms.push('Missing Access');
    else if (error.code === 50013) missingPerms.push('Missing Permissions');
    else if (error.message) missingPerms.push(error.message);
    else missingPerms.push(`Discord Error ${error.code || testResponse.status}`);
    
    return { valid: false, missingPermissions: missingPerms };
  }

  console.log('[validateChannelPermissions] Permissions verified successfully');
  return { valid: true, missingPermissions: [] };
}
