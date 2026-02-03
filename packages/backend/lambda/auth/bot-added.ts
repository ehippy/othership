import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { guildService } from "../../db/services";
import { fetchGuildInfo, postEmbed } from "../../lib/discord-client";
import { Resource } from "sst";

/**
 * Handle Discord OAuth callback when bot is added to a guild
 * This is called after user clicks "Add Bot" and authorizes it
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("[bot-added] Received OAuth callback");
  console.log("[bot-added] Query params:", event.queryStringParameters);

  try {
    const guildId = event.queryStringParameters?.guild_id;
    
    if (!guildId) {
      console.error("[bot-added] No guild_id in callback");
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/html" },
        body: "<html><body><h1>Error</h1><p>No guild ID provided</p></body></html>",
      };
    }

    console.log("[bot-added] Processing guild:", guildId);

    // Fetch guild info from Discord
    const guildInfo = await fetchGuildInfo(guildId);
    
    if (!guildInfo) {
      console.error("[bot-added] Could not fetch guild info for:", guildId);
      return {
        statusCode: 404,
        headers: { "Content-Type": "text/html" },
        body: "<html><body><h1>Error</h1><p>Guild not found</p></body></html>",
      };
    }

    console.log("[bot-added] Guild info:", guildInfo.name);

    // Create or update guild record
    const existingGuild = await guildService.getGuildByDiscordId(guildId);
    
    let isNewInstall = false;
    
    if (existingGuild) {
      console.log("[bot-added] Guild exists, marking as installed");
      await guildService.markBotInstalled(guildId);
      await guildService.updateGuildMetadata(guildId, {
        name: guildInfo.name,
        icon: guildInfo.icon || undefined,
      });
      // Check if this is a reinstall
      isNewInstall = !existingGuild.botInstalled;
    } else {
      console.log("[bot-added] Creating new guild record");
      await guildService.createGuild({
        discordGuildId: guildId,
        name: guildInfo.name,
        icon: guildInfo.icon || undefined,
        botInstalled: true,
        installedAt: new Date().toISOString(),
      });
      isNewInstall = true;
    }

    console.log("[bot-added] Successfully processed guild");

    // Send notification to admin channel about new installation
    if (isNewInstall) {
      try {
        await postEmbed(
          Resource.AdminNotificationChannelId.value,
          {
            title: "🤖 Bot Added to New Server",
            description: `**${guildInfo.name}** has installed the bot`,
            color: 0x43B581, // Green
            fields: [
              { name: "Guild ID", value: guildId, inline: true },
              { name: "Added", value: new Date().toISOString(), inline: true },
            ],
          }
        );
      } catch (error) {
        console.error("[bot-added] Failed to send notification:", error);
        // Don't fail the installation if notification fails
      }
    }

    console.log("[bot-added] Successfully processed guild");

    // Return success page with redirect to app
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Bot Added</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(to bottom, #111827, #000000);
              }
              .container {
                text-align: center;
                color: white;
              }
              h1 {
                font-size: 2rem;
                margin-bottom: 1rem;
              }
              .guild-name {
                color: #818cf8;
                font-weight: 600;
              }
              p {
                color: #9ca3af;
                margin-top: 0.5rem;
              }
            </style>
            <script>
              // Notify parent window that bot was added
              if (window.opener) {
                window.opener.postMessage({ type: 'bot-added', guildId: '${guildId}' }, '*');
                setTimeout(() => {
                  window.close();
                }, 2000);
              } else {
                // Not a popup - redirect to frontend with guild ID
                setTimeout(() => {
                  window.location.href = '${process.env.APP_URL}/?botAdded=${guildId}';
                }, 2000);
              }
            </script>
          </head>
          <body>
            <div class="container">
              <h1>Bot connected to <span class="guild-name">${guildInfo.name}</span></h1>
              <p>This window will close automatically</p>
            </div>
          </body>
        </html>
      `,
    };
  } catch (error) {
    console.error("[bot-added] Error processing callback:", error);
    
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html" },
      body: `
        <html>
          <body>
            <h1>Error</h1>
            <p>Failed to add bot: ${error instanceof Error ? error.message : "Unknown error"}</p>
          </body>
        </html>
      `,
    };
  }
};
