"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { setToken, isAuthenticated, clearToken, getUsername, getAvatar, getDiscordUserId } from "@/lib/auth";
import { BottomDock } from "@/components/BottomDock";
import { trpc } from "@/lib/api/trpc";

interface Guild {
  id: string;
  name: string;
  icon?: string;
  botInstalled?: boolean;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = React.useState(true);
  const [username, setUsername] = React.useState<string | null>(null);
  const [avatar, setAvatar] = React.useState<string | null>(null);
  const [discordUserId, setDiscordUserId] = React.useState<string | null>(null);
  const [selectedGuildId, setSelectedGuildId] = React.useState<string | null>(null);
  const [selectedGuildName, setSelectedGuildName] = React.useState<string | null>(null);
  const [selectedGuildIcon, setSelectedGuildIcon] = React.useState<string | null>(null);

  const { data: guilds } = trpc.player.getGuilds.useQuery(undefined, {
    enabled: isAuthenticated(),
  });

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

  // Restore guild selection from URL path
  useEffect(() => {
    if (!guilds || guilds.length === 0 || pathname === "/") return;

    const guildNameFromPath = decodeURIComponent(pathname.slice(1));
    const matchedGuild = guilds.find((g: Guild) => g.name === guildNameFromPath && g.botInstalled);
    
    if (matchedGuild) {
      setSelectedGuildId(matchedGuild.id);
      setSelectedGuildName(matchedGuild.name);
      setSelectedGuildIcon(matchedGuild.icon || null);
    }
  }, [guilds, pathname]);

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  const handleSelectGuild = (guildId: string, guildName: string, guildIcon?: string) => {
    setSelectedGuildId(guildId);
    setSelectedGuildName(guildName);
    setSelectedGuildIcon(guildIcon || null);
    
    // Push guild name to URL path
    router.push(`/${encodeURIComponent(guildName)}`);
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
          {selectedGuildName ? (
            <>
              <p className="text-xl text-gray-400 mb-2">
                {selectedGuildName}
              </p>
              <p className="text-sm text-gray-500">
                Guild context active
              </p>
            </>
          ) : (
            <>
              <p className="text-xl text-gray-400">
                Cooperative survival horror in space
              </p>
              <p className="mt-8 text-sm text-gray-500">
                Select a server from the dock below to get started
              </p>
            </>
          )}
        </div>
      </div>

      {/* Bottom dock */}
      <BottomDock
        avatar={avatar}
        discordUserId={discordUserId}
        username={username}
        onLogout={handleLogout}
        onSelectGuild={handleSelectGuild}
        selectedGuildName={selectedGuildName || undefined}
        selectedGuildId={selectedGuildId}
        selectedGuildIcon={selectedGuildIcon}
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
