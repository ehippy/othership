import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  setToken,
  isAuthenticated,
  clearToken,
  getUsername,
  getAvatar,
  getDiscordUserId,
  getCreatorApplicationStatus,
  getIsAdmin,
} from "@/lib/auth";

interface User {
  username: string | null;
  avatar: string | null;
  discordUserId: string | null;
  creatorApplicationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  isAdmin?: boolean;
}

export function useAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User>({
    username: null,
    avatar: null,
    discordUserId: null,
  });

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const token = searchParams.get("token");

    if (token) {
      // Store token and clean URL
      setToken(token);
      window.history.replaceState({}, "", "/");
      setIsLoading(false);
      setUser({
        username: getUsername(),
        avatar: getAvatar(),
        discordUserId: getDiscordUserId(),
        creatorApplicationStatus: getCreatorApplicationStatus(),
        isAdmin: getIsAdmin(),
      });
    } else if (!isAuthenticated()) {
      // Redirect to homepage if not authenticated
      navigate("/");
    } else {
      // Already authenticated
      setIsLoading(false);
      setUser({
        username: getUsername(),
        avatar: getAvatar(),
        discordUserId: getDiscordUserId(),
        creatorApplicationStatus: getCreatorApplicationStatus(),
        isAdmin: getIsAdmin(),
      });
    }
  }, [searchParams, navigate]);

  const logout = () => {
    clearToken();
    navigate("/");
  };

  return { isLoading, user, logout };
}

/**
 * Optional authentication - doesn't redirect to login
 * Use this for public pages that show different content for authenticated users
 */
export function useOptionalAuth() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const token = searchParams.get("token");

    if (token) {
      // Store token and clean URL
      setToken(token);
      window.history.replaceState({}, "", window.location.pathname);
      setIsLoading(false);
      setUser({
        username: getUsername(),
        avatar: getAvatar(),
        discordUserId: getDiscordUserId(),
        creatorApplicationStatus: getCreatorApplicationStatus(),
        isAdmin: getIsAdmin(),
      });
    } else if (isAuthenticated()) {
      // Already authenticated
      setIsLoading(false);
      setUser({
        username: getUsername(),
        avatar: getAvatar(),
        discordUserId: getDiscordUserId(),
        creatorApplicationStatus: getCreatorApplicationStatus(),
        isAdmin: getIsAdmin(),
      });
    } else {
      // Not authenticated - that's okay for optional auth
      setIsLoading(false);
      setUser(null);
    }
  }, [searchParams]);

  const logout = () => {
    clearToken();
    navigate("/");
  };

  return { isLoading, user, logout };
}
