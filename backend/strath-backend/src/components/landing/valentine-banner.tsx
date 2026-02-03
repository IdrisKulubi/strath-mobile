"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function ValentineBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 text-white py-2.5 px-4 text-center overflow-hidden">
      {/* Animated background hearts */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <span
            key={i}
            className="absolute text-white/20 animate-float-slow"
            style={{
              left: `${15 + i * 15}%`,
              fontSize: `${12 + (i % 3) * 4}px`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            💕
          </span>
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center gap-2 text-sm md:text-base font-medium">
        <span className="animate-pulse">💘</span>
        <span>Valentine&apos;s Special — Find your match before Feb 14!</span>
        <span className="animate-pulse">💘</span>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-full transition-colors"
        aria-label="Close banner"
      >
        <X size={16} />
      </button>
    </div>
  );
}
