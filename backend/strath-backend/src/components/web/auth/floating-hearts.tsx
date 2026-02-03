"use client";

import { useEffect, useState } from "react";

interface Heart {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
  duration: number;
  delay: number;
  type: "heart" | "sparkle" | "ring" | "star";
}

const HeartSVG = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const SparkleSVG = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
  </svg>
);

const RingSVG = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <circle cx="12" cy="12" r="8" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeLinecap="round" />
  </svg>
);

const FloatingElement = ({ heart }: { heart: Heart }) => {
  const getElement = () => {
    switch (heart.type) {
      case "sparkle":
        return <SparkleSVG size={heart.size} className="text-yellow-400/60" />;
      case "ring":
        return <RingSVG size={heart.size} className="text-purple-400/40" />;
      case "star":
        return <SparkleSVG size={heart.size * 0.8} className="text-pink-300/50" />;
      default:
        return <HeartSVG size={heart.size} className="text-pink-500/40" />;
    }
  };

  return (
    <div
      className="absolute animate-float pointer-events-none"
      style={{
        left: `${heart.x}%`,
        top: `${heart.y}%`,
        opacity: heart.opacity,
        transform: `rotate(${heart.rotation}deg) perspective(500px) rotateY(${heart.rotation}deg)`,
        animationDuration: `${heart.duration}s`,
        animationDelay: `${heart.delay}s`,
      }}
    >
      {getElement()}
    </div>
  );
};

export function FloatingHearts() {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    // Generate random hearts on mount
    const types: Heart["type"][] = ["heart", "heart", "heart", "sparkle", "ring", "star"];
    const newHearts: Heart[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 30 + 15,
      opacity: Math.random() * 0.4 + 0.1,
      rotation: Math.random() * 360,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
      type: types[Math.floor(Math.random() * types.length)],
    }));
    setHearts(newHearts);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      
      {/* Large floating 3D hearts in background */}
      <div className="absolute top-[10%] left-[5%] animate-float-slow opacity-20">
        <div className="transform-3d rotate-y-15">
          <HeartSVG size={80} className="text-pink-400 drop-shadow-2xl" />
        </div>
      </div>
      <div className="absolute bottom-[15%] right-[8%] animate-float-slower opacity-15">
        <div className="transform-3d rotate-y-neg-20">
          <HeartSVG size={100} className="text-rose-400 drop-shadow-2xl" />
        </div>
      </div>
      <div className="absolute top-[60%] left-[10%] animate-float opacity-10">
        <div className="transform-3d rotate-y-25">
          <HeartSVG size={60} className="text-purple-400 drop-shadow-2xl" />
        </div>
      </div>
      <div className="absolute top-[20%] right-[15%] animate-float-slow opacity-15" style={{ animationDelay: "3s" }}>
        <div className="transform-3d rotate-y-neg-10">
          <HeartSVG size={70} className="text-pink-300 drop-shadow-2xl" />
        </div>
      </div>

      {/* Smaller floating elements */}
      {hearts.map((heart) => (
        <FloatingElement key={heart.id} heart={heart} />
      ))}

      {/* Sparkle particles */}
      <div className="absolute top-[30%] right-[25%] animate-sparkle">
        <div className="w-2 h-2 bg-yellow-300 rounded-full blur-[1px]" />
      </div>
      <div className="absolute top-[70%] left-[30%] animate-sparkle" style={{ animationDelay: "0.5s" }}>
        <div className="w-1.5 h-1.5 bg-pink-300 rounded-full blur-[1px]" />
      </div>
      <div className="absolute top-[45%] right-[40%] animate-sparkle" style={{ animationDelay: "1s" }}>
        <div className="w-2 h-2 bg-white rounded-full blur-[1px]" />
      </div>
      <div className="absolute bottom-[30%] left-[45%] animate-sparkle" style={{ animationDelay: "1.5s" }}>
        <div className="w-1 h-1 bg-purple-300 rounded-full blur-[1px]" />
      </div>

      {/* Floating rings */}
      <div className="absolute top-[40%] left-[20%] animate-spin-slow opacity-20">
        <RingSVG size={40} className="text-pink-400" />
      </div>
      <div className="absolute bottom-[40%] right-[20%] animate-spin-slower opacity-15">
        <RingSVG size={50} className="text-purple-400" />
      </div>
    </div>
  );
}
