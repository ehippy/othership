# CLAUDE.md - Project Context for AI Assistants

## Project Overview

**Derelict** is a cooperative browser-based survival horror game set in space, inspired by FTL, Alien Isolation, and the Mothership tabletop RPG. The game integrates a Discord bot with a web-based UI to create a unique multiplayer turn-based survival experience.

**Core Concept:**
- Players coordinate through Discord chat and commands
- Visualize and interact with the game through a browser-based interface
- Turn-based gameplay with Mothership RPG mechanics
- Emphasis on resource management, exploration, and survival horror atmosphere

**Current Status:** Early development phase - detailed design documentation exists in `ideas/` directory, implementation is underway.

## Tech Stack

### Backend
- **Runtime:** Node.js with TypeScript
- **Discord Integration:** discord.js
- **Infrastructure:** AWS Lambda + API Gateway (serverless)
- **Database:** AWS DynamoDB with ElectroDB (TypeScript ORM)
- **API Layer:** tRPC for type-safe endpoints
- **Deployment:** SST Ion 3.x

### Frontend
- **Framework:** Next.js (App Router) with TypeScript - **SPA ONLY, NO SSR**
  - `output: 'export'` - Static site generation
  - All pages are client components (`"use client"`)
  - Client-side routing with pretty URLs (`/guildname-123456`)
  - Deployed as static files to S3 + CloudFront
- **UI Library:** React
- **Styling:** Tailwind CSS
- **Data Fetching:** tRPC + React Query (client-side only)
- **Authentication:** Client-side JWT stored in localStorage
- **Game Rendering:** Pixi.js for 2D WebGL rendering
  - @pixi/react for React integration
  - pixi-tilemap for efficient tile rendering
  - pixi-viewport for camera controls
  - pixi-filters for visual effects

**Important: This is a pure Single-Page Application (SPA)**
- No server-side rendering (SSR)
- No API routes in Next.js
- All dynamic data fetched client-side via tRPC
- CloudFront configured to serve index.html for all routes (404 → 200 redirect)
- Pretty URLs work via client-side routing (e.g., `/guildname-1234567890`)

### Development Tools
- **Package Manager:** pnpm with workspaces (monorepo)
- **Language:** TypeScript (strict mode)
- **Testing:** Jest + React Testing Library
- **Code Quality:** ESLint + Prettier
- **CI/CD:** GitHub Actions → AWS deployment

## Debugging & Logs

### CloudWatch Logs
**ALL Lambda functions log to CloudWatch Logs**. When debugging 500 errors or backend issues:

1. **View logs in terminal during dev:**
   ```bash
   npx sst dev --stage dev
   ```
   Shows real-time logs for all Lambda invocations in the terminal.

2. **View logs in AWS Console:**
   - Go to CloudWatch → Log Groups
   - Find log groups matching: `/aws/lambda/derelict-dev-*`
   - Common log groups:
     - `/aws/lambda/derelict-dev-ApiRoute*` - API Gateway routes (tRPC, auth)
     - `/aws/lambda/derelict-dev-DiscordWebhook` - Discord interactions

3. **Log retention:** Set to 1 week for all functions (see sst.config.ts)

### Frontend Debugging
- Check browser console for client-side errors
- Check Network tab for failed API calls
- tRPC errors will show in console with error details

### Common Issues
- **500 errors:** Always check CloudWatch logs for the Lambda function
- **CORS errors:** Check handler.ts CORS headers
- **Auth errors:** Check JWT token in localStorage
- **Database errors:** ElectroDB validation errors show exact field issues

## Architecture

### Monorepo Structure
```
├── packages/
│   ├── frontend/     # Next.js web application
│   ├── backend/      # Discord bot + Lambda functions
│   └── shared/       # Shared types, game logic, constants
├── package.json
└── pnpm-workspace.yaml
```

### DynamoDB Single Table Design (via ElectroDB)

