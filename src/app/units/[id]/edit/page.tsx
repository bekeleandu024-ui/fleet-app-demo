import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import UnitForm from "../../unit-form";

export default async function EditUnitPage({ params }: { params: { id: string } }) {
  const unit = await prisma.unit.findUnique({ where: { id: params.id } });
  if (!unit) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit unit</h1>
        <p className="text-sm text-slate-600">Update details for {unit.code}.</p>
      </div>
      <UnitForm
        mode="edit"
        unit={{ id: unit.id, code: unit.code, type: unit.type, homeBase: unit.homeBase, active: unit.active }}
      />
    </div>
  );
}
