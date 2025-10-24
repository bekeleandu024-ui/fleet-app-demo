import prisma from "@/src/server/prisma";
import DriverForm from "../../ui-driver-form";

type PageProps = {
  params: { id: string };
};

export default async function EditDriverPage({ params }: PageProps) {
  const driver = await prisma.driver.findUnique({ where: { id: params.id } });

  if (!driver) {
    return <main className="p-6 text-sm text-gray-600">Driver not found.</main>;
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Driver</h1>
        <p className="text-sm text-gray-600">Update details or deactivate the driver.</p>
      </div>
      <DriverForm
        mode="edit"
        driverId={driver.id}
        initialValues={{
          name: driver.name,
          homeBase: driver.homeBase,
          license: driver.license,
          active: driver.active,
        }}
      />
    </main>
  );
}
