import DriverForm from "../ui-driver-form";

type AvailableDriver = {
  id: string;
  name: string;
  availableForHours: number;
  homeTerminal: string;
  equipment: string;
  contact: string;
  notes: string;
};

const availableDrivers: AvailableDriver[] = [
  {
    id: "d1",
    name: "Alex Johnson",
    availableForHours: 96,
    homeTerminal: "Kansas City, MO",
    equipment: "Sleeper — Dry Van",
    contact: "555-0114",
    notes: "Ready for Midwest regional runs and hazmat qualified.",
  },
  {
    id: "d2",
    name: "Priya Desai",
    availableForHours: 72,
    homeTerminal: "Dallas, TX",
    equipment: "Day Cab — Reefer",
    contact: "555-0188",
    notes: "Prefers overnight linehaul lanes and long-weekend dispatches.",
  },
  {
    id: "d3",
    name: "Marco Alvarez",
    availableForHours: 54,
    homeTerminal: "Columbus, OH",
    equipment: "Sleeper — Flatbed",
    contact: "555-0061",
    notes: "Steel securement certified; needs pre-plan by Wednesday AM.",
  },
  {
    id: "d4",
    name: "Sydney Park",
    availableForHours: 30,
    homeTerminal: "Charlotte, NC",
    equipment: "Day Cab — Dry Van",
    contact: "555-0043",
    notes: "Ideal for short-haul shuttle work around the Carolinas.",
  },
];

const rankedDrivers = [...availableDrivers].sort(
  (a, b) => b.availableForHours - a.availableForHours,
);

function formatAvailability(hours: number) {
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;

  if (days && remainder) {
    return `${days}d ${remainder}h`;
  }

  if (days) {
    return `${days}d`;
  }

  return `${remainder}h`;
}

export default function NewDriverPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 pb-16 pt-10">
      <header className="grid gap-6 rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm sm:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Driver onboarding
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Add a new driver</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            Capture the core profile, compliance, and pay details so dispatch, safety, and payroll
            can activate this driver as soon as their paperwork clears. Confirm the most available
            driver below or log a new profile to keep your fleet utilization balanced.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-center text-sm text-slate-600">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Available drivers
            </dt>
            <dd className="mt-2 text-2xl font-semibold text-slate-900">
              {availableDrivers.length}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Longest stand-by
            </dt>
            <dd className="mt-2 text-2xl font-semibold text-slate-900">
              {formatAvailability(rankedDrivers[0].availableForHours)}
            </dd>
          </div>
        </dl>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,320px)_1fr]">
        <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white/95 p-6 text-sm shadow-sm">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Driver availability
            </h2>
            <p className="text-slate-600">
              The list below ranks standby drivers from longest to shortest current availability.
              Pull from the top for assignments that need immediate coverage.
            </p>
          </div>

          <ul className="space-y-4">
            {rankedDrivers.map((driver) => (
              <li
                key={driver.id}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-slate-700"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-semibold text-slate-900">{driver.name}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    {formatAvailability(driver.availableForHours)} free
                  </span>
                </div>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <dt className="w-24 shrink-0 text-slate-500">Terminal</dt>
                    <dd className="text-slate-700">{driver.homeTerminal}</dd>
                  </div>
                  <div className="flex items-start gap-2">
                    <dt className="w-24 shrink-0 text-slate-500">Equipment</dt>
                    <dd className="text-slate-700">{driver.equipment}</dd>
                  </div>
                  <div className="flex items-start gap-2">
                    <dt className="w-24 shrink-0 text-slate-500">Contact</dt>
                    <dd className="text-slate-700">{driver.contact}</dd>
                  </div>
                  <div className="flex items-start gap-2">
                    <dt className="w-24 shrink-0 text-slate-500">Notes</dt>
                    <dd className="text-slate-700">{driver.notes}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </aside>

        <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm">
          <DriverForm mode="create" />
        </div>
      </section>
    </main>
  );
}
