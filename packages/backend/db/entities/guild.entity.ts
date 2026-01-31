import { Entity } from 'electrodb';
import { client, getTableName } from '../client';

export const GuildEntity = new Entity(
  {
    model: {
      entity: 'Guild',
      version: '1',
      service: 'derelict',
    },
    attributes: {
      id: {
        type: 'string',
        required: true,
      },
      discordGuildId: {
        type: 'string',
        required: true,
      },
      name: {
        type: 'string',
        required: true,
      },
      icon: {
        type: 'string',
        required: false,
      },
      botInstalled: {
        type: 'boolean',
        required: true,
        default: false,
      },
      installedAt: {
        type: 'string',
        required: false,
      },
      gameChannelId: {
        type: 'string',
        required: false,
      },
      createdAt: {
        type: 'string',
        required: true,
        default: () => new Date().toISOString(),
        readOnly: true,
      },
      updatedAt: {
        type: 'string',
        required: true,
        default: () => new Date().toISOString(),
        set: () => new Date().toISOString(),
        watch: '*',
      },
    },
    indexes: {
      primary: {
        pk: {
          field: 'pk',
          composite: ['id'],
        },
        sk: {
          field: 'sk',
          composite: [],
        },
      },
      byDiscordGuildId: {
        index: 'gsi1',
        pk: {
          field: 'gsi1pk',
          composite: ['discordGuildId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: [],
        },
      },
    },
  },
  {
    table: getTableName(),
    client,
  }
);

export type Guild = typeof GuildEntity['schema']['attributes'];
