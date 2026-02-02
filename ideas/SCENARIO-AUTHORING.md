# Scenario Authoring Guide

## Core Philosophy

**DERELICT uses a system-led GM approach** - no human Game Master required. The system narrates events, resolves checks, controls NPCs, and enforces rules. This means scenarios must be pre-authored with enough content and logic to create atmospheric, reactive gameplay.

Players explore grid-based maps cooperatively in simultaneous turn-based sessions. Think **XCOM meets dungeon crawler meets Mothership RPG**.

---

## Scripting Complexity Roadmap

### Phase 1: Minimal (MVP)
**Static JSON scenarios with simple data structures**
- Map layout (tiles, walls, doors)
- Initial item/NPC placements with spawn coordinates
- Win/loss conditions (reach tile X, survive N turns, kill all enemies)
- Pre-written examination text for objects/rooms
- Simple triggers: "when player enters room 5, spawn 2 androids"

**Good for**: Tactical dungeon crawls, basic exploration, testing core mechanics

### Phase 2: Medium (Post-MVP)
**State machine with conditional logic**
- Scenario phases/objectives that progress ("escape pods locked until reactor destroyed")
- Conditional triggers: "IF keycard acquired AND reactor room entered THEN trigger meltdown"
- NPC behavior trees: patrol → hear sound → investigate → attack
- Dialogue trees with skill check branches
- Environmental state changes (doors unlock, alarms trigger, fires spread)

**Good for**: Structured narrative scenarios with reactivity, puzzle elements

### Phase 3: Advanced (Future)
**Full scripting language integration**
- Lua or sandboxed JavaScript for scenario logic
- Custom actions and rule modifications per scenario
- Event handlers for any game action
- Dynamic entity spawning based on player choices
- Branching narrative paths

**Good for**: Open-ended campaigns, complex puzzles, highly reactive worlds

---

## Map Creation Workflow

