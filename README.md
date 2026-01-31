# Derelict - Game Implementation

This is the main implementation directory for Derelict, organized as a pnpm monorepo.

## Project Structure

```
game/
├── packages/
│   ├── frontend/     # Next.js web application
│   ├── backend/      # Discord bot + Lambda functions
│   └── shared/       # Shared types, game logic, constants
├── package.json      # Workspace root
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install all dependencies
pnpm install
```

### Development

```bash
# Run frontend dev server
pnpm --filter frontend dev

# Run backend locally (once implemented)
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

# Run tests in watch mode
pnpm test:watch
```

## Package Overview

### @derelict/frontend

Next.js application with Pixi.js game rendering. Provides the web-based UI for players to visualize and interact with the game.

**Key technologies:**
- Next.js 14 (App Router)
- React 18
- Pixi.js 7
- Tailwind CSS

### @derelict/backend

Discord bot and AWS Lambda functions. Handles game commands, turn processing, and database interactions.

**Key technologies:**
- discord.js
- AWS Lambda
- ElectroDB (DynamoDB ORM)
- tRPC

### @derelict/shared

Shared TypeScript types, game logic, and constants used across frontend and backend.

**Includes:**
- Type definitions (Character, Game, Player, etc.)
- Game mechanics (dice rolls, stat checks, panic system)
- Constants (grid size, max stress, etc.)

## Documentation

See the project root for comprehensive documentation:
- `/CLAUDE.md` - AI assistant context and technical overview
- `/ideas/game_design.md` - Game design document
- `/ideas/technical_design.md` - Technical architecture

## License

Private project - not licensed for distribution
