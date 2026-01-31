import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@derelict/backend";
import { getToken } from "../auth";

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Get API URL from environment
const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
};

// Create tRPC client
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getApiUrl(),
      headers: () => {
        const token = getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
