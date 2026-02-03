"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";

interface Prompt {
  id: string;
  text: string;
  emoji: string;
  category: string;
}

interface PromptCardProps {
  prompts: Prompt[];
  selectedPrompts: { promptId: string; response: string }[];
  onSelect: (promptId: string, response: string) => void;
  onRemove: (promptId: string) => void;
  maxPrompts?: number;
}

const AVAILABLE_PROMPTS: Prompt[] = [
  // Conversation Starters
  { id: "unpopular_opinion", text: "My most unpopular opinion is...", emoji: "🔥", category: "Spicy" },
  { id: "conspiracy", text: "A conspiracy theory I low-key believe...", emoji: "👽", category: "Spicy" },
  { id: "guilty_pleasure", text: "My guilty pleasure is...", emoji: "🙈", category: "Fun" },
  { id: "pet_peeve", text: "My biggest pet peeve is...", emoji: "😤", category: "Real Talk" },
  
  // Getting to Know
  { id: "perfect_sunday", text: "My perfect Sunday looks like...", emoji: "☀️", category: "Lifestyle" },
  { id: "life_goal", text: "A life goal of mine is...", emoji: "🎯", category: "Deep" },
  { id: "green_flag", text: "The biggest green flag in someone is...", emoji: "🟢", category: "Dating" },
  { id: "dealbreaker", text: "My dating dealbreaker is...", emoji: "🚩", category: "Dating" },
  
  // Fun & Quirky
  { id: "useless_talent", text: "My useless talent is...", emoji: "🎪", category: "Fun" },
  { id: "karaoke", text: "My go-to karaoke song is...", emoji: "🎤", category: "Fun" },
  { id: "comfort_food", text: "My comfort food is...", emoji: "🍕", category: "Food" },
  { id: "tv_binge", text: "I could rewatch __ forever", emoji: "📺", category: "Entertainment" },
  
  // Deep & Meaningful
  { id: "proud_of", text: "I'm secretly proud of...", emoji: "🏆", category: "Deep" },
  { id: "change_mind", text: "Something that changed my mind recently...", emoji: "💭", category: "Deep" },
  { id: "grateful_for", text: "I'm most grateful for...", emoji: "🙏", category: "Deep" },
  { id: "teach_me", text: "I want someone to teach me...", emoji: "📚", category: "Growth" },
  
  // Dating Specific
  { id: "ideal_date", text: "My ideal first date is...", emoji: "💕", category: "Dating" },
  { id: "love_language", text: "My love language is...", emoji: "💝", category: "Dating" },
  { id: "looking_for", text: "I'm looking for someone who...", emoji: "🔍", category: "Dating" },
  { id: "relationship_rule", text: "My non-negotiable in a relationship...", emoji: "💍", category: "Dating" },
  
  // Campus Life
  { id: "campus_spot", text: "My favorite spot on campus is...", emoji: "🏫", category: "Campus" },
  { id: "study_hack", text: "My best study hack is...", emoji: "📖", category: "Campus" },
  { id: "class_type", text: "I'm the type to ____ in class", emoji: "🎓", category: "Campus" },
];

export function PromptSelector({ 
  selectedPrompts, 
  onSelect, 
  onRemove, 
  maxPrompts = 3 
}: PromptCardProps) {
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [response, setResponse] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(AVAILABLE_PROMPTS.map(p => p.category))];
  const filteredPrompts = selectedCategory 
    ? AVAILABLE_PROMPTS.filter(p => p.category === selectedCategory)
    : AVAILABLE_PROMPTS;

  const usedPromptIds = selectedPrompts.map(p => p.promptId);
  const availablePrompts = filteredPrompts.filter(p => !usedPromptIds.includes(p.id));

  const handleSelectPrompt = (prompt: Prompt) => {
    setActivePrompt(prompt);
    setResponse("");
  };

  const handleSaveResponse = () => {
    if (activePrompt && response.trim()) {
      onSelect(activePrompt.id, response.trim());
      setActivePrompt(null);
      setResponse("");
      setShowPromptPicker(false);
    }
  };

  const getPromptById = (id: string) => AVAILABLE_PROMPTS.find(p => p.id === id);

  return (
    <div className="space-y-4">
      {/* Selected Prompts */}
      <div className="space-y-3">
        {selectedPrompts.map((selected, index) => {
          const prompt = getPromptById(selected.promptId);
          if (!prompt) return null;

          return (
            <motion.div
              key={selected.promptId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 
                            border border-pink-500/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{prompt.emoji}</span>
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm mb-1">{prompt.text}</p>
                    <p className="text-white font-medium">{selected.response}</p>
                  </div>
                  <button
                    onClick={() => onRemove(selected.promptId)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity 
                             text-gray-400 hover:text-red-400 p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Prompt Button */}
      {selectedPrompts.length < maxPrompts && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowPromptPicker(true)}
          className="w-full py-6 rounded-2xl border-2 border-dashed border-white/20 
                   hover:border-pink-500/50 transition-colors flex items-center 
                   justify-center gap-2 text-gray-400 hover:text-white"
        >
          <span className="text-2xl">+</span>
          <span>Add a prompt ({selectedPrompts.length}/{maxPrompts})</span>
        </motion.button>
      )}

      {/* Prompt Picker Modal */}
      <AnimatePresence>
        {showPromptPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center 
                     bg-black/60 backdrop-blur-sm p-4"
            onClick={() => {
              setShowPromptPicker(false);
              setActivePrompt(null);
            }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[80vh] bg-[#1a1a2e] rounded-t-3xl 
                       sm:rounded-3xl overflow-hidden"
            >
              {!activePrompt ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-white text-lg font-bold text-center">
                      Choose a prompt ✨
                    </h3>
                    <p className="text-gray-400 text-sm text-center mt-1">
                      Let people know more about you
                    </p>
                  </div>

                  {/* Categories */}
                  <div className="p-4 border-b border-white/10 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === null
                            ? "bg-pink-500 text-white"
                            : "bg-white/10 text-gray-300 hover:bg-white/20"
                        }`}
                      >
                        All
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                            selectedCategory === cat
                              ? "bg-pink-500 text-white"
                              : "bg-white/10 text-gray-300 hover:bg-white/20"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompts List */}
                  <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2">
                    {availablePrompts.map(prompt => (
                      <motion.button
                        key={prompt.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectPrompt(prompt)}
                        className="w-full p-4 rounded-xl bg-white/5 border border-white/10 
                                 hover:border-pink-500/50 transition-colors text-left
                                 flex items-center gap-3"
                      >
                        <span className="text-2xl">{prompt.emoji}</span>
                        <span className="text-white">{prompt.text}</span>
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Response Input */}
                  <div className="p-6">
                    <button
                      onClick={() => setActivePrompt(null)}
                      className="text-gray-400 hover:text-white mb-4"
                    >
                      ← Back
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{activePrompt.emoji}</span>
                      <h3 className="text-white font-semibold">{activePrompt.text}</h3>
                    </div>

                    <Textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Your answer..."
                      maxLength={200}
                      className="bg-white/5 border-white/10 text-white min-h-[120px] 
                               resize-none focus:border-pink-500/50"
                    />
                    
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-500 text-sm">
                        {response.length}/200
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSaveResponse}
                        disabled={!response.trim()}
                        className="px-6 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 
                                 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </motion.button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { AVAILABLE_PROMPTS };
export type { Prompt };
