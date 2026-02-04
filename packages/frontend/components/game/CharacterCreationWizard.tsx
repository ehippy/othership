import React, { useState } from "react";
import { trpc } from "@/lib/api/trpc";
import type { Character } from "@derelict/shared";
import { CLASS_MODIFIERS, getStatModifier, getSaveModifier } from "@derelict/shared";
import { AVATAR_LIST, getRandomAvatar } from "@/lib/avatars";
import { StatsDisplay } from "./StatsDisplay";

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
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

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
                  disabled={rollAllStatsMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white rounded transition-colors text-sm font-semibold"
                >
                  {rollAllStatsMutation.isPending ? 'Rolling...' : 'Roll All'}
                </button>
              )}
            </div>
            <p className="text-gray-400 mb-6">Roll for each stat (2d10 + 25) and save (2d10 + 10)</p>
            
            <StatsDisplay
              stats={character.stats}
              saves={character.saves}
            />

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
              <div className="grid grid-cols-4 gap-3">
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
                        {modifiers.maxWounds > 0 && `${modifiers.maxWounds} Max Wounds`}
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
              <StatsDisplay
                stats={character.stats}
                saves={character.saves}
                showModifiers
                modifiers={{
                  stats: {
                    strength: getStatModifier(formData.characterClass, 'strength', formData.chosenStatModifier),
                    speed: getStatModifier(formData.characterClass, 'speed', formData.chosenStatModifier),
                    intellect: getStatModifier(formData.characterClass, 'intellect', formData.chosenStatModifier),
                    combat: getStatModifier(formData.characterClass, 'combat', formData.chosenStatModifier),
                    social: getStatModifier(formData.characterClass, 'social', formData.chosenStatModifier),
                  },
                  saves: {
                    sanity: getSaveModifier(formData.characterClass, 'sanity'),
                    fear: getSaveModifier(formData.characterClass, 'fear'),
                    body: getSaveModifier(formData.characterClass, 'body'),
                  },
                }}
              />
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
            <h3 className="text-xl font-semibold mb-4">Identity</h3>
            
            {/* Name and Avatar Preview Row */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
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
              
              <div className="flex-shrink-0 group relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Avatar
                </label>
                <img 
                  src={formData.avatar} 
                  alt="Selected avatar"
                  className="w-32 h-32 rounded-lg border-2 border-indigo-500 cursor-pointer"
                />
                {/* Hover buttons overlay */}
                <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 p-2">
                  <button
                    onClick={() => setFormData({ ...formData, avatar: getRandomAvatar() })}
                    className="flex-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                  >
                    Random
                  </button>
                  <button
                    onClick={() => setIsAvatarPickerOpen(true)}
                    className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                  >
                    Choose
                  </button>
                </div>
              </div>
            </div>

            {/* Avatar Picker Modal */}
            {isAvatarPickerOpen && (
              <div 
                className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4"
                onClick={() => setIsAvatarPickerOpen(false)}
              >
                <div 
                  className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Choose Your Avatar</h4>
                    <button
                      onClick={() => setIsAvatarPickerOpen(false)}
                      className="text-gray-400 hover:text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-8 md:grid-cols-10 gap-2">
                    {AVATAR_LIST.map(avatar => (
                      <img 
                        key={avatar}
                        src={avatar}
                        alt="Avatar option"
                        className={`w-full aspect-square cursor-pointer rounded transition-all hover:scale-110 ${
                          formData.avatar === avatar ? 'ring-2 ring-indigo-500 scale-105' : 'opacity-60 hover:opacity-100'
                        }`}
                        onClick={() => {
                          setFormData({ ...formData, avatar });
                          setIsAvatarPickerOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-2">
              <p className="text-sm font-semibold text-gray-300 mb-1">Final Character</p>
              <p className="text-sm text-gray-400 capitalize">{character.characterClass}</p>
            </div>
            
            <StatsDisplay
              stats={character.stats}
              saves={character.saves}
            />

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
