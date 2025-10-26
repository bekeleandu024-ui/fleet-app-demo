import "./globals.css";

import type { ReactNode } from "react";

import { Nav } from "@/components/Nav";

export const metadata = {
  title: "Fleet operations demo",
  description: "Operational overview for fleet logistics"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <Nav />
        <main>
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
