import React from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { useOptionalAuth } from "@/lib/hooks/useAuth";
import { useGuildSelection } from "@/lib/hooks/useGuildSelection";

export default function HomePage() {
  const { isLoading, user, logout } = useOptionalAuth();
  const { selectedGuild, selectGuild, refetchGuilds } = useGuildSelection();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check if returning from bot installation
  React.useEffect(() => {
    const botAddedGuildId = searchParams.get('botAdded');
    if (botAddedGuildId) {
      console.log('[HomePage] Bot was added to guild:', botAddedGuildId);
      // Refetch guilds to get updated botInstalled status
      refetchGuilds();
      // Clean up URL
      searchParams.delete('botAdded');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refetchGuilds]);

  // Don't render anything while checking authentication
  if (isLoading) {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">D E R E L I C T</h1>
          {selectedGuild ? (
            <>
              <p className="text-xl text-gray-400 mb-2">
                {selectedGuild.name}
              </p>
              <p className="text-sm text-gray-500">
                Guild context active
              </p>
            </>
          ) : (
            <>
              <p className="text-xl text-gray-400">
                Cooperative survival horror in space
              </p>
              <p className="mt-8 text-sm text-gray-500">
                Select a server to get started
              </p>
            </>
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
