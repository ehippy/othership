// Auto-discover all avatar images at build time
const avatarModules = import.meta.glob('/public/assets/avatars/*.{png,jpg,jpeg,gif,webp}', { 
  eager: true,
  as: 'url' 
});

// Extract just the filenames (without full path)
export const AVATAR_LIST = Object.keys(avatarModules).map(path => {
  const filename = path.split('/').pop()!;
  return `/assets/avatars/${filename}`;
});

// Get a random avatar
export function getRandomAvatar(): string {
  return AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)];
}

// Group avatars by prefix if they follow a naming convention (e.g., "alien-1.png", "robot-2.png")
export function getAvatarsByCategory(): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  
  AVATAR_LIST.forEach(path => {
    const filename = path.split('/').pop()!;
    const match = filename.match(/^([a-z]+)-/i);
    const category = match ? match[1] : 'other';
    
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(path);
  });
  
  return categories;
}
