import React, { useState } from "react";
import { trpc } from "@/lib/api/trpc";
import type { Character } from "@derelict/shared";
import { CLASS_MODIFIERS, getStatModifier, getSaveModifier, CLASS_STARTING_SKILLS, getSkillTree, isSkillUnlocked, getRemainingBonusSlots, validateSkillSelection, getMasterSkillChain } from "@derelict/shared";
import { AVATAR_LIST, getRandomAvatar } from "@/lib/avatars";
import { StatsDisplay } from "./StatsDisplay";
import { SkillChip } from "./SkillChip";

interface CharacterCreationWizardProps {
  character: Character;
  onComplete: () => void;
}

export function CharacterCreationWizard({ character, onComplete }: CharacterCreationWizardProps) {
  const [step, setStep] = useState(1);
  
  // Helper to get name from avatar path
  const getNameFromAvatar = (avatarPath: string) => {
    const filename = avatarPath.split('/').pop() || '';
    const nameWithoutExt = filename.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
    // Convert to title case: "alien-warrior" -> "Alien Warrior"
    return nameWithoutExt
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  const initialAvatar = character.avatar || getRandomAvatar();
  const [formData, setFormData] = useState({
    name: character.name || getNameFromAvatar(initialAvatar),
    characterClass: character.characterClass || undefined,
    chosenStatModifier: character.chosenStatModifier || undefined,
    avatar: initialAvatar,
    skills: character.skills || [],
    bonusChoiceIndex: undefined as number | undefined, // For marine/android choice between options
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
    onSuccess: async () => {
      await onComplete(); // Refresh character data
      setStep(3); // Move to skills step after data is refreshed
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
          <div className="flex-1 h-1 bg-gray-700">
            <div className={`h-full ${step >= 4 ? 'bg-indigo-600' : 'bg-gray-700'} transition-all`} />
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 4 ? 'bg-indigo-600' : 'bg-gray-700'} text-sm font-semibold`}>
            4
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
            
            <StatsDisplay
              stats={character.stats}
              saves={character.saves}
              health={character.health}
              maxHealth={character.maxHealth}
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
            {(() => {
              // Calculate base stats by removing existing class modifiers if any
              let displayStats = { ...character.stats };
              let displaySaves = { ...character.saves };
              
              if (character.characterClass) {
                // Remove old modifiers to show preview correctly
                (['strength', 'speed', 'intellect', 'combat', 'social'] as const).forEach(stat => {
                  const oldModifier = getStatModifier(character.characterClass!, stat, character.chosenStatModifier);
                  displayStats[stat] = character.stats[stat] - oldModifier;
                });
                
                (['sanity', 'fear', 'body'] as const).forEach(save => {
                  const oldModifier = getSaveModifier(character.characterClass!, save);
                  displaySaves[save] = character.saves[save] - oldModifier;
                });
              }
              
              return (
                <StatsDisplay
                  stats={displayStats}
                  saves={displaySaves}
                  health={character.health}
                  maxHealth={character.maxHealth}
                  showModifiers={!!formData.characterClass}
                  modifiers={formData.characterClass ? {
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
                  } : undefined}
                />
              );
            })()}

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
                {updateCharacterMutation.isPending ? 'Saving...' : 'Next: Choose Skills'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Skills */}
        {step === 3 && (() => {
          const skillTree = getSkillTree();
          const classConfig = CLASS_STARTING_SKILLS[formData.characterClass as keyof typeof CLASS_STARTING_SKILLS];
          if (!classConfig) return null;

          // Get starting skills for this class
          // For Scientists, treat the master chain (first 3 skills) as starting skills once selected
          let startingSkills = classConfig.starting || [];
          let bonusSkills = formData.skills;
          if (classConfig.requiresMasterSelection && formData.skills.length >= 3) {
            startingSkills = formData.skills.slice(0, 3); // First 3 are the master chain
            bonusSkills = formData.skills.slice(3); // Rest are bonus selections
          }
          
          // For Scientist, if no starting skills selected yet, need to select Master skill chain
          const needsMasterSelection = classConfig.requiresMasterSelection && formData.skills.length === 0;

          // Calculate remaining bonus slots
          const remaining = getRemainingBonusSlots(
            formData.characterClass!,
            bonusSkills,
            startingSkills,
            formData.bonusChoiceIndex
          );

          // Check if skill can be toggled
          const canToggleSkill = (skillId: string, tier: 'trained' | 'expert' | 'master') => {
            const isStarting = startingSkills.includes(skillId);
            const isSelected = bonusSkills.includes(skillId);
            
            // Can't toggle starting skills
            if (isStarting) return false;
            
            // If selecting, check if there's room and if unlocked
            if (!isSelected) {
              if (remaining[tier] <= 0) return false;
              // Include starting skills when checking prerequisites
              const allSkills = [...startingSkills, ...bonusSkills];
              return isSkillUnlocked(skillId, allSkills, skillTree);
            }
            
            // If deselecting, check if any selected skills depend on this one
            const dependents = bonusSkills.filter(id => {
              const skill = skillTree.skills.find(s => s.id === id);
              return skill?.unlocked_by?.includes(skillId);
            });
            
            return dependents.length === 0;
          };

          const handleToggleSkill = (skillId: string, tier: 'trained' | 'expert' | 'master') => {
            if (!canToggleSkill(skillId, tier)) return;
            
            const isSelected = bonusSkills.includes(skillId);
            if (isSelected) {
              // Remove from bonus skills (but keep the full formData.skills for Scientists)
              const newBonusSkills = bonusSkills.filter(id => id !== skillId);
              const newAllSkills = classConfig.requiresMasterSelection && formData.skills.length >= 3
                ? [...formData.skills.slice(0, 3), ...newBonusSkills]
                : newBonusSkills;
              setFormData({ ...formData, skills: newAllSkills });
            } else {
              // Add to bonus skills
              const newBonusSkills = [...bonusSkills, skillId];
              const newAllSkills = classConfig.requiresMasterSelection && formData.skills.length >= 3
                ? [...formData.skills.slice(0, 3), ...newBonusSkills]
                : newBonusSkills;
              setFormData({ ...formData, skills: newAllSkills });
            }
          };

          const handleSelectMasterSkill = (masterId: string) => {
            const chain = getMasterSkillChain(masterId, skillTree);
            if (chain) {
              // Replace all skills with this master chain (IDs only)
              setFormData({ ...formData, skills: [chain.master.id, chain.expert.id, chain.trained.id] });
            }
          };

          const handleSaveSkills = () => {
            updateCharacterMutation.mutate({
              characterId: character.id,
              skills: formData.skills,
            });
            setStep(4); // Move to name & review
          };

          const validation = validateSkillSelection(
            formData.characterClass!,
            bonusSkills,
            startingSkills,
            formData.bonusChoiceIndex
          );

          return (
            <div>
              <h3 className="text-xl font-semibold mb-4">Choose Skills</h3>

              {/* Bonus choice for Marine/Android */}
              {classConfig.bonusChoice === 'either' && (
                <div className="mb-6 p-4 bg-indigo-900/30 border border-indigo-500 rounded">
                  <p className="text-sm text-gray-300 mb-3">Choose your bonus skills:</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        // Clear bonus skills if switching choices
                        if (formData.bonusChoiceIndex !== 0) {
                          setFormData({ ...formData, bonusChoiceIndex: 0, skills: [] });
                        }
                      }}
                      className={`flex-1 p-3 border rounded transition-colors ${
                        formData.bonusChoiceIndex === 0
                          ? 'bg-indigo-900 border-indigo-400 ring-2 ring-indigo-500'
                          : 'bg-gray-800 hover:bg-gray-700 border-gray-600'
                      }`}
                    >
                      <div className="font-semibold">1 Expert Skill</div>
                      <div className="text-xs text-gray-400">+15 bonus</div>
                    </button>
                    <button
                      onClick={() => {
                        // Clear bonus skills if switching choices
                        if (formData.bonusChoiceIndex !== 1) {
                          setFormData({ ...formData, bonusChoiceIndex: 1, skills: [] });
                        }
                      }}
                      className={`flex-1 p-3 border rounded transition-colors ${
                        formData.bonusChoiceIndex === 1
                          ? 'bg-indigo-900 border-indigo-400 ring-2 ring-indigo-500'
                          : 'bg-gray-800 hover:bg-gray-700 border-gray-600'
                      }`}
                    >
                      <div className="font-semibold">2 Trained Skills</div>
                      <div className="text-xs text-gray-400">+10 bonus each</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Show starting skills or master selection for Scientist */}
              {classConfig.requiresMasterSelection && needsMasterSelection ? (
                <div className="mb-6 p-4 bg-purple-900/30 border border-purple-500 rounded">
                  <h4 className="text-lg font-semibold text-purple-400 mb-2">First, Choose Your Master Skill</h4>
                  <p className="text-sm text-gray-300 mb-4">Selecting a Master skill automatically includes its prerequisite Expert and Trained skills. After this, you'll choose 1 bonus Trained skill.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {skillTree.skills
                      .filter(s => s.tier === 'master')
                      .map(skill => (
                        <button
                          key={skill.id}
                          onClick={() => handleSelectMasterSkill(skill.id)}
                          className="p-3 bg-purple-900/50 hover:bg-purple-800 border border-purple-500 rounded text-left transition-colors"
                        >
                          <div className="font-semibold text-purple-300">{skill.name}</div>
                          <div className="text-xs text-gray-400 mt-1">+20 bonus</div>
                        </button>
                      ))}
                  </div>
                </div>
              ) : startingSkills.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-indigo-400 mb-2 capitalize">{character.characterClass} Starting Skills (Included):</h4>
                  <div className="flex flex-wrap gap-2">
                    {startingSkills.map(skillId => {
                      const skill = skillTree.skills.find(s => s.id === skillId);
                      return skill ? (
                        <div key={skillId} className="px-3 py-1 bg-indigo-900/50 border border-indigo-600 rounded text-sm">
                          {skill.name} (+{skill.tier === 'trained' ? 10 : skill.tier === 'expert' ? 15 : 20})
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Remaining slots indicator */}
              {(formData.bonusChoiceIndex !== undefined || classConfig.bonusSlots) && (
                <div className="mb-4 flex gap-4 text-sm">
                  {remaining.trained > 0 && (
                    <div className="text-gray-300">Trained: <span className="text-indigo-400 font-semibold">{remaining.trained}</span> remaining</div>
                  )}
                  {remaining.expert > 0 && (
                    <div className="text-gray-300">Expert: <span className="text-indigo-400 font-semibold">{remaining.expert}</span> remaining</div>
                  )}
                  {remaining.master > 0 && (
                    <div className="text-gray-300">Master: <span className="text-indigo-400 font-semibold">{remaining.master}</span> remaining</div>
                  )}
                </div>
              )}

              {/* Skill tree by tier - only show if not waiting for master selection */}
              {!needsMasterSelection && (
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {/* Trained Skills */}
                {(() => {
                  const trainedSkills = skillTree.skills
                    .filter(s => s.tier === 'trained')
                    .filter(skill => {
                      // Only show starting skills, selected skills, or unlocked skills
                      const isStarting = startingSkills.includes(skill.id);
                      const isSelected = bonusSkills.includes(skill.id);
                      const allSkills = [...startingSkills, ...bonusSkills];
                      const isUnlocked = isSkillUnlocked(skill.id, allSkills, skillTree);
                      const canToggle = canToggleSkill(skill.id, 'trained');
                      return isStarting || isSelected || (isUnlocked && canToggle);
                    });
                  
                  if (trainedSkills.length === 0) return null;
                  
                  return (
                    <div>
                      <h4 className="text-lg font-semibold text-green-400 mb-2">Trained Skills (+10)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {trainedSkills
                          .sort((a, b) => {
                            const allSkills = [...startingSkills, ...bonusSkills];
                            const aUnlocked = isSkillUnlocked(a.id, allSkills, skillTree);
                            const bUnlocked = isSkillUnlocked(b.id, allSkills, skillTree);
                            const aSelected = bonusSkills.includes(a.id) || startingSkills.includes(a.id);
                            const bSelected = bonusSkills.includes(b.id) || startingSkills.includes(b.id);
                            
                            // Sort: selected first, then unlocked, then locked
                            if (aSelected !== bSelected) return aSelected ? -1 : 1;
                            if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
                            return 0;
                          })
                          .map(skill => {
                      const isStarting = startingSkills.includes(skill.id);
                      const isSelected = bonusSkills.includes(skill.id);
                      const allSkills = [...startingSkills, ...bonusSkills];
                      const isUnlocked = isSkillUnlocked(skill.id, allSkills, skillTree);
                      const canToggle = canToggleSkill(skill.id, 'trained');
                      
                      return (
                        <button
                          key={skill.id}
                          onClick={() => handleToggleSkill(skill.id, 'trained')}
                          disabled={isStarting}
                          className={`p-2 rounded text-left text-sm transition-colors ${
                            isStarting
                              ? 'bg-indigo-900/50 border border-indigo-600 cursor-default'
                              : isSelected
                              ? 'bg-green-900/30 border-2 border-green-500'
                              : 'bg-gray-800 border border-gray-600 hover:border-green-500'
                          }`}
                        >
                          {skill.name}
                        </button>
                      );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Expert Skills */}
                {(() => {
                  const expertSkills = skillTree.skills
                    .filter(s => s.tier === 'expert')
                    .filter(skill => {
                      // Only show starting skills, selected skills, or unlocked skills
                      const isStarting = startingSkills.includes(skill.id);
                      const isSelected = bonusSkills.includes(skill.id);
                      const allSkills = [...startingSkills, ...bonusSkills];
                      const isUnlocked = isSkillUnlocked(skill.id, allSkills, skillTree);
                      const canToggle = canToggleSkill(skill.id, 'expert');
                      return isStarting || isSelected || (isUnlocked && canToggle);
                    });
                  
                  if (expertSkills.length === 0) return null;
                  
                  return (
                    <div>
                      <h4 className="text-lg font-semibold text-blue-400 mb-2">Expert Skills (+15)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {expertSkills
                          .sort((a, b) => {
                            const allSkills = [...startingSkills, ...bonusSkills];
                            const aUnlocked = isSkillUnlocked(a.id, allSkills, skillTree);
                            const bUnlocked = isSkillUnlocked(b.id, allSkills, skillTree);
                            const aSelected = bonusSkills.includes(a.id) || startingSkills.includes(a.id);
                            const bSelected = bonusSkills.includes(b.id) || startingSkills.includes(b.id);
                            
                            // Sort: selected first, then unlocked, then locked
                            if (aSelected !== bSelected) return aSelected ? -1 : 1;
                            if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
                            return 0;
                          })
                          .map(skill => {
                      const isStarting = startingSkills.includes(skill.id);
                      const isSelected = bonusSkills.includes(skill.id);
                      const allSkills = [...startingSkills, ...bonusSkills];
                      const isUnlocked = isSkillUnlocked(skill.id, allSkills, skillTree);
                      const canToggle = canToggleSkill(skill.id, 'expert');
                      
                      return (
                        <button
                          key={skill.id}
                          onClick={() => handleToggleSkill(skill.id, 'expert')}
                          disabled={isStarting}
                          className={`p-2 rounded text-left text-sm transition-colors ${
                            isStarting
                              ? 'bg-indigo-900/50 border border-indigo-600 cursor-default'
                              : isSelected
                              ? 'bg-blue-900/30 border-2 border-blue-500'
                              : 'bg-gray-800 border border-gray-600 hover:border-blue-500'
                          }`}
                        >
                          <div>{skill.name}</div>
                          {skill.unlocked_by && (
                            <div className="text-[10px] text-gray-500 mt-1">
                              Requires: {skill.unlocked_by.map(id => skillTree.skills.find(s => s.id === id)?.name).join(' or ')}
                            </div>
                          )}
                        </button>
                      );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Master Skills */}
                {(() => {
                  const masterSkills = skillTree.skills
                    .filter(s => s.tier === 'master')
                    .filter(skill => {
                      // Only show starting skills, selected skills, or unlocked skills
                      const isStarting = startingSkills.includes(skill.id);
                      const isSelected = bonusSkills.includes(skill.id);
                      const allSkills = [...startingSkills, ...bonusSkills];
                      const isUnlocked = isSkillUnlocked(skill.id, allSkills, skillTree);
                      const canToggle = canToggleSkill(skill.id, 'master');
                      return isStarting || isSelected || (isUnlocked && canToggle);
                    });
                  
                  if (masterSkills.length === 0) return null;
                  
                  return (
                    <div>
                      <h4 className="text-lg font-semibold text-purple-400 mb-2">Master Skills (+20)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {masterSkills
                          .sort((a, b) => {
                            const allSkills = [...startingSkills, ...bonusSkills];
                            const aUnlocked = isSkillUnlocked(a.id, allSkills, skillTree);
                            const bUnlocked = isSkillUnlocked(b.id, allSkills, skillTree);
                            const aSelected = bonusSkills.includes(a.id) || startingSkills.includes(a.id);
                            const bSelected = bonusSkills.includes(b.id) || startingSkills.includes(b.id);
                            
                            // Sort: selected first, then unlocked, then locked
                            if (aSelected !== bSelected) return aSelected ? -1 : 1;
                            if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
                            return 0;
                          })
                          .map(skill => {
                      const isStarting = startingSkills.includes(skill.id);
                      const isSelected = bonusSkills.includes(skill.id);
                      const allSkills = [...startingSkills, ...bonusSkills];
                      const isUnlocked = isSkillUnlocked(skill.id, allSkills, skillTree);
                      const canToggle = canToggleSkill(skill.id, 'master');
                      
                      return (
                        <button
                          key={skill.id}
                          onClick={() => handleToggleSkill(skill.id, 'master')}
                          disabled={isStarting}
                          className={`p-2 rounded text-left text-sm transition-colors ${
                            isStarting
                              ? 'bg-indigo-900/50 border border-indigo-600 cursor-default'
                              : isSelected
                              ? 'bg-purple-900/30 border-2 border-purple-500'
                              : 'bg-gray-800 border border-gray-600 hover:border-purple-500'
                          }`}
                        >
                          <div>{skill.name}</div>
                          {skill.unlocked_by && (
                            <div className="text-[10px] text-gray-500 mt-1">
                              Requires: {skill.unlocked_by.map(id => skillTree.skills.find(s => s.id === id)?.name).join(' or ')}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
              </div>              )}
              {/* Validation errors */}
              {!validation.valid && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-600 rounded text-sm text-red-300">
                  {validation.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveSkills}
                  disabled={!validation.valid}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors"
                >
                  Next: Name & Review
                </button>
              </div>
            </div>
          );
        })()}

        {/* Step 4: Name & Review */}
        {step === 4 && (
          <div>
            
            
            {/* Name and Avatar Preview Row */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-4 capitalize">Your {character.characterClass}</h3>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded text-white text-4xl font-bold focus:outline-none focus:border-indigo-500"
                  placeholder="Enter character name"
                  autoFocus
                />
              </div>
              
              <div className="flex-shrink-0 group relative">
                <img 
                  src={formData.avatar} 
                  alt="Selected avatar"
                  className="w-32 h-32 rounded-lg border-2 border-indigo-500 cursor-pointer"
                />
                {/* Hover buttons overlay */}
                <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 p-2">
                  <button
                    onClick={() => setFormData({ ...formData, avatar: getRandomAvatar() })}
                    className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                  >
                    ↻
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
                        {/* Skills Summary */}
            {(() => {
              const skillTree = getSkillTree();
              const classConfig = CLASS_STARTING_SKILLS[formData.characterClass as keyof typeof CLASS_STARTING_SKILLS];
              const startingSkills = classConfig?.starting || [];
              
              // Combine starting skills + selected bonus skills
              const allSkillIds = [...startingSkills, ...(character.skills || [])];
              const uniqueSkillIds = Array.from(new Set(allSkillIds)); // Remove duplicates
              
              if (uniqueSkillIds.length === 0) return null;
              
              return (
                <div className="mb-6">
                  <h3 className="font-semibold text-white mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-1">
                    {uniqueSkillIds.map(id => {
                      const skill = skillTree.skills.find(s => s.id === id);
                      if (!skill) return null;
                      
                      return (
                        <SkillChip
                          key={id}
                          skillName={skill.name}
                          tier={skill.tier as 'trained' | 'expert' | 'master'}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}
                        <StatsDisplay
              stats={character.stats}
              saves={character.saves}
              health={character.health}
              maxHealth={character.maxHealth}
            />

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
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
