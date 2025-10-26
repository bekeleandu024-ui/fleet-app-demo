import DriverForm from "../driver-form";

export default function NewDriverPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New driver</h1>
        <p className="text-sm text-slate-600">Create a driver record for dispatch assignments.</p>
      </div>
      <DriverForm mode="create" />
    </div>
  );
}
