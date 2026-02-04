import { CharacterEntity } from "../entities";
import { ulid } from "ulid";
import type { Character, Stats, Saves, Position } from "@derelict/shared";

export const characterService = {
  /**
   * Create a new character (skeleton for character creation phase)
   */
  async createCharacter(params: {
    playerId: string;
    gameId: string;
    name: string;
    stats?: Stats;
    saves?: Saves;
    position?: Position;
  }): Promise<Character> {
    const id = ulid();

    const result = await CharacterEntity.create({
      id,
      playerId: params.playerId,
      gameId: params.gameId,
      name: params.name,
      status: "creating",
      stats: params.stats || { strength: 0, speed: 0, intellect: 0, combat: 0, social: 0 },
      saves: params.saves || { sanity: 0, fear: 0, body: 0 },
      health: 10,
      maxHealth: 10,
      wounds: 0,
      maxWounds: 0,
      stress: 2,
      minStress: 2,
      maxStress: 10,
      skills: [],
      loadout: [],
      inventory: [],
      isRIP: false,
      position: params.position,
    }).go();

    return result.data as Character;
  },

  /**
   * Get character by ID
   */
  async getCharacter(characterId: string): Promise<Character | null> {
    try {
      const result = await CharacterEntity.get({ id: characterId }).go();
      return result.data as Character;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get all characters for a player
   */
  async getCharactersByPlayer(playerId: string): Promise<Character[]> {
    const result = await CharacterEntity.query.byPlayer({ playerId }).go();
    return result.data as Character[];
  },

  /**
   * Get all characters in a game (optionally filter by alive/dead)
   */
  async getCharactersByGame(
    gameId: string,
    isRIP?: boolean
  ): Promise<Character[]> {
    if (isRIP === undefined) {
      const result = await CharacterEntity.query.byGame({ gameId }).go();
      return result.data as Character[];
    }

    const result = await CharacterEntity.query
      .byGame({ gameId, isRIP })
      .go();
    return result.data as Character[];
  },

  /**
   * Update character position
   */
  async updatePosition(
    characterId: string,
    position: Position
  ): Promise<Character> {
    const result = await CharacterEntity.patch({ id: characterId })
      .set({ position })
      .go();

    return result.data as Character;
  },

  /**
   * Update character health
   */
  async updateHealth(characterId: string, health: number): Promise<Character> {
    const result = await CharacterEntity.patch({ id: characterId })
      .set({ health })
      .go();

    return result.data as Character;
  },

  /**
   * Update character stress
   */
  async updateStress(characterId: string, stress: number): Promise<Character> {
    const result = await CharacterEntity.patch({ id: characterId })
      .set({ stress })
      .go();

    return result.data as Character;
  },

  /**
   * Add item to inventory
   */
  async addToInventory(
    characterId: string,
    item: string
  ): Promise<Character> {
    const character = await this.getCharacter(characterId);
    if (!character) {
      throw new Error("Character not found");
    }

    const result = await CharacterEntity.patch({ id: characterId })
      .set({ inventory: [...character.inventory, item] })
      .go();

    return result.data as Character;
  },

  /**
   * Remove item from inventory
   */
  async removeFromInventory(
    characterId: string,
    item: string
  ): Promise<Character> {
    const character = await this.getCharacter(characterId);
    if (!character) {
      throw new Error("Character not found");
    }

    const result = await CharacterEntity.patch({ id: characterId })
      .set({
        inventory: character.inventory.filter((i: string) => i !== item),
      })
      .go();

    return result.data as Character;
  },

  /**
   * Mark character as dead
   */
  async killCharacter(characterId: string): Promise<Character> {
    const result = await CharacterEntity.patch({ id: characterId })
      .set({ isRIP: true, health: 0 })
      .go();

    return result.data as Character;
  },
};
