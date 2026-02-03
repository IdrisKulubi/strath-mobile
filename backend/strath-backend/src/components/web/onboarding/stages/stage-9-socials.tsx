"use client";

import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OnboardingData } from "./index";

interface Stage9Props {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: string) => void;
}

const socialInputs = [
  {
    key: "phoneNumber" as const,
    label: "Phone Number",
    placeholder: "+254 7XX XXX XXX",
    emoji: "📱",
    description: "For verified matches to contact you",
    prefix: "",
    type: "tel",
  },
  {
    key: "instagram" as const,
    label: "Instagram",
    placeholder: "username",
    emoji: "📸",
    description: "Let matches slide into your DMs",
    prefix: "@",
    type: "text",
  },
  {
    key: "snapchat" as const,
    label: "Snapchat",
    placeholder: "username",
    emoji: "👻",
    description: "Share your snaps",
    prefix: "",
    type: "text",
  },
  {
    key: "spotify" as const,
    label: "Spotify",
    placeholder: "username or profile link",
    emoji: "🎵",
    description: "Show off your music taste",
    prefix: "",
    type: "text",
  },
];

export function Stage9Socials({ data, onUpdate }: Stage9Props) {
  return (
    <div className="space-y-6">
      {/* Bio */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <Label className="text-gray-300 flex items-center gap-2">
          <span className="text-xl">✍️</span>
          <span>Bio</span>
        </Label>
        <Textarea
          value={data.bio}
          onChange={(e) => onUpdate('bio', e.target.value)}
          placeholder="Tell people about yourself... What makes you unique?"
          maxLength={500}
          className="bg-white/5 border-white/10 text-white min-h-[100px] resize-none 
                   focus:border-pink-500/50 placeholder:text-gray-500"
        />
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Make it personal and fun!</span>
          <span className="text-gray-500">{data.bio.length}/500</span>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-gray-500 text-sm">Connect your socials</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Social Inputs */}
      <div className="space-y-4">
        {socialInputs.map((input, index) => (
          <motion.div
            key={input.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-1"
          >
            <Label className="text-gray-300 flex items-center gap-2 text-sm">
              <span className="text-lg">{input.emoji}</span>
              <span>{input.label}</span>
            </Label>
            <div className="relative">
              {input.prefix && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {input.prefix}
                </span>
              )}
              <Input
                type={input.type}
                value={data[input.key] || ''}
                onChange={(e) => onUpdate(input.key, e.target.value)}
                placeholder={input.placeholder}
                className={`bg-white/5 border-white/10 text-white h-12 
                         focus:border-pink-500/50 ${input.prefix ? 'pl-8' : ''}`}
              />
            </div>
            <p className="text-gray-500 text-xs">{input.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Privacy note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="p-4 rounded-xl bg-white/5 border border-white/10"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-white text-sm font-medium">Your privacy matters</p>
            <p className="text-gray-400 text-xs mt-1">
              Your socials are only shared with people you match with. 
              You can hide any of these from your profile settings.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
