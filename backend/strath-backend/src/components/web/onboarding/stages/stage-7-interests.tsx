"use client";

import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "./index";

interface Stage7Props {
  data: OnboardingData;
  onToggleInterest: (interest: string) => void;
}

const INTERESTS_DATA = [
  { label: 'Music', emoji: '🎵' },
  { label: 'Gaming', emoji: '🎮' },
  { label: 'Anime', emoji: '✨' },
  { label: 'Gym', emoji: '💪' },
  { label: 'Travel', emoji: '✈️' },
  { label: 'Foodie', emoji: '🍕' },
  { label: 'Photography', emoji: '📸' },
  { label: 'Art', emoji: '🎨' },
  { label: 'Reading', emoji: '📚' },
  { label: 'Movies', emoji: '🎬' },
  { label: 'Coding', emoji: '💻' },
  { label: 'Fashion', emoji: '👗' },
  { label: 'Sports', emoji: '⚽' },
  { label: 'Cooking', emoji: '👨‍🍳' },
  { label: 'Dancing', emoji: '💃' },
  { label: 'Hiking', emoji: '🥾' },
  { label: 'Pets', emoji: '🐕' },
  { label: 'Yoga', emoji: '🧘' },
  { label: 'Startups', emoji: '🚀' },
  { label: 'Tech', emoji: '📱' },
  { label: 'Netflix', emoji: '📺' },
  { label: 'Coffee', emoji: '☕' },
  { label: 'Astrology', emoji: '🔮' },
  { label: 'Fitness', emoji: '🏃' },
  { label: 'Wine', emoji: '🍷' },
  { label: 'Meditation', emoji: '🧘‍♀️' },
  { label: 'Writing', emoji: '✍️' },
  { label: 'Volunteering', emoji: '🤝' },
  { label: 'K-Pop', emoji: '🎤' },
  { label: 'Podcasts', emoji: '🎧' },
  { label: 'Skincare', emoji: '✨' },
  { label: 'Thrifting', emoji: '🛍️' },
] as const;

export function Stage7Interests({ data, onToggleInterest }: Stage7Props) {
  const selectedCount = data.interests?.length || 0;
  const minRequired = 3;
  const maxAllowed = 10;

  return (
    <div className="space-y-4">
      {/* Selection counter */}
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Pick your interests</Label>
        <motion.span 
          key={selectedCount}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className={`text-sm font-medium ${
            selectedCount >= minRequired ? 'text-green-400' : 'text-gray-400'
          }`}
        >
          {selectedCount}/{maxAllowed} selected
        </motion.span>
      </div>

      {selectedCount < minRequired && (
        <p className="text-xs text-gray-500">Select at least {minRequired} interests</p>
      )}

      {/* Interests Grid */}
      <div className="flex flex-wrap gap-2 max-h-[350px] overflow-y-auto p-1">
        {INTERESTS_DATA.map((interest, index) => {
          const isSelected = data.interests?.includes(interest.label);
          const isDisabled = !isSelected && selectedCount >= maxAllowed;
          
          return (
            <motion.button
              key={interest.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
              whileHover={{ scale: isDisabled ? 1 : 1.05 }}
              whileTap={{ scale: isDisabled ? 1 : 0.95 }}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggleInterest(interest.label)}
              className={`px-4 py-2.5 rounded-full flex items-center gap-2 transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                  : isDisabled
                    ? 'bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed'
                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-pink-500/50'
              }`}
            >
              <span>{interest.emoji}</span>
              <span className="text-sm font-medium">{interest.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Selected interests summary */}
      {selectedCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 
                   border border-pink-500/20"
        >
          <p className="text-xs text-gray-400 mb-2">Your vibe:</p>
          <div className="flex flex-wrap gap-1">
            {data.interests?.map((interest) => {
              const interestData = INTERESTS_DATA.find(i => i.label === interest);
              return (
                <motion.span 
                  key={interest} 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-xl"
                >
                  {interestData?.emoji}
                </motion.span>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
