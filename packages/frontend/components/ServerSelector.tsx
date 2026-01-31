import React from "react";
import { trpc } from "@/lib/api/trpc";

interface ServerSelectorProps {
  onClose: () => void;
  onSelectGuild: (guildId: string, guildName: string, guildIcon?: string) => void;
}

interface Guild {
  id: string;
  name: string;
  icon?: string;
  botInstalled?: boolean;
}

export function ServerSelector({ onClose, onSelectGuild }: ServerSelectorProps) {
  const { data: guilds, isLoading } = trpc.player.getGuilds.useQuery();

  const handleSelectGuild = (guild: Guild) => {
    if (guild.botInstalled) {
      onSelectGuild(guild.id, guild.name, guild.icon);
      onClose();
    }
  };

  const getGuildIconUrl = (guildId: string, iconHash: string | null): string => {
    if (!iconHash) {
      // Discord default guild icon
      return `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
    return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png`;
  };

  const handleAddBot = (guildId: string) => {
    const botClientId = process.env.NEXT_PUBLIC_DISCORD_APP_ID;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/trpc', '');
    
    // Permissions: 3136
    const permissions = "3136";
    const scope = "bot applications.commands";
    const redirectUri = encodeURIComponent(`${apiUrl}/auth/bot-added`);
    
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${botClientId}&permissions=${permissions}&guild_id=${guildId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}`;
    
    window.open(oauthUrl, "_blank");
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 w-96 max-h-96 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Your Servers</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center text-gray-400 py-8">
          Loading servers...
        </div>
      )}

      {/* Server grid */}
      {!isLoading && guilds && (
        <div className="space-y-2">
          {[...guilds]
            .sort((a, b) => {
              // Connected servers first
              if (a.botInstalled !== b.botInstalled) {
                return b.botInstalled ? 1 : -1;
              }
              // Then alphabetically
              return a.name.localeCompare(b.name);
            })
            .map((guild: Guild) => (
            <div
              key={guild.id}
              onClick={() => handleSelectGuild(guild)}
              className={`flex items-center gap-3 p-3 bg-gray-700 rounded transition-colors ${
                guild.botInstalled ? "cursor-pointer hover:bg-gray-600" : ""
              }`}
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
                <div className={`text-xs ${guild.botInstalled ? "text-green-400" : "text-gray-400"}`}>
                  {guild.botInstalled ? "✓ Connected" : "Not connected"}
                </div>
              </div>

              {/* Add bot button or Connected badge */}
              {guild.botInstalled ? (
                <div className="px-3 py-1.5 bg-green-600 text-white text-sm rounded">
                  Connected
                </div>
              ) : (
                <button
                  onClick={() => handleAddBot(guild.id)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors whitespace-nowrap"
                >
                  Add Bot
                </button>
              )}
            </div>
          ))}

          {guilds.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No servers found. Join a Discord server first!
            </div>
          )}
        </div>
      )}
    </div>
  );

}
