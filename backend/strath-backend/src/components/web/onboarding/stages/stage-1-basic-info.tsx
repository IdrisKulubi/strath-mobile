"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "./index";

interface Stage1Props {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: string | number | null) => void;
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Man', emoji: '👨' },
  { value: 'female', label: 'Woman', emoji: '👩' },
  { value: 'other', label: 'Other', emoji: '🌈' },
] as const;

// Calculate zodiac sign from birthday
const getZodiacSign = (month: number, day: number): string => {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries ♈';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus ♉';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini ♊';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer ♋';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo ♌';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo ♍';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra ♎';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio ♏';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius ♐';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn ♑';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius ♒';
  return 'Pisces ♓';
};

const calculateAge = (birthday: string): number => {
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export function Stage1BasicInfo({ data, onUpdate }: Stage1Props) {
  const handleDateChange = (dateStr: string) => {
    onUpdate('dateOfBirth', dateStr);
    
    if (dateStr) {
      const date = new Date(dateStr);
      const age = calculateAge(dateStr);
      const zodiac = getZodiacSign(date.getMonth() + 1, date.getDate());
      
      // Update age (as number) and zodiac
      onUpdate('age', age);
      onUpdate('zodiacSign', zodiac);
    }
  };

  return (
    <div className="space-y-6">
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-300">First Name</Label>
          <Input
            value={data.firstName}
            onChange={(e) => onUpdate('firstName', e.target.value)}
            className="bg-white/5 border-white/10 text-white h-12"
            placeholder="John"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-300">Last Name</Label>
          <Input
            value={data.lastName}
            onChange={(e) => onUpdate('lastName', e.target.value)}
            className="bg-white/5 border-white/10 text-white h-12"
            placeholder="Doe"
          />
        </div>
      </div>

      {/* Birthday */}
      <div className="space-y-2">
        <Label className="text-gray-300">Birthday</Label>
        <Input
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => handleDateChange(e.target.value)}
          className="bg-white/5 border-white/10 text-white h-12"
          max={new Date(new Date().setFullYear(new Date().getFullYear() - 17)).toISOString().split('T')[0]}
        />
        {data.zodiacSign && (
          <p className="text-sm text-pink-400 mt-1">
            {data.zodiacSign} • {data.age} years old
          </p>
        )}
      </div>

      {/* Gender */}
      <div className="space-y-3">
        <Label className="text-gray-300">I am a</Label>
        <div className="grid grid-cols-3 gap-3">
          {GENDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onUpdate('gender', option.value)}
              className={`h-14 rounded-xl flex items-center justify-center gap-2 text-base font-medium transition-all ${
                data.gender === option.value
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <span>{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
