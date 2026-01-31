import { GuildMembershipEntity } from '../entities/guild-membership.entity';
import { randomUUID } from 'crypto';

export class GuildMembershipService {
  /**
   * Get all members in a guild (opted in and out)
   * Sorted: opted-in first, then alphabetically by username
   */
  async getRoster(guildId: string) {
    const result = await GuildMembershipEntity.query
      .byGuild({ guildId })
      .go();

    // ElectroDB sorts by SK (optedIn, playerUsername), but we want opted-in first
    // Since optedIn is boolean, false < true, so we need to reverse the optedIn sort
    return result.data.sort((a, b) => {
      // Opted in users first
      if (a.optedIn && !b.optedIn) return -1;
      if (!a.optedIn && b.optedIn) return 1;
      // Then alphabetical by username
      return a.playerUsername.localeCompare(b.playerUsername);
    });
  }

  /**
   * Get a specific membership record
   */
  async getMembership(playerId: string, guildId: string) {
    const result = await GuildMembershipEntity.get({
      playerId,
      guildId,
    }).go();
    return result.data;
  }

  /**
   * Get all memberships for a player (across all guilds)
   */
  async getPlayerMemberships(playerId: string) {
    const result = await GuildMembershipEntity.query
      .primary({ playerId })
      .go();
    return result.data;
  }

  /**
   * Set opt-in status for a player in a guild
   */
  async setOptIn(playerId: string, guildId: string, optedIn: boolean) {
    // Fetch existing record to get username for GSI update
    const existing = await this.getMembership(playerId, guildId);
    if (!existing) {
      throw new Error('Membership not found');
    }

    const result = await GuildMembershipEntity.patch({
      playerId,
      guildId,
    })
      .set({ optedIn, lastActiveAt: new Date().toISOString() })
      .composite({ playerUsername: existing.playerUsername })
      .go();
    return result.data;
  }

  /**
   * Upsert a membership record (used during OAuth sync)
   */
  async upsertMembership(
    playerId: string,
    guildId: string,
    playerUsername: string,
    playerAvatar: string | null
  ) {
    // Check if membership exists
    const existing = await this.getMembership(playerId, guildId);

    if (existing) {
      // Update profile data, preserve optedIn status
      const result = await GuildMembershipEntity.patch({
        playerId,
        guildId,
      })
        .set({
          playerUsername,
          playerAvatar: playerAvatar || undefined,
          lastActiveAt: new Date().toISOString(),
          optedIn: existing.optedIn, // Include optedIn for GSI key formatting
        })
        .go();
      return result.data;
    } else {
      // Create new membership, default optedIn = false
      const result = await GuildMembershipEntity.create({
        id: randomUUID(),
        playerId,
        guildId,
        playerUsername,
        playerAvatar: playerAvatar || undefined,
        optedIn: false,
      }).go();
      return result.data;
    }
  }

  /**
   * Sync memberships for a player across all their current guilds
   * Creates/updates memberships for current guilds, deletes for departed guilds
   */
  async syncMemberships(
    playerId: string,
    currentGuilds: Array<{ id: string; name: string; icon?: string }>,
    playerUsername: string,
    playerAvatar: string | null
  ) {
    // Get all existing memberships for this player
    const existingResult = await GuildMembershipEntity.query
      .primary({ playerId })
      .go();
    const existingMemberships = existingResult.data;

    const currentGuildIds = new Set(currentGuilds.map((g) => g.id));

    // Upsert memberships for current guilds
    const upsertPromises = currentGuilds.map((guild) =>
      this.upsertMembership(playerId, guild.id, playerUsername, playerAvatar)
    );

    // Delete memberships for guilds the player is no longer in
    const deletePromises = existingMemberships
      .filter((m) => !currentGuildIds.has(m.guildId))
      .map((m) => this.deleteMembership(playerId, m.guildId));

    await Promise.all([...upsertPromises, ...deletePromises]);
  }

  /**
   * Delete a membership record
   */
  async deleteMembership(playerId: string, guildId: string) {
    await GuildMembershipEntity.delete({
      playerId,
      guildId,
    }).go();
  }
}

export const guildMembershipService = new GuildMembershipService();
