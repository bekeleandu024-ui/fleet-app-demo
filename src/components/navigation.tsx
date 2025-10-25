"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Overview" },
  { href: "/orders", label: "Orders" },
  { href: "/trips", label: "Trips" },
  { href: "/book-trip", label: "Book" },
  { href: "/live-fleet", label: "Fleet map" },
  { href: "/drivers", label: "Drivers" },
  { href: "/units", label: "Units" },
  { href: "/rates", label: "Rates" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-800 bg-[#050505] text-sm text-slate-200">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <Link href="/" className="text-lg font-semibold text-slate-100">
          Fleet operations demo
        </Link>
        <nav className="flex flex-wrap gap-2">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full border px-4 py-2 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                  isActive
                    ? "border-sky-500 bg-sky-500/10 text-sky-200"
                    : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
