import UnitForm from "../ui-unit-form";

export default function NewUnitPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">New Unit</h1>
        <p className="text-sm text-gray-600">Create a piece of equipment for dispatching.</p>
      </div>
      <UnitForm mode="create" />
    </main>
  );
}
