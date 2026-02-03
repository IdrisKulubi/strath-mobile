"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OnboardingData } from "./index";

interface Stage3Props {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: string | number | null) => void;
}

const COURSES = [
  "Computer Science",
  "Business Administration",
  "BBIT",
    "International Relations",

  "Engineering",
  "Medicine",
  "Nursing",
  "Commerce",
  "Law",
  "Tourism & Hospitality",
  "Accounting",
  "Finance",
  "Marketing",
  "Economics",
  "Data Science",
  "Telecommunications",
  "Communications",
  "Journalism",
  "Other"
] as const;

const YEAR_OPTIONS = [
  { value: 1, label: '1st Year', emoji: '🌱' },
  { value: 2, label: '2nd Year', emoji: '🌿' },
  { value: 3, label: '3rd Year', emoji: '🌳' },
  { value: 4, label: '4th Year', emoji: '🎓' },
  { value: 5, label: 'Postgrad', emoji: '🎯' },
] as const;

const UNIVERSITIES = [
  // Strathmore first as requested
  "Strathmore University",
  // Other Nairobi Universities
  "University of Nairobi",
  "Kenyatta University",
  "JKUAT - Jomo Kenyatta University",
  "USIU - Africa",
  "Catholic University of Eastern Africa",
  "Daystar University",
  "KCA University",
  "Multimedia University of Kenya",
  "Technical University of Kenya",
  "Zetech University",
  "Africa Nazarene University",
  "Pan Africa Christian University",
  "Riara University",
  "Mount Kenya University - Nairobi",
  "Kenya Methodist University - Nairobi",
  // Other Major Kenyan Universities
  "Moi University",
  "Egerton University",
  "Maseno University",
  "Dedan Kimathi University",
  "Machakos University",
  "Karatina University",
  "Laikipia University",
  "Masinde Muliro University",
  "Chuka University",
  "Kirinyaga University",
  "Murang'a University",
  "Pwani University",
  "Kisii University",
  "Jaramogi Oginga Odinga University",
  "Rongo University",
  "University of Eldoret",
  "University of Kabianga",
  "South Eastern Kenya University",
  "Taita Taveta University",
  "Turkana University College",
  "Garissa University",
  "Tharaka University",
  "Cooperative University of Kenya",
  "Other"
] as const;

export function Stage3Academic({ data, onUpdate }: Stage3Props) {
  return (
    <div className="space-y-6">
      {/* University Selection */}
      <div className="space-y-2">
        <Label className="text-gray-300">Which university do you attend?</Label>
        <Select 
          value={data.university || ""} 
          onValueChange={(v) => onUpdate('university', v)}
        >
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
            <SelectValue placeholder="Select your university" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10 max-h-[300px]">
            {UNIVERSITIES.map((uni) => (
              <SelectItem 
                key={uni} 
                value={uni} 
                className="text-white hover:bg-white/10"
              >
                {uni}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Course Selection */}
      <div className="space-y-2">
        <Label className="text-gray-300">What&apos;s your course?</Label>
        <Select 
          value={data.course} 
          onValueChange={(v) => onUpdate('course', v)}
        >
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
            <SelectValue placeholder="Select your course" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10 max-h-[300px]">
            {COURSES.map((course) => (
              <SelectItem 
                key={course} 
                value={course} 
                className="text-white hover:bg-white/10"
              >
                {course}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year of Study */}
      <div className="space-y-3">
        <Label className="text-gray-300">What year are you in?</Label>
        <div className="grid grid-cols-5 gap-2">
          {YEAR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onUpdate('yearOfStudy', option.value)}
              className={`py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                data.yearOfStudy === option.value
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <span className="text-xl">{option.emoji}</span>
              <span className="text-xs font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
