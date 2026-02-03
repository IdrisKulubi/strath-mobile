"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SwipeableQuestionProps {
  questions: {
    id: string;
    question: string;
    optionA: { value: string; label: string; emoji: string };
    optionB: { value: string; label: string; emoji: string };
  }[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, value: string) => void;
  onComplete: () => void;
}

export function SwipeableQuestions({
  questions,
  answers,
  onAnswer,
  onComplete,
}: SwipeableQuestionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  useEffect(() => {
    if (currentIndex >= questions.length) {
      onComplete();
    }
  }, [currentIndex, questions.length, onComplete]);

  const handleSwipe = (selectedDirection: "left" | "right") => {
    if (isAnimating || !currentQuestion) return;
    
    setIsAnimating(true);
    setDirection(selectedDirection);
    
    const selectedValue = selectedDirection === "left" 
      ? currentQuestion.optionA.value 
      : currentQuestion.optionB.value;
    
    onAnswer(currentQuestion.id, selectedValue);
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setDirection(null);
      setIsAnimating(false);
    }, 300);
  };

  if (currentIndex >= questions.length) {
    return (
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <span className="text-6xl mb-4">🎉</span>
        <h3 className="text-white text-xl font-bold">All Done!</h3>
        <p className="text-gray-400 mt-2">Great choices!</p>
      </motion.div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-6">
        {questions.map((_, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              scale: i === currentIndex ? 1.2 : 1,
              backgroundColor: i < currentIndex 
                ? "#ec4899" 
                : i === currentIndex 
                  ? "#f43f5e" 
                  : "rgba(255,255,255,0.2)",
            }}
            className="w-2 h-2 rounded-full"
          />
        ))}
      </div>

      {/* Question Counter */}
      <div className="text-center mb-4">
        <span className="text-pink-400 text-sm font-medium">
          {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Cards Stack */}
      <div className="relative h-[320px] flex items-center justify-center perspective-1000">
        {/* Background cards */}
        {questions.slice(currentIndex + 1, currentIndex + 3).map((q, i) => (
          <motion.div
            key={q.id}
            initial={false}
            animate={{
              scale: 1 - (i + 1) * 0.05,
              y: (i + 1) * 8,
              opacity: 1 - (i + 1) * 0.3,
            }}
            className="absolute w-full max-w-[280px] h-[280px] rounded-3xl bg-[#1a1a2e] border border-white/10"
          />
        ))}

        {/* Current Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              x: direction === "left" ? -300 : direction === "right" ? 300 : 0,
              rotate: direction === "left" ? -20 : direction === "right" ? 20 : 0,
            }}
            exit={{ 
              scale: 0.8, 
              opacity: 0,
            }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100) handleSwipe("right");
              else if (info.offset.x < -100) handleSwipe("left");
            }}
            className="absolute w-full max-w-[280px] cursor-grab active:cursor-grabbing"
          >
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2a2a4e] border border-white/20 
                          rounded-3xl p-6 shadow-2xl shadow-pink-500/10">
              {/* Question */}
              <div className="text-center mb-8">
                <h3 className="text-white text-lg font-semibold leading-relaxed">
                  {currentQuestion.question}
                </h3>
              </div>

              {/* VS Divider */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
                <span className="text-pink-400 font-bold text-sm">VS</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
              </div>

              {/* Options */}
              <div className="flex justify-between px-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSwipe("left")}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl 
                           bg-white/5 border border-white/10 hover:border-pink-500/50 
                           transition-colors min-w-[100px]"
                >
                  <span className="text-3xl">{currentQuestion.optionA.emoji}</span>
                  <span className="text-white text-sm font-medium">
                    {currentQuestion.optionA.label}
                  </span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSwipe("right")}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl 
                           bg-white/5 border border-white/10 hover:border-pink-500/50 
                           transition-colors min-w-[100px]"
                >
                  <span className="text-3xl">{currentQuestion.optionB.emoji}</span>
                  <span className="text-white text-sm font-medium">
                    {currentQuestion.optionB.label}
                  </span>
                </motion.button>
              </div>

              {/* Swipe hint */}
              <p className="text-center text-gray-500 text-xs mt-6">
                Swipe or tap to choose
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Direction indicators */}
      <div className="flex justify-between px-8 mt-4">
        <motion.div
          animate={{ 
            opacity: direction === "left" ? 1 : 0.3,
            scale: direction === "left" ? 1.1 : 1,
          }}
          className="flex items-center gap-2 text-gray-400"
        >
          <span>←</span>
          <span className="text-sm">{currentQuestion.optionA.label}</span>
        </motion.div>
        <motion.div
          animate={{ 
            opacity: direction === "right" ? 1 : 0.3,
            scale: direction === "right" ? 1.1 : 1,
          }}
          className="flex items-center gap-2 text-gray-400"
        >
          <span className="text-sm">{currentQuestion.optionB.label}</span>
          <span>→</span>
        </motion.div>
      </div>
    </div>
  );
}
