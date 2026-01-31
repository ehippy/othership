import React, { useState } from "react";
import { ServerSelector } from "./ServerSelector";

interface BottomDockProps {
  avatar: string | null;
  discordUserId: string | null;
  username: string | null;
  onLogout: () => void;
}

export function BottomDock({ avatar, discordUserId, username, onLogout }: BottomDockProps) {
  const [showServers, setShowServers] = useState(false);

  const getAvatarUrl = (userId: string, avatarHash: string | null): string => {
    if (!avatarHash) {
      return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    }
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
  };

  return (
    <>
      {/* Server selector popup */}
      {showServers && (
        <div className="fixed bottom-20 left-4 z-50">
          <ServerSelector onClose={() => setShowServers(false)} />
        </div>
      )}

      {/* Bottom dock */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4 z-40">
        {/* Left: Server selector */}
        <button
          onClick={() => setShowServers(!showServers)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          <span className="text-sm text-gray-300">Servers</span>
          <span className="text-gray-400">{showServers ? "▼" : "▲"}</span>
        </button>

        {/* Right: User info */}
        <div className="flex items-center gap-3">
          {avatar && discordUserId && (
            <img
              src={getAvatarUrl(discordUserId, avatar)}
              alt="Discord avatar"
              className="w-8 h-8 rounded-full"
            />
          )}
          {username && (
            <span className="text-gray-300 text-sm">{username}</span>
          )}
          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
