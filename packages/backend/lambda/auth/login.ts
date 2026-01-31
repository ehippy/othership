import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { Resource } from "sst";

const DISCORD_OAUTH_URL = "https://discord.com/api/oauth2/authorize";

/**
 * Redirect to Discord OAuth login
 */
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const clientId = Resource.DiscordApplicationId.value;
  // Construct callback URL from the current API Gateway domain
  const callbackUrl = `https://${event.requestContext.domainName}/auth/callback`;
  
  // Get the origin from headers (where the request came from)
  const origin = event.headers.referer || event.headers.origin || "http://localhost:3002";
  // Remove trailing slash and any path
  const frontendUrl = new URL(origin).origin;

  // Build Discord OAuth URL with state containing the return URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "identify guilds",
    state: Buffer.from(frontendUrl).toString("base64"), // Encode frontend URL in state
  });

  const authUrl = `${DISCORD_OAUTH_URL}?${params.toString()}`;

  return {
    statusCode: 302,
    headers: {
      Location: authUrl,
    },
    body: "",
  };
}
