import jwt from "jsonwebtoken";
import { Resource } from "sst";

const JWT_EXPIRY = "7d";

export interface TokenPayload {
  playerId: string;
  discordUserId: string;
  discordUsername: string;
  discordAvatar?: string;
}

/**
 * Sign a JWT token for a player
 */
export function signToken(playerId: string, discordUserId: string, discordUsername: string, discordAvatar?: string): string {
  const secret = (Resource as any).JwtSecret.value;
  
  const payload: TokenPayload = {
    playerId,
    discordUserId,
    discordUsername,
    discordAvatar,
  };

  return jwt.sign(payload, secret, {
    expiresIn: JWT_EXPIRY,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload {
  const secret = (Resource as any).JwtSecret.value;
  
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}
