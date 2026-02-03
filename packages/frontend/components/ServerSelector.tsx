import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/api/trpc";
import { getGuildIconUrl } from "@/lib/utils";

interface ServerSelectorProps {
  onClose: () => void;
  onSelectGuild: (guildId: string, guildName: string, guildSlug: string, guildIcon?: string) => void;
}

interface Guild {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  botInstalled?: boolean;
  canManage?: boolean;
  optedIn?: boolean;
}

export function ServerSelector({ onClose, onSelectGuild }: ServerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: guilds, isLoading, refetch } = trpc.player.getGuilds.useQuery(undefined, {
    // Override defaults: guilds list is stable, good for caching
    staleTime: 5 * 60 * 1000, // 5 minutes - guilds don't change often
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const refreshMutation = trpc.player.refreshGuilds.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleSelectGuild = (guild: Guild) => {
    if (guild.botInstalled && guild.slug) {
      onSelectGuild(guild.id, guild.name, guild.slug, guild.icon);
      onClose();
    }
  };

  const handleAddBot = (guildId: string) => {
    const botClientId = import.meta.env.VITE_DISCORD_APP_ID;
    const apiUrl = import.meta.env.VITE_API_URL?.replace('/trpc', '');
    
    // Permissions: 3136
    const permissions = "3136";
    const scope = "bot applications.commands";
    const redirectUri = encodeURIComponent(`${apiUrl}/auth/bot-added`);
    
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${botClientId}&permissions=${permissions}&guild_id=${guildId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}`;
    
    window.open(oauthUrl, "_blank");
  };

  // Filter guilds by search query
  const filteredGuilds = guilds?.filter((guild) =>
    guild.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Sort guilds: connected → adminable → others
  const sortedGuilds = [...filteredGuilds].sort((a, b) => {
    // Connected servers first
    if (a.botInstalled !== b.botInstalled) {
      return b.botInstalled ? 1 : -1;
    }
    // Then manageable servers
    if (a.canManage !== b.canManage) {
      return b.canManage ? 1 : -1;
    }
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });

  const showSearchBar = (guilds?.length || 0) >= 5;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 w-96 max-h-[32rem] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Your Discord Servers</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh guilds"
          >
            {refreshMutation.isPending ? "⟳" : "↻"}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Search bar (only show if 5+ guilds) */}
      {showSearchBar && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Loading state */}
      {!guilds && (
        <div className="text-center text-gray-400 py-8">
          Loading servers...
        </div>
      )}

      {/* Server grid */}
      {guilds && (
        <div className="space-y-4 overflow-y-auto flex-1">
          {/* Connected servers section */}
          {sortedGuilds.filter(g => g.botInstalled).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">Connected to DERELICT</h4>
              <div className="space-y-2">
                {sortedGuilds.filter((guild: Guild) => guild.botInstalled).map((guild: Guild) => (
                  <div
                    key={guild.id}
                    onClick={() => handleSelectGuild(guild)}
                    className="flex items-center gap-3 p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    {/* Server icon */}
                    <img
                      src={getGuildIconUrl(guild.id, guild.icon || null)}
                      alt={guild.name}
                      className="w-12 h-12 rounded-full"
                    />

                    {/* Server info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{guild.name}</div>
                      <div className="flex items-center gap-2 text-xs">
                        {guild.canManage && (
                          <span className="badge-admin">Admin</span>
                        )}
                        <span className={guild.optedIn ? "text-green-400" : "text-gray-400"}>
                          {guild.optedIn ? "✓ Opted In to Play" : "Spectating"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not connected servers section */}
          {sortedGuilds.filter(g => !g.botInstalled).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">Not Connected</h4>
              <div className="space-y-2">
                {sortedGuilds.filter((guild: Guild) => !guild.botInstalled).map((guild: Guild) => (
                  <div
                    key={guild.id}
                    className="flex items-center gap-3 p-3 bg-gray-700 rounded opacity-75"
                  >
                    {/* Server icon */}
                    <img
                      src={getGuildIconUrl(guild.id, guild.icon || null)}
                      alt={guild.name}
                      className="w-12 h-12 rounded-full grayscale"
                    />

                    {/* Server info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{guild.name}</div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">Not connected</span>
                        {guild.canManage && (
                          <span className="badge-admin">Admin</span>
                        )}
                      </div>
                    </div>

                    {/* Add bot button or help icon */}
                    {guild.canManage ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddBot(guild.id);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors whitespace-nowrap"
                      >
                        Add Bot
                      </button>
                    ) : (
                      <a
                        href="/faq#how-to-add-bot"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center w-7 h-7 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-full text-sm transition-colors"
                        title="Ask your server admin to add the bot"
                      >
                        🔒
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedGuilds.length === 0 && !searchQuery && (
            <div className="text-center text-gray-400 py-8">
              No servers found. Join a Discord server first!
            </div>
          )}

          {sortedGuilds.length === 0 && searchQuery && (
            <div className="text-center text-gray-400 py-8">
              No servers match "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );

}
