import DriverForm from "../ui-driver-form";

export default function NewDriverPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-gray-500">Driver onboarding</p>
        <h1 className="text-3xl font-semibold">Add a new driver</h1>
        <p className="text-sm text-gray-600">
          Capture the core details your dispatch, safety, and payroll teams need so this driver
          is ready for assignment as soon as their paperwork clears.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <aside className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Operations checklist
            </h2>
            <p className="mt-1 text-gray-600">
              Make sure these items are on file before dispatching the driver.
            </p>
          </div>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              <span>Valid CDL and any required endorsements.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              <span>Current medical certificate and drug test status.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              <span>Emergency contact and home terminal information.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              <span>Payroll setup (rate type, deductions, direct deposit).</span>
            </li>
          </ul>
        </aside>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <DriverForm mode="create" />
        </div>
      </section>
    </main>
  );
}
