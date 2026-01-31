/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "othership",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // Discord secrets
    const discordBotToken = new sst.Secret("DiscordBotToken");
    const discordPublicKey = new sst.Secret("DiscordPublicKey");
    const discordApplicationId = new sst.Secret("DiscordApplicationId");
    const discordClientSecret = new sst.Secret("DiscordClientSecret");
    
    // JWT secret
    const jwtSecret = new sst.Secret("JwtSecret");

    // DynamoDB table for all game state (single-table design)
    const table = new sst.aws.Dynamo("OthershipTable", {
      fields: {
        pk: "string",
        sk: "string",
        gsi1pk: "string",
        gsi1sk: "string",
        gsi2pk: "string",
        gsi2sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      globalIndexes: {
        gsi1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
        gsi2: { hashKey: "gsi2pk", rangeKey: "gsi2sk" },
      },
      transform: {
        table: {
          billingMode: "PAY_PER_REQUEST", // On-demand pricing
          pointInTimeRecovery: {
            enabled: false, // Disable to stay in free tier
          },
          ttl: {
            enabled: true,
            attributeName: "ttl", // Auto-cleanup old games
          },
        },
      },
    });

    // API Gateway V2 for all HTTP endpoints
    const api = new sst.aws.ApiGatewayV2("Api");

    // Deploy Next.js frontend (defined early so we can reference it)
    const frontend = new sst.aws.Nextjs("Frontend", {
      path: "packages/frontend",
      environment: {
        NEXT_PUBLIC_API_URL: $interpolate`${api.url}/trpc`,
        NEXT_PUBLIC_AUTH_LOGIN_URL: $interpolate`${api.url}/auth/login`,
      },
    });
    
    // tRPC API routes
    api.route("ANY /trpc/{proxy+}", {
      handler: "packages/backend/lambda/api/handler.handler",
      link: [table, discordBotToken, jwtSecret],
      timeout: "30 seconds",
      memory: "512 MB",
      logging: {
        retention: "1 week",
      },
    });

    // Auth routes
    api.route("GET /auth/login", {
      handler: "packages/backend/lambda/auth/login.handler",
      link: [discordApplicationId],
      timeout: "10 seconds",
      memory: "256 MB",
      logging: {
        retention: "1 week",
      },
    });

    api.route("GET /auth/callback", {
      handler: "packages/backend/lambda/auth/callback.handler",
      link: [table, discordApplicationId, discordClientSecret, jwtSecret],
      timeout: "10 seconds",
      memory: "512 MB",
      logging: {
        retention: "1 week",
      },
      environment: {
        FRONTEND_URL: frontend.url,
      },
    });

    // Discord Interactions webhook handler (still uses Function URL for Discord's webhook)
    const discordWebhook = new sst.aws.Function("DiscordWebhook", {
      handler: "packages/backend/lambda/discord/interactions.handler",
      link: [table, discordBotToken, discordPublicKey],
      url: true,
      timeout: "10 seconds",
      memory: "512 MB",
      logging: {
        retention: "1 week",
      },
    });

    return {
      api: api.url,
      discordWebhook: discordWebhook.url,
      frontend: frontend.url,
      table: table.name,
    };
  },
});