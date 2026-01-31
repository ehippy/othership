import React, { useState } from "react";
import Link from "next/link";
import { ServerSelector } from "./ServerSelector";

interface TopBarProps {
  avatar: string | null;
  discordUserId: string | null;
  username: string | null;
  onLogout: () => void;
  onSelectGuild: (guildId: string, guildName: string, guildIcon?: string) => void;
  selectedGuildName?: string;
  selectedGuildId?: string | null;
  selectedGuildIcon?: string | null;
}

export function TopBar({ avatar, discordUserId, username, onLogout, onSelectGuild, selectedGuildName, selectedGuildId, selectedGuildIcon }: TopBarProps) {
  const [showServers, setShowServers] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getAvatarUrl = (userId: string, avatarHash: string | null): string => {
    if (!avatarHash) {
      return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    }
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
  };

  const getGuildIconUrl = (guildId: string, iconHash: string | null): string => {
    if (!iconHash) {
      return `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
    return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png`;
  };

  return (
    <>
      {/* Server selector popup */}
      {showServers && (
        <div className="fixed top-20 left-4 z-50">
          <ServerSelector 
            onClose={() => setShowServers(false)}
            onSelectGuild={onSelectGuild}
          />
        </div>
      )}

      {/* User menu popup */}
      {showUserMenu && (
        <div className="fixed top-20 right-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 w-48">
            <button
              onClick={() => {
                onLogout();
                setShowUserMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-2 sm:px-4 z-40 gap-2">
        {/* Left: Server selector */}
        <button
          onClick={() => setShowServers(!showServers)}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors min-w-0 flex-shrink"
        >
          {selectedGuildId && selectedGuildIcon !== undefined && (
            <img
              src={getGuildIconUrl(selectedGuildId, selectedGuildIcon)}
              alt={selectedGuildName || "Guild"}
              className="w-6 h-6 rounded-full flex-shrink-0"
            />
          )}
          <span className="hidden md:block text-sm text-gray-300">
            {selectedGuildName || "Servers"}
          </span>
          <span className="text-gray-400 flex-shrink-0">{showServers ? "▲" : "▼"}</span>
        </button>

        {/* Center: Title */}
        <Link href="/" className="text-lg md:text-xl font-bold text-white tracking-widest hover:text-gray-300 transition-colors absolute left-1/2 transform -translate-x-1/2">
          D E R E L I C T
        </Link>

        {/* Right: User info */}
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors min-w-0 flex-shrink"
        >
          {avatar && discordUserId && (
            <img
              src={getAvatarUrl(discordUserId, avatar)}
              alt="Discord avatar"
              className="w-6 h-6 rounded-full flex-shrink-0"
              />
            )}
          {username && (
            <span className="hidden md:block text-gray-300 text-sm">{username}</span>
          )}
          <span className="text-gray-400 flex-shrink-0">{showUserMenu ? "▲" : "▼"}</span>
        </button>
      </div>
    </>
  );
}
