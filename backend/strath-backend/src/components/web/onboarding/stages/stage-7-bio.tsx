"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { OnboardingData } from "./index";

interface Stage7Props {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: string) => void;
}

export function Stage7Bio({ data, onUpdate }: Stage7Props) {
  return (
    <div className="space-y-6">
      {/* Bio */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-gray-300">About you</Label>
          <span className="text-xs text-gray-500">{data.bio?.length || 0}/500</span>
        </div>
        <Textarea
          value={data.bio}
          onChange={(e) => onUpdate('bio', e.target.value)}
          placeholder="Tell people about yourself... What makes you unique? What are you passionate about?"
          className="bg-white/5 border-white/10 text-white min-h-[140px] resize-none"
          maxLength={500}
        />
        <div className="flex flex-wrap gap-2">
          {['🎯 Goals', '💭 Dreams', '🎪 Fun facts', '🌟 Passions'].map((hint) => (
            <span key={hint} className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
              {hint}
            </span>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <Label className="text-gray-300">Connect your socials <span className="text-gray-500 text-xs">(optional)</span></Label>
        
        <div className="space-y-3">
          {/* Instagram */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-2xl">📸</span>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Instagram</p>
              <Input
                value={data.instagram}
                onChange={(e) => onUpdate('instagram', e.target.value)}
                placeholder="@username"
                className="bg-transparent border-0 p-0 h-auto text-gray-400 text-sm focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Spotify */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-2xl">🎵</span>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Spotify</p>
              <Input
                value={data.spotify}
                onChange={(e) => onUpdate('spotify', e.target.value)}
                placeholder="Share your vibe"
                className="bg-transparent border-0 p-0 h-auto text-gray-400 text-sm focus-visible:ring-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Profile Preview Hint */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✨</span>
          <div>
            <p className="text-white text-sm font-medium">Almost there!</p>
            <p className="text-gray-400 text-xs mt-1">
              Complete your profile and start discovering people on campus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
