import React, { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/hooks/useAuth";
import { useGuildSelection } from "@/lib/hooks/useGuildSelection";
import { trpc } from "@/lib/api/trpc";
import type { Scenario } from "@derelict/shared";

export default function ScenariosPage() {
  const { isLoading: authLoading, user, logout } = useAuth();
  const { selectedGuild, selectGuild } = useGuildSelection();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    difficulty: "easy" as const,
    minPlayers: 2,
    maxPlayers: 6,
    objectives: [] as string[],
  });
  const [objectiveInput, setObjectiveInput] = useState("");

  // Fetch scenarios
  const { data: scenarios, isLoading: scenariosLoading, refetch } = trpc.scenario.listScenarios.useQuery();

  // Create scenario mutation
  const createScenarioMutation = trpc.scenario.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
      // Reset form
      setFormData({
        name: "",
        description: "",
        difficulty: "easy",
        minPlayers: 2,
        maxPlayers: 6,
        objectives: [],
      });
      setObjectiveInput("");
    },
    onError: (error) => {
      alert(`Failed to create scenario: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createScenarioMutation.mutate(formData);
  };

  const addObjective = () => {
    if (objectiveInput.trim()) {
      setFormData({
        ...formData,
        objectives: [...formData.objectives, objectiveInput.trim()],
      });
      setObjectiveInput("");
    }
  };

  const removeObjective = (index: number) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== index),
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      tutorial: "bg-green-900 text-green-200",
      easy: "bg-blue-900 text-blue-200",
      medium: "bg-yellow-900 text-yellow-200",
      hard: "bg-orange-900 text-orange-200",
      deadly: "bg-red-900 text-red-200",
    };
    return colors[difficulty as keyof typeof colors] || colors.medium;
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Scenarios</h1>
              <p className="text-gray-400">Manage game scenarios and missions</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors font-semibold"
            >
              {showForm ? "Cancel" : "➕ New Scenario"}
            </button>
          </div>

          {/* Create Form */}
          {showForm && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-6">Create New Scenario</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Scenario Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Derelict Freighter"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="A brief description of the scenario..."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Difficulty and Players Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Difficulty *
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="tutorial">Tutorial</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="deadly">Deadly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Min Players *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={formData.minPlayers}
                      onChange={(e) => setFormData({ ...formData, minPlayers: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Players *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={formData.maxPlayers}
                      onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                {/* Objectives */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Objectives
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={objectiveInput}
                      onChange={(e) => setObjectiveInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addObjective();
                        }
                      }}
                      placeholder="Add an objective..."
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={addObjective}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {formData.objectives.length > 0 && (
                    <ul className="space-y-2">
                      {formData.objectives.map((objective, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between bg-gray-700 rounded px-3 py-2"
                        >
                          <span className="text-gray-300">{objective}</span>
                          <button
                            type="button"
                            onClick={() => removeObjective(index)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={createScenarioMutation.isPending}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors font-semibold"
                  >
                    {createScenarioMutation.isPending ? "Creating..." : "Create Scenario"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Scenarios List */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Available Scenarios</h2>
            {scenariosLoading ? (
              <p className="text-gray-400">Loading scenarios...</p>
            ) : scenarios && scenarios.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenarios.map((scenario: Scenario) => (
                  <div
                    key={scenario.id}
                    className="bg-gray-900 border border-gray-700 rounded-lg p-5 hover:border-indigo-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-indigo-400">{scenario.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(scenario.difficulty)}`}>
                        {scenario.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{scenario.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>👥 {scenario.minPlayers}-{scenario.maxPlayers} players</span>
                      {scenario.objectives && scenario.objectives.length > 0 && (
                        <span>🎯 {scenario.objectives.length} objectives</span>
                      )}
                    </div>
                    {scenario.objectives && scenario.objectives.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-500 mb-2">Objectives:</p>
                        <ul className="space-y-1">
                          {scenario.objectives.slice(0, 3).map((objective, idx) => (
                            <li key={idx} className="text-xs text-gray-400">• {objective}</li>
                          ))}
                          {scenario.objectives.length > 3 && (
                            <li className="text-xs text-gray-500">+ {scenario.objectives.length - 3} more...</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No scenarios yet</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                >
                  Create your first scenario
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top bar */}
      <TopBar
        avatar={user.avatar}
        discordUserId={user.discordUserId}
        username={user.username}
        onLogout={logout}
        onSelectGuild={selectGuild}
        selectedGuildName={selectedGuild?.name}
        selectedGuildId={selectedGuild?.id || null}
        selectedGuildIcon={selectedGuild?.icon || null}
      />
    </main>
  );
}
