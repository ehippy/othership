/**
 * Game name generation utilities for creating creepy scifi game slugs
 */

const ADJECTIVES = [
  "void",
  "hollow",
  "drift",
  "cold",
  "dead",
  "ghost",
  "phantom",
  "rogue",
  "silent",
  "frozen",
  "lost",
  "dark",
  "crimson",
  "bleeding",
  "cursed",
  "broken",
  "shadowed",
  "empty",
  "dying",
  "haunted",
] as const;

const NOUNS = [
  "corpse",
  "ooze",
  "signal",
  "tomb",
  "wreck",
  "echo",
  "ship",
  "hulk",
  "station",
  "beacon",
  "vault",
  "cargo",
  "crew",
  "horror",
  "abyss",
  "depths",
  "grave",
  "relic",
  "void",
  "fragment",
] as const;

/**
 * Generate a random creepy scifi game slug
 * Format: adjective-noun-gID (e.g., "void-ooze-g123abc")
 */
export function generateGameSlug(gameId: string): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective}-${noun}-g${gameId}`;
}

/**
 * Parse a game slug to extract the game ID
 * Returns null if slug is invalid
 */
export function parseGameSlug(slug: string): string | null {
  // Extract everything after "g" prefix at the end (6 chars)
  const match = slug.match(/-g([A-Z0-9]{6})$/);
  if (!match) return null;
  return match[1];
}

/**
 * Generate a human-readable game name (without the ID suffix)
 * Format: "Adjective Noun" (e.g., "Void Ooze")
 */
export function generateGameDisplayName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  
  // Capitalize first letter of each word
  const capitalizedAdj = adjective.charAt(0).toUpperCase() + adjective.slice(1);
  const capitalizedNoun = noun.charAt(0).toUpperCase() + noun.slice(1);
  
  return `${capitalizedAdj} ${capitalizedNoun}`;
}
