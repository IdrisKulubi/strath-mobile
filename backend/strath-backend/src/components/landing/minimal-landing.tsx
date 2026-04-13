"use client";

import { Cormorant_Garamond } from "next/font/google";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { InstagramBrandIcon, TikTokBrandIcon } from "./social-footer-icons";

const landingSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const VIDEO_SRC = "/assets/4979404-hd_1920_1080_30fps.mp4";

const IOS_STORE_URL =
  process.env.NEXT_PUBLIC_IOS_APP_URL ??
  "https://apps.apple.com/ca/app/strathspace/id6757879443";

const ANDROID_STORE_URL =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ??
  "https://play.google.com/store/apps/details?id=com.strathspace.android&pcampaignid=web_share";

const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com/strathspace/";

const TIKTOK_URL =
  process.env.NEXT_PUBLIC_TIKTOK_URL ?? "https://www.tiktok.com/@strathspace";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

const easeOut = [0.16, 1, 0.3, 1] as const;

function buildTextVariants(reduce: boolean): {
  container: Variants;
  item: Variants;
  itemBlur: Variants;
  badges: Variants;
} {
  if (reduce) {
    const instant: Variants = { hidden: { opacity: 1 }, visible: { opacity: 1 } };
    return {
      container: instant,
      item: instant,
      itemBlur: instant,
      badges: instant,
    };
  }

  return {
    container: {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: 0.11,
          delayChildren: 0.12,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 22 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.72, ease: easeOut },
      },
    },
    itemBlur: {
      hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
      visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.8, ease: easeOut },
      },
    },
    badges: {
      hidden: { opacity: 0, y: 16 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: easeOut, delay: 0.72 },
      },
    },
  };
}

export function MinimalLanding() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const textVariants = useMemo(
    () => buildTextVariants(reduceMotion),
    [reduceMotion]
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduceMotion) return;
    const play = () => {
      void el.play().catch(() => {
        /* autoplay may be blocked until gesture; muted usually allows */
      });
    };
    play();
  }, [reduceMotion]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-zinc-950 text-white">
      {!reduceMotion ? (
        <video
          ref={videoRef}
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src={VIDEO_SRC}
          muted
          playsInline
          autoPlay
          loop
          preload="metadata"
          aria-hidden
        />
      ) : (
        <div
          className="absolute inset-0 z-0 bg-zinc-950"
          aria-hidden
        />
      )}

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-black/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 95% 85% at 50% 38%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.82) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-dvh flex-col px-5 pb-4 pt-10 sm:px-8 sm:pb-5 sm:pt-12">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-0 text-center">
          <motion.div
            className={landingSerif.className}
            variants={textVariants.container}
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              variants={textVariants.itemBlur}
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Strathspace
            </motion.h1>
            <motion.p
              variants={textVariants.item}
              className="mt-1 text-xs font-normal tracking-[0.2em] text-white/55 uppercase sm:text-[0.75rem]"
            >
              curated matches, real intent
            </motion.p>

            <motion.div
              variants={textVariants.item}
              className="mt-5 space-y-3.5 text-base leading-snug text-white/95 sm:mt-6 sm:text-lg sm:leading-snug"
            >
              <p>
                Most apps reward the scroll. Strathspace does the opposite: a
                small set of thoughtful matches each day, mutual interest before
                the noise, and space to say what you mean.
              </p>
              <p>
                When you are both in, you move forward together—a short call,
                then help lining up a date if you want it. Less theatre, more
                momentum.
              </p>
            </motion.div>

            <motion.p
              variants={textVariants.item}
              className="mt-5 border-l border-white/35 pl-3.5 text-left text-sm italic leading-snug text-white/88 sm:mt-6 sm:pl-4 sm:text-base"
            >
              Fewer profiles to perform for. More room to actually show up.
            </motion.p>

            <motion.p
              variants={textVariants.item}
              className="mt-3 text-sm text-white/80 sm:mt-4 sm:text-base"
            >
              Built for people who are done swiping past their own patience.
            </motion.p>

            <motion.div
              variants={textVariants.item}
              className="mt-5 w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-left font-sans sm:mt-6 sm:px-3.5 sm:py-3"
            >
              <p className="text-[0.58rem] font-medium uppercase tracking-[0.18em] text-white/45 sm:text-[0.6rem]">
                How it works
              </p>
              <ol className="mt-1.5 space-y-0.5 text-[0.7rem] leading-tight text-white/85 sm:mt-2 sm:space-y-1 sm:text-[0.75rem] sm:leading-snug">
                <li className="flex gap-1.5 sm:gap-2">
                  <span className="w-3 shrink-0 font-medium text-white/35">1</span>
                  <span>Daily curated matches—not an endless feed.</span>
                </li>
                <li className="flex gap-1.5 sm:gap-2">
                  <span className="w-3 shrink-0 font-medium text-white/35">2</span>
                  <span>Mutual interest before the noise gets loud.</span>
                </li>
                <li className="flex gap-1.5 sm:gap-2">
                  <span className="w-3 shrink-0 font-medium text-white/35">3</span>
                  <span>Short call, then help planning a date if you want it.</span>
                </li>
              </ol>
              <Link
                href="/how-it-works"
                className="mt-1.5 inline-flex items-center gap-0.5 text-[0.7rem] font-medium text-white/90 underline-offset-2 transition-colors hover:text-white hover:underline sm:mt-2 sm:text-xs"
              >
                Why we&apos;re different
                <span aria-hidden className="text-white/55">
                  →
                </span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            variants={textVariants.badges}
            initial="hidden"
            animate="visible"
            className="mt-5 flex w-full max-w-xl flex-col items-center gap-3 font-sans sm:mt-6 sm:flex-row sm:justify-center sm:gap-5"
          >
            <a
              href={IOS_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md outline-none ring-offset-2 ring-offset-transparent transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <img
                src="/badges/app-store-badge.svg"
                alt="Download on the App Store"
                width={120}
                height={40}
                decoding="async"
                className="mx-auto block h-9 w-auto sm:h-10"
              />
            </a>
            <a
              href={ANDROID_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md outline-none ring-offset-2 ring-offset-transparent transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <img
                src="/badges/google-play-badge.png"
                alt="Get it on Google Play"
                width={646}
                height={250}
                decoding="async"
                className="mx-auto block h-[44px] w-auto sm:h-[50px]"
              />
            </a>
          </motion.div>
        </main>

        <footer className="mx-auto mt-4 flex w-full max-w-4xl shrink-0 flex-col gap-3 border-t border-white/10 pt-4 font-sans text-[0.7rem] text-white/75 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:justify-start">
            <div className="flex items-center gap-1 sm:mr-1">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Strathspace on Instagram"
                className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10 sm:p-2"
              >
                <InstagramBrandIcon className="size-6" />
              </a>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Strathspace on TikTok"
                className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10 sm:p-2"
              >
                <TikTokBrandIcon className="size-6" />
              </a>
            </div>
            <span
              className="hidden h-4 w-px shrink-0 bg-white/20 sm:block"
              aria-hidden
            />
            <Link
              href="/how-it-works"
              className="transition-colors hover:text-white"
            >
              How it works
            </Link>
            <Link href="/support" className="transition-colors hover:text-white">
              Support
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
           
          </nav>
          <p className="text-center sm:text-right">
            © {new Date().getFullYear()} Strathspace
          </p>
        </footer>
      </div>
    </div>
  );
}
