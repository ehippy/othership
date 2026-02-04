import React, { useState } from "react";
import { trpc } from "@/lib/api/trpc";
import type { Character } from "@derelict/shared";
import { CLASS_MODIFIERS, getStatModifier, getSaveModifier } from "@derelict/shared";
import { AVATAR_LIST, getRandomAvatar } from "@/lib/avatars";

interface CharacterCreationWizardProps {
  character: Character;
  onComplete: () => void;
}

export function CharacterCreationWizard({ character, onComplete }: CharacterCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: character.name,
    characterClass: character.characterClass || undefined,
    chosenStatModifier: character.chosenStatModifier || undefined,
    avatar: character.avatar || getRandomAvatar(),
  });

  // Check if all stats are rolled
  const allStatsRolled = character.stats.strength > 0 && 
    character.stats.speed > 0 && 
    character.stats.intellect > 0 && 
    character.stats.combat > 0 && 
    character.stats.social > 0;

  // Check if all saves are rolled
  const allSavesRolled = character.saves.sanity > 0 && 
    character.saves.fear > 0 && 
    character.saves.body > 0;

  // Update character mutation
  const updateCharacterMutation = trpc.character.update.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      alert(`Failed to update character: ${error.message}`);
    },
  });

  // Apply class modifiers mutation (server-side)
  const applyClassModifiersMutation = trpc.character.applyClassModifiers.useMutation({
    onSuccess: () => {
      onComplete(); // Refresh character data
      setStep(3); // Move to next step
    },
    onError: (error) => {
      alert(`Failed to apply class modifiers: ${error.message}`);
    },
  });

  // Roll stat mutation
  const rollStatMutation = trpc.character.rollStat.useMutation({
    onSuccess: (data) => {
      console.log(`Rolled ${data.rolls[0]} + ${data.rolls[1]} + 25 = ${data.baseValue}, modifier: ${data.modifier > 0 ? '+' : ''}${data.modifier}, final: ${data.value}`);
      onComplete(); // Refresh character data
    },
    onError: (error) => {
      alert(`Failed to roll: ${error.message}`);
    },
  });

  // Roll save mutation
  const rollSaveMutation = trpc.character.rollSave.useMutation({
    onSuccess: (data) => {
      console.log(`Rolled ${data.rolls[0]} + ${data.rolls[1]} + 10 = ${data.baseValue}, modifier: ${data.modifier > 0 ? '+' : ''}${data.modifier}, final: ${data.value}`);
      onComplete(); // Refresh character data
    },
    onError: (error) => {
      alert(`Failed to roll: ${error.message}`);
    },
  });

  // Roll all stats and saves at once
  const rollAllStatsMutation = trpc.character.rollAllStats.useMutation({
    onSuccess: (data) => {
      console.log('Rolled all stats and saves:', data.results);
      onComplete(); // Refresh character data
    },
    onError: (error) => {
      alert(`Failed to roll: ${error.message}`);
    },
  });

  const handleSaveClassAndName = () => {
    // Use server-side mutation to apply class modifiers
    applyClassModifiersMutation.mutate({
      characterId: character.id,
      characterClass: formData.characterClass!,
      chosenStatModifier: formData.chosenStatModifier,
    });
  };

  const handleCompleteCharacter = () => {
    updateCharacterMutation.mutate({
      characterId: character.id,
      avatar: formData.avatar,
      name: formData.name,
      status: 'ready',
    });
  };

  const handleRollAll = () => {
    rollAllStatsMutation.mutate({ characterId: character.id });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-indigo-400 mb-6">Create Your Character</h2>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-700'} text-sm font-semibold`}>
            1
          </div>
          <div className="flex-1 h-1 bg-gray-700">
            <div className={`h-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-700'} transition-all`} />
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-700'} text-sm font-semibold`}>
            2
          </div>
          <div className="flex-1 h-1 bg-gray-700">
            <div className={`h-full ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-700'} transition-all`} />
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-700'} text-sm font-semibold`}>
            3
          </div>
        </div>

        {/* Step 1: Roll Stats & Saves */}
        {step === 1 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Roll Stats & Saves</h3>
              {!(allStatsRolled && allSavesRolled) && (
                <button
                  onClick={handleRollAll}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors text-sm font-semibold"
                >
                  Roll All
                </button>
              )}
            </div>
            <p className="text-gray-400 mb-6">Roll for each stat (2d10 + 25) and save (2d10 + 10)</p>
            
            {/* Stats */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Stats</h4>
              <div className="grid grid-cols-5 gap-3">
                {(['strength', 'speed', 'intellect', 'combat', 'social'] as const).map((stat) => {
                  const value = character.stats[stat];
                  const isRolled = value > 0;
                  return (
                    <div key={stat} className="flex flex-col items-center gap-2 p-3 bg-gray-900 rounded border border-gray-700">
                      <span className="capitalize text-gray-300 text-sm font-medium">{stat}</span>
                      <span className={`text-3xl font-bold ${isRolled ? 'text-indigo-400' : 'text-gray-600'}`}>
                        {value || '—'}
                      </span>
                      <button
                        onClick={() => rollStatMutation.mutate({ characterId: character.id, stat })}
                        disabled={isRolled || rollStatMutation.isPending}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-600 text-white rounded transition-colors text-xs w-full"
                      >
                        {rollStatMutation.isPending ? '...' : isRolled ? 'Rolled' : 'Roll'}
                      </button>
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
                  const value = character.saves[save];
                  const isRolled = value > 0;
                  return (
                    <div key={save} className="flex flex-col items-center gap-2 p-3 bg-gray-900 rounded border border-gray-700">
                      <span className="capitalize text-gray-300 text-sm font-medium">{save}</span>
                      <span className={`text-3xl font-bold ${isRolled ? 'text-indigo-400' : 'text-gray-600'}`}>
                        {value || '—'}
                      </span>
                      <button
                        onClick={() => rollSaveMutation.mutate({ characterId: character.id, save })}
                        disabled={isRolled || rollSaveMutation.isPending}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-600 text-white rounded transition-colors text-xs w-full"
                      >
                        {rollSaveMutation.isPending ? '...' : isRolled ? 'Rolled' : 'Roll'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={!allStatsRolled || !allSavesRolled}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                Next: Choose Class
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Class */}
        {step === 2 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Choose Your Class</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Choose Your Class
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['marine', 'android', 'scientist', 'teamster'].map((cls) => {
                  const modifiers = CLASS_MODIFIERS[cls];
                  const allMods = [
                    ...Object.entries(modifiers.stats)
                      .filter(([_, val]) => val !== 0)
                      .map(([stat, val]) => `${val > 0 ? '+' : ''}${val} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`),
                    ...Object.entries(modifiers.saves)
                      .filter(([_, val]) => val !== 0)
                      .map(([save, val]) => `${val > 0 ? '+' : ''}${val} ${save.charAt(0).toUpperCase() + save.slice(1)}`),
                  ];
                  
                  return (
                    <button
                      key={cls}
                      onClick={() => setFormData({ ...formData, characterClass: cls as any, chosenStatModifier: undefined })}
                      className={`p-4 rounded border-2 transition-colors text-left ${
                        formData.characterClass === cls
                          ? 'border-indigo-500 bg-indigo-900/30'
                          : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-lg font-semibold capitalize mb-1">{cls}</div>
                      <div className="text-xs text-gray-400 mb-2">
                        {cls === 'marine' && 'Handy in a fight'}
                        {cls === 'android' && 'Cold inhumanity'}
                        {cls === 'scientist' && 'Doctors & researchers'}
                        {cls === 'teamster' && 'Blue-collar workers'}
                      </div>
                      <div className="text-[10px] text-indigo-300 leading-relaxed">
                        {allMods.join(', ')}
                        {modifiers.requiresStatChoice && `, ${modifiers.requiresStatChoice === 'penalty' ? '-10' : '+5'} to 1 stat (choice)`}
                        {modifiers.maxWounds > 0 && `, +${modifiers.maxWounds} Max Wounds`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stat choice for Android/Scientist */}
            {formData.characterClass && CLASS_MODIFIERS[formData.characterClass]?.requiresStatChoice && (
              <div className="mb-6 p-4 bg-gray-900 rounded border border-indigo-500">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.characterClass === 'android' 
                    ? 'Choose a stat to reduce by 10' 
                    : 'Choose a stat to boost by 5'}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(['strength', 'speed', 'intellect', 'combat', 'social'] as const).map((stat) => (
                    <button
                      key={stat}
                      onClick={() => setFormData({ ...formData, chosenStatModifier: stat })}
                      className={`p-2 rounded border transition-colors ${
                        formData.chosenStatModifier === stat
                          ? 'border-indigo-500 bg-indigo-900/50'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase text-gray-300">{stat.slice(0, 3)}</div>
                      <div className="text-xs text-indigo-400">
                        {formData.characterClass === 'android' ? '-10' : '+5'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Stats & Saves with class modifiers */}
            {formData.characterClass && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Preview: Your Final Stats</h4>
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {(['strength', 'speed', 'intellect', 'combat', 'social'] as const).map((stat) => {
                    const baseValue = character.stats[stat];
                    const modifier = getStatModifier(formData.characterClass!, stat, formData.chosenStatModifier);
                    const finalValue = baseValue + modifier;
                    return (
                      <div key={stat} className="flex flex-col items-center gap-1 p-3 bg-gray-900 rounded border border-gray-700">
                        <span className="capitalize text-gray-300 text-xs font-medium">{stat}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-white">{finalValue}</span>
                          {modifier !== 0 && (
                            <span className={`text-xs ${modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ({modifier > 0 ? '+' : ''}{modifier})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <h4 className="text-sm font-semibold text-gray-300 mb-3">Preview: Your Final Saves</h4>
                <div className="grid grid-cols-3 gap-3">
                  {(['sanity', 'fear', 'body'] as const).map((save) => {
                    const baseValue = character.saves[save];
                    const modifier = getSaveModifier(formData.characterClass!, save);
                    const finalValue = baseValue + modifier;
                    return (
                      <div key={save} className="flex flex-col items-center gap-1 p-3 bg-gray-900 rounded border border-gray-700">
                        <span className="capitalize text-gray-300 text-xs font-medium">{save}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-indigo-400">{finalValue}</span>
                          {modifier !== 0 && (
                            <span className={`text-xs ${modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ({modifier > 0 ? '+' : ''}{modifier})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSaveClassAndName}
                disabled={
                  !formData.characterClass || 
                  (CLASS_MODIFIERS[formData.characterClass]?.requiresStatChoice && !formData.chosenStatModifier) ||
                  updateCharacterMutation.isPending
                }
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                {updateCharacterMutation.isPending ? 'Saving...' : 'Next: Name & Review'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Name & Review */}
        {step === 3 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Name Your Character</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Character Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-indigo-500"
                placeholder="Enter character name"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Character Avatar
              </label>
              <div className="flex items-center gap-4 mb-3">
                <img 
                  src={formData.avatar} 
                  alt="Selected avatar"
                  className="w-20 h-20 rounded-lg border-2 border-indigo-500"
                />
                <button
                  onClick={() => setFormData({ ...formData, avatar: getRandomAvatar() })}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
                >
                  Random Avatar
                </button>
              </div>
              <div className="grid grid-cols-10 gap-2 max-h-60 overflow-y-auto p-2 bg-gray-900 rounded border border-gray-700">
                {AVATAR_LIST.map(avatar => (
                  <img 
                    key={avatar}
                    src={avatar}
                    alt="Avatar option"
                    className={`w-full aspect-square cursor-pointer rounded transition-all hover:scale-110 ${
                      formData.avatar === avatar ? 'ring-2 ring-indigo-500 scale-105' : 'opacity-60 hover:opacity-100'
                    }`}
                    onClick={() => setFormData({ ...formData, avatar })}
                  />
                ))}
              </div>
            </div>

            <p className="text-gray-400 mb-4">Review your character:</p>
            
            <div className="bg-gray-900 rounded-lg p-6 mb-6">
              <div className="mb-4">
                <p className="text-sm text-gray-400 capitalize">{character.characterClass}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-semibold text-gray-300 mb-2">Stats</h5>
                  <div className="space-y-1 text-sm">
                    {(['strength', 'speed', 'intellect', 'combat', 'social'] as const).map((stat) => (
                      <div key={stat} className="flex justify-between">
                        <span className="capitalize text-gray-400">{stat}</span>
                        <span className="text-white font-semibold">{character.stats[stat]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-semibold text-gray-300 mb-2">Saves</h5>
                  <div className="space-y-1 text-sm">
                    {(['sanity', 'fear', 'body'] as const).map((save) => (
                      <div key={save} className="flex justify-between">
                        <span className="capitalize text-gray-400">{save}</span>
                        <span className="text-indigo-400 font-semibold">{character.saves[save]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCompleteCharacter}
                disabled={!formData.name || updateCharacterMutation.isPending}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors font-semibold"
              >
                {updateCharacterMutation.isPending ? 'Saving...' : 'Complete Character'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
