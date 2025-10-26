import Link from "next/link";

const links = [
  { href: "/orders/new", title: "Create Order", description: "Capture new orders manually or with OCR." },
  { href: "/trips", title: "Trips", description: "Review, edit, and recalculate trip profitability." },
  { href: "/drivers", title: "Drivers", description: "Manage active drivers and their home bases." },
  { href: "/units", title: "Units", description: "Maintain tractors and trailers assigned to trips." },
  { href: "/rates", title: "Rates", description: "Inspect CPM rates and configuration settings." },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Fleet operations dashboard</h1>
        <p className="text-slate-600">
          Rebuilt Next.js demo with OCR-assisted orders, trip margin tracking, and basic fleet maintenance lists.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-400 hover:shadow"
          >
            <h2 className="text-lg font-semibold text-slate-900">{link.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
