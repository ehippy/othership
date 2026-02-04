import React, { useState } from "react";
import { trpc } from "@/lib/api/trpc";
import type { Character } from "@derelict/shared";

interface CharacterCreationWizardProps {
  character: Character;
  onComplete: () => void;
}

export function CharacterCreationWizard({ character, onComplete }: CharacterCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: character.name,
    characterClass: character.characterClass || undefined,
  });

  // Update character mutation
  const updateCharacterMutation = trpc.character.update.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      alert(`Failed to update character: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    // TODO: Validate all fields are filled
    // TODO: Call mutation to update character status to 'ready'
    alert("Character creation complete! (This will be implemented next)");
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

        {/* Step 1: Name & Class */}
        {step === 1 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Name & Class</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Character Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-indigo-500"
                placeholder="Enter character name"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Choose Your Class
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['marine', 'android', 'scientist', 'teamster'].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setFormData({ ...formData, characterClass: cls as any })}
                    className={`p-4 rounded border-2 transition-colors ${
                      formData.characterClass === cls
                        ? 'border-indigo-500 bg-indigo-900/30'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-lg font-semibold capitalize">{cls}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {cls === 'marine' && 'Handy in a fight'}
                      {cls === 'android' && 'Cold inhumanity'}
                      {cls === 'scientist' && 'Doctors & researchers'}
                      {cls === 'teamster' && 'Blue-collar workers'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.characterClass}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                Next: Roll Stats
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Roll Stats */}
        {step === 2 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Roll Stats</h3>
            <p className="text-gray-400 mb-6">Roll 2d10 + 25 for each stat</p>
            
            <div className="space-y-4 mb-6">
              {['strength', 'speed', 'intellect', 'combat', 'social'].map((stat) => (
                <div key={stat} className="flex items-center justify-between">
                  <span className="capitalize text-gray-300">{stat}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-indigo-400">
                      {character.stats[stat as keyof typeof character.stats] || 0}
                    </span>
                    <button
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
                    >
                      Roll
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
              >
                Next: Roll Saves
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Roll Saves & Finalize */}
        {step === 3 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Roll Saves</h3>
            <p className="text-gray-400 mb-6">Roll 2d10 + 10 for each save</p>
            
            <div className="space-y-4 mb-6">
              {['sanity', 'fear', 'body'].map((save) => (
                <div key={save} className="flex items-center justify-between">
                  <span className="capitalize text-gray-300">{save}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-indigo-400">
                      {character.saves[save as keyof typeof character.saves] || 0}
                    </span>
                    <button
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
                    >
                      Roll
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors font-semibold"
              >
                Complete Character
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
