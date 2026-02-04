import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useOptionalAuth } from "@/lib/hooks/useAuth";
import { useGuildSelection } from "@/lib/hooks/useGuildSelection";
import { trpc } from "@/lib/api/trpc";
import { formatGameName, getAvatarUrl } from "@/lib/utils";
import { CharacterCreationWizard } from "@/components/game/CharacterCreationWizard";

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
      <div className="relative w-full h-screen overflow-hidden">
        
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

        {/* Bottom character bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-md border-t border-gray-700">
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto">
            {/* Show roster during staging */}
            {game.status === "staging" && roster && roster.length > 0 ? (
              roster.map((member: any) => (
                <div
                  key={member.playerId}
                  className="flex-shrink-0 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-600 rounded-lg px-3 py-2 min-w-[140px]"
                >
                  <img
                    src={getAvatarUrl(member.playerId, member.playerAvatar)}
                    alt={member.playerUsername}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{member.playerUsername}</p>
                    <p className="text-xs text-gray-400">Ready</p>
                  </div>
                </div>
              ))
            ) : (game.status === "character_creation" || game.status === "active") && characters && characters.length > 0 ? (
              characters.map((character: any) => (
                <div
                  key={character.id}
                  className="flex-shrink-0 bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-600 rounded-lg p-3 min-w-[280px]"
                >
                  {/* Header with avatar, name, and vitals */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className="relative flex-shrink-0">
                      {/* Character avatar - rounded rect */}
                      <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
                        {character.avatar ? (
                          <img 
                            src={character.avatar} 
                            alt={character.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold">
                            {character.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Player avatar - small circle overlay */}
                      <img
                        src={getAvatarUrl(character.playerId, character.playerAvatar)}
                        alt="Player"
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-gray-800"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{character.name}</p>
                      <p className="text-xs text-gray-400">
                        {character.status === "creating" ? "Creating..." : character.characterClass || "Ready"}
                      </p>
                    </div>
                    {/* Vitals */}
                    {character.status !== "creating" && (
                      <div className="flex gap-2 text-[10px]">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-gray-500 uppercase text-center">Health</p>
                          <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                (character.health / character.maxHealth) > 0.5 ? 'bg-green-500' :
                                (character.health / character.maxHealth) > 0.25 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${(character.health / character.maxHealth) * 100}%` }}
                            />
                          </div>
                          <p className="font-semibold text-gray-300 text-center text-[9px]">{character.health}/{character.maxHealth}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500 uppercase">Wounds</p>
                          <p className="font-semibold text-red-400">{character.wounds || 0}/{character.maxWounds || 2}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500 uppercase">Stress</p>
                          <p className="font-semibold text-yellow-400">{character.stress || 2}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats and Saves */}
                  {character.status !== "creating" && (
                    <div className="space-y-2">
                      {/* Stats */}
                      <div className="grid grid-cols-5 gap-1 text-center">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Strength</p>
                          <p className="text-xs font-semibold text-white">{character.stats.strength || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Speed</p>
                          <p className="text-xs font-semibold text-white">{character.stats.speed || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Intellect</p>
                          <p className="text-xs font-semibold text-white">{character.stats.intellect || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Combat</p>
                          <p className="text-xs font-semibold text-white">{character.stats.combat || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Social</p>
                          <p className="text-xs font-semibold text-white">{character.stats.social || 0}</p>
                        </div>
                      </div>

                      {/* Saves */}
                      <div className="grid grid-cols-3 gap-1 text-center border-t border-gray-700 pt-2">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Sanity</p>
                          <p className="text-xs font-semibold text-indigo-400">{character.saves.sanity || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Fear</p>
                          <p className="text-xs font-semibold text-indigo-400">{character.saves.fear || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Body</p>
                          <p className="text-xs font-semibold text-indigo-400">{character.saves.body || 0}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="w-full text-center py-2">
                <p className="text-sm text-gray-400">No players in roster yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

