export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getUsername(): string | null {
  const token = getToken();
  if (!token) return null;
  
  try {
    // Decode JWT (just the payload, no verification needed on client)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.discordUsername || null;
  } catch {
    return null;
  }
}

export function getAvatar(): string | null {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.discordAvatar || null;
  } catch {
    return null;
  }
}

export function getDiscordUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.discordUserId || null;
  } catch {
    return null;
  }
}

export function getAvatarUrl(discordUserId: string, avatarHash: string | null): string {
  if (!avatarHash) {
    // Default Discord avatar
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUserId) % 5}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${discordUserId}/${avatarHash}.png`;
}
