"use client";

import { motion } from "framer-motion";
import { PromptSelector } from "../components/prompt-selector";
import { OnboardingData } from "./index";

interface Stage8Props {
  data: OnboardingData;
  onUpdatePrompts: (prompts: { promptId: string; response: string }[]) => void;
}

export function Stage8Prompts({ data, onUpdatePrompts }: Stage8Props) {
  const handleSelectPrompt = (promptId: string, response: string) => {
    const newPrompts = [...data.prompts, { promptId, response }];
    onUpdatePrompts(newPrompts);
  };

  const handleRemovePrompt = (promptId: string) => {
    const newPrompts = data.prompts.filter(p => p.promptId !== promptId);
    onUpdatePrompts(newPrompts);
  };

  return (
    <div className="space-y-6">
      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <p className="text-gray-400 text-sm">
          Prompts help start conversations! Add up to 3 that show your personality.
        </p>
      </motion.div>

      {/* Prompt Selector */}
      <PromptSelector
        prompts={[]}
        selectedPrompts={data.prompts}
        onSelect={handleSelectPrompt}
        onRemove={handleRemovePrompt}
        maxPrompts={3}
      />

      {/* Tips */}
      {data.prompts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 
                   border border-pink-500/20"
        >
          <h4 className="text-white font-medium mb-2">💡 Pro tip</h4>
          <p className="text-gray-300 text-sm">
            Profiles with prompts get 2x more matches! Pick ones that spark conversation.
          </p>
        </motion.div>
      )}

      {/* Skip option */}
      <p className="text-center text-gray-500 text-sm">
        You can always add prompts later from your profile
      </p>
    </div>
  );
}
