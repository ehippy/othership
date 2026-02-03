import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { useOptionalAuth } from "@/lib/hooks/useAuth";
import { useGuildSelection } from "@/lib/hooks/useGuildSelection";
import { trpc } from "@/lib/api/trpc";
import { formatGameName, getAvatarUrl } from "@/lib/utils";

export default function GamePage() {
  const params = useParams<{ guildSlug: string; gameSlug: string }>();
  const { isLoading: authLoading, user, logout } = useOptionalAuth();
  const { selectedGuild, selectGuild, guilds } = useGuildSelection();

  // Fetch game data using slug-based lookup
  const { data: game, isLoading: gameLoading } = trpc.game.getByGuildSlugAndGameSlug.useQuery(
    { guildSlug: params.guildSlug || "", gameSlug: params.gameSlug || "" },
    { enabled: !!params.guildSlug && !!params.gameSlug }
  );

  // Fetch current roster (for staging games)
  const { data: roster, refetch: refetchRoster } = trpc.game.getCurrentRoster.useQuery(
    { guildId: game?.discordGuildId || "" },
    { 
      enabled: !!game?.discordGuildId && game?.status === "staging",
      refetchInterval: game?.status === "staging" ? 10000 : false, // Poll every 10s during staging
    }
  );

  // Fetch guild info for display
  const userGuild = guilds?.find((g) => g.id === game?.discordGuildId);

  // Calculate countdown for staging games
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (game?.status === "staging" && game.gameStartTime) {
      const updateCountdown = () => {
        const now = new Date().getTime();
        const start = new Date(game.gameStartTime).getTime();
        const diff = start - now;

        if (diff <= 0) {
          setTimeRemaining("Starting now!");
          return;
        }

        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}m ${seconds}s`);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [game?.status, game?.gameStartTime]);

  // Check if user has management permissions
  const canManage = !!user && userGuild?.canManage === true;

  // Show loading
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }
  
  if (gameLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white pt-16">
        <div className="text-center">
          <p className="text-gray-400">Loading game...</p>
        </div>
        <TopBar
          avatar={user?.avatar || null}
          discordUserId={user?.discordUserId || null}
          username={user?.username || null}
          onLogout={logout}
          onSelectGuild={selectGuild}
          selectedGuildName={selectedGuild?.name}
          selectedGuildId={selectedGuild?.id || null}
          selectedGuildIcon={selectedGuild?.icon || null}
        />
      </main>
    );
  }

  // Show not found
  if (!game) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white pt-16">
        <div className="text-center">
          <p className="text-gray-400">Game not found</p>
          <a href={`/${params.guildSlug}`} className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">
            ← Back to guild
          </a>
        </div>
        <TopBar
          avatar={user?.avatar || null}
          discordUserId={user?.discordUserId || null}
          username={user?.username || null}
          onLogout={logout}
          onSelectGuild={selectGuild}
          selectedGuildName={selectedGuild?.name}
          selectedGuildId={selectedGuild?.id || null}
          selectedGuildIcon={selectedGuild?.icon || null}
        />
      </main>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      staging: "bg-yellow-900 text-yellow-200",
      character_creation: "bg-blue-900 text-blue-200",
      active: "bg-green-900 text-green-200",
      tpk: "bg-red-900 text-red-200",
      won: "bg-purple-900 text-purple-200",
      abandoned: "bg-gray-700 text-gray-300",
    };

    const labels = {
      staging: "⏳ Staging",
      character_creation: "📝 Character Creation",
      active: "🎮 Active",
      tpk: "💀 Total Party Kill",
      won: "🎉 Victory",
      abandoned: "❌ Abandoned",
    };

    return (
      <span className={`px-3 py-1 rounded text-sm font-semibold ${styles[status as keyof typeof styles] || styles.abandoned}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getPhaseMessage = (status: string) => {
    const messages = {
      staging: `Game starts soon - players can still opt in/out (${roster?.length || 0}/${game.minPlayers}-${game.maxPlayers})`,
      character_creation: "Name and build your character",
      active: "Game in progress",
      tpk: "All crew members have perished",
      won: "Mission accomplished!",
      abandoned: "Game was abandoned",
    };

    return messages[status as keyof typeof messages] || "";
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Content area */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">

          {/* Game header */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-indigo-400 mb-2">{formatGameName(game.slug)}</h1>
                <p className="text-xl text-gray-300">{game.scenarioName}</p>
              </div>
              {getStatusBadge(game.status)}
            </div>

            {/* Countdown timer for staging */}
            {game.status === "staging" && timeRemaining && (
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-4 mt-4">
                <p className="text-yellow-200 font-semibold">
                  ⏱️ Game starts in: {timeRemaining}
                </p>
              </div>
            )}

            {/* Phase message */}
            <p className="text-gray-400 mt-4">{getPhaseMessage(game.status)}</p>
          </div>

          {/* Player roster */}
          {(game.status === "staging" || game.status === "character_creation") && roster && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">
                {game.status === "staging" ? "Current Roster" : "Players"}
              </h2>
              {roster.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {roster.map((member: any) => (
                      <div
                        key={member.playerId}
                        className="flex items-center gap-3 bg-gray-900 rounded p-3"
                      >
                        <img
                          src={getAvatarUrl(member.playerId, member.playerAvatar)}
                          alt={member.playerUsername}
                          className="w-10 h-10 rounded-full"
                        />
                        <span className="text-gray-300">{member.playerUsername}</span>
                      </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No players in roster yet</p>
              )}
            </div>
          )}

          {/* Map placeholder */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Map</h2>
            <div className="aspect-video bg-gray-900 rounded flex items-center justify-center">
              <p className="text-gray-500">Map rendering with Pixi.js coming soon...</p>
            </div>
          </div>

          {/* Character sheets placeholder */}
          {(game.status === "character_creation" || game.status === "active") && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Character Sheets</h2>
              <div className="bg-gray-900 rounded p-8 text-center">
                <p className="text-gray-500">Character creation interface coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top bar in hamburger mode */}
      <TopBar
        avatar={user?.avatar || null}
        discordUserId={user?.discordUserId || null}
        username={user?.username || null}
        onLogout={logout}
        onSelectGuild={selectGuild}
        selectedGuildName={selectedGuild?.name}
        selectedGuildId={selectedGuild?.id || null}
        selectedGuildIcon={selectedGuild?.icon || null}
        mode="hamburger"
      />
    </main>
  );
}
