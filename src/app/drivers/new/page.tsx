import DriverForm from "../ui-driver-form";

export default function NewDriverPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">New Driver</h1>
        <p className="text-sm text-gray-600">Create a driver that can be assigned to trips.</p>
      </div>
      <DriverForm mode="create" />
    </main>
  );
}
