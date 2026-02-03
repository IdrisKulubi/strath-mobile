"use client";

import { useState, useCallback } from "react";
import { SwipeableQuestions } from "../components/swipeable-questions";
import { OnboardingData } from "./index";

interface Stage5Props {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: string) => void;
  onComplete?: () => void;
}

const PERSONALITY_QUESTIONS = [
  {
    id: "loveLanguage",
    question: "How do you show love?",
    optionA: { value: "words", label: "Words", emoji: "💬" },
    optionB: { value: "actions", label: "Actions", emoji: "🎁" },
  },
  {
    id: "communicationStyle",
    question: "When there's a problem...",
    optionA: { value: "talk_it_out", label: "Talk it out", emoji: "🗣️" },
    optionB: { value: "need_space", label: "Need space", emoji: "🧘" },
  },
  {
    id: "sleepingHabits",
    question: "Are you a...",
    optionA: { value: "early_bird", label: "Early bird", emoji: "🌅" },
    optionB: { value: "night_owl", label: "Night owl", emoji: "🦉" },
  },
  {
    id: "socialMediaUsage",
    question: "Social media for you is...",
    optionA: { value: "always_on", label: "Always on", emoji: "📱" },
    optionB: { value: "digital_detox", label: "Minimal", emoji: "🌿" },
  },
  {
    id: "workoutFrequency",
    question: "Your relationship with the gym...",
    optionA: { value: "gym_rat", label: "Gym rat", emoji: "💪" },
    optionB: { value: "couch_potato", label: "Couch crew", emoji: "🛋️" },
  },
];

export function Stage5Personality({ data, onUpdate, onComplete }: Stage5Props) {
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({
    loveLanguage: data.loveLanguage || "",
    communicationStyle: data.communicationStyle || "",
    sleepingHabits: data.sleepingHabits || "",
    socialMediaUsage: data.socialMediaUsage || "",
    workoutFrequency: data.workoutFrequency || "",
  });

  const handleAnswer = useCallback((questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    onUpdate(questionId as keyof OnboardingData, value);
  }, [onUpdate]);

  const handleComplete = useCallback(() => {
    setCompleted(true);
    onComplete?.();
  }, [onComplete]);

  const handleRedo = useCallback(() => {
    // Clear all answers
    const emptyAnswers = {
      loveLanguage: "",
      communicationStyle: "",
      sleepingHabits: "",
      socialMediaUsage: "",
      workoutFrequency: "",
    };
    setAnswers(emptyAnswers);
    // Update parent state
    Object.keys(emptyAnswers).forEach(key => {
      onUpdate(key as keyof OnboardingData, "");
    });
    setCompleted(false);
  }, [onUpdate]);

  // Check if all questions have been answered already (returning user)
  const allAnswered = Object.values(answers).every(v => v !== "");

  if (completed || allAnswered) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <span className="text-5xl">🎉</span>
          <h3 className="text-white text-xl font-bold mt-3">Your Vibe Check</h3>
          <p className="text-gray-400 text-sm mt-1">Here&apos;s what you picked</p>
        </div>
        
        <div className="space-y-3">
          {PERSONALITY_QUESTIONS.map(q => {
            const answer = answers[q.id];
            const option = answer === q.optionA.value ? q.optionA : q.optionB;
            
            return (
              <div 
                key={q.id}
                className="flex items-center justify-between p-4 rounded-xl 
                         bg-white/5 border border-white/10"
              >
                <span className="text-gray-300 text-sm">{q.question}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{option.emoji}</span>
                  <span className="text-white font-medium text-sm">{option.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleRedo}
          className="w-full py-3 text-pink-400 hover:text-pink-300 text-sm transition-colors font-medium"
        >
          🔄 Redo answers
        </button>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mb-4">
      <SwipeableQuestions
        questions={PERSONALITY_QUESTIONS}
        answers={answers}
        onAnswer={handleAnswer}
        onComplete={handleComplete}
      />
    </div>
  );
}
