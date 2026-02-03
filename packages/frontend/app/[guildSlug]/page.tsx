import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { useOptionalAuth } from "@/lib/hooks/useAuth";
import { useGuildSelection } from "@/lib/hooks/useGuildSelection";
import { trpc } from "@/lib/api/trpc";
import { createGamePath, formatGameName, getGuildIconUrl } from "@/lib/utils";
import { PlayerRoster } from "@/components/game/PlayerRoster";
import type { Scenario } from "@derelict/shared";

export default function GuildPage() {
  const params = useParams<{ guildSlug: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, user, logout } = useOptionalAuth();
  const { selectedGuild, selectGuild, guilds } = useGuildSelection();
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [isEditingChannel, setIsEditingChannel] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [confirmingAction, setConfirmingAction] = useState<{ gameId: string; action: 'cancel' | 'delete' } | null>(null);
  
  // Check if guilds are still loading
  const { isLoading: guildsLoading } = trpc.player.getGuilds.useQuery(undefined, {
    enabled: !authLoading,
  });

  // Fetch guild data by slug
  const { data: guild, isLoading: guildLoading, error: guildError, refetch: refetchGuild } = trpc.guild.getBySlug.useQuery(
    { slug: params.guildSlug || "" },
    { enabled: !!params.guildSlug }
  );

  // Derive guildId from either cached or queried guild data
  const userGuild = guilds?.find((g) => g.slug === params.guildSlug);
  const guildId = guild?.discordGuildId || userGuild?.id || "";

  // Fetch roster for game creation validation
  const { data: roster } = trpc.guild.getRoster.useQuery(
    { discordGuildId: guild?.discordGuildId || "" },
    { enabled: !!guild?.discordGuildId && !!guild?.gameChannelId }
  );

  // Fetch active game
  const { data: activeGame, error: activeGameError, refetch: refetchActiveGame } = trpc.game.getActiveByGuild.useQuery(
    { guildId: guild?.id || "" },
    { enabled: !!guild?.id && !!guild?.gameChannelId }
  );

  // Log for debugging
  React.useEffect(() => {
    console.log('Guild data:', guild);
    console.log('guildId:', guildId);
    console.log('guild.id (internal):', guild?.id);
    console.log('Active game:', activeGame);
    console.log('Active game error:', activeGameError);
  }, [guild, guildId, activeGame, activeGameError]);

  // Fetch scenarios
  const { data: scenarios } = trpc.scenario.listScenarios.useQuery(undefined, {
    enabled: !!guild?.id && !!guild?.gameChannelId && !activeGame,
  });

  // Fetch all games for the guild
  const { data: allGames, refetch: refetchAllGames } = trpc.game.listByGuild.useQuery(
    { guildId: guild?.id || "" },
    { enabled: !!guild?.id && !!guild?.gameChannelId }
  );

  // Create game mutation
  const createGameMutation = trpc.game.create.useMutation({
    onSuccess: (game) => {
      refetchActiveGame();
      // Navigate to game page
      navigate(createGamePath(params.guildSlug || "", game.slug));
    },
    onError: (error) => {
      alert(`Failed to create game: ${error.message}`);
    },
  });

  // Abandon game mutation
  const abandonGameMutation = trpc.game.abandon.useMutation({
    onSuccess: () => {
      refetchActiveGame();
      refetchAllGames();
    },
    onError: (error) => {
      alert(`Failed to abandon game: ${error.message}`);
    },
  });

  // Delete game mutation
  const deleteGameMutation = trpc.game.delete.useMutation({
    onSuccess: () => {
      refetchActiveGame();
      refetchAllGames();
    },
    onError: (error) => {
      alert(`Failed to delete game: ${error.message}`);
    },
  });

  // Fetch channels only when editing or no channel configured (admin only)
  const shouldFetchChannels = !!guildId && userGuild?.canManage === true && (isEditingChannel || !guild?.gameChannelId);
  const { data: channels, isLoading: channelsLoading, refetch: refetchChannels, isFetching: channelsFetching } = trpc.guild.getChannels.useQuery(
    { discordGuildId: guildId },
    { enabled: shouldFetchChannels }
  );

  // Set game channel mutation
  const setGameChannelMutation = trpc.guild.setGameChannel.useMutation({
    onSuccess: () => {
      refetchGuild();
      setIsEditingChannel(false);
    },
    onError: (error) => {
      alert(`Failed to set game channel: ${error.message}`);
    },
  });

  // Send ominous message mutation
  const sendOminousMutation = trpc.guild.sendOminousMessage.useMutation({
    onSuccess: () => {
      // Silent success - message sent
    },
    onError: (error) => {
      alert(`Failed to send message: ${error.message}`);
    },
  });

  // Auto-select #derelict channel if found
  React.useEffect(() => {
    if (channels && !selectedChannelId) {
      const derelictChannel = channels.find(
        (c) => c.name.toLowerCase() === "derelict"
      );
      if (derelictChannel) {
        setSelectedChannelId(derelictChannel.id);
      } else if (guild?.gameChannelId) {
        setSelectedChannelId(guild.gameChannelId);
      }
    }
  }, [channels, guild, selectedChannelId]);

  const handleSaveChannel = () => {
    if (!guildId || !selectedChannelId) return;
    
    const selectedChannel = channels?.find(c => c.id === selectedChannelId);
    if (!selectedChannel) return;
    
    setGameChannelMutation.mutate({
      discordGuildId: guildId,
      channelId: selectedChannelId,
      channelName: selectedChannel.name,
    });
  };

  // Show loading while auth or guilds are loading
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  // Use cached guild data for immediate render, guild.get data for gameChannelId
  const displayGuild = userGuild || guild;
  
  // Check if user has management permissions
  const canManage = !!user && userGuild?.canManage === true;
  
  // Show error if guild query failed
  if (guildError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <p className="text-red-400">Error loading guild: {guildError.message}</p>
        </div>
      </main>
    );
  }
  
  // Only show "not found" if guilds have loaded and guild is still missing
  if (!displayGuild && !guildsLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <p className="text-gray-400">Guild not found</p>
        </div>
      </main>
    );
  }

  // Don't render until we have guild data
  if (!displayGuild) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pt-16">
      {/* Main content area */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <img 
                src={getGuildIconUrl(displayGuild.id, displayGuild.icon)} 
                alt={displayGuild.name}
                className="w-20 h-20 rounded-full border-2 border-indigo-500"
              />
              <h1 className="text-4xl font-bold">{displayGuild.name}</h1>
            </div>
            {guild?.gameChannelId && (
              <a
                href={`https://discord.com/channels/${displayGuild.id}/${guild.gameChannelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors text-sm"
              >
                <span>Open in Discord</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {/* Player Roster and Game Section - side by side on desktop */}
          {guild?.gameChannelId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Player Roster - Left */}
              <div>
                <PlayerRoster
                  guildId={guildId}
                  currentUserId={user?.discordUserId || null}
                  canManage={userGuild?.canManage || false}
                />
              </div>

              {/* Active Game or Game Creation - Right */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              {activeGame ? (
                // Show active game
                <div>
                  <h2 className="text-2xl font-bold mb-4">Current Game</h2>
                  <div className="bg-gray-900 rounded p-4 mb-4">
                    <h3 className="text-xl font-bold text-indigo-400 mb-2">{formatGameName(activeGame.slug)}</h3>
                    <p className="text-gray-300 mb-2">{activeGame.scenarioName}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`px-2 py-1 rounded ${
                        activeGame.status === 'staging' ? 'bg-yellow-900 text-yellow-200' :
                        activeGame.status === 'character_creation' ? 'bg-blue-900 text-blue-200' :
                        activeGame.status === 'active' ? 'bg-green-900 text-green-200' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {activeGame.status === 'staging' ? '⏳ Staging' :
                         activeGame.status === 'character_creation' ? '📝 Character Creation' :
                         activeGame.status === 'active' ? '🎮 Active' :
                         activeGame.status}
                      </span>
                      {activeGame.status === 'staging' && (
                        <span className="text-gray-400">
                          Starts {new Date(activeGame.gameStartTime).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={createGamePath(params.guildSlug || "", activeGame.slug)}
                    className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                  >
                    View Game →
                  </a>
                </div>
              ) : (
                // Game creation form
                <div>
                  <h2 className="text-2xl font-bold mb-4">Start a New Game</h2>
                  {roster && roster.filter(m => m.optedIn).length === 0 ? (
                    <p className="text-gray-400">No players have opted in yet. Opt in to start a game!</p>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Select Scenario
                        </label>
                        {scenarios && scenarios.length > 0 ? (
                          <select
                            value={selectedScenarioId}
                            onChange={(e) => setSelectedScenarioId(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Choose a scenario...</option>
                            {scenarios.map((scenario: Scenario) => (
                              <option key={scenario.id} value={scenario.id}>
                                {scenario.name} ({scenario.minPlayers}-{scenario.maxPlayers} players) - {scenario.difficulty}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-gray-400 text-sm">No scenarios available yet. Check back soon!</p>
                        )}
                        {selectedScenarioId && scenarios && (
                          <p className="mt-2 text-sm text-gray-400">
                            {scenarios.find((s: Scenario) => s.id === selectedScenarioId)?.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (!guildId || !guild?.gameChannelId || !selectedScenarioId) return;
                          
                          const selectedScenario = scenarios?.find((s: Scenario) => s.id === selectedScenarioId);
                          if (!selectedScenario) return;
                          
                          const optedInCount = roster?.filter(m => m.optedIn).length || 0;
                          if (optedInCount < selectedScenario.minPlayers) {
                            alert(`Need at least ${selectedScenario.minPlayers} players. Currently ${optedInCount} opted in.`);
                            return;
                          }
                          
                          createGameMutation.mutate({
                            guildId,
                            channelId: guild.gameChannelId,
                            scenarioId: selectedScenarioId,
                          });
                        }}
                        disabled={!selectedScenarioId || createGameMutation.isPending || !roster?.some(m => m.optedIn)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors font-semibold"
                      >
                        {createGameMutation.isPending ? "Creating Game..." : "🎮 Start Game"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Games List */}
          {guild?.gameChannelId && allGames && allGames.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">Game History</h2>
              <div className="space-y-3">
                {allGames.map((game: any) => (
                  <div
                    key={game.id}
                    className="block bg-gray-900 border border-gray-700 hover:border-indigo-600 rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <a
                        href={createGamePath(params.guildSlug || "", game.slug)}
                        className="flex-1"
                      >
                        <h3 className="text-lg font-bold text-indigo-400 mb-1">{formatGameName(game.slug)}</h3>
                        <p className="text-gray-400 text-sm mb-2">{game.scenarioName}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={`px-2 py-1 rounded font-semibold ${
                            game.status === 'staging' ? 'bg-yellow-900 text-yellow-200' :
                            game.status === 'character_creation' ? 'bg-blue-900 text-blue-200' :
                            game.status === 'active' ? 'bg-green-900 text-green-200' :
                            game.status === 'tpk' ? 'bg-red-900 text-red-200' :
                            game.status === 'won' ? 'bg-purple-900 text-purple-200' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {game.status === 'staging' ? '⏳ Staging' :
                             game.status === 'character_creation' ? '📝 Character Creation' :
                             game.status === 'active' ? '🎮 Active' :
                             game.status === 'tpk' ? '💀 TPK' :
                             game.status === 'won' ? '🎉 Won' :
                             game.status === 'abandoned' ? '❌ Abandoned' :
                             game.status}
                          </span>
                          <span className="text-gray-500">
                            {new Date(game.createdAt).toLocaleDateString()}
                          </span>
                          {game.playerIds && game.playerIds.length > 0 && (
                            <span className="text-gray-500">
                              👥 {game.playerIds.length} player{game.playerIds.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </a>
                      <div className="flex items-center gap-2">
                        {userGuild?.canManage && !['tpk', 'won', 'abandoned'].includes(game.status) && (
                          confirmingAction?.gameId === game.id && confirmingAction.action === 'cancel' ? (
                            <div className="flex items-center gap-2 bg-yellow-900/30 px-2 py-1 rounded">
                              <span className="text-xs text-yellow-200">Sure?</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abandonGameMutation.mutate({ gameId: game.id });
                                  setConfirmingAction(null);
                                }}
                                disabled={abandonGameMutation.isPending}
                                className="px-2 py-1 text-xs bg-yellow-900 hover:bg-yellow-800 text-yellow-200 rounded transition-colors disabled:opacity-50"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmingAction(null);
                                }}
                                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingAction({ gameId: game.id, action: 'cancel' });
                              }}
                              disabled={abandonGameMutation.isPending}
                              className="px-3 py-1 text-xs bg-yellow-900/50 hover:bg-yellow-900 text-yellow-200 rounded transition-colors disabled:opacity-50"
                              title="Cancel game"
                            >
                              Cancel
                            </button>
                          )
                        )}
                        {userGuild?.canManage && (
                          confirmingAction?.gameId === game.id && confirmingAction.action === 'delete' ? (
                            <div className="flex items-center gap-2 bg-red-900/30 px-2 py-1 rounded">
                              <span className="text-xs text-red-200">Sure?</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGameMutation.mutate({ gameId: game.id });
                                  setConfirmingAction(null);
                                }}
                                disabled={deleteGameMutation.isPending}
                                className="px-2 py-1 text-xs bg-red-900 hover:bg-red-800 text-red-200 rounded transition-colors disabled:opacity-50"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmingAction(null);
                                }}
                                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingAction({ gameId: game.id, action: 'delete' });
                              }}
                              disabled={deleteGameMutation.isPending}
                              className="px-3 py-1 text-xs bg-red-900/50 hover:bg-red-900 text-red-200 rounded transition-colors disabled:opacity-50"
                              title="Delete game"
                            >
                              Delete
                            </button>
                          )
                        )}
                        <a
                          href={createGamePath(params.guildSlug || "", game.slug)}
                          className="flex-shrink-0"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending configuration message for non-admins */}
          {!guild?.gameChannelId && !userGuild?.canManage && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <p className="text-gray-400">
                ⏳ Awaiting configuration. Ask a server admin to set up the game channel.
              </p>
            </div>
          )}

          {/* Admin Panel */}
          {userGuild?.canManage && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="section-title-admin">
                Admin Settings
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Game Channel
                    </label>
                    {guild?.gameChannelId ? (
                      <span className="text-xs text-green-400">
                        ✓ Configured
                      </span>
                    ) : (
                      <span className="badge-warning">
                        ⚠ Not configured
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-3">
                    Please select the Discord channel your game will be run in. We suggest creating a channel called <span className="text-indigo-400">#derelict</span> for this purpose.
                  </p>
                  
                  {guild?.gameChannelId && !isEditingChannel ? (
                    // Show simple message when channel is already configured
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-700 rounded border border-gray-600">
                      <span className="text-gray-300">
                        <span className="text-indigo-400">#{guild?.gameChannelName || 'Channel configured'}</span>
                      </span>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => setIsEditingChannel(true)}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors text-sm"
                        >
                          Change Channel
                        </button>
                        <button
                          onClick={() => {
                            if (guildId) {
                              sendOminousMutation.mutate({ discordGuildId: guildId });
                            }
                          }}
                          disabled={sendOminousMutation.isPending}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm"
                        >
                          {sendOminousMutation.isPending ? "Sending..." : "Be Ominous"}
                        </button>
                      </div>
                    </div>
                  ) : channelsLoading ? (
                    <p className="text-gray-400 text-sm">Loading channels...</p>
                  ) : channels && channels.length > 0 ? (
                    <>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <select
                            value={selectedChannelId}
                            onChange={(e) => setSelectedChannelId(e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select a channel...</option>
                            {channels.map((channel) => (
                              <option key={channel.id} value={channel.id}>
                                #{channel.name}
                              </option>
                            ))}
                          </select>
                          
                          <button
                            onClick={() => refetchChannels()}
                            disabled={channelsFetching}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-gray-300 transition-colors disabled:opacity-50 flex-shrink-0"
                            title="Refresh channel list"
                          >
                            {channelsFetching ? "⟳" : "↻"}
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          {guild?.gameChannelId && (
                            <button
                              onClick={() => setIsEditingChannel(false)}
                              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={handleSaveChannel}
                            disabled={!selectedChannelId || setGameChannelMutation.isPending}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                          >
                            {setGameChannelMutation.isPending ? "Saving..." : "Set Game Channel"}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-400">
                      <p className="mb-2">No text channels found.</p>
                      <p>
                        <a
                          href={`discord://discordapp.com/channels/${guildId}`}
                          className="text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Open Discord
                        </a>{" "}
                        and create a text channel called "derelict", then{" "}
                        <button
                          onClick={() => refetchChannels()}
                          className="text-indigo-400 hover:text-indigo-300 underline"
                        >
                          refresh
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top bar */}
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
