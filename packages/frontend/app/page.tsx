"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken, isAuthenticated, clearToken, getUsername, getAvatar, getDiscordUserId, getAvatarUrl } from "@/lib/auth";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = React.useState(true);
  const [username, setUsername] = React.useState<string | null>(null);
  const [avatar, setAvatar] = React.useState<string | null>(null);
  const [discordUserId, setDiscordUserId] = React.useState<string | null>(null);

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const token = searchParams.get("token");
    
    if (token) {
      // Store token and clean URL
      setToken(token);
      window.history.replaceState({}, "", "/");
      setIsChecking(false);
      setUsername(getUsername());
      setAvatar(getAvatar());
      setDiscordUserId(getDiscordUserId());
    } else if (!isAuthenticated()) {
      // Redirect to login if not authenticated
      router.push("/login");
    } else {
      // Already authenticated
      setIsChecking(false);
      setUsername(getUsername());
      setAvatar(getAvatar());
      setDiscordUserId(getDiscordUserId());
    }
  }, [searchParams, router]);

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  // Don't render anything while checking authentication
  if (isChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-3">
            {avatar && discordUserId && (
              <img
                src={getAvatarUrl(discordUserId, avatar)}
                alt="Discord avatar"
                className="w-8 h-8 rounded-full"
              />
            )}
            {username && (
              <span className="text-gray-400 text-sm">{username}</span>
            )}
            <button
              onClick={handleLogout}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
            >
              Logout
            </button>
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4">Othership</h1>
        <p className="text-xl text-gray-400">
          Cooperative survival horror in space
        </p>
        <p className="mt-8 text-sm text-gray-500">
          Game interface coming soon...
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
      <HomeContent />
    </Suspense>
  );
}
