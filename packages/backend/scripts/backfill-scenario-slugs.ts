#!/usr/bin/env node
/**
 * Backfill script to generate slugs for all existing scenarios
 * Run with: pnpm tsx packages/backend/scripts/backfill-scenario-slugs.ts
 */

import { ScenarioEntity } from '../db/entities/scenario.entity';

/**
 * Slugify a string for use in URLs
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

async function backfillScenarioSlugs() {
  console.log('[backfill] Starting scenario slug backfill...');
  
  try {
    // Fetch all scenarios
    const result = await ScenarioEntity.scan.go();
    const scenarios = result.data;
    
    console.log(`[backfill] Found ${scenarios.length} scenarios`);
    
    // Track used slugs for uniqueness
    const usedSlugs = new Set<string>();
    
    for (const scenario of scenarios) {
      if (scenario.slug) {
        console.log(`[backfill] Scenario ${scenario.name} (${scenario.id}) already has slug: ${scenario.slug}`);
        usedSlugs.add(scenario.slug);
        continue;
      }
      
      // Generate unique slug
      const baseSlug = slugify(scenario.name);
      let slug = baseSlug;
      let suffix = 1;
      
      while (usedSlugs.has(slug)) {
        suffix++;
        slug = `${baseSlug}-${suffix}`;
      }
      
      usedSlugs.add(slug);
      
      // Update scenario with slug
      await ScenarioEntity.patch({ id: scenario.id })
        .set({ slug })
        .go();
      
      console.log(`[backfill] Updated scenario ${scenario.name} (${scenario.id}) with slug: ${slug}`);
    }
    
    console.log('[backfill] Scenario slug backfill complete!');
  } catch (error) {
    console.error('[backfill] Error:', error);
    process.exit(1);
  }
}

backfillScenarioSlugs();
