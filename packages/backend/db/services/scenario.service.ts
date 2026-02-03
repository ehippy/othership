import { ScenarioEntity } from "../entities/scenario.entity";
import type { Scenario } from "@derelict/shared";

export const ScenarioService = {
  async getById(id: string): Promise<Scenario | null> {
    try {
      const result = await ScenarioEntity.get({ id }).go();
      return result.data as Scenario;
    } catch (error) {
      console.error("Error fetching scenario:", error);
      return null;
    }
  },

  async listAll(): Promise<Scenario[]> {
    try {
      const result = await ScenarioEntity.scan.go();
      return result.data as Scenario[];
    } catch (error) {
      console.error("Error listing scenarios:", error);
      return [];
    }
  },

  async create(scenario: Omit<Scenario, "id" | "createdAt" | "updatedAt">): Promise<Scenario> {
    const id = crypto.randomUUID();
    const result = await ScenarioEntity.create({
      id,
      ...scenario,
    }).go();
    return result.data as Scenario;
  },
};
