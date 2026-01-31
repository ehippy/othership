import { Entity } from "electrodb";
import { dynamoDb, getTableName } from "../client";
import type { Player } from "@derelict/shared";

export const PlayerEntity = new Entity(
  {
    model: {
      entity: "player",
      version: "1",
      service: "derelict",
    },
    attributes: {
      id: {
        type: "string",
        required: true,
      },
      discordUserId: {
        type: "string",
        required: true,
      },
      discordUsername: {
        type: "string",
        required: true,
      },
      discordDisplayName: {
        type: "string",
        required: false,
      },
      discordAvatar: {
        type: "string",
        required: false,
      },
      gameId: {
        type: "string",
        required: true,
      },
      activeCharacterId: {
        type: "string",
        required: false,
      },
      guilds: {
        type: "list",
        items: {
          type: "map",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            icon: { type: "string" },
            permissions: { type: "string" },
            botInstalled: { type: "boolean" },
          },
        },
        required: false,
      },
      discordAccessToken: {
        type: "string",
        required: false,
      },
      discordRefreshToken: {
        type: "string",
        required: false,
      },
      discordTokenExpiresAt: {
        type: "number",
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
      byGame: {
        index: "gsi1",
        pk: {
          field: "gsi1pk",
          composite: ["gameId"],
        },
        sk: {
          field: "gsi1sk",
          composite: ["createdAt"],
        },
      },
      byDiscordUser: {
        index: "gsi2",
        pk: {
          field: "gsi2pk",
          composite: ["discordUserId"],
        },
        sk: {
          field: "gsi2sk",
          composite: ["gameId"],
        },
      },
    },
  },
  {
    table: getTableName(),
    client: dynamoDb,
  }
);

export type PlayerEntityType = typeof PlayerEntity;
