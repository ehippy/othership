/**
 * Format a game slug as Title Case display name
 * Example: "dying-signal-gTKNJGK" -> "Dying Signal"
 */
export function formatGameName(slug: string): string {
  // Remove the game ID suffix (-gXXXXXX)
  const nameOnly = slug.replace(/-g[A-Z0-9]{6}$/, '');
  
  // Split by hyphens and capitalize each word
  return nameOnly
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
