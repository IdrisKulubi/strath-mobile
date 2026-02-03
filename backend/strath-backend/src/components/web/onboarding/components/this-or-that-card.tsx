"use client";

import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface ThisOrThatOption {
  value: string;
  label: string;
  emoji: string;
  color: string;
}

interface ThisOrThatCardProps {
  question: string;
  optionA: ThisOrThatOption;
  optionB: ThisOrThatOption;
  onSelect: (value: string) => void;
  selectedValue?: string;
}

export function ThisOrThatCard({
  question,
  optionA,
  optionB,
  onSelect,
  selectedValue,
}: ThisOrThatCardProps) {
  const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 50) {
      setDragDirection("right");
    } else if (info.offset.x < -50) {
      setDragDirection("left");
    } else {
      setDragDirection(null);
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      setIsExiting(true);
      const selected = info.offset.x > 0 ? optionB.value : optionA.value;
      setTimeout(() => {
        onSelect(selected);
        setIsExiting(false);
        setDragDirection(null);
      }, 200);
    } else {
      setDragDirection(null);
    }
  };

  const handleOptionClick = (option: ThisOrThatOption, direction: "left" | "right") => {
    setDragDirection(direction);
    setIsExiting(true);
    setTimeout(() => {
      onSelect(option.value);
      setIsExiting(false);
      setDragDirection(null);
    }, 300);
  };

  return (
    <div className="relative w-full py-4">
      {/* Question */}
      <motion.p 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-gray-400 text-sm mb-6"
      >
        {question}
      </motion.p>

      {/* Card Container */}
      <div className="relative h-[200px] flex items-center justify-center">
        {/* Option Labels */}
        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none z-0">
          <motion.div
            animate={{
              scale: dragDirection === "left" ? 1.1 : 1,
              opacity: dragDirection === "left" ? 1 : 0.5,
            }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-4xl">{optionA.emoji}</span>
            <span className="text-white font-medium text-sm">{optionA.label}</span>
          </motion.div>
          
          <motion.div
            animate={{
              scale: dragDirection === "right" ? 1.1 : 1,
              opacity: dragDirection === "right" ? 1 : 0.5,
            }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-4xl">{optionB.emoji}</span>
            <span className="text-white font-medium text-sm">{optionB.label}</span>
          </motion.div>
        </div>

        {/* Draggable Card */}
        <AnimatePresence mode="wait">
          {!selectedValue && (
            <motion.div
              key="card"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: isExiting ? 0.8 : 1, 
                opacity: isExiting ? 0 : 1,
                x: isExiting ? (dragDirection === "left" ? -200 : 200) : 0,
                rotate: isExiting ? (dragDirection === "left" ? -20 : 20) : 0,
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="absolute cursor-grab active:cursor-grabbing z-10"
            >
              <div 
                className="w-32 h-32 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 
                           border-2 border-white/20 backdrop-blur-sm flex items-center justify-center
                           shadow-xl shadow-pink-500/10"
              >
                <div className="text-center">
                  <span className="text-3xl">👆</span>
                  <p className="text-white/60 text-xs mt-2">Swipe to pick</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selection Buttons (fallback) */}
        {!selectedValue && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-8">
            <button
              onClick={() => handleOptionClick(optionA, "left")}
              className="w-12 h-12 rounded-full bg-white/10 border border-white/20 
                       flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="text-xl">{optionA.emoji}</span>
            </button>
            <button
              onClick={() => handleOptionClick(optionB, "right")}
              className="w-12 h-12 rounded-full bg-white/10 border border-white/20 
                       flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="text-xl">{optionB.emoji}</span>
            </button>
          </div>
        )}

        {/* Selected State */}
        {selectedValue && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <span className="text-6xl">
              {selectedValue === optionA.value ? optionA.emoji : optionB.emoji}
            </span>
            <span className="text-white font-semibold">
              {selectedValue === optionA.value ? optionA.label : optionB.label}
            </span>
            <button 
              onClick={() => onSelect("")}
              className="text-gray-400 text-sm hover:text-white transition-colors"
            >
              Change
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
