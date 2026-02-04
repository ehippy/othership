import React from "react";

interface StatsDisplayProps {
  stats: {
    strength: number;
    speed: number;
    intellect: number;
    combat: number;
    social: number;
  };
  saves: {
    sanity: number;
    fear: number;
    body: number;
  };
  modifiers?: {
    stats: Partial<{ strength: number; speed: number; intellect: number; combat: number; social: number }>;
    saves: Partial<{ sanity: number; fear: number; body: number }>;
  };
  showModifiers?: boolean;
}

export function StatsDisplay({ 
  stats, 
  saves, 
  modifiers,
  showModifiers = false
}: StatsDisplayProps) {
  
  return (
    <>
      {/* Stats */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Stats</h4>
        <div className="grid grid-cols-5 gap-3">
          {(['strength', 'speed', 'intellect', 'combat', 'social'] as const).map((stat) => {
            const baseValue = stats[stat];
            const modifier = showModifiers && modifiers ? (modifiers.stats[stat] || 0) : 0;
            const finalValue = baseValue + modifier;
            const isRolled = baseValue > 0;
            
            return (
              <div key={stat} className="flex flex-col items-center gap-2 p-3 bg-gray-900 rounded border border-gray-700">
                <span className="capitalize text-gray-300 text-sm font-medium">{stat}</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${isRolled ? 'text-white' : 'text-gray-600'}`}>
                    {finalValue || '—'}
                  </span>
                  {showModifiers && modifier !== 0 && (
                    <span className={`text-sm ${modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {modifier > 0 ? '+' : ''}{modifier}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saves */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Saves</h4>
        <div className="grid grid-cols-3 gap-3">
          {(['sanity', 'fear', 'body'] as const).map((save) => {
            const baseValue = saves[save];
            const modifier = showModifiers && modifiers ? (modifiers.saves[save] || 0) : 0;
            const finalValue = baseValue + modifier;
            const isRolled = baseValue > 0;
            
            return (
              <div key={save} className="flex flex-col items-center gap-2 p-3 bg-gray-900 rounded border border-gray-700">
                <span className="capitalize text-gray-300 text-sm font-medium">{save}</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${isRolled ? 'text-indigo-400' : 'text-gray-600'}`}>
                    {finalValue || '—'}
                  </span>
                  {showModifiers && modifier !== 0 && (
                    <span className={`text-sm ${modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {modifier > 0 ? '+' : ''}{modifier}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
