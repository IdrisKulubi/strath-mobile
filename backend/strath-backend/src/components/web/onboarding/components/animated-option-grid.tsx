"use client";

import { motion } from "framer-motion";

interface AnimatedOptionGridProps {
  options: {
    value: string;
    label: string;
    emoji: string;
    description?: string;
  }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  columns?: 2 | 3;
  allowMultiple?: boolean;
  selectedValues?: string[];
  onToggle?: (value: string) => void;
}

export function AnimatedOptionGrid({
  options,
  selectedValue,
  onSelect,
  columns = 2,
  allowMultiple = false,
  selectedValues = [],
  onToggle,
}: AnimatedOptionGridProps) {
  const gridCols = columns === 3 ? "grid-cols-3" : "grid-cols-2";

  const isSelected = (value: string) => {
    if (allowMultiple) {
      return selectedValues.includes(value);
    }
    return selectedValue === value;
  };

  const handleClick = (value: string) => {
    if (allowMultiple && onToggle) {
      onToggle(value);
    } else {
      onSelect(value);
    }
  };

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {options.map((option, index) => (
        <motion.button
          key={option.value}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleClick(option.value)}
          className={`relative p-4 rounded-2xl border-2 transition-all duration-200 
                     text-left overflow-hidden group ${
            isSelected(option.value)
              ? "border-pink-500 bg-pink-500/10"
              : "border-white/10 bg-white/5 hover:border-white/30"
          }`}
        >
          {/* Selected indicator */}
          {isSelected(option.value) && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-pink-500 
                       flex items-center justify-center"
            >
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </motion.div>
          )}

          {/* Content */}
          <span className="text-2xl block mb-2">{option.emoji}</span>
          <span className={`font-medium block ${
            isSelected(option.value) ? "text-white" : "text-gray-200"
          }`}>
            {option.label}
          </span>
          {option.description && (
            <span className="text-gray-400 text-xs mt-1 block">
              {option.description}
            </span>
          )}

          {/* Hover glow effect */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity 
                         pointer-events-none ${
            isSelected(option.value) 
              ? "bg-gradient-to-br from-pink-500/5 to-transparent" 
              : "bg-gradient-to-br from-white/5 to-transparent"
          }`} />
        </motion.button>
      ))}
    </div>
  );
}
