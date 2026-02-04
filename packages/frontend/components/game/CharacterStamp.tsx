import React, { useState } from "react";
import type { Character } from "@derelict/shared";
import { CharacterCard } from "./CharacterCard";
import { getAvatarUrl } from "@/lib/utils";

interface CharacterStampProps {
  character: Character;
  isAdmin?: boolean;
  onCharacterDeleted?: () => void;
}

export function CharacterStamp({ character, isAdmin, onCharacterDeleted }: CharacterStampProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const hideTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Delay hiding to allow mouse to reach popup
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 100);
  };

  const handlePopupMouseEnter = () => {
    // Clear hide timeout when mouse enters popup
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handlePopupMouseLeave = () => {
    // Hide immediately when leaving popup
    setIsHovered(false);
  };

  const handleDelete = () => {
    setIsHovered(false);
    onCharacterDeleted?.();
  };

  return (
    <>
      <div 
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      {/* Compact stamp */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1 md:gap-2 bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-600 rounded-lg p-2 md:p-3 w-[80px] md:w-[140px] cursor-pointer">
        {/* Avatar with player overlay */}
        <div className="relative w-full">
          <div className="w-full aspect-square rounded bg-gray-700 flex items-center justify-center overflow-hidden">
            {character.avatar ? (
              <img 
                src={character.avatar} 
                alt={character.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-lg md:text-2xl">
                {character.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {/* Player avatar overlay */}
          <img
            src={getAvatarUrl(character.playerId, character.playerAvatar)}
            alt="Player"
            className="absolute -bottom-1 -right-1 w-5 h-5 md:w-7 md:h-7 rounded-full border-2 border-gray-800"
          />
        </div>

        {/* Name */}
        <div className="text-center w-full">
          <p className="text-xs md:text-sm font-medium text-white truncate">{character.name}</p>
          <p className="text-[10px] md:text-xs text-gray-400 truncate">
            {character.status === "creating" ? "Creating..." : character.characterClass || "Ready"}
          </p>
        </div>

        {/* Health bar */}
        {character.status !== "creating" && (
          <div className="w-full">
            <div className="h-1.5 md:h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  (character.health / character.maxHealth) > 0.5 ? 'bg-green-500' :
                  (character.health / character.maxHealth) > 0.25 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${(character.health / character.maxHealth) * 100}%` }}
              />
            </div>
            <p className="text-[9px] md:text-[10px] text-gray-400 text-center mt-0.5">{character.health}/{character.maxHealth}</p>
          </div>
        )}
      </div>
      </div>

      {/* Detailed card popup on hover - using fixed positioning */}
      {isHovered && position && (
        <div 
          className="fixed z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(-50%, calc(-100% - 16px))',
          }}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        >
          <CharacterCard 
            character={character} 
            isAdmin={isAdmin}
            onDelete={handleDelete}
          />
        </div>
      )}
    </>
  );
}
