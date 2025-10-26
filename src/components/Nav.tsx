"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const links = [
  { href: "/", label: "Overview" },
  { href: "/orders", label: "Orders" },
  { href: "/trips", label: "Trips" },
  { href: "/orders/new", label: "Book" },
  { href: "/fleet-map", label: "Fleet map" },
  { href: "/drivers", label: "Drivers" },
  { href: "/units", label: "Units" },
  { href: "/rates", label: "Rates" }
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur border-b border-zinc-800/80 bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold text-zinc-100">Fleet operations demo</span>
        <ul className="flex flex-wrap items-center gap-2 text-sm">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={clsx(
                    "rounded-full px-3 py-1 transition",
                    isActive
                      ? "bg-emerald-500 text-emerald-50"
                      : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
