"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import studioStar from "@/public/star.svg";

function resolvePageTitle(pathname: string): string {
  if (pathname.startsWith("/generative-ai")) {
    return "Generative AI";
  }

  if (pathname.startsWith("/analytical-ai")) {
    return "Analytical AI";
  }

  return "AI Agents";
}

export function AppTopHeader() {
  const pathname = usePathname();
  const currentPageTitle = resolvePageTitle(pathname);

  return (
    <header className="mx-auto mb-4 mt-3 flex w-full max-w-6xl items-center justify-between rounded-3xl border border-cyan-400/25 bg-slate-950/65 px-5 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:px-8 md:px-7 md:py-1">
      <p className="text-lg font-semibold uppercase tracking-[0.14em] text-cyan-100 sm:text-2xl sm:tracking-[0.22em] md:text-3xl">
        AI Studio
      </p>

      <p className="px-2 text-center text-xs xl:text-lg font-semibold  tracking-[0.12em] text-cyan-200 sm:text-base sm:tracking-[0.18em]">
        {currentPageTitle}
      </p>

      <Image
        src={studioStar}
        alt="AI Studio star"
        width={64}
        height={64}
        className="studio-star h-[50px] w-[50px] sm:h-[58px] sm:w-[58px] md:h-[64px] md:w-[64px]"
        priority={false}
      />
    </header>
  );
}
