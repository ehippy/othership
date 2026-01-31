# Derelict Technical Design

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Discord Integration**: discord.js
- **Database**: AWS DynamoDB with ElectroDB
- **API Layer**: AWS Lambda + API Gateway (or tRPC for type-safe endpoints)
- **Serverless**: AWS Lambda for turn processing, dice rolls, game state updates

### Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Rendering**: Pixi.js (WebGL-accelerated 2D canvas)
  - pixi-tilemap for grid-based maps
  - pixi-viewport for camera control
  - pixi-filters for visual effects (CRT, lighting, fog)
- **UI Library**: React with @pixi/react for canvas integration
- **Real-time Updates**: WebSockets or Server-Sent Events

### Map & Scenario Editing
- **Map Editor**: Tiled Map Editor (external tool, exports JSON)
- **Scenario Builder**: Custom web UI in Next.js
- **Asset Pipeline**: Pixel art tiles (32x32 or 64x64)

### State Management
- **DynamoDB Single Table Design** via ElectroDB:
  - Servers (equuates to a discord server)
  - Games (one per discord channels)
  - Players (many per game)
  - Characters (many per player, only one active, many RIP)
  - Scenarios (global)
  - Session (combination of Game and Scenario and Players/Characters)
  - Turn State
  - Entities (NPCs, monsters, objects)

### Deployment
- **Backend**: AWS Lambda
- **Frontend and Assets**: CloudFront
- **Database**: AWS DynamoDB
- **Build**: GitHub Actions

### Development Tools
- **Package Manager**: npm or pnpm
- **Type Safety**: TypeScript strict mode
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint + Prettier

## Key Technical Decisions

### Why Pixi.js?
- Most actively maintained 2D WebGL library (v8, 2024)
- Excellent performance for grid-based games with many entities
- Strong TypeScript support
- Large plugin ecosystem (tilemap, viewport, filters)
- Production-proven (Duolingo, Disney)
- Perfect for horror atmosphere (lighting, fog, effects)

### Why DynamoDB + ElectroDB?
- Near-free at small scale
- ElectroDB provides clean TypeScript ORM over DynamoDB
- Serverless fits async turn-based model
- Easy to scale if game grows

### Why Next.js?
- Handles both web UI and API routes
- Server-side rendering for scenario builder
- Easy integration with Discord OAuth for player accounts
- Strong TypeScript + React ecosystem