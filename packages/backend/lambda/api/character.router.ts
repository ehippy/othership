import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { characterService, playerService } from "../../db/services";
import { rollDie, rollCheck } from "@derelict/shared";

export const characterRouter = router({
  // Create a new character
  create: publicProcedure
    .input(
      z.object({
        playerId: z.string(),
        gameId: z.string(),
        name: z.string(),
        stats: z.object({
          strength: z.number(),
          speed: z.number(),
          intellect: z.number(),
          combat: z.number(),
          social: z.number(),
        }),
        saves: z.object({
          sanity: z.number(),
          fear: z.number(),
          body: z.number(),
        }),
        position: z
          .object({
            x: z.number(),
            y: z.number(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const character = await characterService.createCharacter({
        playerId: input.playerId,
        gameId: input.gameId,
        name: input.name,
        stats: input.stats,
        saves: input.saves,
        position: input.position,
      });

      // Set as active character for player
      await playerService.setActiveCharacter(input.playerId, character.id);

      return character;
    }),

  // Get character by ID
  get: publicProcedure
    .input(z.object({ characterId: z.string() }))
    .query(async ({ input }) => {
      const character = await characterService.getCharacter(input.characterId);
      if (!character) {
        throw new Error("Character not found");
      }
      return character;
    }),

  // Get all characters for a player
  listByPlayer: publicProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ input }) => {
      return await characterService.getCharactersByPlayer(input.playerId);
    }),

  // Get all characters in a game
  listByGame: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        isRIP: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return await characterService.getCharactersByGame(
        input.gameId,
        input.isRIP
      );
    }),

  // Move character
  move: publicProcedure
    .input(
      z.object({
        characterId: z.string(),
        position: z.object({
          x: z.number(),
          y: z.number(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return await characterService.updatePosition(
        input.characterId,
        input.position
      );
    }),

  // Update health
  updateHealth: publicProcedure
    .input(
      z.object({
        characterId: z.string(),
        health: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await characterService.updateHealth(
        input.characterId,
        input.health
      );
    }),

  // Update stress
  updateStress: publicProcedure
    .input(
      z.object({
        characterId: z.string(),
        stress: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await characterService.updateStress(
        input.characterId,
        input.stress
      );
    }),

  // Add item to inventory
  addItem: publicProcedure
    .input(
      z.object({
        characterId: z.string(),
        item: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await characterService.addToInventory(
        input.characterId,
        input.item
      );
    }),

  // Remove item from inventory
  removeItem: publicProcedure
    .input(
      z.object({
        characterId: z.string(),
        item: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await characterService.removeFromInventory(
        input.characterId,
        input.item
      );
    }),

  // Roll dice
  roll: publicProcedure
    .input(
      z.object({
        characterId: z.string(),
        stat: z.enum(["strength", "speed", "intellect", "combat", "social"]),
      })
    )
    .mutation(async ({ input }) => {
      const character = await characterService.getCharacter(input.characterId);
      if (!character) {
        throw new Error("Character not found");
      }

      const statValue = character.stats[input.stat];
      const roll = rollDie(100);
      const result = rollCheck(roll, statValue);

      return {
        character,
        stat: input.stat,
        statValue,
        roll,
        success: result.success,
        critical: result.critical,
      };
    }),

  // Kill character
  kill: publicProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ input }) => {
      return await characterService.killCharacter(input.characterId);
    }),
});
