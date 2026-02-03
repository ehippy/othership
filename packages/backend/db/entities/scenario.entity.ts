import { Entity } from "electrodb";
import { dynamoDb, getTableName } from "../client";
import type { Scenario } from "@derelict/shared";

export const ScenarioEntity = new Entity(
  {
    model: {
      entity: "scenario",
      version: "1",
      service: "derelict",
    },
    attributes: {
      id: {
        type: "string",
        required: true,
      },
      name: {
        type: "string",
        required: true,
      },
      description: {
        type: "string",
        required: true,
      },
      difficulty: {
        type: ["tutorial", "easy", "medium", "hard", "deadly"] as const,
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
      mapData: {
        type: "any",
        required: false,
      },
      initialState: {
        type: "any",
        required: false,
      },
      objectives: {
        type: "list",
        items: {
          type: "string",
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
        watch: "*",
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
    },
  },
  {
    table: getTableName(),
    client: dynamoDb,
  }
);

export type ScenarioEntityType = typeof ScenarioEntity;
export type ScenarioItem = Scenario;
