#!/usr/bin/env node
/**
 * Backfill script to generate slugs for all existing guilds
 * Run with: pnpm tsx packages/backend/scripts/backfill-guild-slugs.ts
 */

import { GuildEntity } from '../db/entities/guild.entity';

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

async function backfillGuildSlugs() {
  console.log('[backfill] Starting guild slug backfill...');
  
  try {
    // Fetch all guilds
    const result = await GuildEntity.scan.go();
    const guilds = result.data;
    
    console.log(`[backfill] Found ${guilds.length} guilds`);
    
    // Track used slugs for uniqueness
    const usedSlugs = new Set<string>();
    
    for (const guild of guilds) {
      if (guild.slug) {
        console.log(`[backfill] Guild ${guild.name} (${guild.id}) already has slug: ${guild.slug}`);
        usedSlugs.add(guild.slug);
        continue;
      }
      
      // Generate unique slug
      const baseSlug = slugify(guild.name);
      let slug = baseSlug;
      let suffix = 1;
      
      while (usedSlugs.has(slug)) {
        suffix++;
        slug = `${baseSlug}-${suffix}`;
      }
      
      usedSlugs.add(slug);
      
      // Update guild with slug
      await GuildEntity.patch({ id: guild.id })
        .set({ slug })
        .go();
      
      console.log(`[backfill] Updated guild ${guild.name} (${guild.id}) with slug: ${slug}`);
    }
    
    console.log('[backfill] Guild slug backfill complete!');
  } catch (error) {
    console.error('[backfill] Error:', error);
    process.exit(1);
  }
}

backfillGuildSlugs();
