import React from "react";
import type { Character } from "@derelict/shared";
import { CharacterStamp } from "./CharacterStamp";
import { getAvatarUrl } from "@/lib/utils";

interface RosterMember {
  playerId: string;
  playerUsername: string;
  playerAvatar?: string;
}

interface PartyBarProps {
  status: "staging" | "character_creation" | "active";
  roster?: RosterMember[];
  characters?: Character[];
  isAdmin?: boolean;
  onCharacterDeleted?: () => void;
}

export function PartyBar({ status, roster, characters, isAdmin, onCharacterDeleted }: PartyBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex items-end justify-center gap-2 px-4 py-3 overflow-x-auto pointer-events-auto" style={{ overflowY: 'visible' }}>
        {/* Show roster during staging */}
        {status === "staging" && roster && roster.length > 0 ? (
          roster.map((member) => (
            <div
              key={member.playerId}
              className="flex-shrink-0 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-600 rounded-lg px-3 py-2 min-w-[140px]"
            >
              <img
                src={getAvatarUrl(member.playerId, member.playerAvatar)}
                alt={member.playerUsername}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{member.playerUsername}</p>
                <p className="text-xs text-gray-400">Ready</p>
              </div>
            </div>
          ))
        ) : (status === "character_creation" || status === "active") && characters && characters.length > 0 ? (
          characters.map((character) => (
            <CharacterStamp 
              key={character.id} 
              character={character}
              isAdmin={isAdmin}
              onCharacterDeleted={onCharacterDeleted}
            />
          ))
        ) : (
          <div className="w-full text-center py-2">
            <p className="text-sm text-gray-400">No players in roster yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
