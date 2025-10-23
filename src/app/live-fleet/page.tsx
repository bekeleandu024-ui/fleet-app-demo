import { getFleetSnapshot } from "@/server/fleet-snapshot";
import FleetTrucksMap from "./fleet-trucks-map";

export const dynamic = "force-dynamic";

export default async function LiveFleetPage() {
  const fleet = await getFleetSnapshot();

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Live fleet operations</h1>
        <p className="text-sm text-gray-600">
          Monitor truck assignments and availability across the network.
        </p>
      </header>

      <FleetTrucksMap fleet={fleet} />
    </main>
  );
}
