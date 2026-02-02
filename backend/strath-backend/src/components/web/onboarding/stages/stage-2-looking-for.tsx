"use client";

import { Label } from "@/components/ui/label";
import { OnboardingData } from "./index";

interface Stage2Props {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: string | string[]) => void;
}

const INTERESTED_IN_OPTIONS = [
  { value: 'male', label: 'Men', emoji: '👨' },
  { value: 'female', label: 'Women', emoji: '👩' },
  { value: 'other', label: 'Everyone', emoji: '🌈' },
] as const;

const LOOKING_FOR_OPTIONS = [
  { value: 'relationship', label: 'Relationship', emoji: '💕', desc: 'Something serious' },
  { value: 'casual', label: 'Casual', emoji: '✨', desc: 'Keep it light' },
  { value: 'friends', label: 'Friends', emoji: '🤝', desc: 'Just vibes' },
  { value: 'notSure', label: 'Not Sure', emoji: '🤷', desc: 'See what happens' },
] as const;

export function Stage2LookingFor({ data, onUpdate }: Stage2Props) {
  const toggleInterestedIn = (value: string) => {
    const current = data.interestedIn || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onUpdate('interestedIn', updated);
  };

  return (
    <div className="space-y-8">
      {/* Interested In - Multi-select */}
      <div className="space-y-3">
        <Label className="text-gray-300">I&apos;m interested in</Label>
        <p className="text-sm text-gray-500">Select all that apply</p>
        <div className="grid grid-cols-3 gap-3">
          {INTERESTED_IN_OPTIONS.map((option) => {
            const isSelected = data.interestedIn?.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleInterestedIn(option.value)}
                className={`h-16 rounded-xl flex flex-col items-center justify-center gap-1 text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                <span className="text-xl">{option.emoji}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Looking For - Single select */}
      <div className="space-y-3">
        <Label className="text-gray-300">I&apos;m looking for</Label>
        <div className="grid grid-cols-2 gap-3">
          {LOOKING_FOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onUpdate('lookingFor', option.value)}
              className={`p-4 rounded-xl flex flex-col items-start gap-1 text-left transition-all ${
                data.lookingFor === option.value
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{option.emoji}</span>
                <span className="font-medium">{option.label}</span>
              </div>
              <span className={`text-xs ${data.lookingFor === option.value ? 'text-white/80' : 'text-gray-500'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
