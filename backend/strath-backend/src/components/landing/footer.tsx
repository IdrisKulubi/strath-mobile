"use client";

import Link from "next/link";
import Image from "next/image";
import { Instagram, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative py-12 px-4 border-t border-white/10">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo & tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Strathspace"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <p className="font-semibold text-white">Strathspace</p>
              <p className="text-xs text-gray-500">Made for university students 🇰🇪</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>

          {/* Social */}
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/strathspace"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
            >
              <Instagram size={18} className="text-gray-400" />
            </a>
            {/* <a
              href="https://twitter.com/strathspace"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
            >
              <Twitter size={18} className="text-gray-400" />
            </a> */}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-white/5 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Strathspace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
