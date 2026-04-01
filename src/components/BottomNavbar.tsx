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
                  className={`flex h-12 items-center justify-center rounded-xl border-b-2 px-2 text-center text-[11px] font-semibold tracking-[0.06em] transition sm:text-sm ${
                    isActive
                      ? "border-cyan-300 bg-cyan-400/15 text-cyan-100"
                      : "border-transparent text-slate-300 hover:bg-slate-900/70 hover:text-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
