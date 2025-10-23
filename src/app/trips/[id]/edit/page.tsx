import prisma from "@/server/prisma";
import EditForm from "./ui-edit-form";

export default async function EditTrip({ params }: { params: { id: string }}) {
  const t = await prisma.trip.findUnique({ where: { id: params.id }});
  if (!t) return <main className="p-6">Not found</main>;

  const drivers = await prisma.driver.findMany({
    where: { active: true }, orderBy: { name: "asc" }, select: { id:true, name:true }
  });
  const units = await prisma.unit.findMany({
    where: { active: true }, orderBy: { code: "asc" }, select: { id:true, code:true }
  });

  const types = (await prisma.rate.findMany({ distinct: ["type"], select: { type: true } }))
    .map(r => r.type).filter(Boolean) as string[];
  const zones = (await prisma.rate.findMany({ distinct: ["zone"], select: { zone: true } }))
    .map(r => r.zone).filter(Boolean) as string[];

  return <EditForm trip={t} drivers={drivers} units={units} types={types} zones={zones} />;
}
