/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "derelict",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const stage = $app.stage;
    
    // Look up the Route53 hosted zone for derelict.world
    const hostedZone = aws.route53.getZoneOutput({ name: "derelict.world" });
    
    // Domain configuration - bare domains for prod, stage prefix for others
    const apiDomain = stage === "prod" ? "api.derelict.world" : `${stage}.api.derelict.world`;
    const frontendDomain = stage === "prod" ? "derelict.world" : `${stage}.derelict.world`;
    
    // Discord secrets
    const discordBotToken = new sst.Secret("DiscordBotToken");
    const discordPublicKey = new sst.Secret("DiscordPublicKey");
    const discordApplicationId = new sst.Secret("DiscordApplicationId");
    const discordClientSecret = new sst.Secret("DiscordClientSecret");
    
    // JWT secret
    const jwtSecret = new sst.Secret("JwtSecret");

    // DynamoDB table for all game state (single-table design)
    const table = new sst.aws.Dynamo("DerelictTable", {
      fields: {
        pk: "string",
        sk: "string",
        gsi1pk: "string",
        gsi1sk: "string",
        gsi2pk: "string",
        gsi2sk: "string",
        gsi3pk: "string",
        gsi3sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      globalIndexes: {
        gsi1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
        gsi2: { hashKey: "gsi2pk", rangeKey: "gsi2sk" },
        gsi3: { hashKey: "gsi3pk", rangeKey: "gsi3sk" },
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
    // SSL certificate automatically created and validated via Route53
    const api = new sst.aws.ApiGatewayV2("Api", {
      domain: {
        name: apiDomain,
        dns: sst.aws.dns({
          zone: hostedZone.id,
        }),
      },
    });

    // Deploy Vite frontend as static site
    // Built as static HTML/CSS/JS and served from S3 via CloudFront
    const frontend = new sst.aws.StaticSite("Frontend", {
      path: "packages/frontend",
      build: {
        command: "pnpm build",
        output: "dist",
      },
      domain: {
        name: frontendDomain,
        dns: sst.aws.dns({
          zone: hostedZone.id,
        }),
      },
      environment: {
        VITE_API_URL: $interpolate`https://${apiDomain}/trpc`,
        VITE_AUTH_LOGIN_URL: $interpolate`https://${apiDomain}/auth/login`,
        VITE_DISCORD_APP_ID: discordApplicationId.value,
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

    api.route("GET /auth/bot-added", {
      handler: "packages/backend/lambda/auth/bot-added.handler",
      link: [table, discordBotToken],
      timeout: "10 seconds",
      memory: "512 MB",
      logging: {
        retention: "1 week",
      },
    });

    // Discord Interactions webhook
    api.route("POST /discord", {
      handler: "packages/backend/lambda/discord/interactions.handler",
      link: [table, discordBotToken, discordPublicKey],
      timeout: "10 seconds",
      memory: "512 MB",
      logging: {
        retention: "1 week",
      },
    });

    return {
      api: api.url,
      discordWebhook: $interpolate`${api.url}/discord`,
      frontend: frontend.url,
      table: table.name,
    };
  },
});