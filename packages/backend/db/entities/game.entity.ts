import { Entity } from "electrodb";
import { dynamoDb, getTableName } from "../client";
import type { Game } from "@derelict/shared";

export const GameEntity = new Entity(
  {
    model: {
      entity: "game",
      version: "1",
      service: "derelict",
    },
    attributes: {
      id: {
        type: "string",
        required: true,
      },
      guildId: {
        type: "string",
        required: true,
      },
      channelId: {
        type: "string",
        required: true,
      },
      slug: {
        type: "string",
        required: true,
      },
      scenarioId: {
        type: "string",
        required: true,
      },
      scenarioName: {
        type: "string",
        required: true,
      },
      status: {
        type: ["staging", "character_creation", "active", "tpk", "won", "abandoned"] as const,
        required: true,
        default: "staging",
      },
      gameStartTime: {
        type: "string",
        required: true,
      },
      minPlayers: {
        type: "number",
        required: true,
      },
      maxPlayers: {
        type: "number",
        required: true,
      },
      turnNumber: {
        type: "number",
        required: true,
        default: 0,
      },
      playerIds: {
        type: "list",
        items: {
          type: "string",
        },
        required: true,
        default: [],
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
      ttl: {
        type: "number",
        required: false,
        // Will be set to 30 days after game completion
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
      byGuild: {
        index: "gsi1",
        pk: {
          field: "gsi1pk",
          composite: ["guildId"],
        },
        sk: {
          field: "gsi1sk",
          composite: ["createdAt"],
        },
      },
      byChannel: {
        index: "gsi2",
        pk: {
          field: "gsi2pk",
          composite: ["channelId"],
        },
        sk: {
          field: "gsi2sk",
          composite: ["status"],
        },
      },
      byGuildSlug: {
        index: "gsi3",
        pk: {
          field: "gsi3pk",
          composite: ["guildId"],
        },
        sk: {
          field: "gsi3sk",
          composite: ["slug"],
        },
      },
    },
  },
  {
    table: getTableName(),
    client: dynamoDb,
  }
);

export type GameEntityType = typeof GameEntity;
