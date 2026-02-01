"use client";

import React from "react";
import { trpc } from "@/lib/api/trpc";

interface PlayerRosterProps {
  guildId: string;
  currentUserId: string | null;
  canManage: boolean;
}

export function PlayerRoster({ guildId, currentUserId, canManage }: PlayerRosterProps) {
  const utils = trpc.useUtils();
  
  const { data: roster, isLoading } = trpc.guild.getRoster.useQuery(
    { discordGuildId: guildId },
    { enabled: !!guildId }
  );

  const setOptInMutation = trpc.guild.setOptIn.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.guild.getRoster.cancel();

      // Snapshot the previous value
      const previousRoster = utils.guild.getRoster.getData({ discordGuildId: guildId });

      // Optimistically update to the new value
      if (previousRoster) {
        utils.guild.getRoster.setData(
          { discordGuildId: guildId },
          previousRoster.map((member) =>
            member.playerId === variables.playerId
              ? { ...member, optedIn: variables.optedIn }
              : member
          )
        );
      }

      // Return context with snapshot
      return { previousRoster };
    },
    onError: (error, variables, context) => {
      // Roll back on error
      if (context?.previousRoster) {
        utils.guild.getRoster.setData({ discordGuildId: guildId }, context.previousRoster);
      }
      alert(`Failed to update opt-in status: ${error.message}`);
    },
    onSettled: (data, error, variables) => {
      // Always refetch roster after error or success to ensure server state
      utils.guild.getRoster.invalidate();
      
      // Surgically update the guilds cache instead of full refetch
      const currentGuilds = utils.player.getGuilds.getData();
      if (currentGuilds && !error) {
        utils.player.getGuilds.setData(undefined, 
          currentGuilds.map(guild => 
            guild.id === variables.discordGuildId
              ? { ...guild, optedIn: variables.optedIn }
              : guild
          )
        );
      }
    },
  });

  const getAvatarUrl = (userId: string, avatarHash: string | null): string => {
    if (!avatarHash) {
      return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    }
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
  };

  const handleToggleOptIn = (playerId: string, currentOptIn: boolean) => {
    setOptInMutation.mutate({
      discordGuildId: guildId,
      playerId,
      optedIn: !currentOptIn,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Player Roster</h2>
        <p className="text-gray-400">Loading roster...</p>
      </div>
    );
  }

  if (!roster || roster.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Player Roster</h2>
        <p className="text-gray-400">
          No one has logged in yet. Be the first!
        </p>
      </div>
    );
  }

  const optedInCount = roster.filter((m) => m.optedIn).length;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Player Roster</h2>
        <div className="text-sm text-gray-400">
          {optedInCount} of {roster.length} players opted in
        </div>
      </div>

      <div className="space-y-2">
        {roster.map((member) => {
          const isSelf = currentUserId === member.playerId;
          const canToggle = isSelf || canManage;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-650 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={getAvatarUrl(member.playerId, member.playerAvatar || null)}
                  alt={member.playerUsername}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {member.playerUsername}
                    </span>
                    {isSelf && (
                      <span className="text-xs text-gray-400">(you)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {member.optedIn ? (
                      <span className="text-green-400">✓ Opted In</span>
                    ) : (
                      <span className="text-gray-400">✗ Not playing</span>
                    )}
                  </div>
                </div>
              </div>

              {canToggle && (
                <button
                  onClick={() => handleToggleOptIn(member.playerId, member.optedIn)}
                  disabled={setOptInMutation.isPending}
                  className={`px-4 py-2 rounded transition-colors whitespace-nowrap disabled:opacity-50 ${
                    member.optedIn
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {setOptInMutation.isPending
                    ? "..."
                    : member.optedIn
                    ? "Leave"
                    : "Join"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
