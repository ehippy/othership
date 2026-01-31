import { router } from "./trpc";
import { gameRouter } from "./game.router";
import { characterRouter } from "./character.router";
import { playerRouter } from "./player.router";

// Root tRPC router
export const appRouter = router({
  game: gameRouter,
  character: characterRouter,
  player: playerRouter,
});

// Export type for use in frontend
export type AppRouter = typeof appRouter;
