import React from "react";
import type { Character } from "@derelict/shared";
import { getAvatarUrl } from "@/lib/utils";
import { trpc } from "@/lib/api/trpc";

interface CharacterCardProps {
  character: Character;
  isAdmin?: boolean;
  onDelete?: () => void;
}

export function CharacterCard({ character, isAdmin, onDelete }: CharacterCardProps) {
  const deleteCharacterMutation = trpc.character.delete.useMutation({
    onSuccess: () => {
      onDelete?.();
    },
    onError: (error) => {
      alert(`Failed to delete character: ${error.message}`);
    },
  });

  return (
    <div className="flex-shrink-0 bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-600 rounded-lg p-3 min-w-[280px]">
      {/* Header with avatar, name, and vitals */}
      <div className="flex items-start gap-2 mb-2">
        <div className="relative flex-shrink-0">
          {/* Character avatar - rounded rect */}
          <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
            {character.avatar ? (
              <img 
                src={character.avatar} 
                alt={character.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-bold">
                {character.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {/* Player avatar - small circle overlay */}
          <img
            src={getAvatarUrl(character.playerId, character.playerAvatar)}
            alt="Player"
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-gray-800"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{character.name}</p>
          <p className="text-xs text-gray-400">
            {character.status === "creating" ? "Creating..." : character.characterClass || "Ready"}
          </p>
        </div>
        {/* Vitals */}
        {character.status !== "creating" && (
          <div className="flex gap-2 text-[10px]">
            <div className="flex flex-col gap-0.5">
              <p className="text-gray-500 uppercase text-center">Health</p>
              <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    (character.health / character.maxHealth) > 0.5 ? 'bg-green-500' :
                    (character.health / character.maxHealth) > 0.25 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${(character.health / character.maxHealth) * 100}%` }}
                />
              </div>
              <p className="font-semibold text-gray-300 text-center text-[9px]">{character.health}/{character.maxHealth}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 uppercase">Wounds</p>
              <p className="font-semibold text-red-400">{character.wounds || 0}/{character.maxWounds || 2}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 uppercase">Stress</p>
              <p className="font-semibold text-yellow-400">{character.stress || 2}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats and Saves */}
      {character.status !== "creating" && (
        <div className="space-y-2">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-1 text-center">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Strength</p>
              <p className="text-xs font-semibold text-white">{character.stats.strength || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Speed</p>
              <p className="text-xs font-semibold text-white">{character.stats.speed || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Intellect</p>
              <p className="text-xs font-semibold text-white">{character.stats.intellect || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Combat</p>
              <p className="text-xs font-semibold text-white">{character.stats.combat || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Social</p>
              <p className="text-xs font-semibold text-white">{character.stats.social || 0}</p>
            </div>
          </div>

          {/* Saves */}
          <div className="grid grid-cols-3 gap-1 text-center border-t border-gray-700 pt-2">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Sanity</p>
              <p className="text-xs font-semibold text-indigo-400">{character.saves.sanity || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Fear</p>
              <p className="text-xs font-semibold text-indigo-400">{character.saves.fear || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Body</p>
              <p className="text-xs font-semibold text-indigo-400">{character.saves.body || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete Button */}
      {isAdmin && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <button
            onClick={() => {
              if (confirm(`Delete ${character.name || 'this character'} and create a new one for this player?`)) {
                deleteCharacterMutation.mutate({ characterId: character.id });
              }
            }}
            disabled={deleteCharacterMutation.isPending}
            className="w-full px-2 py-1 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-800 rounded transition-colors disabled:opacity-50"
          >
            {deleteCharacterMutation.isPending ? '⟳ Deleting...' : '⟳ Reset Character'}
          </button>
        </div>
      )}
    </div>
  );
}
