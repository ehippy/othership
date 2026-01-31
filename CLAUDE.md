# CLAUDE.md - Project Context for AI Assistants

## Project Overview

**Othership** is a cooperative browser-based survival horror game set in space, inspired by FTL, Alien Isolation, and the Mothership tabletop RPG. The game integrates a Discord bot with a web-based UI to create a unique multiplayer turn-based survival experience.

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
- **Framework:** Next.js (App Router) with TypeScript
- **UI Library:** React
- **Styling:** Tailwind CSS
- **Game Rendering:** Pixi.js for 2D WebGL rendering
  - @pixi/react for React integration
  - pixi-tilemap for efficient tile rendering
  - pixi-viewport for camera controls
  - pixi-filters for visual effects
- **Real-time Updates:** WebSockets or Server-Sent Events

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
   - Find log groups matching: `/aws/lambda/dev-*`
   - Common log groups:
     - `/aws/lambda/dev-TrpcHandler` - tRPC API calls
     - `/aws/lambda/dev-LoginHandler` - OAuth login
     - `/aws/lambda/dev-CallbackHandler` - OAuth callback
     - `/aws/lambda/dev-DiscordWebhook` - Discord interactions

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
- **Servers:** Discord servers registered with the bot
- **Games:** One game instance per Discord channel
- **Players:** Discord users participating in a game
- **Characters:** Player characters (active or deceased/RIP status)
- **Scenarios:** Global scenario templates
- **Sessions:** Active game session (Game + Scenario + Players/Characters)
- **Turn State:** Current turn number, phase, action queue
- **Entities:** In-game objects (NPCs, monsters, items, environmental objects)

**Key Benefits:**
- Near-free serverless database at small scale
- ElectroDB provides TypeScript-first ORM with strong type safety
- Single table design optimizes for DynamoDB access patterns

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
