import UnitForm from "../unit-form";

export default function NewUnitPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New unit</h1>
        <p className="text-sm text-slate-600">Add a tractor or trailer to assign on trips.</p>
      </div>
      <UnitForm mode="create" />
    </div>
  );
}
