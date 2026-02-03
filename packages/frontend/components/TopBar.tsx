import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ServerSelector } from "./ServerSelector";
import { getAvatarUrl, getGuildIconUrl } from "@/lib/utils";

interface TopBarProps {
  avatar?: string | null;
  discordUserId?: string | null;
  username?: string | null;
  onLogout: () => void;
  onSelectGuild: (guildId: string, guildName: string, guildSlug: string, guildIcon?: string) => void;
  selectedGuildName?: string;
  selectedGuildId?: string | null;
  selectedGuildIcon?: string | null;
  mode?: 'fixed' | 'hamburger';
  insideHamburger?: boolean;
}

export function TopBar({ avatar, discordUserId, username, onLogout, onSelectGuild, selectedGuildName, selectedGuildId, selectedGuildIcon, mode = 'fixed', insideHamburger = false }: TopBarProps) {
  const [showGuilds, setShowGuilds] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isAuthenticated = !!discordUserId;

  if (mode === 'hamburger') {
    return (
      <>
        {/* Hamburger/Close button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Collapsible menu */}
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Menu content - render the normal TopBar with flag */}
            <div className="fixed top-0 left-0 right-0 z-40">
              <TopBar
                avatar={avatar}
                discordUserId={discordUserId}
                username={username}
                onLogout={onLogout}
                onSelectGuild={onSelectGuild}
                selectedGuildName={selectedGuildName}
                selectedGuildId={selectedGuildId}
                selectedGuildIcon={selectedGuildIcon}
                mode="fixed"
                insideHamburger={true}
              />
            </div>
          </>
        )}
      </>
    );
  }
  
  // Normal fixed TopBar mode

  return (
    <>
      {/* Guilds selector popup - only show for authenticated users */}
      {isAuthenticated && showGuilds && (
        <>
          {/* Invisible bridge to cover gap between button and dropdown */}
          <div 
            className="fixed top-12 left-0 h-6 w-full sm:w-80 sm:left-4 z-50"
            onMouseEnter={() => setShowGuilds(true)}
            onMouseLeave={() => setShowGuilds(false)}
          />
          <div 
            className="fixed top-16 left-0 right-0 sm:left-4 sm:right-auto sm:w-80 z-50 p-4 sm:p-0"
            onMouseEnter={() => setShowGuilds(true)}
            onMouseLeave={() => setShowGuilds(false)}
          >
            <ServerSelector 
              onClose={() => setShowGuilds(false)}
              onSelectGuild={onSelectGuild}
            />
          </div>
        </>
      )}

      {/* User menu popup */}
      {showUserMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowUserMenu(false)}
          />
          <div className="fixed top-16 right-4 z-50">
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
        </>
      )}

      {/* Navigation bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-gray-800 border-b border-gray-700 flex items-center px-4 z-40 gap-3 sm:gap-6">
        {/* Spacer for hamburger button when in hamburger mode */}
        {insideHamburger && <div className="w-12" />}
        
        {/* Logo */}
        <Link to="/" className="text-lg sm:text-xl font-bold text-white tracking-widest hover:text-gray-300 transition-colors">
          <span className="hidden sm:inline">DERELICT</span>
          <span className="sm:hidden">D</span>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center gap-1 sm:gap-4 flex-1">
          {/* Guilds dropdown - only show for authenticated users */}
          {isAuthenticated && (
            <div 
              className="relative"
              onMouseEnter={() => setShowGuilds(true)}
              onMouseLeave={() => setShowGuilds(false)}
            >
              <button
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                {selectedGuildId && selectedGuildIcon !== undefined && (
                  <img
                    src={getGuildIconUrl(selectedGuildId, selectedGuildIcon)}
                    alt=""
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span className="text-xs sm:text-sm font-medium">
                  {selectedGuildName || "Servers"}
                </span>
                <span className="text-xs text-gray-400">{showGuilds ? "▲" : "▼"}</span>
              </button>
            </div>
          )}

          {/* Scenarios link */}
          <Link
            to="/scenarios"
            className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            Scenarios
          </Link>

          {/* FAQ link */}
          <Link
            to="/faq"
            className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            FAQ
          </Link>
        </nav>

        {/* User menu or Login button */}
        {isAuthenticated ? (
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 hover:bg-gray-700 rounded transition-colors"
          >
            {avatar && discordUserId && (
              <img
                src={getAvatarUrl(discordUserId, avatar)}
                alt="User avatar"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
              />
            )}
            <span className="hidden md:block text-sm text-gray-300">{username}</span>
            <span className="text-xs text-gray-400">{showUserMenu ? "▲" : "▼"}</span>
          </button>
        ) : (
          <a
            href={import.meta.env.VITE_AUTH_LOGIN_URL}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded transition-colors"
            style={{ backgroundColor: 'var(--color-discord)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-discord-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-discord)'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>Login</span>
          </a>
        )}
      </div>
    </>
  );
}
