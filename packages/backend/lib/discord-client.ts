import { Resource } from "sst";

const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * Post a message to a Discord channel
 */
export async function postToChannel(
  channelId: string,
  content: string
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
    const error = await response.text();
    throw new Error(`Failed to post to Discord: ${error}`);
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
  }
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
    const error = await response.text();
    throw new Error(`Failed to post embed to Discord: ${error}`);
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
      return null;
    }
    const error = await response.text();
    throw new Error(`Failed to fetch guild info: ${error}`);
  }

  const guild = await response.json();
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
    const error = await response.text();
    throw new Error(`Failed to fetch guild channels: ${error}`);
  }

  const channels = await response.json();
  
  // Filter to text channels only (type 0)
  return channels
    .filter((channel: any) => channel.type === 0)
    .map((channel: any) => ({
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
