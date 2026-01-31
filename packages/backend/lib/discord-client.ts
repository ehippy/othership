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
