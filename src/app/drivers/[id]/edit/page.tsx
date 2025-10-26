import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import DriverForm from "../../driver-form";

export default async function EditDriverPage({ params }: { params: { id: string } }) {
  const driver = await prisma.driver.findUnique({ where: { id: params.id } });
  if (!driver) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit driver</h1>
        <p className="text-sm text-slate-600">Update details for {driver.name}.</p>
      </div>
      <DriverForm mode="edit" driver={{ id: driver.id, name: driver.name, homeBase: driver.homeBase, active: driver.active }} />
    </div>
  );
}
