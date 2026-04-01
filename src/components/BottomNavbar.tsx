"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Generative AI",
  },
  {
    href: "/ai-agents",
    label: "AI Agents",
  },
  {
    href: "/analytical-ai",
    label: "Analytical AI",
  },
] as const;

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export function BottomNavbar() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 sm:px-8 md:bottom-3">
      <nav className="pointer-events-auto mx-auto w-full max-w-3xl rounded-2xl border border-cyan-400/30 bg-slate-950/85 p-1.5 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
        <ul className="grid grid-cols-3 gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = isActiveLink(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative flex h-12 items-center justify-center overflow-hidden rounded-xl border px-2 text-center text-[11px] font-semibold tracking-[0.06em] transition-all duration-300 sm:text-sm ${
                    isActive
                      ? "nav-link-active-fx border-cyan-300/80 bg-cyan-400/10 text-cyan-50"
                      : "border-transparent text-slate-300 hover:bg-slate-900/70 hover:text-slate-100"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 rounded-xl ${
                      isActive ? "nav-link-active-surface" : ""
                    }`}
                  />

                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 -skew-x-12 ${
                      isActive ? "nav-link-active-shimmer" : "hidden"
                    }`}
                  />

                  <span className="relative z-10 transition-transform duration-300 group-hover:scale-[1.02]">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
