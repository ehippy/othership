# Derelict - Backend Implementation Complete! 🚀

## What's Been Built

### ✅ Infrastructure (SST Ion)
- [sst.config.ts](sst.config.ts) - Complete SST configuration
- DynamoDB table with single-table design (on-demand billing)
- 2 Lambda Functions with Function URLs (no API Gateway!)
- Secret management for Discord credentials
- CloudWatch logs with 7-day retention

### ✅ Database Layer (ElectroDB)
- [backend/db/client.ts](packages/backend/db/client.ts) - DynamoDB client
- [backend/db/entities/](packages/backend/db/entities/) - Game, Player, Character entities
- [backend/db/services/](packages/backend/db/services/) - Full CRUD operations
- Single-table design with GSIs for efficient queries
- TTL auto-cleanup for completed games (30 days)

### ✅ API Layer (tRPC)
- [backend/lambda/api/router.ts](packages/backend/lambda/api/router.ts) - Type-safe API
- Game management (create, join, status, complete)
- Character management (create, move, inventory, stats)
- Dice rolling integration with shared game logic
- Lambda Function URL handler

### ✅ Discord Integration
- [backend/lambda/discord/interactions.ts](packages/backend/lambda/discord/interactions.ts) - Webhook handler
- Slash commands: `/start-game`, `/join`, `/status`
- Signature verification with @noble/ed25519
- [backend/lib/discord-client.ts](packages/backend/lib/discord-client.ts) - REST API client
- Posts messages and embeds to channels
- Automated command registration

### ✅ Frontend Setup
- [frontend/lib/api/trpc.ts](packages/frontend/lib/api/trpc.ts) - tRPC client
- React Query integration
- Layout updated for tRPC providers
- Type-safe API calls from backend

## Next Steps

### 1. Set Up Discord Bot

Follow [packages/backend/README.md](packages/backend/README.md):
1. Create Discord application
2. Get Bot Token, Public Key, Application ID
3. Set SST secrets

### 2. Deploy to AWS

```bash
# From game/ directory
pnpm dev
```

This will:
- Deploy DynamoDB table
- Deploy Lambda functions
- Output Function URLs

### 3. Configure Discord

1. Set Interactions Endpoint URL in Discord Developer Portal
2. Register slash commands
3. Invite bot to your server

### 4. Test End-to-End

1. Use `/start-game` in Discord
2. Game created in DynamoDB
3. Bot posts confirmation
4. Use `/join` to add players
5. Build frontend UI to visualize game state

## Architecture Summary

```
Discord → Webhook → Lambda (interactions.ts)
                         ↓
                    ElectroDB Services
                         ↓
                    DynamoDB (single table)
                         ↓
                    Discord REST API (posts back)

Frontend → tRPC → Lambda (handler.ts)
                      ↓
                 ElectroDB Services
                      ↓
                 DynamoDB
```

## Cost: $0/month

- Lambda: ~27k invocations/month (1M free)
- DynamoDB: ~100k requests/month (200M free)
- Storage: ~5 GB (25 GB free)
- CloudWatch: ~0.5 GB logs (5 GB free)

All within AWS Free Tier! 🎉

## What's Not Built Yet

- Frontend Pixi.js game visualization
- Map/room system
- Combat mechanics
- Scenario system
- Real-time updates (polling for now)
- Character creation UI
- Authentication/authorization

But the core serverless backend is complete and ready to use!
