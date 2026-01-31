import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { guildService } from "../../db/services";
import { fetchGuildInfo } from "../../lib/discord-client";

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
    
    if (existingGuild) {
      console.log("[bot-added] Guild exists, marking as installed");
      await guildService.markBotInstalled(guildId);
      await guildService.updateGuildMetadata(guildId, {
        name: guildInfo.name,
        icon: guildInfo.icon || undefined,
      });
    } else {
      console.log("[bot-added] Creating new guild record");
      await guildService.createGuild({
        discordGuildId: guildId,
        name: guildInfo.name,
        icon: guildInfo.icon || undefined,
        botInstalled: true,
        installedAt: new Date().toISOString(),
      });
    }

    console.log("[bot-added] Successfully processed guild");

    // Return success page with redirect to app
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <html>
          <head>
            <title>Bot Added Successfully</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 3rem;
                border-radius: 1rem;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                text-align: center;
                max-width: 500px;
              }
              h1 {
                color: #2d3748;
                margin-bottom: 1rem;
              }
              p {
                color: #4a5568;
                margin-bottom: 2rem;
              }
              .guild-name {
                font-weight: bold;
                color: #5a67d8;
              }
            </style>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </head>
          <body>
            <div class="container">
              <h1>🎉 Bot Added Successfully!</h1>
              <p>Othership bot has been added to <span class="guild-name">${guildInfo.name}</span></p>
              <p>This window will close automatically...</p>
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
