"use client";

import { useEffect, useRef } from "react";

interface Heart {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  delay: number;
  rotation: number;
  type: "heart" | "sparkle" | "star";
}

// Pre-generated hearts for SSR consistency
const HEARTS: Heart[] = [
  { id: 0, x: 5, y: 10, size: 24, opacity: 0.15, speed: 20, delay: 0, rotation: 15, type: "heart" },
  { id: 1, x: 15, y: 30, size: 18, opacity: 0.1, speed: 25, delay: 2, rotation: -10, type: "sparkle" },
  { id: 2, x: 25, y: 50, size: 32, opacity: 0.12, speed: 18, delay: 1, rotation: 20, type: "heart" },
  { id: 3, x: 35, y: 20, size: 14, opacity: 0.08, speed: 22, delay: 3, rotation: -5, type: "star" },
  { id: 4, x: 45, y: 70, size: 28, opacity: 0.15, speed: 24, delay: 0.5, rotation: 10, type: "heart" },
  { id: 5, x: 55, y: 40, size: 20, opacity: 0.1, speed: 19, delay: 2.5, rotation: -15, type: "sparkle" },
  { id: 6, x: 65, y: 60, size: 26, opacity: 0.12, speed: 21, delay: 1.5, rotation: 25, type: "heart" },
  { id: 7, x: 75, y: 15, size: 16, opacity: 0.08, speed: 23, delay: 3.5, rotation: -20, type: "star" },
  { id: 8, x: 85, y: 45, size: 22, opacity: 0.14, speed: 17, delay: 0.8, rotation: 5, type: "heart" },
  { id: 9, x: 95, y: 75, size: 30, opacity: 0.1, speed: 26, delay: 2.2, rotation: -8, type: "sparkle" },
  { id: 10, x: 10, y: 85, size: 20, opacity: 0.12, speed: 20, delay: 1.2, rotation: 12, type: "heart" },
  { id: 11, x: 30, y: 5, size: 18, opacity: 0.09, speed: 24, delay: 3.2, rotation: -18, type: "star" },
  { id: 12, x: 50, y: 90, size: 24, opacity: 0.13, speed: 19, delay: 0.3, rotation: 22, type: "heart" },
  { id: 13, x: 70, y: 35, size: 16, opacity: 0.11, speed: 22, delay: 2.8, rotation: -12, type: "sparkle" },
  { id: 14, x: 90, y: 55, size: 28, opacity: 0.14, speed: 18, delay: 1.8, rotation: 8, type: "heart" },
  { id: 15, x: 20, y: 65, size: 22, opacity: 0.1, speed: 25, delay: 0.6, rotation: -25, type: "star" },
];

const HeartIcon = ({ size, className }: { size: number; className?: string }) => (
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

const SparkleIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2L13.09 8.26L19 7L14.74 11.26L21 12L14.74 12.74L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.74L3 12L9.26 11.26L5 7L10.91 8.26L12 2Z" />
  </svg>
);

const StarIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);

export function FloatingHearts() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add mouse parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const hearts = containerRef.current.querySelectorAll(".floating-heart");
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      hearts.forEach((heart, index) => {
        const depth = (index % 3) + 1;
        const moveX = ((clientX - innerWidth / 2) / innerWidth) * 20 * depth;
        const moveY = ((clientY - innerHeight / 2) / innerHeight) * 20 * depth;
        (heart as HTMLElement).style.transform = `translate(${moveX}px, ${moveY}px) rotate(${HEARTS[index]?.rotation || 0}deg)`;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 via-transparent to-purple-500/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/3 to-transparent" />

      {/* Floating elements */}
      {HEARTS.map((heart) => {
        const Icon = heart.type === "heart" ? HeartIcon : heart.type === "sparkle" ? SparkleIcon : StarIcon;
        const colorClass = heart.type === "heart" 
          ? "text-pink-500" 
          : heart.type === "sparkle" 
            ? "text-rose-400" 
            : "text-purple-400";

        return (
          <div
            key={heart.id}
            className={`floating-heart absolute ${colorClass} transition-transform duration-300 ease-out`}
            style={{
              left: `${heart.x}%`,
              top: `${heart.y}%`,
              opacity: heart.opacity,
              animation: `float-3d ${heart.speed}s ease-in-out infinite`,
              animationDelay: `${heart.delay}s`,
              transform: `rotate(${heart.rotation}deg)`,
            }}
          >
            <Icon size={heart.size} className="drop-shadow-lg" />
          </div>
        );
      })}

      {/* Large blurred background hearts for depth */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 text-pink-500/10 blur-3xl">
        <HeartIcon size={256} />
      </div>
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 text-rose-500/10 blur-3xl">
        <HeartIcon size={192} />
      </div>
    </div>
  );
}
