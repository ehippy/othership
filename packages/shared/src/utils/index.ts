/**
 * Format a game slug as Title Case display name
 * Handles both old format (dying-signal-gTKNJGK) and new format (abandoned-mining-station or abandoned-mining-station-2)
 */
export function formatGameName(slug: string): string {
  // Remove numeric suffix if present (e.g., "-2", "-3" from multiple runs of same scenario)
  const nameOnly = slug.replace(/-\d+$/, '');
  
  // Split by hyphens and capitalize each word
  return nameOnly
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