**Entities:**
- **Guild:** Discord servers that have connected to DERELICT (stores guild metadata, admin roles)
- **GuildMembership:** Junction table for player-guild relationship with opt-in status (many-to-many with GSI for roster queries)
- **Player:** Discord users authenticated via OAuth (stores profile, avatar, guild memberships)
- **Game:** One game instance per Discord channel (not yet fully implemented)
- **Character:** Player characters (active or deceased/RIP status) (not yet implemented)
- **Scenario:** Global scenario templates (not yet implemented)
- **Turn State:** Current turn number, phase, action queue (not yet implemented)
- **Game Entities:** In-game objects (NPCs, monsters, items, environmental objects) (not yet implemented)

**Key Benefits:**
- Near-free serverless database at small scale
- ElectroDB provides TypeScript-first ORM with strong type safety
- Single table design optimizes for DynamoDB access patterns

### Authentication & OAuth Flow

**Discord OAuth Integration:**
1. User clicks "Login with Discord" on frontend
2. Redirects to Discord OAuth with scopes: `identify`, `guilds`
3. Discord redirects back to `/api/auth/callback` with authorization code
4. Backend exchanges code for access token
5. Fetches user profile and guild memberships from Discord API
6. Creates/updates Player entity with guilds array (includes admin permissions)
7. Syncs GuildMembership records (creates for new guilds, deletes for departed guilds)
8. Signs JWT token with player ID and returns to frontend
9. Frontend stores JWT in localStorage and uses for authenticated requests

**Protected Routes:**
- tRPC procedures use JWT middleware to verify authentication
- Player context available in all protected procedures
- Guild admin permissions checked via Player.guilds.canManage flag

**Key Files:**
- `backend/lambda/auth/callback.ts` - OAuth callback handler
- `backend/lambda/api/trpc.ts` - JWT middleware and context
- `backend/db/services/guild-membership.service.ts` - Membership sync logic

### Key Technical Decisions

**Why Pixi.js?**
- High performance 2D WebGL rendering
- Production-proven (used in major games)
- Rich ecosystem of plugins
- Efficient tile-based rendering support
- Better suited for game graphics than DOM-based solutions

**Why Serverless (Lambda)?**
- Fits async turn-based game model perfectly
- Pay-per-use pricing ideal for small-scale deployment
- No server management overhead
- Easy scaling if game gains popularity

**Why API Gateway V2?**
- Single HTTP endpoint for all web-facing APIs (tRPC + auth callbacks)
- Consolidates routing instead of separate Function URLs
- Built-in CORS support
- Custom domain support (api.derelict.world)
- Routes: `/trpc/*` for API calls, `/auth/*` for OAuth callbacks

**Why SST Ion?**
- Modern Infrastructure as Code for AWS serverless
- Type-safe resource definitions in TypeScript
- Live Lambda development (`sst dev` for instant hot-reload)
- Automatic custom domain configuration (Route53 + ACM certificates)
- Secret management integrated (`sst.Secret` for credentials)
- Stage-based deployments (dev/prod with environment isolation)

**Why Next.js?**
- Unified frontend + API route handling
- Server-side rendering capabilities
- Built-in optimization for production
- Excellent TypeScript support

**Why tRPC?**
- End-to-end type safety between frontend and backend
- No code generation required
- Integrates seamlessly with TypeScript monorepo

## Game Mechanics Reference

### Character Stats
- **Strength:** Physical power
- **Speed:** Agility and reflexes
- **Intellect:** Mental acuity
- **Combat:** Fighting ability
- **Social:** Interpersonal skills

### Saving Throws
- **Sanity:** Resist mental breakdown
- **Fear:** Overcome terror
- **Body:** Endure physical harm

### Core Systems

**Dice Mechanics:**
- d100 for skill checks (roll under stat value)
- d20 for panic effects
- Advantage/disadvantage system

