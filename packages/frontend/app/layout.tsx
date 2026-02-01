"use client";

import './globals.css';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/api/trpc";
import { useState } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // 1 minute - don't auto-refetch unless data is older than this
        gcTime: 5 * 60 * 1000, // 5 minutes - keep unused data in cache (renamed from cacheTime in v5)
        refetchOnWindowFocus: false, // Stop refetching every time user tabs back
        refetchOnReconnect: true, // Still refetch on network reconnect
      },
    },
  }));

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>.:: D E R E L I C T ::.</title>
        <meta name="description" content="A cooperative survival horror game set in space" />
        <link rel="icon" type="image/png" href="/assets/favicon.png" />
      </head>
      <body>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </trpc.Provider>
      </body>
    </html>
  );
}
