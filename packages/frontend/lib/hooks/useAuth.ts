import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  setToken,
  isAuthenticated,
  clearToken,
  getUsername,
  getAvatar,
  getDiscordUserId,
} from "@/lib/auth";

interface User {
  username: string | null;
  avatar: string | null;
  discordUserId: string | null;
}

export function useAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      });
    } else if (!isAuthenticated()) {
      // Redirect to login if not authenticated
      router.push("/login");
    } else {
      // Already authenticated
      setIsLoading(false);
      setUser({
        username: getUsername(),
        avatar: getAvatar(),
        discordUserId: getDiscordUserId(),
      });
    }
  }, [searchParams, router]);

  const logout = () => {
    clearToken();
    router.push("/login");
  };

  return { isLoading, user, logout };
}