**Stress and Panic:**
- Failed checks accumulate stress
- High stress triggers panic checks
- Panic effects range from minor (freeze) to severe (heart attack)

**Turn System:**
- Actions distributed on a turn cadence
- Simultaneous movement and action resolution
- Initiative-free (FTL-style)

**Map System:**
- Grid-based tile map
- Rooms, walls, doors, and entities
- Fog of war and line-of-sight mechanics

**Resource Management:**
- Limited inventory slots
- Oxygen, power, and supplies tracking
- Item conditions and durability

## Development Commands

### Setup
```bash
# Install dependencies
pnpm install

# Install dependencies for specific package
pnpm --filter frontend install
```

### Development
```bash
# Run frontend dev server
pnpm --filter frontend dev

# Run backend locally
pnpm --filter backend dev

# Run all packages in dev mode
pnpm dev
```

### Building
```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter frontend build
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter shared test

# Run tests in watch mode
pnpm test:watch
```

### Code Quality
```bash
# Lint all packages
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck
```

## Important Files and Directories

### Documentation
- `ideas/TODO.md` - Development roadmap with next features prioritized
- `ideas/game_design.md` - Comprehensive game design document
- `ideas/technical_design.md` - Technical architecture and decisions
- `ideas/reference/` - Mothership RPG reference materials

### Implementation
- `packages/frontend/` - Next.js application
- `packages/backend/` - Discord bot and Lambda functions
- `packages/shared/` - Shared TypeScript types and game logic

## Working with This Codebase

### Adding New Features
1. Check `ideas/game_design.md` for game mechanics context
2. Add shared types to `packages/shared/types/`
3. Implement game logic in `packages/shared/game-logic/`
4. Build UI components in `packages/frontend/components/`
5. Add backend handlers in `packages/backend/`

### Type Safety
- Shared types in `packages/shared/types/` are used across all packages
- tRPC ensures type safety between frontend and backend
- ElectroDB models provide typed database access
- Use TypeScript strict mode - avoid `any` types

### Testing Strategy
- Unit test game logic in `shared/` package
- Integration test API endpoints
- Component test React UI
- E2E test critical user flows

### Deployment
- **Infrastructure:** SST Ion (`sst.config.ts`)
- **Dev:** `pnpm dev` (runs `sst dev --stage dev`)
- **Deploy:** `pnpm deploy` (runs `sst deploy --stage dev`)
- Frontend: Next.js deployed via `sst.aws.Nextjs`
- Backend: Lambda functions via `sst.aws.Function`
- Database: DynamoDB (single table design)
- Discord Bot: Lambda function with Discord interactions

## Common Patterns

### Game State Updates
1. User action in Discord or web UI
2. Command routed through tRPC API
3. Game logic in `shared/` validates and processes
4. DynamoDB updated via ElectroDB models
5. Real-time update pushed to connected clients
6. Pixi.js renders visual changes

### Adding New Game Entities
1. Define TypeScript type in `shared/types/entities.ts`
2. Add ElectroDB model in `backend/db/models/`
3. Implement game logic in `shared/game-logic/`
4. Create Pixi.js sprite component in `frontend/lib/pixi/`
5. Add UI controls in `frontend/components/game/`

## Resources

- [Mothership RPG](https://www.mothershiprpg.com/) - Source material
- [Pixi.js Documentation](https://pixijs.com/) - Rendering engine
- [Next.js Documentation](https://nextjs.org/) - Frontend framework
- [ElectroDB Documentation](https://electrodb.dev/) - DynamoDB ORM
- [tRPC Documentation](https://trpc.io/) - Type-safe API layer

## Notes for Future Sessions

- This is a passion project focused on creating a unique gaming experience
- Prioritize core gameplay loop before adding polish
- Keep serverless costs in mind (optimize DynamoDB access patterns)
- Maintain type safety across the entire stack
- Balance between tabletop RPG mechanics and video game feel