### Tools
**Tiled Map Editor** (https://www.mapeditor.org/) - open-source tilemap editor
- Free, cross-platform
- Exports to JSON
- Supports layers, object placement, custom properties
- Industry standard for 2D tile-based games

### Custom Tiled Toolkit Setup

You can seed Tiled with your entity definitions for easy scenario authoring:

**1. Custom Object Types** (`derelict-objects.json`)
Define reusable object types with predefined properties:

```json
{
  "objecttypes": [
    {
      "name": "Shotgun",
      "type": "item",
      "color": "#ff8800",
      "properties": [
        { "name": "entityId", "type": "string", "value": "shotgun" },
        { "name": "quantity", "type": "int", "value": 1 }
      ]
    },
    {
      "name": "Android",
      "type": "npc",
      "color": "#ff0000",
      "properties": [
        { "name": "entityId", "type": "string", "value": "android-maintenance" },
        { "name": "hostile", "type": "bool", "value": true },
        { "name": "patrolRoute", "type": "string", "value": "" }
      ]
    },
    {
      "name": "Blue Keycard",
      "type": "item",
      "color": "#0088ff",
      "properties": [
        { "name": "entityId", "type": "string", "value": "blue-keycard" },
        { "name": "unlocks", "type": "string", "value": "" }
      ]
    }
  ]
}
```

Import via: **View → Object Types Editor → Import**

**2. Property Enums for Dropdowns**
Instead of typing entity IDs, create enums:

```json
{
  "name": "entityId",
  "type": "string",
  "propertytype": "CoreEntity",
  "values": ["shotgun", "medkit", "flamethrower", "android-maintenance", "android-combat"]
}
```

Now when placing objects, you get a dropdown of valid entities.

**3. Object Templates**
Create reusable templates in Tiled (`templates/` folder):
- `shotgun.tx` - Shotgun with correct sprite preview
- `spawn-point.tx` - Character spawn with slot number
- `door-blue.tx` - Blue keycard door

Drag templates onto map instead of configuring each object manually.

**4. Project File**
Create a Tiled project file (`derelict.tiled-project`) that bundles:
- Object types
- Templates
- Tilesets
- Export settings

Share with scenario authors - they open the project and everything is ready.

**Workflow with Toolkit**:
1. Open Tiled project
2. Select "Items" layer
3. Pick "Shotgun" from object types palette
4. Click map to place → automatically has correct entityId and properties
5. Export to JSON → ready for game

This turns scenario authoring from "typing JSON by hand" into "point-and-click level design".

### Tilemap Layers (Static - Authored Once)

1. **Base/Floor Layer**
   - Ground tiles (metal grating, concrete, etc.)
   - Different textures for visual variety
   - Purely cosmetic

2. **Walls/Obstruction Layer**
   - Blocks movement and line of sight
   - Defines room boundaries
   - Doors, vents, blocked passages

3. **Objects/Items Layer**
   - Spawn points for characters
   - Initial item placements (weapons, keycards, medkits)
   - NPC spawn locations with patrol routes
   - Placed as individual objects with custom properties

4. **Props/Decoration Layer**
   - Non-interactive visual details
   - Blood stains, cables, debris, computer terminals
   - Atmospheric elements

5. **Collision/Special Layer**
   - Invisible markers for triggers and zones
   - Radiation areas, alarm triggers
   - Objective markers (escape pod locations, reactor core)

### Custom Properties in Tiled

**Tile Properties**:
```json
{
  "walkable": true,
  "type": "door",
  "requiresKeycard": "blue",
  "description": "A heavy airlock door with a blue keycard reader"
}
```

**Object Properties** (spawned entities):
```json
{
  "entityType": "android",
  "hostile": true,
  "patrolRoute": [1, 5, 8, 3],
  "description": "A damaged maintenance android with sparking wires"
}
```

**Layer Properties**:
```json
{
  "zIndex": 10,
  "collisionLayer": true,
  "fogOfWarEnabled": true
}
```

---

## Runtime Game State (Dynamic - Changes During Play)

These layers are rendered on top of the static tilemap:

1. **Character Positions** - Player sprites, updated every turn
2. **NPC/Enemy Positions** - Androids, creatures moving each turn
3. **Item Instances** - Dropped/spawned items on tiles
4. **Fog of War** - Per-player visibility mask (which tiles they've seen)
5. **Line of Sight** - Real-time calculation of what character can currently see
6. **Interactive State** - Doors (open/closed/locked), switches, destructible objects
7. **Environmental Effects** - Fire spreading, smoke, radiation zones
8. **Highlights/UI Overlays** - Movement range, selected tile, targeting reticule
9. **Turn Indicators** - Queued actions, "player has moved" markers
10. **Status Effects** - Visual indicators on characters (stunned, on fire, wounded)

---

## Entity Definition System (Hybrid Approach)

### Core Entities (Predefined in Game Code)
Standard Mothership equipment, weapons, items that work across all scenarios:

**Items**: Shotgun, Pulse Rifle, Flamethrower, Frag Grenade, Medkit, Stimpack, Rations, Flare  
**NPCs**: Android (maintenance), Android (combat), Facehugger, Alien, Human Survivor  
**Environmental**: Fire, Radiation Zone, Smoke, Alarm

These live in your codebase as TypeScript definitions with stats, behavior, sprites:

```typescript
// packages/shared/src/game-logic/entities/items.ts
export const CORE_ITEMS = {
  shotgun: {
    name: "Shotgun",
    type: "weapon",
    damage: "3d10",
    range: 5,
    ammo: 8,
    sprite: "weapon-shotgun",
    description: "Pump-action 12-gauge. Reliable and deadly at close range."
  },
  medkit: {
    name: "Medkit",
    type: "consumable",
    heals: 20,
    uses: 3,
    sprite: "item-medkit",
    description: "Standard trauma kit with synthetic skin and coagulants."
  }
  // ... etc
}
```

### Scenario-Specific Entities (Defined Per Scenario)
Custom items, NPCs, or objects unique to a scenario:

**Examples**: Blue Keycard, Red Keycard, Reactor Core, Escape Pod Console, Captain's Log, Alien Egg

Defined in the scenario JSON with the same structure as core entities:

```json
{
  "customEntities": {
    "blue-keycard": {
      "name": "Blue Security Keycard",
      "type": "key-item",
      "sprite": "keycard-blue",
      "description": "A keycard with MEDICAL BAY clearance printed on it.",
      "unlocks": ["door-medbay-1", "door-medbay-2"]
    },
    "captains-log": {
      "name": "Captain's Personal Log",
      "type": "readable",
      "sprite": "datapad",
      "description": "A cracked datapad with blood smears on the screen.",
      "content": "Day 47: The crew is showing signs of infection..."
    }
  }
}
```

### Hybrid Benefits
- ✅ **Consistency**: Shotgun works the same across all scenarios
- ✅ **Flexibility**: Scenarios can add unique puzzle items, story objects
- ✅ **Reusability**: Don't redefine "Medkit" in every scenario
- ✅ **Balance**: Core items are playtested and balanced once
- ✅ **Extensibility**: Scenarios can override core entity properties if needed

### Entity Spawning in Maps
Tiled object layer references entities by ID (either core or custom):

```json
{
  "name": "Items",
  "type": "objectgroup",
  "objects": [
    {
      "x": 120,
      "y": 80,
      "properties": {
        "entityId": "shotgun",  // References core entity
        "quantity": 1
      }
    },
    {
      "x": 200,
      "y": 150,
      "properties": {
        "entityId": "blue-keycard",  // References scenario custom entity
        "quantity": 1
      }
    }
  ]
}
```

---

## Scenario Data Structure

### Scenario Entity (Template)
Stored in database, referenced when creating a game:

```typescript
{
  scenarioId: "tutorial-01",
  name: "Ghost Ship Tutorial",
  description: "Your crew boards a derelict mining vessel...",
  difficulty: "easy",
  estimatedTurns: 20,
  
  // Map reference
  mapFile: "scenarios/ghost-ship/map.json", // Tiled export
  tilesetFile: "scenarios/ghost-ship/tileset.png",
  
  // Initial conditions
  spawnPoints: [
    { x: 2, y: 3, characterSlot: 1 },
    { x: 2, y: 4, characterSlot: 2 }
  ],
  
  // Win/loss conditions
  objectives: [
    { type: "REACH_TILE", x: 45, y: 12, description: "Reach the escape pods" }
  ],
  failureConditions: [
    { type: "ALL_DEAD", description: "Everyone died" }
  ],
  
  // Simple triggers (MVP)
  triggers: [
    {
      condition: "ENTER_ROOM",
      roomId: 5,
      action: "SPAWN_ENTITIES",
      entities: [
        { type: "android", x: 15, y: 8 },
        { type: "android", x: 17, y: 8 }
      ]
    }
  ]
}
```

### Game Entity (Instance)
Created when a game starts, stores runtime state:

```typescript
{
  gameId: "game-123",
  guildId: "guild-abc",
  scenarioId: "tutorial-01",
  status: "active", // setup | active | completed | failed
  
  // Current turn state
  currentTurn: 5,
  phase: "movement", // movement | action | resolution
  
  // Map state (copied from scenario, then modified)
  mapState: {
    width: 50,
    height: 30,
    tiles: [...], // Base tiles from Tiled export
    
    // Dynamic state
    doors: [
      { x: 10, y: 5, locked: true, requiresKeycard: "blue" }
    ],
    environmentalEffects: [
      { type: "fire", x: 20, y: 15, spreadRate: 0.3 }
    ]
  },
  
  // Entities in the world
  entities: [
    {
      entityId: "char-player1",
      type: "character",
      characterId: "char-abc",
      x: 5,
      y: 8,
      health: 30,
      stress: 2
    },
    {
      entityId: "npc-android-1",
      type: "npc",
      npcType: "android",
      x: 15,
      y: 8,
      health: 20,
      hostile: true,
      aiState: "patrol"
    },
    {
      entityId: "item-flamethrower",
      type: "item",
      itemType: "flamethrower",
      x: 12,
      y: 10,
      ownedBy: null // null = on ground, or characterId if in inventory
    }
  ],
  
  // Per-player fog of war
  fogOfWar: {
    "player-1": [[false, false, true, true, ...], ...],
    "player-2": [[false, false, true, true, ...], ...]
  }
}
```

---

## Validation & Build Pipeline

### Manual Validation (MVP)
- Load Tiled JSON at runtime when game initializes
- Scenario service parses and validates on-the-fly
- Log warnings for invalid data, graceful degradation
- **Start here** - add automation later when needed

### Automated Validation (Future)
Once you have multiple scenarios, build a validation script:

```bash
pnpm validate-scenarios
```

**Checks**:
- All referenced entity types exist in game code
- Spawn points have required properties
- No orphaned references (door requires keycard that doesn't exist)
- Map dimensions are reasonable (< 200x200)
- Tileset image files exist
- JSON structure matches schema

**Output**:
- Generate TypeScript types from entity definitions
- Create manifest of all scenarios for frontend dropdown
- Fail CI if scenarios are invalid

---

## Asset Creation Tips

### Tile Size
- **16x16** or **32x32** pixels per tile (pick one, stay consistent)
- Larger = easier to draw detail, but fewer tiles fit on screen
- Smaller = more retro aesthetic, better for large maps

### Minimal Tileset for MVP
- Floor (2-3 variants)
- Wall (4 types: horizontal, vertical, corner-outer, corner-inner)
- Door (closed, open)
- Void/space (black, off-map)
- Hazard (red warning stripes, radiation symbol)

Can use placeholder art initially - focus on gameplay first.

### Character Sprites
- Simple top-down view
- Different colors per player for easy identification
- NPC sprites distinct from players (androids = gray/metallic)

### Pixi.js Rendering
- Use **pixi-tilemap** plugin for efficient tile rendering
- Standard Container hierarchy:
  1. Tilemap (base + walls)
  2. Items layer
  3. Characters layer
  4. Effects/fog of war layer
  5. UI overlays layer

---

## First Scenario: "Ghost Ship Tutorial"

### Design Goals
- Teach movement, interaction, combat basics
- 2-4 players, 15-20 minute session
- Simple linear path with one branch
- Introduce key mechanics gradually

### Layout
- Starting room (safe, tutorial messages)
- Corridor with items (flamethrower, medkit)
- Branch: left = shortcut but hazardous, right = longer but safer
- Enemy encounter room (2 androids)
- Escape pod room (objective)

### Mechanics Introduced
- Movement (turn 1)
- Item pickup (turn 2-3)
- Environmental hazard (radiation zone on left path, turn 4)
- Combat (turn 6-8)
- Objective completion (turn 10-15)

---

## Notes

- **Favor content over systems initially** - one great hand-crafted scenario is better than a complex scripting system with no scenarios
- **Playtest early** - build one room, get it playable, iterate
- **Start small** - 20x20 map is plenty for first scenario
- **Atmospheric text matters** - good descriptions sell the horror/tension
- **Balance authored content vs. systemic complexity** - players won't notice a simple trigger system if the scenario is compelling

---

**Next Steps**: Build Game entity, then create first test map in Tiled
