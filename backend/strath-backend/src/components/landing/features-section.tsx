"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck, GraduationCap, Heart, MessageCircle, Sparkles, Lock } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Verified Students Only",
    description: "Every user verified with their university email. No fakes, no catfish.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: GraduationCap,
    title: "Campus Community",
    description: "Connect with people who share your campus life, classes, and experiences.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Heart,
    title: "Meaningful Matches",
    description: "Our algorithm focuses on compatibility, not just appearances.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: MessageCircle,
    title: "Safe Conversations",
    description: "Chat only with your matches. Block and report easily if needed.",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: Sparkles,
    title: "Icebreakers Built-In",
    description: "Fun prompts and games to help you start conversations naturally.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Control who sees your profile. Your data stays yours.",
    color: "from-slate-500 to-gray-500",
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const cards = sectionRef.current?.querySelectorAll(".feature-card");
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-32 px-4 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-500/5 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Why{" "}
            <span className="bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
              Strathspace
            </span>
            ?
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            We built the dating app we wished existed in university.
            Safe, real, and actually fun.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => (
            <div
              key={index}
              className="feature-card opacity-0 translate-y-8 transition-all duration-700 ease-out"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="group relative h-full p-6 md:p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                {/* Icon */}
                <div
                  className={`w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon size={28} className="text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover glow */}
                <div
                  className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500 -z-10`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .feature-card.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
