import Link from "next/link";

const links = [
  {
    href: "/orders",
    title: "Orders",
    description: "Create orders and dispatch them to trips.",
  },
  {
    href: "/trips",
    title: "Trips",
    description: "Track trip performance and status.",
  },
  {
    href: "/live-fleet",
    title: "Fleet map",
    description: "Monitor truck positions and current assignments.",
  },
  {
    href: "/drivers",
    title: "Drivers",
    description: "Manage driver profiles and availability.",
  },
  {
    href: "/units",
    title: "Units",
    description: "Maintain tractors, trailers, and equipment.",
  },
  {
    href: "/rates",
    title: "Rates",
    description: "Define CPM components; match by type/zone.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6 text-slate-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">
          Fleet operations demo
        </h1>
        <p className="text-sm text-slate-300">
          Quick shortcuts to the core workflows in the sample app.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group block rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-colors duration-200 hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <h2 className="text-lg font-semibold text-slate-100 transition-colors duration-200 group-hover:text-sky-300">
              {link.title}
            </h2>
            <p className="mt-2 text-sm text-slate-300 transition-colors duration-200 group-hover:text-slate-200">
              {link.description}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
