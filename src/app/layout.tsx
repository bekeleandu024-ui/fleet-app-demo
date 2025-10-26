import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fleet Ops Demo",
  description: "Demo fleet operations dashboard rebuilt with Next.js",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/orders/new", label: "New Order" },
  { href: "/trips", label: "Trips" },
  { href: "/drivers", label: "Drivers" },
  { href: "/units", label: "Units" },
  { href: "/rates", label: "Rates" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen">
          <header className="border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold text-slate-900">
                Fleet Ops Demo
              </Link>
              <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
                {navLinks.map(link => (
                  <Link key={link.href} href={link.href} className="hover:text-slate-900">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto flex max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
