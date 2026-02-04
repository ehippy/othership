import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { characterService, playerService } from "../../db/services";
import { rollDie, rollCheck, getStatModifier, getSaveModifier } from "@derelict/shared";

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

  // Update character (for character creation)
  update: publicProcedure
    .input(
      z.object({
        characterId: z.string(),
        name: z.string().optional(),
        characterClass: z.enum(['marine', 'android', 'scientist', 'teamster']).optional(),
        chosenStatModifier: z.enum(['strength', 'speed', 'intellect', 'combat', 'social']).optional(),
        status: z.enum(['creating', 'ready', 'rip']).optional(),
        stats: z.object({
          strength: z.number(),
          speed: z.number(),
          intellect: z.number(),
          combat: z.number(),
          social: z.number(),
        }).optional(),
        saves: z.object({
          sanity: z.number(),
          fear: z.number(),
          body: z.number(),
        }).optional(),
        maxHealth: z.number().optional(),
        maxWounds: z.number().optional(),
        skills: z.array(z.string()).optional(),
        loadout: z.array(z.string()).optional(),
        trinket: z.string().optional(),
        patch: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { characterId, ...updates } = input;
      return await characterService.updateCharacter(characterId, updates);
    }),

  // Apply class modifiers to existing stats/saves
  applyClassModifiers: publicProcedure
    .input(
      z.object({
        characterId: z.string(),
        characterClass: z.enum(['marine', 'android', 'scientist', 'teamster']),
        chosenStatModifier: z.enum(['strength', 'speed', 'intellect', 'combat', 'social']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const character = await characterService.getCharacter(input.characterId);
      if (!character) {
        throw new Error("Character not found");
      }

      // Calculate final stats with modifiers
      const finalStats = {
        strength: character.stats.strength + getStatModifier(input.characterClass, 'strength', input.chosenStatModifier),
        speed: character.stats.speed + getStatModifier(input.characterClass, 'speed', input.chosenStatModifier),
        intellect: character.stats.intellect + getStatModifier(input.characterClass, 'intellect', input.chosenStatModifier),
        combat: character.stats.combat + getStatModifier(input.characterClass, 'combat', input.chosenStatModifier),
        social: character.stats.social + getStatModifier(input.characterClass, 'social', input.chosenStatModifier),
      };

      // Calculate final saves with modifiers
      const finalSaves = {
        sanity: character.saves.sanity + getSaveModifier(input.characterClass, 'sanity'),
        fear: character.saves.fear + getSaveModifier(input.characterClass, 'fear'),
        body: character.saves.body + getSaveModifier(input.characterClass, 'body'),
      };

      // Update character with class, chosen stat, and modified values
      return await characterService.updateCharacter(input.characterId, {
        characterClass: input.characterClass,
        chosenStatModifier: input.chosenStatModifier,
        stats: finalStats,
        saves: finalSaves,
      });
    }),

  // Roll for a stat (2d10 + 25)
  rollStat: publicProcedure
    .input(
      z.object({
        characterId: z.string(),
        stat: z.enum(['strength', 'speed', 'intellect', 'combat', 'social']),
      })
    )
    .mutation(async ({ input }) => {
      const character = await characterService.getCharacter(input.characterId);
      if (!character) {
        throw new Error("Character not found");
      }

      // Check if already rolled (stat is not 0)
      if (character.stats[input.stat] !== 0) {
        throw new Error("Stat already rolled");
      }

      // Roll 2d10 + 25
      const die1 = rollDie(10);
      const die2 = rollDie(10);
      const baseValue = die1 + die2 + 25;
      
      // Apply class modifier
      const modifier = character.characterClass 
        ? getStatModifier(character.characterClass, input.stat, character.chosenStatModifier)
        : 0;
      const value = baseValue + modifier;

      // Update the stat
      const updatedStats = { ...character.stats, [input.stat]: value };
      const updatedCharacter = await characterService.updateCharacter(input.characterId, {
        stats: updatedStats,
      });

      return {
        character: updatedCharacter,
        rolls: [die1, die2],
        baseValue,
        modifier,
        value,
      };
    }),

  // Roll for a save (2d10 + 10)
  rollSave: publicProcedure
    .input(
      z.object({
        characterId: z.string(),
        save: z.enum(['sanity', 'fear', 'body']),
      })
    )
    .mutation(async ({ input }) => {
      const character = await characterService.getCharacter(input.characterId);
      if (!character) {
        throw new Error("Character not found");
      }

      // Check if already rolled (save is not 0)
      if (character.saves[input.save] !== 0) {
        throw new Error("Save already rolled");
      }

      // Roll 2d10 + 10
      const die1 = rollDie(10);
      const die2 = rollDie(10);
      const baseValue = die1 + die2 + 10;
      
      // Apply class modifier
      const modifier = character.characterClass 
        ? getSaveModifier(character.characterClass, input.save)
        : 0;
      const value = baseValue + modifier;

      // Update the save
      const updatedSaves = { ...character.saves, [input.save]: value };
      const updatedCharacter = await characterService.updateCharacter(input.characterId, {
        saves: updatedSaves,
      });

      return {
        character: updatedCharacter,
        rolls: [die1, die2],
        baseValue,
        modifier,
        value,
      };
    }),

  // Roll all unrolled stats and saves at once
  rollAllStats: publicProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ input }) => {
      const character = await characterService.getCharacter(input.characterId);
      if (!character) {
        throw new Error("Character not found");
      }

      const updatedStats = { ...character.stats };
      const updatedSaves = { ...character.saves };
      const results = {
        stats: {} as Record<string, { rolls: number[]; value: number }>,
        saves: {} as Record<string, { rolls: number[]; value: number }>,
      };

      // Roll all unrolled stats
      (['strength', 'speed', 'intellect', 'combat', 'social'] as const).forEach((stat) => {
        if (character.stats[stat] === 0) {
          const die1 = rollDie(10);
          const die2 = rollDie(10);
          const value = die1 + die2 + 25;
          updatedStats[stat] = value;
          results.stats[stat] = { rolls: [die1, die2], value };
        }
      });

      // Roll all unrolled saves
      (['sanity', 'fear', 'body'] as const).forEach((save) => {
        if (character.saves[save] === 0) {
          const die1 = rollDie(10);
          const die2 = rollDie(10);
          const value = die1 + die2 + 10;
          updatedSaves[save] = value;
          results.saves[save] = { rolls: [die1, die2], value };
        }
      });

      // Update character with all new values in one operation
      const updatedCharacter = await characterService.updateCharacter(input.characterId, {
        stats: updatedStats,
        saves: updatedSaves,
      });

      return {
        character: updatedCharacter,
        results,
      };
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
