import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { verify } from "@noble/ed25519";
import { Resource } from "sst";
import { gameService, playerService, guildService } from "../../db/services";
import { postToChannel, fetchGuildInfo } from "../../lib/discord-client";

// Discord interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const;

/**
 * Verify Discord signature
 */
async function verifyDiscordRequest(
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  try {
    const publicKey = Resource.DiscordPublicKey.value;
    const message = new TextEncoder().encode(timestamp + body);
    const sig = hexToBytes(signature);
    const key = hexToBytes(publicKey);
    return await verify(sig, message, key);
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Handle Discord slash commands
 */
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // Verify Discord signature
  const signature = event.headers["x-signature-ed25519"];
  const timestamp = event.headers["x-signature-timestamp"];
  const body = event.body || "";

  if (!signature || !timestamp) {
    return {
      statusCode: 401,
      body: "Invalid request signature",
    };
  }

  const isValid = await verifyDiscordRequest(signature, timestamp, body);
  if (!isValid) {
    return {
      statusCode: 401,
      body: "Invalid request signature",
    };
  }

  const interaction = JSON.parse(body);

  // Handle ping
  if (interaction.type === InteractionType.PING) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: InteractionResponseType.PONG }),
    };
  }

  // Handle slash commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = interaction.data;
    const channelId = interaction.channel_id;
    const userId = interaction.member?.user?.id || interaction.user?.id;
    const username =
      interaction.member?.user?.username || interaction.user?.username;
    const guildId = interaction.guild_id;

    // Lazy initialization: ensure guild exists in our database
    if (guildId) {
      try {
        const existingGuild = await guildService.getGuildByDiscordId(guildId);
        if (!existingGuild) {
          console.log("[interactions] Lazy initializing guild:", guildId);
          const guildInfo = await fetchGuildInfo(guildId);
          if (guildInfo) {
            await guildService.createGuild({
              discordGuildId: guildId,
              name: guildInfo.name,
              icon: guildInfo.icon || undefined,
              botInstalled: true,
              installedAt: new Date().toISOString(),
            });
            console.log("[interactions] Guild initialized:", guildInfo.name);
          }
        }
      } catch (error) {
        console.error("[interactions] Failed to initialize guild:", error);
        // Continue anyway - non-critical
      }
    }

    try {
      switch (name) {
        case "start-game": {
          // Create new game
          const game = await gameService.createGame({
            guildId: interaction.guild_id,
            channelId,
          });

          // Post to channel
          await postToChannel(
            channelId,
            `🎮 **Game Started!**\n\nGame ID: ${game.id}\n\nUse \`/join\` to join the game!`,
            interaction.guild_id
          );

          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `Game created! Check the web UI to set up your character.`,
                flags: 64, // Ephemeral (only visible to user)
              },
            }),
          };
        }

        case "join": {
          // Get active game in channel
          const game = await gameService.getActiveGameByChannel(channelId);
          if (!game) {
            return {
              statusCode: 200,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: "No active game in this channel. Use `/start-game` first!",
                  flags: 64,
                },
              }),
            };
          }

          // Check if player already exists
          const existingPlayer = await playerService.getPlayerByDiscordUser(
            userId,
            game.id
          );

          if (existingPlayer) {
            return {
              statusCode: 200,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: "You're already in this game!",
                  flags: 64,
                },
              }),
            };
          }

          // Create player
          const player = await playerService.createPlayer({
            discordUserId: userId,
            discordUsername: username,
            gameId: game.id,
          });

          // Add player to game
          await gameService.addPlayerToGame(game.id, player.id);

          // Post to channel
          await postToChannel(
            channelId,
            `✅ **${username}** joined the game!`,
            interaction.guild_id
          );

          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "You joined! Create your character in the web UI.",
                flags: 64,
              },
            }),
          };
        }

        case "status": {
          // Get active game
          const game = await gameService.getActiveGameByChannel(channelId);
          if (!game) {
            return {
              statusCode: 200,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: "No active game in this channel.",
                  flags: 64,
                },
              }),
            };
          }

          const players = await playerService.getPlayersByGame(game.id);

          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `📊 **Game Status**\n\nStatus: ${game.status}\nTurn: ${game.turnNumber}\nPlayers: ${players.length}`,
              },
            }),
          };
        }

        default: {
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "Unknown command",
                flags: 64,
              },
            }),
          };
        }
      }
    } catch (error) {
      console.error("Error handling command:", error);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "An error occurred. Please try again.",
            flags: 64,
          },
        }),
      };
    }
  }

  return {
    statusCode: 400,
    body: "Unknown interaction type",
  };
}
