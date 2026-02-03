import { Service } from "electrodb";
import { GameEntity } from "./game.entity";
import { PlayerEntity } from "./player.entity";
import { CharacterEntity } from "./character.entity";
import { GuildEntity } from "./guild.entity";
import { ScenarioEntity } from "./scenario.entity";

// Create ElectroDB service with all entities
export const DerelictService = new Service({
  game: GameEntity,
  player: PlayerEntity,
  character: CharacterEntity,
  guild: GuildEntity,
  scenario: ScenarioEntity,
});

export { GameEntity, PlayerEntity, CharacterEntity, ScenarioEntity };
