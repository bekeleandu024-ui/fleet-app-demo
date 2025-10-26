const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function upsertDriver({ name, license, homeBase }) {
  await prisma.driver.upsert({
    where: { name },
    update: { license, homeBase, active: true },
    create: { name, license, homeBase }
  });
}

async function upsertUnit({ code, type, homeBase }) {
  await prisma.unit.upsert({
    where: { code },
    update: { type, homeBase, active: true },
    create: { code, type, homeBase }
  });
}

async function main() {
  const drivers = [
    { name: 'Alice M', license: 'AZ', homeBase: 'Guelph' },
    { name: 'Ben T', license: 'DZ', homeBase: 'Kitchener' },
    { name: 'Carmen R', license: 'AZ', homeBase: 'Cambridge' }
  ];

  const units = [
    { code: 'COM-012', type: 'Tractor', homeBase: 'Guelph' },
    { code: 'TRK-221', type: 'Straight Truck', homeBase: 'Cambridge' },
    { code: 'REE-104', type: 'Reefer', homeBase: 'Kitchener' }
  ];

  const rates = [
    { type: 'Company', zone: 'Ontario', fixedCPM: '1.12', wageCPM: '0.33', addOnsCPM: '0.08', rollingCPM: '0.14' },
    { type: 'Company', zone: 'Midwest', fixedCPM: '1.26', wageCPM: '0.35', addOnsCPM: '0.10', rollingCPM: '0.17' },
    { type: 'OwnerOp', zone: 'Ontario', fixedCPM: '0.95', wageCPM: '0.00', addOnsCPM: '0.05', rollingCPM: '0.19' },
    { type: 'OwnerOp', zone: 'Cross-Border', fixedCPM: '1.08', wageCPM: '0.00', addOnsCPM: '0.09', rollingCPM: '0.23' }
  ];

  const rateSettings = [
    { rateKey: 'BASE_WAGE', category: 'COM', value: '0.59', unit: '$/Mile', note: null },
    { rateKey: 'BASE_WAGE', category: 'OO_ZONE1', value: '1.6', unit: '$/Mile', note: null },
    { rateKey: 'BASE_WAGE', category: 'OO_ZONE2', value: '1.45', unit: '$/Mile', note: null },
    { rateKey: 'BASE_WAGE', category: 'OO_ZONE3', value: '0.74', unit: '$/Mile', note: null },
    { rateKey: 'SAFETY_CPM', category: 'COM', value: '0.03', unit: '$/Mile', note: null },
    { rateKey: 'BENEFITS_PCT', category: 'GLOBAL', value: '0.2', unit: 'x Base', note: '20% base of base' },
    { rateKey: 'PERF_CPM', category: 'GLOBAL', value: '0.03', unit: '$/Mile', note: null },
    { rateKey: 'TRK_RM_CPM', category: 'GLOBAL', value: '0.22', unit: '$/Mile', note: 'Truck maint $/Mile' },
    { rateKey: 'TRL_RM_CPM', category: 'GLOBAL', value: '0.03', unit: '$/Mile', note: 'Trailer maint $/Mile' },
    { rateKey: 'FUEL_CPM', category: 'COM', value: '0.7', unit: '$/Mile', note: 'Fuel CPM' },
    { rateKey: 'FUEL_CPM', category: 'RNR', value: '0.7', unit: '$/Mile', note: 'Fuel CPM' },
    { rateKey: 'BC_PER', category: 'GLOBAL', value: '15', unit: '$/Event', note: 'Border Crossing' },
    { rateKey: 'MISC_PER', category: 'GLOBAL', value: '20', unit: '$/Event', note: 'Misc' },
    { rateKey: 'DH_PER', category: 'GLOBAL', value: '20', unit: '$/Event', note: 'Deadhead' },
    { rateKey: 'PICK_PER', category: 'GLOBAL', value: '20', unit: '$/Event', note: 'Pickup' },
    { rateKey: 'DEL_PER', category: 'GLOBAL', value: '20', unit: '$/Event', note: 'Delivery' },
    { rateKey: 'MISC_WK', category: 'GLOBAL', value: '76.07', unit: '$/Week', note: 'Misc weekly' },
    { rateKey: 'SGA_WK', category: 'GLOBAL', value: '590.91', unit: '$/Week', note: 'SG&A weekly' },
    { rateKey: 'DTOPS_WK', category: 'GLOBAL', value: '400', unit: '$/Week', note: 'Driver tops weekly' },
    { rateKey: 'IASSC_WK', category: 'GLOBAL', value: '153.99', unit: '$/Week', note: 'Insurance weekly' },
    { rateKey: 'PP_WK', category: 'GLOBAL', value: '250', unit: '$/Week', note: 'Payroll processing weekly' },
    { rateKey: 'FUEL_WK', category: 'GLOBAL', value: '200', unit: '$/Week', note: 'Fuel weekly' },
    { rateKey: 'TRL_WK', category: 'GLOBAL', value: '180', unit: '$/Week', note: 'Trailer weekly' },
    { rateKey: 'TRUCK_WK', category: 'GLOBAL', value: '844.3', unit: '$/Week', note: 'Truck weekly' }
  ];

  await Promise.all(drivers.map((driver) => upsertDriver(driver)));

  await Promise.all(units.map((unit) => upsertUnit(unit)));

  await prisma.$transaction(async (tx) => {
    await tx.rate.deleteMany();
    await tx.rate.createMany({ data: rates });
    await tx.rateSetting.deleteMany();
    await tx.rateSetting.createMany({ data: rateSettings });
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
