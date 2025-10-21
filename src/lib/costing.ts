// src/lib/costing.ts
export function calcCost(params: {
  miles: number;
  fixedCPM?: number;
  wageCPM?: number;
  addOnsCPM?: number;
  rollingCPM?: number;
  revenue?: number;
}) {
  const miles = Number(params.miles) || 0;
  const fixedCPM = Number(params.fixedCPM ?? 0);
  const wageCPM = Number(params.wageCPM ?? 0);
  const addOnsCPM = Number(params.addOnsCPM ?? 0);
  const rollingCPM = Number(params.rollingCPM ?? 0);
  const revenue = Number(params.revenue ?? 0);

  const totalCPM = fixedCPM + wageCPM + addOnsCPM + rollingCPM;
  const totalCost = miles * totalCPM;
  const profit = revenue - totalCost;
  const marginPct = revenue > 0 ? profit / revenue : 0;

  const rpm = miles > 0 ? revenue / miles : 0;
  const cpm = miles > 0 ? totalCost / miles : 0;
  const ppm = miles > 0 ? profit / miles : 0;

  return { totalCPM, totalCost, profit, marginPct, rpm, cpm, ppm };
}
