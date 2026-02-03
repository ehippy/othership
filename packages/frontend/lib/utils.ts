import { formatGameName } from '@derelict/shared';

export { formatGameName };

/**
 * Get Discord avatar URL for a user
 */
export function getAvatarUrl(userId: string, avatarHash: string | null): string {
  if (!avatarHash) {
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
}

/**
 * Get Discord guild icon URL
 */
export function getGuildIconUrl(guildId: string, iconHash: string | null | undefined): string {
  if (!iconHash) {
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png`;
}

/**
 * Create a full guild URL path using just the slug
 */
export function createGuildPath(guildSlug: string): string {
  return `/${guildSlug}`;
}

/**
 * Create a game URL path: /guild-slug/game-slug
 */
export function createGamePath(guildSlug: string, gameSlug: string): string {
  return `/${guildSlug}/${gameSlug}`;
}
