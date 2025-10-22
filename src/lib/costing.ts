type CostInput = {
  miles: number;
  fixedCPM?: number | null;
  wageCPM?: number | null;
  addOnsCPM?: number | null;
  rollingCPM?: number | null;
  revenue?: number | null;
};

export function calcCost({
  miles,
  fixedCPM = 0,
  wageCPM = 0,
  addOnsCPM = 0,
  rollingCPM = 0,
  revenue,
}: CostInput) {
  const totalCPM = (fixedCPM ?? 0) + (wageCPM ?? 0) + (addOnsCPM ?? 0) + (rollingCPM ?? 0);
  const totalCost = Number((miles * totalCPM).toFixed(2));
  const rev = revenue ?? 0;
  const profit = Number((rev - totalCost).toFixed(2));
  const marginPct = rev ? profit / rev : null;

  return { totalCPM, totalCost, profit, marginPct };
}
