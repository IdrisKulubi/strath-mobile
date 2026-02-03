"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield, Users, Heart } from "lucide-react";

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // GSAP-like scroll parallax using native JS
    const handleScroll = () => {
      if (!heroRef.current) return;
      const scrollY = window.scrollY;
      const elements = heroRef.current.querySelectorAll("[data-parallax]");
      
      elements.forEach((el) => {
        const speed = parseFloat((el as HTMLElement).dataset.parallax || "0.5");
        (el as HTMLElement).style.transform = `translateY(${scrollY * speed}px)`;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-[100svh] flex items-center justify-center px-4 py-20 md:py-32 overflow-hidden"
    >
      {/* Background gradient orbs with parallax */}
      <div
        data-parallax="0.3"
        className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-pink-500/30 via-rose-500/20 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
      />
      <div
        data-parallax="0.2"
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-purple-500/25 via-pink-500/15 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2"
      />
      <div
        data-parallax="0.4"
        className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-rose-500/20 to-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-fade-in-up">
          <div className="relative group">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl shadow-pink-500/25 group-hover:shadow-pink-500/40 transition-shadow duration-500">
              <Image
                src="/logo.png"
                alt="Strathspace"
                width={64}
                height={64}
                className="w-12 h-12 md:w-16 md:h-16 object-contain"
              />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity -z-10" />
          </div>
        </div>

        {/* Main headline */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
        >
          <span className="text-white">Find Your </span>
          <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 bg-clip-text text-transparent">
            Person
          </span>
          <br />
          <span className="text-white">on Campus</span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-8 animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          The dating app made exclusively for{" "}
          <span className="text-pink-400 font-medium">university students</span>.
          Real connections. Real people. Your campus.
        </p>

        {/* Trust badges */}
        <div
          className="flex flex-wrap justify-center gap-4 md:gap-6 mb-10 animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          {[
            { icon: Shield, text: "Verified Students" },
            { icon: Users, text: "Campus Only" },
            { icon: Heart, text: "Real Matches" },
          ].map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-sm text-gray-300"
            >
              <badge.icon size={16} className="text-pink-400" />
              <span>{badge.text}</span>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
          style={{ animationDelay: "400ms" }}
        >
          <Link
            href="/register"
            className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:from-pink-600 hover:via-rose-600 hover:to-pink-600 text-white font-semibold text-lg rounded-2xl shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all duration-300 overflow-hidden"
          >
            <span className="relative z-10">Get Started Free</span>
            <ArrowRight
              size={20}
              className="relative z-10 group-hover:translate-x-1 transition-transform"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium text-lg rounded-2xl transition-all duration-300"
          >
            I have an account
          </Link>
        </div>

        {/* Social proof */}
        <p
          className="mt-8 text-sm text-gray-500 animate-fade-in-up"
          style={{ animationDelay: "500ms" }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
            Mobile app launching soon!
          </span>
        </p>
      </div>
    </section>
  );
}
