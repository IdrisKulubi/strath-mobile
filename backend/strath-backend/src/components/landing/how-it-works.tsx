"use client";

import { useEffect, useRef } from "react";
import { Mail, UserCircle, Heart } from "lucide-react";

const STEPS = [
  {
    icon: Mail,
    step: "01",
    title: "Sign Up with Uni Email",
    description: "Use your university email to verify you're a real student. Takes 30 seconds.",
  },
  {
    icon: UserCircle,
    step: "02",
    title: "Create Your Profile",
    description: "Add photos, write prompts, and show off your personality. Be authentic!",
  },
  {
    icon: Heart,
    step: "03",
    title: "Start Matching",
    description: "Swipe, match, and chat with people on your campus. Your next story starts here.",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const steps = entry.target.querySelectorAll(".step-card");
            steps.forEach((step, index) => {
              setTimeout(() => {
                step.classList.add("animate-in");
              }, index * 200);
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-32 px-4 overflow-hidden"
    >
      {/* Background accent */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            How It{" "}
            <span className="bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Three simple steps to finding your person
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-pink-500/30 to-transparent -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {STEPS.map((step, index) => (
              <div
                key={index}
                className="step-card opacity-0 translate-y-8 transition-all duration-700 ease-out"
              >
                <div className="relative flex flex-col items-center text-center p-6">
                  {/* Step number */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 md:top-auto md:-left-2 text-6xl font-bold text-pink-500/10">
                    {step.step}
                  </div>

                  {/* Icon circle */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-xl shadow-pink-500/25">
                      <step.icon size={36} className="text-white" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full blur-xl opacity-40 -z-10" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .step-card.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
