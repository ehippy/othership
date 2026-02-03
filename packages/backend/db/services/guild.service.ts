import { GuildEntity } from '../entities/guild.entity';
import { ulid } from 'ulid';

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

export class GuildService {
  /**
   * Create a new guild record
   */
  async createGuild(data: {
    discordGuildId: string;
    name: string;
    icon?: string;
    botInstalled?: boolean;
    installedAt?: string;
  }) {
    const id = ulid();
    
    // Generate unique slug
    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let suffix = 1;
    
    // Check for uniqueness and add numeric suffix if needed
    while (await this.getGuildBySlug(slug)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    
    const result = await GuildEntity.create({
      id,
      discordGuildId: data.discordGuildId,
      name: data.name,
      slug,
      icon: data.icon,
      botInstalled: data.botInstalled ?? false,
      installedAt: data.installedAt,
    }).go();

    return result.data;
  }

  /**
   * Get a guild by its Discord guild ID
   */
  async getGuildByDiscordId(discordGuildId: string) {
    const result = await GuildEntity.query
      .byDiscordGuildId({ discordGuildId })
      .go();

    return result.data[0] || null;
  }

  /**
   * Get a guild by its internal ID
   */
  async getGuildById(id: string) {
    const result = await GuildEntity.get({ id }).go();
    return result.data || null;
  }

  /**
   * Get a guild by its slug
   */
  async getGuildBySlug(slug: string) {
    const result = await GuildEntity.query
      .bySlug({ slug })
      .go();

    return result.data[0] || null;
  }

  /**
   * Update guild metadata (name, icon)
   */
  async updateGuildMetadata(
    discordGuildId: string,
    data: { name?: string; icon?: string }
  ) {
    const guild = await this.getGuildByDiscordId(discordGuildId);
    if (!guild) {
      throw new Error(`Guild not found: ${discordGuildId}`);
    }

    const updates: Record<string, any> = {};
    
    // Update name and icon if provided
    if (data.name) updates.name = data.name;
    if (data.icon !== undefined) updates.icon = data.icon;
    
    // Generate slug if it doesn't exist
    if (!guild.slug) {
      const baseSlug = slugify(guild.name);
      let slug = baseSlug;
      let suffix = 1;
      
      // Check for uniqueness and add numeric suffix if needed
      while (await this.getGuildBySlug(slug)) {
        suffix++;
        slug = `${baseSlug}-${suffix}`;
      }
      
      updates.slug = slug;
      console.log(`[guild.service] Generated slug for existing guild: ${slug}`);
    }

    const result = await GuildEntity.patch({ id: guild.id })
      .set(updates)
      .go();

    return result.data;
  }

  /**
   * Mark the bot as installed in a guild
   */
  async markBotInstalled(discordGuildId: string, installedAt?: string) {
    const guild = await this.getGuildByDiscordId(discordGuildId);
    if (!guild) {
      throw new Error(`Guild not found: ${discordGuildId}`);
    }

    const result = await GuildEntity.patch({ id: guild.id })
      .set({
        botInstalled: true,
        installedAt: installedAt || new Date().toISOString(),
      })
      .go();

    return result.data;
  }

  /**
   * Mark the bot as uninstalled from a guild
   */
  async markBotUninstalled(discordGuildId: string) {
    const guild = await this.getGuildByDiscordId(discordGuildId);
    if (!guild) {
      throw new Error(`Guild not found: ${discordGuildId}`);
    }

    const result = await GuildEntity.patch({ id: guild.id })
      .set({
        botInstalled: false,
        installedAt: undefined,
      })
      .go();

    return result.data;
  }

  /**
   * Create or update a guild record
   */
  async upsertGuild(data: {
    discordGuildId: string;
    name: string;
    icon?: string;
    botInstalled?: boolean;
    installedAt?: string;
  }) {
    const existing = await this.getGuildByDiscordId(data.discordGuildId);

    if (existing) {
      return await this.updateGuildMetadata(data.discordGuildId, {
        name: data.name,
        icon: data.icon,
      });
    }

    return await this.createGuild(data);
  }

  /**
   * Set the game channel for a guild
   */
  async setGameChannel(discordGuildId: string, channelId: string, channelName: string) {
    const guild = await this.getGuildByDiscordId(discordGuildId);
    if (!guild) {
      throw new Error(`Guild not found: ${discordGuildId}`);
    }

    const result = await GuildEntity.patch({ id: guild.id })
      .set({ gameChannelId: channelId, gameChannelName: channelName })
      .go();

    return result.data;
  }
}

export const guildService = new GuildService();
