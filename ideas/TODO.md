# DERELICT - Development Roadmap

## ✅ Completed

- **Authentication System**: Discord OAuth flow with JWT tokens
- **Guild Management**: Guild discovery, registration, admin detection
- **Player Roster**: GuildMembership junction table with opt-in/opt-out
- **Discord Integration**: Bot notifications for roster changes
- **Core Infrastructure**: SST Ion deployment, DynamoDB, tRPC API, Vite + React frontend
- **Scenario Management**: CRUD operations for game scenarios with creator attribution
- **Creator Application System**: Players can apply to create scenarios, admins approve/reject
- **Admin System**: Site-wide admin flag, baked into JWT, bypass ownership checks
- **Authorization**: Protected game creation (opted-in members only), admin controls for cancel/delete
- **Game Creation**: Admins/opted-in players can create games, select scenarios, Discord announcements with roster

## 🎯 Next 6 Features (Priority Order)

### 1. Character Creation Flow
**Goal**: Players create characters before game starts

**Backend Tasks**:
- [ ] Create Character entity with Mothership stats
  - playerId, gameId, name
  - Stats: strength, speed, intellect, combat, social
  - Saves: sanity, fear, body
  - Health, stress, inventory slots
  - Status: active, deceased, retired
- [ ] Add character.router with createCharacter mutation
- [ ] Validate one active character per player per game
- [ ] Update Game entity to track character creation progress

**Frontend Tasks**:
- [ ] Character creation form with stat allocation
- [ ] Mothership character sheet reference/helper
- [ ] Show "waiting for players" lobby state
- [ ] Display all characters in game once created

**References**: See `ideas/game_design.md` for character mechanics

---

### 2. Scenario System & Game Initialization
**Goal**: Load a scenario template and initialize game state

**Backend Tasks**:
- [x] Create Scenario entity
  - Name, description, difficulty
  - Map/room layout (JSON)
  - Starting entities (NPCs, items, hazards)
  - Win/loss conditions
- [ ] Create seed scenarios (tutorial, basic derelict ship)
- [ ] Add `loadScenario` service method
  - Copies scenario data into game instance
  - Spawns initial entities
  - Sets starting positions for characters
- [ ] Create GameEntity table for NPCs, items, environmental objects

**Frontend Tasks**:
- [ ] Scenario selection UI for admins
- [ ] Preview scenario details (map thumbnail, description)
- [ ] Loading screen when game initializes

**Game Content**:
- [ ] Design 1-2 starter scenarios (reference Mothership modules)
- [ ] Create basic tile assets or use placeholder sprites

---

### 3. Map Visualization with Pixi.js
**Goal**: Render game state visually in browser

**Backend Tasks**:
- [ ] Add map/room data to Game entity
  - Grid dimensions
  - Tile types (floor, wall, door, hazard)
  - Fog of war state per player
- [ ] Create `/api/game/:gameId/state` endpoint
  - Returns current map, entities, character positions
  - Filtered by player's visibility

**Frontend Tasks**:
- [ ] Set up Pixi.js canvas in game view
- [ ] Implement tile rendering with pixi-tilemap
  - Load tile sprites (walls, floors, doors)
  - Render grid-based map
- [ ] Add character sprites with player names
- [ ] Add entity sprites (items, NPCs, hazards)
- [ ] Implement camera controls with pixi-viewport
  - Pan, zoom, follow player character
- [ ] Add fog of war overlay (gray out unseen areas)

**Pixi Setup**:
- [ ] Install and configure Pixi.js packages
- [ ] Create sprite asset loader
- [ ] Set up rendering loop

**References**: See `ideas/technical_design.md` for Pixi architecture

---

### 4. Turn System & Basic Movement
**Goal**: Players can move characters on the grid

**Backend Tasks**:
- [ ] Add TurnState to Game entity
  - Current turn number
  - Turn phase (movement, action, resolution)
  - Action queue
- [ ] Create turn.router with mutations:
  - `submitMove(characterId, targetTile)` - Queue movement
  - `submitAction(characterId, actionType, target)` - Queue action
  - `endTurn()` - Resolve queued actions
- [ ] Implement movement validation
  - Check valid path (no walls)
  - Check movement range based on Speed stat
  - Update character position in database

**Frontend Tasks**:
- [ ] Click-to-move controls on Pixi canvas
- [ ] Show movement range highlights
- [ ] Display "Move Submitted" confirmation
- [ ] Turn timer UI (optional)
- [ ] Action history log

**Game Loop**:
- [ ] Implement simultaneous action resolution
- [ ] Handle collisions (can't occupy same tile)
- [ ] Update Pixi sprites after turn resolves

---

### 5. Basic Actions & Interactions
**Goal**: Players can interact with objects and each other

**Backend Tasks**:
- [ ] Add action types to turn system:
  - `PICKUP_ITEM` - Add item to inventory
  - `DROP_ITEM` - Remove from inventory, place on tile
  - `USE_ITEM` - Activate item effect
  - `EXAMINE` - Get description of entity/tile
  - `ATTACK` - Combat against NPC or player (basic)
- [ ] Implement inventory management
  - Enforce slot limits
  - Item stacking rules
- [ ] Add basic combat resolution
  - d100 roll vs Combat stat
  - Simple damage calculation
  - Health reduction

**Frontend Tasks**:
- [ ] Action menu when clicking entities
  - "Examine", "Pick Up", "Use", "Attack"
- [ ] Inventory UI panel
  - Drag-and-drop item management
  - Item tooltips with descriptions
- [ ] Combat results display
  - Dice roll animation
  - Damage numbers
- [ ] Character health/stress bars

**Discord Integration**:
- [ ] Post major events to Discord channel
  - "💀 Player X died"
  - "🎲 Player Y rolled 87 on Combat check"
  - "🔍 Player Z found a flamethrower"

---

## 🔮 Future Features (Post-MVP)

- **Stress & Panic System**: Implement full Mothership panic mechanics
- **Advanced Combat**: Weapon stats, armor, critical hits
- **Line of Sight**: Raycasting for visibility calculations
- **Real-time Updates**: Replace polling with WebSockets or SSE
- **Sound & Atmosphere**: Ambient audio, sound effects
- **Scenario Editor**: Web-based tool for creating custom maps
- **Multiplayer Lobby**: Join public games, matchmaking
- **Player Progression**: XP, leveling, persistent character stats
- **Visual Effects**: Lighting, shadows, fog using Pixi filters

---

## 🛠️ Technical Debt

- [ ] Add integration tests for OAuth flow
- [ ] Add error boundaries to frontend components
- [ ] Implement rate limiting on tRPC endpoints
- [ ] Add database migration system for schema changes
- [ ] Document ElectroDB access patterns
- [ ] Set up monitoring/alerts for Lambda errors
- [ ] Add loading states to all async UI operations

---

**Last Updated**: February 2, 2026
