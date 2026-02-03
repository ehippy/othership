import { formatGameName } from '@derelict/shared';

export { formatGameName };

/**
 * Generate a URL-safe slug from a guild name (preserves capitalization)
 * Removes special characters and replaces spaces with hyphens
 */
export function generateGuildSlug(guildName: string): string {
  return guildName
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Create a full guild URL path: slug-id
 */
export function createGuildPath(guildName: string, guildId: string): string {
  const slug = generateGuildSlug(guildName);
  return `/${slug}-${guildId}`;
}

/**
 * Parse a guild path to extract the guild ID
 * Returns null if path is invalid
 */
export function parseGuildPath(pathname: string): string | null {
  // Remove leading slash
  const path = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  
  // Extract ID from the end (everything after last hyphen)
  const lastHyphenIndex = path.lastIndexOf('-');
  if (lastHyphenIndex === -1) return null;
  
  const guildId = path.slice(lastHyphenIndex + 1);
  
  // Validate that ID looks like a Discord snowflake (numeric string)
  if (!/^\d+$/.test(guildId)) return null;
  
  return guildId;
}

/**
 * Parse a game slug to extract the game ID
 * Game slugs are in format: adjective-noun-gID
 * Returns null if slug is invalid
 */
export function parseGameSlug(slug: string): string | null {
  // Extract everything after "g" prefix at the end
  const match = slug.match(/-g([a-zA-Z0-9-]+)$/);
  if (!match) return null;
  return match[1];
}

/**
 * Create a game URL path: /guild-slug/game-slug
 */
export function createGamePath(guildSlug: string, gameSlug: string): string {
  return `/${guildSlug}/${gameSlug}`;
}
