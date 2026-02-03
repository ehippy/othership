import { publicProcedure, router } from "./trpc";
import { z } from "zod";
import { ScenarioService } from "../../db/services";

export const scenarioRouter = router({
  listScenarios: publicProcedure.query(async () => {
    return await ScenarioService.listAll();
  }),

  getScenario: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await ScenarioService.getById(input.id);
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        difficulty: z.enum(["tutorial", "easy", "medium", "hard", "deadly"]),
        minPlayers: z.number().min(1).max(20),
        maxPlayers: z.number().min(1).max(20),
        mapData: z.any().optional(),
        initialState: z.any().optional(),
        objectives: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await ScenarioService.create(input);
    }),
});
