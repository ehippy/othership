import { Entity } from "electrodb";
import { dynamoDb, getTableName } from "../client";
import type { Character } from "@derelict/shared";

export const CharacterEntity = new Entity(
  {
    model: {
      entity: "character",
      version: "1",
      service: "derelict",
    },
    attributes: {
      id: {
        type: "string",
        required: true,
      },
      playerId: {
        type: "string",
        required: true,
      },
      gameId: {
        type: "string",
        required: true,
      },
      name: {
        type: "string",
        required: true,
      },
      characterClass: {
        type: "string",
        required: false,
      },
      status: {
        type: "string",
        required: true,
        default: "creating",
      },
      stats: {
        type: "map",
        properties: {
          strength: { type: "number", required: true },
          speed: { type: "number", required: true },
          intellect: { type: "number", required: true },
          combat: { type: "number", required: true },
          social: { type: "number", required: true },
        },
        required: true,
      },
      saves: {
        type: "map",
        properties: {
          sanity: { type: "number", required: true },
          fear: { type: "number", required: true },
          body: { type: "number", required: true },
        },
        required: true,
      },
      health: {
        type: "number",
        required: true,
        default: 10,
      },
      maxHealth: {
        type: "number",
        required: true,
        default: 10,
      },
      wounds: {
        type: "number",
        required: true,
        default: 0,
      },
      maxWounds: {
        type: "number",
        required: true,
        default: 0,
      },
      stress: {
        type: "number",
        required: true,
        default: 2,
      },
      minStress: {
        type: "number",
        required: true,
        default: 2,
      },
      maxStress: {
        type: "number",
        required: true,
        default: 10,
      },
      skills: {
        type: "list",
        items: {
          type: "string",
        },
        required: true,
        default: [],
      },
      traumaResponse: {
        type: "string",
        required: false,
      },
      loadout: {
        type: "list",
        items: {
          type: "string",
        },
        required: true,
        default: [],
      },
      trinket: {
        type: "string",
        required: false,
      },
      patch: {
        type: "string",
        required: false,
      },
      inventory: {
        type: "list",
        items: {
          type: "string",
        },
        required: true,
        default: [],
      },
      isRIP: {
        type: "boolean",
        required: true,
        default: false,
      },
      position: {
        type: "map",
        properties: {
          x: { type: "number", required: true },
          y: { type: "number", required: true },
        },
        required: false,
      },
      createdAt: {
        type: "string",
        required: true,
        default: () => new Date().toISOString(),
        readOnly: true,
      },
      updatedAt: {
        type: "string",
        required: true,
        default: () => new Date().toISOString(),
        set: () => new Date().toISOString(),
      },
    },
    indexes: {
      primary: {
        pk: {
          field: "pk",
          composite: ["id"],
        },
        sk: {
          field: "sk",
          composite: [],
        },
      },
      byPlayer: {
        index: "gsi1",
        pk: {
          field: "gsi1pk",
          composite: ["playerId"],
        },
        sk: {
          field: "gsi1sk",
          composite: ["createdAt"],
        },
      },
      byGame: {
        index: "gsi2",
        pk: {
          field: "gsi2pk",
          composite: ["gameId"],
        },
        sk: {
          field: "gsi2sk",
          composite: ["isRIP", "name"],
        },
      },
    },
  },
  {
    table: getTableName(),
    client: dynamoDb,
  }
);

export type CharacterEntityType = typeof CharacterEntity;
