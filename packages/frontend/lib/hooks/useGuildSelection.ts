import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { trpc } from "@/lib/api/trpc";
import { isAuthenticated } from "@/lib/auth";
import { createGuildPath } from "@/lib/utils";

interface Guild {
  id: string;
  name: string;
  icon?: string;
  slug?: string;
  botInstalled?: boolean;
}

interface SelectedGuild {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export function useGuildSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedGuild, setSelectedGuild] = useState<SelectedGuild | null>(null);

  const { data: guilds, refetch: refetchGuilds, isLoading: guildsLoading } = trpc.player.getGuilds.useQuery(undefined, {
    enabled: isAuthenticated(),
  });

  // Listen for bot-added messages from popup window
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'bot-added') {
        console.log('[useGuildSelection] Bot added to guild:', event.data.guildId);
        // Refresh guild list to get updated botInstalled status
        const result = await refetchGuilds();
        
        // Find the guild that was just connected and navigate to it
        const addedGuild = result.data?.find((g: Guild) => g.id === event.data.guildId);
        if (addedGuild) {
          selectGuild(addedGuild.id, addedGuild.name, addedGuild.slug || '', addedGuild.icon);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetchGuilds]);

  // Restore guild selection from URL path
  useEffect(() => {
    if (!guilds || guilds.length === 0 || location.pathname === "/") {
      setSelectedGuild(null);
      return;
    }

    // Extract guild slug from path (first segment)
    const guildSlug = location.pathname.split('/')[1];
    if (!guildSlug) {
      setSelectedGuild(null);
      return;
    }
    
    const matchedGuild = guilds.find((g: Guild) => g.slug === guildSlug && g.botInstalled);
    
    if (matchedGuild) {
      setSelectedGuild({
        id: matchedGuild.id,
        name: matchedGuild.name,
        slug: matchedGuild.slug || '',
        icon: matchedGuild.icon || null,
      });
    } else {
      setSelectedGuild(null);
    }
  }, [guilds, location.pathname]);

  const selectGuild = (guildId: string, guildName: string, guildSlug: string, guildIcon?: string) => {
    setSelectedGuild({
      id: guildId,
      name: guildName,
      slug: guildSlug,
      icon: guildIcon || null,
    });
    
    // Navigate to guild page with pretty URL slug
    const path = createGuildPath(guildSlug);
    navigate(path);
  };

  return { selectedGuild, selectGuild, guilds, refetchGuilds };
}
