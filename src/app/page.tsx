import Link from "next/link";

const sections = [
  { href: "/orders", label: "Orders" },
  { href: "/orders/new", label: "Book a load" },
  { href: "/drivers", label: "Drivers" },
  { href: "/units", label: "Units" },
  { href: "/rates", label: "Rates" }
];

export default function Page() {
  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold text-white">Fleet operations demo</h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          A compact workspace to monitor orders, manage bookings, and track your fleet&apos;s operators and equipment.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-full border border-zinc-700/80 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-white"
          >
            {section.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
