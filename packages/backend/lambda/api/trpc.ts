import { initTRPC, TRPCError } from "@trpc/server";
import { verifyToken } from "../../lib/auth";
import { playerService } from "../../db/services";
import type { Player } from "@derelict/shared";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

// Context with authenticated user
export interface Context {
  user: Player | null;
  event: APIGatewayProxyEventV2;
}

// Create context from request
export async function createContext({
  event,
}: {
  event: APIGatewayProxyEventV2;
}): Promise<Context> {
  console.log("[tRPC] Creating context");
  const authHeader = event.headers.authorization || event.headers.Authorization;
  console.log("[tRPC] Auth header present:", !!authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[tRPC] No valid auth header, returning null user");
    return { user: null, event };
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  console.log("[tRPC] Token extracted, length:", token.length);

  try {
    const decoded = verifyToken(token);
    console.log("[tRPC] Token verified, playerId:", decoded.playerId);
    const player = await playerService.getPlayer(decoded.playerId);
    console.log("[tRPC] Player loaded:", player ? "YES" : "NO");
    return { user: player, event };
  } catch (error) {
    console.error("[tRPC] Error in createContext:", error);
    return { user: null, event };
  }
}

// Initialize tRPC with context
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  console.log("[protectedProcedure] Checking auth, user present:", !!ctx.user);
  
  if (!ctx.user) {
    console.error("[protectedProcedure] Unauthorized - no user in context");
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }

  console.log("[protectedProcedure] Auth passed for user:", ctx.user.id);
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is guaranteed to be non-null
      playerId: ctx.user.id,
    },
  });
});
