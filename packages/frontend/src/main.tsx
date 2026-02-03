import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { trpc, trpcClient } from '@/lib/api/trpc';
import '@/app/globals.css';

import HomePage from '@/app/page';
import LoginPage from '@/app/login/page';
import FAQPage from '@/app/faq/page';
import GuildPage from '@/app/[guildSlug]/page';
import GamePage from '@/app/[guildSlug]/[gameSlug]/page';
import ScenariosPage from '@/app/scenarios/page';

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Different settings for different data types:
            // - User guilds: stable, good for caching
            // - Game state: dynamic, needs fresh data
            staleTime: 0, // Always consider data stale by default (multiplayer game)
            gcTime: 10 * 60 * 1000, // 10 minutes - keep unmounted data around briefly
            refetchOnWindowFocus: true, // Refetch when user tabs back (see other players' moves)
            refetchOnReconnect: true, // Refetch on network reconnect
            refetchOnMount: true, // Refetch when component mounts (see latest game state)
          },
        },
      })
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: window.localStorage,
      key: 'othership_query_cache',
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ 
          persister, 
          maxAge: 1000 * 60 * 60, // 1 hour - shorter for multiplayer game freshness
        }}
      >
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/scenarios" element={<ScenariosPage />} />
            <Route path="/:guildSlug/:gameSlug" element={<GamePage />} />
            <Route path="/:guildSlug" element={<GuildPage />} />
          </Routes>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </trpc.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
