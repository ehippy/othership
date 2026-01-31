import { GuildEntity } from '../entities/guild.entity';
import { ulid } from 'ulid';

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
    const result = await GuildEntity.create({
      id,
      discordGuildId: data.discordGuildId,
      name: data.name,
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

    const result = await GuildEntity.patch({ id: guild.id })
      .set({
        ...(data.name && { name: data.name }),
        ...(data.icon !== undefined && { icon: data.icon }),
      })
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
}

export const guildService = new GuildService();
