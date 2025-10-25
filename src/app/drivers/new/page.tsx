import DriverForm from "../ui-driver-form";

export default function NewDriverPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Driver onboarding</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Add a new driver</h1>
        <p className="text-sm text-muted-foreground">
          Capture the core details your dispatch, safety, and payroll teams need so this driver
          is ready for assignment as soon as their paperwork clears.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <aside className="rounded-xl border border-border bg-card/60 p-4 space-y-4 transition-colors">
          <div>
            <h2 className="text-sm font-semibold text-foreground">OPERATIONS CHECKLIST</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Make sure these items are on file before dispatching the driver.
            </p>
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Valid CDL and any required endorsements.</li>
            <li>Current medical certificate and drug test status.</li>
            <li>Emergency contact and home terminal information.</li>
            <li>Payroll setup (rate type, deductions, direct deposit).</li>
          </ul>
        </aside>

        <div className="rounded-xl border border-border bg-card/60 p-6 shadow-sm transition-colors">
          <DriverForm mode="create" />
        </div>
      </section>
    </main>
  );
}
