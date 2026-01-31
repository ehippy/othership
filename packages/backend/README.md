# Derelict Backend Setup

## Prerequisites

1. **Discord Bot Setup**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "Bot" section and create a bot
   - Copy the bot token
   - Go to "General Information" and copy:
     - Application ID
     - Public Key
   - Enable "MESSAGE CONTENT INTENT" if you need to read messages
   - Go to "Installation" and set install link
   - Required bot permissions: Send Messages, Use Slash Commands

2. **AWS Account**:
   - Configured with AWS CLI (`aws configure`)
   - Or use AWS credentials in environment

## Setup Steps

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set SST Secrets

Set your Discord credentials:

```bash
# From the game/ directory
sst secret set DiscordBotToken "YOUR_BOT_TOKEN"
sst secret set DiscordPublicKey "YOUR_PUBLIC_KEY"
sst secret set DiscordApplicationId "YOUR_APPLICATION_ID"
```

### 3. Deploy Infrastructure

```bash
# Start dev mode (deploys to AWS, live Lambda development)
pnpm dev

# Or deploy to production
pnpm deploy --stage production
```

SST will output:
- `api`: Your tRPC Function URL
- `discordWebhook`: Your Discord interactions endpoint URL

### 4. Configure Discord Interactions URL

1. Go to Discord Developer Portal → Your Application
2. Go to "General Information"
3. Set "Interactions Endpoint URL" to your `discordWebhook` URL from SST
4. Discord will send a verification request (SST handles this automatically)

### 5. Register Slash Commands

After deploying, register commands:

```bash
cd packages/backend
DISCORD_APPLICATION_ID="your-app-id" DISCORD_BOT_TOKEN="your-token" tsx lambda/discord/register-commands.ts
```

Or commands will be registered automatically on next deploy.

## Development Workflow

```bash
# Start SST dev (live Lambda + hot reload)
pnpm dev

# In another terminal, work on code
# Changes to Lambda functions will auto-deploy in seconds

# Build shared package when types change
cd packages/shared && pnpm build
```

## Project Structure

```
packages/backend/
├── db/                     # ElectroDB layer
│   ├── client.ts          # DynamoDB client
│   ├── entities/          # Entity schemas
│   └── services/          # Business logic
├── lambda/
│   ├── api/               # tRPC handlers
│   │   ├── handler.ts     # Lambda entry point
│   │   ├── router.ts      # Root router
│   │   ├── game.router.ts
│   │   └── character.router.ts
│   └── discord/           # Discord handlers
│       ├── interactions.ts
│       └── register-commands.ts
└── lib/
    └── discord-client.ts  # Discord REST API
```

## Testing

### Test Discord Commands

1. Invite your bot to a Discord server
2. In any channel, type:
   - `/start-game` - Creates a new game
   - `/join` - Joins the active game
   - `/status` - Shows game status

### Test tRPC API

```bash
curl -X POST "YOUR_API_URL/game.create" \
  -H "Content-Type: application/json" \
  -d '{"serverId":"test","channelId":"test"}'
```

## Cost Monitoring

- Check AWS billing dashboard regularly
- Set up billing alerts:
  ```bash
  aws budgets create-budget --account-id YOUR_ACCOUNT_ID \
    --budget file://budget.json
  ```

## Troubleshooting

### Discord verification fails
- Check that Public Key in SST secrets matches Discord Developer Portal
- Check CloudWatch logs for the DiscordWebhook function

### Commands not appearing
- Run register-commands.ts script again
- Discord commands can take up to 1 hour to propagate globally
- Use guild-specific commands for instant updates (modify register-commands.ts)

### Database errors
- Check DynamoDB table exists in AWS Console
- Verify IAM permissions for Lambda functions
- Check CloudWatch logs for detailed error messages
