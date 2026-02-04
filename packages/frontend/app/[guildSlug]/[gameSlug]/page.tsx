import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useOptionalAuth } from "@/lib/hooks/useAuth";
import { useGuildSelection } from "@/lib/hooks/useGuildSelection";
import { trpc } from "@/lib/api/trpc";
import { formatGameName, getAvatarUrl } from "@/lib/utils";
import { CharacterCreationWizard } from "@/components/game/CharacterCreationWizard";
import { PartyBar } from "@/components/game/PartyBar";

export default function GamePage() {
  const params = useParams<{ guildSlug: string; gameSlug: string }>();
  const { isLoading: authLoading, user } = useOptionalAuth();
  const { guilds } = useGuildSelection();

  // Fetch game data using slug-based lookup
  const { data: game, isLoading: gameLoading, refetch: refetchGame } = trpc.game.getByGuildSlugAndGameSlug.useQuery(
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

  // Fetch characters for the game (for character_creation and active phases)
  const { data: characters, refetch: refetchCharacters } = trpc.character.listByGame.useQuery(
    { gameId: game?.id || "" },
    { 
      enabled: !!game?.id && (game?.status === "character_creation" || game?.status === "active"),
      refetchInterval: game?.status === "character_creation" ? 30000 : false, // Poll every 30s during character creation
    }
  );

  // Find the current user's character
  const myCharacter = characters?.find((c: any) => c.playerId === user?.discordUserId);

  // Fetch guild info for display
  const userGuild = guilds?.find((g) => g.id === game?.discordGuildId);

  // Check if user is opted in by checking if they're in the roster
  const isOptedIn = roster?.some((member: any) => member.playerId === user?.discordUserId);

  // Begin character creation mutation
  const beginCharacterCreationMutation = trpc.game.beginCharacterCreation.useMutation({
    onSuccess: () => {
      // Refetch game to update status
      refetchGame();
    },
    onError: (error) => {
      alert(`Failed to start game: ${error.message}`);
    },
  });

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
  
  // Check if user can start the game (opted in OR admin/manager)
  const canStartGame = !!user && (isOptedIn || canManage);

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
      <Layout topBarMode="hamburger">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-400">Loading game...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show not found
  if (!game) {
    return (
      <Layout topBarMode="hamburger">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-400">Game not found</p>
            <a href={`/${params.guildSlug}`} className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">
              ← Back to guild
            </a>
          </div>
        </div>
      </Layout>
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
    <Layout topBarMode="hamburger" className="!p-0">
      {/* Character Creation Modal */}
      {game.status === "character_creation" && myCharacter && myCharacter.status === "creating" && (
        <CharacterCreationWizard 
          character={myCharacter} 
          onComplete={refetchCharacters} 
        />
      )}

      {/* Full-screen game HUD */}
      <div className="relative w-full h-screen overflow-x-hidden">
        
        {/* Game title overlay - top right */}
        <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2">
          <h1 className="text-lg font-bold text-indigo-400">{game.scenarioName}</h1>
          <div className="flex items-center gap-3 mt-1">
            {getStatusBadge(game.status)}
            {/* Countdown timer for staging */}
            {game.status === "staging" && timeRemaining && (
              <span className="text-xs text-yellow-300">
                ⏱️ Starts in: {timeRemaining}
              </span>
            )}
          </div>
          {/* Player count and start button for staging */}
          {game.status === "staging" && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-600">
              <span className="text-sm text-yellow-200">
                {roster?.length || 0}/{game.minPlayers}-{game.maxPlayers} players
              </span>
              {canStartGame && (
                <button
                  onClick={() => beginCharacterCreationMutation.mutate({ gameId: game.id })}
                  disabled={beginCharacterCreationMutation.isPending || (roster?.length || 0) < game.minPlayers}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-semibold rounded transition-colors"
                  title={(roster?.length || 0) < game.minPlayers ? `Need at least ${game.minPlayers} players` : "Start character creation"}
                >
                  {beginCharacterCreationMutation.isPending ? "Starting..." : "Start"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Full-bleed PixiJS map container */}
        <div className="absolute inset-0 w-full h-full bg-gray-900">
          {/* Map placeholder */}
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-500">Map rendering with Pixi.js coming soon...</p>
          </div>
        </div>

        {/* PartyBar */}
        <PartyBar 
          status={game.status} 
          roster={roster} 
          characters={characters}
          isAdmin={user?.isAdmin}
          onCharacterDeleted={() => {
            refetchCharacters();
          }}
        />
      </div>
    </Layout>
  );
}

