"use client";

import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "./index";

interface Stage6Props {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: string) => void;
}

const HEIGHT_OPTIONS = [
  "4'10\"", "4'11\"",
  "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"",
  "6'0\"", "6'1\"", "6'2\"", "6'3\"", "6'4\"", "6'5\"", "6'6\"+"
] as const;

const DRINKING_OPTIONS = [
  { value: 'never', label: 'Never', emoji: '🚫' },
  { value: 'socially', label: 'Socially', emoji: '🍻' },
  { value: 'often', label: 'Often', emoji: '🍷' },
  { value: 'prefer_not_to_say', label: 'Skip', emoji: '🤐' },
] as const;

const SMOKING_OPTIONS = [
  { value: 'never', label: 'Never', emoji: '🚭' },
  { value: 'sometimes', label: 'Sometimes', emoji: '💨' },
  { value: 'often', label: 'Often', emoji: '🚬' },
  { value: 'prefer_not_to_say', label: 'Skip', emoji: '🤐' },
] as const;

const RELIGION_OPTIONS = [
  { value: 'christian', label: 'Christian', emoji: '✝️' },
  { value: 'muslim', label: 'Muslim', emoji: '☪️' },
  { value: 'hindu', label: 'Hindu', emoji: '🕉️' },
  { value: 'buddhist', label: 'Buddhist', emoji: '☸️' },
  { value: 'atheist', label: 'Atheist', emoji: '🔬' },
  { value: 'spiritual', label: 'Spiritual', emoji: '✨' },
  { value: 'other', label: 'Other', emoji: '🌍' },
  { value: 'prefer_not_to_say', label: 'Skip', emoji: '🤐' },
] as const;

export function Stage6Lifestyle({ data, onUpdate }: Stage6Props) {
  return (
    <div className="space-y-6">
      {/* Height */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <Label className="text-gray-300 flex items-center gap-2">
          <span>📏</span> Height <span className="text-gray-500 text-xs">(optional)</span>
        </Label>
        <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-1">
          {HEIGHT_OPTIONS.map((height, index) => (
            <motion.button
              key={height}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onUpdate('height', data.height === height ? '' : height)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                data.height === height
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              {height}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Drinking */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <Label className="text-gray-300 flex items-center gap-2">
          <span>🍸</span> Do you drink?
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {DRINKING_OPTIONS.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onUpdate('drinkingPreference', option.value)}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                data.drinkingPreference === option.value
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{option.emoji}</span>
              <span className="text-xs">{option.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Smoking */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <Label className="text-gray-300 flex items-center gap-2">
          <span>🚬</span> Do you smoke?
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {SMOKING_OPTIONS.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onUpdate('smoking', option.value)}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                data.smoking === option.value
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{option.emoji}</span>
              <span className="text-xs">{option.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Religion */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <Label className="text-gray-300 flex items-center gap-2">
          <span>🙏</span> Faith <span className="text-gray-500 text-xs">(optional)</span>
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {RELIGION_OPTIONS.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onUpdate('religion', option.value)}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                data.religion === option.value
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{option.emoji}</span>
              <span className="text-xs">{option.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
