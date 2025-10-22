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

  await Promise.all(drivers.map((driver) => upsertDriver(driver)));

  await Promise.all(units.map((unit) => upsertUnit(unit)));

  await prisma.$transaction(async (tx) => {
    await tx.rate.deleteMany();
    await tx.rate.createMany({ data: rates });
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
