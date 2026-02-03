/**
 * Seed script to populate initial scenarios
 * Run this after deploying to create test scenarios
 */

import { ScenarioService } from "../db/services/scenario.service";

async function seedScenarios() {
  console.log("🌱 Seeding scenarios...");

  // Tutorial scenario
  const tutorial = await ScenarioService.create({
    name: "Abandoned Mining Station",
    description: "A simple derelict mining station perfect for learning the basics. Something went wrong here, but what?",
    difficulty: "tutorial",
    minPlayers: 1,
    maxPlayers: 4,
    mapData: {
      width: 20,
      height: 15,
      rooms: ["airlock", "cargo_bay", "control_room", "crew_quarters"],
    },
    initialState: {
      items: ["flashlight", "wrench", "medkit"],
      npcs: [],
    },
    objectives: [
      "Restore power to the station",
      "Find out what happened to the crew",
      "Escape alive",
    ],
  });

  console.log("✅ Created:", tutorial.name);

  // Easy scenario
  const derelictFreighter = await ScenarioService.create({
    name: "Derelict Freighter",
    description: "A cargo ship drifting in deep space. The crew is missing. The cargo holds something valuable... and dangerous.",
    difficulty: "easy",
    minPlayers: 2,
    maxPlayers: 6,
    mapData: {
      width: 30,
      height: 20,
      rooms: ["docking_bay", "engine_room", "cargo_hold", "bridge", "medical_bay", "crew_deck"],
    },
    initialState: {
      items: ["medkit", "flare", "crowbar", "datapad"],
      npcs: ["maintenance_bot"],
    },
    objectives: [
      "Investigate the cargo holds",
      "Secure valuable cargo",
      "Discover the crew's fate",
      "Return to your ship",
    ],
  });

  console.log("✅ Created:", derelictFreighter.name);

  // Medium scenario
  const ghostStation = await ScenarioService.create({
    name: "Ghost Station Alpha",
    description: "A research station that went dark three months ago. Recent signals suggest something is still active inside.",
    difficulty: "medium",
    minPlayers: 3,
    maxPlayers: 5,
    mapData: {
      width: 40,
      height: 30,
      rooms: ["research_labs", "specimen_containment", "living_quarters", "command_center", "hydroponics", "security"],
    },
    initialState: {
      items: ["scanner", "cutting_torch", "stim_pack", "encrypted_datapad"],
      npcs: ["security_drone", "unknown_entity"],
    },
    objectives: [
      "Restore station communications",
      "Access research data",
      "Determine what caused the blackout",
      "Survive",
    ],
  });

  console.log("✅ Created:", ghostStation.name);

  console.log("\n🎉 Scenario seeding complete!");
}

seedScenarios()
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
