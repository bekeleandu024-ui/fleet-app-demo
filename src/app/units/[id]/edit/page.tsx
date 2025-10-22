import prisma from "@/src/server/prisma";
import UnitForm from "../../ui-unit-form";

type PageProps = {
  params: { id: string };
};

export default async function EditUnitPage({ params }: PageProps) {
  const unit = await prisma.unit.findUnique({ where: { id: params.id } });

  if (!unit) {
    return <main className="p-6 text-sm text-gray-600">Unit not found.</main>;
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Unit</h1>
        <p className="text-sm text-gray-600">Update details or deactivate the unit.</p>
      </div>
      <UnitForm
        mode="edit"
        unitId={unit.id}
        initialValues={{
          code: unit.code,
          type: unit.type,
          homeBase: unit.homeBase,
          active: unit.active,
        }}
      />
    </main>
  );
}
