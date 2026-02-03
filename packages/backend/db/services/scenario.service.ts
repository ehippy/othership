import { ScenarioEntity } from "../entities/scenario.entity";
import type { Scenario } from "@derelict/shared";

/**
 * Slugify a string for use in URLs
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters except hyphens
 * - Collapse multiple hyphens
 * - Trim hyphens from ends
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50); // Max 50 chars
}

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

  async getBySlug(slug: string): Promise<Scenario | null> {
    try {
      const result = await ScenarioEntity.query.bySlug({ slug }).go();
      return (result.data[0] as Scenario) || null;
    } catch (error) {
      console.error("Error fetching scenario by slug:", error);
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

  async create(scenario: Omit<Scenario, "id" | "slug" | "createdAt" | "updatedAt">): Promise<Scenario> {
    const id = crypto.randomUUID();
    
    // Generate unique slug
    const baseSlug = slugify(scenario.name);
    let slug = baseSlug;
    let suffix = 1;
    
    // Check for uniqueness and add numeric suffix if needed
    while (await this.getBySlug(slug)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    
    const result = await ScenarioEntity.create({
      id,
      slug,
      ...scenario,
    }).go();
    return result.data as Scenario;
  },

  async update(id: string, updates: Partial<Omit<Scenario, "id" | "creatorId" | "createdAt" | "updatedAt">>): Promise<Scenario> {
    const result = await ScenarioEntity.patch({ id })
      .set(updates)
      .go();
    return result.data as Scenario;
  },

  async delete(id: string): Promise<void> {
    await ScenarioEntity.delete({ id }).go();
  },
};
