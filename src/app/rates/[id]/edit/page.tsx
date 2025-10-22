import prisma from "@/server/prisma";
import Link from "next/link";
import RateEditForm from "./rate-form";

type PageProps = { params: { id: string } };

export default async function EditRatePage({ params }: PageProps) {
  const rate = await prisma.rate.findUnique({ where: { id: params.id } });

  if (!rate) {
    return <main className="p-6">Rate not found.</main>;
  }

  const formState = {
    id: rate.id,
    type: rate.type ?? "",
    zone: rate.zone ?? "",
    fixedCPM: rate.fixedCPM.toString(),
    wageCPM: rate.wageCPM.toString(),
    addOnsCPM: rate.addOnsCPM.toString(),
    rollingCPM: rate.rollingCPM.toString(),
  };

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Rate</h1>
        <Link href="/rates" className="text-sm text-blue-600">
          ← Back to Rates
        </Link>
      </div>

      <div className="p-4 border rounded-lg">
        <RateEditForm rate={formState} />
      </div>
    </main>
  );
}
