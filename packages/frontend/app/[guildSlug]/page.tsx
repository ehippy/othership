"use client";

import React, { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/hooks/useAuth";
import { useGuildSelection } from "@/lib/hooks/useGuildSelection";
import { trpc } from "@/lib/api/trpc";
import { parseGuildPath } from "@/lib/utils";

function GuildPageContent() {
  const params = useParams();
  const { isLoading: authLoading, user, logout } = useAuth();
  const { selectedGuild, selectGuild, guilds } = useGuildSelection();
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  // Parse guild ID from slug
  const guildId = parseGuildPath(`/${params.guildSlug}`);

  // Fetch guild data
  const { data: guild, isLoading: guildLoading, refetch: refetchGuild } = trpc.guild.get.useQuery(
    { discordGuildId: guildId || "" },
    { enabled: !!guildId }
  );

  // Fetch channels (admin only)
  const userGuild = guilds?.find((g) => g.id === guildId);
  const { data: channels, isLoading: channelsLoading, refetch: refetchChannels, isFetching: channelsFetching } = trpc.guild.getChannels.useQuery(
    { discordGuildId: guildId || "" },
    { enabled: !!guildId && userGuild?.canManage === true }
  );

  // Set game channel mutation
  const setGameChannelMutation = trpc.guild.setGameChannel.useMutation({
    onSuccess: () => {
      refetchGuild();
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
    
    setGameChannelMutation.mutate({
      discordGuildId: guildId,
      channelId: selectedChannelId,
    });
  };

  if (authLoading || guildLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (!guild) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <p className="text-gray-400">Guild not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pt-16">
      {/* Main content area */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">{guild.name}</h1>

          {/* Game content area */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
            <p className="text-gray-400">
              {guild.gameChannelId
                ? "Ready to play! Game content coming soon..."
                : userGuild?.canManage
                ? "Configure a game channel below to get started."
                : "Ask a server admin to configure the game channel."}
            </p>
          </div>

          {/* Admin Panel */}
          {userGuild?.canManage && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-yellow-500">
                Admin Settings
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Game Channel
                    </label>
                    {guild.gameChannelId ? (
                      <span className="text-xs text-green-400">
                        ✓ Configured
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-400">
                        ⚠ Not configured
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-3">
                    Please select the Discord channel your game will be run in. We suggest creating a channel called <span className="text-indigo-400">#derelict</span> for this purpose.
                  </p>
                  
                  {channelsLoading ? (
                    <p className="text-gray-400 text-sm">Loading channels...</p>
                  ) : channels && channels.length > 0 ? (
                    <>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex gap-2 flex-1">
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

                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveChannel}
                            disabled={!selectedChannelId || setGameChannelMutation.isPending}
                            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors whitespace-nowrap"
                          >
                            {setGameChannelMutation.isPending ? "Saving..." : "Set Game Channel"}
                          </button>
                          
                          <button
                            onClick={() => {
                              sendOminousMutation.mutate({ discordGuildId: guildId });
                            }}
                            disabled={!guild.gameChannelId || sendOminousMutation.isPending}
                            className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors whitespace-nowrap"
                          >
                            Be Ominous
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
        avatar={user.avatar}
        discordUserId={user.discordUserId}
        username={user.username}
        onLogout={logout}
        onSelectGuild={selectGuild}
        selectedGuildName={selectedGuild?.name}
        selectedGuildId={selectedGuild?.id || null}
        selectedGuildIcon={selectedGuild?.icon || null}
      />
    </main>
  );
}

export default function GuildPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
      <GuildPageContent />
    </Suspense>
  );
}
