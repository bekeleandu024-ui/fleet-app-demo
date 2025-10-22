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
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Fleet operations demo</h1>
        <p className="text-sm text-gray-600">
          Quick shortcuts to the core workflows in the sample app.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded border border-gray-200 p-4 transition hover:border-black hover:bg-gray-50"
          >
            <h2 className="text-lg font-semibold">{link.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{link.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
