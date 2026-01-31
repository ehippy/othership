"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken, isAuthenticated, clearToken, getUsername, getAvatar, getDiscordUserId } from "@/lib/auth";
import { BottomDock } from "@/components/BottomDock";

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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pb-16">
      {/* Main content area */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Othership</h1>
          <p className="text-xl text-gray-400">
            Cooperative survival horror in space
          </p>
          <p className="mt-8 text-sm text-gray-500">
            Select a server from the dock below to get started
          </p>
        </div>
      </div>

      {/* Bottom dock */}
      <BottomDock
        avatar={avatar}
        discordUserId={discordUserId}
        username={username}
        onLogout={handleLogout}
      />
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
